// L'instantané versionné (`versioned-store.js`) : enveloppe, migrations,
// validation — et la règle unique du module, éprouvée cas par cas : AVANT
// toute perte possible, une copie de côté ; APRÈS, le seed. Le contre-exemple
// qui a motivé le module (miss-lookhouse : version inconnue = données jetées)
// a ici son test, pour ne jamais y revenir.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { createVersionedStore } from '../versioned-store.js';
import { createStore } from '../storage.js';

/** Un `Storage` conforme, en mémoire — le même gabarit que storage.test.mjs. */
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

/** Le magasin type des tests : version 2, deux migrations, seed, validation. */
function makeStore(overrides = {}) {
  return createVersionedStore({
    store: 'app_',
    version: 2,
    migrations: {
      // 0 -> 1 : les données d'avant l'enveloppe n'avaient pas de périodes.
      0: data => ({ ...data, periodes: ['Année'] }),
      // 1 -> 2 : le score devient un tableau.
      1: data => ({ ...data, scores: [data.score ?? 0] }),
    },
    validate: data => {
      if (!data || typeof data !== 'object' || !Array.isArray(data.scores)) {
        throw new Error('scores manquants');
      }
      return data;
    },
    seed: () => ({ periodes: [], scores: [], neuf: true }),
    ...overrides,
  });
}

/* ── La chaîne de migrations ───────────────────────────────────────────── */

test('la chaîne monte d’un cran à la fois, depuis une valeur PRÉ-enveloppe', () => {
  // Le chemin d'adoption : toutes les apps ont commencé sans enveloppe.
  // Une valeur nue vaut version 0 — la migration 0 de l'app sait quoi en faire.
  globalThis.localStorage.setItem('app_data', JSON.stringify({ score: 7 }));

  const vs = makeStore();
  const data = vs.load();

  assert.deepEqual(data.periodes, ['Année'], 'migration 0 → 1 appliquée');
  assert.deepEqual(data.scores, [7], 'migration 1 → 2 appliquée');
});

test('une migration réussie est PERSISTÉE — elle ne tourne qu’une fois', () => {
  globalThis.localStorage.setItem(
    'app_data',
    JSON.stringify({ v: 1, data: { score: 3 } })
  );
  let passages = 0;
  const vs = makeStore({
    migrations: {
      1: data => {
        passages += 1;
        return { ...data, scores: [data.score] };
      },
    },
  });

  vs.load();
  vs.load();

  assert.equal(passages, 1, 'le deuxième chargement lit l’état déjà migré');
  const stored = JSON.parse(globalThis.localStorage.getItem('app_data'));
  assert.equal(stored.v, 2, 'l’enveloppe écrite porte la version courante');
});

test('la copie de côté précède la migration (backupBeforeMigrate)', () => {
  const original = JSON.stringify({ v: 1, data: { score: 3 } });
  globalThis.localStorage.setItem('app_data', original);

  makeStore().load();

  assert.equal(
    globalThis.localStorage.getItem('app_data.backup-v1'),
    original,
    'l’état d’AVANT la migration est copié tel quel, octet pour octet'
  );
});

test('un trou dans la chaîne → seed, avec copie de côté', () => {
  const original = JSON.stringify({ v: 1, data: { score: 3 } });
  globalThis.localStorage.setItem('app_data', original);

  // Version 2 attendue, mais aucune migration depuis la 1 : un barreau manque.
  const vs = makeStore({ migrations: {}, backupBeforeMigrate: false });
  const data = vs.load();

  assert.equal(data.neuf, true, 'repli sur le seed');
  assert.equal(
    globalThis.localStorage.getItem('app_data.backup-v1'),
    original,
    'même sans backupBeforeMigrate, rien ne se perd sans copie'
  );
});

test('une migration qui LÈVE se traite comme un trou, pas comme un crash', () => {
  globalThis.localStorage.setItem(
    'app_data',
    JSON.stringify({ v: 1, data: { score: 3 } })
  );
  const vs = makeStore({
    migrations: {
      1: () => {
        throw new Error('migration cassée');
      },
    },
  });

  let data;
  assert.doesNotThrow(() => {
    data = vs.load();
  });
  assert.equal(data.neuf, true);
  assert.ok(globalThis.localStorage.getItem('app_data.backup-v1'));
});

/* ── Version inconnue : LE test du contre-exemple ──────────────────────── */

test('version d’APRÈS → seed, et JAMAIS de destruction', () => {
  // Le contre-exemple miss-lookhouse : version inconnue = données jetées à la
  // première sauvegarde. Ici : la clé principale reste INTACTE, une copie
  // double le filet, et l'app repart sur le seed.
  const futur = JSON.stringify({ v: 99, data: { scores: [1, 2, 3] } });
  globalThis.localStorage.setItem('app_data', futur);

  const vs = makeStore();
  const data = vs.load();

  assert.equal(data.neuf, true, 'l’app repart sur le seed');
  assert.equal(
    globalThis.localStorage.getItem('app_data'),
    futur,
    'la clé principale n’est PAS écrasée par le chargement'
  );
  assert.equal(
    globalThis.localStorage.getItem('app_data.backup-v99'),
    futur,
    'et une copie de côté double le filet'
  );
});

/* ── Validation ────────────────────────────────────────────────────────── */

test('la validation qui refuse → seed, la donnée malade copiée de côté', () => {
  const malade = JSON.stringify({ v: 2, data: { scores: 'pas un tableau' } });
  globalThis.localStorage.setItem('app_data', malade);

  const data = makeStore().load();

  assert.equal(data.neuf, true);
  assert.equal(
    globalThis.localStorage.getItem('app_data.backup-v2'),
    malade,
    'la donnée refusée reste récupérable'
  );
});

test('`validate` est injectée façon `schema.parse` : sa réparation fait foi', () => {
  // Le contrat zod : `parse` rend une donnée éventuellement transformée
  // (défauts appliqués, champs retirés). C'est CETTE donnée qui sort.
  globalThis.localStorage.setItem(
    'app_data',
    JSON.stringify({ v: 2, data: { scores: [1], intrus: 'dehors' } })
  );
  const vs = makeStore({
    validate: data => ({ scores: data.scores, repare: true }),
  });

  assert.deepEqual(vs.load(), { scores: [1], repare: true });
});

test('une valeur qui n’est pas du JSON → seed, copiée de côté', () => {
  globalThis.localStorage.setItem('app_data', '{ tronquée par un onglet tué');

  const data = makeStore().load();

  assert.equal(data.neuf, true);
  assert.equal(
    globalThis.localStorage.getItem('app_data.backup-illisible'),
    '{ tronquée par un onglet tué'
  );
});

/* ── Le contrat load/save/clear ────────────────────────────────────────── */

test('aller-retour save/load, enveloppe invisible pour l’app', () => {
  const vs = makeStore();
  assert.equal(vs.save({ periodes: [], scores: [9] }), true);

  assert.deepEqual(vs.load(), { periodes: [], scores: [9] });
  const stored = JSON.parse(globalThis.localStorage.getItem('app_data'));
  assert.deepEqual(stored, { v: 2, data: { periodes: [], scores: [9] } });
});

test('sans seed, le vide se dit `null` — pas un état inventé', () => {
  const vs = makeStore({ seed: undefined });
  assert.equal(vs.load(), null);
  assert.equal(vs.export(), null, 'et il n’y a rien à exporter');
});

test('clear() efface l’instantané ET ses copies, pas le reste du magasin', () => {
  // Vider ses données doit vider ses données : laisser un `backup-v1` lisible
  // trahirait la demande. Mais les autres clés de l'app survivent.
  const app = createStore('app_');
  app.set('settings', { theme: 'sombre' });
  globalThis.localStorage.setItem(
    'app_data',
    JSON.stringify({ v: 1, data: {} })
  );

  const vs = makeStore();
  vs.load(); // dépose une copie backup-v1 au passage
  vs.clear();

  assert.equal(globalThis.localStorage.getItem('app_data'), null);
  assert.equal(globalThis.localStorage.getItem('app_data.backup-v1'), null);
  assert.deepEqual(app.get('settings', null), { theme: 'sombre' });
});

test('un Store déjà construit s’injecte tel quel', () => {
  const app = createStore('partage_');
  const vs = makeStore({ store: app });

  vs.save({ periodes: [], scores: [1] });

  assert.equal(vs.store, app, 'exposé pour composer avec ./backup.js');
  assert.ok(globalThis.localStorage.getItem('partage_data'));
});

/* ── Export / import ───────────────────────────────────────────────────── */

test('export puis import : l’aller-retour est exact', () => {
  const vs = makeStore();
  vs.save({ periodes: ['Année'], scores: [12, 15] });

  const fichier = vs.export();
  vs.clear();
  const data = vs.import(fichier);

  assert.deepEqual(data, { periodes: ['Année'], scores: [12, 15] });
  assert.deepEqual(vs.load(), data, 'l’import a aussi persisté');
});

test('un vieux fichier passe par les migrations à l’import', () => {
  const vs = makeStore();
  const data = vs.import(JSON.stringify({ v: 0, data: { score: 4 } }));

  assert.deepEqual(data.scores, [4]);
  assert.deepEqual(data.periodes, ['Année']);
});

test('un fichier refusé n’écrit RIEN — l’état d’avant survit intact', () => {
  const vs = makeStore();
  vs.save({ periodes: [], scores: [1] });
  const avant = globalThis.localStorage.getItem('app_data');

  assert.throws(() => vs.import('{ pas du JSON'), /pas du JSON/);
  assert.throws(
    () => vs.import(JSON.stringify({ v: 2, data: { scores: 'non' } })),
    /invalide/
  );
  assert.throws(
    () => vs.import(JSON.stringify({ v: 99, data: {} })),
    /version 99/,
    'à l’import, la version d’après se refuse avec un message, pas un seed'
  );
  assert.equal(
    globalThis.localStorage.getItem('app_data'),
    avant,
    'aucune écriture avant validation complète'
  );
});
