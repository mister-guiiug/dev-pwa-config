// Le stockage persistant de l'origine : ce qu'on demande, quand on ne
// redemande pas, et « on ne sait pas » quand l'API manque ou lève.
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  isStoragePersisted,
  requestPersistentStorage,
  storageEstimate,
} from '../persistent-storage.js';

const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
function poserNavigateur(storage) {
  Object.defineProperty(globalThis, 'navigator', {
    value: storage === undefined ? {} : { storage },
    configurable: true,
  });
}
afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'navigator', original);
});

test('sans API, on ne sait pas : null partout, rien ne lève', async () => {
  poserNavigateur(undefined);
  assert.equal(await isStoragePersisted(), null);
  assert.equal(await requestPersistentStorage(), null);
  assert.equal(await storageEstimate(), null);
});

test('déjà accordé : on ne redemande pas (Firefox reposerait la question)', async () => {
  let demandes = 0;
  poserNavigateur({
    persisted: async () => true,
    persist: async () => {
      demandes += 1;
      return true;
    },
  });
  assert.equal(await requestPersistentStorage(), true);
  assert.equal(demandes, 0);
});

test('pas encore accordé : on demande, et on rend la réponse du navigateur', async () => {
  let demandes = 0;
  poserNavigateur({
    persisted: async () => false,
    persist: async () => {
      demandes += 1;
      return false;
    },
  });
  assert.equal(await requestPersistentStorage(), false);
  assert.equal(demandes, 1);
});

test('une API qui lève vaut « on ne sait pas »', async () => {
  poserNavigateur({
    persisted: async () => {
      throw new Error('refusé');
    },
    persist: async () => {
      throw new Error('refusé');
    },
    estimate: async () => {
      throw new Error('refusé');
    },
  });
  assert.equal(await isStoragePersisted(), null);
  assert.equal(await requestPersistentStorage(), null);
  assert.equal(await storageEstimate(), null);
});

test('l’estimation garde les nombres, et seulement eux', async () => {
  poserNavigateur({ estimate: async () => ({ usage: 1200, quota: NaN }) });
  assert.deepEqual(await storageEstimate(), { usage: 1200, quota: null });
});
