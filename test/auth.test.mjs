// Machine d'état de session (`auth/`).
//
// Le port ferme trois pièges que les quatre implémentations relevées (doc,
// uwh, lookhouse, carbook) géraient à moitié : la réponse `getSession`
// périmée, le blocage hors-ligne sur la lecture MFA, la déconnexion sans
// évènement. Chacun a son test — c'est la raison d'être du module.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUTH_STATUS, createAuthClient } from '../auth/index.js';

/** Promesse dont on contrôle la résolution depuis le test. */
function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Un adaptateur pilotable : session réglable, évènements émis à la main. */
function fakeAdapter(overrides = {}) {
  const callbacks = new Set();
  const spy = { subscriptions: 0, unsubscriptions: 0 };
  const adapter = {
    getSession: async () => null,
    onAuthStateChange(callback) {
      spy.subscriptions += 1;
      callbacks.add(callback);
      return () => {
        spy.unsubscriptions += 1;
        callbacks.delete(callback);
      };
    },
    ...overrides,
  };
  return {
    adapter,
    spy,
    emit(event, session) {
      for (const callback of callbacks) callback(event, session);
    },
  };
}

/** Laisse les microtâches (hydratations en vol) se vider. */
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

/* ── Les transitions ───────────────────────────────────────────────────── */

test('sans adaptateur complet, on refuse tout de suite', () => {
  assert.throws(() => createAuthClient(), /adaptateur/);
  assert.throws(
    () => createAuthClient({ adapter: { getSession: async () => null } }),
    /onAuthStateChange/
  );
});

test('avant `start`, l’état est `loading` — ne rien décider encore', () => {
  const { adapter } = fakeAdapter();
  const client = createAuthClient({ adapter });
  assert.equal(client.getSnapshot().status, AUTH_STATUS.loading);
});

test('pas de session → signed-out ; une session → signed-in', async () => {
  const sansSession = createAuthClient({ adapter: fakeAdapter().adapter });
  assert.equal((await sansSession.start()).status, AUTH_STATUS.signedOut);

  const session = { user: { id: 'u1' } };
  const { adapter } = fakeAdapter({ getSession: async () => session });
  const avecSession = createAuthClient({ adapter });
  const snapshot = await avecSession.start();
  assert.equal(snapshot.status, AUTH_STATUS.signedIn);
  assert.equal(snapshot.session, session);
  assert.equal(snapshot.user, session.user);
});

test('une session sans `user` rend `user: null`, pas un plantage', async () => {
  // L'adaptateur local de bac-sable porte `userId`/`profile`, pas `user`.
  const { adapter } = fakeAdapter({
    getSession: async () => ({ userId: 'local-guiiug' }),
  });
  const client = createAuthClient({ adapter });
  const snapshot = await client.start();
  assert.equal(snapshot.status, AUTH_STATUS.signedIn);
  assert.equal(snapshot.user, null);
});

test('un évènement de connexion puis de déconnexion fait le tour complet', async () => {
  const etats = [];
  const { adapter, emit } = fakeAdapter();
  const client = createAuthClient({ adapter });
  client.subscribe(s => etats.push(s.status));

  await client.start();
  emit('SIGNED_IN', { user: { id: 'u1' } });
  await settle();
  emit('SIGNED_OUT', null);
  await settle();

  assert.deepEqual(etats, [
    AUTH_STATUS.signedOut,
    AUTH_STATUS.signedIn,
    AUTH_STATUS.signedOut,
  ]);
});

/* ── needs-mfa ─────────────────────────────────────────────────────────── */

test('un facteur vérifié non franchi rend `needs-mfa`, pas `signed-in`', async () => {
  const session = { user: { id: 'u1' } };
  const { adapter } = fakeAdapter({
    getSession: async () => session,
    mfaRequired: async () => true,
  });
  const client = createAuthClient({ adapter });
  assert.equal((await client.start()).status, AUTH_STATUS.needsMfa);
});

test('le défi franchi (évènement) fait passer needs-mfa → signed-in', async () => {
  // Le flux réel de doc/uwh : `challengeAndVerify` réussit, Supabase émet
  // `MFA_CHALLENGE_VERIFIED`, et l'assurance relue dit `aal2` = `aal2`.
  let level = true;
  const session = { user: { id: 'u1' } };
  const { adapter, emit } = fakeAdapter({
    getSession: async () => session,
    mfaRequired: async () => level,
  });
  const client = createAuthClient({ adapter });
  assert.equal((await client.start()).status, AUTH_STATUS.needsMfa);

  level = false;
  emit('MFA_CHALLENGE_VERIFIED', session);
  await settle();
  assert.equal(client.getSnapshot().status, AUTH_STATUS.signedIn);
});

test('la lecture MFA en échec ne verrouille JAMAIS (hors-ligne)', async () => {
  // Comportement de doc : l'assurance est illisible hors-ligne, et
  // l'utilisateur doit pouvoir consulter son planning en cache — pas saisir
  // un code TOTP sans réseau.
  const { adapter } = fakeAdapter({
    getSession: async () => ({ user: { id: 'u1' } }),
    mfaRequired: async () => {
      throw new Error('Failed to fetch');
    },
  });
  const client = createAuthClient({ adapter });
  assert.equal((await client.start()).status, AUTH_STATUS.signedIn);
});

/* ── La course ─────────────────────────────────────────────────────────── */

test('une réponse `getSession` périmée ne détrône pas un évènement plus récent', async () => {
  // Le piège que lookhouse et carbook ferment par un drapeau de montage :
  // la lecture initiale (null) répond APRÈS l'évènement de connexion.
  const lente = deferred();
  const { adapter, emit } = fakeAdapter({ getSession: () => lente.promise });
  const client = createAuthClient({ adapter });

  const demarrage = client.start();
  emit('SIGNED_IN', { user: { id: 'u1' } });
  await settle();
  assert.equal(client.getSnapshot().status, AUTH_STATUS.signedIn);

  lente.resolve(null); // la réponse d'avant la connexion arrive enfin
  await demarrage;
  await settle();
  assert.equal(
    client.getSnapshot().status,
    AUTH_STATUS.signedIn,
    'l’état périmé a écrasé l’état courant'
  );
});

test('une lecture MFA lente ne s’applique plus si la session a changé', async () => {
  const lente = deferred();
  const { adapter, emit } = fakeAdapter({
    getSession: async () => ({ user: { id: 'u1' } }),
    mfaRequired: () => lente.promise,
  });
  const client = createAuthClient({ adapter });
  const demarrage = client.start();
  await settle();

  // Déconnexion PENDANT la lecture d'assurance.
  emit('SIGNED_OUT', null);
  await settle();
  assert.equal(client.getSnapshot().status, AUTH_STATUS.signedOut);

  lente.resolve(true); // la réponse d'une session déjà close
  await demarrage;
  await settle();
  assert.equal(client.getSnapshot().status, AUTH_STATUS.signedOut);
});

/* ── Le contrat d'abonnement ───────────────────────────────────────────── */

test('l’instantané est stable, et un non-changement ne notifie pas', async () => {
  // `useSyncExternalStore` compare par identité : notifier sans changement,
  // c'est re-rendre à chaque `TOKEN_REFRESHED` silencieux.
  let notifications = 0;
  const session = { user: { id: 'u1' } };
  const { adapter, emit } = fakeAdapter({ getSession: async () => session });
  const client = createAuthClient({ adapter });
  await client.start();
  client.subscribe(() => {
    notifications += 1;
  });

  const avant = client.getSnapshot();
  emit('TOKEN_REFRESHED', session); // même session, même statut
  await settle();
  assert.equal(notifications, 0);
  assert.equal(client.getSnapshot(), avant, 'l’identité doit être stable');
});

test('le désabonnement rendu par `subscribe` fonctionne', async () => {
  const { adapter, emit } = fakeAdapter();
  const client = createAuthClient({ adapter });
  await client.start();

  let notifications = 0;
  const off = client.subscribe(() => {
    notifications += 1;
  });
  off();
  emit('SIGNED_IN', { user: { id: 'u1' } });
  await settle();
  assert.equal(notifications, 0);
});

test('`start` est idempotent : pas de double abonnement (StrictMode)', async () => {
  const { adapter, spy } = fakeAdapter();
  const client = createAuthClient({ adapter });
  await client.start();
  await client.start();
  assert.equal(spy.subscriptions, 1);
});

test('après `stop`, les évènements ne changent plus l’état', async () => {
  const { adapter, spy, emit } = fakeAdapter();
  const client = createAuthClient({ adapter });
  await client.start();
  client.stop();
  assert.equal(spy.unsubscriptions, 1);

  emit('SIGNED_IN', { user: { id: 'u1' } });
  await settle();
  assert.equal(client.getSnapshot().status, AUTH_STATUS.signedOut);
});

/* ── Les délégations ───────────────────────────────────────────────────── */

test('`onEvent` reçoit chaque évènement brut — la purge locale d’uwh', async () => {
  // uwh purge les données locales sur SIGNED_OUT (appareil partagé) : le
  // port n'a pas à connaître cette politique, il tend l'évènement.
  const recus = [];
  const { adapter, emit } = fakeAdapter();
  const client = createAuthClient({
    adapter,
    onEvent: (event, session) => recus.push([event, session]),
  });
  await client.start();
  const session = { user: { id: 'u1' } };
  emit('SIGNED_IN', session);
  emit('SIGNED_OUT', null);
  await settle();
  assert.deepEqual(recus, [
    ['SIGNED_IN', session],
    ['SIGNED_OUT', null],
  ]);
});

test('`signOut` délègue PUIS relit — un adaptateur muet transitionne quand même', async () => {
  let session = { user: { id: 'u1' } };
  let signOutCalls = 0;
  // Adaptateur sans évènement de déconnexion : la relecture doit suffire.
  const { adapter } = fakeAdapter({
    getSession: async () => session,
    signOut: async () => {
      signOutCalls += 1;
      session = null;
    },
  });
  const client = createAuthClient({ adapter });
  assert.equal((await client.start()).status, AUTH_STATUS.signedIn);

  const snapshot = await client.signOut();
  assert.equal(signOutCalls, 1);
  assert.equal(snapshot.status, AUTH_STATUS.signedOut);
});

test('un `getSession` qui lève vaut « pas de session », pas un plantage', async () => {
  const { adapter } = fakeAdapter({
    getSession: async () => {
      throw new Error('AuthSessionMissingError');
    },
  });
  const client = createAuthClient({ adapter });
  assert.equal((await client.start()).status, AUTH_STATUS.signedOut);
});
