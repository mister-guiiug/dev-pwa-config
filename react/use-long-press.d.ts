import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';

export interface LongPressHandlers {
  onPointerDown: (event: ReactPointerEvent) => void;
  onPointerMove: (event: ReactPointerEvent) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
  onKeyDown: (event: ReactKeyboardEvent) => void;
  onKeyUp: (event: ReactKeyboardEvent) => void;
  onClick: (event: ReactMouseEvent) => void;
  onContextMenu: (event: ReactMouseEvent) => void;
}

export interface UseLongPressOptions {
  /** Release avant le seuil → tap court. */
  onTap?: () => void;
  /** Seuil de l'appui long (défaut 450 ms). */
  delayMs?: number;
  /** Déplacement qui annule l'appui — c'est un scroll (défaut 10 px). */
  moveTolerancePx?: number;
}

export interface UseLongPressResult {
  isPressing: boolean;
  /** À étaler sur l'élément cible : `<button {...handlers}>`. */
  handlers: LongPressHandlers;
}

/**
 * Appui long vs tap court — souris, tactile et clavier (Enter/Espace).
 * Annule au déplacement, neutralise le clic qui suit un appui long.
 */
export declare function useLongPress(
  onLongPress: () => void,
  options?: UseLongPressOptions
): UseLongPressResult;
