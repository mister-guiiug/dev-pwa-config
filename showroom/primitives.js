/*
 * Les matrices de primitives : Button dans chaque variante, taille et état,
 * Badge dans chaque ton et variante, avec le balisage exact des composants.
 */

import { t } from './langue.js?v=d92afbcf3f';

export var BUTTON_VARIANTS = [
  ['primary', 'Primaire'],
  ['secondary', 'Secondaire'],
  ['outline', 'Contour'],
  ['ghost', 'Fantôme'],
  ['danger', 'Danger'],
];

// Colonnes = tailles puis états. Les états sont testés en taille `md`.
export var BUTTON_COLUMNS = [
  {
    key: 'sm',
    head: 'sm',
    props: { size: 'sm' },
    label: 'Petit',
    i18n: 'ui.button.small',
  },
  {
    key: 'md',
    head: 'md',
    props: { size: 'md' },
    label: 'Moyen',
    i18n: 'ui.button.medium',
  },
  {
    key: 'lg',
    head: 'lg',
    props: { size: 'lg' },
    label: 'Grand',
    i18n: 'ui.button.large',
  },
  {
    key: 'loading',
    head: 'loading',
    props: { size: 'md', loading: true },
    label: 'Envoi…',
    i18n: 'ui.button.sending',
  },
  {
    key: 'disabled',
    head: 'disabled',
    props: { size: 'md', disabled: true },
    label: 'Inactif',
    i18n: 'ui.button.inactive',
  },
  {
    key: 'icon',
    head: 'iconOnly',
    props: { size: 'md', iconOnly: true },
    label: '+',
  },
];

export function makeButton(variant, column) {
  var b = document.createElement('button');
  b.type = 'button';
  b.dataset.dwc = 'button';
  b.dataset.variant = variant;
  b.dataset.size = column.props.size;
  if (column.props.loading) {
    b.dataset.loading = '';
    b.setAttribute('aria-busy', 'true');
    b.disabled = true;
    var spinner = document.createElement('span');
    spinner.dataset.dwc = 'button-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    b.appendChild(spinner);
  }
  if (column.props.disabled) b.disabled = true;
  if (column.props.iconOnly) {
    b.dataset.iconOnly = '';
    // Sans libellé visible, le libellé accessible est obligatoire.
    b.setAttribute('aria-label', t('ui.button.add', 'Ajouter'));
  }
  b.appendChild(document.createTextNode(t(column.i18n, column.label)));
  return b;
}

export function buildMatrix(
  table,
  headLabel,
  rows,
  columns,
  cellFactory,
  rowKeyPrefix
) {
  if (!table) return;
  table.textContent = '';

  var thead = document.createElement('thead');
  var headRow = document.createElement('tr');
  [headLabel].concat(columns.map(c => c.head ?? c)).forEach(function (label) {
    var th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  var tbody = document.createElement('tbody');
  rows.forEach(function (row) {
    var tr = document.createElement('tr');
    var th = document.createElement('th');
    th.scope = 'row';
    th.textContent = t(rowKeyPrefix + row[0], row[1]);
    tr.appendChild(th);
    columns.forEach(function (column) {
      var td = document.createElement('td');
      td.appendChild(cellFactory(row[0], column));
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
}

export var BADGE_TONES = [
  ['brand', 'brand'],
  ['success', 'success'],
  ['warning', 'warning'],
  ['danger', 'danger'],
  ['info', 'info'],
  ['muted', 'muted'],
];
export var BADGE_VARIANTS = [
  { key: 'soft', head: 'soft' },
  { key: 'outline', head: 'outline' },
];

export function makeBadge(tone, column) {
  var span = document.createElement('span');
  span.dataset.dwc = 'badge';
  span.dataset.tone = tone;
  span.dataset.variant = column.key;
  span.textContent = tone;
  return span;
}
