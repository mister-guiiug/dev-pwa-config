// `react/card` — la surface que dix apps avaient, aucune du paquet.
//
// Ce qui est verrouillé : la carte est une surface SANS rôle, rendue dans
// l'élément demandé ; `padding: false` se lit dans le DOM ; l'en-tête rend un
// VRAI titre au niveau demandé, avec sous-titre et action facultatifs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { Card, CardHeader } from '../react/card.js';

const render = (component, props, ...children) =>
  renderToStaticMarkup(h(component, props, ...children));

test('Card : une surface, un div par défaut, sans rôle', () => {
  const html = render(Card, { className: 'x' }, 'Contenu');
  assert.match(html, /^<div class="x" data-dwc="card">Contenu<\/div>$/);
  assert.doesNotMatch(html, /role=/);
  assert.doesNotMatch(
    html,
    /data-padding/,
    'le padding par défaut ne se lit pas'
  );
});

test('Card : `as` change l’élément, `padding: false` se lit dans le DOM', () => {
  assert.match(
    render(Card, { as: 'article' }, 'x'),
    /^<article data-dwc="card">/
  );
  assert.match(
    render(Card, { as: 'a', href: '/x' }, 'x'),
    /^<a href="\/x" data-dwc="card">/
  );
  assert.match(render(Card, { padding: false }, 'x'), /data-padding="none"/);
});

test('CardHeader : un vrai titre, h3 par défaut, `as` pour le niveau', () => {
  const html = render(CardHeader, { title: 'Cotisations' });
  assert.match(html, /<div data-dwc="card-header">/);
  assert.match(html, /<h3 data-dwc="card-title">Cotisations<\/h3>/);
  assert.doesNotMatch(
    html,
    /card-subtitle/,
    'pas de sous-titre : pas de <p> vide'
  );
  assert.doesNotMatch(
    html,
    /card-action/,
    'pas d’action : pas de conteneur vide'
  );

  assert.match(
    render(CardHeader, { title: 'T', as: 'h2' }),
    /<h2 data-dwc="card-title">T<\/h2>/
  );
});

test('CardHeader : sous-titre et action prennent leur place', () => {
  const html = render(CardHeader, {
    title: 'Cotisations',
    subtitle: '12 en retard',
    action: h('button', { type: 'button' }, 'Relancer'),
  });
  assert.match(html, /<p data-dwc="card-subtitle">12 en retard<\/p>/);
  assert.match(
    html,
    /<div data-dwc="card-action"><button type="button">Relancer<\/button><\/div>/
  );
  // L'action vient APRÈS le titre dans le DOM : l'ordre de lecture est
  // « de quoi il s'agit », puis « ce qu'on peut en faire ».
  assert.ok(html.indexOf('card-title') < html.indexOf('card-action'));
});
