/*
 * Les palettes d'un thème, résolues : celle d'une app vient de `themes.js`,
 * celle du thème générique est relue une seule fois dans `showroom.css`.
 * Et la peinture d'une palette sur un aperçu, que partagent la comparaison,
 * la galerie et l'habillage.
 */

import { paletteChrome, VARIABLES_CHROME } from './contraste.js?v=286644156b';
import { root } from './etat.js?v=542f37cc5d';
import { ROLES } from './communs.js?v=9f5191d160';

/**
 * Peint un conteneur avec une palette donnée.
 *
 * Il faut poser `--ds-*` ET `--dwc-*` : le mappage `--dwc-x: var(--ds-x)`
 * est déclaré sur `:root`, donc RÉSOLU à ce niveau. Redéfinir `--ds-x` plus
 * bas dans l'arbre ne le recalcule pas — les composants garderaient les
 * couleurs de la page.
 */
export function paintPalette(el, palette, scheme) {
  ROLES.forEach(function (role) {
    var value = palette[role[0]];
    if (!value) return;
    el.style.setProperty(role[1], value);
    el.style.setProperty(role[1].replace('--ds-', '--dwc-'), value);
  });
  el.style.setProperty('--dwc-radius', 'var(--ds-radius)');
  el.style.colorScheme = scheme;
  // Le chrome posé DANS ce panneau (valeurs, libellés) lit les encres de
  // SA palette, pas celles de la page : un panneau sombre dans une page
  // claire hériterait sinon d'une encre faite pour un fond clair.
  try {
    var chrome = paletteChrome(palette);
    VARIABLES_CHROME.forEach(function (paire) {
      el.style.setProperty(paire[1], chrome[paire[0]]);
    });
  } catch {
    /* palette non hexadécimale : les encres de la page restent */
  }
}

export function paletteForTheme(theme, scheme) {
  if (!theme) return null;
  if (theme.usesCssDefaults) {
    return readGenericPalettes()[scheme];
  }
  return theme[scheme] || theme.dark || theme.light || null;
}

/**
 * Palette du thème générique, lue dans la feuille de style : elle n'existe
 * nulle part ailleurs, et la recopier en JS créerait la dérive qu'on évite
 * partout ailleurs.
 *
 * La lecture se fait sur `<html>`, pas sur une sonde détachée : les valeurs
 * sombres sont déclarées par `:root[data-theme='dark']`, un sélecteur qui ne
 * matche QUE l'élément racine. On bascule donc l'attribut, on lit, on
 * restaure — le tout dans la même tâche, donc sans repeint intermédiaire.
 */
/**
 * Les palettes du thème générique, telles que les définit showroom.css.
 *
 * Elles étaient relues à chaque rendu en basculant deux fois `data-theme`
 * sur `<html>` : deux restylages complets de la page, quatre fois par
 * changement de langue. Et sous un thème d'app, la lecture voyait les
 * surcharges en ligne de ce thème au lieu des valeurs génériques. Le cliché
 * ôte ces surcharges, et il est pris une seule fois.
 */
export function readGenericPalettes() {
  return snapshotGenericPalettes();
}

/**
 * Palette du thème générique, lue dans la feuille : elle n'existe pas dans
 * `themes.js`. On retire d'abord les surcharges inline, sinon la lecture
 * renverrait le thème d'app en cours.
 */
var genericSnapshot = null;
function snapshotGenericPalettes() {
  if (genericSnapshot) return genericSnapshot;
  var previous = root.getAttribute('data-theme');
  var saved = ROLES.map(function (role) {
    return [role[1], root.style.getPropertyValue(role[1])];
  });
  var bgImage = root.style.getPropertyValue('--ds-bg-image');
  ROLES.forEach(function (role) {
    root.style.removeProperty(role[1]);
  });
  root.style.removeProperty('--ds-bg-image');

  var out = {};
  ['light', 'dark'].forEach(function (scheme) {
    root.setAttribute('data-theme', scheme);
    var styles = getComputedStyle(root);
    var palette = {};
    ROLES.forEach(function (role) {
      palette[role[0]] = styles.getPropertyValue(role[1]).trim();
    });
    out[scheme] = palette;
  });

  if (previous) root.setAttribute('data-theme', previous);
  saved.forEach(function (pair) {
    if (pair[1]) root.style.setProperty(pair[0], pair[1]);
    else root.style.removeProperty(pair[0]);
  });
  if (bgImage) root.style.setProperty('--ds-bg-image', bgImage);
  genericSnapshot = out;
  return out;
}

/** Schéma dans lequel montrer une app : le schéma de la page, sauf si
 *  l'app n'en a qu'un (qowa et quota sont sombres seules). */
export function schemeForTheme(theme) {
  var pageDark = root.getAttribute('data-theme') === 'dark';
  if (theme.schemes.indexOf('light') === -1) return 'dark';
  if (theme.schemes.indexOf('dark') === -1) return 'light';
  return pageDark ? 'dark' : 'light';
}

export function paletteOf(theme, scheme) {
  if (theme.usesCssDefaults) return snapshotGenericPalettes()[scheme];
  return theme[scheme];
}
