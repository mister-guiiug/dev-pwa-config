/**
 * Fabrique QueryClient — defaults PWA de la famille.
 *
 * PROMU DE QUATRE APPS. miss-supaboss (`src/shared/queries/client.ts`),
 * miss-supatool, miss-devises et mister-miss-koh écrivent la même fabrique
 * singleton : `staleTime`, `retry`, focus, reconnect. Trois d'entre elles
 * posent `refetchOnWindowFocus: false` — le référentiel de koh ne doit PAS
 * se relire entier à chaque retour d'onglet (le watch ne compare qu'une
 * version) ; les taux de devises tiennent une heure ; les jetons de
 * supatool ne partent pas au simple focus. miss-supaboss reste l'exception
 * (`true`) : elle le demande explicitement via `queries`.
 *
 * CE QUE CE MODULE N'EST PAS. Pas un provider imposé, pas un hook métier,
 * pas un substitut à `sync-queue` (écritures hors-ligne) ni à `realtime/`
 * (descente live). Query = cache de LECTURE serveur. L'app enveloppe
 * elle-même avec `QueryClientProvider` et garde ses `queryKey`.
 *
 * PAIR OPTIONNELLE : `@tanstack/react-query` — déclarée par l'app (voir
 * `optionalPeers`). Sans le paquet, l'import échoue en le nommant.
 */
import { QueryClient } from '@tanstack/react-query';

/** Défauts famille — une app les surcharge via `queries`. */
export const PWA_QUERY_DEFAULTS = Object.freeze({
  staleTime: 30_000,
  retry: 1,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
});

/**
 * Crée un `QueryClient` avec les defaults PWA.
 *
 * @param {{ queries?: Record<string, unknown>, mutations?: Record<string, unknown>, defaultOptions?: Record<string, unknown> }} [options]
 *        `queries` se fond dans les defaults ; le reste de `defaultOptions`
 *        (mutations, etc.) est transmis tel quel à TanStack.
 */
export function createQueryClient(options = {}) {
  const { queries, mutations, defaultOptions, ...rest } = options ?? {};
  const fromDefaultOptions = defaultOptions ?? {};
  return new QueryClient({
    ...rest,
    defaultOptions: {
      ...fromDefaultOptions,
      queries: {
        ...PWA_QUERY_DEFAULTS,
        ...fromDefaultOptions.queries,
        ...queries,
      },
      ...(mutations || fromDefaultOptions.mutations
        ? { mutations: { ...fromDefaultOptions.mutations, ...mutations } }
        : {}),
    },
  });
}

/** Singleton de processus — un client par app, réinitialisable en test. */
let client;

/**
 * Le client partagé. Les `options` ne valent qu'au PREMIER appel ; ensuite
 * le singleton est rendu tel quel. En test, `resetQueryClient()` puis un
 * nouvel appel avec d'autres options.
 *
 * @param {Parameters<typeof createQueryClient>[0]} [options]
 */
export function getQueryClient(options) {
  client ??= createQueryClient(options);
  return client;
}

/** Remet le singleton à zéro — réservé aux tests. */
export function resetQueryClient() {
  client = undefined;
}
