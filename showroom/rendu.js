/*
 * Ce que le script ENGENDRE dans la page : tout rendre au chargement
 * (`renderGenerated`), ou seulement réécrire le texte au changement de
 * langue (`retranslate`), sans repeindre la palette ni remesurer la page.
 */

import { etat } from './etat.js?v=542f37cc5d';
import { t } from './langue.js?v=d92afbcf3f';
import { syncHeaderOffset } from './navigation.js?v=bed0b21921';
import { measure, renderViewportTwin } from './mesures.js?v=4e4329c849';
import { measureTargets } from './controles.js?v=f6572eb5d8';
import {
  BADGE_TONES,
  BADGE_VARIANTS,
  buildMatrix,
  BUTTON_COLUMNS,
  BUTTON_VARIANTS,
  makeBadge,
  makeButton,
} from './primitives.js?v=65b65fa9c3';
import {
  renderCatalogueFilters,
  renderCatalogueIndex,
  renderComponentDocs,
  renderDecisions,
  renderHooks,
} from './fiches.js?v=7a128b2142';
import {
  attachTokenCopies,
  labelTableCells,
  scheduleScrollLabels,
} from './tableaux.js?v=ab72120a8e';
import {
  renderAdoption,
  renderAppConfigFilter,
  renderAppFacets,
  renderAppGrid,
  renderAppShare,
  renderAppSort,
  renderAppViewToggle,
  renderMetricsDate,
} from './vitrine.js?v=0ce4105834';
import { renderPlayground } from './bac-a-sable.js?v=af82689c34';
import { renderForcedColors } from './contraste-force.js?v=7e08df9ad3';
import { setupPairCompare } from './comparaison.js?v=836d88c6e5';
import {
  renderDemoCurrent,
  renderDemoStage,
  setupContrastCampaign,
  setupDemoSplit,
} from './galerie.js?v=6fe79b8a24';
import {
  applyTheme,
  fillThemeSelect,
  renderRecent,
  renderThemeDependents,
  renderThemeGrid,
} from './habillage.js?v=39c29a9e63';
import { renderChecklist } from './checklist.js?v=f355de422d';
import { renderFamilyApps } from './famille.js?v=a526879827';

// Les matrices doivent exister AVANT la première mesure : les contrôles
// a11y s'appuient sur les éléments réellement présents dans le document.
// Tout ce qui est ENGENDRÉ doit être reconstruit à chaque changement de
// langue : les matrices, la grille famille, la palette et les mesures
// portent des libellés traduits.
/**
 * Changement de langue : réécrire le TEXTE engendré, sans réappliquer la
 * palette ni remesurer les jetons de la page. Rejouer tout
 * `renderGenerated` coûtait 240 à 500 ms par bascule (mesuré le
 * 05/10/2026), surtout en styles recalculés et en mises en page forcées.
 * Les mesures (`measure`) ne dépendent pas de la langue : seul le tableau
 * des cibles, qui porte des verdicts traduits, est réécrit.
 */
export function retranslate() {
  buildMatrix(
    document.getElementById('button-matrix'),
    t('ui.matrix.variant', 'Variante'),
    BUTTON_VARIANTS,
    BUTTON_COLUMNS,
    makeButton,
    'ui.button.'
  );
  buildMatrix(
    document.getElementById('badge-matrix'),
    t('ui.matrix.tone', 'Ton'),
    BADGE_TONES,
    BADGE_VARIANTS,
    makeBadge,
    'ui.tone.'
  );
  renderFamilyApps();
  renderComponentDocs();
  renderDecisions();
  renderHooks();
  renderCatalogueFilters();
  renderCatalogueIndex();
  renderAppFacets();
  renderAppConfigFilter();
  renderAppViewToggle();
  renderAppSort();
  renderAppShare();
  renderMetricsDate();
  renderAdoption();
  renderAppGrid();
  renderPlayground();
  renderForcedColors();
  fillThemeSelect(document.getElementById('theme-app'));
  fillThemeSelect(document.getElementById('theme-app-dock'));
  renderThemeGrid();
  renderThemeDependents(etat.currentTheme);
  renderRecent();
  setupContrastCampaign();
  renderChecklist();
  renderViewportTwin();
  measureTargets();
  labelTableCells();
  attachTokenCopies();
  scheduleScrollLabels();
}

export function renderGenerated() {
  buildMatrix(
    document.getElementById('button-matrix'),
    t('ui.matrix.variant', 'Variante'),
    BUTTON_VARIANTS,
    BUTTON_COLUMNS,
    makeButton,
    'ui.button.'
  );
  buildMatrix(
    document.getElementById('badge-matrix'),
    t('ui.matrix.tone', 'Ton'),
    BADGE_TONES,
    BADGE_VARIANTS,
    makeBadge,
    'ui.tone.'
  );
  renderFamilyApps();
  renderDemoCurrent();
  renderDemoStage();
  renderComponentDocs();
  renderDecisions();
  renderHooks();
  renderCatalogueFilters();
  renderCatalogueIndex();
  renderAppFacets();
  renderAppConfigFilter();
  renderAppViewToggle();
  renderAppSort();
  renderAppShare();
  renderMetricsDate();
  renderAdoption();
  renderAppGrid();
  renderPlayground();
  renderForcedColors();
  setupPairCompare();
  fillThemeSelect(document.getElementById('theme-app'));
  fillThemeSelect(document.getElementById('theme-app-dock'));
  renderThemeGrid();
  setupDemoSplit();
  applyTheme(etat.currentTheme);
  renderRecent();
  setupContrastCampaign();
  renderChecklist();
  renderViewportTwin();
  measure();
  // Après le rendu : les tableaux engendrés doivent être étiquetés eux aussi.
  labelTableCells();
  attachTokenCopies();
  scheduleScrollLabels();
  // L'en-tête vient d'être rempli (thème courant, habillages récents) : sa
  // hauteur a pu changer depuis la première mesure.
  syncHeaderOffset();
}
