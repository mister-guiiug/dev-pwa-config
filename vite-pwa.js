/**
 * Options `VitePWA()` partagées — la couche PWA que le paquet n'avait pas.
 *
 * POURQUOI. `vite-pwa-base` ne contient rien de PWA : c'est du SEO et de
 * l'analytics. La configuration du service worker, elle, était recopiée dans
 * seize dépôts, et le relevé du 23/08/2026 montre le résultat :
 *
 *   registerType   10 apps en 'prompt', 4 en 'autoUpdate', 2 sans
 *   runtimeCaching 5 apps sur 16 en déclarent un
 *   manifest       3 apps sans `display` ni `theme_color`
 *   mise à jour    15 apps sur 16 recâblent `virtual:pwa-register` à la main,
 *                  alors que `react/use-update-prompt` existe (1 adoptant)
 *
 * Rien de tout cela n'est un choix : c'est de la dérive. Ce module donne une
 * base, que chaque app affine.
 *
 * N'IMPORTE PAS `vite-plugin-pwa` : renvoie un objet d'options ordinaire, que
 * l'app passe à son propre `VitePWA()`. Le paquet ne s'ajoute pas de dépendance
 * pour ça, et reste utilisable même si l'app pilote une autre version.
 *
 * Usage (vite.config.ts) :
 *   import { pwaBaseOptions } from '@mister-guiiug/dev-pwa-config/vite-pwa';
 *
 *   VitePWA(
 *     pwaBaseOptions({
 *       id: 'miss-uwh',
 *       name: 'Miss UWH — Bilan comptable',
 *       shortName: 'Miss UWH',
 *       description: 'Bilan comptable saisonnier d’un club de hockey subaquatique.',
 *       categories: ['finance', 'productivity', 'sports'],
 *       shortcuts: [{ name: 'Journal', url: '#/finances/journal' }],
 *     })
 *   );
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { themeById } from './themes.js';
import { VERSION_MANIFEST } from './version.js';

/**
 * Les deux couleurs du manifeste, lues dans une feuille de style.
 *
 * `pwaBaseOptions` ne trouvait `theme_color` que pour une app INSCRITE au
 * catalogue ; une app neuve en sortait sans, et `vite-plugin-pwa` avertissait
 * qu'elle « ne pourra pas être installée » — dans le bruit du build. Or la
 * palette est déjà écrite : `src/index.css` peint `--dwc-primary` et
 * `--dwc-bg` (le squelette, et toute app qui suit son `index.css`). On la lit
 * là, avant de déclarer forfait.
 *
 * @param {string | null | undefined} css
 * @returns {{ primary?: string, bg?: string } | null}
 */
export function paletteFromCss(css) {
  if (!css) return null;
  const primary = declarationDe(css, '--dwc-primary');
  const bg = declarationDe(css, '--dwc-bg');
  return primary || bg ? { primary, bg } : null;
}

/**
 * La valeur d'une custom property, à sa première déclaration — sans
 * expression régulière : une feuille de style est une entrée qu'on ne
 * contrôle pas, et `\s*:\s*[^;]+` s'y emballe (CodeQL, `polynomial-redos`).
 */
function declarationDe(css, nom) {
  const debut = css.indexOf(nom);
  if (debut === -1) return undefined;
  const fin = css.indexOf(';', debut);
  const declaration = fin === -1 ? css.slice(debut) : css.slice(debut, fin);
  const deuxPoints = declaration.indexOf(':');
  if (deuxPoints === -1) return undefined;
  const valeur = declaration.slice(deuxPoints + 1).trim();
  return valeur || undefined;
}

const readIfExists = path => {
  try {
    return existsSync(path) ? readFileSync(path, 'utf8') : null;
  } catch {
    return null;
  }
};

/**
 * Largeur et hauteur d'un PNG, lues dans son en-tête IHDR — sans décoder
 * l'image, sans dépendance. `null` si ce n'est pas un PNG.
 *
 * @param {Buffer} buffer
 * @returns {{ width: number, height: number } | null}
 */
export function pngDimensions(buffer) {
  if (!buffer || buffer.length < 24) return null;
  if (buffer.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') return null;
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

/**
 * Les captures du manifeste, trouvées sur le disque.
 *
 * `pwa-screenshots` écrit `narrow.png` et `wide.png` dans `public/screenshots`
 * ; ce lecteur en fait les deux entrées `screenshots` que Chrome exige pour
 * ouvrir une fiche d'installation au lieu d'une ligne et d'un bouton. Les
 * tailles sont LUES dans les fichiers : un manifeste qui annonce une taille
 * fausse est ignoré en silence.
 *
 * @param {string} [dir='public/screenshots']
 * @param {{ publicDir?: string }} [options]
 * @returns {Array<{ src: string, sizes: string, type: 'image/png',
 *   form_factor: 'narrow' | 'wide', label: string }>}
 */
export function manifestScreenshots(
  dir = 'public/screenshots',
  { publicDir = 'public' } = {}
) {
  const entries = [];
  for (const [name, label] of [
    ['narrow', 'L’application, sur téléphone'],
    ['wide', 'L’application, sur ordinateur'],
  ]) {
    const file = join(dir, `${name}.png`);
    if (!existsSync(file)) continue;
    const dim = pngDimensions(readFileSync(file));
    if (!dim) continue;
    entries.push({
      src: relative(publicDir, file).split(sep).join('/'),
      sizes: `${dim.width}x${dim.height}`,
      type: 'image/png',
      form_factor: name,
      label,
    });
  }
  return entries;
}

/** Tailles par défaut, alignées sur ce que produit `npx pwa-icons`. */
const DEFAULT_ICONS = [
  {
    src: 'icons/icon-192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: 'icons/icon-512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: 'icons/icon-maskable.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'maskable',
  },
];

/**
 * Chemin de base normalisé : toujours `/…/`, ou `/`.
 *
 * Le rognage se fait par index, pas par `replace(/^\/+|\/+$/g, '')` : cette
 * alternative ancrée aux deux bouts fait reculer le moteur d'expressions
 * régulières sur une chaîne pleine de barres obliques (signalé par CodeQL —
 * « polynomial regular expression used on uncontrolled data »). Ici l'entrée
 * vient d'une configuration, donc le risque est théorique ; deux boucles
 * linéaires le retirent quand même, et se lisent aussi bien.
 */
export function normalizeBasePath(basePath) {
  if (!basePath || basePath === '/') return '/';
  const value = String(basePath);
  let start = 0;
  let end = value.length;
  while (start < end && value[start] === '/') start += 1;
  while (end > start && value[end - 1] === '/') end -= 1;
  const trimmed = value.slice(start, end);
  return trimmed ? `/${trimmed}/` : '/';
}

/**
 * Manifest par défaut. `theme_color` et `background_color` sont LUS dans
 * `themes.js` quand l'app y figure, au lieu d'être recopiés : cinq manifests
 * sur treize avaient divergé du relevé, sans qu'on puisse distinguer le choix
 * délibéré de l'oubli.
 *
 * @param {import('./vite-pwa.js').PwaOptions} options
 */
export function pwaManifest(options = {}) {
  const {
    id,
    name,
    shortName,
    description,
    basePath,
    themeColor,
    backgroundColor,
    lang = 'fr',
    dir = 'ltr',
    display = 'standalone',
    orientation = 'portrait',
    categories = [],
    shortcuts = [],
    icons = DEFAULT_ICONS,
    manifest: overrides = {},
  } = options;

  const base = normalizeBasePath(basePath ?? (id ? `/${id}/` : '/'));
  const theme = id ? themeById(id) : undefined;
  const palette = theme?.light ?? theme?.dark;
  // Troisième source, après l'explicite et le catalogue : la feuille de style
  // de l'app. Lue seulement s'il manque quelque chose — jamais pour rien.
  const cssPalette =
    (themeColor ?? palette?.primary) && (backgroundColor ?? palette?.bg)
      ? null
      : paletteFromCss(
          options.css ?? readIfExists(options.cssPath ?? 'src/index.css')
        );
  const theme_color = themeColor ?? palette?.primary ?? cssPalette?.primary;
  if (!theme_color) {
    console.warn(
      `[vite-pwa] theme_color introuvable pour « ${id ?? name ?? 'cette app'} » : passer themeColor et backgroundColor, inscrire l'app au catalogue (themes.js), ou peindre --dwc-primary et --dwc-bg dans src/index.css. Sans lui, l'application ne s'installe pas.`
    );
  }
  // Les captures trouvées sur le disque : `pwa-screenshots` les écrit, le
  // manifeste les déclare. `screenshots: false` pour s'en passer.
  const shots =
    options.screenshots === false
      ? []
      : manifestScreenshots(options.screenshotsDir ?? 'public/screenshots');

  return {
    id: base,
    name: name ?? shortName ?? id,
    short_name: shortName ?? name ?? id,
    description,
    theme_color,
    background_color: backgroundColor ?? palette?.bg ?? cssPalette?.bg,
    ...(shots.length ? { screenshots: shots } : {}),
    display,
    orientation,
    scope: base,
    start_url: base,
    lang,
    dir,
    categories,
    // Les raccourcis sont donnés en URL relative à l'app ; le préfixe est posé
    // ici, une bonne fois, plutôt que recopié dans chaque entrée.
    shortcuts: shortcuts.map(shortcut => ({
      ...shortcut,
      short_name: shortcut.short_name ?? shortcut.name,
      url: shortcut.url?.startsWith('/')
        ? shortcut.url
        : `${base}${String(shortcut.url ?? '').replace(/^\.?\//, '')}`,
    })),
    icons,
    ...overrides,
  };
}

/**
 * Options Workbox par défaut.
 *
 * AUCUNE MISE EN CACHE D'API PAR DÉFAUT. C'est délibéré : mettre en cache des
 * réponses authentifiées, c'est risquer qu'un utilisateur voie les données du
 * précédent sur un appareil partagé. Les origines à mettre en cache sont donc
 * une décision explicite (`apiOrigins`), pas un réglage hérité.
 *
 * @param {import('./vite-pwa.js').PwaOptions} options
 */
export function pwaWorkbox(options = {}) {
  const {
    basePath,
    id,
    apiOrigins = [],
    runtimeCaching = [],
    workbox: overrides = {},
  } = options;
  const base = normalizeBasePath(basePath ?? (id ? `/${id}/` : '/'));

  const imageRule = {
    urlPattern: /\.(?:png|jpg|jpeg|svg|webp|avif|gif)$/i,
    handler: 'CacheFirst',
    options: {
      cacheName: 'dwc-images',
      expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 30 },
      cacheableResponse: { statuses: [0, 200] },
    },
  };

  const apiRules = apiOrigins.map((origin, index) => ({
    urlPattern:
      origin instanceof RegExp
        ? origin
        : new RegExp(`^${escapeRegExp(origin)}`),
    // `NetworkFirst` et non `CacheFirst` : une donnée périmée servie en ligne
    // est un bug fonctionnel, pas une optimisation.
    handler: 'NetworkFirst',
    options: {
      cacheName: `dwc-api-${index}`,
      networkTimeoutSeconds: 5,
      expiration: { maxEntries: 60, maxAgeSeconds: 60 * 5 },
      cacheableResponse: { statuses: [0, 200] },
    },
  }));

  return {
    globPatterns: ['**/*.{js,css,html,ico,svg,png,webp,woff2,webmanifest}'],
    // `version.json` DOIT rester hors du précache. Il est là pour dire ce qui
    // est en ligne : précaché, il rendrait éternellement la version du build
    // qui l'a précaché — c'est-à-dire l'inverse de ce qu'on lui demande. La
    // valeur par défaut de workbox (`node_modules`) est reconduite, la
    // remplacer la ferait tomber.
    globIgnores: ['**/node_modules/**/*', `**/${VERSION_MANIFEST}`],
    navigateFallback: `${base}index.html`,
    cleanupOutdatedCaches: true,
    maximumFileSizeToCacheInBytes: 4_000_000,
    runtimeCaching: [imageRule, ...apiRules, ...runtimeCaching],
    ...overrides,
  };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Options complètes à passer à `VitePWA()`.
 *
 * `registerType` vaut `'prompt'` par défaut, pour deux raisons : c'est ce que
 * dix apps sur seize font déjà, et c'est le seul mode compatible avec
 * `react/use-update-prompt` + `UpdatePromptBanner`, que le paquet livre. En
 * `'autoUpdate'`, l'app se recharge sous les doigts de l'utilisateur — parfois
 * au milieu d'une saisie.
 *
 * @param {import('./vite-pwa.js').PwaOptions} options
 */
export function pwaBaseOptions(options = {}) {
  const {
    registerType = 'prompt',
    includeAssets,
    icons = DEFAULT_ICONS,
  } = options;
  return {
    registerType,
    includeAssets: includeAssets ?? icons.map(icon => icon.src),
    manifest: pwaManifest(options),
    workbox: pwaWorkbox(options),
  };
}
