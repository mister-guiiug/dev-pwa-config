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
 * L'ORIGINE qui héberge toute la famille — et la seule chose dont une CSP
 * puisse parler.
 *
 * Une URL de Pages (`pagesUrl`) porte un chemin, qui distingue les apps ;
 * `img-src` ne connaît que l'origine, qui les réunit. Les vingt sites du parc
 * la partagent : c'est pourquoi, en production, `img-src 'self'` laisse déjà
 * passer les icônes que `FamilyApps` va chercher chez les sœurs. En local,
 * non — d'où `vite-csp.js`, seul consommateur de cette constante.
 *
 * `github.io` est un SUFFIXE PUBLIC : `mister-guiiug.github.io` ne désigne pas
 * un sous-domaine de quelqu'un d'autre, mais une origine distincte et entière,
 * celle du compte. La nommer n'ouvre donc rien au-delà du parc.
 */
export const FAMILY_ORIGIN = `https://${GITHUB_OWNER}.github.io`;

/**
 * L'ÉDITEUR DE TOUTE LA FAMILLE : UN nœud schema.org, UN `@id`, repris par
 * RÉFÉRENCE partout ailleurs.
 *
 * Relevé du 29/09/2026 (audit SEO/GEO/AEO) : l'éditeur changeait d'une page à
 * l'autre — `Person` « mister-guiiug » sur les accueils des apps et sur leurs
 * pages de contenu, `Organization` « mister-guiiug » sur le hub, `Organization`
 * « Mister Puzzle » sur mister-puzzle, « GuiiuG » en titre du hub — et aucune
 * page ne partageait d'`@id`. Pour un graphe de connaissances, cela pouvait
 * faire trois éditeurs distincts. Le hub déclare ce nœud sous l'`@id` `#org` ;
 * les apps et les pages de contenu le reprennent tel quel dans leur `@graph`
 * et y renvoient par `author` et `publisher`.
 *
 * Gelé : c'est une donnée publiée, qu'un consommateur étale dans son propre
 * JSON-LD — pas un objet à modifier en place.
 */
export const PUBLISHER = Object.freeze({
  '@type': 'Organization',
  '@id': `${FAMILY_ORIGIN}/#org`,
  name: GITHUB_OWNER,
  alternateName: 'GuiiuG',
  url: `${FAMILY_ORIGIN}/`,
  logo: `${FAMILY_ORIGIN}/icon-512.png`,
  sameAs: Object.freeze([`https://github.com/${GITHUB_OWNER}`]),
});

/**
 * L'`@id` du site du parc (`WebSite`), déclaré par l'accueil du hub : chaque
 * app et chaque page de contenu s'y rattachent par `isPartOf`.
 */
export const SITE_ID = `${FAMILY_ORIGIN}/#site`;

/**
 * La clé IndexNow de l'origine — PUBLIQUE par construction.
 *
 * Le hub la sert à `${FAMILY_ORIGIN}/<clé>.txt` : c'est ainsi qu'on prouve à
 * IndexNow (Bing, Yandex, Seznam, Naver…) qu'on tient l'hôte. Une clé servie à
 * la RACINE couvre toutes les URL de l'origine, donc les vingt sites du parc ;
 * elle ne donne d'autre pouvoir que signaler des URL de cet hôte. Le
 * déploiement de chaque app (`pwa-deploy.yml`) s'en sert pour signaler ce
 * qu'il vient de publier — le workflow en porte une copie, qu'un test compare
 * à celle-ci.
 */
export const INDEXNOW_KEY = '130a4eff7f375c02c7340dcc38504187';

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
  // Inscrite le 07/09/2026, à sa naissance par `create-lg-pwa-app` : quatorze
  // lots en une journée. Première adoptante de `sync-queue`, `csv`, `xlsx`,
  // `image` et `react/use-action-guard` ensemble — l'hors-ligne de l'ADR
  // 0015 du squelette, joué de bout en bout.
  'mister-settle': [
    'apps-catalog',
    'auth/supabase',
    'backend',
    'commitlint',
    'components.css',
    'csv',
    'download',
    'eslint-react',
    'id',
    'idb',
    'image',
    'logger',
    'playwright-base',
    'prettier',
    'react/app-footer',
    'react/app-header',
    'react/app-updates',
    'react/app-version',
    'react/auth-provider',
    'react/badge',
    'react/bottom-nav',
    'react/button',
    'react/card',
    'react/confirm-dialog',
    'react/connection-banner',
    'react/empty-state',
    'react/error-banner',
    'react/error-boundary',
    'react/family-apps',
    'react/field',
    'react/i18n',
    'react/login-form',
    'react/observability',
    'react/page-container',
    'react/pwa-install-prompt',
    'react/segmented-control',
    'react/share-button',
    'react/sheet',
    'react/skeleton',
    'react/stat',
    'react/sync-status-badge',
    'react/theme-provider',
    'react/theme-toggle',
    'react/toast',
    'react/use-action-guard',
    'react/use-online',
    'react/version',
    'storage',
    'supabase-client',
    'sync-queue',
    'tailwind-preset.css',
    'versioned-store',
    'vite-csp',
    'vite-pwa',
    'vite-pwa-base',
    'vite-version',
    'vitest-setup',
    'xlsx',
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
  return `${FAMILY_ORIGIN}/${id}/`;
}

// Fabrique une entrée de catalogue. `appUrl` par défaut = GitHub Pages.
// `iconUrl` par défaut = `${appUrl}favicon.svg` (présent à la racine pour la
// plupart des apps de la famille, SVG net à toute taille). Surcharges :
//   - `icon: 'chemin/relatif.png'` → joint à `appUrl` (apps au nommage d'icône
//     différent : `icons/icon-192.png`, `logo.svg`, `icon.svg`, `logo.png`…) ;
//   - `iconUrl: '<URL absolue>'` ou `iconUrl: null` (app sans icône web) ;
//   - `appUrl`, `repoUrl`, `themeColor` (hébergement/casse custom) ;
//   - `category`, `backend`, `platform` (défaut `'web'`) ;
//   - `languages`, `features` : voir `FAMILY_APPS`.
/**
 * Le port de développement de chaque application — UNIQUE, pour que deux apps
 * tournent côte à côte sur le même poste.
 *
 * Relevé du 05/09/2026 : presque toutes démarraient sur le 5173 de Vite, et
 * cinq avaient choisi un port à la main sans registre (5204, 5214, 5234, 5236,
 * 5240). Les ports déjà choisis sont conservés ; les autres reçoivent une
 * valeur dans la plage 5201–5299. `miss-ticket-pwa` garde 1420, celui de sa
 * configuration Vite.
 *
 * Réservé hors catalogue : **5240** pour le squelette `pwa-starter-kit`. Le
 * générateur prend le plus petit port libre de la plage pour une app neuve,
 * et l'inscription au catalogue le fige.
 */
const DEV_PORTS = {
  'miss-carbook': 5201,
  'miss-contraction': 5202,
  'miss-genius': 5203,
  'miss-supaboss': 5204,
  'miss-uwh': 5205,
  'mister-cim10': 5206,
  'mister-footcoach': 5207,
  'mister-puzzle': 5208,
  'mister-doc': 5210,
  'miss-badminton': 5211,
  'miss-dice': 5212,
  'miss-lookhouse': 5214,
  'mister-molkky': 5215,
  'mister-qowa': 5216,
  'mister-family-map': 5217,
  'mister-quota': 5218,
  'miss-supatool': 5234,
  'mister-miss-koh': 5236,
  'mister-settle': 5209,
  'miss-ticket-pwa': 1420,
};

/** Le port réservé au squelette, absent du catalogue par décision. */
export const STARTER_KIT_DEV_PORT = 5240;

/** La plage des ports de développement de la famille. */
export const DEV_PORT_RANGE = { min: 5201, max: 5299 };

/**
 * Le port de développement d'une app, ou le repli (5173, celui de Vite) pour
 * une app hors catalogue. À passer à `server.port` de `vite.config.ts`.
 */
export function devPortOf(id, fallback = 5173) {
  return DEV_PORTS[id] ?? fallback;
}

/**
 * Le plus petit port libre de la plage, hors catalogue et hors squelette —
 * ce que le générateur donne à une app neuve.
 *
 * @param {number[]} [pris] Ports occupés en plus du catalogue.
 */
export function freeDevPort(pris = []) {
  const occupes = new Set([
    ...Object.values(DEV_PORTS),
    STARTER_KIT_DEV_PORT,
    ...pris,
  ]);
  for (let port = DEV_PORT_RANGE.min; port <= DEV_PORT_RANGE.max; port += 1) {
    if (!occupes.has(port)) return port;
  }
  return null;
}

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
    devPort: overrides.devPort ?? DEV_PORTS[id],
    languages: overrides.languages,
    features: overrides.features,
  };
}

/**
 * Famille d'applications grand public. Exclut volontairement la librairie
 * `dev-pwa-config`, le squelette `pwa-starter-kit`, le générateur
 * `create-lg-pwa-app` et le monorepo `miss-ticket` (Tauri) : ce sont des
 * outils du parc, pas des applications qu'on installe. Trier par maturité puis
 * nom est fait à l'affichage, pas ici.
 *
 * `languages` et `features` sont RELEVÉS le 29/09/2026, dépôt par dépôt, et
 * nourrissent le `WebApplication` de chaque accueil (`inLanguage`,
 * `featureList`) :
 *   - `languages` : les langues de l'INTERFACE, lues dans l'i18n de l'app —
 *     un dictionnaire réel ET une façon de le choisir (sélecteur ou
 *     `navigator.language`). Le français d'abord. Les cinq langues de
 *     `miss-contraction` au-delà de fr/en ne couvrent qu'un cinquième des
 *     clés : elles ne comptent pas ;
 *   - `features` : trois à six fonctions RÉELLES, lues dans le README et
 *     vérifiées dans le code — rien de prévu, rien de promotionnel, et aucune
 *     note : l'absence voulue d'`aggregateRating` tient toujours.
 *
 * @type {import('./apps-catalog').FamilyApp[]}
 */
export const FAMILY_APPS = [
  app(
    'miss-carbook',
    'Miss Carbook',
    'Comparatif collaboratif de véhicules, en temps réel.',
    'alpha',
    {
      category: 'outils',
      backend: 'supabase',
      languages: ['fr', 'en'],
      features: [
        'Dossiers partagés, rejoints par code ou par lien',
        'Exigences communes classées par importance',
        'Fiches de modèles avec photos et commentaires',
        'Comparaison des modèles, export JSON ou CSV',
        "Journal d'activité du dossier",
        "Sauvegarde et import d'un dossier en archive ZIP",
      ],
    }
  ),
  app(
    'miss-contraction',
    'Miss Contraction',
    'Chronomètre de contractions et alertes maternité.',
    'stable',
    {
      icon: 'icon.svg',
      category: 'sante',
      backend: 'local',
      languages: ['fr', 'en'],
      features: [
        'Chronomètre de contractions avec durée et intervalle',
        'Alertes par seuils personnalisables et pré-alerte',
        'Tableau détaillé des contractions, modifiable',
        'Message pré-rempli pour la maternité (SMS, WhatsApp)',
        'Fiche maternité avec appel en un geste',
        "Sauvegarde JSON de l'historique et des réglages",
      ],
    }
  ),
  app(
    'miss-genius',
    'Miss Genius',
    'Simulateur de moyennes scolaires (notes, scénarios, objectifs).',
    'stable',
    {
      icon: 'icons/icon-192.png',
      category: 'education',
      backend: 'local',
      languages: ['fr', 'en'],
      features: [
        'Matières et notes avec coefficients',
        'Calcul de la moyenne générale pondérée',
        "Simulation de l'effet d'une note future",
        'Note à viser pour atteindre un objectif',
        "Scénarios d'hypothèses comparés entre eux",
        'Notes rangées par trimestre, semestre ou année',
      ],
    }
  ),
  app(
    'miss-uwh',
    'Miss UWH',
    'Bilan comptable de saison pour club de hockey subaquatique.',
    'stable',
    {
      icon: 'icons/icon-192.png',
      category: 'sport',
      backend: 'supabase',
      languages: ['fr', 'en'],
      features: [
        'Journal comptable avec solde recalculé en direct',
        'Bilan de saison automatique par catégorie',
        'Résultat net par événement du club',
        'Clôture de saison et report du reliquat',
        'Exports CSV, Excel multi-feuilles et bilan PDF',
        'Registre des adhérents et suivi des cotisations',
      ],
    }
  ),
  app(
    'mister-cim10',
    'Mister CIM10',
    'Aide à la cotation CIM-10 dans le navigateur (export TXT/CSV/PDF).',
    'stable',
    {
      category: 'sante',
      backend: 'local',
      languages: ['fr', 'en'],
      features: [
        'Suggestions de codes CIM-10 depuis un compte rendu',
        'Recherche de code par libellé, synonyme ou code',
        'Contrôle et remise en forme des codes saisis',
        'Favoris pour ajouter un code en un geste',
        'Export TXT, CSV ou JSON et impression',
        'Dictée vocale du compte rendu',
      ],
    }
  ),
  app(
    'mister-footcoach',
    'Mister Footcoach',
    "Gestion d'équipes de foot : compositions, statistiques, entraînements.",
    'alpha',
    {
      icon: 'logo.svg',
      category: 'sport',
      backend: 'supabase',
      languages: ['fr', 'en'],
      features: [
        'Équipes et fiches joueurs',
        'Feuille de présences : présent, absent, excusé',
        'Mode live de match : chrono, score et événements',
        'Compositions par formation de foot à 8 et par poste',
        "Statistiques d'équipe, buteurs et taux de présence",
        'Export PDF de la feuille de match et des présences',
      ],
    }
  ),
  app(
    'mister-puzzle',
    'Mister Puzzle',
    'Suivi collaboratif de progression de puzzle en temps réel.',
    'stable',
    {
      category: 'jeux',
      backend: 'firebase',
      languages: ['fr', 'en'],
      features: [
        'Salle partagée par un code, sans inscription',
        'Compteur de pièces synchronisé en temps réel',
        'Courbe de progression, historique exportable en CSV ou JSON',
        'Galerie photos à réordonner et faire pivoter',
        'Checkpoints pour marquer les étapes du puzzle',
        'Classement des contributeurs sur 24 h, 7 jours ou total',
      ],
    }
  ),
  app(
    'miss-ticket-pwa',
    'Miss Ticket',
    "Télécommande PWA pour l'application desktop Miss Ticket.",
    'alpha',
    {
      category: 'outils',
      backend: 'firebase',
      languages: ['fr', 'en'],
      // Ce que la PWA fait de son côté. Son README le dit : le desktop ne se
      // connecte plus à Firestore depuis le 21/05/2026, la chaîne complète ne
      // fonctionne donc pas aujourd'hui.
      features: [
        "Jumelage d'un poste desktop par scan de QR code",
        'Suivi en temps réel des postes et de leurs sessions',
        "Arrêt à distance d'une session ou de toutes",
        'Historique local des sessions terminées',
      ],
    }
  ),
  app(
    'mister-doc',
    'Mister Doc',
    'Planning de gardes de médecins synchronisé : vue mensuelle, compteurs week-end et heures.',
    'stable',
    {
      category: 'sante',
      backend: 'supabase',
      languages: ['fr', 'en'],
      features: [
        'Planning mensuel des gardes, groupé par semaine ISO',
        'Bourse aux gardes : proposer, accepter ou décliner',
        'Compteurs week-end, heures totales et HNC par médecin',
        'Congés, formations et vœux de disponibilité',
        'Export des compteurs en CSV, Excel et PDF',
        'Abonnement calendrier iCalendar (.ics) des gardes',
      ],
    }
  ),
  app(
    'miss-lookhouse',
    'Miss LookHouse',
    'Veille immobilière : multi-sources, anti-doublons, historique des prix, scoring explicable.',
    'beta',
    {
      category: 'outils',
      backend: 'supabase',
      languages: ['fr'],
      features: [
        'Recherches surveillées par rayon ou zone dessinée',
        "Import d'annonces par URL, JSON ou bookmarklet",
        'Détection des doublons et des annonces republiées',
        'Historique des prix et détection des baisses',
        'Carte des annonces sur OpenStreetMap',
        'Prix de référence DVF au m² sur la fiche annonce',
      ],
    }
  ),
  app(
    'miss-badminton',
    'Miss Badminton',
    'Suivi de scores et statistiques de badminton.',
    'stable',
    {
      category: 'sport',
      backend: 'local',
      languages: ['fr', 'en', 'es'],
      features: [
        'Compteur de points au toucher, en simple ou en double',
        'Règles réglables : sets, points, plafond, limite de temps',
        'Balles de set et de match, changement de côté signalé',
        'Chronomètre de match et partage du résultat',
        'Historique avec classement, face-à-face et activité',
        "Export et import de l'historique en JSON",
      ],
    }
  ),
  app(
    'miss-dice',
    'Miss Dice',
    'Lanceur de dé à 6 faces, 100 % hors ligne, installable.',
    'stable',
    {
      category: 'jeux',
      backend: 'local',
      languages: ['fr', 'en', 'es', 'de', 'it', 'pt'],
      features: [
        'Lanceur de 1 à 6 dés, du D4 au D20',
        'Yahtzee, 421 et Cochon, de 1 à 8 joueurs',
        'Lancer en notation JDR (2d6+3, 4d6kh3, dés Fudge)',
        'Écran Décider : pile ou face, oui/non, tirage au sort',
        'Statistiques et historique des lancers, export CSV',
        "Reprise d'une partie sur un autre appareil, par lien ou QR",
      ],
    }
  ),
  app(
    'miss-supaboss',
    'Miss Supaboss',
    'Pilotage multi-comptes Supabase Free : pause/restore, quotas, démos.',
    'beta',
    // Pilote d'AUTRES comptes Supabase via un backend Node et un jeton
    // personnel : aucun client Supabase côté navigateur, d'où `api`.
    {
      category: 'dev',
      backend: 'api',
      // L'anglais couvre toute l'interface ; seuls les libellés de `shared/`
      // (statuts, quotas, dates relatives) restent en français.
      languages: ['fr', 'en'],
      features: [
        'Inventaire consolidé des projets de plusieurs comptes',
        'Pause et restauration de projets à la demande',
        'Garde-fou de la limite de 2 projets actifs par compte',
        'Suivi des quotas Free Plan : egress, base, MAU, stockage',
        'Préparation de démo guidée en 5 étapes',
        "Journal d'audit des actions sur les projets",
      ],
    }
  ),
  app(
    'miss-supatool',
    'Miss Supatool',
    "Migration d'un projet Supabase vers un autre : structure, données et fichiers.",
    'beta',
    // Même raison que `miss-supaboss` : elle parle à des projets Supabase
    // TIERS en HTTP nu (PostgREST, API Storage) et à un relais pour l'API de
    // management. Aucun `@supabase/supabase-js` dans le paquet, d'où `api`.
    {
      category: 'dev',
      backend: 'api',
      languages: ['fr'],
      features: [
        'Création du projet Supabase cible depuis le navigateur',
        'Comparaison des schémas et ordre de copie des tables',
        'Copie de la structure : tables, index, vues, RLS, droits',
        'Copie des lignes et des fichiers Storage',
        'Mode simulation avant toute écriture dans la cible',
        'Rapport JSON et remise à niveau des séquences',
      ],
    }
  ),
  app(
    'mister-molkky',
    'Mister Mölkky',
    'Compteur de scores pour parties de Mölkky (multi-appareils).',
    'stable',
    // `logo.png` PESAIT 1 276 707 OCTETS — 1,28 Mo pour une vignette de 40 px,
    // et le seul fichier du catalogue à dépasser 8 ko. Mesuré le 20/09/2026 :
    // il était réellement téléchargé en production par les seize apps sœurs
    // qui affichent la grille, à chaque ouverture de leur écran Paramètres. Le
    // catalogue pointe désormais l'icône que l'app déclare elle-même dans son
    // `index.html` (23 663 octets, 192 px), comme `miss-genius` et `miss-uwh`.
    // Rien ne mesurait ce poids : un budget de bundle ne voit pas ce qui part
    // chez le voisin.
    {
      icon: 'icons/icon-192.png',
      category: 'jeux',
      backend: 'supabase',
      languages: ['fr', 'en'],
      features: [
        'Saisie des quilles tombées, score calculé',
        'Variantes classique, inversée, libre et mode équipes',
        'Partie en direct suivie par QR code ou code à 6 caractères',
        'Statistiques par joueur, face-à-face et succès',
        'Historique des parties avec replay animé',
        'Mode entraînement solo sur une quille cible',
      ],
    }
  ),
  app(
    'mister-qowa',
    'Mister Qowa',
    "Quiz interactif en temps réel : l'animateur pilote, les joueurs répondent.",
    'stable',
    // Pas de `favicon.svg` à la racine (404 vérifié en prod) : l'icône vit
    // dans `icons/`, et le SVG reste net à toute taille.
    {
      icon: 'icons/icon.svg',
      category: 'jeux',
      backend: 'firebase',
      languages: ['fr', 'en', 'es', 'de', 'it'],
      features: [
        'Parties en direct rejointes avec un code PIN',
        'Questions chronométrées : QCM, vrai/faux, libre, sondage',
        'Score combinant justesse et rapidité de réponse',
        'Classement en direct puis podium final',
        'Génération de quiz par IA (Gemini ou Anthropic)',
        'Historique des parties animées',
      ],
    }
  ),
  app(
    'mister-family-map',
    'Mister FamilyMap',
    'Idées de sorties en famille : carte collaborative, agenda et retours d’expérience.',
    'beta',
    // `loisirs` : la catégorie a été ajoutée pour elle. Sortir en famille n'est
    // ni un outil ni un jeu, et `outils` n'était qu'un pis-aller assumé à
    // l'ajout de l'app.
    {
      category: 'loisirs',
      backend: 'supabase',
      languages: ['fr'],
      features: [
        'Carte des lieux avec regroupement des marqueurs',
        'Filtres familiaux : âge, poussette, toilettes, météo',
        "Agenda d'événements exportable en iCalendar (.ics)",
        'Ajout de lieu guidé, avec contrôle des doublons',
        'Favoris consultables hors ligne',
        'Export JSON de toutes ses contributions',
      ],
    }
  ),
  app(
    'mister-miss-koh',
    'Mister & Miss Koh',
    'Suivi de Koh-Lanta : candidats, épisodes, épreuves, conseils et votes. Indépendant, non officiel.',
    'beta',
    // `loisirs`, comme `mister-family-map` : accompagner une émission n'est ni
    // un jeu ni un outil. La description NOMME Koh-Lanta — c'est ce qu'on
    // cherche — et garde « non officiel » : l'app n'a aucun lien avec TF1 ni
    // la production, et sa donnée vient de Wikipédia, source collaborative.
    {
      category: 'loisirs',
      backend: 'supabase',
      languages: ['fr'],
      features: [
        'Anti-spoiler réglé sur le dernier épisode vu',
        'Suivi des épisodes vus, cochés en cascade',
        'Candidats regroupés par duo ou par tribu',
        'Détail des conseils : voix par candidat et bulletins',
        'Notes personnelles partageables par lien révocable',
        "Portraits personnels gardés sur l'appareil, export ZIP",
      ],
    }
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
      languages: ['fr'],
      features: [
        'Suivi de la consommation de plusieurs comptes IA',
        'Avance ou retard sur la consommation idéale',
        'Collecte automatique via les API Claude et Cursor',
        'Saisie manuelle et import CSV de relevés',
        'Alertes de seuil par notification système',
        'Sauvegarde JSON restaurable et export CSV',
      ],
    }
  ),
  app(
    'mister-settle',
    'Mister Settle',
    'Partage de dépenses entre proches : qui a payé, qui doit combien, remboursements suggérés — sans paiement.',
    'alpha',
    // `outils` : compter à plusieurs est un outil. Aucun paiement dans l'app,
    // et la description le dit : l'argent circule ailleurs, entre les gens.
    {
      category: 'outils',
      backend: 'supabase',
      languages: ['fr', 'en'],
      features: [
        'Espaces avec personnes sans compte et regroupements',
        'Répartition équitable, par montants ou par parts',
        'Soldes et remboursements suggérés',
        'Justificatifs photo réencodés sans métadonnées',
        'Statistiques et exports CSV ou XLSX',
        'Invitations par lien avec rôle, révocables',
      ],
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
