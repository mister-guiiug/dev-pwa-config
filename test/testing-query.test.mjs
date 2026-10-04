/**
 * `testing/query` — Provider + nettoyage pour les tests des apps.
 */
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import {
  wrapWithQueryClient,
  clearQueryClient,
  getQueryClient,
} from '../testing/query.js';

afterEach(() => {
  clearQueryClient();
});

test('wrapWithQueryClient pose un QueryClientProvider', () => {
  const tree = wrapWithQueryClient(h('span', null, 'ok'));
  assert.equal(typeof tree.type, 'function');
  assert.equal(tree.props.client, getQueryClient());
  assert.equal(tree.props.children.type, 'span');
});

test('clearQueryClient vide le cache et casse le singleton', () => {
  const a = getQueryClient();
  a.setQueryData(['x'], 1);
  assert.equal(a.getQueryData(['x']), 1);
  clearQueryClient();
  const b = getQueryClient();
  assert.notEqual(a, b);
  assert.equal(b.getQueryData(['x']), undefined);
});
