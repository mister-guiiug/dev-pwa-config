import { useCallback, useEffect, useState } from 'react';

/**
 * État avec annulation (undo) et persistance optionnelle.
 *
 * PROMU depuis `miss-dice` (`useUndoableGame`), rendu agnostique : le socle
 * ne connaît ni « partie » ni « jeu ». L'état courant est persisté via les
 * ports injectés (sauf état final) pour survivre à un refresh ; chaque
 * transition est empilée pour permettre l'undo. L'historique n'est PAS
 * persisté : il repart propre au rechargement.
 *
 * @template T
 * @param {{ load?: () => T | null, save?: (state: T) => void,
 *   clear?: () => void, isFinal?: (state: T) => boolean,
 *   maxHistory?: number }} [options]
 *   `isFinal` : un état final n'est plus sauvegardé (sa sauvegarde est
 *   effacée) — on ne « reprend » pas une partie terminée.
 * @returns {{ state: T | null, canUndo: boolean, start: (state: T) => void,
 *   apply: (next: T) => void, undo: () => void, reset: () => void }}
 */
export function useUndoableState(options = {}) {
  const { load, save, clear, isFinal, maxHistory = 50 } = options;

  const [wrap, setWrap] = useState(() => {
    const saved = load?.();
    return saved != null ? { present: saved, past: [] } : null;
  });

  useEffect(() => {
    if (!wrap) return;
    if (isFinal?.(wrap.present)) clear?.();
    else save?.(wrap.present);
  }, [wrap, save, clear, isFinal]);

  const start = useCallback(state => setWrap({ present: state, past: [] }), []);

  const apply = useCallback(
    next =>
      setWrap(w =>
        w
          ? { present: next, past: [...w.past, w.present].slice(-maxHistory) }
          : { present: next, past: [] }
      ),
    [maxHistory]
  );

  const undo = useCallback(
    () =>
      setWrap(w =>
        w && w.past.length > 0
          ? { present: w.past[w.past.length - 1], past: w.past.slice(0, -1) }
          : w
      ),
    []
  );

  const reset = useCallback(() => {
    clear?.();
    setWrap(null);
  }, [clear]);

  return {
    state: wrap?.present ?? null,
    canUndo: (wrap?.past.length ?? 0) > 0,
    start,
    apply,
    undo,
    reset,
  };
}
