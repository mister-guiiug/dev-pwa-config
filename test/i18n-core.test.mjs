import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createTranslator,
  interpolate,
  resolvePath,
} from '../react/i18n-core.js';

const messages = {
  fr: {
    hello: 'Bonjour',
    nested: { count: '{n} éléments' },
    onlyFr: 'seulement en fr',
  },
  en: {
    hello: 'Hello',
    nested: { count: '{n} items' },
  },
};

test('resolves a flat key for the active locale', () => {
  assert.equal(createTranslator(messages, 'en', 'fr')('hello'), 'Hello');
});

test('resolves a nested key and interpolates params', () => {
  assert.equal(
    createTranslator(messages, 'fr', 'fr')('nested.count', { n: 3 }),
    '3 éléments'
  );
});

test('falls back to fallbackLocale when the key is missing', () => {
  assert.equal(
    createTranslator(messages, 'en', 'fr')('onlyFr'),
    'seulement en fr'
  );
});

test('returns the raw path when the key is absent everywhere', () => {
  assert.equal(
    createTranslator(messages, 'en', 'fr')('does.not.exist'),
    'does.not.exist'
  );
});

test('an unknown active locale falls back to fallbackLocale', () => {
  assert.equal(createTranslator(messages, 'de', 'fr')('hello'), 'Bonjour');
});

test('interpolate keeps an unmatched placeholder literal', () => {
  assert.equal(interpolate('{a} / {b}', { a: 'x' }), 'x / {b}');
});

test('resolvePath returns undefined for a non-string leaf', () => {
  assert.equal(resolvePath(messages.fr, 'nested'), messages.fr.nested);
  assert.equal(resolvePath(messages.fr, 'nope'), undefined);
});
