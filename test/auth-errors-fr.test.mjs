// Carte française des erreurs d'authentification (`auth/errors-fr`).
//
// Les cas des DEUX sources sont portés : ceux de
// `mister-doc/src/lib/authErrors.test.ts` (sous-chaînes) et ceux de
// `miss-carbook/src/lib/authEmailErrors.test.ts` (codes stables). Puis la
// fusion elle-même est éprouvée : le code gagne sur la sous-chaîne, et le
// repli est configurable.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frAuthError, GENERIC_AUTH_ERROR_FR } from '../auth/errors-fr.js';

/* ── Les cas portés de doc/authErrors.test.ts ──────────────────────────── */

test('doc : identifiants invalides', () => {
  assert.equal(
    frAuthError('Invalid login credentials'),
    'E-mail ou mot de passe incorrect.'
  );
});

test('doc : e-mail non confirmé', () => {
  assert.match(frAuthError('Email not confirmed'), /non confirmé/);
});

test('doc : compte déjà existant', () => {
  assert.match(frAuthError('User already registered'), /existe déjà/);
});

test('doc : mot de passe trop court', () => {
  assert.match(
    frAuthError('Password should be at least 8 characters'),
    /8 caractères/
  );
});

test('doc : code TOTP invalide (MFA)', () => {
  assert.match(frAuthError('Invalid TOTP code entered'), /6 chiffres/);
  assert.match(frAuthError('MFA verification failed'), /6 chiffres/);
});

test('doc : limitation de débit', () => {
  assert.match(
    frAuthError(
      'For security purposes, you can only request this after 40 seconds'
    ),
    /Trop de tentatives/
  );
});

test('doc : erreur réseau', () => {
  assert.match(frAuthError('Failed to fetch'), /réseau/);
});

test('doc : repli générique français', () => {
  assert.equal(
    frAuthError('some unmapped backend error'),
    GENERIC_AUTH_ERROR_FR
  );
  assert.equal(frAuthError(undefined), GENERIC_AUTH_ERROR_FR);
  assert.equal(frAuthError(null), GENERIC_AUTH_ERROR_FR);
});

/* ── Les cas portés de carbook/authEmailErrors.test.ts ─────────────────── */

test('carbook : le plafond d’envoi d’e-mails Supabase, reconnu par son CODE', () => {
  const message = frAuthError({
    name: 'AuthApiError',
    message: 'email rate limit exceeded',
    code: 'over_email_send_rate_limit',
  });
  assert.match(message, /Trop de demandes/);
  // Le code gagne sur la sous-chaîne : « rate limit » seul aurait donné la
  // limitation générique, le code désigne le plafond d'ENVOI et son texte
  // dit quoi faire (patienter, vérifier les indésirables).
  assert.match(
    frAuthError({ code: 'over_email_send_rate_limit', message: 'rate limit' }),
    /indésirables/
  );
});

test('carbook : identifiants invalides par code stable', () => {
  assert.match(
    frAuthError({
      code: 'invalid_credentials',
      message: 'Invalid login credentials',
    }),
    /incorrect/
  );
  assert.match(
    frAuthError({ code: 'invalid_grant', message: 'x' }),
    /incorrect/
  );
});

test('carbook : `fallback: null` laisse l’appelant décider de l’inconnu', () => {
  assert.equal(
    frAuthError(new Error('boom inconnu'), { fallback: null }),
    null
  );
  assert.equal(
    frAuthError('some unmapped backend error', { fallback: null }),
    null
  );
  // Mais une erreur RECONNUE est toujours traduite, repli ou pas.
  assert.match(
    frAuthError({ code: 'weak_password', message: 'x' }, { fallback: null }),
    /mot de passe/i
  );
});

test('carbook : e-mail refusé et inscriptions closes, par code', () => {
  assert.equal(
    frAuthError({ code: 'email_address_invalid', message: 'x' }),
    'Adresse e-mail invalide.'
  );
  assert.match(
    frAuthError({ code: 'signup_disabled', message: 'x' }),
    /inscriptions sont désactivées/
  );
});

/* ── La fusion elle-même ───────────────────────────────────────────────── */

test('accepte tous les emballages : chaîne, Error, objet API', () => {
  const attendu = 'E-mail ou mot de passe incorrect.';
  assert.equal(frAuthError('Invalid login credentials'), attendu);
  assert.equal(frAuthError(new Error('Invalid login credentials')), attendu);
  assert.equal(
    frAuthError({ code: 'invalid_credentials', message: '' }),
    attendu
  );
});

test('un facteur existant n’est PAS un compte existant (ordre corrigé)', () => {
  // Dans l'ordre de doc, « A factor … already exists » tombait dans la
  // branche « Un compte existe déjà » : la branche facteur était
  // inatteignable pour ce libellé réel de l'API MFA.
  assert.match(
    frAuthError('A factor with the friendly name already exists'),
    /facteur/
  );
  assert.match(frAuthError('User already registered'), /compte existe déjà/);
});

test('MFA : le niveau d’assurance exigé est expliqué', () => {
  assert.match(
    frAuthError('AAL2 required to update this factor'),
    /deux étapes/
  );
});

test('signups désactivés par sous-chaîne (doc)', () => {
  assert.match(
    frAuthError('Signups not allowed for this instance'),
    /inscriptions sont désactivées/
  );
});

test('un repli personnalisé remplace le générique', () => {
  assert.equal(
    frAuthError('mystère', { fallback: 'Réessayez plus tard.' }),
    'Réessayez plus tard.'
  );
});

test('jamais de texte technique : tout chemin rend du français ou null', () => {
  const bruts = [
    'Invalid login credentials',
    'Email not confirmed',
    'User already registered',
    'Password should be at least 8 characters',
    'Invalid TOTP code entered',
    'A factor with the friendly name already exists',
    'AAL2 required',
    'Unable to validate email address: invalid format',
    'email rate limit exceeded',
    'Signups not allowed',
    'Failed to fetch',
    'garbage',
  ];
  for (const brut of bruts) {
    const message = frAuthError(brut);
    assert.equal(typeof message, 'string');
    assert.notEqual(message, brut, `« ${brut} » est ressorti tel quel`);
  }
});
