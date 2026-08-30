import { useEffect, useRef } from 'react';

/**
 * Raccourcis clavier globaux, inertes quand l'utilisateur écrit.
 *
 * PROMU depuis `mister-molkky` (`useKeyboardShortcuts`) et `miss-dice`
 * (`useKeyboardRoll`, la même mécanique spécialisée). Les frappes nées dans
 * un champ éditable (`input`, `textarea`, `select`, `contenteditable`) ou
 * pendant une composition IME sont ignorées ; les raccourcis restent des
 * raccourcis, pas des pièges de saisie.
 *
 * @param {Record<string, (event: KeyboardEvent) => void>} shortcuts
 *   Clés en MINUSCULES (`e.key.toLowerCase()`) : `'r'`, `'escape'`, `' '`…
 * @param {boolean} [enabled]
 */
export function useKeyboardShortcuts(shortcuts, enabled = true) {
  const mapRef = useRef(shortcuts);
  useEffect(() => {
    mapRef.current = shortcuts;
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    const onKey = event => {
      if (event.isComposing) return;
      const target = event.target;
      const tag = target?.tagName ?? '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (target?.isContentEditable) return;
      const handler = mapRef.current?.[event.key.toLowerCase()];
      if (handler) handler(event);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled]);
}
