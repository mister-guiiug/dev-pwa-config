/**
 * Helpers Vite partagés pour les PWA miss-* / mister-*.
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

/** Origin + URL d'accueil, dérivés des variables d'env. */
export function resolveSeoPublicUrls(basePath) {
  const origin = (
    process.env.VITE_PUBLIC_SITE_ORIGIN || DEFAULT_ORIGIN
  ).replace(/\/$/, '');
  const base = (basePath ?? process.env.VITE_BASE_PATH ?? '/').replace(
    /\/?$/,
    '/'
  );
  return { origin, homeUrl: `${origin}${base === '/' ? '/' : base}` };
}

/**
 * Fragments HTML analytics (GTM et/ou GA4) à injecter dans <head>/<body>.
 * Si GTM ET GA4 sont définis : seul GTM est chargé (configurez GA4 dans GTM
 * pour éviter le double comptage).
 */
export function buildAnalyticsHtmlFragments() {
  const gtm = parseGtmContainerId(process.env.VITE_GTM_CONTAINER_ID);
  const ga = parseGaMeasurementId(process.env.VITE_GA_MEASUREMENT_ID);

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
 * @param {object} [opts]
 * @param {string} [opts.siteName]        Nom du site (commentaire sitemap).
 * @param {boolean} [opts.sitemap=true]   Générer sitemap.xml + robots.txt.
 * @param {string} [opts.outDir='dist']   Dossier de sortie du build.
 * @param {string} [opts.changefreq='weekly']
 */
export function pwaSeoPlugin(opts = {}) {
  const { sitemap = true, outDir = 'dist', changefreq = 'weekly' } = opts;
  return {
    name: 'mister-guiiug:pwa-seo',
    transformIndexHtml(html) {
      const { homeUrl } = resolveSeoPublicUrls();
      const { head, body } = buildAnalyticsHtmlFragments();
      return html
        .replaceAll('__SEO_HOME_URL__', homeUrl)
        .replaceAll('__ANALYTICS_HEAD__', head)
        .replaceAll('__ANALYTICS_BODY__', body);
    },
    async closeBundle() {
      if (!sitemap) return;
      const fs = await import('node:fs');
      const path = await import('node:path');
      const { homeUrl } = resolveSeoPublicUrls();
      const dist = path.resolve(process.cwd(), outDir);
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${homeUrl}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
      const robots = `User-agent: *
Allow: /

Sitemap: ${homeUrl}sitemap.xml
`;
      fs.writeFileSync(path.join(dist, 'sitemap.xml'), xml, 'utf8');
      fs.writeFileSync(path.join(dist, 'robots.txt'), robots, 'utf8');
    },
  };
}
