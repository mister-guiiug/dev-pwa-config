/**
 * Statut HTTP porté par une erreur, quelle que soit la bibliothèque : `fetch`
 * enveloppé, Supabase (`status`), Axios (`response.status`), PostgREST (`code`).
 * Renvoie `null` si l'erreur n'en expose aucun.
 */
function statusOf(error) {
  if (error === null || typeof error !== 'object') return null;
  const raw =
    error.status ?? error.statusCode ?? error.response?.status ?? null;
  const status = typeof raw === 'string' ? Number(raw) : raw;
  return Number.isInteger(status) ? status : null;
}

/**
 * Politique par défaut : ne pas réessayer ce qui ne peut pas réussir en
 * réessayant. Une requête malformée ou refusée (4xx) échouera à l'identique
 * trois fois de plus ; seuls 408 (délai dépassé) et 429 (trop de requêtes) sont
 * des 4xx qu'une nouvelle tentative peut résoudre. Une erreur sans statut —
 * coupure réseau, DNS — reste réessayée.
 */
export function defaultShouldRetry(error) {
  const status = statusOf(error);
  if (status === null) return true;
  if (status === 408 || status === 429) return true;
  return status < 400 || status >= 500;
}

/**
 * Réessaie une opération asynchrone avec backoff exponentiel et gigue.
 * Pur (sans dépendance) — utilisable hors React.
 *
 *   await retryableQuery(() => supabase.from('x').select(), { retries: 3 });
 *
 * La gigue (±20 % par défaut) évite que tous les clients revenus en ligne au
 * même instant repartent en rafale synchronisée sur le même backend.
 *
 * @template T
 * @param {(attempt: number) => Promise<T>} fn
 * @param {{ retries?: number, baseDelayMs?: number, maxDelayMs?: number,
 *   jitter?: number, signal?: AbortSignal,
 *   shouldRetry?: (error: unknown, attempt: number) => boolean,
 *   onRetry?: (error: unknown, attempt: number, delayMs: number) => void }} [options]
 * @returns {Promise<T>}
 */
export async function retryableQuery(fn, options = {}) {
  const {
    retries = 3,
    baseDelayMs = 300,
    maxDelayMs = 5000,
    jitter = 0.2,
    signal,
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = options;
  let attempt = 0;
  for (;;) {
    if (signal?.aborted) throw signal.reason ?? new Error('aborted');
    try {
      return await fn(attempt);
    } catch (error) {
      attempt += 1;
      if (attempt > retries || !shouldRetry(error, attempt)) throw error;
      if (signal?.aborted) throw signal.reason ?? new Error('aborted');
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const spread = backoff * jitter;
      const delay = Math.max(0, backoff - spread + Math.random() * spread * 2);
      if (typeof onRetry === 'function') onRetry(error, attempt, delay);
      await wait(delay, signal);
    }
  }
}

/** Attente interruptible : un `signal` déclenché n'attend pas la fin du délai. */
function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener?.('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason ?? new Error('aborted'));
    };
    signal?.addEventListener?.('abort', onAbort, { once: true });
  });
}
