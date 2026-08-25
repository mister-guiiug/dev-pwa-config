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
  /**
   * Rendu statique de repli. Affiché pendant le chargement, si l'utilisateur
   * réduit les animations, ET si le runtime ou le fichier `.riv` manque —
   * le cas nominal aujourd'hui : les seize dépôts n'en contiennent aucun.
   */
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
  /**
   * Appelé une fois quand le runtime ou l'animation échoue, pour que l'app
   * puisse le remonter (`recordError`) au lieu de le découvrir sur un écran
   * vide. Le repli s'affiche dans tous les cas.
   */
  onError?: (error: unknown) => void;
}

/**
 * Wrapper Rive lazy, a11y, reduced-motion — et à repli garanti. Requiert un
 * runtime Rive (`@rive-app/react-canvas` par défaut) ; sans lui, le `fallback`
 * s'affiche au lieu d'une erreur.
 */
export declare const RiveAnimation: FC<RiveAnimationProps>;
