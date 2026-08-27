import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  prefetch,
  prefetchWhenIdle,
  prefetchWhenVisible,
} from '../prefetch.js';

/**
 * Précharger une route découpée depuis un composant.
 *
 * Enveloppe de `../prefetch.js` — toute la décision vit là-bas, ce fichier ne
 * fait que la brancher sur le cycle de vie React.
 */

/**
 * Les propriétés à étaler sur un lien pour qu'il précharge à l'approche.
 *
 *   const carte = usePrefetch(() => import('../pages/MapPage'));
 *   <Link to="/carte" {...carte.linkProps}>Carte</Link>
 *
 * @param {() => Promise<unknown>} loader
 */
export function usePrefetch(loader) {
  // Figé au premier rendu : un `() => import(…)` écrit en ligne change
  // d'identité à chaque rendu, et la déduplication — qui repose sur
  // l'identité du chargeur — ne dédupliquerait plus rien.
  const ref = useRef(loader);

  const start = useCallback(() => prefetch(ref.current), []);

  const linkProps = useMemo(
    () => ({
      onPointerEnter: start,
      onFocus: start,
      onTouchStart: start,
    }),
    [start]
  );

  return { prefetch: start, linkProps };
}

/**
 * Précharge quand l'élément référencé approche de l'écran.
 *
 * @param {{ current: Element|null }} elementRef
 * @param {() => Promise<unknown>} loader
 * @param {{ rootMargin?: string, enabled?: boolean }} [options]
 */
export function useVisiblePrefetch(elementRef, loader, options = {}) {
  const ref = useRef(loader);
  const { rootMargin, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return undefined;
    return prefetchWhenVisible(elementRef.current, ref.current, { rootMargin });
  }, [elementRef, rootMargin, enabled]);
}

/**
 * Précharge dès que le navigateur est au repos — pour une route qu'on sait
 * probable sans savoir quand.
 *
 * @param {() => Promise<unknown>} loader
 * @param {{ timeout?: number, enabled?: boolean }} [options]
 */
export function useIdlePrefetch(loader, options = {}) {
  const ref = useRef(loader);
  const { timeout, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return undefined;
    return prefetchWhenIdle(ref.current, { timeout });
  }, [timeout, enabled]);
}
