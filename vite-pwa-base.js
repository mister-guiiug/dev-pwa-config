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

import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
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
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const TEXTES_SERVIS = {
  fr: {
    famille: `Les autres applications de ${GITHUB_OWNER}`,
    noscript: 'Cette application a besoin de JavaScript pour fonctionner.',
  },
  en: {
    famille: `More apps by ${GITHUB_OWNER}`,
    noscript: 'This app needs JavaScript to run.',
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
 */
export const SERVED_CONTENT_STYLE =
  '<style data-dwc="served-content-style">' +
  '[data-dwc=served-content]{box-sizing:border-box;max-width:36rem;margin:0 auto;' +
  "padding:18vh 1.25rem 2rem;text-align:center;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;line-height:1.5}" +
  '[data-dwc=served-content] h1{font-size:1.5rem;line-height:1.25;margin:0 0 .75rem;font-weight:700}' +
  '[data-dwc=served-content] p{margin:0 0 .75rem;opacity:.8}' +
  '[data-dwc=served-content] a{color:inherit;text-decoration:underline}' +
  '[data-dwc=served-content] ul{list-style:none;padding:0;margin:0 0 .75rem}' +
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
 * qui ne rend pas le JavaScript les voit.
 *
 * @param {string} html
 * @param {{ pages?: Array<{ href: string, titre: string }> }} [opts]
 * @returns {{ html: string, injecte: boolean, raison?: string, montage?: string }}
 */
export function injectServedContent(html, opts = {}) {
  const { pages = [] } = opts;
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

  const lang = attribut(/<html\b[^>]*>/i.exec(html)?.[0] ?? '', 'lang');
  const t = /^en\b/i.test(lang) ? TEXTES_SERVIS.en : TEXTES_SERVIS.fr;
  const bloc =
    `<div id="${echapperXml(m[1])}"><div data-dwc="served-content">` +
    `<h1>${echapperXml(titre)}</h1>` +
    `<p>${echapperXml(description)}</p>` +
    (pages.length
      ? `<ul>${pages
          .map(
            p =>
              `<li><a href="${echapperXml(p.href)}">${echapperXml(p.titre)}</a></li>`
          )
          .join('')}</ul>`
      : '') +
    `<p><a href="${FAMILY_ORIGIN}/">${echapperXml(t.famille)}</a></p>` +
    `<noscript><p>${echapperXml(t.noscript)}</p></noscript>` +
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
 */
export const CONTENT_PAGES_DIR = 'content/pages';

const SLUG_VALIDE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** Les slugs qui écraseraient un fichier de l'app. */
const SLUGS_RESERVES = new Set(['index', '404', 'sw', 'offline']);
const TITRES_FAQ =
  /^(?:questions fréquentes|foire aux questions|faq|frequently asked questions)$/i;
const LIEN_SUR =
  /^(?:https?:\/\/[^\s"'<>]+|mailto:[^\s"'<>]+|[a-z0-9-]+\.html(?:#[a-z0-9-]+)?|#[a-z0-9-]+)$/i;

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
 * Le Markdown court des pages de contenu, en HTML. Les `h2`/`h3` reçoivent une
 * ancre, pour qu'on puisse partager une section.
 *
 * @param {string} md
 * @returns {string}
 */
export function renderMarkdown(md) {
  const html = [];
  const ancres = new Set();
  let paragraphe = [];
  let liste = null;
  const fermerParagraphe = () => {
    if (paragraphe.length) html.push(`<p>${enLigne(paragraphe.join(' '))}</p>`);
    paragraphe = [];
  };
  const fermerListe = () => {
    if (liste)
      html.push(
        `<${liste.type}>${liste.items
          .map(item => `<li>${enLigne(item)}</li>`)
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

/**
 * Lit une page de contenu : en-tête `title` / `description` (et `slug`,
 * `date` facultatifs), un seul `# titre`. Refuse, avec un message qui nomme le
 * fichier, tout ce qui produirait une page fausse.
 *
 * @param {string} texte
 * @param {string} [fichier]
 */
export function parseContentPage(texte, fichier = 'page.md') {
  const source = String(texte)
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n');
  const entete = /^---\n([\s\S]*?)\n---\n/.exec(source);
  if (!entete)
    throw new Error(
      `[pwa-seo] ${fichier} : en-tête manquant (--- title: … / description: … ---)`
    );
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
  const h1 = markdown.split('\n').filter(l => /^#\s+/.test(l.trim()));
  if (h1.length !== 1)
    throw new Error(
      `[pwa-seo] ${fichier} : un seul titre « # … » attendu, ${h1.length} trouvé(s)`
    );
  const texteSeul = markdown
    .split('\n')
    .map(l => texteBrut(l.replace(/^(?:#{1,3}|[-*]|\d+[.)])\s+/, '')))
    .join(' ');
  return {
    slug,
    title: meta.title,
    description: meta.description,
    ...(meta.date ? { date: meta.date } : {}),
    titre: texteBrut(h1[0].trim().replace(/^#\s+/, '')),
    markdown,
    html: renderMarkdown(markdown),
    faq: faqFromMarkdown(markdown),
    mots: texteSeul.split(/\s+/).filter(Boolean).length,
  };
}

/**
 * Les pages de contenu d'un dossier, triées par slug. `[]` sans dossier. Les
 * fichiers qui commencent par `_` et les `README.md` sont ignorés.
 *
 * @param {string} dossier
 */
export function readContentPages(dossier) {
  if (!dossier || !existsSync(dossier)) return [];
  const pages = readdirSync(dossier)
    .filter(
      f => /\.md$/i.test(f) && !f.startsWith('_') && !/^readme\.md$/i.test(f)
    )
    .sort()
    .map(f => parseContentPage(readFileSync(join(dossier, f), 'utf8'), f));
  const vus = new Set();
  for (const p of pages) {
    if (vus.has(p.slug))
      throw new Error(`[pwa-seo] deux pages portent le slug « ${p.slug} »`);
    vus.add(p.slug);
  }
  return pages;
}

const TEXTES_PAGE = {
  fr: {
    ouvrir: nom => `Ouvrir ${nom}`,
    fil: 'Fil d’Ariane',
    parc: 'Les applications',
    aLire: 'À lire aussi',
    famille: `Les autres applications de ${GITHUB_OWNER}`,
  },
  en: {
    ouvrir: nom => `Open ${nom}`,
    fil: 'Breadcrumb',
    parc: 'Apps',
    aLire: 'Read also',
    famille: `More apps by ${GITHUB_OWNER}`,
  },
};

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
 * Le document HTML d'une page de contenu, autonome : il ne charge ni script ni
 * feuille, et porte sa propre CSP. Ce qu'il sait de l'app, il le lit dans
 * l'`index.html` CONSTRUIT : langue, couleur du thème, icônes, image de
 * partage, description de l'app.
 *
 * @param {{ page: ReturnType<typeof parseContentPage>, pages?: Array<ReturnType<typeof parseContentPage>>, indexHtml: string, homeUrl: string }} opts
 */
export function contentPageHtml({ page, pages = [], indexHtml, homeUrl }) {
  const lang =
    attribut(/<html\b[^>]*>/i.exec(indexHtml)?.[0] ?? '', 'lang') || 'fr';
  const t = /^en\b/i.test(lang) ? TEXTES_PAGE.en : TEXTES_PAGE.fr;
  const id = new URL(homeUrl).pathname.split('/').find(Boolean);
  const fiche = FAMILY_APPS.find(a => a.id === id && a.platform === 'web');
  const titreIndex = decoderEntites(contenuDuTitre(indexHtml).trim());
  const nomApp =
    fiche?.name ||
    metaDe(indexHtml, 'og:site_name') ||
    titreIndex.split(/\s+[—–-]\s+/)[0] ||
    id ||
    '';
  const descriptionApp = metaDe(indexHtml, 'description');
  const url = `${homeUrl}${page.slug}.html`;
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
    .map(b => b.replace(/\s*\/?>$/, ' />'));
  const iconeEntete =
    fiche?.iconUrl || icones.map(b => attribut(b, 'href')).find(Boolean) || '';
  const autres = pages.filter(p => p.slug !== page.slug);

  const donnees = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        '@id': url,
        headline: page.titre,
        name: page.title,
        description: page.description,
        url,
        mainEntityOfPage: url,
        inLanguage: lang,
        ...(page.date ? { dateModified: page.date } : {}),
        ...(imageEstUneImage ? { image } : {}),
        author: {
          '@type': 'Person',
          name: GITHUB_OWNER,
          url: `https://github.com/${GITHUB_OWNER}`,
        },
        about: { '@type': 'WebApplication', name: nomApp, url: homeUrl },
        isPartOf: {
          '@type': 'WebSite',
          name: `Les applications de ${GITHUB_OWNER}`,
          url: `${FAMILY_ORIGIN}/`,
        },
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
    ],
  };

  const e = echapperXml;
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
    ${accent ? `<meta name="theme-color" content="${e(accent)}" />\n    ` : ''}${icones.join('\n    ')}
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="${e(nomApp)}" />
    <meta property="og:locale" content="${e(lang.replace('-', '_'))}" />
    <meta property="og:title" content="${e(page.title)}" />
    <meta property="og:description" content="${e(page.description)}" />
    <meta property="og:url" content="${e(url)}" />
    ${
      imageEstUneImage
        ? [
            `<meta property="og:image" content="${e(image)}" />`,
            ...['type', 'width', 'height', 'alt']
              .map(k => [k, metaDe(indexHtml, `og:image:${k}`)])
              .filter(([, v]) => v)
              .map(
                ([k, v]) =>
                  `<meta property="og:image:${k}" content="${e(v)}" />`
              ),
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
${page.html}
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
      }
    </main>
    <footer>
      <p><a href="${FAMILY_ORIGIN}/">${e(t.famille)}</a></p>
    </footer>
  </body>
</html>
`;
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
 * @param {boolean} [opts.servedContent=true] Sert, au BUILD, le titre et la
 *   description de l'app dans son point de montage vide (voir
 *   `injectServedContent`). `false` le coupe.
 * @param {string | false} [opts.contentPages='content/pages'] Dossier des pages
 *   de contenu, relatif à la racine du projet (voir `contentPageHtml`). Chaque
 *   `<slug>.md` devient `<slug>.html` au build, entre au plan de site et au
 *   contenu servi. Un dossier absent ne produit rien ; `false` coupe.
 * @param {string | false} [opts.ogImage] Image de partage, relative au dossier
 *   public. Par défaut `og-image.jpg` ou `og-image.png` s'il existe (voir
 *   `findShareImage`) ; `false` coupe.
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
    servedContent = true,
    contentPages = CONTENT_PAGES_DIR,
    ogImage,
  } = opts;
  const urlOpts = { basePath, logoPath, iconQuery };
  // Résolus depuis la config Vite : on respecte un `build.outDir` personnalisé
  // et on ne génère les fichiers (sitemap/robots/llms) qu'en mode build.
  let resolvedOutDir = outDir;
  let isBuild = false;
  let racine = process.cwd();
  let publicDir = resolve(racine, 'public');
  /** Les pages de contenu, lues une fois par build. */
  let pagesLues = null;
  const pagesDeContenu = () => {
    if (contentPages === false) return [];
    pagesLues ??= readContentPages(resolve(racine, contentPages));
    return pagesLues;
  };
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
        if (donnees && out.includes('</head>')) {
          out = out.replace('</head>', `  ${jsonLdScript(donnees)}\n  </head>`);
        }
      }
      // Au BUILD seulement : le serveur de développement reste tel quel, et
      // c'est ce qui est DÉPLOYÉ que les robots lisent.
      if (servedContent !== false && isBuild) {
        out = injectServedContent(out, {
          pages: pagesDeContenu().map(p => ({
            href: `${homeUrl}${p.slug}.html`,
            titre: p.titre,
          })),
        }).html;
      }
      return out;
    },
    /**
     * Les pages de contenu, écrites à côté de l'`index.html` CONSTRUIT, dont
     * elles reprennent langue, couleur, icônes et image de partage.
     *
     * `writeBundle` et pas `closeBundle` : `vite-plugin-pwa` engendre le
     * service worker dans SON `closeBundle`, qui passe après tous les
     * `writeBundle`. Les pages sont donc sur le disque quand il dresse le
     * précache — toujours, quel que soit l'ordre des plugins.
     */
    writeBundle(options) {
      if (!isBuild) return;
      const pages = pagesDeContenu();
      if (!pages.length) return;
      const dist = options?.dir || resolve(process.cwd(), resolvedOutDir);
      const index = join(dist, 'index.html');
      if (!existsSync(index)) {
        console.warn(
          `[pwa-seo] index.html introuvable dans ${dist} : pages de contenu non écrites.`
        );
        return;
      }
      const indexHtml = readFileSync(index, 'utf8');
      const { homeUrl } = resolveSeoPublicUrls(urlOpts);
      for (const page of pages) {
        const cible = join(dist, `${page.slug}.html`);
        if (existsSync(cible))
          throw new Error(
            `[pwa-seo] ${page.slug}.html existe déjà dans ${dist} : choisir un autre slug.`
          );
        writeFileSync(
          cible,
          contentPageHtml({ page, pages, indexHtml, homeUrl }),
          'utf8'
        );
      }
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
          ...pagesDeContenu().map(p => `${homeUrl}${p.slug}.html`),
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
