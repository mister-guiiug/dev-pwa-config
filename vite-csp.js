/**
 * Plugin Vite — injecte une Content-Security-Policy (défense en profondeur) dans
 * le <head> de index.html, avec `script-src` par HASH SHA-256 des scripts inline
 * (pas de 'unsafe-inline' en production).
 *
 * En PROD : script-src = 'self' + hash SHA-256 de CHAQUE <script> inline SANS
 * attribut (typiquement le script anti-FOUC), + hôtes supplémentaires éventuels.
 * En DEV  : script-src = 'self' 'unsafe-inline' — le préambule Fast Refresh inline
 * de @vitejs/plugin-react n'est pas hashable.
 *
 * Le hash est recalculé à partir du HTML FINAL (order:'post') : il reste correct
 * si le script change, ou si un autre plugin (SEO/analytics) injecte des scripts
 * inline en amont — d'où l'ordre 'post' et le placement APRÈS pwaSeoPlugin.
 * Les fins de ligne sont normalisées CRLF→LF : un build Windows produirait sinon
 * un hash différent de celui que le navigateur calcule (il normalise en LF).
 *
 * Ne matche que `<script>` SANS ATTRIBUT : les `<script src>`, `<script type=...>`
 * (modules, JSON-LD) ne sont pas concernés par un hash inline et sont ignorés.
 * La casse et les espaces avant `>` sont tolérés — `<SCRIPT>` et `<script >`
 * sont des scripts inline comme les autres, et les manquer revient à les faire
 * bloquer par la CSP en production.
 *
 * Usage (vite.config.ts) :
 *   import { cspPlugin } from '@mister-guiiug/dev-pwa-config/vite-csp';
 *   export default defineConfig(({ command }) => ({
 *     plugins: [
 *       react(), tailwindcss(), pwaSeoPlugin({ ... }),
 *       cspPlugin({
 *         dev: command === 'serve',
 *         connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
 *       }),
 *       VitePWA({ ... }),
 *     ],
 *   }));
 *
 * Si un <meta http-equiv="Content-Security-Policy"> statique existe déjà dans
 * index.html, il est REMPLACÉ (le plugin devient la source unique) ; sinon la
 * balise est insérée juste après <meta charset>.
 *
 * CE QU'UNE CSP EN <meta> NE PEUT PAS FAIRE. La spécification exclut
 * explicitement `frame-ancestors`, `report-uri` et `sandbox` d'une politique
 * délivrée par balise : le navigateur les IGNORE, en silence. Le template
 * `index.html` du paquet terminait pourtant sa CSP par `frame-ancestors 'none'`
 * — une protection anti-clickjacking qui n'a jamais existé, avec toute
 * l'apparence du contraire. Elle demande un EN-TÊTE HTTP, donc un hébergeur qui
 * en pose : Firebase Hosting le permet (`headers` dans `firebase.json`), GitHub
 * Pages non. Le plugin retire donc ces directives et le signale, au lieu de les
 * relayer.
 */
import { createHash } from 'node:crypto';

/**
 * Hôtes exigés par la mesure d'audience — **PostHog, nuage EUROPÉEN**.
 *
 * `default-src 'self'` les bloque tous, **sans erreur de build** : une CSP trop
 * étroite coupe la mesure en silence. Le parc l'a payé exactement ainsi avec
 * GA4, dont la passerelle OMS n'était pas dans `connect-src` — les deux modes
 * réseau de `mister-cim10` étaient inopérants en production sans que rien ne le
 * dise.
 *
 * `eu-assets` EN `script-src` N'EST PAS UNE PRUDENCE — mesuré le 19/09/2026
 * dans un vrai navigateur, sur le squelette construit. Ce commentaire disait
 * l'inverse : « quand `posthog-js` est installé en dépendance, tout est dans le
 * bundle et rien n'est chargé de là ». C'est faux. À chaque `init`, la
 * bibliothèque va chercher sa configuration distante —
 * `eu-assets.i.posthog.com/array/<clé>/config.js`, relevée en `initiatorType:
 * "script"`, 200. Retirer cet hôte la ferait bloquer par la CSP, et
 * l'application n'en dirait rien d'autre qu'une ligne de console.
 *
 * Ni `img` ni `frame` : PostHog n'a besoin d'aucun des deux ici. Le
 * `<iframe>` de la barre d'outils n'existe qu'en développement, où `cspPlugin`
 * pose `'unsafe-inline'` de toute façon.
 */
export const ANALYTICS_HOSTS = {
  script: ['https://eu-assets.i.posthog.com'],
  img: [],
  connect: ['https://eu.i.posthog.com', 'https://eu-assets.i.posthog.com'],
  frame: [],
};

/** Directives qu'un navigateur ignore dans une CSP posée par `<meta>`. */
const META_IGNORED = ['frame-ancestors', 'report-uri', 'sandbox'];

const CSP_META_RE = /<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/i;
const CHARSET_RE = /<meta\s+charset=["'][^"']*["']\s*\/?>/i;

/** Hash CSP d'un contenu de script inline (fins de ligne normalisées LF). */
function sha256(content) {
  return `'sha256-${createHash('sha256')
    .update(content.replace(/\r\n/g, '\n'))
    .digest('base64')}'`;
}

/**
 * @param {import('./vite-csp.js').CspOptions} [options]
 * @returns {import('vite').Plugin}
 */
export function cspPlugin(options = {}) {
  const {
    dev = false,
    connectSrc = ["'self'"],
    imgSrc = ["'self'", 'data:', 'blob:'],
    fontSrc = ["'self'", 'data:'],
    styleSrc = ["'self'", "'unsafe-inline'"],
    scriptSrc = [],
    // `'none'` par défaut : une app de la famille n'encadre rien. C'est la
    // directive qui compte réellement dans un `<meta>`, contrairement à
    // `frame-ancestors` qui y est ignorée.
    frameSrc = ["'none'"],
    analytics = false,
    extraDirectives = {},
  } = options;

  // `'none'` doit rester seul : mêlé à des hôtes, il produit une directive
  // malformée que les navigateurs interprètent chacun à leur façon.
  //
  // ET `'none'` NE SE RETIRE QUE S'IL EST REMPLACÉ. Depuis le passage à
  // PostHog, `ANALYTICS_HOSTS.frame` est VIDE — plus d'`iframe` `noscript` de
  // GTM à autoriser. Sans la garde ci-dessous, activer la mesure retirait
  // `'none'` sans rien mettre à la place : la directive devenait vide, donc
  // absente, donc `default-src` reprenait la main. On desserrait la politique
  // en croyant l'étendre.
  const withAnalytics = (list, extra) =>
    analytics && extra.length > 0
      ? [...new Set([...list.filter(source => source !== "'none'"), ...extra])]
      : list;

  /**
   * L'hôte d'ingestion de Sentry, LU DANS LE DSN QUE VITE A DÉJÀ RÉSOLU.
   *
   * MESURÉ LE 19/09/2026, ET C'EST UNE PANNE MUETTE : les vingt sites du parc
   * embarquent un DSN (`VITE_SENTRY_DSN` est posé en variable sur chaque
   * dépôt, et l'hôte se lit dans le bundle servi) et AUCUN n'ouvrait
   * `connect-src` à Sentry. Chaque enveloppe partait dans le vide —
   * « Content-Security-Policy … a empêché le chargement d'une ressource
   * (connect-src) à l'adresse https://oXXX.ingest.de.sentry.io/… ». Le parc
   * croyait avoir une remontée d'erreurs ; il n'en avait aucune.
   *
   * PAS D'OPTION À POSER, ET C'EST VOULU. Une case à cocher de plus, c'est
   * vingt applications à modifier et une à oublier — la même leçon que
   * `secrets: inherit`. Le DSN EST la déclaration : s'il est là, l'app parle à
   * Sentry, donc la politique doit l'autoriser ; s'il n'y est pas (fork,
   * développement, app sans observabilité), rien n'est ajouté.
   *
   * L'ORIGINE EXACTE, PAS UN JOKER. `https://*.ingest.de.sentry.io` ouvrirait
   * la politique à tous les projets de tous les comptes hébergés là ; le DSN
   * nomme un hôte, on n'autorise que celui-là.
   */
  let hoteSentry = '';
  const origineDuDsn = dsn => {
    if (!dsn) return '';
    try {
      return new URL(dsn).origin;
    } catch {
      // Un DSN illisible n'est pas une raison de casser un build : Sentry
      // lui-même ne s'initialisera pas, et la politique reste fermée.
      return '';
    }
  };

  return {
    name: 'dwc-csp',
    configResolved(config) {
      hoteSentry = origineDuDsn(config?.env?.VITE_SENTRY_DSN);
    },
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        // `i` et `\s*` ne sont pas décoratifs : sans eux, `<SCRIPT>` et
        // `<script >` ne sont PAS hachés, donc bloqués par la CSP en
        // production alors que le développement fonctionne. Le périmètre, lui,
        // ne change pas : `\s*>` exclut toujours les balises À ATTRIBUT.
        const hashes = [
          ...html.matchAll(/<script\s*>([\s\S]*?)<\/script\s*>/gi),
        ].map(m => sha256(m[1] ?? ''));
        const scripts = withAnalytics(scriptSrc, ANALYTICS_HOSTS.script);
        const scriptSrcValue = dev
          ? ["'self'", "'unsafe-inline'", ...scripts].join(' ')
          : ["'self'", ...scripts, ...hashes].join(' ');

        /** @type {Record<string, string>} */
        const directives = {
          'default-src': "'self'",
          'script-src': scriptSrcValue,
          'style-src': styleSrc.join(' '),
          'img-src': withAnalytics(imgSrc, ANALYTICS_HOSTS.img).join(' '),
          'font-src': fontSrc.join(' '),
          'connect-src': [
            ...new Set([
              ...withAnalytics(connectSrc, ANALYTICS_HOSTS.connect),
              ...(hoteSentry ? [hoteSentry] : []),
            ]),
          ].join(' '),
          'frame-src': withAnalytics(frameSrc, ANALYTICS_HOSTS.frame).join(' '),
          'manifest-src': "'self'",
          'worker-src': "'self'",
          'object-src': "'none'",
          'base-uri': "'self'",
          'form-action': "'self'",
          ...extraDirectives,
        };

        // Directives inertes en <meta> : on les RETIRE, en le disant. HUIT
        // apps de la famille passent `frame-ancestors` ici — lever une
        // exception casserait leur build pour retirer quelque chose que le
        // navigateur ignorait déjà. Le résultat est identique côté protection ;
        // ce qui change, c'est que l'illusion cesse.
        for (const name of META_IGNORED) {
          if (!(name in directives)) continue;
          delete directives[name];
          console.warn(
            `[dwc-csp] « ${name} » retirée : un navigateur l'ignore dans une ` +
              `CSP posée par <meta>. Cette protection doit venir d'un en-tête ` +
              `HTTP — Firebase Hosting : "headers" dans firebase.json ; ` +
              `GitHub Pages ne permet pas d'en poser.`
          );
        }

        const content = Object.entries(directives)
          .filter(([, v]) => v != null && v !== '')
          .map(([k, v]) => `${k} ${v}`)
          .join('; ');
        const meta = `<meta http-equiv="Content-Security-Policy" content="${content}" />`;

        if (CSP_META_RE.test(html)) return html.replace(CSP_META_RE, meta);
        if (CHARSET_RE.test(html)) {
          return html.replace(CHARSET_RE, m => `${m}\n    ${meta}`);
        }
        return html.replace(/<head>/i, `<head>\n    ${meta}`);
      },
    },
  };
}
