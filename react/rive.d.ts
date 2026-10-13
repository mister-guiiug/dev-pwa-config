import type { FC, ReactNode } from 'react';

export interface RiveAnimationProps {
  /** Chemin du fichier `.riv` (ex. `/animations/empty-state.riv`). */
  src: string;
  /**
   * Nom(s) de state machine(s) à piloter. UNE machine est passée au moteur au
   * singulier (`stateMachine`, le pluriel est déprécié depuis le moteur 2.43).
   */
  stateMachines?: string | string[];
  /** Artboard à afficher (défaut : artboard principal du fichier). */
  artboard?: string;
  /** Animation(s) timeline à jouer (alternative aux state machines). */
  animations?: string | string[];
  /** Libellé accessible. Absent ⇒ animation décorative (`aria-hidden`). */
  ariaLabel?: string;
  /**
   * Rendu statique de repli. Affiché pendant le chargement du runtime, si
   * l'utilisateur réduit les animations, si le runtime manque, ET si le
   * fichier `.riv` est introuvable ou corrompu (le moteur ne le lève pas :
   * il émet `onLoadError`, que ce composant écoute).
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
   * Appelé quand l'animation est chargée et prête à jouer : le moment de
   * retirer ce que l'app montrait à sa place (un délai de garde, une marque).
   */
  onLoad?: () => void;
  /**
   * Appelé une fois quand le runtime, le rendu ou le fichier `.riv` échoue,
   * pour que l'app puisse le remonter (`recordError`) au lieu de le découvrir
   * sur un écran vide. Le repli s'affiche dans tous les cas.
   */
  onError?: (error: unknown) => void;
}

/**
 * Wrapper Rive lazy, a11y, reduced-motion — et à repli garanti. Requiert un
 * runtime Rive `>= 4.36` (`@rive-app/react-canvas` par défaut, ou celui que
 * `loader` fournit) ; sans lui, le `fallback` s'affiche au lieu d'une erreur.
 */
export declare const RiveAnimation: FC<RiveAnimationProps>;
