#!/usr/bin/env node
/**
 * pwa-og-image — l'image de partage d'une app, 1200×630, dans
 * `public/og-image.jpg`.
 *
 *   npx pwa-og-image                        # tout est lu dans l'app
 *   npx pwa-og-image --tagline "Le score du Mölkky, sur tous les téléphones"
 *   npx pwa-og-image --no-screenshot --color "#0f766e"
 *
 * POURQUOI. Relevé du 25/09/2026 : les vingt apps annonçaient en `og:image`
 * leur icône carrée de 512 px, dix-neuf avec `twitter:card` à `summary`. Un
 * lien partagé sur WhatsApp, LinkedIn, Slack ou X sortait en timbre-poste, à
 * côté d'un titre. Le format que ces services affichent en grand est un
 * rectangle 1,91:1 — 1200×630.
 *
 * CE QUE LE BIN DESSINE : le fond à la couleur du thème, l'icône, le nom de
 * l'app et son accroche, l'adresse, et — si l'app a ses captures de manifeste
 * (`pwa-screenshots`) — la capture `narrow` dans un cadre de téléphone. Rien
 * d'inventé : chaque élément est lu dans l'app.
 *
 *   - nom : le catalogue du socle, sinon le `<title>` avant le tiret ;
 *   - accroche : le `<title>` après le tiret, sinon la description du
 *     catalogue, sinon la meta description ;
 *   - couleur : le `theme-color` clair de `dist/index.html` (celui que pose
 *     `pwaSeoPlugin({ themeColor })`), sinon de `index.html`, sinon le
 *     manifeste construit ;
 *   - icône : le plus grand PNG d'icône du dossier public (hors `maskable`),
 *     sinon un SVG.
 *
 * ENSUITE, RIEN À DÉCLARER : `pwaSeoPlugin` trouve `public/og-image.jpg` et
 * pose `og:image` (avec largeur, hauteur, empreinte), `twitter:card` en
 * `summary_large_image` et `twitter:image`, sur l'accueil et sur les pages de
 * contenu.
 *
 * JPEG ET PAS PNG : les `globPatterns` du précache ne ramassent pas le
 * `.jpg`. L'image ne sert qu'aux robots et aux aperçus de liens ; aucun
 * visiteur n'a à la télécharger avec l'app.
 *
 * PRÉREQUIS : `@playwright/test`, `playwright` ou `playwright-core` (peers
 * OPTIONNELLES), et Chromium installé (`npx playwright install chromium`).
 * Lancer après `npm run build` pour lire la couleur telle qu'elle est servie.
 */
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, extname, join, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { FAMILY_APPS, FAMILY_ORIGIN } from '../apps-catalog.js';
import { imageDimensions, textOn } from '../vite-pwa-base.js';
import { estPointDEntree } from './entree.mjs';

export const TAILLE = { width: 1200, height: 630 };

const AIDE = `pwa-og-image — l'image de partage 1200×630 de l'app (public/og-image.jpg)

  --dir <dossier>        l'app (défaut : dossier courant)
  --out <fichier>        défaut public/og-image.jpg
  --name <texte>         nom affiché (défaut : catalogue, sinon <title>)
  --tagline <texte>      accroche (défaut : <title> après le tiret, sinon description)
  --color <#rrggbb>      couleur du fond (défaut : theme-color)
  --icon <fichier>       icône (défaut : le plus grand PNG d'icône du dossier public)
  --screenshot <fichier> capture dans le cadre de téléphone (défaut : public/screenshots/narrow.png)
  --no-screenshot        sans capture
  --help                 cette aide`;

/**
 * Les options de la ligne de commande. Pure.
 *
 * @param {string[]} argv
 */
export function parseArgs(argv = []) {
  const valeur = drapeau => {
    const i = argv.indexOf(drapeau);
    return i >= 0 && i + 1 < argv.length ? argv[i + 1] : undefined;
  };
  return {
    aide: argv.includes('--help') || argv.includes('-h'),
    dir: valeur('--dir'),
    out: valeur('--out'),
    name: valeur('--name'),
    tagline: valeur('--tagline'),
    color: valeur('--color'),
    icon: valeur('--icon'),
    screenshot: argv.includes('--no-screenshot')
      ? false
      : valeur('--screenshot'),
  };
}

const ENTITES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
};
const decoder = t =>
  t.replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, e) => ENTITES[e]);
const echapper = t =>
  String(t)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

function attribut(balise, nom) {
  const m = new RegExp(`\\b${nom}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(
    balise
  );
  return m ? decoder(m[2] ?? m[3] ?? '') : '';
}

/** Le `<title>`, par deux `indexOf` (pas de motif quadratique). */
function titreDe(html) {
  const bas = html.toLowerCase();
  const debut = bas.indexOf('<title>');
  const fin = debut < 0 ? -1 : bas.indexOf('</title>', debut + 7);
  return fin < 0 ? '' : decoder(html.slice(debut + 7, fin).trim());
}

function metaDe(html, cle) {
  for (const [balise] of html.matchAll(/<meta\b[^>]*>/gi))
    if (
      attribut(balise, 'name') === cle ||
      attribut(balise, 'property') === cle
    )
      return attribut(balise, 'content').trim();
  return '';
}

/** Le `theme-color` clair d'une page, ou `''`. */
export function themeColorDe(html) {
  const balises = [...html.matchAll(/<meta\b[^>]*>/gi)]
    .map(([b]) => b)
    .filter(b => attribut(b, 'name') === 'theme-color');
  const claire =
    balises.find(b => !/dark/i.test(attribut(b, 'media'))) ?? balises[0];
  const c = claire ? attribut(claire, 'content').trim() : '';
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(c) ? c : '';
}

/** Coupe un texte à `max` caractères, sur un mot, avec une ellipse. */
export function couper(texte, max = 110) {
  const t = String(texte ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length <= max) return t;
  const coupe = t.slice(0, max);
  return `${coupe.slice(0, Math.max(coupe.lastIndexOf(' '), max - 20)).replace(/[\s,;:.]+$/, '')}…`;
}

/** Tous les fichiers d'un dossier, récursivement (hors dossiers cachés). */
function fichiers(dossier) {
  if (!existsSync(dossier)) return [];
  return readdirSync(dossier, { withFileTypes: true }).flatMap(e => {
    if (e.name.startsWith('.')) return [];
    const chemin = join(dossier, e.name);
    return e.isDirectory() ? fichiers(chemin) : [chemin];
  });
}

/**
 * L'icône la plus nette du dossier public : le plus grand PNG dont le nom dit
 * « icon », « pwa », « logo » ou « apple-touch », hors `maskable` (sa marge de
 * sécurité la rapetisse) ; à défaut, un SVG du même genre.
 */
export function meilleureIcone(publicDir) {
  const candidats = fichiers(publicDir).filter(f =>
    /(icon|pwa|logo|apple-touch|favicon)/i.test(basename(f))
  );
  const pngs = candidats
    .filter(
      f =>
        /\.png$/i.test(f) &&
        !/maskable/i.test(f) &&
        !/screenshots?[\\/]/i.test(f)
    )
    .map(f => ({ f, d: imageDimensions(readFileSync(f)) }))
    .filter(x => x.d && x.d.width === x.d.height)
    .sort((a, b) => b.d.width - a.d.width);
  if (pngs.length && pngs[0].d.width >= 192) return pngs[0].f;
  return (
    candidats.find(
      f => /\.svg$/i.test(f) && /(icon|logo)/i.test(basename(f))
    ) ??
    candidats.find(f => /\.svg$/i.test(f)) ??
    pngs[0]?.f ??
    null
  );
}

/**
 * La capture de téléphone : l'image en HAUTEUR du dossier des captures. Le
 * parc la nomme de trois façons (`narrow.png` pour `pwa-screenshots`,
 * `mobile.png`, `etroit.png`) ; c'est le format qui décide, le nom départage.
 */
export function captureEnHauteur(dossier) {
  if (!existsSync(dossier)) return null;
  const portraits = readdirSync(dossier)
    .filter(f => /\.png$/i.test(f))
    .map(f => join(dossier, f))
    .filter(f => {
      const d = imageDimensions(readFileSync(f));
      return d && d.height > d.width;
    })
    .sort(
      (a, b) =>
        Number(!/(narrow|mobile|etroit)/i.test(basename(a))) -
        Number(!/(narrow|mobile|etroit)/i.test(basename(b)))
    );
  return portraits[0] ?? null;
}

const MIME = {
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};
const dataUrl = f =>
  `data:${MIME[extname(f).toLowerCase()] ?? 'application/octet-stream'};base64,${readFileSync(f).toString('base64')}`;

/**
 * Ce que la carte montrera, lu dans l'app. Rend aussi `manque` : ce qui n'a pas
 * pu être trouvé, pour le dire plutôt que d'inventer.
 *
 * @param {string} dir
 * @param {ReturnType<typeof parseArgs>} args
 */
export function lireApp(dir, args = {}) {
  const lire = f =>
    existsSync(join(dir, f)) ? readFileSync(join(dir, f), 'utf8') : '';
  const source = lire('index.html');
  const construit = lire('dist/index.html');
  const pkg = (() => {
    try {
      return JSON.parse(lire('package.json') || '{}');
    } catch {
      return {};
    }
  })();
  const id =
    String(pkg.name ?? '').replace(/^@[^/]+\//, '') || basename(resolve(dir));
  const fiche = FAMILY_APPS.find(a => a.id === id && a.platform === 'web');
  const titre = titreDe(construit || source);
  const [avant, ...apres] = titre.split(/\s+[—–-]\s+/);
  const manifeste = (() => {
    try {
      return JSON.parse(lire('dist/manifest.webmanifest') || '{}');
    } catch {
      return {};
    }
  })();
  const publicDir = join(dir, 'public');
  const icone = args.icon ? resolve(dir, args.icon) : meilleureIcone(publicDir);
  const capture =
    args.screenshot === false
      ? null
      : args.screenshot
        ? resolve(dir, args.screenshot)
        : captureEnHauteur(join(publicDir, 'screenshots'));
  const couleur =
    args.color ||
    themeColorDe(construit) ||
    themeColorDe(source) ||
    (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(manifeste.theme_color ?? '')
      ? manifeste.theme_color
      : '') ||
    fiche?.themeColor ||
    '';
  const nom = args.name || fiche?.name || avant || id;
  const brute = couper(
    args.tagline ||
      (apres.length ? apres.join(' - ') : '') ||
      fiche?.description ||
      metaDe(construit || source, 'description')
  );
  // « Mister Mölkky — compteur de points » : la suite du titre commence en
  // minuscule ; seule sur sa ligne, elle prend une capitale.
  const accroche = brute.charAt(0).toLocaleUpperCase('fr') + brute.slice(1);
  const adresse = (fiche?.appUrl ?? `${FAMILY_ORIGIN}/${id}/`)
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
  const manque = [
    ...(icone && existsSync(icone) ? [] : ['icône']),
    ...(couleur ? [] : ['couleur du thème']),
    ...(accroche ? [] : ['accroche']),
  ];
  return {
    id,
    nom,
    accroche,
    couleur: couleur || '#1f6feb',
    icone,
    capture,
    adresse,
    manque,
  };
}

/** `#rgb` → `#rrggbb`. */
const long = hex =>
  hex.length === 4 ? `#${[...hex.slice(1)].map(c => c + c).join('')}` : hex;

/** Assombrit une couleur `#rrggbb` d'un facteur (0 à 1). */
export function assombrir(hex, facteur = 0.35) {
  const h = long(hex).slice(1);
  const c = [0, 2, 4].map(i =>
    Math.round(parseInt(h.slice(i, i + 2), 16) * (1 - facteur))
  );
  return `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Le HTML de la carte, 1200×630, images en `data:`. Pure : testable sans
 * navigateur.
 *
 * @param {{ nom: string, accroche: string, couleur: string, adresse: string, icone?: string | null, capture?: string | null }} carte
 *   `icone` et `capture` sont des URL (`data:` en pratique).
 */
export function ogCardHtml(carte) {
  const fond = long(carte.couleur);
  const texte = textOn(fond);
  const doux =
    texte === '#ffffff' ? 'rgba(255,255,255,.82)' : 'rgba(17,17,17,.75)';
  const largeurTexte = carte.capture ? 700 : 1040;
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
html,body{width:${TAILLE.width}px;height:${TAILLE.height}px;overflow:hidden}
body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;background:linear-gradient(135deg,${fond} 0%,${assombrir(fond, 0.28)} 100%);color:${texte};position:relative}
.texte{position:absolute;left:80px;top:0;bottom:0;width:${largeurTexte}px;display:flex;flex-direction:column;justify-content:center;gap:28px}
.icone{width:128px;height:128px;border-radius:28px;background:#fff;box-shadow:0 10px 30px rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;overflow:hidden}
.icone img{width:100%;height:100%;object-fit:contain}
h1{font-size:${carte.nom.length > 16 ? 64 : 76}px;line-height:1.05;font-weight:800;letter-spacing:-.02em}
p{font-size:34px;line-height:1.3;color:${doux};font-weight:500}
.adresse{position:absolute;left:80px;bottom:48px;font-size:24px;color:${doux};font-weight:600;letter-spacing:.01em}
.tel{position:absolute;right:86px;top:50px;width:246px;height:530px;border-radius:38px;background:#111;padding:10px;box-shadow:0 24px 60px rgba(0,0,0,.35)}
.tel img{width:100%;height:100%;object-fit:cover;object-position:top;border-radius:29px;display:block}
</style></head><body>
<div class="texte">
${carte.icone ? `<div class="icone"><img src="${carte.icone}" alt=""></div>` : ''}
<h1>${echapper(carte.nom)}</h1>
${carte.accroche ? `<p>${echapper(carte.accroche)}</p>` : ''}
</div>
<div class="adresse">${echapper(carte.adresse)}</div>
${carte.capture ? `<div class="tel"><img src="${carte.capture}" alt=""></div>` : ''}
</body></html>`;
}

/**
 * Le Chromium de Playwright : celui de l'APP d'abord (c'est elle qui l'a
 * installé pour ses e2e), puis celui que voit ce paquet.
 */
async function chromiumDe(dir) {
  const require = createRequire(join(dir, 'package.json'));
  for (const paquet of ['@playwright/test', 'playwright', 'playwright-core']) {
    for (const charger of [
      () => import(pathToFileURL(require.resolve(paquet)).href),
      () => import(paquet),
    ]) {
      try {
        const mod = await charger();
        const chromium = mod.chromium ?? mod.default?.chromium;
        if (chromium) return chromium;
      } catch {
        /* suivant */
      }
    }
  }
  return null;
}

export async function run(argv = [], cwd = process.cwd()) {
  const args = parseArgs(argv);
  if (args.aide) {
    console.log(AIDE);
    return 0;
  }
  const dir = resolve(cwd, args.dir ?? '.');
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    console.error(`pwa-og-image : dossier introuvable : ${dir}`);
    return 2;
  }
  const app = lireApp(dir, args);
  if (app.manque.length)
    console.warn(
      `pwa-og-image : introuvable, repli utilisé : ${app.manque.join(', ')}`
    );
  const chromium = await chromiumDe(dir);
  if (!chromium) {
    console.error(
      'pwa-og-image : aucun Playwright trouvé. `npm i -D @playwright/test && npx playwright install chromium`.'
    );
    return 2;
  }
  const html = ogCardHtml({
    ...app,
    icone: app.icone && existsSync(app.icone) ? dataUrl(app.icone) : null,
    capture:
      app.capture && existsSync(app.capture) ? dataUrl(app.capture) : null,
  });
  const sortie = resolve(dir, args.out ?? 'public/og-image.jpg');
  mkdirSync(dirname(sortie), { recursive: true });
  const navigateur = await chromium.launch();
  try {
    const page = await navigateur.newPage({
      viewport: TAILLE,
      deviceScaleFactor: 1,
    });
    await page.setContent(html, { waitUntil: 'load' });
    const octets = await page.screenshot({
      type: /\.png$/i.test(sortie) ? 'png' : 'jpeg',
      ...(/\.png$/i.test(sortie) ? {} : { quality: 88 }),
    });
    writeFileSync(sortie, octets);
    console.log(
      `pwa-og-image : ${sortie} — ${TAILLE.width}×${TAILLE.height}, ${Math.round(octets.length / 1024)} Kio · ` +
        `« ${app.nom} », ${app.couleur}${app.capture ? ', avec capture' : ''}`
    );
  } finally {
    await navigateur.close();
  }
  return 0;
}

if (estPointDEntree(import.meta.url)) {
  run(process.argv.slice(2)).then(code => {
    process.exitCode = code;
  });
}
