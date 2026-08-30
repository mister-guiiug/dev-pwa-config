/** Patterns gradués (`tap`, `confirm`, `success`, `warning`, `error`, `victory`). */
export declare const HAPTIC_PATTERNS: {
  readonly tap: number;
  readonly confirm: number;
  readonly success: number[];
  readonly warning: number[];
  readonly error: number[];
  readonly victory: number[];
};

export type HapticPatternName = keyof typeof HAPTIC_PATTERNS;

/** `true` si l'API Vibration est disponible (jamais le cas sur iOS). */
export declare function canVibrate(): boolean;

/**
 * Vibre selon un pattern ou un nom de `HAPTIC_PATTERNS`. No-op silencieux si
 * l'API manque. Renvoie `true` si la vibration a été demandée.
 */
export declare function vibrate(
  pattern: number | number[] | HapticPatternName
): boolean;
