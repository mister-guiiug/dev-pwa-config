/*
 * La vitrine des dépôts de la famille.
 *
 * La page documentait le design system sans jamais montrer CE QU'IL HABILLE.
 * Les seize dépôts n'apparaissaient que par fragments : trois cartes de
 * démonstration du composant `FamilyApps`, treize palettes dans le sélecteur,
 * des noms dispersés dans la prose de la section « Stack ».
 *
 * La grille ci-dessous les rassemble, et elle est ENGENDRÉE depuis le miroir
 * de `apps-catalog.js` (`showroom/apps.js`, produit par
 * `npm run sync`) : le même catalogue qu'importent les apps pour
 * s'afficher les unes les autres. Une entrée fausse ici est fausse en
 * production, ce qui est exactement la propriété recherchée.
 */

import { encreSur } from './contraste.js?v=286644156b';
import {
  etat,
  paramOr,
  rappels,
  root,
  syncUrl,
  themes,
} from './etat.js?v=542f37cc5d';
import { t } from './langue.js?v=d92afbcf3f';
import { maturityLabel, SHOTS, themeById } from './communs.js?v=0f95ffd5f1';
import { copyButton } from './presse-papier.js?v=8913ceeeb8';
import {
  labelTableCells,
  scheduleScrollLabels,
} from './tableaux.js?v=ab72120a8e';

var CATALOG = globalThis.SHOWROOM_APPS || {};
export var APPS = CATALOG.apps || [];

/*
 * Relevé nocturne de l'état des dépôts (`metrics.js`, workflow
 * `showroom-metrics.yml`). Vide tant que le workflow n'est pas passé : tout
 * ce qui suit doit rester correct dans ce cas — c'est l'état par défaut du
 * fichier commité, pas une panne.
 */
var METRICS = globalThis.SHOWROOM_METRICS || {};
var REPO_METRICS = METRICS.repos || {};
var HAS_METRICS = Object.keys(REPO_METRICS).length > 0;

/**
 * « il y a 3 mois » plutôt qu'une date ISO : sur une vitrine, ce qui compte
 * n'est pas QUAND mais DEPUIS COMBIEN DE TEMPS. Calculé à l'affichage, donc
 * jamais périmé — contrairement à une phrase écrite dans le fichier.
 */
function timeAgo(iso) {
  if (!iso) return '';
  var days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (!isFinite(days) || days < 0) return '';
  if (days === 0) return t('ui.ago.today', 'aujourd’hui');
  if (days < 31)
    return t('ui.ago.days', 'il y a {n} j').replace('{n}', String(days));
  var months = Math.floor(days / 30.44);
  if (months < 24)
    return t('ui.ago.months', 'il y a {n} mois').replace('{n}', String(months));
  return t('ui.ago.years', 'il y a {n} ans').replace(
    '{n}',
    String(Math.floor(days / 365.25))
  );
}

/** Ligne de mesures d'une carte, ou `null` si rien n'a été relevé. */
function metricsBlock(item) {
  var m = REPO_METRICS[item.id];
  if (!m) return null;

  var parts = [];
  if (m.version) parts.push(['version', m.version]);
  var pushed = timeAgo(m.pushedAt);
  if (pushed)
    parts.push([
      'pushed',
      t('ui.metrics.pushed', 'code {ago}').replace('{ago}', pushed),
    ]);
  // Un dépôt archivé se dit en toutes lettres : c'est la seule mesure qui
  // change ce qu'un lecteur doit faire du lien.
  if (m.archived) parts.push(['archived', t('ui.metrics.archived', 'archivé')]);
  if (!parts.length) return null;

  var p = document.createElement('p');
  p.className = 'sr-app-metrics';
  parts.forEach(function (part) {
    var span = document.createElement('span');
    span.dataset.metric = part[0];
    span.textContent = part[1];
    p.appendChild(span);
  });
  return p;
}

var MATURITY_RANK = { alpha: 0, beta: 1, stable: 2 };

// Libellés français par défaut ; `t()` les remplace dans les autres langues.
// La clé `none` couvre la persistance NON RELEVÉE (l'app desktop) : mieux
// vaut une case honnêtement vide qu'une famille de base de données devinée.
var BACKEND_FR = {
  supabase: 'Supabase',
  firebase: 'Firebase',
  local: 'Local-first',
  api: 'API tierce',
  none: 'Non relevé',
};
var CATEGORY_FR = {
  sante: 'Santé',
  sport: 'Sport',
  jeux: 'Jeux',
  education: 'Éducation',
  loisirs: 'Loisirs',
  outils: 'Outils',
  dev: 'Développement',
};
var PLATFORM_FR = { web: 'Web', desktop: 'Desktop' };
var SORT_FR = {
  curated: 'Ordre du catalogue',
  maturity: 'Maturité',
  name: 'Nom',
  updated: 'Dernière activité',
};

function backendLabel(value) {
  var key = value || 'none';
  return t('ui.backend.' + key, BACKEND_FR[key] || key);
}
function categoryLabel(value) {
  return t('ui.category.' + value, CATEGORY_FR[value] || value);
}
function platformLabel(value) {
  return t('ui.platform.' + value, PLATFORM_FR[value] || value);
}
function sortLabel(value) {
  return t('ui.apps.sortBy.' + value, SORT_FR[value] || value);
}

// Axes de filtrage : [clé de facette, clé i18n du titre, repli FR, valeurs,
// fonction de libellé]. `backend` ajoute `''` pour la persistance non relevée.
var APP_FACETS = [
  [
    'maturity',
    'ui.apps.facet.maturity',
    'Maturité',
    (CATALOG.maturities || []).slice().reverse(),
    maturityLabel,
  ],
  [
    'backend',
    'ui.apps.facet.backend',
    'Persistance',
    (CATALOG.backends || []).concat(['none']),
    backendLabel,
  ],
  [
    'category',
    'ui.apps.facet.category',
    'Domaine',
    CATALOG.categories || [],
    categoryLabel,
  ],
];

var APP_SORTS = ['curated', 'maturity', 'name'];
// Trier par activité n'a de sens que si l'activité a été relevée : l'option
// n'apparaît pas quand `metrics.js` est vide.
if (HAS_METRICS) APP_SORTS.push('updated');

/** Valeur d'URL retenue seulement si elle existe vraiment. */
function facetParam(key, values) {
  var raw = paramOr(key, 'all');
  return values.indexOf(raw) === -1 ? 'all' : raw;
}

var APP_VIEWS = ['grid', 'table'];

etat.appQuery = paramOr('q', '');
etat.appView =
  APP_VIEWS.indexOf(paramOr('view', 'grid')) === -1
    ? 'grid'
    : paramOr('view', 'grid');
etat.appSort =
  APP_SORTS.indexOf(paramOr('sort', 'curated')) === -1
    ? 'curated'
    : paramOr('sort', 'curated');
etat.appFacets = {
  maturity: facetParam('maturity', CATALOG.maturities || []),
  backend: facetParam('backend', (CATALOG.backends || []).concat(['none'])),
  category: facetParam('category', CATALOG.categories || []),
  // Dix-huit valeurs : servi par un menu déroulant, pas par des pastilles.
  config: facetParam('config', (CATALOG.configSubpaths || []).concat(['none'])),
};
var adoptionSort = 'most';

function appsFiltersActive() {
  return !!(
    etat.appQuery.trim() ||
    etat.appFacets.maturity !== 'all' ||
    etat.appFacets.backend !== 'all' ||
    etat.appFacets.category !== 'all' ||
    etat.appFacets.config !== 'all' ||
    etat.appSort !== 'curated' ||
    etat.appView !== 'grid'
  );
}

function resetAppsFilters() {
  etat.appQuery = '';
  etat.appFacets.maturity = 'all';
  etat.appFacets.backend = 'all';
  etat.appFacets.category = 'all';
  etat.appFacets.config = 'all';
  etat.appSort = 'curated';
  etat.appView = 'grid';
  var configSelect = document.getElementById('apps-config');
  if (configSelect) configSelect.value = 'all';
  var sortSelect = document.getElementById('apps-sort');
  if (sortSelect) sortSelect.value = 'curated';
  renderAppViewToggle();
  renderAppGrid();
  renderAppSort();
  renderViewChip();
  syncUrl();
}

/**
 * Deux lettres du mot distinctif. « Miss » et « Mister » préfixent seize
 * noms : une seule initiale, et la grille afficherait seize fois « M ».
 */
function monogram(name) {
  var word = name.replace(/^(miss|mister)\s+/i, '');
  return (word || name).slice(0, 2).toUpperCase();
}

/**
 * Primaire réelle de l'app, relevée dans `themes.js` pour le schéma courant.
 * Les trois apps sans palette relevée (dice, ticket, quota) retombent sur la
 * primaire du thème actif — pas de couleur inventée.
 */
function appAccent(id) {
  var scheme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  for (var i = 0; i < themes.length; i++) {
    if (themes[i].id !== id) continue;
    var palette = themes[i][scheme] || themes[i].dark || themes[i].light;
    return palette && palette.primary ? palette.primary : '';
  }
  return '';
}

/**
 * Encre lisible SUR la primaire de l'app. La couleur de contraste de la
 * page n'a aucun rapport avec cet aplat : en schéma sombre, le texte de la
 * page est clair et la primaire d'une autre app souvent claire aussi.
 */
function inkOn(color) {
  // Blanc ou encre sombre, et le noir si aucune ne tient 4,5:1 : sur le
  // violet de miss-dice (#7c5cf6), le blanc plafonnait à 4,45:1.
  try {
    return encreSur(color);
  } catch {
    return '';
  }
}

function paintMonogram(el) {
  var accent = appAccent(el.dataset.app);
  if (!accent) {
    el.style.removeProperty('--sr-app-accent');
    el.style.removeProperty('--sr-app-ink');
    return;
  }
  el.style.setProperty('--sr-app-accent', accent);
  var ink = inkOn(accent);
  if (ink) el.style.setProperty('--sr-app-ink', ink);
}

/** Une app a-t-elle une palette relevée, donc une démo à montrer ? */
function hasTheme(id) {
  for (var i = 0; i < themes.length; i++) {
    if (themes[i].id === id) return true;
  }
  return false;
}

function normalizeText(value) {
  return String(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Texte dans lequel la recherche pioche. Les FACETTES en font partie, sous
 * leur identifiant ET sous leur libellé traduit : la page affichait une
 * pastille « Supabase 6 » à côté d'un champ où « supabase » ne renvoyait
 * qu'une seule carte — elle se contredisait sous les yeux de qui l'utilise.
 * Le libellé traduit compte autant que l'identifiant : en anglais, on tape
 * « health », pas « sante ».
 */
function searchText(a) {
  return [
    a.id,
    a.name,
    a.description,
    a.category,
    a.category ? categoryLabel(a.category) : '',
    a.backend || 'none',
    backendLabel(a.backend),
    a.platform,
    platformLabel(a.platform),
    (a.configs || []).join(' '),
  ]
    .filter(Boolean)
    .join(' ');
}

/**
 * Applique les critères. `overrides` permet de compter ce que DONNERAIT une
 * facette sans l'appliquer — c'est le nombre affiché sur chaque pastille.
 */
function selectApps(overrides) {
  var facets = {
    maturity: etat.appFacets.maturity,
    backend: etat.appFacets.backend,
    category: etat.appFacets.category,
    config: etat.appFacets.config,
  };
  if (overrides) {
    for (var key in overrides) {
      if (Object.prototype.hasOwnProperty.call(overrides, key)) {
        facets[key] = overrides[key];
      }
    }
  }
  var terms = normalizeText(etat.appQuery).split(/\s+/).filter(Boolean);

  return APPS.filter(function (a) {
    if (facets.maturity !== 'all' && a.maturity !== facets.maturity)
      return false;
    if (facets.category !== 'all' && a.category !== facets.category)
      return false;
    if (facets.backend !== 'all' && (a.backend || 'none') !== facets.backend)
      return false;
    if (facets.config !== 'all') {
      // `none` isole les dépôts qui ne consomment RIEN du paquet — la
      // question la plus intéressante que cette facette sache poser.
      var uses = (a.configs || []).indexOf(facets.config) !== -1;
      if (facets.config === 'none' ? (a.configs || []).length : !uses)
        return false;
    }
    if (!terms.length) return true;
    // Recherche sans diacritiques : « molkky » doit trouver « Mölkky », sinon
    // seule l'orthographe exacte fonctionne — autant ne pas offrir de champ.
    var hay = normalizeText(searchText(a));
    return terms.every(function (term) {
      return hay.indexOf(term) !== -1;
    });
  });
}

function sortedApps(list) {
  var out = list.slice();
  if (etat.appSort === 'name') {
    return out.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });
  }
  if (etat.appSort === 'updated') {
    return out.sort(function (a, b) {
      // Un dépôt sans relevé descend en bas : mieux vaut le dire par sa
      // position que lui inventer une date.
      var ta = Date.parse((REPO_METRICS[a.id] || {}).pushedAt || '') || 0;
      var tb = Date.parse((REPO_METRICS[b.id] || {}).pushedAt || '') || 0;
      return tb - ta || a.name.localeCompare(b.name);
    });
  }
  if (etat.appSort === 'maturity') {
    return out.sort(function (a, b) {
      return (
        MATURITY_RANK[b.maturity] - MATURITY_RANK[a.maturity] ||
        a.name.localeCompare(b.name)
      );
    });
  }
  return out;
}

/**
 * Pastilles de filtre, construites UNE fois par langue. Les reconstruire à
 * chaque clic détruirait le bouton pressé — au clavier, le focus repartirait
 * sur `<body>`. Seuls `aria-pressed` et le compte bougent ensuite.
 */
export function renderAppFacets() {
  var host = document.getElementById('apps-facets');
  if (!host) return;
  host.textContent = '';

  APP_FACETS.forEach(function (facet) {
    var key = facet[0];
    var group = document.createElement('div');
    group.className = 'sr-facet-group';
    group.setAttribute('role', 'group');
    group.setAttribute('aria-labelledby', 'facet-' + key + '-label');

    var label = document.createElement('span');
    label.className = 'sr-facet-label';
    label.id = 'facet-' + key + '-label';
    label.textContent = t(facet[1], facet[2]);
    group.appendChild(label);

    var values = ['all'].concat(facet[3]);
    values.forEach(function (value) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'sr-cat-filter';
      button.dataset.facet = key;
      button.dataset.value = value;
      button.textContent =
        value === 'all' ? t('ui.apps.all', 'Tout') : facet[4](value);

      var badge = document.createElement('span');
      badge.className = 'sr-computed';
      button.appendChild(badge);

      button.addEventListener('click', function () {
        // Re-cliquer la pastille active revient à « Tout » : sans cela, il
        // faut viser une autre cible pour annuler un filtre.
        etat.appFacets[key] = etat.appFacets[key] === value ? 'all' : value;
        renderAppGrid();
        syncUrl();
      });

      group.appendChild(button);
    });

    host.appendChild(group);
  });
}

/**
 * Menu « Consomme… ». Le compte accompagne chaque option : « components.css
 * (1) » raconte l'adoption du paquet mieux qu'un paragraphe.
 */
export function renderAppConfigFilter() {
  var select = document.getElementById('apps-config');
  if (!select) return;
  var usage = CATALOG.configUsage || {};
  select.textContent = '';

  var all = document.createElement('option');
  all.value = 'all';
  all.textContent = t('ui.apps.all', 'Tout');
  select.appendChild(all);

  (CATALOG.configSubpaths || []).forEach(function (subpath) {
    var option = document.createElement('option');
    option.value = subpath;
    option.textContent = subpath + ' (' + (usage[subpath] || 0) + ')';
    select.appendChild(option);
  });

  var none = document.createElement('option');
  none.value = 'none';
  none.textContent = t('ui.apps.consumesNothing', 'Ne consomme rien');
  select.appendChild(none);

  select.value = etat.appFacets.config;
}

/** Grille ou tableau. Le tableau compare seize lignes d'un coup d'œil. */
export function renderAppViewToggle() {
  var host = document.getElementById('apps-view');
  if (!host) return;
  var kept = host.querySelector('.sr-visually-hidden');
  host.textContent = '';
  if (kept) host.appendChild(kept);

  APP_VIEWS.forEach(function (view) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'sr-cat-filter';
    button.dataset.view = view;
    button.setAttribute('aria-pressed', String(etat.appView === view));
    button.textContent =
      view === 'grid'
        ? t('ui.apps.viewGrid', 'Grille')
        : t('ui.apps.viewTable', 'Tableau');
    button.addEventListener('click', function () {
      etat.appView = view;
      host.querySelectorAll('[data-view]').forEach(function (other) {
        other.setAttribute('aria-pressed', String(other.dataset.view === view));
      });
      renderAppGrid();
      syncUrl();
    });
    host.appendChild(button);
  });
}

/**
 * Copier le lien de la vue courante. L'état de la vitrine entrait déjà dans
 * l'URL, mais l'attraper supposait d'aller la lire dans la barre d'adresse —
 * l'affordance manquait, pas la fonctionnalité.
 */
/**
 * De quand datent les mesures ? Une donnée « vivante » sans date est pire
 * qu'une donnée absente : on la croit d'aujourd'hui.
 */
export function renderMetricsDate() {
  var node = document.getElementById('apps-metrics-date');
  if (!node) return;
  var ago = HAS_METRICS ? timeAgo(METRICS.generatedAt) : '';
  node.textContent = ago
    ? t('ui.metrics.date', 'état des dépôts relevé {ago}').replace('{ago}', ago)
    : '';
}

/**
 * Carte d'adoption (symbole → N apps). Les données viennent de
 * `adoption.js` (relevé local) : sans mesure, la section reste masquée.
 */
export function renderAdoption() {
  var host = document.getElementById('apps-adoption');
  var table = document.getElementById('apps-adoption-table');
  var dateNode = document.getElementById('apps-adoption-date');
  var dupsWrap = document.getElementById('apps-adoption-dups-wrap');
  var dupsTable = document.getElementById('apps-adoption-dups');
  var sortSelect = document.getElementById('apps-adoption-sort');
  if (!host || !table) return;
  var data = globalThis.SHOWROOM_ADOPTION;
  var measured = data && typeof data.measured === 'number' ? data.measured : 0;
  if (!measured || !data.bySymbol) {
    host.hidden = true;
    return;
  }
  host.hidden = false;
  if (sortSelect) {
    sortSelect.value = adoptionSort;
    if (!sortSelect.dataset.bound) {
      sortSelect.dataset.bound = '1';
      sortSelect.addEventListener('change', function () {
        adoptionSort = sortSelect.value === 'least' ? 'least' : 'most';
        renderAdoption();
      });
    }
  }
  if (dateNode) {
    var ago = timeAgo(data.generatedAt);
    dateNode.textContent = ago
      ? t('ui.apps.adoptionDate', 'adoption relevée {ago}').replace(
          '{ago}',
          ago
        )
      : '';
  }
  var total = measured;
  var rows = Object.entries(data.bySymbol)
    .map(function (entry) {
      return [entry[0], entry[1].length];
    })
    .sort(function (a, b) {
      var delta = adoptionSort === 'least' ? a[1] - b[1] : b[1] - a[1];
      return delta || a[0].localeCompare(b[0]);
    });
  var tbody = table.querySelector('tbody');
  tbody.textContent = '';
  rows.forEach(function (row) {
    var tr = document.createElement('tr');
    var c1 = document.createElement('td');
    var code = document.createElement('code');
    code.textContent = row[0];
    c1.appendChild(code);
    var c2 = document.createElement('td');
    c2.textContent = String(row[1]);
    c2.title = (data.bySymbol[row[0]] || []).join(', ');
    var c3 = document.createElement('td');
    var pct = total ? Math.round((row[1] / total) * 100) : 0;
    var bar = document.createElement('span');
    bar.className = 'sr-adoption-bar';
    bar.setAttribute('role', 'img');
    bar.setAttribute(
      'aria-label',
      pct +
        '% — ' +
        row[1] +
        '/' +
        total +
        ' ' +
        t('ui.apps.adoptionCount', 'Apps').toLowerCase()
    );
    var fill = document.createElement('span');
    fill.style.width = pct + '%';
    bar.appendChild(fill);
    c3.appendChild(bar);
    tr.appendChild(c1);
    tr.appendChild(c2);
    tr.appendChild(c3);
    tbody.appendChild(tr);
  });
  var dups = data.byDuplicate ? Object.entries(data.byDuplicate) : [];
  if (dupsWrap && dupsTable) {
    if (!dups.length) {
      dupsWrap.hidden = true;
    } else {
      dupsWrap.hidden = false;
      var dupSym = document.getElementById('apps-adoption-dups-symbol');
      var dupCnt = document.getElementById('apps-adoption-dups-count');
      if (dupSym) dupSym.textContent = t('ui.apps.adoptionSymbol', 'Symbole');
      if (dupCnt) dupCnt.textContent = t('ui.apps.adoptionCount', 'Apps');
      var dupRows = dups
        .map(function (entry) {
          return [entry[0], entry[1].length];
        })
        .sort(function (a, b) {
          return b[1] - a[1] || a[0].localeCompare(b[0]);
        });
      var dupBody = dupsTable.querySelector('tbody');
      dupBody.textContent = '';
      dupRows.forEach(function (row) {
        var tr = document.createElement('tr');
        var c1 = document.createElement('td');
        var code = document.createElement('code');
        code.textContent = row[0];
        c1.appendChild(code);
        var c2 = document.createElement('td');
        c2.textContent = String(row[1]);
        c2.title = (data.byDuplicate[row[0]] || []).join(', ');
        tr.appendChild(c1);
        tr.appendChild(c2);
        dupBody.appendChild(tr);
      });
    }
  }
}

export function renderViewChip() {
  var chip = document.getElementById('apps-view-chip');
  if (!chip) return;
  if (!appsFiltersActive()) {
    chip.hidden = true;
    chip.textContent = '';
    return;
  }
  chip.hidden = false;
  chip.textContent = '';
  var label = document.createElement('span');
  label.textContent = t('ui.apps.filtered', 'Vue filtrée');
  var reset = document.createElement('button');
  reset.type = 'button';
  reset.textContent = t('ui.apps.resetChip', 'Réinitialiser');
  reset.addEventListener('click', resetAppsFilters);
  chip.appendChild(label);
  chip.appendChild(reset);
}

export function renderAppShare() {
  var host = document.getElementById('apps-share');
  if (!host) return;
  host.textContent = '';
  host.appendChild(
    copyButton(
      function () {
        return location.href;
      },
      t('ui.apps.share', 'Copier le lien de cette vue')
    )
  );
  renderViewChip();
}

export function renderAppSort() {
  var select = document.getElementById('apps-sort');
  if (!select) return;
  select.textContent = '';
  APP_SORTS.forEach(function (value) {
    var option = document.createElement('option');
    option.value = value;
    option.textContent = sortLabel(value);
    select.appendChild(option);
  });
  select.value = etat.appSort;
}

/**
 * Ce que le dépôt consomme du paquet — la seule chose qu'une vitrine de
 * design system doit vraiment savoir dire de ses dépôts. Replié par défaut :
 * quinze sous-chemins par carte noieraient la description.
 *
 * `<details>` natif plutôt qu'un dépliant maison : clavier, lecteur d'écran
 * et « rechercher dans la page » du navigateur marchent sans une ligne de JS.
 */
function configsBlock(item) {
  var configs = item.configs || [];
  if (!configs.length) {
    var empty = document.createElement('p');
    empty.className = 'sr-app-nodep';
    empty.textContent = t('ui.apps.noConfig', 'Ne consomme rien du paquet.');
    return empty;
  }

  var details = document.createElement('details');
  details.className = 'sr-app-configs';

  var summary = document.createElement('summary');
  summary.textContent = t('ui.apps.configs', '{n} sous-chemins').replace(
    '{n}',
    String(configs.length)
  );
  details.appendChild(summary);

  var list = document.createElement('ul');
  configs.forEach(function (subpath) {
    var li = document.createElement('li');
    var code = document.createElement('code');
    code.textContent = subpath;
    li.appendChild(code);
    list.appendChild(li);
  });
  details.appendChild(list);
  return details;
}

/** Carte d'un dépôt. Deux liens (app, dépôt) et, si elle a une palette
 *  relevée, un bouton qui rhabille la page entière avec. */
function appCard(item) {
  var li = document.createElement('li');
  li.className = 'sr-app';
  // Ancre stable : sans elle, on ne peut partager qu'un filtre, jamais UNE
  // application.
  li.id = 'app-' + item.id;
  li.dataset.maturity = item.maturity;
  if (item.category) li.dataset.category = item.category;
  if (item.backend) li.dataset.backend = item.backend;
  li.dataset.platform = item.platform;

  // Une VRAIE capture prend la place du monogramme quand elle existe. Les
  // deux font la même taille : déposer un fichier ne bouscule pas la grille.
  var shot = SHOTS[item.id];
  if (shot) {
    var thumb = document.createElement('img');
    thumb.className = 'sr-app-shot';
    thumb.src = 'screenshots/' + shot.file;
    thumb.alt = shot.alt || item.name;
    thumb.loading = 'lazy';
    thumb.width = 44;
    thumb.height = 44;
    li.appendChild(thumb);
  } else {
    var mono = document.createElement('span');
    mono.className = 'sr-app-mono';
    mono.setAttribute('aria-hidden', 'true');
    mono.dataset.app = item.id;
    paintMonogram(mono);
    mono.textContent = monogram(item.name);
    li.appendChild(mono);
  }

  var body = document.createElement('div');
  body.className = 'sr-app-body';

  var head = document.createElement('h3');
  head.className = 'sr-app-name';
  head.appendChild(document.createTextNode(item.name));
  var anchor = document.createElement('a');
  anchor.className = 'sr-app-anchor';
  anchor.href = '#app-' + item.id;
  anchor.textContent = '#';
  anchor.setAttribute(
    'aria-label',
    t('ui.apps.permalink', 'Lien direct vers {app}').replace('{app}', item.name)
  );
  head.appendChild(anchor);
  var badge = document.createElement('span');
  badge.dataset.dwc = 'maturity';
  badge.dataset.maturity = item.maturity;
  badge.textContent = maturityLabel(item.maturity);
  head.appendChild(badge);
  body.appendChild(head);

  var desc = document.createElement('p');
  desc.className = 'sr-app-desc';
  desc.textContent = item.description;
  // Le catalogue n'écrit ses descriptions qu'en français (apps-catalog.js) :
  // dans la page anglaise, la lecture d'écran doit le savoir (WCAG 3.1.2).
  if (etat.lang !== 'fr') desc.lang = 'fr';
  body.appendChild(desc);

  var meta = document.createElement('p');
  meta.className = 'sr-app-meta';
  var tags = [
    ['category', item.category ? categoryLabel(item.category) : ''],
    ['backend', backendLabel(item.backend)],
  ];
  // La plateforme n'est affichée que lorsqu'elle SURPREND : quinze PWA et une
  // application desktop, répéter « Web » quinze fois n'apprend rien.
  if (item.platform !== 'web') {
    tags.push(['platform', platformLabel(item.platform)]);
  }
  tags.forEach(function (tag) {
    if (!tag[1]) return;
    var span = document.createElement('span');
    span.className = 'sr-app-tag';
    span.dataset.facet = tag[0];
    span.textContent = tag[1];
    meta.appendChild(span);
  });
  body.appendChild(meta);
  var metrics = metricsBlock(item);
  if (metrics) body.appendChild(metrics);
  body.appendChild(configsBlock(item));

  var actions = document.createElement('p');
  actions.className = 'sr-app-actions';

  var open = document.createElement('a');
  open.className = 'sr-app-link';
  open.href = item.appUrl;
  open.target = '_blank';
  open.rel = 'noopener noreferrer';
  // L'app desktop n'a pas de page publique : son « ouvrir » mène aux
  // releases du dépôt, et le libellé le dit.
  var openLabel =
    item.platform === 'desktop'
      ? t('ui.apps.releases', 'Téléchargements')
      : t('ui.apps.open', 'Ouvrir l’app');
  open.textContent = openLabel;
  open.setAttribute(
    'aria-label',
    openLabel + ' — ' + item.name + ' (' + t('ui.newTab', 'nouvel onglet') + ')'
  );
  actions.appendChild(open);

  var repo = document.createElement('a');
  repo.className = 'sr-app-link';
  repo.href = item.repoUrl;
  repo.target = '_blank';
  repo.rel = 'noopener noreferrer';
  repo.textContent = t('ui.apps.repo', 'Dépôt');
  repo.setAttribute(
    'aria-label',
    t('ui.apps.repo', 'Dépôt') +
      ' — ' +
      item.name +
      ' (' +
      t('ui.newTab', 'nouvel onglet') +
      ')'
  );
  actions.appendChild(repo);

  if (hasTheme(item.id)) {
    var demo = document.createElement('button');
    demo.type = 'button';
    demo.className = 'sr-app-link';
    demo.dataset.demo = item.id;
    demo.textContent = t('ui.apps.theme', 'Habiller la page');
    demo.setAttribute(
      'aria-pressed',
      item.id === etat.currentTheme.id ? 'true' : 'false'
    );
    demo.addEventListener('click', function () {
      rappels.selectTheme(themeById(item.id));
    });
    actions.appendChild(demo);
  }

  body.appendChild(actions);
  li.appendChild(body);
  return li;
}

/**
 * Vue tableau : seize lignes, cinq colonnes, tout comparable d'un coup
 * d'œil. La grille montre les apps une par une ; le tableau montre la
 * FAMILLE — deux questions différentes, deux formes.
 */
function renderAppTable(shown) {
  var table = document.getElementById('apps-table');
  if (!table) return;
  table.textContent = '';

  var columns = [
    t('ui.apps.th.app', 'Application'),
    t('ui.apps.facet.maturity', 'Maturité'),
    t('ui.apps.facet.backend', 'Persistance'),
    t('ui.apps.facet.category', 'Domaine'),
    t('ui.apps.th.configs', 'Sous-chemins'),
  ];
  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  columns.forEach(function (label) {
    var th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  shown.forEach(function (item) {
    var tr = document.createElement('tr');

    var th = document.createElement('th');
    th.scope = 'row';
    var link = document.createElement('a');
    link.href = item.repoUrl;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = item.name;
    th.appendChild(link);
    tr.appendChild(th);

    [
      maturityLabel(item.maturity),
      backendLabel(item.backend),
      item.category ? categoryLabel(item.category) : '—',
      String((item.configs || []).length),
    ].forEach(function (value) {
      var td = document.createElement('td');
      td.textContent = value;
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  // Sous `sm`, les tableaux du showroom deviennent des cartes : chaque
  // cellule doit porter l'en-tête de sa colonne.
  labelTableCells();
}

export function renderAppGrid() {
  var grid = document.getElementById('apps-grid');
  var count = document.getElementById('apps-count');
  if (!grid || !count) return;

  var shown = sortedApps(selectApps(null));
  var wrap = document.getElementById('apps-table-wrap');
  var asTable = etat.appView === 'table' && shown.length > 0;
  if (wrap) wrap.hidden = !asTable;
  grid.hidden = asTable;
  grid.textContent = '';
  if (asTable) {
    renderAppTable(shown);
    renderAppCount(count, shown.length);
    syncAppFacets();
    renderViewChip();
    return;
  }

  if (!shown.length) {
    var empty = document.createElement('li');
    empty.className = 'sr-app-empty';
    var text = document.createElement('span');
    text.textContent = t(
      'ui.apps.none',
      'Aucune application ne correspond à ces critères.'
    );
    empty.appendChild(text);
    var reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'sr-app-link';
    reset.textContent = t('ui.apps.reset', 'Tout réafficher');
    reset.addEventListener('click', function () {
      resetAppsFilters();
      var cmd = document.getElementById('sr-cmd');
      if (cmd) cmd.focus();
    });
    empty.appendChild(reset);
    grid.appendChild(empty);
  } else {
    shown.forEach(function (item) {
      grid.appendChild(appCard(item));
    });
  }

  renderAppCount(count, shown.length);
  syncAppFacets();
  renderViewChip();
  // La vue tableau et le panneau d'adoption apparaissent ici : leurs
  // boîtes défilantes doivent recevoir focus et nom à ce moment-là.
  scheduleScrollLabels();
}

function renderAppCount(node, n) {
  node.textContent =
    n === APPS.length
      ? t('ui.apps.total', '{n} applications').replace('{n}', String(n))
      : t('ui.apps.shown', '{n} sur {total}')
          .replace('{n}', String(n))
          .replace('{total}', String(APPS.length));
}

/**
 * État pressé et compte de chaque pastille, SANS reconstruire les boutons.
 * Le compte est celui qu'obtiendrait un clic : les autres facettes et la
 * recherche restent appliquées, seule la facette du groupe est remplacée.
 */
function syncAppFacets() {
  var host = document.getElementById('apps-facets');
  if (!host) return;
  host.querySelectorAll('.sr-cat-filter').forEach(function (button) {
    var key = button.dataset.facet;
    var value = button.dataset.value;
    button.setAttribute('aria-pressed', String(etat.appFacets[key] === value));
    var override = {};
    override[key] = value;
    var badge = button.querySelector('.sr-computed');
    if (badge) badge.textContent = String(selectApps(override).length);
  });
}

/**
 * Suit une bascule de thème sans reconstruire la grille : recolorer les
 * pastilles et déplacer `aria-pressed` suffit, et le bouton qui vient d'être
 * activé garde le focus.
 */
export function syncAppGrid() {
  document.querySelectorAll('#apps-grid .sr-app-mono').forEach(paintMonogram);
  document
    .querySelectorAll('#apps-grid [data-demo]')
    .forEach(function (button) {
      button.setAttribute(
        'aria-pressed',
        button.dataset.demo === etat.currentTheme.id ? 'true' : 'false'
      );
    });
}
