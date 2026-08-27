// Notifications push : le port (`push/index.js`) et ses transports.
//
// CE QUE CES TESTS TIENNENT. Ce module est du NEUF — aucun code push n'existait
// dans les dépôts relevés. Il n'y a donc pas d'usage réel pour le corriger : la
// seule protection est d'éprouver chaque décision qui pourrait mal tourner chez
// l'utilisateur, en particulier celles qu'on ne voit pas en développement (un
// iPhone en onglet, une permission déjà refusée, un désabonnement à l'envers).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const load = () => import('../push/index.js');

/** Un environnement de navigateur, à composer panne par panne. */
function fakeEnv(overrides = {}) {
  const subscription = {
    endpoint: 'https://push.example/abc',
    expirationTime: null,
    getKey: name => new TextEncoder().encode(`clé-${name}`),
    unsubscribe: async () => true,
  };
  const pushManager = {
    subscribed: null,
    getSubscription: async () => pushManager.subscribed,
    subscribe: async options => {
      pushManager.lastOptions = options;
      pushManager.subscribed = subscription;
      return subscription;
    },
  };
  const env = {
    PushManager: function PushManager() {},
    Notification: {
      permission: 'default',
      requestPermission: async () => 'granted',
    },
    navigator: { serviceWorker: { ready: Promise.resolve({ pushManager }) } },
    matchMedia: () => ({ matches: false }),
    ...overrides,
  };
  env.__pushManager = pushManager;
  env.__subscription = subscription;
  return env;
}

/* ── Ce que la plateforme impose ───────────────────────────────────────── */

test('un iPhone en ONGLET dit « installez l’app », pas « impossible »', async () => {
  const { pushSupport } = await load();
  // Safari refuse le push aux onglets : sur iPhone, l'app doit être ajoutée à
  // l'écran d'accueil. Un « non » indistinct empêcherait d'écrire le seul
  // message utile à cet utilisateur.
  const onglet = fakeEnv({ PushManager: undefined });
  delete onglet.PushManager;
  const verdict = pushSupport(onglet);

  assert.equal(verdict.supported, false);
  assert.equal(verdict.reason, 'requires-installed-app');
  assert.equal(verdict.standalone, false);
});

test('installée, l’absence de PushManager redevient un vrai refus', async () => {
  const { pushSupport } = await load();
  const installee = fakeEnv({ matchMedia: () => ({ matches: true }) });
  delete installee.PushManager;

  const verdict = pushSupport(installee);
  assert.equal(verdict.standalone, true);
  assert.equal(verdict.reason, 'no-push-manager');
});

test('sans service worker, on le dit — le push arrive au worker', async () => {
  const { pushSupport } = await load();
  const verdict = pushSupport(fakeEnv({ navigator: {} }));
  assert.equal(verdict.reason, 'no-service-worker');
});

test('une permission déjà refusée n’est pas redemandée', async () => {
  const { requestPermission } = await load();
  let demandes = 0;
  const env = fakeEnv({
    Notification: {
      permission: 'denied',
      requestPermission: async () => {
        demandes += 1;
        return 'denied';
      },
    },
  });

  assert.equal(await requestPermission(env), 'denied');
  // Redemander sur `denied` ne montre rien et rend `denied` : ça donne
  // l'illusion d'avoir réessayé, et l'app brûle sa seule cartouche.
  assert.equal(demandes, 0, 'aucune demande ne doit partir');
});

/* ── Les clés VAPID ────────────────────────────────────────────────────── */

test('base64url n’est PAS base64 — l’aller-retour doit tenir', async () => {
  const { urlBase64ToUint8Array, uint8ArrayToUrlBase64 } = await load();
  // Des octets choisis pour produire `-` et `_` en base64url, là où base64
  // donnerait `+` et `/`. C'est l'erreur que la moitié des copies fait.
  const octets = new Uint8Array([0xfb, 0xef, 0xbe, 0x00, 0x11, 0xff]);
  const encode = uint8ArrayToUrlBase64(octets);

  assert.ok(
    !encode.includes('+') && !encode.includes('/'),
    'base64url attendu'
  );
  assert.ok(!encode.includes('='), 'sans remplissage');
  assert.deepEqual([...urlBase64ToUint8Array(encode)], [...octets]);
});

/* ── Le cycle de vie ───────────────────────────────────────────────────── */

test('refuser les notifications n’est pas une panne', async () => {
  const { createPushClient } = await load();
  const env = fakeEnv({
    Notification: {
      permission: 'default',
      requestPermission: async () => 'denied',
    },
  });
  const client = createPushClient({
    transport: { save: async () => {}, remove: async () => {} },
    vapidKey: 'AAAA',
    env,
  });

  // Rendre un résultat plutôt que lever : un refus est un choix ordinaire de
  // l'utilisateur, et il n'a rien à faire dans le rapport d'erreurs.
  const result = await client.subscribe();
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'permission-denied');
  assert.equal(result.subscription, null);
});

test('sans clé VAPID, on refuse au lieu de s’abonner dans le vide', async () => {
  const { createPushClient } = await load();
  const client = createPushClient({
    transport: { save: async () => {}, remove: async () => {} },
    env: fakeEnv({
      Notification: {
        permission: 'granted',
        requestPermission: async () => 'granted',
      },
    }),
  });
  const result = await client.subscribe();
  assert.equal(result.reason, 'missing-vapid-key');
});

test('un abonnement réussi part au serveur, avec ses clés', async () => {
  const { createPushClient } = await load();
  const env = fakeEnv({
    Notification: {
      permission: 'granted',
      requestPermission: async () => 'granted',
    },
  });
  const enregistres = [];
  const client = createPushClient({
    transport: {
      save: async (sub, ctx) => enregistres.push({ sub, ctx }),
      remove: async () => {},
      key: () => 'BFxK-_1234',
    },
    env,
  });

  const result = await client.subscribe({ userId: 'u-1' });
  assert.equal(result.ok, true);

  // `userVisibleOnly: false` est refusé par tous les navigateurs.
  assert.equal(env.__pushManager.lastOptions.userVisibleOnly, true);
  assert.ok(
    env.__pushManager.lastOptions.applicationServerKey instanceof Uint8Array
  );

  const [{ sub, ctx }] = enregistres;
  assert.equal(sub.endpoint, 'https://push.example/abc');
  assert.ok(sub.keys.p256dh.length > 0, 'la clé publique doit partir');
  assert.ok(sub.keys.auth.length > 0, 'le secret d’authentification aussi');
  assert.deepEqual(ctx, { userId: 'u-1' });
});

test('se réabonner ne crée pas un second abonnement', async () => {
  const { createPushClient } = await load();
  const env = fakeEnv({
    Notification: {
      permission: 'granted',
      requestPermission: async () => 'granted',
    },
  });
  env.__pushManager.subscribed = env.__subscription;
  let souscriptions = 0;
  env.__pushManager.subscribe = async () => {
    souscriptions += 1;
    return env.__subscription;
  };

  const client = createPushClient({
    transport: {
      save: async () => {},
      remove: async () => {},
      key: () => 'AAAA',
    },
    env,
  });
  const result = await client.subscribe();

  assert.equal(result.ok, true);
  assert.equal(souscriptions, 0, 'l’abonnement existant est réutilisé');
});

test('le désabonnement passe par le SERVEUR d’abord', async () => {
  const { createPushClient } = await load();
  const env = fakeEnv();
  env.__pushManager.subscribed = env.__subscription;

  const ordre = [];
  env.__subscription.unsubscribe = async () => {
    ordre.push('navigateur');
    return true;
  };

  const client = createPushClient({
    transport: {
      save: async () => {},
      remove: async sub => {
        // Si le navigateur se désinscrivait d'abord, ce point de terminaison
        // serait perdu : le serveur continuerait d'envoyer dans le vide, et
        // l'utilisateur qui a dit non recevrait encore.
        assert.equal(sub.endpoint, 'https://push.example/abc');
        ordre.push('serveur');
      },
    },
    env,
  });

  const result = await client.unsubscribe();
  assert.equal(result.ok, true);
  assert.deepEqual(ordre, ['serveur', 'navigateur']);
});

test('se désabonner sans abonnement est un succès, pas une erreur', async () => {
  const { createPushClient } = await load();
  const client = createPushClient({
    transport: { save: async () => {}, remove: async () => {} },
    env: fakeEnv(),
  });
  const result = await client.unsubscribe();
  assert.equal(result.ok, true);
  assert.equal(result.reason, 'not-subscribed');
});

test('un transport est OBLIGATOIRE — le paquet n’impose aucun fournisseur', async () => {
  const { createPushClient } = await load();
  assert.throws(() => createPushClient({}), /transport est requis/);
});

/* ── Les transports livrés ─────────────────────────────────────────────── */

test('Supabase : `upsert` sur le point de terminaison, et RLS respectée', async () => {
  const { supabasePushTransport } = await import('../push/supabase.js');
  const appels = [];
  const client = {
    from: table => ({
      upsert: async (row, options) => {
        appels.push({ table, row, options });
        return { error: null };
      },
      delete: () => ({
        eq: async (col, value) => {
          appels.push({ table, delete: { [col]: value } });
          return { error: null };
        },
      }),
    }),
    auth: { getUser: async () => ({ data: { user: { id: 'u-42' } } }) },
  };

  const transport = supabasePushTransport({ client, vapidKey: 'AAAA' });
  await transport.save({
    endpoint: 'https://push.example/x',
    keys: { p256dh: 'p', auth: 'a' },
  });

  const [insert] = appels;
  assert.equal(insert.table, 'push_subscriptions');
  assert.equal(insert.row.user_id, 'u-42', 'l’utilisateur vient de la session');
  // Idempotent : le point de terminaison est la clé, pas un identifiant
  // technique — un réabonnement remplace, il ne duplique pas.
  assert.equal(insert.options.onConflict, 'endpoint');

  await transport.remove({ endpoint: 'https://push.example/x' });
  assert.deepEqual(appels[1].delete, { endpoint: 'https://push.example/x' });
});

test('Supabase sans utilisateur : on le dit ici, pas dans une erreur SQL', async () => {
  const { supabasePushTransport } = await import('../push/supabase.js');
  const transport = supabasePushTransport({
    client: {
      from: () => ({ upsert: async () => ({ error: null }) }),
      auth: { getUser: async () => ({ data: {} }) },
    },
  });
  await assert.rejects(
    () => transport.save({ endpoint: 'e', keys: { p256dh: 'p', auth: 'a' } }),
    /utilisateur inconnu/
  );
});

test('Firebase exige `save`/`remove` : FCM ne range aucun jeton', async () => {
  const { firebasePushTransport } = await import('../push/firebase.js');
  // Le taire ferait croire à une persistance qui n'existe pas.
  assert.throws(
    () =>
      firebasePushTransport({
        messaging: {},
        getToken: async () => 'jeton',
        vapidKey: 'AAAA',
      }),
    /ne conserve pas les jetons/
  );
});

test('HTTP : les en-têtes de corrélation partent avec l’abonnement', async () => {
  const { httpPushTransport } = await import('../push/webpush.js');
  const vus = [];
  const transport = httpPushTransport({
    subscribeUrl: 'https://api.example/push',
    fetch: async (url, init) => {
      vus.push({ url, init });
      return { ok: true, status: 200, statusText: 'OK' };
    },
  });

  await transport.save(
    { endpoint: 'e', keys: { p256dh: 'p', auth: 'a' } },
    { u: 1 }
  );
  const [{ url, init }] = vus;

  assert.equal(url, 'https://api.example/push');
  assert.equal(init.method, 'POST');
  // Un abonnement qui échoue doit être rapprochable de la session qui l'a tenté.
  assert.ok(
    Object.keys(init.headers).some(h => /correlation|request|session/i.test(h)),
    `aucun en-tête de corrélation dans ${JSON.stringify(init.headers)}`
  );
  assert.equal(init.credentials, 'include');
});

test('HTTP : un serveur qui refuse fait échouer l’abonnement proprement', async () => {
  const { createPushClient } = await load();
  const { httpPushTransport } = await import('../push/webpush.js');
  const env = fakeEnv({
    Notification: {
      permission: 'granted',
      requestPermission: async () => 'granted',
    },
  });

  const client = createPushClient({
    transport: httpPushTransport({
      subscribeUrl: 'https://api.example/push',
      vapidKey: 'AAAA',
      fetch: async () => ({
        ok: false,
        status: 503,
        statusText: 'Service Unavailable',
      }),
    }),
    env,
  });

  const result = await client.subscribe();
  assert.equal(result.ok, false);
  assert.equal(result.reason, 'subscribe-failed');
});
