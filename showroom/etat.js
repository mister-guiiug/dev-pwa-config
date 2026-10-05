/*
 * L'état partagé du showroom : les clés de stockage, la lecture et
 * l'écriture, l'état porté par l'URL, et l'objet `etat` que plusieurs
 * modules lisent ET écrivent.
 *
 * Le showroom sert à COMPARER des thèmes : ne pas pouvoir en envoyer un par
 * lien était le manque le plus surprenant. L'état vit donc dans l'URL, le
 * stockage local ne servant plus que de mémoire entre deux visites.
 */

/**
 * Ce que plusieurs modules lisent et écrivent. Un module ES ne peut pas
 * réaffecter la variable d'un autre : `currentTheme`, que changent
 * l'habillage, les scènes et l'amorçage, vit donc ici. Chaque champ est
 * initialisé là où il l'était dans l'ancien script d'un seul tenant :
 * `lang` dans langue.js ; `currentDensity`, `pairA`, `pairB`,
 * `inspectOn` et `sectionFocus` ci-dessous ; `appQuery`, `appView`,
 * `appSort` et `appFacets` dans vitrine.js ; `catQuery` dans fiches.js ;
 * `pgCurrent` dans bac-a-sable.js ; `activeSceneId` dans scenes.js ;
 * `currentScheme` et `currentTheme` dans showroom.js.
 */
export const etat = {};

/**
 * Les rappels d'en haut, appelés d'en bas. Habiller la page (`selectTheme`)
 * repeint la vitrine et la galerie, qui offrent elles-mêmes ce geste : les
 * importer dans les deux sens ferait un cycle, et les empreintes de cache
 * (`?v=`) se calculent des feuilles vers la racine. habillage.js inscrit
 * le rappel en se chargeant, bien avant le premier clic.
 */
export const rappels = {};

export var root = document.documentElement;
export var themes = globalThis.SHOWROOM_THEMES || [];
export var APP_KEY = 'dwc_showroom_app';
// Clé PROPRE au showroom. `dwc_theme` est la clé famille de `useTheme` : les
// apps la lisent sur la même origine, et un essai du sombre ici changeait
// leur thème. Aucune reprise de la valeur famille : le showroom part de
// « système » tant qu'on n'y a rien choisi.
export var SCHEME_KEY = 'dwc_showroom_scheme';
export var LANG_KEY = 'dwc_showroom_lang';
export var DENSITY_KEY = 'dwc_showroom_density';
export var PAIR_A_KEY = 'dwc_showroom_pair_a';
export var PAIR_B_KEY = 'dwc_showroom_pair_b';
export var RECENT_KEY = 'dwc_showroom_recent';
export var NEWS_KEY = 'dwc_showroom_news';
export var TOUR_KEY = 'dwc_showroom_tour_done';
export var PKG_LABEL = '@mister-guiiug/dev-pwa-config';
// Identifiant du ruban « nouveautés » : porté par `<html data-news-id>`, que
// lit aussi le script en ligne. L'avancer dans index.html le réaffiche.
export var NEWS_ID =
  document.documentElement.getAttribute('data-news-id') || '';
export var SCENES_KEY = 'dwc_showroom_scenes';

export function read(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

export function write(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* mode privé / stockage plein : la bascule reste fonctionnelle */
  }
}

export function paramOr(name, fallback) {
  try {
    return new URLSearchParams(location.search).get(name) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Reflète l'état courant dans la query, sans empiler d'entrées d'historique
 * — chaque bascule de thème polluerait le bouton « précédent » — et sans
 * toucher au fragment, qui porte l'ancre de section.
 */
export function syncUrl() {
  try {
    var url = new URL(location.href);
    url.searchParams.set('app', etat.currentTheme.id);
    url.searchParams.set('scheme', etat.currentScheme);
    url.searchParams.set('lang', etat.lang);
    // L'état de la vitrine n'entre dans l'URL que s'il s'écarte du défaut :
    // trois paramètres vides sur chaque lien partagé, ce serait du bruit.
    setOrDrop(url, 'q', etat.appQuery.trim());
    setOrDrop(url, 'sort', etat.appSort === 'curated' ? '' : etat.appSort);
    setOrDrop(url, 'maturity', etat.appFacets.maturity);
    setOrDrop(url, 'backend', etat.appFacets.backend);
    setOrDrop(url, 'category', etat.appFacets.category);
    setOrDrop(url, 'config', etat.appFacets.config);
    setOrDrop(url, 'view', etat.appView === 'grid' ? '' : etat.appView);
    setOrDrop(
      url,
      'density',
      etat.currentDensity === 'comfort' ? '' : etat.currentDensity
    );
    setOrDrop(url, 'pair', etat.pairA + ',' + etat.pairB);
    setOrDrop(url, 'inspect', etat.inspectOn ? '1' : '');
    setOrDrop(url, 'section', etat.sectionFocus || '');
    setOrDrop(url, 'scene', etat.activeSceneId || '');
    history.replaceState(null, '', url);
  } catch {
    /* URL non manipulable (file://) : le stockage prend le relais */
  }
}

// `all` et la chaîne vide désignent tous les deux « pas de filtre » : ni
// l'un ni l'autre n'a sa place dans la query.
export function setOrDrop(url, name, value) {
  if (!value || value === 'all') url.searchParams.delete(name);
  else url.searchParams.set(name, value);
}

etat.currentDensity =
  paramOr('density', read(DENSITY_KEY, 'comfort')) === 'compact'
    ? 'compact'
    : 'comfort';

function parsePairParam() {
  var raw = paramOr('pair', '');
  if (raw && raw.indexOf(',') !== -1) {
    var parts = raw.split(',');
    return [parts[0] || '', parts[1] || ''];
  }
  return [read(PAIR_A_KEY, ''), read(PAIR_B_KEY, '')];
}
var pairInit = parsePairParam();
etat.pairA = pairInit[0];
etat.pairB = pairInit[1];
etat.inspectOn = paramOr('inspect', '') === '1';
etat.sectionFocus = paramOr('section', '');
