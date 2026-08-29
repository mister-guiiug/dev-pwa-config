// MFA TOTP (`auth/mfa`), fidèle à `mister-doc/src/backend/mfa.ts` : les cas
// de son `mfa.test.ts` sont portés ici, puis chaque décision du module —
// nettoyage des enrôlements abandonnés, filtre « vérifié », meilleur effort —
// est éprouvée contre un client factice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTotpMfa, mfaChallengeNeeded } from '../auth/mfa.js';

/** Un `auth.mfa` factice : facteurs réglables, appels journalisés. */
function fakeMfaClient(overrides = {}) {
  const calls = [];
  const mfa = {
    getAuthenticatorAssuranceLevel: async () => ({
      data: { currentLevel: 'aal1', nextLevel: 'aal1' },
    }),
    listFactors: async () => ({ data: { all: [], totp: [] } }),
    enroll: async () => ({
      data: {
        id: 'factor-1',
        totp: {
          qr_code: 'data:image/svg+xml;utf-8,<svg/>',
          secret: 'ABCDEF',
          uri: 'otpauth://totp/app:compte?secret=ABCDEF',
        },
      },
    }),
    challengeAndVerify: async () => ({ data: {}, error: null }),
    unenroll: async () => ({ data: {}, error: null }),
    ...overrides,
  };
  const spied = {};
  for (const [name, impl] of Object.entries(mfa)) {
    spied[name] = (...args) => {
      calls.push([name, ...args]);
      return impl(...args);
    };
  }
  return { client: { auth: { mfa: spied } }, calls };
}

test('un client Supabase est requis', () => {
  assert.throws(() => createTotpMfa(), /client Supabase/);
});

/* ── mfaChallengeNeeded — les cas portés de doc/mfa.test.ts ────────────── */

test('mfaChallengeNeeded : la table de vérité de doc', () => {
  const cases = [
    // Facteur TOTP vérifié mais session encore au 1er niveau → défi requis.
    [{ current: 'aal1', next: 'aal2' }, true],
    // Déjà élevée en aal2 (code déjà saisi) → plus de défi.
    [{ current: 'aal2', next: 'aal2' }, false],
    // Aucun facteur vérifié → jamais de défi (opt-in).
    [{ current: 'aal1', next: 'aal1' }, false],
    // Session absente / niveau inconnu → pas de défi (ne bloque pas).
    [{ current: null, next: null }, false],
  ];
  for (const [level, expected] of cases) {
    assert.equal(
      mfaChallengeNeeded(level),
      expected,
      `${JSON.stringify(level)} → ${expected}`
    );
  }
});

/* ── Lectures ──────────────────────────────────────────────────────────── */

test('getAssuranceLevel : `{ current, next }`, et l’erreur remonte brute', async () => {
  const { client } = fakeMfaClient({
    getAuthenticatorAssuranceLevel: async () => ({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
    }),
  });
  const totp = createTotpMfa({ client });
  assert.deepEqual(await totp.getAssuranceLevel(), {
    current: 'aal1',
    next: 'aal2',
  });
  assert.equal(await totp.challengeNeeded(), true);

  const enErreur = createTotpMfa({
    client: fakeMfaClient({
      getAuthenticatorAssuranceLevel: async () => ({
        data: null,
        error: { message: 'invalid claim' },
      }),
    }).client,
  });
  await assert.rejects(() => enErreur.getAssuranceLevel(), /invalid claim/);
});

test('verifiedTotpFactorId : le premier VÉRIFIÉ, jamais un enrôlement abandonné', async () => {
  const { client } = fakeMfaClient({
    listFactors: async () => ({
      data: {
        all: [],
        totp: [
          { id: 'brouillon', factor_type: 'totp', status: 'unverified' },
          { id: 'actif', factor_type: 'totp', status: 'verified' },
        ],
      },
    }),
  });
  assert.equal(await createTotpMfa({ client }).verifiedTotpFactorId(), 'actif');

  const aucun = fakeMfaClient({
    listFactors: async () => ({ data: { all: [], totp: [] } }),
  });
  assert.equal(
    await createTotpMfa({ client: aucun.client }).verifiedTotpFactorId(),
    null
  );
});

/* ── Enrôlement ────────────────────────────────────────────────────────── */

test('enrollTotp : rend qr_code/secret/uri TELS QUE Supabase les donne', async () => {
  // C'est ce qu'affichent la MfaCard d'uwh et le TwoFactorEnrollForm de doc :
  // le QR est une data URL SVG (CSP `img-src data:`), le secret la saisie
  // manuelle de secours.
  const { client } = fakeMfaClient();
  const enrollment = await createTotpMfa({ client }).enrollTotp();
  assert.deepEqual(enrollment, {
    factorId: 'factor-1',
    qrCode: 'data:image/svg+xml;utf-8,<svg/>',
    secret: 'ABCDEF',
    uri: 'otpauth://totp/app:compte?secret=ABCDEF',
  });
});

test('enrollTotp : les facteurs non vérifiés d’avant sont d’abord nettoyés', async () => {
  // Le comportement de doc : sans ce nettoyage, les enrôlements abandonnés
  // s'accumulent et finissent en conflit de nom.
  const { client, calls } = fakeMfaClient({
    listFactors: async () => ({
      data: {
        all: [
          { id: 'abandonne', factor_type: 'totp', status: 'unverified' },
          { id: 'actif', factor_type: 'totp', status: 'verified' },
          { id: 'autre', factor_type: 'phone', status: 'unverified' },
        ],
        totp: [{ id: 'actif', factor_type: 'totp', status: 'verified' }],
      },
    }),
  });
  await createTotpMfa({ client }).enrollTotp();

  const unenrolled = calls
    .filter(([name]) => name === 'unenroll')
    .map(([, args]) => args.factorId);
  assert.deepEqual(
    unenrolled,
    ['abandonne'],
    'seul le TOTP non vérifié est retiré — jamais le facteur actif'
  );
});

test('enrollTotp : un nettoyage raté ne bloque pas l’enrôlement', async () => {
  const { client } = fakeMfaClient({
    listFactors: async () => {
      throw new Error('réseau');
    },
  });
  const enrollment = await createTotpMfa({ client }).enrollTotp();
  assert.equal(enrollment.factorId, 'factor-1');
});

test('enrollTotp : l’échec porte le message Supabase d’origine', async () => {
  // Brut, pas traduit : c'est `frAuthError` (auth/errors-fr) qui traduit à
  // l'affichage, par sous-chaîne.
  const { client } = fakeMfaClient({
    enroll: async () => ({
      data: null,
      error: { message: 'A factor with the friendly name already exists' },
    }),
  });
  await assert.rejects(
    () => createTotpMfa({ client }).enrollTotp(),
    /already exists/
  );
});

test('confirmEnrollment : challengeAndVerify avec le code ÉPURÉ', async () => {
  const { client, calls } = fakeMfaClient();
  await createTotpMfa({ client }).confirmEnrollment('factor-1', ' 123456 ');
  assert.deepEqual(calls.at(-1), [
    'challengeAndVerify',
    { factorId: 'factor-1', code: '123456' },
  ]);
});

test('cancelEnrollment est best-effort ; unenroll strict, lui, remonte', async () => {
  const { client } = fakeMfaClient({
    unenroll: async () => ({ error: { message: 'factor not found' } }),
  });
  const totp = createTotpMfa({ client });
  await totp.cancelEnrollment('fantome'); // ne lève pas
  await assert.rejects(() => totp.unenroll('fantome'), /factor not found/);
});

/* ── Défi au login / désactivation ─────────────────────────────────────── */

test('challengeTotp : trouve le facteur vérifié et vérifie le code', async () => {
  const { client, calls } = fakeMfaClient({
    listFactors: async () => ({
      data: {
        all: [],
        totp: [{ id: 'actif', factor_type: 'totp', status: 'verified' }],
      },
    }),
  });
  await createTotpMfa({ client }).challengeTotp('123456');
  assert.deepEqual(calls.at(-1), [
    'challengeAndVerify',
    { factorId: 'actif', code: '123456' },
  ]);
});

test('challengeTotp : sans facteur vérifié, le message de doc', async () => {
  const { client } = fakeMfaClient();
  await assert.rejects(
    () => createTotpMfa({ client }).challengeTotp('123456'),
    /Aucun facteur TOTP à vérifier\./
  );
});

test('challengeTotp : un code refusé porte le message d’origine', async () => {
  const { client } = fakeMfaClient({
    listFactors: async () => ({
      data: {
        all: [],
        totp: [{ id: 'actif', factor_type: 'totp', status: 'verified' }],
      },
    }),
    challengeAndVerify: async () => ({
      error: { message: 'Invalid TOTP code entered' },
    }),
  });
  await assert.rejects(
    () => createTotpMfa({ client }).challengeTotp('000000'),
    /Invalid TOTP code/
  );
});

test('disableTotp : retire TOUS les facteurs TOTP, et rien d’autre', async () => {
  const { client, calls } = fakeMfaClient({
    listFactors: async () => ({
      data: {
        all: [
          { id: 't1', factor_type: 'totp', status: 'verified' },
          { id: 't2', factor_type: 'totp', status: 'unverified' },
          { id: 'p1', factor_type: 'phone', status: 'verified' },
        ],
        totp: [{ id: 't1', factor_type: 'totp', status: 'verified' }],
      },
    }),
  });
  await createTotpMfa({ client }).disableTotp();
  const unenrolled = calls
    .filter(([name]) => name === 'unenroll')
    .map(([, args]) => args.factorId);
  assert.deepEqual(unenrolled, ['t1', 't2']);
});

test('un client sans `auth.mfa` échoue avec un message parlant', async () => {
  const totp = createTotpMfa({ client: { auth: {} } });
  await assert.rejects(() => totp.getAssuranceLevel(), /auth\.mfa/);
});
