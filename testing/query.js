/**
 * Enveloppe de test pour TanStack Query — un Provider, un client propre.
 *
 * PROMU DE QUATRE APPS. miss-supaboss (`SchedulesSection.test.tsx`),
 * miss-devises (`HistoryScreen.test.tsx`), miss-supatool et mister-miss-koh
 * wrappent déjà `QueryClientProvider` + `getQueryClient().clear()` : la
 * même boîte, quatre fois. Sans ce module, chaque nouvelle app Query
 * recopiera le geste.
 *
 * Pose, côté app (Vitest / Testing Library) :
 *
 *   import { wrapWithQueryClient, clearQueryClient } from
 *     '@mister-guiiug/dev-pwa-config/testing/query';
 *
 *   afterEach(() => clearQueryClient());
 *
 *   render(wrapWithQueryClient(<MonEcran />));
 *
 * PAIR OPTIONNELLE : `@tanstack/react-query` — comme `react/query-client`.
 */
import { createElement } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import {
  getQueryClient,
  resetQueryClient,
  createQueryClient,
} from '../react/query-client.js';

/**
 * Remet le singleton à zéro puis vide le cache — à appeler en `afterEach`
 * (ou en `beforeEach` si le test précédent a planté avant le nettoyage).
 */
export function clearQueryClient() {
  const client = getQueryClient();
  client.clear();
  resetQueryClient();
}

/**
 * Enveloppe `node` dans un `QueryClientProvider` sur le singleton (recréé
 * si `clearQueryClient` a été appelé). Les `options` ne valent qu'au premier
 * `getQueryClient` après un reset — comme en production.
 *
 * @param {import('react').ReactNode} node
 * @param {Parameters<typeof createQueryClient>[0]} [options]
 */
export function wrapWithQueryClient(node, options) {
  const client = getQueryClient(options);
  return createElement(QueryClientProvider, { client }, node);
}

export { getQueryClient, resetQueryClient, createQueryClient };
