// `id.js` — identifiants promus de miss-uwh : le court préfixé, l'UUID v4, et
// le repli quand `crypto.randomUUID` manque.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createId, createUuid, isUuid } from '../id.js';

const SANS_CRYPTO = {};

test('createId : préfixe, huit hexadécimaux, unicité raisonnable', () => {
  assert.match(createId(), /^id_[0-9a-f]{8}$/);
  assert.match(createId('sea'), /^sea_[0-9a-f]{8}$/);
  const vus = new Set(Array.from({ length: 2000 }, () => createId()));
  assert.equal(vus.size, 2000);
});

test('createId : sans randomUUID, un repli en base 36 — jamais une exception', () => {
  assert.match(createId('x', SANS_CRYPTO), /^x_[0-9a-z]{8}$/);
});

test('createUuid : un v4 par la plateforme, ou construit à la main', () => {
  assert.ok(isUuid(createUuid()));
  // Le repli pose les bits de version (4) et de variante (8, 9, a, b) : c'est
  // ce que la copie de genius, avec ses huit caractères de Math.random, ne
  // faisait pas — et ce qui fait accepter la valeur par une colonne `uuid`.
  for (let i = 0; i < 200; i++) assert.ok(isUuid(createUuid(SANS_CRYPTO)));
  assert.notEqual(createUuid(SANS_CRYPTO), createUuid(SANS_CRYPTO));
});

test('createUuid : une source injectée est utilisée telle quelle', () => {
  const fixe = { randomUUID: () => '00000000-0000-4000-8000-000000000001' };
  assert.equal(createUuid(fixe), '00000000-0000-4000-8000-000000000001');
  assert.equal(createId('q', fixe), 'q_00000000');
});

test('isUuid : la forme v4 seulement, casse indifférente', () => {
  assert.ok(isUuid('3b241101-e2bb-4a0f-9f3c-9a1f0e2b7c11'));
  assert.ok(isUuid('3B241101-E2BB-4A0F-9F3C-9A1F0E2B7C11'));
  assert.ok(!isUuid('3b241101-e2bb-1a0f-9f3c-9a1f0e2b7c11'), 'version 1');
  assert.ok(
    !isUuid('3b241101-e2bb-4a0f-1f3c-9a1f0e2b7c11'),
    'variante hors 8–b'
  );
  assert.ok(!isUuid('id_3b241101'));
  assert.ok(!isUuid(null));
});
