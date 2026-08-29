// Adaptateur Supabase Auth (`auth/supabase`), contre un client factice qui
// répond EXACTEMENT comme l'API v2 : `{ data, error }`, session dans
// `data.session`, abonnement dans `data.subscription`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supabaseAuthAdapter } from '../auth/supabase.js';

/** Un client Supabase factice, méthode par méthode, appels journalisés. */
function fakeClient(auth = {}) {
  const calls = [];
  const record =
    (name, impl) =>
    (...args) => {
      calls.push([name, ...args]);
      return impl(...args);
    };
  const api = {};
  for (const [name, impl] of Object.entries(auth)) {
    api[name] =
      typeof impl === 'function'
        ? record(name, impl)
        : record(name, () => impl);
  }
  return { client: { auth: api }, calls };
}

test('un client Supabase est requis', () => {
  assert.throws(() => supabaseAuthAdapter(), /client Supabase/);
  assert.throws(() => supabaseAuthAdapter({ client: {} }), /client Supabase/);
});

/* ── getSession / onAuthStateChange ────────────────────────────────────── */

test('getSession : la session de `data.session`, sinon null', async () => {
  const session = { user: { id: 'u1' } };
  const ok = supabaseAuthAdapter({
    client: fakeClient({ getSession: async () => ({ data: { session } }) })
      .client,
  });
  assert.equal(await ok.getSession(), session);

  // Une session illisible est une session absente : les cinq apps relevées
  // lisent `data.session` sans regarder l'erreur.
  const enErreur = supabaseAuthAdapter({
    client: fakeClient({
      getSession: async () => ({
        data: { session: null },
        error: { message: 'Auth session missing!' },
      }),
    }).client,
  });
  assert.equal(await enErreur.getSession(), null);

  const quiLeve = supabaseAuthAdapter({
    client: fakeClient({
      getSession: async () => {
        throw new Error('réseau');
      },
    }).client,
  });
  assert.equal(await quiLeve.getSession(), null);
});

test('onAuthStateChange : câblé au vrai format v2, désabonnement compris', () => {
  let handler = null;
  let unsubscribed = 0;
  const { client } = fakeClient({
    onAuthStateChange: callback => {
      handler = callback;
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              unsubscribed += 1;
            },
          },
        },
      };
    },
  });
  const adapter = supabaseAuthAdapter({ client });

  const recus = [];
  const off = adapter.onAuthStateChange((event, session) =>
    recus.push([event, session])
  );
  handler('SIGNED_IN', { user: { id: 'u1' } });
  // Supabase passe `null` OU `undefined` selon l'évènement : l'app reçoit
  // toujours `null`.
  handler('SIGNED_OUT', undefined);
  off();

  assert.deepEqual(recus, [
    ['SIGNED_IN', { user: { id: 'u1' } }],
    ['SIGNED_OUT', null],
  ]);
  assert.equal(unsubscribed, 1);
});

/* ── mfaRequired ───────────────────────────────────────────────────────── */

test('mfaRequired : vrai seulement pour aal1 → aal2', async () => {
  const level = (currentLevel, nextLevel) => {
    const { client } = fakeClient({});
    client.auth.mfa = {
      getAuthenticatorAssuranceLevel: async () => ({
        data: { currentLevel, nextLevel },
      }),
    };
    return supabaseAuthAdapter({ client });
  };

  assert.equal(await level('aal1', 'aal2').mfaRequired(), true);
  assert.equal(await level('aal2', 'aal2').mfaRequired(), false);
  assert.equal(await level('aal1', 'aal1').mfaRequired(), false);
  assert.equal(await level(null, null).mfaRequired(), false);
});

test('mfaRequired : sans API `auth.mfa`, jamais de défi', async () => {
  const adapter = supabaseAuthAdapter({ client: fakeClient({}).client });
  assert.equal(await adapter.mfaRequired(), false);
});

test('mfaRequired : l’erreur remonte — c’est le PORT qui décide de ne pas bloquer', async () => {
  const { client } = fakeClient({});
  client.auth.mfa = {
    getAuthenticatorAssuranceLevel: async () => ({
      data: null,
      error: { message: 'refresh_token_not_found' },
    }),
  };
  const adapter = supabaseAuthAdapter({ client });
  await assert.rejects(() => adapter.mfaRequired(), /refresh_token_not_found/);
});

/* ── Les variantes de connexion ────────────────────────────────────────── */

test('signInWithPassword : `{ ok, session }` au succès, `{ code, message }` à l’échec', async () => {
  const session = { user: { id: 'u1' } };
  const { client, calls } = fakeClient({
    signInWithPassword: async () => ({ data: { session }, error: null }),
  });
  const adapter = supabaseAuthAdapter({ client });
  const res = await adapter.signInWithPassword({
    email: 'a@b.fr',
    password: 'secret',
  });
  assert.deepEqual(res, { ok: true, session, error: null });
  assert.deepEqual(calls, [
    ['signInWithPassword', { email: 'a@b.fr', password: 'secret' }],
  ]);

  const rejete = supabaseAuthAdapter({
    client: fakeClient({
      signInWithPassword: async () => ({
        data: { session: null },
        error: {
          code: 'invalid_credentials',
          message: 'Invalid login credentials',
        },
      }),
    }).client,
  });
  const echec = await rejete.signInWithPassword({
    email: 'a@b.fr',
    password: 'faux',
  });
  assert.equal(echec.ok, false);
  assert.equal(echec.session, null);
  // Le couple que `frAuthError` sait traduire : code stable ET message.
  assert.deepEqual(echec.error, {
    code: 'invalid_credentials',
    message: 'Invalid login credentials',
  });
});

test('signInWithOtp : lien magique, `emailRedirectTo` transmis comme carbook', async () => {
  const { client, calls } = fakeClient({
    signInWithOtp: async () => ({ data: {}, error: null }),
  });
  const adapter = supabaseAuthAdapter({ client });

  const res = await adapter.signInWithOtp({
    email: 'a@b.fr',
    emailRedirectTo: 'https://app.example/retour',
  });
  assert.deepEqual(res, { ok: true, error: null });
  assert.deepEqual(calls, [
    [
      'signInWithOtp',
      {
        email: 'a@b.fr',
        options: { emailRedirectTo: 'https://app.example/retour' },
      },
    ],
  ]);

  // Sans redirection : pas d'`options` fantôme.
  await adapter.signInWithOtp({ email: 'a@b.fr' });
  assert.deepEqual(calls[1], ['signInWithOtp', { email: 'a@b.fr' }]);
});

test('signUp : `needsConfirmation` quand la confirmation e-mail retient la session', async () => {
  // carbook : « Si la confirmation e-mail est activée, aucune session n'est
  // renvoyée. »
  const sansSession = supabaseAuthAdapter({
    client: fakeClient({
      signUp: async () => ({ data: { session: null }, error: null }),
    }).client,
  });
  const attente = await sansSession.signUp({
    email: 'a@b.fr',
    password: 'secret',
  });
  assert.equal(attente.ok, true);
  assert.equal(attente.needsConfirmation, true);

  const session = { user: { id: 'u1' } };
  const directe = supabaseAuthAdapter({
    client: fakeClient({
      signUp: async () => ({ data: { session }, error: null }),
    }).client,
  });
  const entree = await directe.signUp({ email: 'a@b.fr', password: 'secret' });
  assert.equal(entree.needsConfirmation, false);
  assert.equal(entree.session, session);

  const refusee = supabaseAuthAdapter({
    client: fakeClient({
      signUp: async () => ({
        data: { session: null },
        error: { code: 'signup_disabled', message: 'Signups not allowed' },
      }),
    }).client,
  });
  const refus = await refusee.signUp({ email: 'a@b.fr', password: 'secret' });
  assert.equal(refus.ok, false);
  assert.equal(
    refus.needsConfirmation,
    false,
    'un refus n’est pas une attente'
  );
});

test('signUp : métadonnées (le `full_name` de doc) et redirection transmises', async () => {
  const { client, calls } = fakeClient({
    signUp: async () => ({ data: { session: null }, error: null }),
  });
  const adapter = supabaseAuthAdapter({ client });
  await adapter.signUp({
    email: 'a@b.fr',
    password: 'secret',
    emailRedirectTo: 'https://app.example/retour',
    data: { full_name: 'Guiiug' },
  });
  assert.deepEqual(calls, [
    [
      'signUp',
      {
        email: 'a@b.fr',
        password: 'secret',
        options: {
          emailRedirectTo: 'https://app.example/retour',
          data: { full_name: 'Guiiug' },
        },
      },
    ],
  ]);
});

test('signInAnonymously : le repli de molkky — désactivé n’est PAS une panne', async () => {
  const user = { id: 'anon-1', is_anonymous: true };
  const ok = supabaseAuthAdapter({
    client: fakeClient({
      signInAnonymously: async () => ({
        data: { user, session: { user } },
        error: null,
      }),
    }).client,
  });
  const reussite = await ok.signInAnonymously();
  assert.equal(reussite.ok, true);
  assert.equal(reussite.user, user);

  // Refus par l'API : `{ ok: false }`, pas une exception.
  const refuse = supabaseAuthAdapter({
    client: fakeClient({
      signInAnonymously: async () => ({
        data: { user: null, session: null },
        error: {
          code: 'anonymous_provider_disabled',
          message: 'Anonymous sign-ins are disabled',
        },
      }),
    }).client,
  });
  const refus = await refuse.signInAnonymously();
  assert.equal(refus.ok, false);
  assert.equal(refus.error.code, 'anonymous_provider_disabled');

  // Et si l'appel LÈVE (le cas que molkky attrape) : pareil.
  const quiLeve = supabaseAuthAdapter({
    client: fakeClient({
      signInAnonymously: async () => {
        throw new Error('Anonymous sign-ins are disabled');
      },
    }).client,
  });
  const attrape = await quiLeve.signInAnonymously();
  assert.equal(attrape.ok, false);
  assert.match(attrape.error.message, /disabled/);
});

test('signOut : délégué, et l’erreur rendue plutôt que levée', async () => {
  const { client, calls } = fakeClient({
    signOut: async () => ({ error: null }),
  });
  const adapter = supabaseAuthAdapter({ client });
  assert.deepEqual(await adapter.signOut(), { ok: true, error: null });
  assert.deepEqual(calls, [['signOut']]);

  const enEchec = supabaseAuthAdapter({
    client: fakeClient({
      signOut: async () => ({ error: { message: 'session introuvable' } }),
    }).client,
  });
  const res = await enEchec.signOut();
  assert.equal(res.ok, false);
  assert.equal(res.error.code, null);
});

/* ── Bout en bout avec le port ─────────────────────────────────────────── */

test('l’adaptateur nourrit la machine d’état du port sans adaptation', async () => {
  const { createAuthClient, AUTH_STATUS } = await import('../auth/index.js');

  let handler = null;
  const session = { user: { id: 'u1' } };
  const { client } = fakeClient({
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: callback => {
      handler = callback;
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
  });
  client.auth.mfa = {
    getAuthenticatorAssuranceLevel: async () => ({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
    }),
  };

  const auth = createAuthClient({ adapter: supabaseAuthAdapter({ client }) });
  assert.equal((await auth.start()).status, AUTH_STATUS.signedOut);

  handler('SIGNED_IN', session);
  await new Promise(resolve => setTimeout(resolve, 0));
  // Facteur vérifié, session encore aal1 : le défi TOTP barre l'accès.
  assert.equal(auth.getSnapshot().status, AUTH_STATUS.needsMfa);
});
