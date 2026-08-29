// Sauvegarde et restauration (`backup.js`).
//
// CE QUE CES TESTS TIENNENT : les trois décisions qu'une composition rapide
// rate — les valeurs brutes (les blobs chiffrés survivent), la validation
// AVANT la première écriture, et le refus d'une sauvegarde d'une autre app.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../storage.js';
import {
  BACKUP_FORMAT,
  createBackup,
  restoreBackup,
  validateBackup,
} from '../backup.js';

function fakeStorage() {
  const data = new Map();
  return {
    getItem: key => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: key => data.delete(key),
    get length() {
      return data.size;
    },
    key: index => [...data.keys()][index] ?? null,
  };
}

let saved;
beforeEach(() => {
  saved = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    value: fakeStorage(),
    configurable: true,
    writable: true,
  });
});
afterEach(() => {
  if (saved) Object.defineProperty(globalThis, 'localStorage', saved);
  else delete globalThis.localStorage;
});

test('l’aller-retour est exact, blob non-JSON compris', () => {
  const store = createStore('mfm_');
  store.set('places', [{ id: 'a' }]);
  // Ce qu'écrit le coffre chiffré : PAS du JSON. Une composition qui re-parse
  // le détruirait.
  store.setRaw('vault_jeton', 'AAECAwQFBgcICQ==');

  const backup = createBackup(store, { app: 'mister-family-map' });
  assert.equal(backup.format, BACKUP_FORMAT);
  assert.equal(backup.app, 'mister-family-map');
  assert.equal(backup.entries, 2);

  // Restauration dans un stockage vierge.
  globalThis.localStorage = fakeStorage();
  const neuf = createStore('mfm_');
  const result = restoreBackup(neuf, backup);
  assert.deepEqual(result, { ok: true, restored: 2 });
  assert.deepEqual(neuf.get('places', null), [{ id: 'a' }]);
  assert.equal(neuf.getRaw('vault_jeton'), 'AAECAwQFBgcICQ==');
});

test('une sauvegarde d’une AUTRE app est refusée — sans rien écrire', () => {
  // Les seize apps partagent un domaine : restaurer les clés molkky dans
  // family-map ne lèverait rien et ne restaurerait rien. Le pire échec est le
  // silencieux ; celui-ci parle.
  const molkky = createStore('mistermolkky_');
  molkky.set('scores', [50]);
  const backup = createBackup(molkky, { app: 'mister-molkky' });

  const familyMap = createStore('mfm_');
  familyMap.set('places', ['déjà là']);
  const result = restoreBackup(familyMap, backup);

  assert.equal(result.ok, false);
  assert.match(
    result.problems.join(' '),
    /autre application \(mister-molkky\)/
  );
  assert.deepEqual(
    familyMap.get('places', null),
    ['déjà là'],
    'rien n’a bougé'
  );
});

test('un fichier invalide est refusé AVANT la première écriture', () => {
  const store = createStore('mfm_');
  store.set('places', ['intact']);

  for (const mauvais of [
    null,
    'pas un objet',
    { format: 'autre-chose', v: 1, prefix: 'mfm_', data: {} },
    { format: BACKUP_FORMAT, v: 99, prefix: 'mfm_', data: {} },
    { format: BACKUP_FORMAT, v: 1, prefix: 'mfm_' },
    { format: BACKUP_FORMAT, v: 1, prefix: 'mfm_', data: { x: 42 } },
  ]) {
    const result = restoreBackup(store, mauvais);
    assert.equal(result.ok, false, JSON.stringify(mauvais));
    assert.ok(result.problems.length > 0);
  }
  assert.deepEqual(store.get('places', null), ['intact']);
});

test('la validation rend TOUS les problèmes, pas le premier', () => {
  const store = createStore('mfm_');
  const problems = validateBackup(
    { format: 'x', v: 99, prefix: 'autre_', data: null },
    store
  );
  assert.ok(
    problems.length >= 3,
    `attendu ≥ 3, obtenu : ${problems.join(' | ')}`
  );
});

test('fusion par défaut, remplacement sur demande', () => {
  const store = createStore('mfm_');
  store.set('places', ['ancien']);
  store.set('favoris', ['gardé']);
  const backup = {
    format: BACKUP_FORMAT,
    v: 1,
    app: 'mfm_',
    prefix: 'mfm_',
    data: { places: '["nouveau"]' },
  };

  // Fusion : la clé absente du fichier survit.
  restoreBackup(store, backup);
  assert.deepEqual(store.get('places', null), ['nouveau']);
  assert.deepEqual(store.get('favoris', null), ['gardé']);

  // Remplacement : l'état final est exactement celui du fichier.
  restoreBackup(store, backup, { replace: true });
  assert.deepEqual(store.get('places', null), ['nouveau']);
  assert.equal(store.get('favoris', null), null);
});

test('le remplacement ne touche QUE le préfixe de l’app', () => {
  const familyMap = createStore('mfm_');
  familyMap.set('places', ['a']);
  globalThis.localStorage.setItem('mistermolkky_scores', '[50]');

  restoreBackup(
    familyMap,
    { format: BACKUP_FORMAT, v: 1, app: 'mfm_', prefix: 'mfm_', data: {} },
    { replace: true }
  );
  assert.equal(
    globalThis.localStorage.getItem('mistermolkky_scores'),
    '[50]',
    'restaurer une app ne déconnecte pas les autres'
  );
});
