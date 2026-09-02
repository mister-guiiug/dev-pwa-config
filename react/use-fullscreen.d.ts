export interface Fullscreen {
  /** L'API Fullscreen existe : sinon, ne rendez pas de bouton. */
  supported: boolean;
  /** Suit `fullscreenchange` — la seule source de vérité. */
  active: boolean;
  /** Rend `false` sur un refus du navigateur, ne lève jamais. */
  enter(): Promise<boolean>;
  exit(): Promise<boolean>;
  toggle(): Promise<boolean>;
}

/**
 * Le plein écran natif : l'état et les gestes — promu des boutons de
 * badminton et molkky. Le bouton, lui, reste à l'app.
 */
export declare function useFullscreen(): Fullscreen;
