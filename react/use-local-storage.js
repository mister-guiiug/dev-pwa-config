import { useCallback, useEffect, useRef, useState } from 'react';

// Évènement interne : `localStorage` ne notifie PAS l'onglet émetteur (`storage`
// ne se déclenche que dans les AUTRES onglets). On rediffuse donc nos écritures
// dans le même onglet pour que plusieurs instances de la même clé restent en
// phase.
const LOCAL_EVENT = 'dwc:local-storage';

/**
 * État persistant dans `localStorage`, typé, avec sync inter-onglets ET
 * intra-onglet (plusieurs `useLocalStorage(memeCle)` restent synchronisés).
 * Tolère le mode privé / quota dépassé (garde la valeur en mémoire).
 *
 * @template T
 * @param {string} key
 * @param {T} initialValue
 * @returns {[T, (value: T | ((prev: T) => T)) => void, () => void]}
 */
export function useLocalStorage(key, initialValue) {
  // Figé à la 1re valeur : un défaut littéral (`[]`, `{}`) passé inline ne doit
  // pas réabonner les effets / déstabiliser `removeValue` à chaque rendu.
  const initialRef = useRef(initialValue);

  const readValue = () => {
    if (typeof window === 'undefined') return initialRef.current;
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : initialRef.current;
    } catch {
      return initialRef.current;
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
            window.dispatchEvent(
              new CustomEvent(LOCAL_EVENT, { detail: { key } })
            );
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
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
        window.dispatchEvent(new CustomEvent(LOCAL_EVENT, { detail: { key } }));
      }
    } catch {
      /* ignore */
    }
    setStoredValue(initialRef.current);
  }, [key]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const resync = () => {
      try {
        const item = window.localStorage.getItem(key);
        setStoredValue(item !== null ? JSON.parse(item) : initialRef.current);
      } catch {
        /* ignore */
      }
    };
    // Autre onglet (`storage`) ou même onglet (`CustomEvent`) sur cette clé.
    const onStorage = e => {
      if (e.key === key || e.key === null) resync();
    };
    const onLocal = e => {
      if (e.detail?.key === key) resync();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(LOCAL_EVENT, onLocal);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(LOCAL_EVENT, onLocal);
    };
  }, [key]);

  return [storedValue, setValue, removeValue];
}
