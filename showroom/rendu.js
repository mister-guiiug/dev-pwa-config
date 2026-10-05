/*
 * Ce que le script ENGENDRE dans la page : tout rendre au chargement
 * (`renderGenerated`), ou seulement réécrire le texte au changement de
 * langue (`retranslate`), sans repeindre la palette ni remesurer la page.
 */

import { etat } from './etat.js?v=542f37cc5d';
import { t } from './langue.js?v=d92afbcf3f';
import { syncHeaderOffset } from './navigation.js?v=1ee0f765a8';
import { measure, renderViewportTwin } from './mesures.js?v=773565962c';
import { measureTargets } from './controles.js?v=b9fcfeb8a4';
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
} from './vitrine.js?v=32fd06c619';
import { renderPlayground } from './bac-a-sable.js?v=7c50e94346';
import { renderForcedColors } from './contraste-force.js?v=3b736cf205';
import { setupPairCompare } from './comparaison.js?v=a3ca09a590';
import {
  renderDemoCurrent,
  renderDemoStage,
  setupContrastCampaign,
  setupDemoSplit,
} from './galerie.js?v=2095bea587';
import {
  applyTheme,
  fillThemeSelect,
  renderRecent,
  renderThemeDependents,
  renderThemeGrid,
} from './habillage.js?v=fa63e171e2';
import { renderChecklist } from './checklist.js?v=b999ff683c';
import { renderFamilyApps } from './famille.js?v=ee51f606b4';

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
