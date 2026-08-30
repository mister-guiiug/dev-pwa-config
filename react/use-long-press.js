import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Appui long vs tap court — souris, tactile et clavier.
 *
 * PROMU, PAS INVENTÉ. **Trois apps** portaient chacune leur version, et les
 * trois se complètent au lieu de se répéter :
 * - `miss-badminton` : distinction tap/long (le release après un long ne
 *   re-déclenche pas), support clavier Enter/Espace, état `isPressing` ;
 * - `miss-lookhouse` : annulation au déplacement (> tolérance → c'est un
 *   scroll, pas un appui) et neutralisation du clic qui suit un appui long
 *   (sinon le lien navigue quand même) ;
 * - `mister-molkky` : la forme d'API (callbacks + handlers à étaler).
 *
 * Pas de `setPointerCapture` : si le doigt glisse hors de la cible,
 * `pointerleave` doit pouvoir annuler proprement.
 *
 * @param {() => void} onLongPress Déclenché quand le seuil est atteint.
 * @param {{ onTap?: () => void, delayMs?: number, moveTolerancePx?: number }} [options]
 *   `onTap` : release avant le seuil. `delayMs` : seuil (défaut 450 ms).
 *   `moveTolerancePx` : déplacement qui annule (défaut 10 px).
 * @returns {{ isPressing: boolean, handlers: object }} Étaler `handlers` sur
 *   l'élément cible : `<button {...handlers}>`.
 */
export function useLongPress(onLongPress, options = {}) {
  const { onTap, delayMs = 450, moveTolerancePx = 10 } = options;

  const timerRef = useRef(null);
  const firedRef = useRef(false);
  const startRef = useRef(null);
  const [isPressing, setIsPressing] = useState(false);

  // Callbacks en refs : les handlers restent stables, pas de ré-abonnement.
  const longRef = useRef(onLongPress);
  const tapRef = useRef(onTap);
  useEffect(() => {
    longRef.current = onLongPress;
    tapRef.current = onTap;
  });

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (timerRef.current != null) return;
    firedRef.current = false;
    setIsPressing(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setIsPressing(false);
      firedRef.current = true;
      longRef.current?.();
    }, delayMs);
  }, [delayMs]);

  const release = useCallback(() => {
    const wasPending = timerRef.current != null;
    clearTimer();
    setIsPressing(false);
    startRef.current = null;
    if (wasPending && !firedRef.current) tapRef.current?.();
  }, [clearTimer]);

  const cancel = useCallback(() => {
    clearTimer();
    setIsPressing(false);
    startRef.current = null;
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  const handlers = {
    onPointerDown: event => {
      if (event.button !== undefined && event.button !== 0) return;
      startRef.current = { x: event.clientX, y: event.clientY };
      start();
    },
    onPointerMove: event => {
      if (!startRef.current) return;
      if (
        Math.abs(event.clientX - startRef.current.x) > moveTolerancePx ||
        Math.abs(event.clientY - startRef.current.y) > moveTolerancePx
      ) {
        cancel();
      }
    },
    onPointerUp: () => release(),
    onPointerLeave: () => cancel(),
    onPointerCancel: () => cancel(),
    onKeyDown: event => {
      if (event.repeat) return;
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        start();
      }
    },
    onKeyUp: event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        release();
      }
    },
    onClick: event => {
      // Un appui long a déjà agi : neutraliser le clic (et la navigation).
      if (firedRef.current) {
        event.preventDefault();
        event.stopPropagation();
        firedRef.current = false;
      }
    },
    // Empêche le menu contextuel mobile (long-press iOS/Android).
    onContextMenu: event => event.preventDefault(),
  };

  return { isPressing, handlers };
}
