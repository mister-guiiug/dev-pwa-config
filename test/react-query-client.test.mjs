/**
 * `react/query-client` — fabrique QueryClient aux defaults PWA.
 *
 * Promu de miss-supaboss, miss-supatool, miss-devises et mister-miss-koh.
 * Chaque test tient une des décisions : focus coupé par défaut, surcharge
 * possible, singleton, reset de test.
 */
import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  PWA_QUERY_DEFAULTS,
  createQueryClient,
  getQueryClient,
  resetQueryClient,
} from '../react/query-client.js';

afterEach(() => {
  resetQueryClient();
});

test('les defaults PWA coupent le refetch au focus', () => {
  assert.equal(PWA_QUERY_DEFAULTS.refetchOnWindowFocus, false);
  assert.equal(PWA_QUERY_DEFAULTS.refetchOnReconnect, true);
  assert.equal(PWA_QUERY_DEFAULTS.retry, 1);
  assert.equal(PWA_QUERY_DEFAULTS.staleTime, 30_000);

  const client = createQueryClient();
  const queries = client.getDefaultOptions().queries;
  assert.equal(queries?.refetchOnWindowFocus, false);
  assert.equal(queries?.refetchOnReconnect, true);
  assert.equal(queries?.retry, 1);
  assert.equal(queries?.staleTime, 30_000);
});

test('queries surcharge les defaults (cas miss-supaboss / miss-devises)', () => {
  const client = createQueryClient({
    queries: {
      refetchOnWindowFocus: true,
      staleTime: 3_600_000,
      gcTime: 3_600_000,
    },
  });
  const queries = client.getDefaultOptions().queries;
  assert.equal(queries?.refetchOnWindowFocus, true);
  assert.equal(queries?.staleTime, 3_600_000);
  assert.equal(queries?.gcTime, 3_600_000);
  assert.equal(queries?.retry, 1);
});

test('getQueryClient est un singleton, reset le casse', () => {
  const a = getQueryClient();
  const b = getQueryClient({ queries: { staleTime: 1 } });
  assert.equal(a, b);
  // Les options du second appel sont ignorées : le singleton existe.
  assert.equal(a.getDefaultOptions().queries?.staleTime, 30_000);

  resetQueryClient();
  const c = getQueryClient({ queries: { staleTime: 1 } });
  assert.notEqual(c, a);
  assert.equal(c.getDefaultOptions().queries?.staleTime, 1);
});
