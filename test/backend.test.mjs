// Sélection et composition de backend (`backend.js`).
//
// PROMU de `mister-family-map/src/app/config/backend.ts`. Ce qui est éprouvé
// ici, ce n'est pas la mécanique heureuse — c'est ce qui se passe quand la
// configuration manque, ment, ou fait lever le SDK. Une app qui ne démarre
// pas sans réseau ne tourne ni hors ligne, ni en test, ni en CI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  backendCoverage,
  composeBackend,
  createBackendSelector,
  missingConfig,
  resolveBackendKind,
} from '../backend.js';

const KINDS = {
  supabase: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
  firebase: ['VITE_FIREBASE_CONFIG'],
};

/* ── Le choix ──────────────────────────────────────────────────────────── */

test('sans configuration, on démarre en local', () => {
  assert.equal(resolveBackendKind({}, { kinds: KINDS }), 'local');
});

test('la configuration complète suffit à choisir', () => {
  const kind = resolveBackendKind(
    { VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'k' },
    { kinds: KINDS }
  );
  assert.equal(kind, 'supabase');
});

test('une configuration à moitié remplie ne choisit pas', () => {
  // L'URL sans la clé : l'app démarrerait et échouerait à la première requête.
  const kind = resolveBackendKind(
    { VITE_SUPABASE_URL: 'https://x.supabase.co' },
    { kinds: KINDS }
  );
  assert.equal(kind, 'local');
});

test('une variable vide ne compte pas comme renseignée', () => {
  const kind = resolveBackendKind(
    { VITE_SUPABASE_URL: '  ', VITE_SUPABASE_ANON_KEY: 'k' },
    { kinds: KINDS }
  );
  assert.equal(kind, 'local');
});

test('le choix explicite gagne sur la configuration présente', () => {
  const env = {
    VITE_BACKEND: 'local',
    VITE_SUPABASE_URL: 'https://x.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'k',
  };
  assert.equal(resolveBackendKind(env, { kinds: KINDS }), 'local');
});

test('un choix explicite INCONNU est ignoré, pas fatal', () => {
  // Une faute de frappe dans un `.env` ne doit pas empêcher l'app de démarrer.
  const kind = resolveBackendKind(
    { VITE_BACKEND: 'supabse' },
    { kinds: KINDS }
  );
  assert.equal(kind, 'local');
});

test('missingConfig nomme ce qui manque', () => {
  assert.deepEqual(missingConfig({ A: '1' }, ['A', 'B', 'C']), ['B', 'C']);
});

/* ── La composition port par port ──────────────────────────────────────── */

const local = {
  places: 'local:places',
  events: 'local:events',
  auth: 'local:auth',
};

test('seuls les ports fournis sont remplacés', () => {
  const composed = composeBackend(local, { places: 'supabase:places' });
  assert.deepEqual(composed, {
    places: 'supabase:places',
    events: 'local:events',
    auth: 'local:auth',
  });
});

test('un adaptateur pas encore écrit se laisse écrire `undefined`', () => {
  // C'est ce qui rend l'appel lisible pendant une migration en cours.
  const composed = composeBackend(local, {
    places: 'supabase:places',
    events: undefined,
    auth: null,
  });
  assert.equal(composed.events, 'local:events');
  assert.equal(composed.auth, 'local:auth');
});

test('la base n’est pas modifiée', () => {
  composeBackend(local, { places: 'x' });
  assert.equal(local.places, 'local:places');
});

test('la couverture dit où en est la migration', () => {
  const couverture = backendCoverage(local, { places: 'x' }, 'supabase');
  assert.deepEqual(couverture, {
    kind: 'supabase',
    remote: ['places'],
    local: ['auth', 'events'],
  });
});

/* ── Le sélecteur complet ──────────────────────────────────────────────── */

function selector(onFallback) {
  return createBackendSelector({
    fallback: () => ({ ...local }),
    backends: {
      supabase: {
        requires: KINDS.supabase,
        create: env => ({ places: `supabase:${env.VITE_SUPABASE_URL}` }),
      },
    },
    ...(onFallback ? { onFallback } : {}),
  });
}

test('le sélecteur compose et rapporte', () => {
  const result = selector()({
    VITE_SUPABASE_URL: 'https://x.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'k',
  });
  assert.equal(result.backend.places, 'supabase:https://x.supabase.co');
  assert.equal(result.backend.events, 'local:events');
  assert.deepEqual(result.remote, ['places']);
  assert.equal(result.kind, 'supabase');
});

test('un SDK qui LÈVE ne doit pas empêcher l’app de démarrer', () => {
  // Une URL malformée fait lever `createClient` : l'app doit repartir en local
  // plutôt que d'afficher un écran blanc.
  const vus = [];
  const select = createBackendSelector({
    fallback: () => ({ ...local }),
    backends: {
      supabase: {
        requires: KINDS.supabase,
        create: () => {
          throw new Error('Invalid URL');
        },
      },
    },
    onFallback: info => vus.push(info),
  });

  const result = select({
    VITE_SUPABASE_URL: 'pas-une-url',
    VITE_SUPABASE_ANON_KEY: 'k',
  });
  assert.equal(result.backend.places, 'local:places');
  assert.equal(result.kind, null);
  assert.equal(vus.length, 1);
  assert.match(String(vus[0].error), /Invalid URL/);
});

test('une configuration incomplète est SIGNALÉE, pas devinée', () => {
  const vus = [];
  // Le choix explicite force `supabase`, mais la clé manque : le silence
  // ferait croire à un backend distant qui n'existe pas.
  const select = selector(info => vus.push(info));
  const result = select({
    VITE_BACKEND: 'supabase',
    VITE_SUPABASE_URL: 'https://x.supabase.co',
  });
  assert.equal(result.backend.places, 'local:places');
  assert.deepEqual(vus, [
    { kind: 'supabase', missing: ['VITE_SUPABASE_ANON_KEY'] },
  ]);
});

test('un repli est OBLIGATOIRE à la déclaration', () => {
  assert.throws(
    () => createBackendSelector({ backends: {} }),
    /`fallback` est requis/
  );
});
