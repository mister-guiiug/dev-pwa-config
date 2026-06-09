/**
 * Réessaie une opération asynchrone avec backoff exponentiel.
 * Pur (sans dépendance) — utilisable hors React.
 *
 *   await retryableQuery(() => supabase.from('x').select(), { retries: 3 });
 *
 * @template T
 * @param {(attempt: number) => Promise<T>} fn
 * @param {{ retries?: number, baseDelayMs?: number, maxDelayMs?: number,
 *   shouldRetry?: (error: unknown, attempt: number) => boolean,
 *   onRetry?: (error: unknown, attempt: number, delayMs: number) => void }} [options]
 * @returns {Promise<T>}
 */
export async function retryableQuery(fn, options = {}) {
  const {
    retries = 3,
    baseDelayMs = 300,
    maxDelayMs = 5000,
    shouldRetry = () => true,
    onRetry,
  } = options;
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  for (;;) {
    try {
      return await fn(attempt);
    } catch (error) {
      attempt += 1;
      if (attempt > retries || !shouldRetry(error, attempt)) throw error;
      const delay = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      if (typeof onRetry === 'function') onRetry(error, attempt, delay);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
