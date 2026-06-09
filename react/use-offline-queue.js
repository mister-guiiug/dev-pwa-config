import { useCallback, useEffect, useRef, useState } from 'react';
import { useOnline } from './use-online.js';
import { retryableQuery } from './net.js';

let fallbackCounter = 0;
function newId() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  fallbackCounter += 1;
  return `q_${fallbackCounter}`;
}

/**
 * File de mutations persistante (localStorage) rejouée au retour en ligne, avec
 * backoff exponentiel (retryableQuery). Évite de perdre les écritures hors-ligne.
 *
 *   const { enqueue, pending } = useOfflineMutationQueue({
 *     storageKey: 'carbook_queue',
 *     process: payload => supabase.from('candidates').upsert(payload),
 *   });
 *
 * @template P
 * @param {{ storageKey?: string, process?: (payload: P) => Promise<unknown>, retries?: number }} [options]
 */
export function useOfflineMutationQueue(options = {}) {
  const { storageKey = 'dwc_mutation_queue', process, retries = 3 } = options;
  const online = useOnline();
  const processing = useRef(false);

  const read = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, [storageKey]);

  const [queue, setQueue] = useState(read);

  const persist = useCallback(
    next => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [storageKey]
  );

  const enqueue = useCallback(
    payload => {
      setQueue(q => {
        const next = [...q, { id: newId(), payload }];
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const flush = useCallback(async () => {
    if (processing.current || typeof process !== 'function') return;
    processing.current = true;
    try {
      let current = read();
      while (current.length > 0) {
        const item = current[0];
        try {
          await retryableQuery(() => process(item.payload), { retries });
        } catch {
          break; // échec persistant : on retentera au prochain passage online
        }
        current = current.slice(1);
        persist(current);
        setQueue(current);
      }
    } finally {
      processing.current = false;
    }
  }, [process, retries, read, persist]);

  useEffect(() => {
    if (online) void flush();
  }, [online, flush]);

  return { queue, pending: queue.length, online, enqueue, flush };
}
