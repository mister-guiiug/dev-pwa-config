export interface OfflineQueueItem<P> {
  id: string;
  payload: P;
  /** Nombre d'échecs subis par cet élément. */
  attempts?: number;
  /** `true` une fois l'élément mis en quarantaine (voir `maxAttempts`). */
  dead?: boolean;
}

export interface UseOfflineQueueOptions<P> {
  /** Clé localStorage de la file (défaut `dwc_mutation_queue`). */
  storageKey?: string;
  /** Traitement d'un élément ; rejoué avec backoff via retryableQuery. */
  process?: (payload: P) => Promise<unknown>;
  /** Tentatives immédiates par envoi, via `retryableQuery` (défaut 3). */
  retries?: number;
  /**
   * Échecs cumulés avant mise en quarantaine (défaut 5). Passé ce seuil,
   * l'élément rejoint `failed` et cesse de bloquer les suivants.
   */
  maxAttempts?: number;
  /**
   * Taille maximale de la file en attente (défaut 200). Au-delà, `enqueue`
   * refuse et renvoie `null` plutôt que de jeter en silence.
   */
  maxQueueSize?: number;
  /** Appelé quand un élément passe en quarantaine. */
  onDead?: (entry: { id: string; payload: P; attempts: number }) => void;
}

export interface UseOfflineQueue<P> {
  /** Éléments encore à envoyer (quarantaine exclue). */
  queue: OfflineQueueItem<P>[];
  pending: number;
  /** Éléments mis de côté après `maxAttempts` échecs. */
  failed: OfflineQueueItem<P>[];
  online: boolean;
  /** Renvoie l'identifiant de l'élément, ou `null` si le plafond est atteint. */
  enqueue: (payload: P) => string | null;
  flush: () => Promise<void>;
  /** Retire un élément (traité hors file, ou abandonné). */
  remove: (id: string) => void;
  /** Vide la file, quarantaine comprise. */
  clear: () => void;
}

/** File de mutations offline persistante, rejouée au retour en ligne. */
export declare function useOfflineMutationQueue<P = unknown>(
  options?: UseOfflineQueueOptions<P>
): UseOfflineQueue<P>;
