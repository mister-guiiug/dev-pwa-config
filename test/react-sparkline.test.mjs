// `react/sparkline` — Sparkline, BarChart, Gauge.
//
// SEUL COMPOSANT VISUEL DU PAQUET SANS AUCUN TEST au 06/09/2026, alors qu'il
// a trois adoptants. C'est l'audit du design system qui l'a relevé.
//
// Ce qui est verrouillé, et pourquoi ce sont ces trois choses-là :
//
//   1. LE DESSIN EST INVISIBLE AUX LECTEURS D'ÉCRAN, ET LE TEXTE NE L'EST PAS.
//      Un graphique qui ne dit rien ne dit rien à tout le monde : le `<svg>`
//      porte `aria-hidden`, et la description chiffrée vit dans un texte à
//      côté. Perdre l'un des deux ne casse aucun rendu et rend la donnée
//      inaccessible en silence.
//   2. UNE SÉRIE TROUÉE DONNE PLUSIEURS TRAITS. Une ligne qui traverse le trou
//      raconterait une mesure qui n'existe pas — c'est écrit dans le composant,
//      rien ne l'empêchait de régresser.
//   3. `Gauge` EST UN `meter` COMPLET. Sans `aria-valuenow/min/max`, c'est une
//      barre colorée : jolie, muette, et fausse pour qui ne la voit pas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { BarChart, Gauge, Sparkline } from '../react/sparkline.js';

test('Sparkline : le dessin est masqué, la donnée reste lisible en texte', () => {
  const html = renderToStaticMarkup(
    h(Sparkline, { values: [1, 4, 2, 8], label: 'trafic', unit: 'vues' })
  );
  assert.match(html, /<svg[^>]*aria-hidden="true"/, 'le tracé ne se lit pas');
  assert.match(html, /focusable="false"/, 'ni ne se tabule (IE/Edge legacy)');

  const texte = html.match(/data-dwc="sparkline-text"[^>]*>([^<]*)</)?.[1];
  assert.ok(texte, 'la description chiffrée doit exister');
  assert.match(texte, /trafic/);
  assert.match(texte, /8/, 'la dernière valeur y est');
});

test('Sparkline : une série trouée donne PLUSIEURS traits, jamais un seul', () => {
  const continu = renderToStaticMarkup(h(Sparkline, { values: [1, 2, 3, 4] }));
  const troue = renderToStaticMarkup(
    h(Sparkline, { values: [1, 2, null, 4, 5] })
  );
  const traits = s => (s.match(/<polyline/g) ?? []).length;

  assert.equal(traits(continu), 1, 'une série continue : un trait');
  assert.equal(
    traits(troue),
    2,
    'un trou coupe le trait — une ligne qui le traverse inventerait une mesure'
  );
});

test('Sparkline : le dernier point est marqué, et on peut le refuser', () => {
  const avec = renderToStaticMarkup(h(Sparkline, { values: [1, 2, 3] }));
  const sans = renderToStaticMarkup(
    h(Sparkline, { values: [1, 2, 3], showLast: false })
  );
  assert.match(avec, /data-dwc="sparkline-last"/);
  assert.doesNotMatch(sans, /data-dwc="sparkline-last"/);
});

test('BarChart : autant de barres que de valeurs, et la même description', () => {
  const html = renderToStaticMarkup(
    h(BarChart, { values: [2, 5, 1], label: 'ventes' })
  );
  assert.equal(
    (html.match(/data-dwc="bars-bar"/g) ?? []).length,
    3,
    'une barre par valeur'
  );
  assert.match(html, /data-dwc="bars-text"/);
  assert.match(html, /ventes/);
});

test('Gauge : un `meter` complet, pas une barre colorée', () => {
  const html = renderToStaticMarkup(
    h(Gauge, { value: 30, min: 0, max: 60, label: 'quota', unit: 'Go' })
  );
  assert.match(html, /role="meter"/);
  assert.match(html, /aria-valuenow="30"/);
  assert.match(html, /aria-valuemin="0"/);
  assert.match(html, /aria-valuemax="60"/);
  assert.match(
    html,
    /aria-valuetext="30 Go"/,
    'la valeur se lit avec son unité'
  );
  assert.match(html, /aria-label="quota"/);
  assert.match(html, /width:\s*50\.00%/, 'la moitié de 0–60');
});

test('Gauge : une valeur hors bornes est BORNÉE, pas débordée', () => {
  // Un remplissage à 180 % déborderait de son conteneur ; à -20 %, la valeur
  // serait négative et la barre disparaîtrait sans dire pourquoi.
  const trop = renderToStaticMarkup(h(Gauge, { value: 500, max: 100 }));
  const pasAssez = renderToStaticMarkup(h(Gauge, { value: -40, max: 100 }));
  assert.match(trop, /width:\s*100\.00%/);
  assert.match(pasAssez, /width:\s*0\.00%/);
  // La valeur ANNONCÉE reste la vraie : borner le dessin ne doit pas mentir
  // sur la mesure.
  assert.match(trop, /aria-valuenow="500"/);
});
