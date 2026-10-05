/*
 * Mesures en direct : les jetons fluides (`clamp`), les zones sûres et le
 * palier courant, lus sur la page par une sonde invisible, rien n'étant
 * recopié à la main ; et le jumeau de viewport, qui calcule les mêmes jetons
 * à la largeur d'un téléphone et d'un écran de bureau.
 */

import { root } from './etat.js?v=542f37cc5d';
import { measureTargets } from './controles.js?v=f6572eb5d8';

// Sonde hors écran : sert à faire évaluer les `clamp()` / `env()` par le
// navigateur plutôt qu'à les recalculer en JS.
var probe = document.createElement('div');
probe.setAttribute('aria-hidden', 'true');
probe.style.cssText =
  'position:absolute;left:-9999px;top:0;visibility:hidden;pointer-events:none;';
document.body.appendChild(probe);

export function measure() {
  if (typeof renderViewportTwin === 'function') renderViewportTwin();
  document
    .querySelectorAll('#type-scale tr[data-token]')
    .forEach(function (row) {
      probe.style.fontSize = 'var(' + row.dataset.token + ')';
      var size = getComputedStyle(probe).fontSize;
      row.querySelector('[data-computed]').textContent = size;
      row.querySelector('.sr-sample').style.fontSize = size;
    });
  probe.style.fontSize = '';

  document
    .querySelectorAll('#space-scale tr[data-token]')
    .forEach(function (row) {
      probe.style.width = 'var(' + row.dataset.token + ')';
      row.querySelector('[data-computed]').textContent =
        getComputedStyle(probe).width;
    });
  probe.style.width = '';

  document
    .querySelectorAll('#safe-areas tr[data-inset]')
    .forEach(function (row) {
      var side = row.dataset.inset;
      probe.style.padding = '0';
      probe.style.paddingTop = 'env(safe-area-inset-' + side + ')';
      row.querySelector('[data-computed]').textContent =
        getComputedStyle(probe).paddingTop;
    });
  probe.style.padding = '';

  var rem = parseFloat(getComputedStyle(root).fontSize) || 16;
  var widthRem = window.innerWidth / rem;
  var current = 'base';
  document.querySelectorAll('#bp-list li').forEach(function (li) {
    var active = widthRem >= Number(li.dataset.min);
    if (active) current = li.dataset.bp;
    li.dataset.active = 'false';
  });
  var activeEl = document.querySelector(
    '#bp-list li[data-bp="' + current + '"]'
  );
  if (activeEl) activeEl.dataset.active = 'true';

  var badge = document.getElementById('bp-badge');
  if (badge) {
    badge.textContent =
      current +
      ' · ' +
      window.innerWidth +
      ' px · 1rem = ' +
      rem.toFixed(0) +
      ' px';
  }

  // Les tailles fluides bougent avec la fenêtre : la cible tactile se
  // remesure, elle ne se déduit pas.
  measureTargets();
}

var FLUID_TYPE = [
  { token: '--text-fluid-xs', label: 'xs', min: 0.7, vw: 1.6, max: 0.8125 },
  { token: '--text-fluid-sm', label: 'sm', min: 0.8125, vw: 1.9, max: 0.95 },
  { token: '--text-fluid-base', label: 'base', min: 0.9, vw: 2.2, max: 1.05 },
  { token: '--text-fluid-lg', label: 'lg', min: 1, vw: 2.6, max: 1.25 },
  { token: '--text-fluid-xl', label: 'xl', min: 1.15, vw: 3, max: 1.5 },
  { token: '--text-fluid-2xl', label: '2xl', min: 1.35, vw: 4.2, max: 2 },
];

function fluidPx(widthPx, minRem, vw, maxRem) {
  var rem = parseFloat(getComputedStyle(root).fontSize) || 16;
  var preferred = (vw / 100) * widthPx;
  var lo = minRem * rem;
  var hi = maxRem * rem;
  return Math.min(hi, Math.max(lo, preferred));
}

export function renderViewportTwin() {
  var panes = [
    ['sr-viewport-phone', 390],
    ['sr-viewport-desk', 1280],
  ];
  panes.forEach(function (pane) {
    var host = document.getElementById(pane[0]);
    if (!host) return;
    host.textContent = '';
    FLUID_TYPE.forEach(function (row) {
      var li = document.createElement('li');
      var sample = document.createElement('span');
      sample.className = 'sr-vp-sample';
      var px = fluidPx(pane[1], row.min, row.vw, row.max);
      sample.style.fontSize = px.toFixed(1) + 'px';
      sample.textContent = 'Aa · ' + row.label;
      var meta = document.createElement('span');
      meta.className = 'sr-vp-px';
      meta.textContent = px.toFixed(1) + ' px';
      li.appendChild(sample);
      li.appendChild(meta);
      host.appendChild(li);
    });
  });
}
