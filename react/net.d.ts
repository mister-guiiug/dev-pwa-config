export interface RetryOptions {
  /** Nombre de nouvelles tentatives après le premier échec (défaut 3). */
  retries?: number;
  /** Délai de base du backoff exponentiel, en ms (défaut 300). */
  baseDelayMs?: number;
  /** Plafond du délai, en ms (défaut 5000). */
  maxDelayMs?: number;
  /** Amplitude relative de la gigue, 0 à 1 (défaut 0.2). */
  jitter?: number;
  /** Interrompt l'attente et la boucle. */
  signal?: AbortSignal;
  /** Décide si une erreur mérite une nouvelle tentative (défaut : `defaultShouldRetry`). */
  shouldRetry?: (error: unknown, attempt: number) => boolean;
  onRetry?: (error: unknown, attempt: number, delayMs: number) => void;
}

/**
 * Politique par défaut : réessaie tout sauf les 4xx définitifs (408 et 429
 * exceptés). Une erreur sans statut HTTP est réessayée.
 */
export declare function defaultShouldRetry(error: unknown): boolean;

/** Réessaie une opération asynchrone avec backoff exponentiel et gigue. */
export declare function retryableQuery<T>(
  fn: (attempt: number) => Promise<T>,
  options?: RetryOptions
): Promise<T>;
