// La session lue DANS le stockage, sans passer par Supabase — le module qui
// décide si une app sans réseau ouvre son écran ou son formulaire de connexion.
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  navigateurHorsLigne,
  storedSupabaseSession,
} from '../auth/stored-session.js';

/** Un `localStorage` minimal, à la sémantique de l'API du navigateur. */
function fauxStockage(entrees = {}) {
  const map = new Map(Object.entries(entrees));
  return {
    get length() {
      return map.size;
    },
    key: i => [...map.keys()][i] ?? null,
    getItem: k => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}

const CASE = 'sb-lgbuytinzukaxrqjwxme-auth-token';
const session = expiresAt => ({
  access_token: 'entete.charge.signature',
  refresh_token: 'jeton-de-rafraichissement',
  expires_at: expiresAt,
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: 'u1', email: 'docteur@exemple.fr' },
});

let stockageOriginal;
beforeEach(() => {
  stockageOriginal = Object.getOwnPropertyDescriptor(
    globalThis,
    'localStorage'
  );
});
afterEach(() => {
  if (stockageOriginal) {
    Object.defineProperty(globalThis, 'localStorage', stockageOriginal);
  } else {
    delete globalThis.localStorage;
  }
});

const poser = valeur => {
  globalThis.localStorage = valeur;
};

test('la session est lue sous le nom de case que Supabase construit', () => {
  poser(fauxStockage({ [CASE]: JSON.stringify(session(9_999_999_999)) }));
  assert.equal(storedSupabaseSession()?.user.id, 'u1');
});

test('elle est rendue MÊME PÉRIMÉE — c’est tout l’objet du module', () => {
  // Un jeton d'accès vit une heure. Hors ligne, son expiration ne dit rien de
  // l'utilisateur : elle dit qu'une heure a passé. Refuser ici recréerait la
  // panne qu'on répare.
  poser(fauxStockage({ [CASE]: JSON.stringify(session(1)) }));
  assert.equal(storedSupabaseSession()?.user.id, 'u1');
});

test('les cases voisines de Supabase sont ignorées', () => {
  // `-code-verifier` (PKCE) et `-user` cohabitent sous des noms proches et ne
  // contiennent pas de session.
  poser(
    fauxStockage({
      [`${CASE}-code-verifier`]: JSON.stringify('verifieur'),
      [`${CASE}-user`]: JSON.stringify({ user: { id: 'u1' } }),
    })
  );
  assert.equal(storedSupabaseSession(), null);
});

test('un contenu illisible ou incomplet rend null, sans lever', () => {
  poser(fauxStockage({ [CASE]: 'ceci n’est pas du JSON' }));
  assert.equal(storedSupabaseSession(), null);

  const { refresh_token: _, ...sansJeton } = session(9_999_999_999);
  poser(fauxStockage({ [CASE]: JSON.stringify(sansJeton) }));
  assert.equal(storedSupabaseSession(), null);

  // Sans `user.id`, l'app ne saurait pas quelles données lire en cache.
  poser(fauxStockage({ [CASE]: JSON.stringify({ ...session(1), user: {} }) }));
  assert.equal(storedSupabaseSession(), null);
});

/*
 * UNE ORIGINE, UN STOCKAGE, PLUSIEURS APPS. Toute la famille est servie depuis
 * `mister-guiiug.github.io` : sur un appareil qui sert à deux apps Supabase,
 * deux cases `sb-*-auth-token` cohabitent. Relevé le 05/11/2026.
 */
const SOEUR = 'sb-uneautreappdelafamille-auth-token';
const sessionDe = id =>
  JSON.stringify({ ...session(9_999_999_999), user: { id } });
const client = storageKey => ({ auth: { storageKey } });

test('avec le client, c’est la session de CE projet, pas celle d’une sœur', () => {
  // La sœur est rangée la première : c'est elle qu'une lecture par motif rend.
  poser(
    fauxStockage({ [SOEUR]: sessionDe('u-soeur'), [CASE]: sessionDe('u-moi') })
  );
  assert.equal(storedSupabaseSession(client(CASE))?.user.id, 'u-moi');
});

test('avec le client, sa case vide rend null — même si une sœur a la sienne', () => {
  // Hors ligne, c'est ce qui distingue « déconnecté » de « une autre app est
  // connectée » : sans cela, une vraie déconnexion passait pour un
  // renouvellement de jeton abandonné, et l'écran s'ouvrait sous un autre.
  poser(fauxStockage({ [SOEUR]: sessionDe('u-soeur') }));
  assert.equal(storedSupabaseSession(client(CASE)), null);
});

test('un `storageKey` explicite est suivi, même hors du motif `sb-*`', () => {
  poser(fauxStockage({ 'supabase-auth': sessionDe('u-moi') }));
  assert.equal(
    storedSupabaseSession(client('supabase-auth'))?.user.id,
    'u-moi'
  );
});

test('un client qui ne dit pas sa case retombe sur la lecture par motif', () => {
  // Les clients simulés des tests d'apps n'ont pas de `storageKey`.
  poser(fauxStockage({ [CASE]: sessionDe('u-moi') }));
  assert.equal(storedSupabaseSession({ auth: {} })?.user.id, 'u-moi');
  assert.equal(storedSupabaseSession(client(''))?.user.id, 'u-moi');
});

test('sans stockage du tout (Node, worker), rend null', () => {
  delete globalThis.localStorage;
  assert.equal(storedSupabaseSession(), null);
});

test('un stockage qui LÈVE à la lecture rend null', () => {
  // Navigation privée durcie : l'accès à `localStorage` lève.
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get() {
      throw new Error('accès refusé');
    },
  });
  assert.equal(storedSupabaseSession(), null);
});

test('« hors ligne » n’est affirmé que sur `onLine === false`', () => {
  // `!navigator.onLine` vaudrait VRAI hors navigateur, où la propriété
  // n'existe pas : toute app testée sous Node se croirait coupée du réseau.
  const original = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  try {
    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: {},
    });
    assert.equal(navigateurHorsLigne(), false);

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { onLine: false },
    });
    assert.equal(navigateurHorsLigne(), true);

    Object.defineProperty(globalThis, 'navigator', {
      configurable: true,
      value: { onLine: true },
    });
    assert.equal(navigateurHorsLigne(), false);
  } finally {
    if (original) Object.defineProperty(globalThis, 'navigator', original);
  }
});
