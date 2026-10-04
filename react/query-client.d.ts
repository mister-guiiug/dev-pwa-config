import type {
  DefaultOptions,
  QueryClient,
  QueryClientConfig,
} from '@tanstack/react-query';

/** Défauts famille (`staleTime` 30 s, `retry` 1, pas de refetch au focus). */
export declare const PWA_QUERY_DEFAULTS: Readonly<{
  staleTime: number;
  retry: number;
  refetchOnWindowFocus: boolean;
  refetchOnReconnect: boolean;
}>;

export type CreateQueryClientOptions = Omit<
  QueryClientConfig,
  'defaultOptions'
> & {
  /** Fusionné dans `defaultOptions.queries` après les defaults PWA. */
  queries?: DefaultOptions['queries'];
  mutations?: DefaultOptions['mutations'];
  defaultOptions?: QueryClientConfig['defaultOptions'];
};

/** Crée un `QueryClient` avec les defaults PWA de la famille. */
export declare function createQueryClient(
  options?: CreateQueryClientOptions
): QueryClient;

/**
 * Singleton de processus. Les options ne valent qu'au premier appel ;
 * `resetQueryClient()` le remet à zéro (tests).
 */
export declare function getQueryClient(
  options?: CreateQueryClientOptions
): QueryClient;

/** Remet le singleton à zéro — réservé aux tests. */
export declare function resetQueryClient(): void;
