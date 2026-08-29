// Fabrique de client Supabase (`supabase-client.js`).
//
// Les deux garanties du module sont exactement ce qui ne se voit pas en
// développement, où `.env` est toujours rempli : le comportement quand la
// configuration MANQUE (la doctrine anti-écran-blanc), et le moment où le SDK
// est réellement chargé (la paresse). Le SDK lui-même est une peer optionnelle
// absente de ce dépôt : tout passe par un module factice injecté via `loader`
// — ce qui éprouve, au passage, le contrat qu'attendent les vrais bundles.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  SUPABASE_ENV_KEYS,
  supabaseConfig,
  createSupabaseClientFactory,
} from '../supabase-client.js';

/** Un SDK factice : rend le `loader` et de quoi observer ce qu'il a reçu. */
function fakeSdk() {
  const calls = [];
  let loads = 0;
  return {
    calls,
    get loads() {
      return loads;
    },
    loader: () => {
      loads += 1;
      return Promise.resolve({
        createClient: (url, anonKey, options) => {
          const client = { url, anonKey, options };
          calls.push(client);
          return client;
        },
      });
    },
  };
}

const ENV = {
  VITE_SUPABASE_URL: 'https://exemple.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'anon-publique',
};

/* ── La configuration manquante ────────────────────────────────────────── */

test('sans environnement, les deux variables manquent', () => {
  const { url, anonKey, missing } = supabaseConfig();
  assert.equal(url, null);
  assert.equal(anonKey, null);
  assert.deepEqual(missing, [...SUPABASE_ENV_KEYS]);
});

test('une valeur blanche est absente — le juge est missingConfig', () => {
  // Même détection que ./backend.js : deux modules qui jugeraient différemment
  // la même variable donneraient un backend « configuré » ici, « manquant » là.
  const { missing } = supabaseConfig({
    VITE_SUPABASE_URL: '   ',
    VITE_SUPABASE_ANON_KEY: 'anon',
  });
  assert.deepEqual(missing, ['VITE_SUPABASE_URL']);
});

test('les noms de variables sont surchargeables', () => {
  const config = supabaseConfig(
    { SB_URL: 'https://autre.supabase.co', SB_KEY: 'k' },
    { urlKey: 'SB_URL', anonKeyKey: 'SB_KEY' }
  );
  assert.equal(config.url, 'https://autre.supabase.co');
  assert.deepEqual(config.missing, []);
});

test('config manquante : `getClient` rejette en NOMMANT les variables', async () => {
  const sdk = fakeSdk();
  const factory = createSupabaseClientFactory({
    env: { VITE_SUPABASE_URL: 'https://exemple.supabase.co' },
    loader: sdk.loader,
  });

  assert.equal(factory.isConfigured(), false);
  assert.deepEqual(factory.missing(), ['VITE_SUPABASE_ANON_KEY']);
  await assert.rejects(
    () => factory.getClient(),
    /VITE_SUPABASE_ANON_KEY/,
    'le message doit dire QUOI définir'
  );
  // Et le SDK n'a jamais été chargé pour ça.
  assert.equal(sdk.loads, 0);
});

test('la fabrique se construit sans lever, même sans configuration', () => {
  // La doctrine anti-écran-blanc : la construction a lieu au chargement du
  // module de l'app, AVANT `createRoot` — lever ici referait l'écran blanc.
  const factory = createSupabaseClientFactory();
  assert.equal(factory.isConfigured(), false);
});

/* ── La paresse ────────────────────────────────────────────────────────── */

test('rien n’est chargé avant le premier `getClient`', async () => {
  const sdk = fakeSdk();
  const factory = createSupabaseClientFactory({ env: ENV, loader: sdk.loader });
  assert.equal(sdk.loads, 0, 'construire la fabrique ne charge pas le SDK');

  const client = await factory.getClient();
  assert.equal(sdk.loads, 1);
  assert.equal(client.url, ENV.VITE_SUPABASE_URL);
  assert.equal(client.anonKey, ENV.VITE_SUPABASE_ANON_KEY);
});

test('deux appels concurrents ne créent qu’UN client', async () => {
  // C'est la promesse qui est gardée, pas sa valeur : garder la valeur laisse
  // deux `await` simultanés construire chacun le leur.
  const sdk = fakeSdk();
  const factory = createSupabaseClientFactory({ env: ENV, loader: sdk.loader });

  const [a, b] = await Promise.all([factory.getClient(), factory.getClient()]);
  assert.equal(a, b);
  assert.equal(sdk.loads, 1);
  assert.equal(sdk.calls.length, 1);
});

test('un chargement en échec n’est pas gardé : l’appel suivant retente', async () => {
  let tries = 0;
  const factory = createSupabaseClientFactory({
    env: ENV,
    loader: () => {
      tries += 1;
      return tries === 1
        ? Promise.reject(new Error('réseau qui tousse'))
        : Promise.resolve({ createClient: () => ({ ok: true }) });
    },
  });

  await assert.rejects(() => factory.getClient(), /réseau qui tousse/);
  const client = await factory.getClient();
  assert.deepEqual(client, { ok: true });
  assert.equal(tries, 2);
});

test('un module sans `createClient` est dit clairement', async () => {
  const factory = createSupabaseClientFactory({
    env: ENV,
    loader: () => Promise.resolve({}),
  });
  await assert.rejects(() => factory.getClient(), /@supabase\/supabase-js/);
});

test('`reset` oublie le client : le prochain appel recrée', async () => {
  const sdk = fakeSdk();
  const factory = createSupabaseClientFactory({ env: ENV, loader: sdk.loader });
  await factory.getClient();
  factory.reset();
  await factory.getClient();
  assert.equal(sdk.loads, 2);
});

/* ── Les options ───────────────────────────────────────────────────────── */

test('auth par défaut : session persistée, jeton rafraîchi', async () => {
  const sdk = fakeSdk();
  const factory = createSupabaseClientFactory({ env: ENV, loader: sdk.loader });
  const { options } = await factory.getClient();
  assert.equal(options.auth.persistSession, true);
  assert.equal(options.auth.autoRefreshToken, true);
});

test('`auth` se surcharge : persistSession false, flowType pkce', async () => {
  // Les deux variantes réelles : mister-molkky (`persistSession: false`) et
  // mister-doc / miss-uwh (`flowType: 'pkce'`).
  const sdk = fakeSdk();
  const factory = createSupabaseClientFactory({
    env: ENV,
    auth: { persistSession: false, flowType: 'pkce' },
    loader: sdk.loader,
  });
  const { options } = await factory.getClient();
  assert.equal(options.auth.persistSession, false);
  assert.equal(
    options.auth.autoRefreshToken,
    true,
    'le reste des défauts tient'
  );
  assert.equal(options.auth.flowType, 'pkce');
});

test('`clientOptions` passe le reste, `auth` garde le dernier mot', async () => {
  const sdk = fakeSdk();
  const factory = createSupabaseClientFactory({
    env: ENV,
    auth: { persistSession: false },
    clientOptions: {
      realtime: { params: { eventsPerSecond: 10 } },
      auth: { persistSession: true, detectSessionInUrl: true },
    },
    loader: sdk.loader,
  });
  const { options } = await factory.getClient();
  assert.deepEqual(options.realtime, { params: { eventsPerSecond: 10 } });
  assert.equal(options.auth.detectSessionInUrl, true);
  assert.equal(
    options.auth.persistSession,
    false,
    '`auth` gagne sur clientOptions'
  );
});

/* ── Le fetch injecté, corrélé ou non ──────────────────────────────────── */

test('un `fetch` fourni arrive dans `global.fetch`', async () => {
  const sdk = fakeSdk();
  const myFetch = () => Promise.resolve(new Response('ok'));
  const factory = createSupabaseClientFactory({
    env: ENV,
    fetch: myFetch,
    loader: sdk.loader,
  });
  const { options } = await factory.getClient();
  assert.equal(options.global.fetch, myFetch);
});

test('`correlated: true` : chaque requête part avec ses en-têtes', async () => {
  // Le motif du bac-sable : le journal du serveur et l'erreur côté client
  // doivent désigner le même incident.
  const sdk = fakeSdk();
  const seen = [];
  const inner = (input, init) => {
    seen.push(init.headers);
    return Promise.resolve(new Response('ok'));
  };
  const factory = createSupabaseClientFactory({
    env: ENV,
    fetch: inner,
    correlated: true,
    loader: sdk.loader,
  });

  const { options } = await factory.getClient();
  assert.notEqual(options.global.fetch, inner, 'le fetch est enveloppé');
  await options.global.fetch('https://exemple.supabase.co/rest/v1/x');

  assert.equal(seen.length, 1);
  assert.ok(seen[0].get('X-Correlation-Id'), 'identifiant de requête posé');
  assert.ok(seen[0].get('X-Session-Id'), 'identifiant de session posé');
});

test('sans `fetch` ni `correlated`, on ne touche pas à `global`', async () => {
  // Le SDK garde alors le sien : ne pas surcharger vaut mieux que surcharger
  // avec la même chose.
  const sdk = fakeSdk();
  const factory = createSupabaseClientFactory({ env: ENV, loader: sdk.loader });
  const { options } = await factory.getClient();
  assert.equal(options.global, undefined);
});
