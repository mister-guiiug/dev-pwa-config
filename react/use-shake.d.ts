/**
 * Demande l'autorisation DeviceMotion (iOS 13+ l'exige depuis un geste
 * utilisateur). `true` si l'accès est accordé ou non requis.
 */
export declare function requestMotionPermission(): Promise<boolean>;

export interface UseShakeOptions {
  /** Défaut `true`. */
  enabled?: boolean;
  /** Variation d'accélération déclenchante (m/s², défaut 14). */
  threshold?: number;
  /** Délai minimal entre deux secousses (défaut 900 ms). */
  cooldownMs?: number;
}

/** Déclenche `onShake` quand l'appareil est secoué. Silencieux sans l'API. */
export declare function useShake(
  onShake: () => void,
  options?: UseShakeOptions
): void;
