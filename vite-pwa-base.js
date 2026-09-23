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
 *   - mister-puzzle/vite-plugin-seo.ts  (analytics + sitemap/robots/llms)
 *   - miss-carbook  htmlTrackingPlugin() (GSC/GA4)
 *
 * N'importe PAS `vite` (peerDep côté consumer) — `pwaSeoPlugin()` renvoie un
 * objet Plugin Vite valide structurellement.
 *
 * Usage (vite.config.ts) :
 *   import { pwaSeoPlugin } from '@mister-guiiug/dev-pwa-config/vite-pwa-base';
 *   export default defineConfig({
 *     plugins: [react(), pwaSeoPlugin({ siteName: 'Mister Puzzle' })],
 *   });
 *
 * Variables d'env lues au build :
 *   VITE_BASE_PATH            ex. /mister-puzzle/   (défaut '/')
 *   VITE_PUBLIC_SITE_ORIGIN   ex. https://mister-guiiug.github.io
 */
import {
  stripThemeColorMeta,
  themeBootScript,
  themeColorMetaTags,
} from './theme-boot.js';
import { FAMILY_APPS, FAMILY_ORIGIN, GITHUB_OWNER } from './apps-catalog.js';

import process from 'node:process';

const DEFAULT_ORIGIN = 'https://mister-guiiug.github.io';

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
 * La catégorie éditoriale du catalogue, dans le vocabulaire que Google
 * documente pour `applicationCategory`. Une valeur hors de cette liste est
 * acceptée par schema.org mais ignorée par Google.
 */
export const SCHEMA_APPLICATION_CATEGORIES = {
  sante: 'HealthApplication',
  sport: 'SportsApplication',
  jeux: 'GameApplication',
  loisirs: 'LifestyleApplication',
  education: 'EducationalApplication',
  outils: 'UtilitiesApplication',
  dev: 'DeveloperApplication',
};

const ENTITES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
};

function decoderEntites(texte) {
  return texte.replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, e) => ENTITES[e]);
}

/**
 * La valeur d'un attribut, quelle que soit sa quote. Une apostrophe DANS une
 * valeur entre guillemets n'arrête rien : « Lancer un dé d'un geste » doit
 * sortir entier, et un motif `[^"']*` le coupait à « d ».
 */
function attribut(balise, nom) {
  const m = new RegExp(`\\b${nom}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(
    balise
  );
  return m ? decoderEntites(m[2] ?? m[3] ?? '') : '';
}

function metaDe(html, cle) {
  for (const [balise] of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (
      attribut(balise, 'name') === cle ||
      attribut(balise, 'property') === cle
    )
      return attribut(balise, 'content').trim();
  }
  return '';
}

/**
 * Les données structurées schema.org d'une app du parc : un `WebApplication`.
 *
 * POURQUOI ICI, ET SANS RÉGLAGE. Relevé du 23/09/2026 sur les vingt et un
 * sites servis : UN SEUL portait du JSON-LD (`mister-puzzle`, écrit à la
 * main). Les vingt autres n'en avaient pas, alors que tout ce qu'il faut est
 * déjà là : le NOM et la CATÉGORIE dans le catalogue, la DESCRIPTION, l'IMAGE
 * et la LANGUE dans l'`index.html` que l'app a écrit. Rien n'est donc demandé
 * aux apps.
 *
 * La description de la PAGE l'emporte sur celle du catalogue : c'est celle que
 * l'app a écrite pour les moteurs, souvent plus riche. Une image qui n'est que
 * l'URL d'accueil — le repli de `__SEO_LOGO_URL__` sans `logoPath` — n'en est
 * pas une : on prend alors l'icône du catalogue.
 *
 * Pas de note ni d'avis : Google n'affiche la fiche enrichie d'une application
 * qu'avec une note, et en inventer une serait une donnée fausse.
 *
 * @param {{ html: string, homeUrl: string, overrides?: object }} opts
 * @returns {object | null} `null` sans nom ou sans description.
 */
export function webApplicationJsonLd({ html, homeUrl, overrides = {} }) {
  const id = new URL(homeUrl).pathname.split('/').find(Boolean);
  const fiche = FAMILY_APPS.find(a => a.id === id && a.platform === 'web');
  const titre = decoderEntites(
    (/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '').trim()
  );
  const name =
    fiche?.name ||
    metaDe(html, 'og:site_name') ||
    metaDe(html, 'og:title') ||
    titre;
  const description = metaDe(html, 'description') || fiche?.description || '';
  if (!name || !description) return null;

  const imagePage = metaDe(html, 'og:image');
  const image =
    /^https?:\/\//.test(imagePage) && !imagePage.endsWith('/')
      ? imagePage
      : (fiche?.iconUrl ?? undefined);
  const lang = attribut(/<html\b[^>]*>/i.exec(html)?.[0] ?? '', 'lang');
  const categorie = SCHEMA_APPLICATION_CATEGORIES[fiche?.category];

  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    description,
    url: homeUrl,
    ...(image ? { image } : {}),
    ...(categorie ? { applicationCategory: categorie } : {}),
    operatingSystem: 'Web',
    browserRequirements: 'Requires JavaScript',
    ...(lang ? { inLanguage: lang } : {}),
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
    author: {
      '@type': 'Person',
      name: GITHUB_OWNER,
      url: `https://github.com/${GITHUB_OWNER}`,
    },
    isPartOf: {
      '@type': 'WebSite',
      name: `Les applications de ${GITHUB_OWNER}`,
      url: `${FAMILY_ORIGIN}/`,
    },
    ...(fiche?.repoUrl ? { sameAs: [fiche.repoUrl] } : {}),
    ...overrides,
  };
}

/**
 * Le bloc `<script>` d'un objet JSON-LD. `<` est échappé : une description
 * contenant `</script>` fermerait sinon le bloc et laisserait le reste
 * s'interpréter comme du HTML.
 *
 * Un `<script type="application/ld+json">` n'est pas exécuté : `cspPlugin` le
 * laisse hors de `script-src`, et c'est exact.
 */
export function jsonLdScript(donnees) {
  return `<script type="application/ld+json">${JSON.stringify(donnees).replace(
    /</g,
    '\\u003c'
  )}</script>`;
}

function echapperXml(texte) {
  return texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Plugin Vite : injecte les placeholders d'index.html et génère sitemap.xml /
 * robots.txt en fin de build.
 *
 * Placeholders remplacés dans index.html :
 *   __SEO_HOME_URL__     URL d'accueil canonique
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
 * @param {boolean | object} [opts.jsonLd=true] Données structurées
 *   `WebApplication` injectées dans `<head>` (voir `webApplicationJsonLd`).
 *   `false` les coupe ; un objet surcharge des champs. Jamais injectées si la
 *   page porte déjà un `application/ld+json`.
 * @param {string[]} [opts.routes=[]] Chemins à ajouter au plan de site, relatifs
 *   à l'accueil (`'a-propos'`, `'en/'`). Seulement des écrans PUBLICS, servis
 *   à froid : un chemin derrière une connexion n'a rien à y faire.
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
    themeBoot,
    themeColor,
    extraReplacements = {},
    jsonLd = true,
    routes = [],
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
          exclude: [
            '@mister-guiiug/dev-pwa-config/react/observability',
            // Même famille de panne, autre module : `map/maplibre` résout
            // l'URL de son worker par le suffixe Vite `?worker&url`, sans quoi
            // MapLibre cherche un fichier que le bundler n'émet pas et la
            // carte meurt EN PRODUCTION. Mais le pré-bundling ne sait pas
            // interpréter ce suffixe : `vite dev` échoue au démarrage sur
            // `[UNLOADABLE_DEPENDENCY]`. Le premier consommateur a écrit
            // l'exclusion à la main ; comme ci-dessus, elle appartient au
            // paquet dont le module est en cause, pas aux apps.
            '@mister-guiiug/dev-pwa-config/map/maplibre',
            // Ces deux-là n'ont pas de suffixe problématique : ils importent
            // `react/observability`, qui est exclu ci-dessus. Un module
            // pré-bundlé embarque sa copie des modules qu'il importe — la
            // duplication d'un module À ÉTAT donne alors DEUX contextes de
            // session, et le câblage de la corrélation ne produit plus rien,
            // silencieusement. Règle générale : ce qui importe un singleton
            // exclu doit être exclu aussi.
            '@mister-guiiug/dev-pwa-config/correlation',
            '@mister-guiiug/dev-pwa-config/logger',
          ],
        },
      };
    },

    configResolved(config) {
      resolvedOutDir = config?.build?.outDir || outDir;
      isBuild = config?.command === 'build';
    },
    transformIndexHtml(html) {
      const { homeUrl, logoUrl } = resolveSeoPublicUrls(urlOpts);
      // Le script anti-FOUC, INJECTÉ plutôt que recopié. Treize apps sur seize
      // en portent un à la main dans leur `index.html`, de dix à trente-trois
      // lignes ; il doit rester inline et synchrone, donc hors de portée d'un
      // module. Il est posé en TÊTE de `<head>` : tout ce qui le suit peint
      // déjà avec le bon thème.
      //
      // `cspPlugin` hache les scripts inline en `order: 'post'`, à partir du
      // HTML final — celui-ci est donc couvert sans réglage supplémentaire.
      let out = html;
      // La barre du navigateur suit le thème système, DÈS LE PREMIER RENDU.
      // Dix apps sur quinze gardaient une barre claire en mode sombre, faute
      // d'attribut `media` sur la balise. On remplace la balise existante :
      // en laisser deux ferait gagner la dernière, au hasard de l'ordre.
      if (themeColor) {
        const tags = themeColorMetaTags(themeColor);
        if (tags) {
          out = stripThemeColorMeta(out);
          out = out.includes('<head>')
            ? out.replace('<head>', `<head>\n    ${tags}`)
            : `${tags}\n${out}`;
        }
      }
      if (themeBoot) {
        const boot = themeBootScript(
          typeof themeBoot === 'object' ? themeBoot : {}
        );
        out = out.includes('<head>')
          ? out.replace('<head>', `<head>\n    ${boot}`)
          : `${boot}\n${out}`;
      }
      out = out
        .replaceAll('__SEO_HOME_URL__', homeUrl)
        .replaceAll('__SEO_LOGO_URL__', logoUrl ?? homeUrl)
        .replaceAll('__PWA_ICON_QS__', iconQuery);
      for (const [marker, value] of Object.entries(extraReplacements)) {
        out = out.replaceAll(marker, value);
      }
      // APRÈS les remplacements : l'image et l'URL lues dans la page doivent
      // être les valeurs finales, pas les marqueurs.
      if (jsonLd !== false && !/application\/ld\+json/i.test(out)) {
        const donnees = webApplicationJsonLd({
          html: out,
          homeUrl,
          overrides: typeof jsonLd === 'object' ? jsonLd : {},
        });
        if (donnees && out.includes('</head>')) {
          out = out.replace('</head>', `  ${jsonLdScript(donnees)}\n  </head>`);
        }
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
        // `lastmod` = le jour du build. Google ignore `changefreq` et
        // `priority`, mais lit `lastmod` quand il est fiable : c'est le seul
        // champ qui lui dise qu'il y a du neuf à revoir. Le build part d'une
        // fusion, donc d'un changement réel. Relevé du 23/09/2026 : aucun des
        // vingt et un plans de site n'en portait.
        const lastmod = new Date().toISOString().slice(0, 10);
        const urls = [
          homeUrl,
          ...routes.map(r => `${homeUrl}${String(r).replace(/^\//, '')}`),
        ];
        const entrees = urls
          .map(
            loc => `  <url>
    <loc>${echapperXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${loc === homeUrl ? '1.0' : '0.8'}</priority>
  </url>`
          )
          .join('\n');
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entrees}
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

/**
 * Repli SPA pour GitHub Pages : `404.html` identique à `index.html`.
 *
 * GITHUB PAGES N'A PAS DE REPLI SPA. Rafraîchir `/miss-contraction/a-propos`
 * — ou ouvrir un lien partagé — sert sa page « File not found », pas l'app.
 * Le contournement connu : un `404.html` copié d'`index.html`. GitHub le sert
 * (en 404, mais il le sert), la coquille démarre, le routeur lit l'URL.
 *
 * MESURÉ LE 02/09/2026 sur les sites publiés : quatre apps à routage par
 * chemin servaient la page de GitHub (contraction, footcoach, badminton,
 * family-map). Trois autres avaient écrit la correction chacune chez elles —
 * un script `copy-404.mjs` dans `build` (carbook), un plugin Vite en ligne
 * (molkky), le même plugin recopié à la lettre (dice). C'est ce plugin-là,
 * promu.
 *
 * Le service worker masque le défaut après la première visite (Workbox sert
 * `index.html` à toute navigation de son périmètre). Il reste entier pour un
 * lien partagé ouvert à froid, un navigateur sans service worker, et tout ce
 * qui indexe.
 *
 * INOFFENSIF pour une app qui route par `#` : GitHub ne voit jamais le chemin,
 * le fichier ne sert simplement jamais. Et une app qui bascule un jour vers
 * les chemins n'a rien à découvrir.
 *
 * Le workflow réutilisable `pwa-deploy.yml` fait la même copie APRÈS le build
 * si le fichier manque : les apps déployées par lui sont couvertes sans
 * changer une ligne. Ce plugin sert au reste — `vite preview`, un autre
 * hébergeur, un déploiement écrit à la main.
 *
 *   plugins: [VitePWA(…), pwaSeoPlugin(…), spaFallbackPlugin()]
 *
 * @param {{ outDir?: string, from?: string, to?: string }} [opts]
 *   `outDir` (défaut `dist`, ou `build.outDir` de la config), `from` (défaut
 *   `index.html`), `to` (défaut `404.html`).
 */
export function spaFallbackPlugin(opts = {}) {
  const { outDir = 'dist', from = 'index.html', to = '404.html' } = opts;
  let resolvedOutDir = outDir;
  let isBuild = false;
  return {
    name: 'mister-guiiug:spa-fallback',
    configResolved(config) {
      resolvedOutDir = config?.build?.outDir || outDir;
      isBuild = config?.command === 'build';
    },
    async closeBundle() {
      // Hook de build : rien à copier en dev, où il n'y a pas de `dist`.
      if (!isBuild) return;
      const fs = await import('node:fs');
      const path = await import('node:path');
      const dist = path.resolve(process.cwd(), resolvedOutDir);
      const source = path.join(dist, from);
      if (!fs.existsSync(source)) {
        // Pas de coquille, pas de repli — et pas d'échec de build pour ça :
        // le défaut est déjà visible dans le déploiement, pas ici.
        console.warn(
          `[spa-fallback] ${from} introuvable dans ${resolvedOutDir} : ${to} non écrit.`
        );
        return;
      }
      fs.copyFileSync(source, path.join(dist, to));
    },
  };
}
