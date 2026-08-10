// Catalogue unique de la famille d'applications miss-*/mister-*.
//
// Données PURES (aucune dépendance React) : importable depuis les apps, les
// scripts ou les tests Node. Le composant de présentation est
// `@mister-guiiug/dev-wpa-config/react` → `FamilyApps`.
//
// Le niveau de maturité (`maturity`) est saisi À LA MAIN, app par app — il
// reflète un choix éditorial, pas la version npm.

export const GITHUB_OWNER = 'mister-guiiug';

/** Lien sponsor commun à toute la famille (Buy Me a Coffee). */
export const SPONSOR_URL = 'https://buymeacoffee.com/mister.guiiug';

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
//   - `appUrl`, `repoUrl`, `themeColor` (hébergement/casse custom).
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
    'stable'
  ),
  app(
    'miss-contraction',
    'Miss Contraction',
    'Chronomètre de contractions et alertes maternité.',
    'stable',
    { icon: 'icon.svg' }
  ),
  app(
    'miss-genius',
    'Miss Genius',
    'Simulateur de moyennes scolaires (notes, scénarios, objectifs).',
    'stable',
    { icon: 'icons/icon-192.png' }
  ),
  app(
    'miss-uwh',
    'Miss UWH',
    'Bilan comptable de saison pour club de hockey subaquatique.',
    'stable',
    { icon: 'icons/icon-192.png' }
  ),
  app(
    'mister-cim10',
    'Mister CIM-10',
    'Aide à la cotation CIM-10 dans le navigateur (export TXT/CSV/PDF).',
    'stable'
  ),
  app(
    'mister-footcoach',
    'Mister Footcoach',
    "Gestion d'équipes de foot : compositions, statistiques, entraînements.",
    'stable',
    { icon: 'logo.svg' }
  ),
  app(
    'mister-puzzle',
    'Mister Puzzle',
    'Suivi collaboratif de progression de puzzle en temps réel.',
    'stable'
  ),
  app(
    'miss-ticket-pwa',
    'Miss Ticket',
    "Télécommande PWA pour l'application desktop Miss Ticket.",
    'stable'
  ),
  app(
    'mister-doc',
    'Mister Doc',
    'Planning de gardes de médecins synchronisé : vue mensuelle, compteurs week-end et heures.',
    'beta'
  ),
  app(
    'miss-lookhouse',
    'Miss Lookhouse',
    'Veille immobilière : multi-sources, anti-doublons, historique des prix, scoring explicable.',
    'beta'
  ),
  app(
    'miss-badminton',
    'Miss Badminton',
    'Suivi de scores et statistiques de badminton.',
    'alpha'
  ),
  app(
    'miss-dice',
    'Miss Dice',
    'Lanceur de dé à 6 faces, 100 % hors ligne, installable.',
    'alpha'
  ),
  app(
    'miss-supaboss',
    'Miss Supaboss',
    'Pilotage multi-comptes Supabase Free : pause/restore, quotas, démos.',
    'alpha'
  ),
  app(
    'mister-molkky',
    'Mister Mölkky',
    'Compteur de scores pour parties de Mölkky (multi-appareils).',
    'alpha',
    { icon: 'logo.png' }
  ),
  app(
    'mister-qowa',
    'Mister Qowa',
    "Quiz interactif en temps réel : l'animateur pilote, les joueurs répondent.",
    'alpha',
    // Pas de `favicon.svg` à la racine (404 vérifié en prod) : l'icône vit
    // dans `icons/`, et le SVG reste net à toute taille.
    { icon: 'icons/icon.svg' }
  ),
  app(
    'mister-quota',
    'Mister Quota',
    'Suivi de consommation des services IA (application desktop).',
    'alpha',
    // App Electron : pas de PWA hébergée → on pointe vers le dépôt (releases),
    // et pas d'icône web.
    { appUrl: repoUrl('mister-quota'), iconUrl: null }
  ),
];

/** Les apps de la famille SAUF celle d'id `currentId` (ordre préservé). */
export function otherApps(currentId) {
  return FAMILY_APPS.filter(a => a.id !== currentId);
}
