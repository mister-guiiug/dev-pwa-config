// Géométrie des séries (`sparkline.js`).
//
// CE QUE CES TESTS TIENNENT. Un graphique faux ne lève pas : il dessine, et
// raconte autre chose que les données. Les quatre pièges éprouvés ici sont
// ceux qui donnent un graphique vide ou mensonger, et aucun ne se voit sur un
// jeu de démonstration bien rempli.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  bars,
  describeSeries,
  extent,
  project,
  toPoints,
  toPolyline,
} from '../sparkline.js';

/* ── Les quatre pièges ─────────────────────────────────────────────────── */

test('une série CONSTANTE donne un trait plat, pas un graphique vide', () => {
  // `(y - min) / (max - min)` divise par zéro : sans amplitude artificielle,
  // tous les points valent NaN et rien ne se dessine.
  const chart = project([5, 5, 5], { width: 100, height: 20 });
  assert.equal(chart.segments.length, 1);
  const ys = chart.segments[0].map(p => p.y);
  assert.ok(ys.every(Number.isFinite), `NaN dans ${JSON.stringify(ys)}`);
  assert.ok(new Set(ys).size === 1, 'le trait doit être plat');
  assert.ok(ys[0] > 0 && ys[0] < 20, 'et à mi-hauteur, pas collé au bord');
});

test('un seul point se montre quand même', () => {
  const chart = project([42]);
  assert.equal(chart.points.length, 1);
  assert.ok(chart.last);
});

test('un TROU coupe la ligne — il n’est pas un zéro', () => {
  // Les confondre fait plonger la courbe et raconte une panne qui n'a pas eu
  // lieu.
  const chart = project([10, null, 12, 11], { height: 20 });
  assert.equal(
    chart.segments.length,
    2,
    'deux tronçons, pas une ligne continue'
  );
  assert.deepEqual(
    chart.segments.map(s => s.length),
    [1, 2]
  );

  // Et la valeur du trou n'entre pas dans les bornes.
  assert.equal(chart.extent.min, 10);
  assert.equal(chart.extent.max, 12);
});

test('NaN et Infinity comptent comme des trous', () => {
  const points = toPoints([1, NaN, Infinity, undefined, 2]);
  assert.deepEqual(
    points.map(p => p.y),
    [1, null, null, null, 2]
  );
});

test('la ligne de base à zéro est un CHOIX, pas un défaut', () => {
  // Légitime pour un décompte, mensonger pour un prix immobilier : un axe qui
  // ne part pas de zéro exagère les variations, et c'est parfois voulu.
  assert.deepEqual(extent(toPoints([100, 102, 101])), { min: 100, max: 102 });
  assert.deepEqual(extent(toPoints([100, 102, 101]), { baseline: 'zero' }), {
    min: 0,
    max: 102,
  });
});

/* ── La projection ─────────────────────────────────────────────────────── */

test('la valeur haute est EN HAUT — l’axe SVG descend', () => {
  const chart = project([0, 10], { width: 10, height: 10, padding: 0 });
  const [segment] = chart.segments;
  assert.equal(segment[0].y, 10, 'la plus basse valeur en bas de la boîte');
  assert.equal(segment[1].y, 0, 'la plus haute en haut');
});

test('les points tiennent dans la boîte, marge comprise', () => {
  const chart = project([3, 9, 1, 7], { width: 100, height: 40, padding: 2 });
  for (const point of chart.points) {
    assert.ok(point.x >= 2 && point.x <= 98, `x hors boîte : ${point.x}`);
    assert.ok(point.y >= 2 && point.y <= 38, `y hors boîte : ${point.y}`);
  }
});

test('des abscisses irrégulières sont respectées', () => {
  // Une mesure par jour avec un jour sauté ne doit pas s'afficher régulière.
  const chart = project(
    [
      { x: 0, y: 1 },
      { x: 1, y: 2 },
      { x: 9, y: 3 },
    ],
    { width: 100, height: 10, padding: 0 }
  );
  const xs = chart.points.map(p => Math.round(p.x));
  assert.deepEqual(xs, [0, 11, 100]);
});

test('une série vide ne dessine rien et ne lève pas', () => {
  const chart = project([]);
  assert.deepEqual(chart.segments, []);
  assert.equal(chart.last, null);
  assert.equal(chart.extent, null);
  assert.deepEqual(project([null, null]).segments, []);
});

test('toPolyline rend des coordonnées lisibles', () => {
  assert.equal(
    toPolyline([
      { x: 1.234, y: 5.678 },
      { x: 2, y: 3 },
    ]),
    '1.23,5.68 2,3'
  );
});

/* ── Les barres ────────────────────────────────────────────────────────── */

test('la plus haute barre vaut 100 %', () => {
  const computed = bars([2, 8, 4]);
  assert.deepEqual(
    computed.map(b => b.ratio),
    [0.25, 1, 0.5]
  );
});

test('une valeur négative ne descend pas sous la ligne', () => {
  // Une barre à l'envers demande un axe, donc un autre composant.
  const computed = bars([-3, 6]);
  assert.equal(computed[0].ratio, 0);
});

test('un trou est signalé, pas dessiné à zéro', () => {
  const computed = bars([4, null, 8]);
  assert.equal(computed[1].missing, true);
  assert.equal(computed[1].ratio, 0);
  assert.equal(computed[0].missing, false);
});

/* ── L'alternative textuelle ───────────────────────────────────────────── */

test('la description dit le trajet, pas seulement les nombres', () => {
  const texte = describeSeries([10, 14, 12], { label: 'quota', unit: '%' });
  assert.match(texte, /quota : 3 points/);
  assert.match(texte, /de 10 % à 12 %/);
  assert.match(texte, /minimum 10 %, maximum 14 %/);
  assert.match(texte, /en hausse/);
});

test('la description ANNONCE les trous', () => {
  // Une courbe à trous n'a pas la même valeur qu'une courbe complète, et
  // c'est le seul endroit où ça peut se lire.
  const texte = describeSeries([1, null, null, 2]);
  assert.match(texte, /2 mesures manquantes/);
});

test('une série vide se dit, elle ne se tait pas', () => {
  assert.equal(describeSeries([], { label: 'prix' }), 'prix : aucune donnée');
  assert.equal(describeSeries([null]), 'série : aucune donnée');
});

test('un format personnalisé est respecté', () => {
  const texte = describeSeries([1000, 2000], {
    format: v => `${v / 1000} k`,
    unit: '€',
  });
  assert.match(texte, /de 1 k € à 2 k €/);
});
