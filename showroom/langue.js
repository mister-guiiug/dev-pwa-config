/*
 * La langue de la page : `t()`, la bascule, et les comptes de la prose.
 *
 * Le français n'est pas dans un dictionnaire : c'est le HTML lui-même,
 * capturé au chargement. On ne maintient donc qu'UNE langue en double, et
 * la page reste juste sans JavaScript.
 *
 * La capture a lieu à l'évaluation de ce module. Aucun module ne touche au
 * texte de la page avant l'amorçage de showroom.js, qui vient après.
 */

import { etat, root } from './etat.js?v=542f37cc5d';

var DICTS = globalThis.SHOWROOM_I18N || {};
export var LANGS = ['fr'].concat(Object.keys(DICTS));
var originalHtml = {};
etat.lang = 'fr';

document.querySelectorAll('[data-i18n]').forEach(function (el) {
  originalHtml[el.dataset.i18n] = el.innerHTML;
});

// Les noms accessibles posés en dur (`aria-label`) se traduisent aussi :
// `data-i18n-aria` existait dans la page sans que rien ne le lise, et les
// régions nommées restaient en français dans la page anglaise.
var originalAria = {};
document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
  originalAria[el.dataset.i18nAria] = el.getAttribute('aria-label') || '';
});

/** Traduit une clé ; `fallback` est le libellé français par défaut. */
export function t(key, fallback) {
  if (etat.lang === 'fr') return fallback;
  var value = (DICTS[etat.lang] || {})[key];
  return value === undefined ? fallback : value;
}

export function applyLang(next) {
  etat.lang = LANGS.indexOf(next) === -1 ? 'fr' : next;
  var dict = etat.lang === 'fr' ? originalHtml : DICTS[etat.lang] || {};
  document.querySelectorAll('[data-i18n]').forEach(function (el) {
    var value = dict[el.dataset.i18n];
    // Clé absente d'une traduction : on garde le français plutôt que de
    // vider le bloc — une page trouée est pire qu'une page mixte.
    if (value === undefined && etat.lang !== 'fr') {
      value = originalHtml[el.dataset.i18n];
    }
    // Seulement ce qui change. Au chargement en français, chacun des quelque
    // 340 blocs était remplacé par lui-même : des nœuds recréés et remis en
    // page pour rien, juste après le premier affichage.
    if (value !== undefined && el.innerHTML !== value) el.innerHTML = value;
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
    var key = el.dataset.i18nAria;
    var value = etat.lang === 'fr' ? undefined : (DICTS[etat.lang] || {})[key];
    el.setAttribute(
      'aria-label',
      value === undefined ? originalAria[key] : value
    );
  });
  root.lang = etat.lang;
  var codeLangue = document.getElementById('sr-prefs-lang');
  if (codeLangue) codeLangue.textContent = etat.lang.toUpperCase();
  // L'icône est le visage du bouton ; le titre reprend le mot traduit,
  // celui que le nom accessible porte déjà.
  document.querySelectorAll('.sr-segmented label').forEach(function (label) {
    var name = label.querySelector('.sr-visually-hidden');
    if (name) label.title = name.textContent.trim();
  });
  var cmdInput = document.getElementById('sr-cmd');
  if (cmdInput) cmdInput.placeholder = t('ui.cmd.placeholder', 'Rechercher…');
  var dockLabel = document.querySelector('.sr-dock-label');
  if (dockLabel) dockLabel.textContent = t('topbar.themeLabel', 'Habiller');
  fillCounts();
}

/**
 * Les comptes de la prose, calculés depuis le catalogue (`apps.js`).
 * « Seize dépôts, dont quinze » et « un adoptant sur seize » étaient écrits
 * à la main, en français comme en anglais, et faux depuis des semaines :
 * 21 apps, toutes consommatrices, 19 adoptants de `components.css` (le
 * champ que lit le filtre « Consomme » juste à côté). Le texte porte des
 * `<span data-count>` ; on les remplit ici, à chaque langue.
 */
function fillCounts() {
  var apps = (globalThis.SHOWROOM_APPS || {}).apps || [];
  var counts = {
    apps: apps.length,
    consumers: apps.filter(function (a) {
      return (a.configs || []).length > 0;
    }).length,
    'components-css': apps.filter(function (a) {
      return (a.configs || []).indexOf('components.css') !== -1;
    }).length,
  };
  document.querySelectorAll('[data-count]').forEach(function (el) {
    var valeur = counts[el.dataset.count];
    if (valeur === undefined) return;
    if (el.textContent !== String(valeur)) el.textContent = String(valeur);
  });
}

export function browserLang() {
  var code = (navigator.language || 'fr').slice(0, 2);
  return LANGS.indexOf(code) === -1 ? 'fr' : code;
}
