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
 *   import { pwaBaseOptions } from '@mister-guiiug/dev-wpa-config/vite-pwa';
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
import { themeById } from './themes.js';
import { VERSION_MANIFEST } from './version.js';

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

  return {
    id: base,
    name: name ?? shortName ?? id,
    short_name: shortName ?? name ?? id,
    description,
    theme_color: themeColor ?? palette?.primary,
    background_color: backgroundColor ?? palette?.bg,
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
