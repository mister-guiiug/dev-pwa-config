export interface RetryOptions {
  /** Nombre de tentatives supplémentaires après le 1er échec (défaut 3). */
  retries?: number;
  /** Délai de base du backoff exponentiel en ms (défaut 300). */
  baseDelayMs?: number;
  /** Plafond du délai en ms (défaut 5000). */
  maxDelayMs?: number;
  /** Filtre : ne réessayer que si vrai (défaut: toujours). */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

/** Réessaie `fn` avec backoff exponentiel ; relance la dernière erreur si épuisé. */
export declare function retryableQuery<T>(
  fn: (attempt: number) => Promise<T>,
  options?: RetryOptions
): Promise<T>;
