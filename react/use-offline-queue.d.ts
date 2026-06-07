export interface OfflineQueueItem<P> {
  id: string;
  payload: P;
}

export interface UseOfflineQueueOptions<P> {
  /** Clé localStorage de la file (défaut `dwc_mutation_queue`). */
  storageKey?: string;
  /** Traitement d'un élément ; rejoué avec backoff via retryableQuery. */
  process?: (payload: P) => Promise<unknown>;
  /** Tentatives par élément (défaut 3). */
  retries?: number;
}

export interface UseOfflineQueue<P> {
  queue: OfflineQueueItem<P>[];
  pending: number;
  online: boolean;
  enqueue: (payload: P) => void;
  flush: () => Promise<void>;
}

/** File de mutations offline persistante, rejouée au retour en ligne. */
export declare function useOfflineMutationQueue<P = unknown>(
  options?: UseOfflineQueueOptions<P>
): UseOfflineQueue<P>;
