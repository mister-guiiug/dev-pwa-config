// Le dump d'état d'échec (`playwright-base.js`), promu du try/catch qui a
// fermé le bug des doublons après trois échecs aveugles en CI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dumpAppState, rethrowWithState } from '../playwright-base.js';

/** Une page Playwright factice : `evaluate` exécute pour de vrai. */
function fakePage(domState) {
  return {
    url: () => 'http://localhost:4173/profil',
    evaluate: async (fn, arg) => {
      const saved = {
        localStorage: Object.getOwnPropertyDescriptor(
          globalThis,
          'localStorage'
        ),
        document: Object.getOwnPropertyDescriptor(globalThis, 'document'),
      };
      Object.defineProperty(globalThis, 'localStorage', {
        value: domState.storage,
        configurable: true,
      });
      Object.defineProperty(globalThis, 'document', {
        value: domState.document,
        configurable: true,
      });
      try {
        return await fn(arg);
      } finally {
        for (const [key, descriptor] of Object.entries(saved)) {
          if (descriptor) Object.defineProperty(globalThis, key, descriptor);
          else delete globalThis[key];
        }
      }
    },
  };
}

const domOrdinaire = () => ({
  storage: {
    getItem: key => (key === 'mfm_places' ? '[{"id":"a"}]' : null),
    mfm_places: '[{"id":"a"}]',
    mfm_session: '{}',
  },
  document: { querySelector: () => ({ textContent: 'Ajouter un lieu' }) },
});

test('le dump relève URL, titre, et les CLÉS — pas les valeurs', async () => {
  const state = await dumpAppState(fakePage(domOrdinaire()));
  assert.equal(state.url, 'http://localhost:4173/profil');
  assert.equal(state.heading, 'Ajouter un lieu');
  assert.ok(state.storageKeys.includes('mfm_places'));
  // Les valeurs peuvent être volumineuses ou sensibles : jamais d'office.
  assert.equal(state.values && Object.keys(state.values).length, 0);
});

test('les clés demandées livrent leur valeur, les autres non', async () => {
  const state = await dumpAppState(fakePage(domOrdinaire()), {
    keys: ['mfm_places', 'absente'],
  });
  assert.equal(state.values.mfm_places, '[{"id":"a"}]');
  assert.equal(state.values.absente, null);
  assert.equal(state.values.mfm_session, undefined);
});

test('un stockage qui LÈVE ne fait pas échouer le dump', async () => {
  // Le cas réel des navigateurs qui bloquent les données de sites — et
  // précisément le genre d'environnement où l'on a besoin du dump.
  const state = await dumpAppState(
    fakePage({
      storage: new Proxy(
        {},
        {
          get() {
            throw new Error('SecurityError');
          },
          ownKeys() {
            throw new Error('SecurityError');
          },
        }
      ),
      document: { querySelector: () => null },
    }),
    { keys: ['x'] }
  );
  assert.deepEqual(state.storageKeys, ['<stockage indisponible>']);
  assert.equal(state.values.x, '<stockage indisponible>');
});

test('un dump qui échoue le DIT au lieu de remplacer l’erreur utile', async () => {
  const state = await dumpAppState({
    url: () => 'http://x/',
    evaluate: async () => {
      throw new Error('page fermée');
    },
  });
  assert.match(state.dumpError, /page fermée/);
});

test('rethrowWithState garde le message ET la pile d’origine', () => {
  const original = new Error('element(s) not found');
  const pile = original.stack;
  try {
    rethrowWithState(original, { heading: 'Ajouter un lieu', nbLieux: 6 });
    assert.fail('doit lever');
  } catch (error) {
    assert.equal(error, original, 'la même erreur, pas une copie');
    assert.match(error.message, /element\(s\) not found/);
    assert.match(error.message, /État au moment de l'échec/);
    assert.match(error.message, /"nbLieux": 6/);
    assert.equal(error.stack.split('\n')[1], pile.split('\n')[1]);
  }
});

test('une non-Error se relance quand même, lisible', () => {
  try {
    rethrowWithState('timeout', { url: 'x' });
    assert.fail('doit lever');
  } catch (error) {
    assert.ok(error instanceof Error);
    assert.match(error.message, /timeout/);
  }
});
