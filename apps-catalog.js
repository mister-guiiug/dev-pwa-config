// Catalogue unique de la famille d'applications miss-*/mister-*.
//
// Données PURES (aucune dépendance React) : importable depuis les apps, les
// scripts ou les tests Node. Le composant de présentation est
// `@mister-guiiug/dev-pwa-config/react` → `FamilyApps`, et la vitrine du
// showroom (`showroom/apps.js`) en est un miroir généré.
//
// Trois axes décrivent chaque app, et ils n'ont PAS le même statut :
//   - `maturity` et `category` sont ÉDITORIAUX, saisis à la main. Ils reflètent
//     un choix, pas la version npm ni un champ du package.json ;
//   - `backend` est RELEVÉ dans le code des apps (section « Stack » du
//     showroom). Il est absent quand il n'a pas été relevé — mieux vaut un
//     filtre qui affiche « non relevé » qu'une donnée inventée ;
//   - `platform` distingue les PWA hébergées de l'application desktop.
//
// `category` et `backend` sont des identifiants ASCII stables : les libellés
// affichés vivent côté présentation, ce qui les rend traduisibles. Le `name` et
// la `description` restent en français, langue de référence de la famille.

export const GITHUB_OWNER = 'mister-guiiug';

/**
 * Pseudo Buy Me a Coffee de la famille — le même que `.github/FUNDING.yml`.
 *
 * Séparé de l'URL parce que ce sont deux choses : le PSEUDO est ce qu'une app
 * surcharge (`sponsorUrl('autre.pseudo')`, `<SponsorProvider handle="…">`),
 * l'URL est ce qu'on affiche. Écrits ensemble, ils divergeaient : le 04/09/2026
 * `AppFooter` avait sa propre copie de l'URL en dur, et ne suivait donc pas le
 * catalogue.
 */
export const SPONSOR_HANDLE = 'mister.guiiug';

/** URL de soutien Buy Me a Coffee, depuis un pseudo. */
export function sponsorUrl(handle = SPONSOR_HANDLE) {
  return `https://buymeacoffee.com/${handle}`;
}

/** Lien sponsor commun à toute la famille (Buy Me a Coffee). */
export const SPONSOR_URL = sponsorUrl();

/** Maturités éditoriales, de la plus jeune à la plus mûre. */
export const MATURITIES = ['alpha', 'beta', 'stable'];

/** Rang d'une maturité — sert au tri, pas à l'affichage. */
export const MATURITY_ORDER = { alpha: 0, beta: 1, stable: 2 };

/** Domaines d'usage (éditorial, une seule valeur par app). */
export const CATEGORIES = [
  'sante',
  'sport',
  'jeux',
  'loisirs',
  'education',
  'outils',
  'dev',
];

/**
 * Familles de persistance, relevées dans le code des apps :
 *   supabase  Postgres + RLS, Auth, Realtime, RPC, Storage, Edge Functions
 *   firebase  Realtime Database / Firestore, Auth, Storage, Cloud Functions
 *   local     `localStorage` / IndexedDB seuls — aucun compte, aucun serveur
 *   api       backend maison ou API tierce, sans base cliente
 */
export const BACKENDS = ['supabase', 'firebase', 'local', 'api'];

/** Plateformes de livraison. */
export const PLATFORMS = ['web', 'desktop'];

/**
 * Sous-chemins du paquet effectivement importés par chaque dépôt.
 *
 * RELEVÉ, pas éditorial : obtenu en cherchant `'@mister-guiiug/dev-pwa-config/…'`
 * entre guillemets dans le code source de chaque application — donc les imports
 * et les `extends` réels, pas les mentions en commentaire ni les copies
 * inlinées. Le tableau « Projets consommateurs » du README est engendré depuis
 * cette table : c'est la fin d'une liste tenue à la main en double, qui avait
 * déjà divergé sur la persistance de `miss-uwh`.
 *
 * Relevé du 31/08/2026 sur `main`, les dix-sept dépôts repris d'un coup. La
 * campagne du 26/08 n'avait porté que sur `mister-family-map` : les seize
 * autres entrées avaient TOUTES dérivé, et toujours par défaut — le relevé
 * oubliait des imports, il n'en inventait pas. Un seul retrait sur l'ensemble
 * (`react/use-update-prompt`, que `miss-supaboss` n'importe plus).
 *
 * Ce que la table dit d'utile au premier regard : `components.css` est repris
 * par quinze dépôts sur dix-sept — quatrième sous-chemin le plus adopté, juste
 * derrière `eslint-react`, `prettier` et `vitest-base` (seize chacun) —, alors
 * que `commitlint` plafonne à trois. Seize sous-chemins n'ont qu'un adoptant,
 * dont dix pour le seul `mister-family-map`.
 *
 * COMPLÉTÉ LE 05/09/2026 par `miss-supatool` et `mister-miss-koh`. Elles
 * consommaient le paquet depuis leur naissance sans figurer ici : elles
 * n'apparaissaient donc chez aucune de leurs sœurs, et surtout **quatre
 * exports que le relevé donnait pour morts avaient un adoptant** —
 * `PageContainer`, `SegmentedControl`, `Stat` et `resolveBackendKind`. Un
 * dépôt absent du catalogue est un dépôt que rien ne mesure : le chiffre
 * d'adoption ne dit pas ce que le paquet sert, il dit ce qu'on a pensé à
 * inscrire. C'est le geste que le générateur laisse délibérément à la main, et
 * que deux applications avaient sauté.
 *
 * ATTENTION à ce que cette table compte. Elle relève des SOUS-CHEMINS, pas des
 * symboles : une app qui importe `FamilyApps` depuis le baril `react` n'y fait
 * pas apparaître `react/family-apps`. Compter les adoptants d'un composant ici
 * donne un chiffre faux — `react/family-apps` y a un adoptant, quinze apps
 * l'affichent. Pour cette question, `showroom/adoption.js`, qui relève les
 * symboles.
 */
const CONSUMED = {
  'miss-carbook': [
    'components.css',
    'eslint-react',
    'image',
    'lint-staged',
    'playwright-a11y',
    'playwright-base',
    'prettier',
    'react',
    'react/confirm-dialog',
    'react/empty-state',
    'react/i18n',
    'react/observability',
    'react/sheet',
    'react/toast',
    'react/update-prompt-banner',
    'react/use-online',
    'react/use-update-prompt',
    'realtime',
    'realtime/supabase',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
    'web-vitals',
  ],
  'miss-contraction': [
    'download',
    'eslint-react',
    'lint-staged',
    'pdf',
    'playwright-base',
    'prettier',
    'react',
    'react/observability',
    'react/use-wake-lock',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
    'web-vitals',
  ],
  'miss-genius': [
    'apps-catalog',
    'components.css',
    'download',
    'eslint-react',
    'format',
    'lint-staged',
    'playwright-a11y',
    'playwright-base',
    'prettier',
    'react',
    'react/app-footer',
    'react/bottom-nav',
    'react/button',
    'react/confirm-dialog',
    'react/empty-state',
    'react/field',
    'react/i18n',
    'react/observability',
    'react/sheet',
    'react/update-prompt-banner',
    'react/use-update-prompt',
    'sw-update',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'versioned-store',
    'vite-csp',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
  ],
  'miss-uwh': [
    'apps-catalog',
    'components.css',
    'download',
    'eslint-react',
    'format',
    'ical',
    'lint-staged',
    'playwright-a11y',
    'prettier',
    'react',
    'react/app-footer',
    'react/button',
    'react/confirm-dialog',
    'react/empty-state',
    'react/field',
    'react/i18n',
    'react/labels',
    'react/observability',
    'react/sheet',
    'react/toast',
    'react/update-prompt-banner',
    'storage',
    'supabase-client',
    'sw-update',
    'sync-queue',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'versioned-store',
    'vite-csp',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
    'xlsx',
  ],
  'mister-cim10': [
    'components.css',
    'csv',
    'download',
    'eslint-react',
    'lint-staged',
    'playwright-a11y',
    'playwright-base',
    'prettier',
    'react',
    'react/bottom-nav',
    'react/confirm-dialog',
    'react/i18n',
    'react/labels',
    'react/observability',
    'react/theme-toggle',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
  ],
  'mister-footcoach': [
    'apps-catalog',
    'components.css',
    'download',
    'eslint-react',
    'ical',
    'lint-staged',
    'playwright-a11y',
    'playwright-base',
    'prettier',
    'react',
    'react/badge',
    'react/bottom-nav',
    'react/button',
    'react/confirm-dialog',
    'react/empty-state',
    'react/i18n',
    'react/icons-context',
    'react/icons-lucide',
    'react/observability',
    'react/sheet',
    'react/toast',
    'react/update-prompt-banner',
    'react/use-update-prompt',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-csp',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
  ],
  'mister-puzzle': [
    'components.css',
    'eslint-react',
    'image',
    'lint-staged',
    'playwright-a11y',
    'playwright-base',
    'prettier',
    'react',
    'react/confirm-dialog',
    'react/observability',
    'react/update-prompt-banner',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-csp',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
    'web-vitals',
  ],
  'miss-ticket-pwa': [
    'apps-catalog',
    'components.css',
    'eslint-react',
    'lint-staged',
    'pairing',
    'playwright-a11y',
    'playwright-base',
    'prettier',
    'react',
    'react/i18n',
    'react/icons-lucide',
    'react/observability',
    'react/use-online',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-csp',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
  ],
  'mister-doc': [
    'components.css',
    'eslint-react',
    'lint-staged',
    'pdf',
    'prettier',
    'push',
    'react',
    'react/bottom-nav',
    'react/button',
    'react/confirm-dialog',
    'react/empty-state',
    'react/field',
    'react/i18n',
    'react/icons-context',
    'react/icons-lucide',
    'react/labels',
    'react/observability',
    'react/sheet',
    'react/skeleton',
    'react/theme-provider',
    'react/toast',
    'react/update-prompt-banner',
    'react/use-update-prompt',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
    'xlsx',
  ],
  'miss-lookhouse': [
    'apps-catalog',
    'components.css',
    'eslint-react',
    'format',
    'geo',
    'prettier',
    'react/app-footer',
    'react/badge',
    'react/bottom-nav',
    'react/icons-context',
    'react/sparkline',
    'react/theme-provider',
    'react/theme-toggle',
    'storage',
    'supabase-client',
    'sync-queue',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vitest-base',
    'vitest-setup',
  ],
  'miss-badminton': [
    'apps-catalog',
    'components.css',
    'download',
    'eslint-react',
    'idb',
    'lint-staged',
    'playwright-a11y',
    'playwright-base',
    'prettier',
    'react',
    'react/confirm-dialog',
    'react/observability',
    'react/sheet',
    'react/sparkline',
    'react/use-online',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-csp',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
  ],
  'miss-dice': [
    'apps-catalog',
    'commitlint',
    'download',
    'eslint-react',
    'lint-staged',
    'playwright-a11y',
    'playwright-base',
    'prettier',
    'react',
    'react/observability',
    'react/use-wake-lock',
    'share',
    'vite-csp',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
  ],
  'miss-supaboss': [
    'apps-catalog',
    'commitlint',
    'components.css',
    'eslint-react',
    'format',
    'lint-staged',
    'playwright-base',
    'prettier',
    'react',
    'react/badge',
    'react/bottom-nav',
    'react/confirm-dialog',
    'react/empty-state',
    'react/error-boundary',
    'react/i18n',
    'react/icons-context',
    'react/observability',
    'react/skeleton',
    'react/toast',
    'react/update-prompt-banner',
    'react/use-online',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-csp',
    'vitest-base',
    'vitest-setup',
  ],
  // Relevée le 05/09/2026, à l'inscription au catalogue. Seule app à importer
  // `SegmentedControl` et `Stat`, qui n'avaient AUCUN adoptant : deux
  // composants que `showroom/adoption.js` comptait pour morts.
  //
  // Elle importe en chemins PROFONDS (`react/button`, `react/card`…) là où la
  // plupart des apps passent par le baril `react`. Les deux sont légitimes ; il
  // faut juste savoir qu'un compte fait sur cette table ne mesure pas
  // l'adoption d'un composant — `FamilyApps` y semble à un adoptant alors que
  // quinze apps l'affichent, par le baril. Le relevé par symbole est dans
  // `showroom/adoption.js`, et c'est lui qui répond à cette question-là.
  'miss-supatool': [
    'components.css',
    'download',
    'eslint-react',
    'format',
    'prettier',
    'react/app-header',
    'react/badge',
    'react/bottom-nav',
    'react/button',
    'react/card',
    'react/confirm-dialog',
    'react/empty-state',
    'react/family-apps',
    'react/field',
    'react/observability',
    'react/page-container',
    'react/segmented-control',
    'react/stat',
    'react/theme-provider',
    'react/theme-toggle',
    'react/toast',
    'react/update-prompt-banner',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-csp',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
  ],
  'mister-molkky': [
    'apps-catalog',
    'components.css',
    'download',
    'eslint-react',
    'lint-staged',
    'pairing',
    'playwright-a11y',
    'playwright-base',
    'prettier',
    'qr',
    'react',
    'react/confirm-dialog',
    'react/icons-context',
    'react/icons-lucide',
    'react/labels',
    'react/observability',
    'react/sheet',
    'react/skeleton',
    'react/sparkline',
    'react/use-online',
    'react/use-qr-scanner',
    'react/use-wake-lock',
    'share',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-csp',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
  ],
  'mister-qowa': [
    'apps-catalog',
    'components.css',
    'csv',
    'download',
    'eslint-react',
    'pairing',
    'playwright-base',
    'qr',
    'react/app-footer',
    'react/app-updates',
    'react/confirm-dialog',
    'react/error-boundary',
    'react/use-install-prompt',
    'share',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vitest-base',
  ],
  // Application Electron : elle ne prend du paquet que de l'habillage et du
  // formatage — `components.css` sans Tailwind, `format`, trois composants
  // React et `prettier`. Rien de la chaîne de build, de typage ni de test :
  // celle-ci lui est propre. L'entrée est restée vide jusqu'au 31/08/2026.
  'mister-quota': [
    'components.css',
    'format',
    'prettier',
    'react/confirm-dialog',
    'react/error-boundary',
    'react/toast',
  ],
  // Dix sous-chemins n'ont qu'elle pour adoptant : `correlation`, `logger`,
  // `map`, `map/maplibre`, `prefetch`, `react/app-version`,
  // `react/share-button`, `react/version`, `realtime/local` et `vite-version`.
  'mister-family-map': [
    'commitlint',
    'components.css',
    'correlation',
    'eslint-react',
    'geo',
    'lint-staged',
    'logger',
    'map',
    'map/maplibre',
    'playwright-a11y',
    'playwright-base',
    'prefetch',
    'prettier',
    'react',
    'react/app-version',
    'react/observability',
    'react/share-button',
    'react/update-prompt-banner',
    'react/version',
    'realtime',
    'realtime/local',
    'storage',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-csp',
    'vite-pwa-base',
    'vite-version',
    'vitest-base',
    'vitest-setup',
  ],
  // Relevée le 05/09/2026, à l'inscription au catalogue. Seule app à importer
  // `resolveBackendKind` — le sélecteur de backend n'avait aucun adoptant —,
  // et seule avec `mister-doc` à prendre `react/use-media-query`. Avec
  // `miss-supatool`, elle sort aussi `PageContainer` de zéro.
  'mister-miss-koh': [
    'backend',
    'commitlint',
    'components.css',
    'eslint-react',
    'format',
    'lint-staged',
    'prettier',
    'react/app-footer',
    'react/app-header',
    'react/app-updates',
    'react/badge',
    'react/bottom-nav',
    'react/button',
    'react/card',
    'react/empty-state',
    'react/error-boundary',
    'react/icons-context',
    'react/icons-lucide',
    'react/labels',
    'react/page-container',
    'react/rive',
    'react/theme-provider',
    'react/use-media-query',
    'react/use-online',
    'storage',
    'supabase-client',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'versioned-store',
    'vite-csp',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
  ],
};

/** Tous les sous-chemins consommés au moins une fois, triés. */
export const CONFIG_SUBPATHS = [
  ...new Set(Object.values(CONSUMED).flat()),
].sort();

/** URL du dépôt GitHub d'une app à partir de son id (= nom du repo). */
export function repoUrl(id) {
  return `https://github.com/${GITHUB_OWNER}/${id}`;
}

/** URL GitHub Pages d'une app à partir de son id (base path inclus). */
export function pagesUrl(id) {
  return `https://${GITHUB_OWNER}.github.io/${id}/`;
}

// Fabrique une entrée de catalogue. `appUrl` par défaut = GitHub Pages.
// `iconUrl` par défaut = `${appUrl}favicon.svg` (présent à la racine pour la
// plupart des apps de la famille, SVG net à toute taille). Surcharges :
//   - `icon: 'chemin/relatif.png'` → joint à `appUrl` (apps au nommage d'icône
//     différent : `icons/icon-192.png`, `logo.svg`, `icon.svg`, `logo.png`…) ;
//   - `iconUrl: '<URL absolue>'` ou `iconUrl: null` (app sans icône web) ;
//   - `appUrl`, `repoUrl`, `themeColor` (hébergement/casse custom) ;
//   - `category`, `backend`, `platform` (défaut `'web'`).
function app(id, name, description, maturity, overrides = {}) {
  const appUrl = overrides.appUrl ?? pagesUrl(id);
  let iconUrl;
  if ('iconUrl' in overrides) iconUrl = overrides.iconUrl;
  else if (overrides.icon) iconUrl = `${appUrl}${overrides.icon}`;
  else iconUrl = `${appUrl}favicon.svg`;
  return {
    id,
    name,
    description,
    maturity,
    category: overrides.category,
    backend: overrides.backend,
    platform: overrides.platform ?? 'web',
    configs: CONSUMED[id] ?? [],
    repoUrl: overrides.repoUrl ?? repoUrl(id),
    appUrl,
    iconUrl,
    themeColor: overrides.themeColor,
  };
}

/**
 * Famille d'applications grand public. Exclut volontairement la librairie
 * `dev-pwa-config`, le squelette `pwa-starter-kit`, le générateur
 * `create-lg-pwa-app` et le monorepo `miss-ticket` (Tauri) : ce sont des
 * outils du parc, pas des applications qu'on installe. Trier par maturité puis
 * nom est fait à l'affichage, pas ici.
 *
 * @type {import('./apps-catalog').FamilyApp[]}
 */
export const FAMILY_APPS = [
  app(
    'miss-carbook',
    'Miss Carbook',
    'Comparatif collaboratif de véhicules, en temps réel.',
    'stable',
    { category: 'outils', backend: 'supabase' }
  ),
  app(
    'miss-contraction',
    'Miss Contraction',
    'Chronomètre de contractions et alertes maternité.',
    'stable',
    { icon: 'icon.svg', category: 'sante', backend: 'local' }
  ),
  app(
    'miss-genius',
    'Miss Genius',
    'Simulateur de moyennes scolaires (notes, scénarios, objectifs).',
    'stable',
    { icon: 'icons/icon-192.png', category: 'education', backend: 'local' }
  ),
  app(
    'miss-uwh',
    'Miss UWH',
    'Bilan comptable de saison pour club de hockey subaquatique.',
    'stable',
    { icon: 'icons/icon-192.png', category: 'sport', backend: 'supabase' }
  ),
  app(
    'mister-cim10',
    'Mister CIM-10',
    'Aide à la cotation CIM-10 dans le navigateur (export TXT/CSV/PDF).',
    'stable',
    { category: 'sante', backend: 'local' }
  ),
  app(
    'mister-footcoach',
    'Mister Footcoach',
    "Gestion d'équipes de foot : compositions, statistiques, entraînements.",
    'stable',
    { icon: 'logo.svg', category: 'sport', backend: 'supabase' }
  ),
  app(
    'mister-puzzle',
    'Mister Puzzle',
    'Suivi collaboratif de progression de puzzle en temps réel.',
    'stable',
    { category: 'jeux', backend: 'firebase' }
  ),
  app(
    'miss-ticket-pwa',
    'Miss Ticket',
    "Télécommande PWA pour l'application desktop Miss Ticket.",
    'stable',
    { category: 'outils', backend: 'firebase' }
  ),
  app(
    'mister-doc',
    'Mister Doc',
    'Planning de gardes de médecins synchronisé : vue mensuelle, compteurs week-end et heures.',
    'beta',
    { category: 'sante', backend: 'supabase' }
  ),
  app(
    'miss-lookhouse',
    'Miss Lookhouse',
    'Veille immobilière : multi-sources, anti-doublons, historique des prix, scoring explicable.',
    'beta',
    { category: 'outils', backend: 'supabase' }
  ),
  app(
    'miss-badminton',
    'Miss Badminton',
    'Suivi de scores et statistiques de badminton.',
    'alpha',
    { category: 'sport', backend: 'local' }
  ),
  app(
    'miss-dice',
    'Miss Dice',
    'Lanceur de dé à 6 faces, 100 % hors ligne, installable.',
    'alpha',
    { category: 'jeux', backend: 'local' }
  ),
  app(
    'miss-supaboss',
    'Miss Supaboss',
    'Pilotage multi-comptes Supabase Free : pause/restore, quotas, démos.',
    'alpha',
    // Pilote d'AUTRES comptes Supabase via un backend Node et un jeton
    // personnel : aucun client Supabase côté navigateur, d'où `api`.
    { category: 'dev', backend: 'api' }
  ),
  app(
    'miss-supatool',
    'Miss Supatool',
    "Migration d'un projet Supabase vers un autre : structure, données et fichiers.",
    'alpha',
    // Même raison que `miss-supaboss` : elle parle à des projets Supabase
    // TIERS en HTTP nu (PostgREST, API Storage) et à un relais pour l'API de
    // management. Aucun `@supabase/supabase-js` dans le paquet, d'où `api`.
    { category: 'dev', backend: 'api' }
  ),
  app(
    'mister-molkky',
    'Mister Mölkky',
    'Compteur de scores pour parties de Mölkky (multi-appareils).',
    'alpha',
    { icon: 'logo.png', category: 'jeux', backend: 'supabase' }
  ),
  app(
    'mister-qowa',
    'Mister Qowa',
    "Quiz interactif en temps réel : l'animateur pilote, les joueurs répondent.",
    'alpha',
    // Pas de `favicon.svg` à la racine (404 vérifié en prod) : l'icône vit
    // dans `icons/`, et le SVG reste net à toute taille.
    { icon: 'icons/icon.svg', category: 'jeux', backend: 'firebase' }
  ),
  app(
    'mister-family-map',
    'Mister Family Map',
    'Idées de sorties en famille : carte collaborative, agenda et retours d’expérience.',
    'alpha',
    // `loisirs` : la catégorie a été ajoutée pour elle. Sortir en famille n'est
    // ni un outil ni un jeu, et `outils` n'était qu'un pis-aller assumé à
    // l'ajout de l'app.
    { category: 'loisirs', backend: 'supabase' }
  ),
  app(
    'mister-miss-koh',
    'Mister & miss Koh',
    "Suivi d'une saison d'aventure : candidats, épisodes, épreuves, conseils et votes. Non officiel.",
    'alpha',
    // `loisirs`, comme `mister-family-map` : accompagner une émission n'est ni
    // un jeu ni un outil. « Non officiel » fait partie de la description, pas
    // d'une mention légale reléguée ailleurs : l'app n'a aucun lien avec les
    // ayants droit, et sa donnée vient de Wikipédia, source collaborative.
    { category: 'loisirs', backend: 'supabase' }
  ),
  app(
    'mister-quota',
    'Mister Quota',
    'Suivi de consommation des services IA (application desktop).',
    'alpha',
    // App Electron : pas de PWA hébergée → on pointe vers le dépôt (releases),
    // et pas d'icône web. `backend` volontairement absent : la section
    // « Stack » ne relève la persistance que des quinze apps web.
    {
      appUrl: repoUrl('mister-quota'),
      iconUrl: null,
      category: 'dev',
      platform: 'desktop',
    }
  ),
];

/** Les apps de la famille SAUF celle d'id `currentId` (ordre préservé). */
export function otherApps(currentId) {
  return FAMILY_APPS.filter(a => a.id !== currentId);
}

/** Une app par son id, ou `undefined`. */
export function appById(id) {
  return FAMILY_APPS.find(a => a.id === id);
}

/**
 * Normalise pour la recherche : minuscules, sans diacritiques. « Mölkky » et
 * « molkky » doivent trouver la même carte — le contraire serait une recherche
 * qui ne marche que pour qui connaît déjà l'orthographe exacte.
 */
function normalize(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Tri d'une liste d'apps. Ne mute pas l'entrée.
 *   `curated`   ordre du catalogue (défaut) — l'ordre éditorial
 *   `maturity`  stable → bêta → alpha, puis nom
 *   `name`      alphabétique, avec la collation française
 *
 * @param {import('./apps-catalog').FamilyApp[]} apps
 * @param {'curated'|'maturity'|'name'} [by]
 */
export function sortApps(apps, by = 'curated') {
  const list = [...apps];
  if (by === 'name') return list.sort((a, b) => a.name.localeCompare(b.name));
  if (by === 'maturity') {
    return list.sort(
      (a, b) =>
        MATURITY_ORDER[b.maturity] - MATURITY_ORDER[a.maturity] ||
        a.name.localeCompare(b.name)
    );
  }
  return list;
}

/**
 * Filtre le catalogue. Chaque critère est optionnel ; un critère absent
 * n'exclut rien. `query` cherche dans l'id, le nom et la description.
 *
 * @param {{
 *   query?: string,
 *   maturity?: string|string[],
 *   category?: string|string[],
 *   backend?: string|string[],
 *   platform?: string|string[],
 * }} [criteria]
 * @param {import('./apps-catalog').FamilyApp[]} [apps]
 */
export function filterApps(criteria = {}, apps = FAMILY_APPS) {
  const wanted = value =>
    value == null ? null : new Set(Array.isArray(value) ? value : [value]);
  const maturity = wanted(criteria.maturity);
  const category = wanted(criteria.category);
  const backend = wanted(criteria.backend);
  const platform = wanted(criteria.platform);
  const config = wanted(criteria.config);
  const terms = normalize(criteria.query ?? '')
    .split(/\s+/)
    .filter(Boolean);

  return apps.filter(a => {
    if (maturity && !maturity.has(a.maturity)) return false;
    if (category && !category.has(a.category)) return false;
    if (backend && !backend.has(a.backend)) return false;
    if (platform && !platform.has(a.platform)) return false;
    // Un dépôt correspond dès qu'il consomme L'UN des sous-chemins demandés.
    if (config && !a.configs.some(c => config.has(c))) return false;
    if (!terms.length) return true;
    // Les facettes entrent dans le texte cherché : une pastille « Supabase 6 »
    // à côté d'un champ où « supabase » ne trouve rien, c'est la page qui se
    // contredit sous les yeux de qui l'utilise.
    const haystack = normalize(
      [a.id, a.name, a.description, a.category, a.backend, a.platform]
        .filter(Boolean)
        .join(' ')
    );
    // Tous les mots doivent apparaître : « puzzle temps » doit affiner, pas
    // élargir.
    return terms.every(term => haystack.includes(term));
  });
}

/**
 * Compte les apps par valeur d'un champ. La clé `''` regroupe les apps dont le
 * champ est absent — c'est le cas de `backend` pour l'app desktop.
 *
 * @param {'maturity'|'category'|'backend'|'platform'} key
 * @param {import('./apps-catalog').FamilyApp[]} [apps]
 * @returns {Record<string, number>}
 */
export function countBy(key, apps = FAMILY_APPS) {
  const out = {};
  for (const a of apps) {
    const value = a[key] ?? '';
    out[value] = (out[value] ?? 0) + 1;
  }
  return out;
}

/**
 * Nombre de dépôts consommant chaque sous-chemin. Un dépôt compte une fois par
 * sous-chemin, jamais plus : c'est un taux d'adoption, pas un nombre d'imports.
 * Les sous-chemins que personne n'utilise sont absents du résultat.
 *
 * @param {import('./apps-catalog').FamilyApp[]} [apps]
 * @returns {Record<string, number>}
 */
export function countByConfig(apps = FAMILY_APPS) {
  const out = {};
  for (const a of apps) {
    for (const c of new Set(a.configs)) out[c] = (out[c] ?? 0) + 1;
  }
  return out;
}
