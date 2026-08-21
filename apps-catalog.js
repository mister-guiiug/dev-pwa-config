// Catalogue unique de la famille d'applications miss-*/mister-*.
//
// Données PURES (aucune dépendance React) : importable depuis les apps, les
// scripts ou les tests Node. Le composant de présentation est
// `@mister-guiiug/dev-wpa-config/react` → `FamilyApps`, et la vitrine du
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

/** Lien sponsor commun à toute la famille (Buy Me a Coffee). */
export const SPONSOR_URL = 'https://buymeacoffee.com/mister.guiiug';

/** Maturités éditoriales, de la plus jeune à la plus mûre. */
export const MATURITIES = ['alpha', 'beta', 'stable'];

/** Rang d'une maturité — sert au tri, pas à l'affichage. */
export const MATURITY_ORDER = { alpha: 0, beta: 1, stable: 2 };

/** Domaines d'usage (éditorial, une seule valeur par app). */
export const CATEGORIES = [
  'sante',
  'sport',
  'jeux',
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
 * RELEVÉ, pas éditorial : obtenu en cherchant `'@mister-guiiug/dev-wpa-config/…'`
 * entre guillemets dans le code source de chaque application — donc les imports
 * et les `extends` réels, pas les mentions en commentaire ni les copies
 * inlinées. Le tableau « Projets consommateurs » du README est engendré depuis
 * cette table : c'est la fin d'une liste tenue à la main en double, qui avait
 * déjà divergé sur la persistance de `miss-uwh`.
 *
 * Ce que la table dit d'utile au premier regard : `components.css` n'a qu'UN
 * adoptant sur seize, `commitlint` deux, alors qu'`eslint-react` en a quinze.
 */
const CONSUMED = {
  'miss-carbook': [
    'eslint-react',
    'lint-staged',
    'playwright-a11y',
    'playwright-base',
    'prettier',
    'react',
    'react/i18n',
    'react/observability',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
  ],
  'miss-contraction': [
    'eslint-react',
    'lint-staged',
    'playwright-base',
    'prettier',
    'react',
    'react/observability',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
  ],
  'miss-genius': [
    'eslint-react',
    'lint-staged',
    'playwright-a11y',
    'playwright-base',
    'prettier',
    'react',
    'react/i18n',
    'react/observability',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-csp',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
  ],
  'miss-uwh': [
    'components.css',
    'eslint-react',
    'lint-staged',
    'playwright-a11y',
    'prettier',
    'react',
    'react/i18n',
    'react/observability',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-csp',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
  ],
  'mister-cim10': [
    'eslint-react',
    'lint-staged',
    'playwright-a11y',
    'playwright-base',
    'prettier',
    'react',
    'react/i18n',
    'react/observability',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-pwa-base',
    'vitest-base',
  ],
  'mister-footcoach': [
    'eslint-react',
    'lint-staged',
    'playwright-a11y',
    'playwright-base',
    'prettier',
    'react',
    'react/i18n',
    'react/observability',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-csp',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
  ],
  'mister-puzzle': [
    'eslint-react',
    'lint-staged',
    'playwright-a11y',
    'playwright-base',
    'prettier',
    'react',
    'react/observability',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-csp',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
  ],
  'miss-ticket-pwa': [
    'eslint-react',
    'lint-staged',
    'playwright-a11y',
    'playwright-base',
    'prettier',
    'react',
    'react/i18n',
    'react/observability',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-csp',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
  ],
  'mister-doc': [
    'eslint-react',
    'lint-staged',
    'prettier',
    'react',
    'react/i18n',
    'react/observability',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
  ],
  'miss-lookhouse': [
    'eslint-react',
    'prettier',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vitest-base',
    'vitest-setup',
  ],
  'miss-badminton': [
    'eslint-react',
    'lint-staged',
    'playwright-a11y',
    'playwright-base',
    'prettier',
    'react',
    'react/observability',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-csp',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
  ],
  'miss-dice': [
    'commitlint',
    'eslint-react',
    'lint-staged',
    'playwright-base',
    'prettier',
    'react',
    'react/observability',
    'vite-csp',
    'vite-pwa-base',
    'vitest-setup',
  ],
  'miss-supaboss': [
    'commitlint',
    'eslint-react',
    'lint-staged',
    'playwright-base',
    'prettier',
    'react',
    'react/i18n',
    'react/observability',
    'react/use-update-prompt',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-csp',
    'vitest-base',
    'vitest-setup',
  ],
  'mister-molkky': [
    'eslint-react',
    'lint-staged',
    'playwright-a11y',
    'playwright-base',
    'prettier',
    'react',
    'react/observability',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vite-csp',
    'vite-pwa-base',
    'vitest-base',
    'vitest-setup',
  ],
  'mister-qowa': [
    'eslint-react',
    'playwright-base',
    'tailwind-preset.css',
    'tsconfig-app-react',
    'tsconfig-node',
    'vitest-base',
  ],
  // Application Electron : elle n'importe RIEN du paquet — relevé, pas
  // oubli. C'est le seul dépôt de la famille dans ce cas.
  'mister-quota': [],
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
 * `dev-wpa-config` et le monorepo `miss-ticket` (Tauri). Trier par maturité
 * puis nom est fait à l'affichage, pas ici.
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
