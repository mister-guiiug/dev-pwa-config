// `PageContainer` — le conteneur de vue, et la place qu'il réserve à une
// barre basse collée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { PageContainer } from '../react/page-container.js';

test('par défaut : un div centré au palier md, avec ses marges', () => {
  const html = renderToStaticMarkup(h(PageContainer, {}, 'vue'));
  assert.match(html, /^<div [^>]*data-dwc="page-container"/);
  assert.match(html, /data-width="md"/);
  assert.doesNotMatch(html, /data-padding/);
  assert.doesNotMatch(html, /data-reserve/);
});

test('reserve="bottom-nav" dégage la place de la barre collée — même sans marges', () => {
  // Huit dépôts portaient ce dégagement à la main, à côté de la règle qui
  // colle la barre. Il survit à `padding={false}` : réserver n'est pas une
  // marge, c'est la hauteur d'un élément qui couvre le bas de la fenêtre.
  const html = renderToStaticMarkup(
    h(PageContainer, { as: 'main', reserve: 'bottom-nav', padding: false }, 'x')
  );
  assert.match(html, /^<main /);
  assert.match(html, /data-reserve="bottom-nav"/);
  assert.match(html, /data-padding="none"/);
});
