/**
 * Helpers Vite partagés pour les PWA miss-* / mister-*.
 *
 * ⚠️ NOM TROMPEUR, CONSERVÉ POUR COMPATIBILITÉ. Ce module ne contient rien de
 * PWA : ni manifest, ni service worker, ni stratégie de cache. Il fait du SEO
 * et de l'analytics. Le même fichier est exporté sous `./vite-seo`, qui dit ce
 * qu'il fait ; `./vite-pwa-base` reste valide et le restera tant que des apps
 * l'importent. La vraie couche PWA est `./vite-pwa` (`pwaBaseOptions`).
 *
 * Généralise les plugins qui étaient dupliqués :
 *   - mister-puzzle/vite-plugin-seo.ts  (GTM/GA4 + sitemap/robots/llms)
 *   - miss-carbook  htmlTrackingPlugin() (GTM/GSC/GA4)
 *
 * N'importe PAS `vite` (peerDep côté consumer) — `pwaSeoPlugin()` renvoie un
 * objet Plugin Vite valide structurellement.
 *
 * Usage (vite.config.ts) :
 *   import { pwaSeoPlugin } from '@mister-guiiug/dev-wpa-config/vite-pwa-base';
 *   export default defineConfig({
 *     plugins: [react(), pwaSeoPlugin({ siteName: 'Mister Puzzle' })],
 *   });
 *
 * Variables d'env lues au build :
 *   VITE_BASE_PATH            ex. /mister-puzzle/   (défaut '/')
 *   VITE_PUBLIC_SITE_ORIGIN   ex. https://mister-guiiug.github.io
 *   VITE_GTM_CONTAINER_ID     ex. GTM-XXXXXXX       (optionnel)
 *   VITE_GA_MEASUREMENT_ID    ex. G-XXXXXXXXXX      (optionnel)
 */
import process from 'node:process';

const DEFAULT_ORIGIN = 'https://mister-guiiug.github.io';

/** Conteneur GTM valide (GTM-XXXX) ou null. */
export function parseGtmContainerId(raw) {
  if (!raw) return null;
  const id = raw.trim().toUpperCase();
  return /^GTM-[A-Z0-9]+$/.test(id) ? id : null;
}

/** ID de mesure GA4 valide (G-XXXX) ou null. */
export function parseGaMeasurementId(raw) {
  if (!raw) return null;
  const id = raw.trim().toUpperCase();
  return /^G-[A-Z0-9]+$/.test(id) ? id : null;
}

/**
 * Origin + URL d'accueil (+ URL logo) dérivés des variables d'env.
 *
 * Rétro-compatible : accepte soit une string `basePath` (ancienne signature),
 * soit un objet `{ basePath, logoPath, iconQuery }`. `logoUrl` n'est calculé
 * que si `logoPath` est fourni.
 *
 * @param {string | { basePath?: string, logoPath?: string, iconQuery?: string }} [arg]
 */
export function resolveSeoPublicUrls(arg) {
  const opts = typeof arg === 'string' ? { basePath: arg } : (arg ?? {});
  const { basePath, logoPath, iconQuery = '' } = opts;
  const origin = (
    process.env.VITE_PUBLIC_SITE_ORIGIN || DEFAULT_ORIGIN
  ).replace(/\/$/, '');
  const base = (basePath ?? process.env.VITE_BASE_PATH ?? '/').replace(
    /\/?$/,
    '/'
  );
  const homeUrl = `${origin}${base === '/' ? '/' : base}`;
  const logoUrl = logoPath
    ? `${homeUrl}${logoPath.replace(/^\//, '')}${iconQuery}`
    : undefined;
  return { origin, homeUrl, logoUrl };
}

/**
 * Fragments HTML analytics (GTM et/ou GA4) à injecter dans <head>/<body>.
 * Si GTM ET GA4 sont définis : seul GTM est chargé (configurez GA4 dans GTM
 * pour éviter le double comptage).
 */
export function buildAnalyticsHtmlFragments(overrides = {}) {
  const gtm = parseGtmContainerId(
    overrides.gtmContainerId ?? process.env.VITE_GTM_CONTAINER_ID
  );
  const ga = parseGaMeasurementId(
    overrides.gaMeasurementId ?? process.env.VITE_GA_MEASUREMENT_ID
  );

  const gtmHead = id => `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${id}');</script>
<!-- End Google Tag Manager -->`;

  const gtmBody = id => `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${id}" height="0" width="0" style="display:none;visibility:hidden" title="Google Tag Manager"></iframe></noscript>
<!-- End Google Tag Manager -->`;

  if (gtm) {
    return { head: gtmHead(gtm), body: gtmBody(gtm) };
  }
  if (ga) {
    return {
      head: `<!-- Google tag (gtag.js) / GA4 -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${ga}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${ga}');
</script>`,
      body: '',
    };
  }
  return { head: '', body: '' };
}

/**
 * Plugin Vite : injecte les placeholders d'index.html et génère sitemap.xml /
 * robots.txt en fin de build.
 *
 * Placeholders remplacés dans index.html :
 *   __SEO_HOME_URL__     URL d'accueil canonique
 *   __ANALYTICS_HEAD__   snippet analytics <head>
 *   __ANALYTICS_BODY__   snippet analytics <body> (noscript GTM)
 *
 * Placeholders supplémentaires (si `logoPath`/`iconQuery` fournis) :
 *   __SEO_LOGO_URL__     URL absolue du logo (Open Graph / Twitter / JSON-LD)
 *   __PWA_ICON_QS__      query-string de cache-busting des icônes
 *
 * @param {object} [opts]
 * @param {string}  [opts.siteName]        Nom du site (commentaire sitemap).
 * @param {boolean} [opts.sitemap=true]    Générer sitemap.xml.
 * @param {boolean} [opts.robots=true]     Générer robots.txt.
 * @param {string}  [opts.outDir='dist']   Dossier de sortie du build.
 * @param {string}  [opts.changefreq='weekly']
 * @param {string}  [opts.basePath]        Force le base path (sinon VITE_BASE_PATH).
 * @param {string}  [opts.logoPath]        Chemin du logo (ex. '/logo.svg') → __SEO_LOGO_URL__.
 * @param {string}  [opts.iconQuery='']    Query de cache-busting (ex. '?v=1.0.1') → __PWA_ICON_QS__.
 * @param {string}  [opts.llms]            Contenu d'un `llms.txt` à écrire (omis = pas de fichier).
 * @param {Record<string,string>} [opts.extraReplacements={}] Placeholders custom → valeurs.
 */
export function pwaSeoPlugin(opts = {}) {
  const {
    sitemap = true,
    robots = true,
    outDir = 'dist',
    changefreq = 'weekly',
    basePath,
    logoPath,
    iconQuery = '',
    llms,
    gtmContainerId,
    gaMeasurementId,
    extraReplacements = {},
  } = opts;
  const urlOpts = { basePath, logoPath, iconQuery };
  // Résolus depuis la config Vite : on respecte un `build.outDir` personnalisé
  // et on ne génère les fichiers (sitemap/robots/llms) qu'en mode build.
  let resolvedOutDir = outDir;
  let isBuild = false;
  return {
    name: 'mister-guiiug:pwa-seo',

    /**
     * Empêche le pré-bundling de `react/observability`.
     *
     * Ce module charge Sentry (peer OPTIONNELLE) par un import dynamique dont
     * le spécificateur est volontairement non littéral, précisément pour rester
     * inanalysable. L'optimiseur de dépendances replie malgré tout la
     * concaténation en littéral — vérifié dans la sortie générée — et
     * `vite:import-analysis` échoue alors à résoudre `@sentry/react` dans les
     * apps qui ne l'ont pas installé : **500 sur toute la page en dev**.
     * Le build de production n'est pas concerné.
     *
     * Trois apps avaient déjà écrit cette exclusion à la main, chacune de son
     * côté. Elle appartient au paquet, pas aux apps : c'est son propre module
     * qui est en cause.
     */
    config() {
      return {
        optimizeDeps: {
          exclude: ['@mister-guiiug/dev-wpa-config/react/observability'],
        },
      };
    },

    configResolved(config) {
      resolvedOutDir = config?.build?.outDir || outDir;
      isBuild = config?.command === 'build';
    },
    transformIndexHtml(html) {
      const { homeUrl, logoUrl } = resolveSeoPublicUrls(urlOpts);
      const { head, body } = buildAnalyticsHtmlFragments({
        gtmContainerId,
        gaMeasurementId,
      });
      let out = html
        .replaceAll('__SEO_HOME_URL__', homeUrl)
        .replaceAll('__SEO_LOGO_URL__', logoUrl ?? homeUrl)
        .replaceAll('__PWA_ICON_QS__', iconQuery)
        .replaceAll('__ANALYTICS_HEAD__', head)
        .replaceAll('__ANALYTICS_BODY__', body);
      for (const [marker, value] of Object.entries(extraReplacements)) {
        out = out.replaceAll(marker, value);
      }
      return out;
    },
    async closeBundle() {
      // Hook de build : ne rien écrire en dev/serve (au cas où l'outil l'appelle).
      if (!isBuild) return;
      const fs = await import('node:fs');
      const path = await import('node:path');
      const { homeUrl } = resolveSeoPublicUrls(urlOpts);
      const dist = path.resolve(process.cwd(), resolvedOutDir);
      // Crée le dossier de sortie si absent (évite ENOENT quand le build
      // n'a encore rien émis, ou avec un `build.outDir` personnalisé).
      fs.mkdirSync(dist, { recursive: true });
      if (sitemap) {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${homeUrl}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
        fs.writeFileSync(path.join(dist, 'sitemap.xml'), xml, 'utf8');
      }
      if (robots) {
        const txt = `User-agent: *
Allow: /

Sitemap: ${homeUrl}sitemap.xml
`;
        fs.writeFileSync(path.join(dist, 'robots.txt'), txt, 'utf8');
      }
      if (llms) {
        fs.writeFileSync(path.join(dist, 'llms.txt'), llms, 'utf8');
      }
    },
  };
}
