import { useCallback, useEffect, useState } from 'react';

/**
 * État persistant dans `localStorage`, typé, avec sync inter-onglets.
 * Tolère le mode privé / quota dépassé (garde la valeur en mémoire).
 *
 * @template T
 * @param {string} key
 * @param {T} initialValue
 * @returns {[T, (value: T | ((prev: T) => T)) => void, () => void]}
 */
export function useLocalStorage(key, initialValue) {
  const readValue = () => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  };

  const [storedValue, setStoredValue] = useState(readValue);

  const setValue = useCallback(
    value => {
      setStoredValue(prev => {
        const next = value instanceof Function ? value(prev) : value;
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(next));
          }
        } catch {
          /* quota / mode privé : la valeur reste en mémoire */
        }
        return next;
      });
    },
    [key]
  );

  const removeValue = useCallback(() => {
    try {
      if (typeof window !== 'undefined') window.localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    setStoredValue(initialValue);
  }, [key, initialValue]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onStorage = e => {
      if (e.key !== key) return;
      try {
        setStoredValue(
          e.newValue !== null ? JSON.parse(e.newValue) : initialValue
        );
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}
