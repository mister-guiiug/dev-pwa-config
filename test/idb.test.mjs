// Le wrapper IndexedDB (`idb.js`), contre une implémentation RÉELLE
// (fake-indexeddb) : transactions, clonage structuré, object-stores — pas un
// mock des méthodes du wrapper. Les cinq copies du parc n'avaient de test
// nulle part ; les pannes qu'elles absorbaient en silence sont éprouvées ici,
// une par une, comme pour `storage.js`.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { IDBFactory } from 'fake-indexeddb';

import { createIdb } from '../idb.js';

let saved;

beforeEach(() => {
  saved = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB');
  // Une fabrique NEUVE par test : chaque test part d'un espace vide.
  Object.defineProperty(globalThis, 'indexedDB', {
    value: new IDBFactory(),
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  if (saved) Object.defineProperty(globalThis, 'indexedDB', saved);
  else delete globalThis.indexedDB;
});

/* ── Le contrat clé/valeur ─────────────────────────────────────────────── */

test('aller-retour set/get/keys/remove/clear', async () => {
  const idb = createIdb('test-app');

  assert.equal(await idb.available(), true);
  assert.equal(await idb.set('scores', [21, 14]), true);
  assert.equal(await idb.set('theme', { mode: 'sombre' }), true);

  assert.deepEqual(await idb.get('scores'), [21, 14]);
  assert.deepEqual((await idb.keys()).sort(), ['scores', 'theme']);

  assert.equal(await idb.remove('theme'), true);
  assert.equal(await idb.get('theme'), undefined);

  assert.equal(await idb.clear(), true);
  assert.deepEqual(await idb.keys(), []);
});

test('le fallback couvre l’absence, comme `readJson` de storage.js', async () => {
  const idb = createIdb('test-app');
  assert.equal(await idb.get('absente'), undefined);
  assert.deepEqual(await idb.get('absente', { defaut: true }), {
    defaut: true,
  });
});

test('deux apps du même domaine ne se marchent pas dessus', async () => {
  // Les seize apps partagent l'origine, donc l'espace IndexedDB : le NOM est
  // l'isolation, comme le préfixe de `createStore`.
  const molkky = createIdb('mister-molkky');
  const badminton = createIdb('miss-badminton');

  await molkky.set('history', ['partie 1']);
  await badminton.set('history', ['match A']);

  assert.deepEqual(await molkky.get('history'), ['partie 1']);
  assert.deepEqual(await badminton.get('history'), ['match A']);

  await molkky.clear();
  assert.deepEqual(await badminton.get('history'), ['match A']);
});

/* ── Les blobs ─────────────────────────────────────────────────────────── */

test('un Blob fait l’aller-retour tel quel, contenu et type', async () => {
  const idb = createIdb('test-app');
  const avatar = new Blob(['fausse image'], { type: 'image/png' });

  assert.equal(await idb.setBlob('avatar:j1', avatar), true);
  const relu = await idb.getBlob('avatar:j1');

  assert.ok(relu instanceof Blob);
  assert.equal(relu.type, 'image/png');
  assert.equal(await relu.text(), 'fausse image');

  assert.equal(await idb.removeBlob('avatar:j1'), true);
  assert.equal(await idb.getBlob('avatar:j1'), undefined);
});

test('`kv` et `blobs` sont deux stores : même clé, zéro collision', async () => {
  const idb = createIdb('test-app');
  await idb.set('j1', { nom: 'Jo' });
  await idb.setBlob('j1', new Blob(['photo']));

  assert.deepEqual(await idb.get('j1'), { nom: 'Jo' });
  assert.equal(await (await idb.getBlob('j1')).text(), 'photo');

  // Et vider `kv` ne touche pas les blobs de l'app.
  await idb.clear();
  assert.equal(await idb.get('j1'), undefined);
  assert.equal(await (await idb.getBlob('j1')).text(), 'photo');
});

/* ── Les pannes ────────────────────────────────────────────────────────── */

test('sans API IndexedDB, tout se dégrade — rien ne lève', async () => {
  delete globalThis.indexedDB;
  const idb = createIdb('test-app');

  assert.equal(await idb.available(), false);
  assert.equal(await idb.get('x', 'défaut'), 'défaut');
  assert.equal(await idb.set('x', 1), false);
  assert.equal(await idb.remove('x'), false);
  assert.deepEqual(await idb.keys(), []);
  assert.equal(await idb.getBlob('x'), undefined);
  await assert.doesNotReject(() => idb.close());
});

test('un `open` qui LÈVE (navigation privée Firefox) se dégrade pareil', async () => {
  // L'API existe, l'ouverture lève : la présence ne prouve rien —
  // `available()` éprouve une vraie ouverture.
  Object.defineProperty(globalThis, 'indexedDB', {
    value: {
      open() {
        throw new Error('SecurityError');
      },
    },
    configurable: true,
    writable: true,
  });
  const idb = createIdb('test-app');

  assert.equal(await idb.available(), false);
  assert.equal(await idb.get('x', 'défaut'), 'défaut');
  assert.equal(await idb.set('x', 1), false);
});

test('une valeur que le clonage structuré refuse rend `false`, pas une exception', async () => {
  // Le pendant de la valeur cyclique refusée par `writeJson` : `put` lève en
  // synchrone sur une fonction, et l'app n'a pas à le savoir.
  const idb = createIdb('test-app');
  assert.equal(await idb.set('cassee', { run: () => {} }), false);
  assert.equal(await idb.get('cassee'), undefined);
});

test('close() ferme, la prochaine opération rouvre', async () => {
  const idb = createIdb('test-app');
  await idb.set('x', 1);
  await idb.close();

  // La connexion fermée n'est pas une panne : on rouvre, les données sont là.
  assert.equal(await idb.get('x'), 1);
  assert.equal(await idb.set('y', 2), true);
});
