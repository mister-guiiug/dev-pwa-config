import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Chargement asynchrone minimal : états chargement/erreur explicites,
 * protection contre les mises à jour après démontage, rechargement manuel.
 *
 * PROMU depuis `bac-sable` (mister-family-map). `key` identifie la requête :
 * quand elle change (l'id de la fiche, par exemple), la donnée est rechargée.
 * La fonction est lue via une ref — pas besoin de la mémoïser côté appelant.
 *
 * @template T
 * @param {() => Promise<T>} fn
 * @param {string} key
 * @returns {{ data: T | null, loading: boolean, error: Error | null,
 *   reload: () => void }}
 */
export function useAsync(fn, key) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tick, setTick] = useState(0);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const generation = useRef(0);

  useEffect(() => {
    const current = ++generation.current;
    setLoading(true);
    setError(null);
    fnRef.current().then(
      result => {
        if (generation.current !== current) return;
        setData(result);
        setLoading(false);
      },
      cause => {
        if (generation.current !== current) return;
        setError(
          cause instanceof Error ? cause : new Error(String(cause ?? 'Erreur'))
        );
        setLoading(false);
      }
    );
    return () => {
      generation.current++;
    };
  }, [key, tick]);

  const reload = useCallback(() => setTick(t => t + 1), []);

  return { data, loading, error, reload };
}
