/*
 * Le showroom : l'amorçage. Ce module importe les autres, lit l'état de
 * départ (l'URL, puis le stockage), branche les commandes de la page et rend
 * ce qui est engendré.
 *
 * Le contrat de thème est celui du hook `useTheme` du paquet :
 * `light | dark | system`, attribut `data-theme` posé sur <html>. Le choix
 * est rangé sous `dwc_showroom_scheme` et non sous `dwc_theme` : cette clé
 * est celle de toute la famille, sur la même origine.
 *
 * Tout import reste DANS `showroom/`, le seul dossier que publie Pages ;
 * `./command.js` est la copie octet pour octet que pose `npm run sync`.
 * Les modules forment un graphe sans cycle : les empreintes de cache
 * (`?v=`) se calculent des feuilles vers la racine.
 *
 * Jusqu'au 06/10/2026, tout tenait dans une seule fonction de 6 600 lignes.
 */

import {
  APP_KEY,
  etat,
  LANG_KEY,
  paramOr,
  read,
  SCHEME_KEY,
  syncUrl,
  write,
} from './etat.js?v=542f37cc5d';
import { applyLang, browserLang } from './langue.js?v=d92afbcf3f';
import { applyDensity, themeById } from './communs.js?v=9f5191d160';
import {
  revelerAncre,
  setupCompactHeader,
  setupPrefs,
  setupSommaire,
  syncPrefsBadge,
  watchRail,
} from './navigation.js?v=bed0b21921';
import { measure } from './mesures.js?v=4e4329c849';
import { setupConfirmDemo, setupSheet } from './modales.js?v=45ebf95b5b';
import { renderCatalogueIndex } from './fiches.js?v=7a128b2142';
import { scheduleScrollLabels } from './tableaux.js?v=ab72120a8e';
import { renderAppGrid, renderViewChip } from './vitrine.js?v=0ce4105834';
import { applyFocusFromUrl } from './comparaison.js?v=836d88c6e5';
import {
  applyScheme,
  applyTheme,
  fillThemeSelect,
  selectTheme,
  setupCheatsheet,
  setupDock,
  setupInspect,
  setupNews,
  setupSectionFocus,
  setupThemePicker,
  syncSchemeInputs,
} from './habillage.js?v=39c29a9e63';
import { setupPresent, setupTour } from './visite.js?v=50a5797252';
import { setupExportCss, setupExportReview } from './exports.js?v=ca8809fcbd';
import { setupRecipes } from './recettes.js?v=5aff704b0a';
import { setupChecklist } from './checklist.js?v=f355de422d';
import { renderGenerated, retranslate } from './rendu.js?v=82aa0a4420';
import { setupScenes } from './scenes.js?v=c0f2d7f137';
import { setupCommand } from './recherche.js?v=0a4106a3d7';

var select = document.getElementById('theme-app');
etat.currentScheme = paramOr('scheme', read(SCHEME_KEY, 'system'));
etat.currentTheme = themeById(paramOr('app', read(APP_KEY, 'generic')));

fillThemeSelect(select);
if (select) {
  select.addEventListener('change', function () {
    selectTheme(themeById(select.value));
  });
}

document.querySelectorAll('input[name="scheme"]').forEach(function (input) {
  input.addEventListener('change', function () {
    if (!input.checked) return;
    etat.currentScheme = input.value;
    write(SCHEME_KEY, etat.currentScheme);
    applyScheme(etat.currentScheme, etat.currentTheme);
    applyTheme(etat.currentTheme);
    syncPrefsBadge();
    syncUrl();
  });
});

window
  .matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', function () {
    if (etat.currentScheme !== 'system') return;
    applyScheme(etat.currentScheme, etat.currentTheme);
    applyTheme(etat.currentTheme);
  });

window.addEventListener('resize', measure, { passive: true });

// Les listes de sélecteurs CSS vivent dans des `<details>` repliés. À
// l'impression, elles manqueraient : le contenu d'un `<details>` fermé est
// masqué par le navigateur d'une façon qu'aucune règle CSS ne défait. On
// ouvre donc avant, et on restaure après — l'écran ne doit rien y perdre.
window.addEventListener('beforeprint', function () {
  document.querySelectorAll('details:not([open])').forEach(function (el) {
    el.dataset.srPrintOpened = '';
    el.open = true;
  });
});

window.addEventListener('afterprint', function () {
  document
    .querySelectorAll('details[data-sr-print-opened]')
    .forEach(function (el) {
      el.open = false;
      delete el.dataset.srPrintOpened;
    });
});

// Recherche de l'index : `input` et non `change`, pour que la grille suive
// la frappe. Le filtre par catégorie, lui, se recâble à chaque rendu.
var catSearch = document.getElementById('cat-search');
if (catSearch) {
  catSearch.addEventListener('input', function () {
    etat.catQuery = catSearch.value;
    renderCatalogueIndex();
  });
}

// Vitrine : la recherche vit dans la commande d'en-tête (Ctrl+K). Le tri
// et les facettes restent ici — un lien « apps Supabase en bêta » doit
// encore montrer ce qu'il promet.
var appConfigSelect = document.getElementById('apps-config');
if (appConfigSelect) {
  appConfigSelect.addEventListener('change', function () {
    etat.appFacets.config = appConfigSelect.value;
    renderAppGrid();
    syncUrl();
  });
}

var appSortSelect = document.getElementById('apps-sort');
if (appSortSelect) {
  appSortSelect.addEventListener('change', function () {
    etat.appSort = appSortSelect.value;
    renderAppGrid();
    renderViewChip();
    syncUrl();
  });
}

setupSheet();
setupConfirmDemo();

// Les formulaires des démos (LoginForm, MfaChallenge) ne doivent rien
// envoyer. Ils le disaient par `onsubmit="return false;"`, un gestionnaire
// en ligne que la CSP refuse : la page aurait alors tenté une soumission,
// refusée à son tour par `form-action 'none'`. Un seul écouteur délégué.
// Les `<form method="dialog">` de la page, eux, gardent leur fermeture.
document.addEventListener('submit', function (event) {
  var form = event.target;
  if (form instanceof HTMLFormElement && form.closest('.sr-demo-stage')) {
    event.preventDefault();
  }
});

// Langue : préférence stockée, sinon celle du navigateur, sinon français.
// Même forme que le schéma : deux radios, le code langue en icône.
var storedLang = paramOr('lang', read(LANG_KEY, ''));
var initialLang = storedLang || browserLang();

document.querySelectorAll('input[name="lang"]').forEach(function (input) {
  input.checked = input.value === initialLang;
  input.addEventListener('change', function () {
    if (!input.checked) return;
    write(LANG_KEY, input.value);
    applyLang(input.value);
    retranslate();
    syncPrefsBadge();
    syncUrl();
  });
});

document.querySelectorAll('input[name="density"]').forEach(function (input) {
  input.addEventListener('change', function () {
    if (!input.checked) return;
    etat.currentDensity = applyDensity(input.value);
    syncUrl();
  });
});

watchRail();
setupSommaire();
setupCompactHeader();
document.addEventListener(
  'toggle',
  function (event) {
    if (event.target instanceof HTMLDetailsElement && event.target.open) {
      scheduleScrollLabels();
    }
  },
  true
);
window.addEventListener('resize', scheduleScrollLabels, { passive: true });
setupPrefs();
setupThemePicker();
setupDock();
setupCheatsheet();
setupExportReview();
setupTour();
setupScenes();
setupPresent();
setupRecipes();
setupExportCss();
setupChecklist();

etat.currentDensity = applyDensity(etat.currentDensity);
applyScheme(etat.currentScheme, etat.currentTheme);
syncSchemeInputs(etat.currentScheme, etat.currentTheme);
applyLang(initialLang);
renderGenerated();
setupNews();
setupInspect();
setupSectionFocus();
syncPrefsBadge();
syncUrl();
setupCommand();
window.addEventListener('hashchange', revelerAncre);
revelerAncre();
applyFocusFromUrl();
