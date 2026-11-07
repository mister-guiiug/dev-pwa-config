/**
 * `isTransientMessage` (`react/net.js`) — le motif que miss-uwh et mister-doc
 * portaient au caractère près comme `shouldRetry` de leur file de synchro.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { defaultShouldRetry, isTransientMessage } from '../react/net.js';

test('ce que les navigateurs disent d’une coupure réseau est transitoire', () => {
  for (const message of [
    'Failed to fetch', // Chrome
    'Load failed', // Safari
    'NetworkError when attempting to fetch resource.', // Firefox
    'The operation timed out',
    'request timeout',
    'ECONNRESET',
    'getaddrinfo ENOTFOUND api.example.org',
    'JWT expired',
    '503 Service Unavailable',
    '502 Bad Gateway',
    'Gateway Timeout',
    'Too Many Requests',
  ]) {
    assert.equal(isTransientMessage(message), true, message);
    assert.equal(
      isTransientMessage(new Error(message)),
      true,
      `Error: ${message}`
    );
    assert.equal(isTransientMessage({ message }), true, `objet : ${message}`);
  }
});

test('un code d’erreur système se lit comme un MOT, pas dans un mot', () => {
  // RELEVÉ PAR miss-arcade (07/11/2026) : « borne non reconnue », le refus
  // d'un jeton de borne révoqué (403), contient « econn » — r-ECONN-ue. Il
  // était classé coupure réseau, donc rejoué sans fin par la file d'envoi.
  for (const message of [
    'borne non reconnue',
    'Utilisateur non reconnu',
    'Code de retrait non reconnu',
  ]) {
    assert.equal(isTransientMessage(message), false, message);
  }
  // Les vrais codes de Node restent reconnus, seuls ou dans une phrase.
  for (const message of [
    'connect ECONNREFUSED 127.0.0.1:443',
    'read ECONNRESET',
    'ECONNABORTED',
  ]) {
    assert.equal(isTransientMessage(message), true, message);
  }
});

test('un refus du serveur n’est pas transitoire — réessayer ne changera rien', () => {
  for (const message of [
    'new row violates row-level security policy for table "notes"',
    'duplicate key value violates unique constraint',
    'invalid input syntax for type uuid',
    'permission denied for table members',
    '',
  ]) {
    assert.equal(isTransientMessage(message), false, message || '(vide)');
  }
  assert.equal(isTransientMessage(null), false);
  assert.equal(isTransientMessage(undefined), false);
  assert.equal(isTransientMessage(42), false);
});

test('les deux politiques se complètent : le statut d’abord, le message sinon', () => {
  // Une `TypeError` de `fetch` n'a pas de statut : `defaultShouldRetry` la
  // réessaie par principe, `isTransientMessage` par lecture — et un 403 avec
  // un message anodin n'est réessayé par aucune des deux.
  const coupure = new TypeError('Failed to fetch');
  assert.equal(defaultShouldRetry(coupure), true);
  assert.equal(isTransientMessage(coupure), true);

  const refus = Object.assign(new Error('Forbidden'), { status: 403 });
  assert.equal(defaultShouldRetry(refus), false);
  assert.equal(isTransientMessage(refus), false);
});
