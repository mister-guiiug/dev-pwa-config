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
 *   PWA_SEO_PREVIOUS_STATE    chemin du `seo-state.json` du déploiement
 *                             précédent : une URL dont l'empreinte n'a pas
 *                             bougé y reprend son `lastmod` (voir `seoState`)
 *   PWA_SEO_CHANGED_FILE      où écrire `seo-changed.json`, la liste des URL
 *                             nouvelles ou modifiées, HORS du site publié
 *                             (défaut `node_modules/.cache/pwa-seo/…`)
 */
import {
  stripThemeColorMeta,
  themeBootScript,
  themeColorMetaTags,
} from './theme-boot.js';
import {
  FAMILY_APPS,
  FAMILY_ORIGIN,
  GITHUB_OWNER,
  PUBLISHER,
  SITE_ID,
} from './apps-catalog.js';
// Lu au build seulement : hors du catalogue, qui part dans le bundle.
import { appSeo } from './apps-seo.js';

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve, sep } from 'node:path';
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

/**
 * Le texte du premier `<title>`, par deux `indexOf` et non par une regex :
 * `/<title>([\s\S]*?)<\/title>/` est quadratique sur une entrée qui répète
 * `<title>` sans jamais le fermer (CodeQL `js/polynomial-redos`). L'entrée est
 * l'`index.html` de l'app, mais la fonction est exportée.
 */
function contenuDuTitre(html) {
  const bas = html.toLowerCase();
  const debut = bas.indexOf('<title>');
  if (debut < 0) return '';
  const fin = bas.indexOf('</title>', debut + 7);
  return fin < 0 ? '' : html.slice(debut + 7, fin);
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

/** La page porte-t-elle une balise `<meta>` de ce nom, quel que soit son contenu ? */
function aMeta(html, cle) {
  for (const [balise] of html.matchAll(/<meta\b[^>]*>/gi)) {
    if (
      attribut(balise, 'name') === cle ||
      attribut(balise, 'property') === cle
    )
      return true;
  }
  return false;
}

/** Le `lang` de `<html>`, ou `''`. */
function langueDe(html) {
  return attribut(/<html\b[^>]*>/i.exec(html)?.[0] ?? '', 'lang');
}

/** Le `href` de la `<link rel="canonical">`, ou `''`. */
function canoniqueDe(html) {
  for (const [balise] of html.matchAll(/<link\b[^>]*>/gi)) {
    if (/^canonical$/i.test(attribut(balise, 'rel')))
      return attribut(balise, 'href').trim();
  }
  return '';
}

/** Les deux premières lettres d'une étiquette de langue, en minuscules. */
function langue2(tag) {
  return String(tag ?? '')
    .slice(0, 2)
    .toLowerCase();
}

/**
 * La fiche du catalogue d'une app WEB, d'après son URL d'accueil — une app de
 * bureau n'a pas de page sur l'origine.
 *
 * @param {string} homeUrl
 */
function ficheDe(homeUrl) {
  const id = new URL(homeUrl).pathname.split('/').find(Boolean);
  return FAMILY_APPS.find(a => a.id === id && a.platform === 'web');
}

/** Au plus quatre sœurs ; en dessous de deux, la liste est complétée. */
const VOISINES_MAX = 4;
const VOISINES_MIN = 2;

/**
 * LES APPS SŒURS — ce que « Dans la même catégorie » lie, sur les pages de
 * contenu comme dans le contenu servi de l'accueil.
 *
 * Relevé du 29/09/2026 : parmi les quarante pages statiques du parc, AUCUNE ne
 * liait une autre app. Le composant `FamilyApps` n'existe qu'au rendu
 * JavaScript, sur des écrans qu'un robot ne voit pas ; tout le maillage
 * passait donc par le hub, et les grappes naturelles — Supabase, santé, sport,
 * jeux — restaient invisibles.
 *
 * La catégorie du catalogue, les apps WEB seulement, l'app elle-même exceptée,
 * quatre au plus. Si la catégorie en compte moins de deux, la liste est
 * COMPLÉTÉE par les apps qui suivent dans le catalogue, en boucle : une
 * rotation, pour que les deux premières du catalogue ne reçoivent pas tous les
 * liens. `memeCategorie` vaut alors `false`, et le titre du bloc change : « Dans
 * la même catégorie » au-dessus d'apps qui n'en sont pas serait faux.
 *
 * @param {string} id Identifiant de l'app courante.
 * @returns {{ memeCategorie: boolean, apps: import('./apps-catalog').FamilyApp[] }}
 *   Une liste vide pour une app hors catalogue.
 */
export function relatedApps(id) {
  const web = FAMILY_APPS.filter(a => a.platform === 'web');
  const fiche = web.find(a => a.id === id);
  if (!fiche) return { memeCategorie: false, apps: [] };
  const soeurs = web
    .filter(a => a.id !== id && a.category && a.category === fiche.category)
    .slice(0, VOISINES_MAX);
  if (soeurs.length >= VOISINES_MIN)
    return { memeCategorie: true, apps: soeurs };
  const rang = web.indexOf(fiche);
  const suite = [...web.slice(rang + 1), ...web.slice(0, rang)].filter(
    a => !soeurs.includes(a)
  );
  return {
    memeCategorie: false,
    apps: [...soeurs, ...suite.slice(0, VOISINES_MIN - soeurs.length)],
  };
}

/**
 * La région par défaut d'une langue, pour `og:locale`. Courte, et c'est
 * voulu : au-delà, on n'invente pas de territoire.
 *
 * @type {Record<string, string>}
 */
const REGION_OG = {
  fr: 'FR',
  en: 'US',
  es: 'ES',
  de: 'DE',
  it: 'IT',
  pt: 'PT',
  nl: 'NL',
  ca: 'ES',
  pl: 'PL',
  sv: 'SE',
  da: 'DK',
  fi: 'FI',
  cs: 'CZ',
  el: 'GR',
  ro: 'RO',
  hu: 'HU',
  ru: 'RU',
  uk: 'UA',
  tr: 'TR',
  ja: 'JP',
  ko: 'KR',
  zh: 'CN',
};

/**
 * La valeur `og:locale` d'une étiquette de langue : `fr` → `fr_FR`, `en` →
 * `en_US`, `pt-BR` → `pt_BR`. Open Graph attend `langue_TERRITOIRE` ; « fr »,
 * que servaient les vingt pages de contenu du parc au 29/09/2026, n'en est pas
 * un. `''` pour une langue sans région connue — on n'en invente pas.
 *
 * @param {string} lang
 */
export function ogLocale(lang) {
  const m = /^([a-z]{2,3})(?:[-_]([a-z]{2}))?$/i.exec(
    String(lang ?? '').trim()
  );
  if (!m) return '';
  const code = m[1].toLowerCase();
  if (m[2]) return `${code}_${m[2].toUpperCase()}`;
  return REGION_OG[code] ? `${code}_${REGION_OG[code]}` : '';
}

/**
 * LES BALISES TEXTE DE L'ACCUEIL, posées quand elles manquent : `og:type`,
 * `og:site_name`, `og:locale`, `og:url`, `og:title`, `og:description`,
 * `twitter:card`, `twitter:title` et `twitter:description`.
 *
 * Relevé du 29/09/2026 : six accueils n'avaient ni `og:site_name` ni
 * `og:locale`, deux n'avaient pas leur `twitter:title` ou leur
 * `twitter:description`, et le gabarit du socle n'en portait aucune — chaque
 * app les écrivait à la main, ou ne les écrivait pas. Tout ce qu'il faut est
 * déjà dans la page : le `<title>`, la description, la canonique, la langue ;
 * le nom vient du catalogue.
 *
 * Une balise écrite à la main n'est JAMAIS remplacée : c'est l'app qui sait ce
 * qu'elle veut dire. Une seule exception, `og:locale`, NORMALISÉ (`fr` →
 * `fr_FR`) : ce n'est pas un choix éditorial, c'est un format.
 *
 * `twitter:card` vaut `summary` quand il manque ; l'image de partage
 * (`setShareImage`) le remplace ensuite par `summary_large_image`.
 *
 * @param {string} html
 * @param {{ siteName?: string, url?: string }} [opts] `siteName` : le nom du
 *   site ; `url` : l'URL de la page, pour `og:url` quand la page n'a pas de
 *   canonique.
 */
export function setTextMeta(html, opts = {}) {
  if (!html.includes('</head>')) return html;
  const locale = ogLocale(langueDe(html));
  let out = html.replace(/<meta\b[^>]*>/gi, balise => {
    if (
      attribut(balise, 'property') !== 'og:locale' &&
      attribut(balise, 'name') !== 'og:locale'
    )
      return balise;
    const valeur = attribut(balise, 'content').trim();
    const norme = ogLocale(valeur);
    return norme && norme !== valeur
      ? balise.replace(
          /\bcontent\s*=\s*("[^"]*"|'[^']*')/i,
          () => `content="${norme}"`
        )
      : balise;
  });
  const titre = decoderEntites(contenuDuTitre(out).trim());
  const description = metaDe(out, 'description');
  const url = canoniqueDe(out) || opts.url || '';
  /** @type {string[]} */
  const balises = [];
  const poser = (
    /** @type {string} */ attr,
    /** @type {string} */ cle,
    /** @type {string | undefined} */ valeur
  ) => {
    if (valeur && !aMeta(out, cle))
      balises.push(
        `<meta ${attr}="${cle}" content="${echapperXml(valeur)}" />`
      );
  };
  poser('property', 'og:type', 'website');
  poser('property', 'og:site_name', opts.siteName);
  poser('property', 'og:locale', locale);
  poser('property', 'og:url', url);
  poser('property', 'og:title', titre);
  poser('property', 'og:description', description);
  poser('name', 'twitter:card', 'summary');
  poser('name', 'twitter:title', titre);
  poser('name', 'twitter:description', description);
  return balises.length ? avantFinHead(out, balises.join('\n    ')) : out;
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
 * UN SEUL GRAPHE D'ENTITÉS (29/09/2026). Le `WebApplication` porte un `@id`,
 * `<accueil>#app`, que les pages de contenu désignent par `about`. Il renvoie
 * à l'éditeur de la famille par `author` et `publisher` — le nœud `PUBLISHER`
 * du catalogue, repris dans le `@graph` — et au site du parc par `isPartOf`
 * (`SITE_ID`). `sameAs` ne cite plus que le DÉPÔT : l'accueil du parc est une
 * autre entité, déjà reliée par `isPartOf`. Jusque-là, l'auteur était une
 * `Person` redéclarée sur chaque page, sans `@id` : pour un graphe de
 * connaissances, un éditeur par page.
 *
 * `inLanguage` : les langues de l'INTERFACE relevées dans `apps-seo.js`
 * (`languages`), sinon celle de la page — quinze apps sont multilingues, le
 * `<html lang>` n'en disait qu'une. `featureList` : les fonctions qu'il relève
 * (`features`). `screenshot` : les captures du MANIFESTE en URL absolues — le
 * plugin les reporte au build, une fois le manifeste écrit (`writeBundle`).
 *
 * @param {{ html: string, homeUrl: string, overrides?: Record<string, unknown>, screenshots?: string[] }} opts
 * @returns {{ '@context': string, '@graph': Array<Record<string, unknown>> } | null}
 *   `null` sans nom ou sans description. `overrides` s'applique au
 *   `WebApplication`, premier nœud du graphe.
 */
export function webApplicationJsonLd({
  html,
  homeUrl,
  overrides = {},
  screenshots = [],
}) {
  const fiche = ficheDe(homeUrl);
  const titre = decoderEntites(contenuDuTitre(html).trim());
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
  const lang = langueDe(html);
  const seo = fiche ? appSeo(fiche.id) : undefined;
  const langues = seo?.languages.length ? [...seo.languages] : lang;
  const categorie = fiche?.category
    ? SCHEMA_APPLICATION_CATEGORIES[fiche.category]
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${homeUrl}#app`,
        name,
        description,
        url: homeUrl,
        ...(image ? { image } : {}),
        ...(screenshots.length ? { screenshot: [...screenshots] } : {}),
        ...(categorie ? { applicationCategory: categorie } : {}),
        operatingSystem: 'Web',
        browserRequirements: 'Requires JavaScript',
        ...(langues?.length ? { inLanguage: langues } : {}),
        ...(seo?.features.length ? { featureList: [...seo.features] } : {}),
        isAccessibleForFree: true,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
        // ViewAction : ce qu'un moteur de réponse peut proposer (« ouvrir
        // l'app »). Pas de note inventée — Google n'affiche la fiche enrichie
        // qu'avec une vraie note, et en inventer une serait une donnée fausse.
        potentialAction: {
          '@type': 'ViewAction',
          target: homeUrl,
          name: name,
        },
        author: { '@id': PUBLISHER['@id'] },
        publisher: { '@id': PUBLISHER['@id'] },
        isPartOf: { '@id': SITE_ID },
        ...(fiche?.repoUrl ? { sameAs: [fiche.repoUrl] } : {}),
        ...overrides,
      },
      noeudEditeur(),
    ],
  };
}

/** Le nœud `Organization` de l'éditeur, copié : le catalogue le garde gelé. */
function noeudEditeur() {
  return { ...PUBLISHER, sameAs: [...PUBLISHER.sameAs] };
}

/**
 * Les blocs `<script type="application/ld+json">` d'un HTML, par un balayage
 * linéaire (`indexOf`) et non par une regex paresseuse, quadratique sur une
 * entrée qui ouvre sans refermer (CodeQL `js/polynomial-redos`). `debut` et
 * `fin` bornent la balise entière ; `json` est son contenu.
 *
 * @param {string} html
 * @returns {Array<{ debut: number, fin: number, json: string }>}
 */
function blocsJsonLd(html) {
  const blocs = [];
  const bas = html.toLowerCase();
  let i = 0;
  for (;;) {
    const debut = bas.indexOf('<script', i);
    if (debut < 0) break;
    const ouverture = bas.indexOf('>', debut);
    if (ouverture < 0) break;
    const fermeture = bas.indexOf('</script>', ouverture);
    if (fermeture < 0) break;
    if (bas.slice(debut, ouverture).includes('application/ld+json'))
      blocs.push({
        debut,
        fin: fermeture + 9,
        json: html.slice(ouverture + 1, fermeture),
      });
    i = fermeture + 9;
  }
  return blocs;
}

/**
 * Les captures du manifeste, reportées dans le `WebApplication` que le plugin
 * a posé — reconnu à son `@id`. Rien n'est touché si la page n'a pas ce nœud
 * (JSON-LD écrit à la main) ou s'il porte déjà ses captures.
 *
 * @param {string} html
 * @param {string} idApp `<accueil>#app`
 * @param {string[]} captures URL absolues.
 */
function avecCaptures(html, idApp, captures) {
  if (!captures.length) return html;
  for (const bloc of blocsJsonLd(html)) {
    let donnees;
    try {
      donnees = JSON.parse(bloc.json);
    } catch {
      continue;
    }
    const noeuds = Array.isArray(donnees?.['@graph'])
      ? donnees['@graph']
      : [donnees];
    const app = noeuds.find((/** @type {any} */ n) => n && n['@id'] === idApp);
    if (!app || app.screenshot) continue;
    app.screenshot = captures;
    return (
      html.slice(0, bloc.debut) + jsonLdScript(donnees) + html.slice(bloc.fin)
    );
  }
  return html;
}

/**
 * Les captures du manifeste CONSTRUIT, en URL absolues : celui que lie
 * `<link rel="manifest">`, lu sur le disque s'il vit sous le site. `[]` sans
 * manifeste, sans captures, ou pour un manifeste servi ailleurs.
 *
 * @param {string} dist
 * @param {string} indexHtml
 * @param {string} homeUrl
 * @returns {string[]}
 */
function capturesDuManifeste(dist, indexHtml, homeUrl) {
  let href = '';
  for (const [balise] of indexHtml.matchAll(/<link\b[^>]*>/gi)) {
    if (/^manifest$/i.test(attribut(balise, 'rel'))) {
      href = attribut(balise, 'href').trim();
      break;
    }
  }
  if (!href) return [];
  let manifesteUrl;
  try {
    manifesteUrl = new URL(href, homeUrl);
  } catch {
    return [];
  }
  const base = new URL(homeUrl);
  if (
    manifesteUrl.origin !== base.origin ||
    !manifesteUrl.pathname.startsWith(base.pathname)
  )
    return [];
  const racine = resolve(dist);
  const chemin = resolve(
    racine,
    decodeURIComponent(manifesteUrl.pathname.slice(base.pathname.length))
  );
  if (!chemin.startsWith(racine + sep) || !existsSync(chemin)) return [];
  let manifeste;
  try {
    manifeste = JSON.parse(readFileSync(chemin, 'utf8'));
  } catch {
    return [];
  }
  const captures = Array.isArray(manifeste?.screenshots)
    ? manifeste.screenshots
    : [];
  return captures
    .map((/** @type {any} */ c) => {
      try {
        return typeof c?.src === 'string'
          ? new URL(c.src, manifesteUrl).href
          : '';
      } catch {
        return '';
      }
    })
    .filter(url => /^https?:\/\//.test(url));
}

/**
 * Un `llms.txt` minimal, tiré du catalogue et de la page.
 *
 * Activé seulement avec `llms: true` (ou une chaîne fournie). Google Search
 * ne s'en sert pas pour ses fonctions génératives (guide du 15/05/2026) : ce
 * n'est pas un levier SEO/GEO, juste une doc volontaire pour les agents qui
 * le lisent. Défaut du plugin : pas de fichier.
 *
 * `null` sans nom ni description : on n'écrit pas un fichier creux.
 *
 * @param {{ homeUrl: string, html?: string }} opts
 * @returns {string | null}
 */
export function defaultLlmsTxt({ homeUrl, html = '' }) {
  const id = new URL(homeUrl).pathname.split('/').find(Boolean);
  const fiche = FAMILY_APPS.find(a => a.id === id && a.platform === 'web');
  const name =
    fiche?.name ||
    metaDe(html, 'og:site_name') ||
    decoderEntites(contenuDuTitre(html).trim()) ||
    '';
  const description = metaDe(html, 'description') || fiche?.description || '';
  if (!name || !description) return null;
  const lignes = [
    `# ${name}`,
    '',
    `> ${description}`,
    '',
    '## URL',
    `- Application : ${homeUrl}`,
  ];
  if (fiche?.repoUrl) lignes.push(`- Code source : ${fiche.repoUrl}`);
  lignes.push('');
  return lignes.join('\n');
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
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const TEXTES_SERVIS = {
  fr: {
    famille: `Les autres applications de ${GITHUB_OWNER}`,
    noscript: 'Cette application a besoin de JavaScript pour fonctionner.',
    memeCategorie: 'Dans la même catégorie',
    voisines: 'À découvrir aussi',
    depot: 'Code source sur GitHub',
  },
  en: {
    famille: `More apps by ${GITHUB_OWNER}`,
    noscript: 'This app needs JavaScript to run.',
    memeCategorie: 'In the same category',
    voisines: 'You may also like',
    depot: 'Source code on GitHub',
  },
};

/**
 * La mise en page du contenu servi : un bloc centré, lisible sans la feuille
 * de l'app. Les couleurs sont HÉRITÉES — fond et texte viennent du thème que
 * le script anti-FOUC a déjà posé. Les sélecteurs d'attribut l'emportent sur
 * les remises à zéro de Tailwind (`h1 { font-size: inherit }`).
 *
 * En ligne, parce qu'il doit peindre AVANT toute feuille : c'est tout son
 * objet. `cspPlugin` laisse `'unsafe-inline'` à `style-src` — relevé sur les
 * vingt apps le 23/09/2026, aucune ne le retire.
 *
 * Le lien est SOULIGNÉ explicitement : sa couleur est celle du texte, et la
 * remise à zéro de Tailwind (`a { text-decoration: inherit }`) le rendait
 * indiscernable — vu sur `mister-cim10` et `miss-uwh`. WCAG 1.4.1 : un lien ne
 * se signale pas par la seule couleur.
 *
 * Le texte de l'accueil (`content/accueil.md`) se lit aligné à GAUCHE, à
 * pleine opacité et avec ses puces : des paragraphes centrés et estompés se
 * lisent mal dès qu'ils dépassent une ligne.
 */
export const SERVED_CONTENT_STYLE =
  '<style data-dwc="served-content-style">' +
  '[data-dwc=served-content]{box-sizing:border-box;max-width:36rem;margin:0 auto;' +
  "padding:18vh 1.25rem 2rem;text-align:center;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;line-height:1.5}" +
  '[data-dwc=served-content] h1{font-size:1.5rem;line-height:1.25;margin:0 0 .75rem;font-weight:700}' +
  '[data-dwc=served-content] h2{font-size:1.125rem;line-height:1.3;margin:1.5rem 0 .5rem;font-weight:700}' +
  '[data-dwc=served-content] h3{font-size:1rem;line-height:1.35;margin:1rem 0 .25rem;font-weight:700}' +
  '[data-dwc=served-content] p{margin:0 0 .75rem;opacity:.8}' +
  '[data-dwc=served-content] a{color:inherit;text-decoration:underline}' +
  '[data-dwc=served-content] ul{list-style:none;padding:0;margin:0 0 .75rem}' +
  '[data-dwc=served-text]{text-align:left}' +
  '[data-dwc=served-text] p{opacity:1}' +
  '[data-dwc=served-text] ul,[data-dwc=served-text] ol{list-style:revert;padding-left:1.25rem}' +
  '</style>';

/**
 * LE CONTENU SERVI : ce qu'un robot lit sans exécuter le JavaScript.
 *
 * Relevé du 23/09/2026 : les vingt apps du parc servaient un corps VIDE — un
 * `<div id="app"></div>`, rendu ensuite par React. Un robot qui n'exécute pas
 * le JavaScript (premier passage de Bing, robots des moteurs d'IA, aperçus de
 * liens, premier passage de Google) ne lisait donc rien. Pré-rendre l'écran
 * d'accueil n'aurait pas suffi : pour `miss-uwh` et `mister-doc`, il ne montre
 * qu'un formulaire de CONNEXION.
 *
 * On sert donc, DANS le point de montage, ce qui décrit l'app : son titre en
 * `<h1>`, sa description, un lien vers l'accueil du parc. Rien d'inventé — ce
 * sont le `<title>` et la `meta description` de la page.
 *
 * React le REMPLACE au premier rendu : `createRoot().render()` vide le
 * conteneur, et les vingt apps montent ainsi (aucune n'hydrate). Le visiteur
 * voit ce bloc le temps que le JavaScript arrive — le nom de l'app plutôt
 * qu'une page blanche —, puis l'app elle-même.
 *
 * Point de montage : le PREMIER `<div id="…"></div>` VIDE du `<body>` (`app`,
 * `root`, `react-root` dans le parc). S'il porte déjà du contenu, on n'y touche
 * pas : l'app sert déjà quelque chose.
 *
 * `pages` : les pages de contenu de l'app (voir `contentPageHtml`), listées en
 * liens sous la description. C'est le seul endroit de l'accueil où un robot
 * qui ne rend pas le JavaScript les voit. Une page dans une autre langue que
 * l'accueil (`lang`) porte `lang` et `hreflang` : les pages anglaises sont
 * ainsi liées, et annoncées comme telles.
 *
 * TROIS AJOUTS DEPUIS LE 29/09/2026, tous sans script. Au relevé, un accueil
 * ne répondait en HTML statique qu'à « qu'est-ce que c'est ? », en 32 à 52
 * mots, et ne liait ni le dépôt ni une autre app :
 *   - `accueil` : le HTML de `content/accueil.md` (`renderServedHome`), après
 *     le titre et la description, avant les pages — ce qu'un robot de réponse
 *     ne lisait nulle part : pour qui, comment ça marche, où vont les données ;
 *   - `voisines` : « Dans la même catégorie », les apps sœurs du catalogue
 *     (`relatedApps`) ;
 *   - `depot` : « Code source sur GitHub ».
 *
 * @param {string} html
 * @param {{
 *   pages?: Array<{ href: string, titre: string, lang?: string }>,
 *   accueil?: string,
 *   voisines?: { memeCategorie?: boolean, apps: Array<{ name: string, description?: string, appUrl: string }> },
 *   depot?: string,
 * }} [opts] `accueil` est du HTML DÉJÀ SÛR : celui de `renderServedHome`.
 * @returns {{ html: string, injecte: boolean, raison?: string, montage?: string }}
 */
export function injectServedContent(html, opts = {}) {
  const { pages = [], accueil = '', voisines, depot = '' } = opts;
  if (html.includes('data-dwc="served-content"'))
    return { html, injecte: false, raison: 'déjà présent' };
  const corps = html.search(/<body\b/i);
  if (corps < 0) return { html, injecte: false, raison: 'pas de <body>' };
  const m = /<div id="([\w-]+)"\s*>\s*<\/div>/.exec(html.slice(corps));
  if (!m)
    return { html, injecte: false, raison: 'aucun point de montage vide' };
  const titre = decoderEntites(contenuDuTitre(html).trim());
  const description = metaDe(html, 'description');
  if (!titre || !description)
    return { html, injecte: false, raison: 'ni titre ni description' };

  const lang = langueDe(html);
  const t = /^en\b/i.test(lang) ? TEXTES_SERVIS.en : TEXTES_SERVIS.fr;
  const e = echapperXml;
  // Les pages de la langue de l'accueil d'abord, les autres ensuite, chacune
  // annoncée dans sa langue.
  const memeLangue = (/** @type {{ lang?: string }} */ p) =>
    !p.lang || !lang || langue2(p.lang) === langue2(lang);
  const lienPage = (
    /** @type {{ href: string, titre: string, lang?: string }} */ p
  ) =>
    memeLangue(p)
      ? `<li><a href="${e(p.href)}">${e(p.titre)}</a></li>`
      : `<li lang="${e(p.lang ?? '')}"><a href="${e(p.href)}" hreflang="${e(p.lang ?? '')}">${e(p.titre)}</a></li>`;
  const ordonnees = [
    ...pages.filter(memeLangue),
    ...pages.filter(p => !memeLangue(p)),
  ];
  // Les descriptions du catalogue sont en français : sous un accueil dans une
  // autre langue, le nom seul.
  const enFrancais = !lang || langue2(lang) === 'fr';
  const soeurs = voisines?.apps ?? [];
  const bloc =
    `<div id="${e(m[1])}"><div data-dwc="served-content">` +
    `<h1>${e(titre)}</h1>` +
    `<p>${e(description)}</p>` +
    (accueil ? `<section data-dwc="served-text">${accueil}</section>` : '') +
    (ordonnees.length ? `<ul>${ordonnees.map(lienPage).join('')}</ul>` : '') +
    (soeurs.length
      ? `<h2>${e(voisines?.memeCategorie === false ? t.voisines : t.memeCategorie)}</h2>` +
        `<ul>${soeurs
          .map(
            a =>
              `<li><a href="${e(a.appUrl)}">${e(a.name)}</a>${enFrancais && a.description ? ` — ${e(a.description)}` : ''}</li>`
          )
          .join('')}</ul>`
      : '') +
    (depot ? `<p><a href="${e(depot)}">${e(t.depot)}</a></p>` : '') +
    `<p><a href="${FAMILY_ORIGIN}/">${e(t.famille)}</a></p>` +
    `<noscript><p>${e(t.noscript)}</p></noscript>` +
    `</div></div>`;
  const debut = corps + m.index;
  let out = html.slice(0, debut) + bloc + html.slice(debut + m[0].length);
  if (
    !out.includes('data-dwc="served-content-style"') &&
    out.includes('</head>')
  )
    out = out.replace('</head>', `  ${SERVED_CONTENT_STYLE}\n  </head>`);
  return { html: out, injecte: true, montage: m[1] };
}

// ---------------------------------------------------------------------------
// L'image de partage
// ---------------------------------------------------------------------------

/**
 * Les noms cherchés dans le dossier public, dans cet ordre. Le JPEG d'abord :
 * les `globPatterns` du précache ne ramassent pas le `.jpg`, l'image reste
 * donc hors du service worker — elle ne sert qu'aux robots et aux aperçus de
 * liens, aucun visiteur n'a à la télécharger.
 */
export const OG_IMAGE_FILES = ['og-image.jpg', 'og-image.png'];

/**
 * Largeur et hauteur d'un PNG ou d'un JPEG, lues dans l'en-tête, sans décoder
 * l'image. `null` pour tout autre format.
 *
 * @param {Buffer} octets
 * @returns {{ width: number, height: number, type: string } | null}
 */
export function imageDimensions(octets) {
  if (!octets || octets.length < 24) return null;
  if (octets.subarray(0, 8).toString('hex') === '89504e470d0a1a0a')
    return {
      width: octets.readUInt32BE(16),
      height: octets.readUInt32BE(20),
      type: 'image/png',
    };
  if (octets[0] !== 0xff || octets[1] !== 0xd8) return null;
  // Les segments d'un JPEG se suivent : marqueur 0xFFxx, longueur sur deux
  // octets. Le cadre (SOF0 à SOF15, hors DHT C4, JPG C8 et DAC CC) porte la
  // hauteur puis la largeur.
  let i = 2;
  while (i + 9 < octets.length) {
    if (octets[i] !== 0xff) return null;
    const marqueur = octets[i + 1];
    if (
      marqueur >= 0xc0 &&
      marqueur <= 0xcf &&
      ![0xc4, 0xc8, 0xcc].includes(marqueur)
    )
      return {
        width: octets.readUInt16BE(i + 7),
        height: octets.readUInt16BE(i + 5),
        type: 'image/jpeg',
      };
    i += 2 + octets.readUInt16BE(i + 2);
  }
  return null;
}

/**
 * Les balises d'image de partage qu'une app a écrites à la main : `og:image`
 * et ses propriétés, `twitter:image`, `twitter:card`. La balise commence par
 * un littéral obligatoire, comme `THEME_COLOR_META`.
 */
const META_IMAGE_PARTAGE =
  /<meta\b[^>]*\b(?:property|name)=["'](?:og:image(?::[a-z_]+)?|twitter:image(?::[a-z_]+)?|twitter:card)["'][^>]*>/gi;

/**
 * Pose l'image de partage : retire les balises écrites à la main, puis écrit
 * le jeu complet avant `</head>`. Une ligne qui ne portait que la balise
 * disparaît ; une balise écrite sur plusieurs lignes aussi.
 *
 * `summary_large_image` : la grande vignette de X, et le format que LinkedIn,
 * Facebook, WhatsApp ou Slack affichent en grand. L'icône carrée de 512 px,
 * posée partout jusqu'ici, sortait en timbre-poste.
 *
 * @param {string} html
 * @param {{ url: string, width: number, height: number, type: string, alt?: string }} image
 */
export function setShareImage(html, image) {
  const MARQUE = '\uE000dwc-og\uE000';
  const lignes = html.replace(META_IMAGE_PARTAGE, MARQUE).split('\n');
  const gardees = lignes
    .filter(l => l.replaceAll(MARQUE, '').trim() !== '' || !l.includes(MARQUE))
    .map(l => l.replaceAll(MARQUE, ''));
  let out = gardees.join('\n');
  const balises = [
    `<meta property="og:image" content="${echapperXml(image.url)}" />`,
    `<meta property="og:image:type" content="${image.type}" />`,
    `<meta property="og:image:width" content="${image.width}" />`,
    `<meta property="og:image:height" content="${image.height}" />`,
    ...(image.alt
      ? [`<meta property="og:image:alt" content="${echapperXml(image.alt)}" />`]
      : []),
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:image" content="${echapperXml(image.url)}" />`,
  ];
  if (out.includes('</head>'))
    out = out.replace('</head>', `  ${balises.join('\n    ')}\n  </head>`);
  return out;
}

/**
 * L'image de partage d'une app, trouvée dans son dossier public : URL absolue
 * (avec une empreinte de contenu, que les réseaux gardent en cache par URL),
 * dimensions et type lus dans le fichier. `null` sans fichier.
 *
 * @param {{ publicDir: string, homeUrl: string, fichier?: string }} opts
 */
export function findShareImage({ publicDir, homeUrl, fichier }) {
  if (!publicDir) return null;
  for (const nom of fichier ? [fichier] : OG_IMAGE_FILES) {
    const chemin = join(publicDir, nom);
    if (!existsSync(chemin)) continue;
    const octets = readFileSync(chemin);
    const dims = imageDimensions(octets);
    if (!dims) continue;
    const empreinte = createHash('sha256')
      .update(octets)
      .digest('hex')
      .slice(0, 8);
    return {
      url: `${homeUrl}${nom.replace(/^\//, '')}?v=${empreinte}`,
      ...dims,
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Les pages de contenu
// ---------------------------------------------------------------------------

/**
 * LES PAGES DE CONTENU : ce qu'un moteur peut classer sur une vraie recherche.
 *
 * Relevé du 25/09/2026 : chaque app du parc n'offrait aux moteurs qu'UNE page,
 * de 55 à 90 mots une fois rendue, souvent un écran de connexion. Personne ne
 * cherche « Mister Mölkky » ; beaucoup cherchent « règles du Mölkky ». Une page
 * qui répond à cette recherche, puis mène à l'app, est ce qui manque.
 *
 * Chaque fichier `content/pages/<slug>.md` de l'app devient, au build, un
 * fichier HTML STATIQUE `<base>/<slug>.html` : lu tel quel par tout robot, sans
 * JavaScript. Il entre au plan de site, il est listé dans le contenu servi de
 * l'accueil, et le gabarit ajoute l'en-tête de l'app, un encadré vers l'app, le
 * fil d'Ariane et les données structurées (`Article`, `BreadcrumbList`, et
 * `FAQPage` tiré de la section « Questions fréquentes »).
 *
 * POURQUOI `.html` DANS L'URL. Le service worker répond `index.html` à toute
 * navigation de sa portée, SAUF aux chemins qui portent une extension
 * (`NAVIGATE_FALLBACK_DENY_FILES`, posée sur les vingt apps le 24/09/2026). Une
 * page en `/regles/` serait donc remplacée par l'app chez tout visiteur qui l'a
 * déjà ouverte ; `/regles.html` est servie telle quelle, sans toucher aux
 * vingt configurations.
 *
 * LE MARKDOWN RECONNU est volontairement court : titres `#` à `###`,
 * paragraphes, listes à un niveau, gras, italique, code, liens `https:` ou vers
 * une autre page de l'app. Tout le texte est échappé ; aucun HTML ne passe.
 *
 * L'EN-TÊTE, contrat avec les rédacteurs (29/09/2026) — une clé par ligne :
 *   - `title`, `description` : obligatoires ;
 *   - `slug` : facultatif (défaut : le nom du fichier) ;
 *   - `date: AAAA-MM-JJ` : la publication ; `updated: AAAA-MM-JJ` : la
 *     dernière mise à jour DE FOND. Ils nourrissent la ligne « Publié le … ·
 *     Mis à jour le … », `datePublished` / `dateModified`, et le `lastmod` du
 *     plan de site, qu'ils fixent ;
 *   - `answer: …` : la réponse directe, 40 à 70 mots sur UNE ligne, rendue
 *     sous le titre (« En bref. ») et reprise en `abstract` ;
 *   - `translation: <slug>` : sur une page ANGLAISE (`en/<slug>.md`), la page
 *     française qu'elle traduit — d'où des `hreflang` réciproques.
 *
 * Les pages anglaises vivent dans `content/pages/en/` et sortent en
 * `<base>/en/<slug>.html`. Leur FAQ se lit sous `## Frequently asked
 * questions` ; leurs sources sous `## References`.
 */
export const CONTENT_PAGES_DIR = 'content/pages';

/** Le sous-dossier des pages anglaises, et leur préfixe d'URL. */
const DOSSIER_EN = 'en';

const SLUG_VALIDE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Les slugs qui écraseraient un fichier de l'app. */
const SLUGS_RESERVES = new Set(['index', '404', 'sw', 'offline']);
const TITRES_FAQ =
  /^(?:questions fréquentes|foire aux questions|faq|frequently asked questions)$/i;
/** La section des sources : `## Sources`, ou `## References` en anglais. */
const TITRES_SOURCES = /^(?:sources|r[ée]f[ée]rences)$/i;
/**
 * Les liens sûrs : `https:`, `mailto:`, une ancre, ou une autre page de l'app
 * — au même niveau (`page.html`), sous une langue (`en/page.html`) ou au-dessus
 * (`../page.html`, depuis une page anglaise vers une page française).
 */
const LIEN_SUR =
  /^(?:https?:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+|(?:\.\.\/|[a-z]{2}\/)?[a-z0-9-]+\.html(?:#[a-z0-9-]+)?|#[a-z0-9-]+)$/i;
/** Une date d'en-tête : `AAAA-MM-JJ`. */
const DATE_ISO = /^\d{4}-\d{2}-\d{2}$/;

/** Un identifiant d'ancre : minuscules ASCII, tirets. */
function ancre(texte) {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Le texte d'une ligne Markdown, sans ses marques ni ses liens. */
function texteBrut(md) {
  return md
    .replace(/`([^`]*)`/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .trim();
}

/** Le Markdown en ligne : échappé d'abord, puis code, liens, gras, italique. */
function enLigne(md) {
  const codes = [];
  let s = echapperXml(md).replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code);
    return `\uE000${codes.length - 1}\uE000`;
  });
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, texte, url) => {
    const brute = decoderEntites(url);
    return LIEN_SUR.test(brute)
      ? `<a href="${echapperXml(brute)}">${texte}</a>`
      : texte;
  });
  s = s
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  return s.replace(/\uE000(\d+)\uE000/g, (_, i) => `<code>${codes[i]}</code>`);
}

/**
 * Dans la section des sources, une URL NUE devient un lien : une liste de
 * sources s'écrit souvent `- OMS : https://…`. Pas ailleurs — le reste du
 * texte garde la syntaxe explicite. Une ligne qui porte déjà un lien Markdown
 * est laissée telle quelle : on n'imbrique pas deux liens. La ponctuation qui
 * suit l'URL reste hors du lien.
 *
 * @param {string} texte
 */
function autolien(texte) {
  if (texte.includes('](')) return texte;
  return texte.replace(/https?:\/\/[^\s<>"'()[\]]+/g, url => {
    // Par une boucle, pas par `/[.,;:!?]+$/` : ancrée en fin, cette forme
    // recule sur une longue suite de ponctuation (CodeQL js/polynomial-redos).
    let fin = url.length;
    while (fin > 0 && '.,;:!?'.includes(url[fin - 1])) fin -= 1;
    const propre = url.slice(0, fin);
    return `[${propre}](${propre})${url.slice(fin)}`;
  });
}

/**
 * Les URL de la section des sources (`## Sources`, `## References`),
 * reprises en `citation` dans l'`Article` : une page qui cite l'OMS ou la
 * documentation de Supabase le dit aussi aux moteurs.
 *
 * @param {string} md
 * @returns {string[]}
 */
function sourcesFromMarkdown(md) {
  /** @type {string[]} */
  const urls = [];
  let dans = false;
  for (const brute of String(md).replace(/\r\n?/g, '\n').split('\n')) {
    const ligne = brute.trim();
    const titre = /^(#{1,3})\s+(.+)$/.exec(ligne);
    if (titre) {
      if (titre[1].length <= 2)
        dans =
          titre[1].length === 2 && TITRES_SOURCES.test(texteBrut(titre[2]));
      continue;
    }
    if (!dans) continue;
    for (const [, url] of autolien(ligne).matchAll(
      /\]\((https?:\/\/[^)\s]+)\)/g
    ))
      if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}

/**
 * Le Markdown court des pages de contenu, en HTML. Les `h2`/`h3` reçoivent une
 * ancre, pour qu'on puisse partager une section.
 *
 * La section des SOURCES (`## Sources`, ou `## References` en anglais) est
 * rendue dans un `<section class="sources">`, que le gabarit compose à part —
 * plus petite, les longues URL coupées —, et ses URL nues deviennent des
 * liens. Relevé du 29/09/2026 : une page sur vingt citait une source externe,
 * alors que les pages de santé ou d'argent citaient l'OMS, l'ATIH ou « les
 * règles officielles » sans lien.
 *
 * @param {string} md
 * @returns {string}
 */
export function renderMarkdown(md) {
  /** @type {string[]} */
  const html = [];
  const ancres = new Set();
  /** @type {string[]} */
  let paragraphe = [];
  /** @type {{ type: string, items: string[] } | null} */
  let liste = null;
  let dansSources = false;
  const source = (/** @type {string} */ texte) =>
    dansSources ? autolien(texte) : texte;
  const fermerParagraphe = () => {
    if (paragraphe.length)
      html.push(`<p>${enLigne(source(paragraphe.join(' ')))}</p>`);
    paragraphe = [];
  };
  const fermerListe = () => {
    if (liste)
      html.push(
        `<${liste.type}>${liste.items
          .map(item => `<li>${enLigne(source(item))}</li>`)
          .join('')}</${liste.type}>`
      );
    liste = null;
  };
  for (const brute of String(md).replace(/\r\n?/g, '\n').split('\n')) {
    const ligne = brute.trim();
    if (!ligne) {
      fermerParagraphe();
      fermerListe();
      continue;
    }
    const titre = /^(#{1,3})\s+(.+)$/.exec(ligne);
    if (titre) {
      fermerParagraphe();
      fermerListe();
      const niveau = titre[1].length;
      // Un titre de même rang ou plus haut ferme la section des sources ; un
      // `##` qui la nomme l'ouvre.
      if (niveau <= 2 && dansSources) {
        html.push('</section>');
        dansSources = false;
      }
      if (niveau === 2 && TITRES_SOURCES.test(texteBrut(titre[2]))) {
        html.push('<section class="sources">');
        dansSources = true;
      }
      let id = '';
      if (niveau > 1) {
        const base = ancre(texteBrut(titre[2])) || 'section';
        let candidat = base;
        for (let n = 2; ancres.has(candidat); n++) candidat = `${base}-${n}`;
        ancres.add(candidat);
        id = ` id="${candidat}"`;
      }
      html.push(`<h${niveau}${id}>${enLigne(titre[2].trim())}</h${niveau}>`);
      continue;
    }
    const puce = /^[-*]\s+(.+)$/.exec(ligne);
    const numero = /^\d+[.)]\s+(.+)$/.exec(ligne);
    if (puce || numero) {
      fermerParagraphe();
      const type = puce ? 'ul' : 'ol';
      if (liste && liste.type !== type) fermerListe();
      liste ??= { type, items: [] };
      liste.items.push((puce ?? numero)[1]);
      continue;
    }
    if (liste) {
      // Une ligne qui suit une puce sans ligne vide la continue.
      liste.items[liste.items.length - 1] += ` ${ligne}`;
      continue;
    }
    paragraphe.push(ligne);
  }
  fermerParagraphe();
  fermerListe();
  if (dansSources) html.push('</section>');
  return html.join('\n');
}

/**
 * Les questions de la section « Questions fréquentes » : chaque `###` est une
 * question, les lignes qui la suivent sa réponse, en texte brut.
 *
 * @param {string} md
 * @returns {Array<{ question: string, reponse: string }>}
 */
export function faqFromMarkdown(md) {
  const faq = [];
  let dansLaFaq = false;
  let courante = null;
  for (const brute of String(md).replace(/\r\n?/g, '\n').split('\n')) {
    const ligne = brute.trim();
    const section = /^##\s+(.+)$/.exec(ligne);
    if (section) {
      dansLaFaq = TITRES_FAQ.test(texteBrut(section[1]));
      courante = null;
      continue;
    }
    if (!dansLaFaq) continue;
    const question = /^###\s+(.+)$/.exec(ligne);
    if (question) {
      courante = { question: texteBrut(question[1]), reponse: [] };
      faq.push(courante);
      continue;
    }
    if (courante && ligne)
      courante.reponse.push(
        texteBrut(ligne.replace(/^(?:[-*]|\d+[.)])\s+/, ''))
      );
  }
  return faq
    .filter(q => q.reponse.length)
    .map(q => ({ question: q.question, reponse: q.reponse.join(' ') }));
}

/** Une vraie date du calendrier, au format `AAAA-MM-JJ`. */
function dateValide(texte) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(texte));
  if (!m) return false;
  const [a, mo, j] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const d = new Date(Date.UTC(a, mo - 1, j));
  return (
    d.getUTCFullYear() === a &&
    d.getUTCMonth() === mo - 1 &&
    d.getUTCDate() === j
  );
}

/** Les guillemets qu'un rédacteur met autour d'une réponse, retirés. */
const GUILLEMETS = [
  ['"', '"'],
  ["'", "'"],
  ['«', '»'],
  ['“', '”'],
  ['„', '“'],
  ['‘', '’'],
];

/** @param {string} texte */
function sansGuillemets(texte) {
  const s = texte.trim();
  for (const [ouvre, ferme] of GUILLEMETS) {
    if (
      s.length > ouvre.length + ferme.length &&
      s.startsWith(ouvre) &&
      s.endsWith(ferme)
    )
      return s.slice(ouvre.length, s.length - ferme.length).trim();
  }
  return s;
}

/** Le nombre de mots d'un texte, comme `mots` le compte : ses jetons. */
function compterMots(texte) {
  return texte.split(/\s+/).filter(Boolean).length;
}

/**
 * Les VRAIS mots d'un texte : sans la ponctuation que la typographie
 * française isole entre deux espaces (« ; », « : », « ? »). C'est ce que
 * `pwa-doctor` compare aux bornes de la réponse courte.
 */
function compterVraisMots(texte) {
  return texte.split(/\s+/).filter(m => /[\p{L}\p{N}]/u.test(m)).length;
}

/**
 * Lit une page de contenu : l'en-tête (voir `CONTENT_PAGES_DIR` pour ses
 * clés), un seul `# titre`. Refuse, avec un message qui nomme le fichier, tout
 * ce qui produirait une page fausse — dont une date qui n'en est pas une.
 *
 * `options.lang` : la langue de la page (`fr` à la racine, `en` sous `en/`) ;
 * `options.dossier` : son préfixe d'URL (`''` ou `'en/'`).
 *
 * @param {string} texte
 * @param {string} [fichier]
 * @param {{ lang?: string, dossier?: string }} [options]
 */
export function parseContentPage(texte, fichier = 'page.md', options = {}) {
  const { lang = 'fr', dossier = '' } = options;
  const source = String(texte)
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n');
  const entete = /^---\n([\s\S]*?)\n---\n/.exec(source);
  if (!entete)
    throw new Error(
      `[pwa-seo] ${fichier} : en-tête manquant (--- title: … / description: … ---)`
    );
  /** @type {Record<string, string>} */
  const meta = {};
  for (const ligne of entete[1].split('\n')) {
    const kv = /^([a-zA-Z]+)\s*:\s*(.*)$/.exec(ligne.trim());
    if (kv) meta[kv[1]] = kv[2].trim().replace(/^(["'])(.*)\1$/, '$2');
  }
  const markdown = source.slice(entete[0].length).trim();
  const slug = meta.slug || basename(fichier).replace(/\.md$/i, '');
  if (!SLUG_VALIDE.test(slug) || SLUGS_RESERVES.has(slug))
    throw new Error(
      `[pwa-seo] ${fichier} : slug « ${slug} » invalide (minuscules ASCII et tirets, ni index ni 404)`
    );
  if (!meta.title || !meta.description)
    throw new Error(`[pwa-seo] ${fichier} : title et description sont requis`);
  for (const cle of ['date', 'updated'])
    if (meta[cle] && !dateValide(meta[cle]))
      throw new Error(
        `[pwa-seo] ${fichier} : ${cle} « ${meta[cle]} » n’est pas une date AAAA-MM-JJ`
      );
  if (meta.translation && !SLUG_VALIDE.test(meta.translation))
    throw new Error(
      `[pwa-seo] ${fichier} : translation « ${meta.translation} » n’est pas un slug`
    );
  const h1 = markdown.split('\n').filter(l => /^#\s+/.test(l.trim()));
  if (h1.length !== 1)
    throw new Error(
      `[pwa-seo] ${fichier} : un seul titre « # … » attendu, ${h1.length} trouvé(s)`
    );
  const texteSeul = markdown
    .split('\n')
    .map(l => texteBrut(l.replace(/^(?:#{1,3}|[-*]|\d+[.)])\s+/, '')))
    .join(' ');
  const answer = meta.answer ? sansGuillemets(meta.answer) : '';
  return {
    slug,
    lang,
    fichier,
    chemin: `${dossier}${slug}.html`,
    title: meta.title,
    description: meta.description,
    ...(meta.date ? { date: meta.date } : {}),
    ...(meta.updated ? { updated: meta.updated } : {}),
    ...(answer
      ? { answer, motsReponse: compterVraisMots(texteBrut(answer)) }
      : {}),
    ...(meta.translation ? { translation: meta.translation } : {}),
    titre: texteBrut(h1[0].trim().replace(/^#\s+/, '')),
    markdown,
    html: renderMarkdown(markdown),
    faq: faqFromMarkdown(markdown),
    sources: sourcesFromMarkdown(markdown),
    mots: compterMots(texteSeul),
    // L'empreinte de la SOURCE, en-tête compris : c'est elle qui dit si la
    // page a changé, pas le gabarit du socle (voir `seoState`).
    empreinte: empreinte([source]),
  };
}

/** Un fichier de page : `.md`, ni brouillon (`_…`) ni README. */
function estUnePage(nom) {
  return (
    /\.md$/i.test(nom) && !nom.startsWith('_') && !/^readme\.md$/i.test(nom)
  );
}

/** @param {string} chemin */
function estUnDossier(chemin) {
  try {
    return statSync(chemin).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Les FICHIERS de pages d'un dossier, relatifs à lui et triés : les pages
 * françaises à la racine, puis les anglaises sous `en/`. Les fichiers qui
 * commencent par `_` et les `README.md` sont ignorés.
 *
 * `pwa-doctor` compte CETTE liste : un contrôle qui compterait autre chose que
 * ce que le build publie se tairait sur un dossier qui ne contient qu'un
 * README — c'était le cas jusqu'au 29/09/2026.
 *
 * @param {string} dossier
 * @returns {string[]}
 */
export function contentPageFiles(dossier) {
  if (!dossier || !estUnDossier(dossier)) return [];
  const lister = (/** @type {string} */ sous) => {
    const d = sous ? join(dossier, sous) : dossier;
    if (!estUnDossier(d)) return [];
    return readdirSync(d)
      .filter(f => estUnePage(f) && !estUnDossier(join(d, f)))
      .sort()
      .map(f => (sous ? `${sous}/${f}` : f));
  };
  return [...lister(''), ...lister(DOSSIER_EN)];
}

/**
 * Les pages de contenu d'un dossier : les françaises triées par slug, puis
 * les anglaises (`en/`). `[]` sans dossier.
 *
 * Refuse deux pages de même slug dans une langue, et une TRADUCTION qui ne
 * tient pas : une page anglaise dont `translation` ne désigne aucune page
 * française, ou deux pages anglaises qui traduisent la même. Un `hreflang`
 * vers une page absente dirait aux moteurs qu'une traduction existe là où ils
 * trouveraient un 404.
 *
 * @param {string} dossier
 */
export function readContentPages(dossier) {
  const pages = contentPageFiles(dossier).map(rel =>
    parseContentPage(
      readFileSync(join(dossier, rel), 'utf8'),
      rel,
      rel.startsWith(`${DOSSIER_EN}/`)
        ? { lang: 'en', dossier: `${DOSSIER_EN}/` }
        : { lang: 'fr' }
    )
  );
  const vus = new Set();
  for (const p of pages) {
    if (vus.has(p.chemin))
      throw new Error(
        `[pwa-seo] deux pages portent le slug « ${p.chemin.replace(/\.html$/, '')} »`
      );
    vus.add(p.chemin);
  }
  const francaises = new Set(
    pages.filter(p => p.lang !== 'en').map(p => p.slug)
  );
  /** @type {Map<string, string>} */
  const traduites = new Map();
  for (const p of pages) {
    if (p.lang !== 'en' || !p.translation) continue;
    if (!francaises.has(p.translation))
      throw new Error(
        `[pwa-seo] ${p.fichier} : translation « ${p.translation} » ne désigne aucune page française`
      );
    const deja = traduites.get(p.translation);
    if (deja)
      throw new Error(
        `[pwa-seo] ${deja} et ${p.fichier} traduisent la même page « ${p.translation} »`
      );
    traduites.set(p.translation, p.fichier);
  }
  return pages;
}

/** La page de l'auteur : « par mister-guiiug » y mène. */
const PAGE_AUTEUR = `${FAMILY_ORIGIN}/a-propos.html`;

const TEXTES_PAGE = {
  fr: {
    ouvrir: (/** @type {string} */ nom) => `Ouvrir ${nom}`,
    fil: 'Fil d’Ariane',
    parc: 'Les applications',
    aLire: 'À lire aussi',
    famille: `Les autres applications de ${GITHUB_OWNER}`,
    enBref: 'En bref.',
    publie: 'Publié le',
    maj: 'Mis à jour le',
    par: 'par',
    parSeul: 'Par',
    memeCategorie: 'Dans la même catégorie',
    voisines: 'À découvrir aussi',
  },
  en: {
    ouvrir: (/** @type {string} */ nom) => `Open ${nom}`,
    fil: 'Breadcrumb',
    parc: 'Apps',
    aLire: 'Read also',
    famille: `More apps by ${GITHUB_OWNER}`,
    enBref: 'In short.',
    publie: 'Published',
    maj: 'Updated',
    par: 'by',
    parSeul: 'By',
    memeCategorie: 'In the same category',
    voisines: 'You may also like',
  },
};

/** Le lien vers l'autre langue, écrit DANS la langue qu'il annonce. */
const LIEN_AUTRE_LANGUE = {
  fr: 'Lire en français',
  en: 'Read in English',
};

const MOIS = {
  fr: [
    'janvier',
    'février',
    'mars',
    'avril',
    'mai',
    'juin',
    'juillet',
    'août',
    'septembre',
    'octobre',
    'novembre',
    'décembre',
  ],
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
};

/**
 * Une date `AAAA-MM-JJ` au format LONG de la langue : « 25 septembre 2026 »,
 * « 1er octobre 2026 », « September 25, 2026 ». Écrit à la main plutôt que par
 * `Intl` : le résultat ne dépend ni du fuseau de la machine de build (une date
 * seule, lue en UTC, recule d'un jour à l'ouest) ni des données ICU de Node.
 * Une valeur qui n'est pas une date sort telle quelle.
 *
 * @param {string} iso
 * @param {string} [lang]
 */
export function formatLongDate(iso, lang = 'fr') {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
  if (!m || !dateValide(iso)) return String(iso);
  const [annee, mois, jour] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (langue2(lang) === 'en') return `${MOIS.en[mois - 1]} ${jour}, ${annee}`;
  return `${jour === 1 ? '1er' : jour} ${MOIS.fr[mois - 1]} ${annee}`;
}

/** `#rgb` ou `#rrggbb` → luminance relative (WCAG), ou `null`. */
function luminance(hex) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map(c => c + c).join('') : m[1];
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Le texte qui se lit sur un fond donné : noir ou blanc, celui des deux qui
 * contraste le plus. L'un des deux dépasse toujours 4,5:1.
 */
export function textOn(hex) {
  const l = luminance(hex);
  if (l === null) return '#ffffff';
  return (l + 0.05) / 0.05 >= 1.05 / (l + 0.05) ? '#111111' : '#ffffff';
}

/** Le premier `<meta name="theme-color">` : celui du thème clair s'il existe. */
function couleurDuTheme(html) {
  const balises = [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map(([balise]) => balise)
    .filter(b => attribut(b, 'name') === 'theme-color');
  const claire =
    balises.find(b => !/dark/i.test(attribut(b, 'media'))) ?? balises[0];
  return claire ? attribut(claire, 'content').trim() : '';
}

/**
 * Un `<link>` d'icône dont le `href` est RELATIF devient absolu : une page
 * anglaise vit sous `en/`, où `favicon.svg` ne mènerait nulle part. Les
 * chemins absolus (`/app/favicon.svg`, ce que Vite écrit) restent tels quels.
 *
 * @param {string} balise
 * @param {string} homeUrl
 */
function iconeAbsolue(balise, homeUrl) {
  const propre = `${balise.replace(/\/?>$/, '').trimEnd()} />`;
  return propre.replace(
    /\bhref\s*=\s*("([^"]*)"|'([^']*)')/i,
    (tout, _v, dq, sq) => {
      const href = decoderEntites(dq ?? sq ?? '');
      if (!href || /^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(href)) return tout;
      return `href="${echapperXml(new URL(href, homeUrl).href)}"`;
    }
  );
}

/**
 * Le document HTML d'une page de contenu, autonome : il ne charge ni script ni
 * feuille, et porte sa propre CSP. Ce qu'il sait de l'app, il le lit dans
 * l'`index.html` CONSTRUIT : couleur du thème, icônes, image de partage,
 * description de l'app. Sa LANGUE est la sienne (`page.lang`), plus celle de
 * l'accueil : une page anglaise se déclare en anglais.
 *
 * DEPUIS LE 29/09/2026 (audit SEO/GEO/AEO — aucune des vingt pages n'avait ni
 * date, ni auteur visible, ni réponse en tête) :
 *   - sous le titre, la SIGNATURE — « Publié le … · Mis à jour le … · par
 *     mister-guiiug », le nom menant à la page « À propos » du hub — puis le
 *     bloc « En bref. » tiré de `answer`, repris en `abstract` ;
 *   - l'`Article` porte `datePublished`, `dateModified`, et désigne l'éditeur
 *     de la famille (`PUBLISHER`, dans le `@graph`), l'app (`about`, son
 *     `@id`) et le site du parc (`isPartOf`) par leurs `@id` ; les liens de la
 *     section des sources deviennent `citation` ;
 *   - Open Graph : `og:locale` au format `fr_FR` (« fr » n'en est pas un),
 *     `article:published_time` et `article:modified_time`, et un
 *     `og:image:alt` qui décrit LA PAGE, plus l'accueil ;
 *   - une page et sa TRADUCTION se désignent l'une l'autre : `hreflang` `fr`,
 *     `en` et `x-default` (la française), RÉCIPROQUES par construction — la
 *     paire est calculée une fois, pour les deux pages — et un lien visible
 *     vers l'autre langue. Rien sans traduction ;
 *   - avant le pied de page, « Dans la même catégorie » : les apps sœurs du
 *     catalogue (`relatedApps`). Sous une page anglaise, leur nom seul — les
 *     descriptions du catalogue sont en français.
 *
 * @param {{ page: ReturnType<typeof parseContentPage>, pages?: Array<ReturnType<typeof parseContentPage>>, indexHtml: string, homeUrl: string }} opts
 */
export function contentPageHtml({ page, pages = [], indexHtml, homeUrl }) {
  const lang = page.lang || langueDe(indexHtml) || 'fr';
  const anglais = langue2(lang) === 'en';
  const t = anglais ? TEXTES_PAGE.en : TEXTES_PAGE.fr;
  const id = new URL(homeUrl).pathname.split('/').find(Boolean);
  const fiche = ficheDe(homeUrl);
  const titreIndex = decoderEntites(contenuDuTitre(indexHtml).trim());
  const nomApp =
    fiche?.name ||
    metaDe(indexHtml, 'og:site_name') ||
    titreIndex.split(/\s+[—–-]\s+/)[0] ||
    id ||
    '';
  const descriptionApp = metaDe(indexHtml, 'description');
  const urlDe = (/** @type {{ slug: string, chemin?: string }} */ p) =>
    `${homeUrl}${p.chemin ?? `${p.slug}.html`}`;
  const url = urlDe(page);
  const image = metaDe(indexHtml, 'og:image');
  const imageEstUneImage = /^https?:\/\//.test(image) && !image.endsWith('/');
  const carteLarge =
    metaDe(indexHtml, 'twitter:card') === 'summary_large_image';
  const accent = couleurDuTheme(indexHtml);
  const accentSur = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(accent)
    ? accent
    : '#1f6feb';
  const icones = [...indexHtml.matchAll(/<link\b[^>]*>/gi)]
    .map(([balise]) => balise)
    .filter(b =>
      /^(?:icon|shortcut icon|apple-touch-icon)$/i.test(attribut(b, 'rel'))
    )
    .map(b => iconeAbsolue(b, homeUrl));
  const iconeEntete =
    fiche?.iconUrl || icones.map(b => attribut(b, 'href')).find(Boolean) || '';
  const memeLangue = (/** @type {{ lang?: string }} */ p) =>
    langue2(p.lang || 'fr') === langue2(lang);
  const autres = pages.filter(p => memeLangue(p) && p.slug !== page.slug);

  // LA PAIRE DE TRADUCTION, calculée une fois : la page française et sa
  // traduction anglaise se désignent l'une l'autre, ou aucune ne désigne rien.
  const francaise = anglais
    ? page.translation
      ? pages.find(
          p => langue2(p.lang || 'fr') === 'fr' && p.slug === page.translation
        )
      : undefined
    : page;
  const anglaise = francaise
    ? pages.find(
        p =>
          langue2(p.lang || 'fr') === 'en' && p.translation === francaise.slug
      )
    : undefined;
  const paire =
    francaise && anglaise
      ? { fr: urlDe(francaise), en: urlDe(anglaise) }
      : null;

  const dateModifiee = page.updated || page.date;
  const donnees = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': url,
        headline: page.titre,
        name: page.title,
        description: page.description,
        ...(page.answer ? { abstract: texteBrut(page.answer) } : {}),
        url,
        mainEntityOfPage: url,
        inLanguage: lang,
        ...(page.date ? { datePublished: page.date } : {}),
        ...(dateModifiee ? { dateModified: dateModifiee } : {}),
        ...(imageEstUneImage ? { image } : {}),
        author: { '@id': PUBLISHER['@id'] },
        publisher: { '@id': PUBLISHER['@id'] },
        about: { '@id': `${homeUrl}#app` },
        isPartOf: { '@id': SITE_ID },
        ...(page.sources?.length ? { citation: [...page.sources] } : {}),
        ...(paire
          ? anglais
            ? { translationOfWork: { '@id': paire.fr } }
            : { workTranslation: { '@id': paire.en } }
          : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { name: t.parc, item: `${FAMILY_ORIGIN}/` },
          { name: nomApp, item: homeUrl },
          { name: page.titre, item: url },
        ].map((e, i) => ({ '@type': 'ListItem', position: i + 1, ...e })),
      },
      ...(page.faq.length
        ? [
            {
              '@type': 'FAQPage',
              mainEntity: page.faq.map(q => ({
                '@type': 'Question',
                name: q.question,
                acceptedAnswer: { '@type': 'Answer', text: q.reponse },
              })),
            },
          ]
        : []),
      noeudEditeur(),
    ],
  };

  const e = echapperXml;

  // Sous le titre : la signature, le lien vers l'autre langue, « En bref ».
  /** @type {string[]} */
  const parties = [];
  if (page.date)
    parties.push(
      `${t.publie} <time datetime="${e(page.date)}">${e(formatLongDate(page.date, lang))}</time>`
    );
  if (page.updated && page.updated !== page.date)
    parties.push(
      `${t.maj} <time datetime="${e(page.updated)}">${e(formatLongDate(page.updated, lang))}</time>`
    );
  const auteur = `<a href="${PAGE_AUTEUR}" rel="author">${e(GITHUB_OWNER)}</a>`;
  parties.push(`${parties.length ? t.par : t.parSeul} ${auteur}`);
  const sousTitre = [
    `<p class="signature">${parties.join(' · ')}</p>`,
    ...(paire
      ? [
          anglais
            ? `<p class="langue" lang="fr"><a href="${e(paire.fr)}" hreflang="fr">${LIEN_AUTRE_LANGUE.fr}</a></p>`
            : `<p class="langue" lang="en"><a href="${e(paire.en)}" hreflang="en">${LIEN_AUTRE_LANGUE.en}</a></p>`,
        ]
      : []),
    ...(page.answer
      ? [
          `<p class="en-bref"><strong>${e(t.enBref)}</strong> ${enLigne(page.answer)}</p>`,
        ]
      : []),
  ].join('\n');
  // Par une fonction : un `$&` dans la réponse n'est pas un motif.
  const article = page.html.includes('</h1>')
    ? page.html.replace('</h1>', () => `</h1>\n${sousTitre}`)
    : `${sousTitre}\n${page.html}`;

  const voisines = fiche
    ? relatedApps(fiche.id)
    : { memeCategorie: false, apps: [] };
  const locale = ogLocale(lang);
  const dateHtml = (
    /** @type {string} */ p,
    /** @type {string | undefined} */ v
  ) => (v ? `<meta property="${p}" content="${e(v)}" />\n    ` : '');

  const style =
    `:root{color-scheme:light dark;--fond:#fff;--texte:#1f2328;--doux:#59636e;--bord:#d1d9e0;--lien:#0969da;--accent:${accentSur};--sur-accent:${textOn(accentSur)}}` +
    '@media (prefers-color-scheme:dark){:root{--fond:#0d1117;--texte:#e6edf3;--doux:#9198a1;--bord:#3d444d;--lien:#4493f8}}' +
    '*{box-sizing:border-box}' +
    "body{margin:0;background:var(--fond);color:var(--texte);font:1.0625rem/1.65 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}" +
    'header,main,footer{max-width:44rem;margin:0 auto;padding-left:1.25rem;padding-right:1.25rem}' +
    'header{padding-top:1rem;padding-bottom:1rem;border-bottom:1px solid var(--bord)}' +
    'header a{display:inline-flex;align-items:center;gap:.6rem;color:inherit;text-decoration:none;font-weight:700;font-size:1.125rem}' +
    'header img{width:40px;height:40px;border-radius:10px}' +
    'nav{font-size:.875rem;color:var(--doux);margin-top:1.25rem}' +
    'nav ol{list-style:none;display:flex;flex-wrap:wrap;gap:.35rem;padding:0;margin:0}' +
    "nav li+li::before{content:'›';margin-right:.35rem}" +
    'nav a{color:inherit}' +
    'a{color:var(--lien)}' +
    'h1{font-size:2rem;line-height:1.2;margin:.75rem 0 1rem}' +
    'h2{font-size:1.4rem;line-height:1.3;margin:2.25rem 0 .75rem}' +
    'h3{font-size:1.125rem;line-height:1.35;margin:1.5rem 0 .5rem}' +
    'li{margin:.25rem 0}' +
    'code{font-size:.9em;padding:.1em .35em;border-radius:6px;background:rgba(127,127,127,.15)}' +
    '.signature,.langue{margin:-.25rem 0 1rem;color:var(--doux);font-size:.9375rem}' +
    '.en-bref{margin:0 0 1.75rem;padding:1rem 1.25rem;border:1px solid var(--bord);border-left:4px solid var(--accent);border-radius:10px}' +
    '.sources{font-size:.9375rem;color:var(--doux)}' +
    '.sources a{overflow-wrap:anywhere}' +
    '.cta{margin:2.5rem 0;padding:1.25rem;border:1px solid var(--bord);border-radius:14px}' +
    '.cta p{margin:0 0 1rem;color:var(--doux)}' +
    '.cta a{display:inline-block;background:var(--accent);color:var(--sur-accent);padding:.7rem 1.2rem;border-radius:10px;font-weight:700;text-decoration:none}' +
    'footer{margin-top:3rem;padding-top:1.25rem;padding-bottom:2.5rem;border-top:1px solid var(--bord);color:var(--doux);font-size:.9375rem}' +
    'footer a{color:inherit}';

  return `<!doctype html>
<html lang="${e(lang)}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' https: data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" />
    <title>${e(page.title)}</title>
    <meta name="description" content="${e(page.description)}" />
    <link rel="canonical" href="${e(url)}" />
    ${
      paire
        ? [
            `<link rel="alternate" hreflang="fr" href="${e(paire.fr)}" />`,
            `<link rel="alternate" hreflang="en" href="${e(paire.en)}" />`,
            `<link rel="alternate" hreflang="x-default" href="${e(paire.fr)}" />`,
          ].join('\n    ') + '\n    '
        : ''
    }${accent ? `<meta name="theme-color" content="${e(accent)}" />\n    ` : ''}${icones.join('\n    ')}
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="${e(nomApp)}" />
    ${locale ? `<meta property="og:locale" content="${e(locale)}" />\n    ` : ''}${
      paire
        ? `<meta property="og:locale:alternate" content="${ogLocale(anglais ? 'fr' : 'en')}" />\n    `
        : ''
    }<meta property="og:title" content="${e(page.title)}" />
    <meta property="og:description" content="${e(page.description)}" />
    <meta property="og:url" content="${e(url)}" />
    ${dateHtml('article:published_time', page.date)}${dateHtml('article:modified_time', dateModifiee)}${
      imageEstUneImage
        ? [
            `<meta property="og:image" content="${e(image)}" />`,
            ...['type', 'width', 'height']
              .map(k => [k, metaDe(indexHtml, `og:image:${k}`)])
              .filter(([, v]) => v)
              .map(
                ([k, v]) =>
                  `<meta property="og:image:${k}" content="${e(v)}" />`
              ),
            `<meta property="og:image:alt" content="${e(page.title)}" />`,
            `<meta name="twitter:image" content="${e(image)}" />`,
          ].join('\n    ') + '\n    '
        : ''
    }<meta name="twitter:card" content="${carteLarge ? 'summary_large_image' : 'summary'}" />
    ${jsonLdScript(donnees)}
    <style>${style}</style>
  </head>
  <body>
    <header>
      <a href="${e(homeUrl)}">${iconeEntete ? `<img src="${e(iconeEntete)}" alt="" width="40" height="40" />` : ''}${e(nomApp)}</a>
    </header>
    <main>
      <nav aria-label="${e(t.fil)}">
        <ol>
          <li><a href="${FAMILY_ORIGIN}/">${e(t.parc)}</a></li>
          <li><a href="${e(homeUrl)}">${e(nomApp)}</a></li>
          <li aria-current="page">${e(page.titre)}</li>
        </ol>
      </nav>
      <article>
${article}
      </article>
      <aside class="cta">
        ${descriptionApp ? `<p>${e(descriptionApp)}</p>` : ''}
        <a href="${e(homeUrl)}">${e(t.ouvrir(nomApp))}</a>
      </aside>${
        autres.length
          ? `
      <aside>
        <h2>${e(t.aLire)}</h2>
        <ul>
          ${autres.map(p => `<li><a href="${e(p.slug)}.html">${e(p.titre)}</a></li>`).join('\n          ')}
        </ul>
      </aside>`
          : ''
      }${
        voisines.apps.length
          ? `
      <aside aria-labelledby="dwc-voisines">
        <h2 id="dwc-voisines">${e(voisines.memeCategorie ? t.memeCategorie : t.voisines)}</h2>
        <ul>
          ${voisines.apps.map(a => `<li><a href="${e(a.appUrl)}">${e(a.name)}</a>${anglais ? '' : ` — ${e(a.description)}`}</li>`).join('\n          ')}
        </ul>
      </aside>`
          : ''
      }
    </main>
    <footer>
      <p><a href="${FAMILY_ORIGIN}/">${e(t.famille)}</a></p>
    </footer>
  </body>
</html>
`;
}

// ---------------------------------------------------------------------------
// L'accueil servi, les routes publiques, le 404, l'état SEO
// ---------------------------------------------------------------------------

/** Un caractère d'usage privé : une marque qu'aucun HTML ne contient. */
const PRIVE = String.fromCharCode(0xe000);

/** Le texte sans son BOM de tête, s'il en a un. */
function sansBom(texte) {
  const s = String(texte);
  return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
}

/**
 * Insère un fragment juste avant `</head>`. Le remplacement passe par une
 * FONCTION : dans une chaîne de remplacement, `$&` ou `$'` sont des motifs, et
 * un titre ou une description qui en contiendrait réécrirait la page.
 *
 * @param {string} html
 * @param {string} fragment
 */
function avantFinHead(html, fragment) {
  return html.replace('</head>', () => `  ${fragment}\n  </head>`);
}

/**
 * Retire les balises que `garder` refuse ; une ligne qui ne portait qu'elles
 * disparaît avec elles, comme dans `setShareImage`.
 *
 * @param {string} html
 * @param {RegExp} motif Un motif global de balise (`/<meta\b[^>]*>/gi`).
 * @param {(balise: string) => boolean} garder
 */
function retirerBalises(html, motif, garder) {
  const marque = `${PRIVE}dwc-retire${PRIVE}`;
  return html
    .replace(motif, balise => (garder(balise) ? balise : marque))
    .split('\n')
    .filter(l => !l.includes(marque) || l.replaceAll(marque, '').trim() !== '')
    .map(l => l.replaceAll(marque, ''))
    .join('\n');
}

/** Le texte de l'accueil servi, relatif à la racine du projet. */
export const SERVED_HOME_FILE = 'content/accueil.md';

/**
 * LE TEXTE DE L'ACCUEIL SERVI : `content/accueil.md`, rendu pour le contenu
 * servi (`injectServedContent`, option `accueil`).
 *
 * Au relevé du 29/09/2026, un accueil ne disait en HTML statique que son titre
 * et sa description, en 32 à 52 mots. Ce fichier, écrit app par app, dit ce
 * qu'un robot de réponse cherche et ne trouvait nulle part : pour qui, comment
 * ça marche, où vont les données, ce que ça coûte.
 *
 * Même Markdown court que les pages de contenu (`##`, `###`, paragraphes,
 * listes, gras, italique, liens). PAS DE `#` : l'accueil a déjà son titre, le
 * `<title>` de la page, en `<h1>` — un second fait échouer le build, en
 * nommant le fichier. Un en-tête `---` en tête, même vide, est toléré et
 * ignoré.
 *
 * @param {string} texte
 * @param {string} [fichier]
 * @returns {string} `''` pour un fichier vide.
 */
export function renderServedHome(texte, fichier = SERVED_HOME_FILE) {
  const source = sansBom(texte).replace(/\r\n?/g, '\n');
  const entete = /^---\n(?:[\s\S]*?\n)?---(?:\n|$)/.exec(source);
  const markdown = (entete ? source.slice(entete[0].length) : source).trim();
  if (!markdown) return '';
  if (markdown.split('\n').some(l => /^#\s/.test(l.trim())))
    throw new Error(
      `[pwa-seo] ${fichier} : pas de titre « # » — l’accueil a déjà le sien, le <title> de la page`
    );
  return renderMarkdown(markdown);
}

/** Un chemin de route : des segments en minuscules ASCII et tirets. */
const CHEMIN_ROUTE =
  /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

/**
 * Un chemin sans ses barres de tête et de queue — par deux boucles, comme
 * `normalizeBasePath` de `vite-pwa.js` : l'alternative ancrée aux deux bouts
 * `/^\/+|\/+$/g` recule sur une chaîne pleine de barres (CodeQL).
 *
 * @param {string} chemin
 */
function sansBarres(chemin) {
  let debut = 0;
  let fin = chemin.length;
  while (debut < fin && chemin[debut] === '/') debut += 1;
  while (fin > debut && chemin[fin - 1] === '/') fin -= 1;
  return chemin.slice(debut, fin);
}

/**
 * LES ROUTES PUBLIQUES, normalisées : `'a-propos'` ou `{ path, title,
 * description }` → `{ path, title?, description? }`, le chemin sans barre au
 * début ni à la fin.
 *
 * Refuse, en nommant la route, ce qui ne peut pas devenir un fichier : un
 * chemin hors du motif (une requête `?…`, un accent, une majuscule), réservé
 * (`index`, `404`, `sw`, `offline`), ou en double.
 *
 * @param {Array<string | { path: string, title?: string, description?: string }>} [routes]
 * @returns {Array<{ path: string, title?: string, description?: string }>}
 */
export function normalizeRoutes(routes = []) {
  const vus = new Set();
  return routes.map(route => {
    const objet = typeof route === 'object' && route !== null ? route : null;
    const path = sansBarres(String((objet ? objet.path : route) ?? '').trim());
    if (!CHEMIN_ROUTE.test(path))
      throw new Error(
        `[pwa-seo] route « ${objet ? objet.path : route} » invalide : un chemin relatif à l’accueil, en minuscules ASCII et tirets (a-propos, lieux/1)`
      );
    if (SLUGS_RESERVES.has(path))
      throw new Error(
        `[pwa-seo] route « ${path} » réservée : ${path}.html est un fichier de l’app`
      );
    if (vus.has(path))
      throw new Error(`[pwa-seo] route « ${path} » déclarée deux fois`);
    vus.add(path);
    const title = objet?.title ? String(objet.title) : '';
    const description = objet?.description ? String(objet.description) : '';
    return {
      path,
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
    };
  });
}

/**
 * Une route en collision avec une page de contenu écraserait son fichier ; la
 * route `en` masquerait le dossier des pages anglaises.
 *
 * @param {ReturnType<typeof normalizeRoutes>} routes
 * @param {ReturnType<typeof readContentPages>} pages
 */
function verifierRoutes(routes, pages) {
  const prises = new Map(
    pages.map(p => [p.chemin.replace(/\.html$/, ''), p.fichier])
  );
  const anglaises = pages.some(p => p.lang === 'en');
  for (const route of routes) {
    const page = prises.get(route.path);
    if (page)
      throw new Error(
        `[pwa-seo] route « ${route.path} » : en collision avec la page de contenu ${page}`
      );
    if (anglaises && route.path === DOSSIER_EN)
      throw new Error(
        `[pwa-seo] route « ${route.path} » : ${DOSSIER_EN}/ porte les pages de contenu anglaises`
      );
  }
}

/**
 * Le `<title>` remplacé — ou posé, s'il manque.
 *
 * @param {string} html
 * @param {string} titre
 */
function avecTitre(html, titre) {
  const bas = html.toLowerCase();
  const debut = bas.indexOf('<title>');
  if (debut < 0)
    return avantFinHead(html, `<title>${echapperXml(titre)}</title>`);
  const fin = bas.indexOf('</title>', debut + 7);
  if (fin < 0) return html;
  return `${html.slice(0, debut + 7)}${echapperXml(titre)}${html.slice(fin)}`;
}

/**
 * Le contenu d'une balise `<meta>` remplacé ; la balise posée si elle manque
 * et qu'`ajouter` le demande.
 *
 * @param {string} html
 * @param {'name' | 'property'} attr
 * @param {string} cle
 * @param {string} valeur
 * @param {boolean} ajouter
 */
function avecMeta(html, attr, cle, valeur, ajouter) {
  let vue = false;
  const out = html.replace(/<meta\b[^>]*>/gi, balise => {
    if (
      attribut(balise, 'name') !== cle &&
      attribut(balise, 'property') !== cle
    )
      return balise;
    vue = true;
    return balise.replace(
      /\bcontent\s*=\s*("[^"]*"|'[^']*')/i,
      () => `content="${echapperXml(valeur)}"`
    );
  });
  if (vue || !ajouter) return out;
  return avantFinHead(
    out,
    `<meta ${attr}="${cle}" content="${echapperXml(valeur)}" />`
  );
}

/**
 * La canonique remplacée — ou posée, si elle manque.
 *
 * @param {string} html
 * @param {string} url
 */
function avecCanonique(html, url) {
  let vue = false;
  const out = html.replace(/<link\b[^>]*>/gi, balise => {
    if (!/^canonical$/i.test(attribut(balise, 'rel'))) return balise;
    vue = true;
    return balise.replace(
      /\bhref\s*=\s*("[^"]*"|'[^']*')/i,
      () => `href="${echapperXml(url)}"`
    );
  });
  return vue
    ? out
    : avantFinHead(out, `<link rel="canonical" href="${echapperXml(url)}" />`);
}

/** Le début du contenu servi, ou -1. */
function debutServi(html) {
  return html.indexOf('<div data-dwc="served-content">');
}

/**
 * Dans le contenu servi, le texte du `<h1>`, ou du premier `<p>` qui le suit
 * (la description), remplacé.
 *
 * @param {string} html
 * @param {'h1' | 'p'} balise
 * @param {string} texte
 */
function avecServi(html, balise, texte) {
  const debut = debutServi(html);
  if (debut < 0) return html;
  const depuis = balise === 'h1' ? debut : html.indexOf('</h1>', debut);
  if (depuis < 0) return html;
  const ouvre = html.indexOf(`<${balise}>`, depuis);
  const ferme = ouvre < 0 ? -1 : html.indexOf(`</${balise}>`, ouvre);
  if (ferme < 0) return html;
  return `${html.slice(0, ouvre + balise.length + 2)}${echapperXml(texte)}${html.slice(ferme)}`;
}

/**
 * Le texte propre à l'accueil (`content/accueil.md`), retiré du contenu servi
 * — sections imbriquées comprises (celle des sources).
 *
 * @param {string} html
 */
function sansTexteAccueil(html) {
  const debut = html.indexOf('<section data-dwc="served-text">');
  if (debut < 0) return html;
  let profondeur = 0;
  let i = debut;
  for (;;) {
    const ouvre = html.indexOf('<section', i);
    const ferme = html.indexOf('</section>', i);
    if (ferme < 0) return html;
    if (ouvre >= 0 && ouvre < ferme) {
      profondeur += 1;
      i = ouvre + 8;
      continue;
    }
    profondeur -= 1;
    i = ferme + 10;
    if (profondeur === 0) return html.slice(0, debut) + html.slice(i);
  }
}

/**
 * LA PAGE D'UNE ROUTE PUBLIQUE : l'`index.html` CONSTRUIT, avec le titre, la
 * description, la canonique (SANS extension) et l'Open Graph de la route
 * (`og:url`, `og:title`, `og:description` ; `twitter:*` et `og:image:alt`
 * suivent s'ils existent). Le contenu servi suit aussi : son `<h1>` et sa
 * description sont ceux de la route, et le texte propre à l'accueil en est
 * retiré.
 *
 * GitHub Pages sert `/<base>/<path>` depuis `<path>.html`, EN 200 (vérifié en
 * ligne sur une page de contenu servie sans son extension) ; le routeur de la
 * SPA affiche ensuite l'écran. Sans ce fichier, la même URL répondait 404 —
 * `404.html` est servi avec ce statut —, et l'option `routes` mettait au plan
 * de site des URL qu'aucun moteur ne pouvait indexer (relevé du 29/09/2026).
 *
 * @param {string} indexHtml
 * @param {{ url: string, title?: string, description?: string }} route
 */
export function routePageHtml(indexHtml, { url, title, description }) {
  let out = indexHtml;
  if (title) {
    out = avecTitre(out, title);
    out = avecMeta(out, 'property', 'og:title', title, true);
    out = avecMeta(out, 'name', 'twitter:title', title, false);
    out = avecMeta(out, 'property', 'og:image:alt', title, false);
    out = avecServi(out, 'h1', title);
  }
  if (description) {
    out = avecMeta(out, 'name', 'description', description, true);
    out = avecMeta(out, 'property', 'og:description', description, true);
    out = avecMeta(out, 'name', 'twitter:description', description, false);
    out = avecServi(out, 'p', description);
  }
  out = avecCanonique(out, url);
  out = avecMeta(out, 'property', 'og:url', url, true);
  return sansTexteAccueil(out);
}

/**
 * UN DOCUMENT HORS INDEX : `<meta name="robots" content="noindex">` posé en
 * tête de `<head>`, les balises `robots` écrites à la main retirées —
 * `mister-footcoach` et `mister-puzzle` servaient `index, follow` sur leur
 * `404.html` —, et la canonique retirée : une page `noindex` qui désigne une
 * canonique envoie deux signaux contraires, et le moteur peut reporter le
 * `noindex` sur la page désignée, ici l'accueil.
 *
 * Idempotent : deux passes ne posent qu'une balise.
 *
 * @param {string} html
 */
export function withNoindex(html) {
  let out = retirerBalises(
    html,
    /<meta\b[^>]*>/gi,
    b => !/^(?:robots|googlebot)$/i.test(attribut(b, 'name'))
  );
  out = retirerBalises(
    out,
    /<link\b[^>]*>/gi,
    b => !/^canonical$/i.test(attribut(b, 'rel'))
  );
  const balise = '<meta name="robots" content="noindex" />';
  const tete = /<head\b[^>]*>/i.exec(out);
  if (!tete) return `${balise}\n${out}`;
  const fin = tete.index + tete[0].length;
  return `${out.slice(0, fin)}\n    ${balise}${out.slice(fin)}`;
}

/** Le fichier d'état SEO, publié avec le site (voir `seoState`). */
export const SEO_STATE_FILE = 'seo-state.json';

/** Ce qui sépare les parties d'une empreinte : rien ne le contient. */
const SEPARATEUR = String.fromCharCode(0);

/**
 * Une empreinte courte : sha256 en hexadécimal, seize caractères.
 *
 * @param {string[]} parties
 */
function empreinte(parties) {
  return createHash('sha256')
    .update(parties.join(SEPARATEUR))
    .digest('hex')
    .slice(0, 16);
}

/** Les clés d'un JSON-LD qui changent sans que la page change. */
const CLES_VOLATILES = new Set([
  'dateModified',
  'datePublished',
  'dateCreated',
  'uploadDate',
  'softwareVersion',
  'version',
]);

/**
 * Un JSON-LD sans ses valeurs volatiles : les clés de `CLES_VOLATILES`, et le
 * paramètre `v` des URL (une empreinte de cache, pas un contenu).
 *
 * @param {unknown} valeur
 * @returns {unknown}
 */
function sansVolatiles(valeur) {
  if (Array.isArray(valeur)) return valeur.map(sansVolatiles);
  if (valeur && typeof valeur === 'object')
    return Object.fromEntries(
      Object.entries(valeur)
        .filter(([cle]) => !CLES_VOLATILES.has(cle))
        .map(([cle, v]) => [cle, sansVolatiles(v)])
    );
  if (typeof valeur === 'string' && /^https?:\/\//.test(valeur)) {
    try {
      const url = new URL(valeur);
      url.searchParams.delete('v');
      return url.href;
    } catch {
      return valeur;
    }
  }
  return valeur;
}

/** Le contenu servi d'un accueil construit, ou `''`. */
function blocServi(html) {
  const debut = debutServi(html);
  if (debut < 0) return '';
  const fin = html.indexOf('<noscript>', debut);
  return fin < 0 ? html.slice(debut) : html.slice(debut, fin);
}

/**
 * L'EMPREINTE D'UN ACCUEIL : ce qu'un moteur en lit — titre, description,
 * contenu servi, données structurées hors valeurs volatiles (dates, versions,
 * paramètre `?v=` de cache). Deux builds du même contenu la partagent, quel
 * que soit le jour ; changer un mot du texte servi la change.
 *
 * @param {string} html L'`index.html` construit.
 */
export function homeFingerprint(html) {
  const donnees = blocsJsonLd(html).map(bloc => {
    try {
      return JSON.stringify(sansVolatiles(JSON.parse(bloc.json)));
    } catch {
      return bloc.json.trim();
    }
  });
  return empreinte([
    decoderEntites(contenuDuTitre(html).trim()),
    metaDe(html, 'description'),
    blocServi(html),
    ...donnees,
  ]);
}

/**
 * LE `lastmod` RÉEL, et la liste de ce qui a changé.
 *
 * Relevé du 29/09/2026 : `lastmod` valait le jour du build pour TOUTES les
 * URL, et les apps se redéploient presque chaque jour (Renovate, correctifs).
 * La publication du hub signalait donc à IndexNow les 41 URL du parc à chaque
 * passage — quinze fois le 27/09 —, et Google ignore un `lastmod` qu'il juge
 * peu fiable.
 *
 * Chaque URL porte désormais une EMPREINTE de ce qui compte : pour l'accueil,
 * `homeFingerprint` ; pour une page de contenu, sa source et son en-tête ;
 * pour une route, son chemin, son titre et sa description. L'état du
 * déploiement précédent — `seo-state.json`, publié avec le site, que la CI
 * récupère avant le build — dit si elle a bougé :
 *   - empreinte inchangée : l'ancien `lastmod` est repris ;
 *   - empreinte nouvelle ou changée : `lastmod` vaut le jour du build, et
 *     l'URL entre dans `changees` (`seo-changed.json`, lu par IndexNow) ;
 *   - une page qui a `updated` ou `date` : cette date ÉDITORIALE prime pour
 *     `lastmod`, changée ou non.
 * Sans état précédent, tout est changé et daté du jour : le comportement
 * d'avant.
 *
 * @param {{
 *   entrees: Array<{ url: string, hash: string, date?: string }>,
 *   precedent?: Record<string, { hash?: string, lastmod?: string }> | null,
 *   aujourdHui?: string,
 * }} opts
 * @returns {{ etat: Record<string, { hash: string, lastmod: string }>, changees: string[] }}
 */
export function seoState({
  entrees,
  precedent = null,
  aujourdHui = new Date().toISOString().slice(0, 10),
}) {
  /** @type {Record<string, { hash: string, lastmod: string }>} */
  const etat = {};
  /** @type {string[]} */
  const changees = [];
  for (const { url, hash, date } of entrees) {
    const avant = precedent?.[url];
    const inchangee = Boolean(avant) && avant?.hash === hash;
    const ancien =
      typeof avant?.lastmod === 'string' && DATE_ISO.test(avant.lastmod)
        ? avant.lastmod
        : '';
    etat[url] = {
      hash,
      lastmod: date || (inchangee && ancien ? ancien : aujourdHui),
    };
    if (!inchangee) changees.push(url);
  }
  return { etat, changees };
}

/**
 * L'état SEO du déploiement précédent, lu dans le fichier que désigne
 * `PWA_SEO_PREVIOUS_STATE`. `null` sans variable, sans fichier, ou pour un
 * contenu qui n'est pas un objet : tout sera alors « changé ».
 *
 * @param {string | undefined} chemin
 * @returns {Record<string, { hash?: string, lastmod?: string }> | null}
 */
function etatPrecedent(chemin) {
  if (!chemin) return null;
  try {
    const donnees = JSON.parse(readFileSync(chemin, 'utf8'));
    return donnees && typeof donnees === 'object' && !Array.isArray(donnees)
      ? donnees
      : null;
  } catch {
    return null;
  }
}

/**
 * Écriture exclusive (`wx`) : refuse si le fichier existe déjà, sans course
 * entre `existsSync` et `writeFileSync` (CodeQL js/file-system-race).
 *
 * @param {string} cible
 * @param {string} contenu
 * @param {string} message L'erreur à lever si le fichier existe.
 */
function ecrireExclusif(cible, contenu, message) {
  mkdirSync(dirname(cible), { recursive: true });
  try {
    writeFileSync(cible, contenu, { encoding: 'utf8', flag: 'wx' });
  } catch (err) {
    if (
      err &&
      typeof err === 'object' &&
      'code' in err &&
      err.code === 'EEXIST'
    )
      throw new Error(message, { cause: err });
    throw err;
  }
}

/**
 * Plugin Vite : injecte les placeholders d'index.html, pose les balises et
 * les données structurées de l'accueil, sert son contenu, écrit les pages de
 * contenu et les routes publiques, puis le plan de site et l'état SEO.
 *
 * Placeholders remplacés dans index.html :
 *   __SEO_HOME_URL__     URL d'accueil canonique
 *
 * Placeholders supplémentaires (si `logoPath`/`iconQuery` fournis) :
 *   __SEO_LOGO_URL__     URL absolue du logo (Open Graph / Twitter / JSON-LD)
 *   __PWA_ICON_QS__      query-string de cache-busting des icônes
 *
 * Écrits au build dans le dossier de sortie : `sitemap.xml`, `seo-state.json`
 * (voir `seoState`), les pages de contenu (`<slug>.html`, `en/<slug>.html`),
 * les routes (`<path>.html`) et, sur demande, `robots.txt` et `llms.txt`.
 * HORS du dossier de sortie : `seo-changed.json` (`PWA_SEO_CHANGED_FILE`).
 *
 * @param {object} [opts]
 * @param {string}  [opts.siteName]        Nom du site pour `og:site_name`, quand
 *   l'app n'est pas au catalogue — le nom du catalogue l'emporte.
 * @param {boolean} [opts.sitemap=true]    Générer sitemap.xml.
 * @param {boolean} [opts.robots=false]    Générer robots.txt. Un `robots.txt`
 *   n'est lu qu'à la RACINE d'une origine : sous `/<app>/`, les robots
 *   l'ignorent, et c'est `mister-guiiug.github.io` qui déclare les plans de
 *   site du parc. À `true` pour une app servie à la racine d'une origine.
 * @param {string}  [opts.outDir='dist']   Dossier de sortie du build.
 * @param {string}  [opts.changefreq='weekly']
 * @param {string}  [opts.basePath]        Force le base path (sinon VITE_BASE_PATH).
 * @param {string}  [opts.logoPath]        Chemin du logo (ex. '/logo.svg') → __SEO_LOGO_URL__.
 * @param {string}  [opts.iconQuery='']    Query de cache-busting (ex. '?v=1.0.1') → __PWA_ICON_QS__.
 * @param {string | true | false} [opts.llms=false] Contenu d'un `llms.txt`.
 *   Omis ou `false` : aucun fichier (défaut — Google ne s'en sert pas).
 *   `true` : fichier minimal depuis le catalogue (`defaultLlmsTxt`).
 *   Une chaîne : ce texte, tel quel.
 * @param {boolean | import('./theme-boot.js').ThemeBootOptions} [opts.themeBoot]
 *   Le script anti-FOUC, injecté en tête de `<head>`.
 * @param {{ light?: string, dark?: string }} [opts.themeColor] Deux
 *   `theme-color` par schéma, qui remplacent celle de l'index.
 * @param {Record<string,string>} [opts.extraReplacements={}] Placeholders custom → valeurs.
 * @param {boolean | Record<string, unknown>} [opts.jsonLd=true] Données
 *   structurées `WebApplication` injectées dans `<head>` (voir
 *   `webApplicationJsonLd`). `false` les coupe ; un objet surcharge des
 *   champs. Jamais injectées si la page porte déjà un `application/ld+json`.
 * @param {Array<string | { path: string, title?: string, description?: string }>} [opts.routes=[]]
 *   Routes PUBLIQUES, relatives à l'accueil : `'a-propos'`, ou `{ path:
 *   'a-propos', title, description }`. Chacune devient au build un fichier
 *   `<path>.html` — l'accueil construit, avec son titre, sa description, sa
 *   canonique sans extension et son Open Graph (voir `routePageHtml`) — et
 *   entre au plan de site. Un chemin invalide, réservé, ou en collision avec
 *   une page de contenu fait échouer le build. Seulement des écrans servis à
 *   froid : un chemin derrière une connexion n'a rien à y faire.
 * @param {boolean} [opts.servedContent=true] Sert, au BUILD, le titre, la
 *   description, le texte de `content/accueil.md`, les pages de contenu, les
 *   apps sœurs et le dépôt dans le point de montage vide (voir
 *   `injectServedContent`). `false` le coupe.
 * @param {string | false} [opts.contentPages='content/pages'] Dossier des pages
 *   de contenu, relatif à la racine du projet (voir `contentPageHtml`). Chaque
 *   `<slug>.md` devient `<slug>.html` au build, chaque `en/<slug>.md`
 *   `en/<slug>.html` ; elles entrent au plan de site et au contenu servi. Un
 *   dossier absent ne produit rien ; `false` coupe.
 * @param {string | false} [opts.ogImage] Image de partage, relative au dossier
 *   public. Par défaut `og-image.jpg` ou `og-image.png` s'il existe (voir
 *   `findShareImage`) ; `false` coupe.
 */
export function pwaSeoPlugin(opts = {}) {
  const {
    siteName,
    sitemap = true,
    robots = false,
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
    servedContent = true,
    contentPages = CONTENT_PAGES_DIR,
    ogImage,
  } = opts;
  // Refusées dès la configuration : une route qui ne peut pas devenir un
  // fichier n'a pas à attendre la fin du build pour le dire.
  const routesPubliques = normalizeRoutes(routes);
  const urlOpts = { basePath, logoPath, iconQuery };
  // Résolus depuis la config Vite : on respecte un `build.outDir` personnalisé
  // et on ne génère les fichiers (sitemap/robots/llms) qu'en mode build.
  let resolvedOutDir = outDir;
  let isBuild = false;
  let racine = process.cwd();
  let publicDir = resolve(racine, 'public');
  /**
   * Les pages de contenu, lues une fois par build.
   * @type {ReturnType<typeof readContentPages> | null}
   */
  let pagesLues = null;
  const pagesDeContenu = () => {
    if (contentPages === false) return [];
    pagesLues ??= readContentPages(resolve(racine, contentPages));
    return pagesLues;
  };
  /**
   * Le texte de `content/accueil.md`, rendu une fois par build.
   * @type {string | null}
   */
  let accueilLu = null;
  const texteAccueil = () => {
    if (accueilLu === null) {
      const fichier = resolve(racine, SERVED_HOME_FILE);
      accueilLu = existsSync(fichier)
        ? renderServedHome(readFileSync(fichier, 'utf8'), SERVED_HOME_FILE)
        : '';
    }
    return accueilLu;
  };
  /**
   * Ce que `writeBundle` a RÉELLEMENT écrit : le plan de site et l'état SEO ne
   * listent que ça — plus jamais une URL au plan de site sans son fichier.
   * @type {{ dist: string, pages: ReturnType<typeof readContentPages>, routes: ReturnType<typeof normalizeRoutes> }}
   */
  let ecrites = { dist: '', pages: [], routes: [] };
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
      racine = config?.root || process.cwd();
      // `publicDir: false` dans la config Vite arrive ici en chaîne vide.
      publicDir =
        config?.publicDir === undefined
          ? resolve(racine, 'public')
          : config.publicDir;
      pagesLues = null;
      accueilLu = null;
      ecrites = { dist: '', pages: [], routes: [] };
    },
    /**
     * Au début du build : les pages de contenu sont lues (une page fausse
     * arrête tout ici, en la nommant), et les routes confrontées aux pages.
     */
    buildStart() {
      if (!isBuild) return;
      verifierRoutes(routesPubliques, pagesDeContenu());
    },
    transformIndexHtml(html) {
      const { homeUrl, logoUrl } = resolveSeoPublicUrls(urlOpts);
      const fiche = ficheDe(homeUrl);
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
      // Les balises texte qui manquent (Open Graph, Twitter), AVANT l'image de
      // partage et les données structurées : `twitter:card` y sera remplacé,
      // et le `WebApplication` d'une app hors catalogue prend son nom dans
      // `og:site_name`.
      out = setTextMeta(out, {
        siteName: fiche?.name || siteName,
        url: homeUrl,
      });
      // L'image de partage AVANT les données structurées : le `WebApplication`
      // prend son `image` dans la page.
      if (ogImage !== false) {
        const image = findShareImage({
          publicDir,
          homeUrl,
          fichier: typeof ogImage === 'string' ? ogImage : undefined,
        });
        if (image)
          out = setShareImage(out, {
            ...image,
            alt: decoderEntites(contenuDuTitre(out).trim()),
          });
      }
      // APRÈS les remplacements : l'image et l'URL lues dans la page doivent
      // être les valeurs finales, pas les marqueurs.
      if (jsonLd !== false && !/application\/ld\+json/i.test(out)) {
        const donnees = webApplicationJsonLd({
          html: out,
          homeUrl,
          overrides: typeof jsonLd === 'object' ? jsonLd : {},
        });
        if (donnees && out.includes('</head>'))
          out = avantFinHead(out, jsonLdScript(donnees));
      }
      // Au BUILD seulement : le serveur de développement reste tel quel, et
      // c'est ce qui est DÉPLOYÉ que les robots lisent.
      if (servedContent !== false && isBuild) {
        out = injectServedContent(out, {
          pages: pagesDeContenu().map(p => ({
            href: `${homeUrl}${p.chemin}`,
            titre: p.titre,
            lang: p.lang,
          })),
          accueil: texteAccueil(),
          voisines: fiche ? relatedApps(fiche.id) : undefined,
          depot: fiche?.repoUrl,
        }).html;
      }
      return out;
    },
    /**
     * Les pages de contenu et les routes, écrites à côté de l'`index.html`
     * CONSTRUIT. Avant elles, les captures du manifeste — que
     * `vite-plugin-pwa` vient d'écrire — rejoignent le `WebApplication`.
     *
     * `writeBundle` et pas `closeBundle` : `vite-plugin-pwa` engendre le
     * service worker dans SON `closeBundle`, qui passe après tous les
     * `writeBundle`. Les pages sont donc sur le disque quand il dresse le
     * précache — toujours, quel que soit l'ordre des plugins — et l'accueil y
     * entre dans sa version finale.
     */
    writeBundle(options) {
      if (!isBuild) return;
      const dist = options?.dir || resolve(process.cwd(), resolvedOutDir);
      ecrites.dist = dist;
      const pages = pagesDeContenu();
      const index = join(dist, 'index.html');
      // Lire directement, sans `existsSync` avant : vérifier puis lire laisse
      // une fenêtre où le fichier change (CodeQL js/file-system-race).
      let indexHtml;
      try {
        indexHtml = readFileSync(index, 'utf8');
      } catch (err) {
        if (err?.code !== 'ENOENT') throw err;
        if (pages.length || routesPubliques.length)
          console.warn(
            `[pwa-seo] index.html introuvable dans ${dist} : pages de contenu et routes non écrites.`
          );
        return;
      }
      const { homeUrl } = resolveSeoPublicUrls(urlOpts);
      const avec = avecCaptures(
        indexHtml,
        `${homeUrl}#app`,
        capturesDuManifeste(dist, indexHtml, homeUrl)
      );
      if (avec !== indexHtml) {
        writeFileSync(index, avec, 'utf8');
        indexHtml = avec;
      }
      for (const page of pages) {
        ecrireExclusif(
          join(dist, page.chemin),
          contentPageHtml({ page, pages, indexHtml, homeUrl }),
          `[pwa-seo] ${page.chemin} existe déjà dans ${dist} : choisir un autre slug.`
        );
        ecrites.pages.push(page);
      }
      for (const route of routesPubliques) {
        if (estUnDossier(join(dist, route.path)))
          throw new Error(
            `[pwa-seo] route « ${route.path} » : le dossier ${route.path}/ existe dans ${dist} — GitHub Pages servirait le dossier, pas la route`
          );
        ecrireExclusif(
          join(dist, `${route.path}.html`),
          routePageHtml(indexHtml, {
            url: `${homeUrl}${route.path}`,
            title: route.title,
            description: route.description,
          }),
          `[pwa-seo] route « ${route.path} » : ${route.path}.html existe déjà dans ${dist} — choisir un autre chemin.`
        );
        ecrites.routes.push(route);
      }
    },
    async closeBundle() {
      // Hook de build : ne rien écrire en dev/serve (au cas où l'outil l'appelle).
      if (!isBuild) return;
      const { homeUrl } = resolveSeoPublicUrls(urlOpts);
      const dist = ecrites.dist || resolve(process.cwd(), resolvedOutDir);
      // Crée le dossier de sortie si absent (évite ENOENT quand le build
      // n'a encore rien émis, ou avec un `build.outDir` personnalisé).
      mkdirSync(dist, { recursive: true });
      const indexPath = join(dist, 'index.html');
      const indexHtml = existsSync(indexPath)
        ? readFileSync(indexPath, 'utf8')
        : '';

      // L'état SEO : une empreinte par URL, le `lastmod` repris quand elle
      // n'a pas bougé, et la liste de ce qui a changé (voir `seoState`).
      /** @type {Array<{ url: string, hash: string, date?: string }>} */
      const entrees = [
        { url: homeUrl, hash: homeFingerprint(indexHtml) },
        ...ecrites.routes.map(r => ({
          url: `${homeUrl}${r.path}`,
          hash: empreinte([r.path, r.title ?? '', r.description ?? '']),
        })),
        ...ecrites.pages.map(p => ({
          url: `${homeUrl}${p.chemin}`,
          hash: p.empreinte,
          date: p.updated || p.date,
        })),
      ];
      const { etat, changees } = seoState({
        entrees,
        precedent: etatPrecedent(process.env.PWA_SEO_PREVIOUS_STATE),
      });
      writeFileSync(
        join(dist, SEO_STATE_FILE),
        `${JSON.stringify(etat, null, 2)}\n`,
        'utf8'
      );
      // HORS du site publié : la liste ne regarde que la CI (IndexNow).
      const fichierChangees =
        process.env.PWA_SEO_CHANGED_FILE ||
        resolve(
          racine,
          'node_modules',
          '.cache',
          'pwa-seo',
          'seo-changed.json'
        );
      mkdirSync(dirname(fichierChangees), { recursive: true });
      writeFileSync(
        fichierChangees,
        `${JSON.stringify(changees, null, 2)}\n`,
        'utf8'
      );

      if (sitemap) {
        // `lastmod` : celui de l'état SEO — repris tant que l'empreinte ne
        // bouge pas, la date éditoriale pour une page qui en porte une.
        // Google ignore `changefreq` et `priority`, mais lit `lastmod` quand
        // il est fiable : c'est le seul champ qui lui dise qu'il y a du neuf.
        const blocs = entrees
          .map(
            ({ url }) => `  <url>
    <loc>${echapperXml(url)}</loc>
    <lastmod>${etat[url].lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${url === homeUrl ? '1.0' : '0.8'}</priority>
  </url>`
          )
          .join('\n');
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${blocs}
</urlset>
`;
        writeFileSync(join(dist, 'sitemap.xml'), xml, 'utf8');
      }
      if (robots) {
        const txt = `User-agent: *
Allow: /

Sitemap: ${homeUrl}sitemap.xml
`;
        writeFileSync(join(dist, 'robots.txt'), txt, 'utf8');
      }
      // Défaut : pas de llms.txt. `true` → auto catalogue ; chaîne → telle quelle.
      if (llms === true || typeof llms === 'string') {
        const texte =
          typeof llms === 'string'
            ? llms
            : defaultLlmsTxt({ homeUrl, html: indexHtml });
        if (texte) {
          writeFileSync(join(dist, 'llms.txt'), texte, 'utf8');
        }
      }
    },
  };
}

/**
 * Repli SPA pour GitHub Pages : `404.html` copié d'`index.html`, marqué
 * `noindex`.
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
 * LA COPIE PORTE UN `noindex` (29/09/2026) : `/<app>/404.html` demandé tel
 * quel répond 200, avec la canonique de l'accueil — un doublon, et deux apps
 * y affichaient même `index, follow`. `withNoindex` pose la balise, retire
 * celles écrites à la main et la canonique. Pour le visiteur, rien ne change.
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
 * si le fichier manque, avec le même `noindex` : les apps déployées par lui
 * sont couvertes sans changer une ligne. Ce plugin sert au reste — `vite
 * preview`, un autre hébergeur, un déploiement écrit à la main.
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
      const dist = resolve(process.cwd(), resolvedOutDir);
      const source = join(dist, from);
      if (!existsSync(source)) {
        // Pas de coquille, pas de repli — et pas d'échec de build pour ça :
        // le défaut est déjà visible dans le déploiement, pas ici.
        console.warn(
          `[spa-fallback] ${from} introuvable dans ${resolvedOutDir} : ${to} non écrit.`
        );
        return;
      }
      writeFileSync(
        join(dist, to),
        withNoindex(readFileSync(source, 'utf8')),
        'utf8'
      );
    },
  };
}
