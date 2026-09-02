// Les quatre règles que cinq `format.ts` d'apps réécrivaient par-dessus le
// module : un nombre signé (uwh, genius), des décimales en un mot (uwh), un
// pourcentage à décimales variables (supaboss), un mot pour « jamais »
// (supaboss). Chaque test nomme l'app dont la règle vient.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatRelativeTime,
  formatSigned,
} from '../format.js';

// Les espaces insécables d'`Intl` (U+00A0, U+202F), en échappements : en
// clair, ESLint les refuse (`no-irregular-whitespace`), et on ne les voit pas.
const NBSP = /[\u00a0\u202f]/g;
const plain = text => text.replace(NBSP, ' ');

test('formatSigned : « + » explicite, moins typographique, zéro à la demande (uwh, genius)', () => {
  assert.equal(plain(formatSigned(12.5, { locale: 'fr-FR' })), '+12,5');
  // U+2212, pas le trait d'union qu'`Intl` rendrait avec `signDisplay`.
  assert.equal(plain(formatSigned(-12.5, { locale: 'fr-FR' })), '−12,5');
  // Un solde nul n'a pas de signe (uwh) ; un delta nul dit « = » (genius).
  assert.equal(formatSigned(0, { locale: 'fr-FR' }), '0');
  assert.equal(formatSigned(0, { locale: 'fr-FR', zero: '=' }), '=');
  assert.equal(formatSigned(Number.NaN), '');
  // `plus: false` : le signe négatif seul, pour une colonne déjà titrée.
  assert.equal(plain(formatSigned(3, { locale: 'fr-FR', plus: false })), '3');
});

test('formatSigned : en devise, et par un rendu injecté', () => {
  assert.equal(
    plain(formatSigned(-1234.5, { locale: 'fr-FR', currency: 'EUR' })),
    '−1 234,50 €'
  );
  assert.equal(
    plain(
      formatSigned(1234.5, { locale: 'fr-FR', currency: 'EUR', decimals: 0 })
    ),
    '+1 235 €'
  );
  // Le rendu de l'app (« /20 » de genius) reçoit la valeur ABSOLUE.
  assert.equal(formatSigned(-2, { format: abs => `${abs}/20` }), '−2/20');
});

test('decimals : un mot pour deux options Intl, sur nombre et devise (uwh)', () => {
  assert.equal(
    plain(formatNumber(1234.5678, 'fr-FR', { decimals: 2 })),
    '1 234,57'
  );
  // Arrondi commercial d'`Intl` : ,5 monte.
  assert.equal(plain(formatNumber(1234.5, { decimals: 0 })), '1 235');
  assert.equal(
    plain(formatCurrency(1234.5, 'fr-FR', 'EUR', { decimals: 0 })),
    '1 235 €'
  );
  assert.equal(plain(formatCurrency(1234.5, { decimals: 3 })), '1 234,500 €');
  // Les options Intl explicites l'emportent : `decimals` est un sucre.
  assert.equal(
    plain(
      formatNumber(1.5, 'fr-FR', { decimals: 0, maximumFractionDigits: 1 })
    ),
    '1,5'
  );
  // Une valeur absurde ne casse rien : elle est ignorée.
  assert.equal(plain(formatNumber(1.25, 'fr-FR', { decimals: -1 })), '1,25');
});

test('formatPercentage : « auto » = une décimale sous 10 %, aucune au-dessus (supaboss)', () => {
  assert.equal(plain(formatPercentage(0.075, 'fr-FR', 'auto')), '7,5 %');
  assert.equal(plain(formatPercentage(0.42, 'fr-FR', 'auto')), '42 %');
  assert.equal(plain(formatPercentage(0.0999, 'fr-FR', 'auto')), '10,0 %');
  // Des options en 2ᵉ place, comme partout ailleurs.
  assert.equal(plain(formatPercentage(0.075, { decimals: 'auto' })), '7,5 %');
  assert.equal(plain(formatPercentage(0.4267, { decimals: 1 })), '42,7 %');
  // Le comportement historique ne bouge pas.
  assert.equal(plain(formatPercentage(0.42, 'fr-FR')), '42 %');
  assert.equal(plain(formatPercentage(0.4267, 'fr-FR', 2)), '42,67 %');
});

test('formatRelativeTime : « jamais » pour une date absente, pas « il y a 0 seconde » (supaboss)', () => {
  const now = new Date('2026-09-02T12:00:00Z');
  assert.equal(
    formatRelativeTime(new Date('2026-09-01T12:00:00Z'), {
      locale: 'fr-FR',
      now,
      never: 'jamais',
    }),
    'hier'
  );
  assert.equal(formatRelativeTime(null, { never: 'jamais' }), 'jamais');
  assert.equal(formatRelativeTime(undefined, { never: 'jamais' }), 'jamais');
  assert.equal(formatRelativeTime('pas une date', { never: '—' }), '—');
  // Sans `never`, l'absence reste une chaîne vide, comme avant.
  assert.equal(formatRelativeTime(null), '');
  // La forme positionnelle historique ne bouge pas.
  assert.equal(
    formatRelativeTime(new Date('2026-09-01T12:00:00Z'), 'fr-FR', now),
    'hier'
  );
});
