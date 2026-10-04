import type { ReactNode } from 'react';
import type { CreateQueryClientOptions } from '../react/query-client';

export {
  getQueryClient,
  resetQueryClient,
  createQueryClient,
  PWA_QUERY_DEFAULTS,
  type CreateQueryClientOptions,
} from '../react/query-client';

/** Vide le cache et remet le singleton à zéro — `afterEach` des tests. */
export declare function clearQueryClient(): void;

/**
 * Enveloppe `node` dans un `QueryClientProvider` sur le singleton famille.
 * Les `options` ne valent qu'au premier appel après un `clearQueryClient`.
 */
export declare function wrapWithQueryClient(
  node: ReactNode,
  options?: CreateQueryClientOptions
): ReactNode;
