// Stockage clé/valeur tolérant (`storage.js`) et coffre chiffré
// (`secure-storage.js`).
//
// CE QUE CES TESTS TIENNENT. Les sept copies promues n'avaient de test nulle
// part : c'est du code qu'on écrit une fois, qu'on recopie, et dont personne ne
// vérifie plus le comportement en panne — précisément le cas qu'il traite. Les
// quatre façons dont `localStorage` échoue sont donc éprouvées ici, une par
// une, avec un stockage qui lève pour de vrai.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

const modules = {
  storage: '../storage.js',
  vault: '../secure-storage.js',
};

/** Un `Storage` conforme, en mémoire, dont on peut casser chaque opération. */
function fakeStorage() {
  const data = new Map();
  const store = {
    failWrite: false,
    getItem: key => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => {
      if (store.failWrite) {
        const error = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      }
      data.set(key, String(value));
    },
    removeItem: key => data.delete(key),
    get length() {
      return data.size;
    },
    key: index => [...data.keys()][index] ?? null,
  };
  return store;
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

/* ── Les quatre pannes ─────────────────────────────────────────────────── */

test('un stockage dont l’ACCÈS lève ne fait pas tomber l’app', async () => {
  const { readJson, writeJson, isStorageAvailable, removeKey } = await import(
    modules.storage
  );
  // « Bloquer les données de sites » : la propriété elle-même lève, avant toute
  // lecture. Un `if (window.localStorage)` ne suffit donc pas.
  Object.defineProperty(globalThis, 'localStorage', {
    get() {
      throw new Error('SecurityError');
    },
    configurable: true,
  });

  assert.equal(isStorageAvailable(), false);
  assert.equal(readJson('x', 'défaut'), 'défaut');
  assert.equal(writeJson('x', 1), false);
  assert.doesNotThrow(() => removeKey('x'));
});

test('un quota dépassé se signale, il ne lève pas', async () => {
  const { writeJson, isStorageAvailable } = await import(modules.storage);
  globalThis.localStorage.failWrite = true;

  assert.equal(
    writeJson('x', { a: 1 }),
    false,
    'l’écriture refusée rend false'
  );
  assert.equal(
    isStorageAvailable(),
    false,
    'la disponibilité s’éprouve par un aller-retour, pas par la présence'
  );
});

test('une valeur illisible rend le défaut, pas une exception', async () => {
  const { readJson } = await import(modules.storage);
  // Écrite par une version antérieure, ou tronquée par un onglet tué.
  globalThis.localStorage.setItem('cle', '{ ceci n’est pas du JSON');
  assert.deepEqual(readJson('cle', { sain: true }), { sain: true });
});

test('une valeur cyclique est refusée sans casser', async () => {
  const { writeJson } = await import(modules.storage);
  const cyclique = {};
  cyclique.moi = cyclique;
  assert.equal(writeJson('x', cyclique), false);
});

/* ── Le préfixe ────────────────────────────────────────────────────────── */

test('deux apps du même domaine ne se marchent pas dessus', async () => {
  const { createStore } = await import(modules.storage);
  // Les seize apps sont servies depuis `mister-guiiug.github.io` : elles
  // partagent UN localStorage. Sans préfixe, `settings` écrase `settings`.
  const carte = createStore('mfm_');
  const molkky = createStore('mistermolkky_');

  carte.set('settings', { theme: 'clair' });
  molkky.set('settings', { theme: 'sombre' });

  assert.deepEqual(carte.get('settings', null), { theme: 'clair' });
  assert.deepEqual(molkky.get('settings', null), { theme: 'sombre' });
  assert.deepEqual(carte.keys(), ['settings'], 'keys() retire le préfixe');

  // Et vider l'une ne déconnecte pas l'autre.
  carte.clear();
  assert.deepEqual(carte.keys(), []);
  assert.deepEqual(molkky.get('settings', null), { theme: 'sombre' });
});

/* ── Le coffre ─────────────────────────────────────────────────────────── */

test('un secret rangé n’est plus lisible en clair dans le stockage', async () => {
  const { createVault } = await import(modules.vault);
  const vault = createVault({ prefix: 'test_', iterations: 1000 });

  assert.equal(vault.isEnabled(), false);
  await vault.enable('phrase de passe correcte');
  assert.equal(vault.isEnabled(), true);
  assert.equal(vault.isUnlocked(), true);

  await vault.setItem('jeton', 'ghp_secret_tres_confidentiel');

  // Ce que verrait un script tiers qui vide le stockage.
  const brut = globalThis.localStorage.getItem('test_jeton');
  assert.ok(brut, 'la valeur est bien écrite');
  assert.ok(
    !brut.includes('ghp_secret'),
    'le secret ne doit apparaître nulle part en clair'
  );
  assert.equal(await vault.getItem('jeton'), 'ghp_secret_tres_confidentiel');
});

test('la phrase incorrecte est refusée, et n’en dit pas plus', async () => {
  const { createVault } = await import(modules.vault);
  const vault = createVault({ prefix: 'test_', iterations: 1000 });
  await vault.enable('la bonne');
  await vault.setItem('jeton', 'secret');
  vault.lock();

  assert.equal(vault.isUnlocked(), false);
  assert.equal(await vault.unlock('la mauvaise'), false);
  assert.equal(vault.isUnlocked(), false);
  // Un coffre absent échoue de la MÊME façon : rien ne distingue les deux.
  const absent = createVault({ prefix: 'vide_', iterations: 1000 });
  assert.equal(await absent.unlock('quoi que ce soit'), false);

  assert.equal(await vault.unlock('la bonne'), true);
  assert.equal(await vault.getItem('jeton'), 'secret');
});

test('coffre fermé : lire ou écrire lève plutôt que de rendre du vide', async () => {
  const { createVault } = await import(modules.vault);
  const vault = createVault({ prefix: 'test_', iterations: 1000 });
  await vault.enable('phrase');
  vault.lock();

  // Rendre `null` silencieusement ferait passer un coffre verrouillé pour un
  // coffre vide — et l'app écraserait des données qu'elle ne peut pas lire.
  await assert.rejects(() => vault.encrypt('x'), /vault-locked/);
  await assert.rejects(() => vault.decrypt('x'), /vault-locked/);
});

test('deux chiffrements du même clair donnent deux blobs différents', async () => {
  const { createVault } = await import(modules.vault);
  const vault = createVault({ prefix: 'test_', iterations: 1000 });
  await vault.enable('phrase');

  const a = await vault.encrypt('même texte');
  const b = await vault.encrypt('même texte');
  // Un IV neuf à chaque fois. Le réutiliser en GCM ne dégrade pas la
  // confidentialité, il la détruit.
  assert.notEqual(a, b, 'l’IV doit être tiré à chaque chiffrement');
  assert.equal(await vault.decrypt(a), 'même texte');
  assert.equal(await vault.decrypt(b), 'même texte');
});

test('un blob altéré est rejeté — GCM authentifie', async () => {
  const { createVault } = await import(modules.vault);
  const vault = createVault({ prefix: 'test_', iterations: 1000 });
  await vault.enable('phrase');
  const blob = await vault.encrypt('intact');

  // On retourne un caractère au milieu du chiffré.
  const altere =
    blob.slice(0, 20) + (blob[20] === 'A' ? 'B' : 'A') + blob.slice(21);
  await assert.rejects(() => vault.decrypt(altere));
  // Et par `getItem`, ça se dégrade proprement au lieu de lever.
  globalThis.localStorage.setItem('test_x', altere);
  assert.equal(await vault.getItem('x', 'défaut'), 'défaut');
});

test('les itérations sont RELUES, pas réappliquées', async () => {
  const { createVault } = await import(modules.vault);
  // Un coffre créé avec 1000 itérations…
  await createVault({ prefix: 'test_', iterations: 1000 }).enable('phrase');

  // …doit rester ouvrable par une version qui a relevé sa constante. Sans
  // relecture, augmenter le défaut rendrait illisibles tous les coffres
  // existants — une perte de données à la mise à jour.
  const futur = createVault({ prefix: 'test_', iterations: 600_000 });
  assert.equal(await futur.unlock('phrase'), true);
});

test('sans Web Crypto, le coffre le DIT au lieu de faire semblant', async () => {
  const { createVault } = await import(modules.vault);
  const saved = globalThis.crypto;
  Object.defineProperty(globalThis, 'crypto', {
    value: undefined,
    configurable: true,
  });
  try {
    const vault = createVault({ prefix: 'test_' });
    assert.equal(vault.supported(), false);
    await assert.rejects(() => vault.enable('phrase'), /Web Crypto/);
  } finally {
    Object.defineProperty(globalThis, 'crypto', {
      value: saved,
      configurable: true,
    });
  }
});

test('stockage refusé à l’activation : le coffre refuse franchement', async () => {
  const { createVault } = await import(modules.vault);
  globalThis.localStorage.failWrite = true;
  const vault = createVault({ prefix: 'test_', iterations: 1000 });
  // Sinon le coffre serait ouvert cette fois et introuvable la suivante.
  await assert.rejects(() => vault.enable('phrase'), /stockage indisponible/);
});
