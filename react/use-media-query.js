import { useEffect, useState } from 'react';

/**
 * Suit une media query CSS et renvoie `true`/`false` en réagissant aux
 * changements. SSR-safe (renvoie `false` hors navigateur). Brique partagée des
 * hooks `useReducedMotion` / `usePrefersDark` et réutilisable par les apps.
 *
 * @param {string} query Ex. `(min-width: 768px)`.
 * @returns {boolean}
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia?.(query).matches === true
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange(); // resynchronise si la query a changé entre deux rendus
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, [query]);

  return matches;
}

/** `true` si l'utilisateur a activé « réduire les animations ». */
export function useReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}

/** `true` si le système préfère un thème sombre. */
export function usePrefersDark() {
  return useMediaQuery('(prefers-color-scheme: dark)');
}

/** `true` si l'utilisateur a demandé un contraste renforcé. */
export function usePrefersHighContrast() {
  return useMediaQuery('(prefers-contrast: more)');
}
