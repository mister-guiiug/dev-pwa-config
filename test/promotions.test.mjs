/**
 * Promotions du 30/08/2026 — modules PURS (sans DOM) et extensions des
 * modules existants. Les hooks et composants React sont couverts par
 * `react-promotions.test.mjs`.
 */
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { HAPTIC_PATTERNS, canVibrate, vibrate } from '../haptics.js';
import { localeToBcp47, speak } from '../speech.js';
import { createRateLimiter } from '../rate-limit.js';
import { parseBanResponse, geocode } from '../geocode-ban.js';
import {
  isSameDay,
  startOfDay,
  endOfDay,
  addDays,
  rangesOverlap,
  toIsoDate,
  fromIsoDate,
} from '../dates.js';
import { validateImageFile, IMAGE_MAX_BYTES } from '../image.js';
import { formatCount, formatUsage, formatDuration } from '../format.js';
import {
  sanitizeUserText,
  sanitizeSingleLine,
  sanitizeInput,
  isSafeHttpUrl,
} from '../security.js';
import { classifyBackendError } from '../backend.js';

const originalNavigator = globalThis.navigator;
afterEach(() => {
  Object.defineProperty(globalThis, 'navigator', {
    value: originalNavigator,
    configurable: true,
    writable: true,
  });
});

/* ── haptics ────────────────────────────────────────────────────────────── */

test('vibrate : no-op silencieux sans API, appel réel sinon', () => {
  // Node n'a pas navigator.vibrate : aucun crash, juste `false`.
  assert.equal(canVibrate(), false);
  assert.equal(vibrate('tap'), false);

  const calls = [];
  Object.defineProperty(globalThis, 'navigator', {
    value: { vibrate: p => (calls.push(p), true) },
    configurable: true,
    writable: true,
  });
  assert.equal(vibrate('victory'), true);
  assert.deepEqual(calls, [HAPTIC_PATTERNS.victory]);
  assert.equal(vibrate(25), true);
  assert.equal(vibrate('inconnu'), false);
});

/* ── speech ─────────────────────────────────────────────────────────────── */

test('localeToBcp47 : locale courte convertie, étiquette complète intacte', () => {
  assert.equal(localeToBcp47('fr'), 'fr-FR');
  assert.equal(localeToBcp47('pt-BR'), 'pt-BR');
  assert.equal(localeToBcp47('xx'), 'en-US');
});

test('speak : `false` sans Web Speech, jamais d’erreur', () => {
  assert.equal(speak('bonjour'), false);
});

/* ── rate-limit ─────────────────────────────────────────────────────────── */

test('createRateLimiter : fenêtre glissante, horloge injectée', () => {
  let now = 0;
  const limiter = createRateLimiter(2, 1000, () => now);
  assert.equal(limiter.tryAcquire(), true);
  assert.equal(limiter.tryAcquire(), true);
  assert.equal(limiter.tryAcquire(), false);
  assert.equal(limiter.retryInMs(), 1000);
  now = 600;
  assert.equal(limiter.retryInMs(), 400);
  now = 1001; // le premier jeton sort de la fenêtre
  assert.equal(limiter.tryAcquire(), true);
});

/* ── geocode-ban ────────────────────────────────────────────────────────── */

test('parseBanResponse : GeoJSON [lng, lat] remis dans le bon ordre', () => {
  const result = parseBanResponse({
    features: [
      {
        geometry: { coordinates: [4.83, 45.75] },
        properties: {
          label: 'Lyon',
          postcode: '69007',
          city: 'Lyon',
          score: 0.9,
        },
      },
    ],
  });
  assert.deepEqual(result, {
    lat: 45.75,
    lng: 4.83,
    label: 'Lyon',
    postcode: '69007',
    city: 'Lyon',
    score: 0.9,
  });
  assert.equal(parseBanResponse({ features: [] }), null);
  assert.equal(parseBanResponse(null), null);
});

test('geocode : fetch injectable, requête vide court-circuitée', async () => {
  const urls = [];
  const fetchImpl = async url => {
    urls.push(url);
    return {
      ok: true,
      json: async () => ({
        features: [{ geometry: { coordinates: [2, 48] }, properties: {} }],
      }),
    };
  };
  const hit = await geocode(' Paris ', { fetchImpl, baseUrl: 'https://x' });
  assert.equal(hit?.lat, 48);
  assert.match(urls[0], /^https:\/\/x\/search\/\?q=Paris&limit=1$/);
  assert.equal(await geocode('   ', { fetchImpl }), null);
  await assert.rejects(
    () =>
      geocode('Lyon', { fetchImpl: async () => ({ ok: false, status: 503 }) }),
    /503/
  );
});

/* ── dates ──────────────────────────────────────────────────────────────── */

test('dates : arithmétique pure en fuseau local', () => {
  const d = new Date(2026, 7, 30, 23, 45);
  assert.equal(isSameDay(d, new Date(2026, 7, 30, 0, 1)), true);
  assert.equal(isSameDay(d, new Date(2026, 7, 31)), false);
  assert.equal(startOfDay(d).getHours(), 0);
  assert.equal(endOfDay(d).getMilliseconds(), 999);
  assert.equal(addDays(d, 2).getDate(), 1); // bascule de mois
  assert.equal(
    rangesOverlap(
      new Date(2026, 0, 1),
      new Date(2026, 0, 10),
      new Date(2026, 0, 10),
      new Date(2026, 0, 20)
    ),
    true
  );
});

test('toIsoDate reste en local ; fromIsoDate refuse les dates fictives', () => {
  // 23 h 30 locales : toISOString() rendrait la veille en UTC+2.
  assert.equal(toIsoDate(new Date(2026, 11, 31, 23, 30)), '2026-12-31');
  assert.equal(fromIsoDate('2026-02-29'), null); // 2026 n'est pas bissextile
  assert.equal(fromIsoDate('n-importe-quoi'), null);
  assert.equal(fromIsoDate('2026-08-30')?.getHours(), 0);
});

/* ── image (partie pure) ────────────────────────────────────────────────── */

test('validateImageFile : type puis taille, `null` si valide', () => {
  assert.equal(validateImageFile({ type: 'image/gif', size: 10 }), 'type');
  assert.equal(
    validateImageFile({ type: 'image/jpeg', size: IMAGE_MAX_BYTES + 1 }),
    'size'
  );
  assert.equal(validateImageFile({ type: 'image/webp', size: 1024 }), null);
  assert.equal(
    validateImageFile(
      { type: 'image/gif', size: 10 },
      { acceptedTypes: ['image/gif'] }
    ),
    null
  );
});

/* ── format (extensions) ────────────────────────────────────────────────── */

test('formatCount : notation compacte, locale suivie', () => {
  assert.match(formatCount(1234), /1,2\s*k/u);
  assert.match(formatCount(1234, 'en-US'), /1\.2K/u);
  assert.equal(formatCount(-1), '');
  assert.equal(formatCount(NaN), '');
});

test('formatUsage : octets ou compteur, `null` affiche un tiret', () => {
  assert.match(formatUsage(2, 50000), /^2 \/ 50\s*k$/u);
  assert.match(formatUsage(null, 100), /^— \/ 100$/u);
  assert.match(formatUsage(1024, 5 * 1024 ** 3, { bytes: true }), /Go/u);
});

test('formatDuration : secondes seules sous deux minutes', () => {
  assert.equal(formatDuration(45_000), '45 s');
  assert.equal(formatDuration(119_000), '119 s');
  assert.equal(formatDuration(135_000), '2 min 15 s');
  assert.equal(formatDuration(180_000), '3 min');
  assert.equal(formatDuration(-5), '');
});

/* ── security (extensions) ──────────────────────────────────────────────── */

test('sanitizeUserText : contrôles et bidi retirés, longueur plafonnée, pas d’échappement', () => {
  assert.equal(sanitizeUserText('a\u0000b\u202Ec', 100), 'abc');
  assert.equal(
    sanitizeUserText('ligne 1  \r\nligne 2', 100),
    'ligne 1\nligne 2'
  );
  assert.equal(sanitizeUserText('<b>ok</b>', 100), '<b>ok</b>');
  assert.equal(sanitizeUserText('abcdef', 3), 'abc');
  assert.equal(sanitizeUserText(null, 10), '');
});

test('sanitizeSingleLine : tout sur une ligne, espaces normalisés', () => {
  assert.equal(sanitizeSingleLine('  Lyon \n 7e  ', 100), 'Lyon 7e');
});

test('sanitizeInput retire désormais les contrôles avant échappement', () => {
  assert.equal(sanitizeInput('<a\u0000>'), '&lt;a&gt;');
});

test('isSafeHttpUrl : http(s) oui, javascript:/data: non', () => {
  assert.equal(isSafeHttpUrl('https://exemple.fr'), true);
  assert.equal(isSafeHttpUrl('http://exemple.fr'), true);
  assert.equal(isSafeHttpUrl('javascript:alert(1)'), false);
  assert.equal(isSafeHttpUrl('data:text/html,x'), false);
  assert.equal(isSafeHttpUrl('pas une url'), false);
});

/* ── backend (extension) ────────────────────────────────────────────────── */

test('classifyBackendError : permission, réseau, sinon inconnu', () => {
  assert.equal(
    classifyBackendError('PERMISSION_DENIED at /games'),
    'permission'
  );
  assert.equal(
    classifyBackendError('violates row-level security'),
    'permission'
  );
  assert.equal(classifyBackendError('Failed to fetch'), 'network');
  assert.equal(
    classifyBackendError('net::ERR_INTERNET_DISCONNECTED'),
    'network'
  );
  assert.equal(classifyBackendError('quelque chose d’autre'), 'unknown');
  assert.equal(classifyBackendError(null), 'unknown');
});
