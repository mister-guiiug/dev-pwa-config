import type { FC, ReactNode } from 'react';

export interface RiveAnimationProps {
  /** Chemin du fichier `.riv` (ex. `/animations/empty-state.riv`). */
  src: string;
  /** Nom(s) de state machine(s) à piloter. */
  stateMachines?: string | string[];
  /** Artboard à afficher (défaut : artboard principal du fichier). */
  artboard?: string;
  /** Animation(s) timeline à jouer (alternative aux state machines). */
  animations?: string | string[];
  /** Libellé accessible. Absent ⇒ animation décorative (`aria-hidden`). */
  ariaLabel?: string;
  /** Rendu statique de repli (mouvement réduit / pendant le lazy-load). */
  fallback?: ReactNode;
  className?: string;
  /** Respecter `prefers-reduced-motion` (défaut `true`). */
  respectReducedMotion?: boolean;
  /** Démarrage auto (défaut `true`, désactivé si mouvement réduit). */
  autoplay?: boolean;
  /**
   * Runtime Rive à charger. Défaut : `@rive-app/react-canvas`. Passer
   * `() => import('@rive-app/react-webgl2')` pour WebGL2 — l'import doit être
   * statiquement analysable côté app.
   */
  loader?: () => Promise<Record<string, unknown>>;
}

/** Wrapper Rive lazy, a11y et reduced-motion. Requiert `@rive-app/react-canvas`. */
export declare const RiveAnimation: FC<RiveAnimationProps>;
