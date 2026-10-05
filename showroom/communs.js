/*
 * Ce que plusieurs parties de la page partagent, sans état propre : les
 * rôles d'une palette, les libellés de maturité, l'icône d'un schéma, le
 * thème d'un identifiant et son nom affiché, la densité, les captures
 * d'écran, et trois aides de balisage (`jsx`, `attr`, `dwc`) qui servent
 * au bac à sable comme au contraste forcé.
 */

import { DENSITY_KEY, root, themes, write } from './etat.js?v=542f37cc5d';
import { t } from './langue.js?v=d92afbcf3f';
import { syncHeaderOffset } from './navigation.js?v=bed0b21921';

// Rôle sémantique → variable CSS + libellé. `on` désigne la couleur sur
// laquelle le rôle est censé être posé (calcul du contraste WCAG).
export var ROLES = [
  ['bg', '--ds-bg', 'Fond', 'Arrière-plan de page'],
  ['surface', '--ds-surface', 'Surface', 'Cartes, panneaux, barres'],
  ['surface2', '--ds-surface-2', 'Surface 2', 'Zones en retrait, en-têtes'],
  ['border', '--ds-border', 'Bordure', 'Séparateurs, contours de champ'],
  ['text', '--ds-text', 'Texte', 'Contenu principal', '--ds-surface'],
  [
    'textSoft',
    '--ds-text-soft',
    'Texte atténué',
    'Légendes, aides',
    '--ds-surface',
  ],
  ['primary', '--ds-primary', 'Primaire', 'Action principale, sélection'],
  [
    'primaryContrast',
    '--ds-primary-contrast',
    'Sur primaire',
    'Texte posé sur la primaire',
    '--ds-primary',
  ],
  [
    'primarySoft',
    '--ds-primary-soft',
    'Primaire douce',
    'Fonds teintés, pastilles',
  ],
  ['accent', '--ds-accent', 'Accent', 'Second plan de marque'],
  ['success', '--ds-success', 'Succès', 'Validé, crédit, en ligne'],
  ['warning', '--ds-warning', 'Avertissement', 'En attente, dégradé'],
  ['danger', '--ds-danger', 'Danger', 'Erreur, suppression, débit'],
  ['info', '--ds-info', 'Information', 'Neutre, contextuel, aide'],
];

// Maturités RÉELLES (apps-catalog.js) pour la démo FamilyApps : montre les
// trois badges sans dupliquer le catalogue.
export var DEMO_APPS = [
  ['miss-carbook', 'stable'],
  ['mister-doc', 'beta'],
  ['miss-badminton', 'alpha'],
];
var MATURITY_FR = { alpha: 'Alpha', beta: 'Bêta', stable: 'Stable' };
export function maturityLabel(m) {
  return t('ui.maturity.' + m, MATURITY_FR[m]);
}

export var SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * Les trois dessins de `react/icons.js` (`SunIcon`, `MoonIcon`,
 * `SystemIcon`) : même boîte, même trait. Le showroom ne peut pas importer
 * le module, il rejoue les tracés.
 */
var SCHEME_ICON = {
  light:
    '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>',
  dark: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>',
  system:
    '<rect x="2" y="4" width="20" height="13" rx="2"></rect><path d="M8 21h8M12 17v4"></path>',
};

export function schemeIcon(kind) {
  var svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', 'sr-ico');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = SCHEME_ICON[kind] || SCHEME_ICON.system;
  return svg;
}

export function applyDensity(next) {
  var value = next === 'compact' ? 'compact' : 'comfort';
  root.setAttribute('data-density', value);
  document.querySelectorAll('input[name="density"]').forEach(function (input) {
    input.checked = input.value === value;
  });
  write(DENSITY_KEY, value);
  syncHeaderOffset();
  return value;
}

export function themeById(id) {
  for (var i = 0; i < themes.length; i++) {
    if (themes[i].id === id) return themes[i];
  }
  return themes[0];
}

export function themeDisplayName(theme) {
  return t('theme.' + theme.id + '.name', theme.name);
}

/** Assemble un appel JSX, sur une ligne tant que ça tient. */
export function jsx(name, attrs, children) {
  var list = attrs.filter(Boolean);
  var head = '<' + name + (list.length ? ' ' + list.join(' ') : '');
  var flat =
    head + (children == null ? ' />' : '>' + children + '</' + name + '>');
  if (flat.length <= 74 && flat.indexOf('\n') === -1) return flat;

  var open =
    '<' +
    name +
    '\n  ' +
    list.join('\n  ') +
    '\n' +
    (children == null ? '/>' : '>');
  if (children == null) return open;
  return (
    open +
    '\n  ' +
    String(children).split('\n').join('\n  ') +
    '\n</' +
    name +
    '>'
  );
}

export function attr(name, value) {
  return value === true ? name : name + '="' + value + '"';
}

/** Élément avec attributs `data-dwc` — le balisage exact des composants. */
export function dwc(tag, name, attrs) {
  var node = document.createElement(tag);
  node.dataset.dwc = name;
  Object.keys(attrs || {}).forEach(function (key) {
    if (attrs[key] === false || attrs[key] == null) return;
    node.setAttribute(key, attrs[key] === true ? '' : attrs[key]);
  });
  return node;
}

export var SHOTS = globalThis.SHOWROOM_SCREENSHOTS || {};
