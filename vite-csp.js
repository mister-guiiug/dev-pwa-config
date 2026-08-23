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
 * Ne matche que `<script>` sans attribut : les `<script src>`, `<script type=...>`
 * (modules, JSON-LD) ne sont pas concernés par un hash inline et sont ignorés.
 *
 * Usage (vite.config.ts) :
 *   import { cspPlugin } from '@mister-guiiug/dev-wpa-config/vite-csp';
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
 * Hôtes exigés par les fragments analytics qu'injecte `pwaSeoPlugin`.
 *
 * Les deux plugins du paquet sont documentés côte à côte, dans le même exemple,
 * et se cassaient mutuellement : GA4 charge un `<script src>` externe et GTM un
 * `<iframe>` de repli `noscript`, tous deux bloqués par `default-src 'self'`.
 * Activer les deux coupait l'analytics sans erreur de build — silencieusement.
 */
export const ANALYTICS_HOSTS = {
  script: ['https://www.googletagmanager.com'],
  img: ['https://www.googletagmanager.com', 'https://*.google-analytics.com'],
  connect: [
    'https://www.googletagmanager.com',
    'https://*.google-analytics.com',
    'https://*.analytics.google.com',
  ],
  frame: ['https://www.googletagmanager.com'],
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
  const withAnalytics = (list, extra) =>
    analytics
      ? [...new Set([...list.filter(source => source !== "'none'"), ...extra])]
      : list;

  return {
    name: 'dwc-csp',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
          m => sha256(m[1] ?? '')
        );
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
          'connect-src': withAnalytics(
            connectSrc,
            ANALYTICS_HOSTS.connect
          ).join(' '),
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
