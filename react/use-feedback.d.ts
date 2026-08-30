import type { ToneSpec, TonePresetName } from '../audio.js';
import type { HapticPatternName } from '../haptics.js';

export interface FeedbackSpec {
  /** Pattern de vibration, ou nom de `HAPTIC_PATTERNS`. */
  vibration?: number | number[] | HapticPatternName;
  /** Nom de `TONE_PRESETS` ou séquence de notes. */
  sound?: TonePresetName | ToneSpec[];
}

export interface UseFeedbackOptions {
  /** Interrupteur son (préférence de l'app). Défaut `true`. */
  sound?: boolean;
  /** Interrupteur vibration (préférence de l'app). Défaut `true`. */
  haptic?: boolean;
}

/**
 * Retour sensoriel unifié (son + vibration) par événement nommé.
 * La fonction renvoyée est stable.
 */
export declare function useFeedback<E extends string = string>(
  events: Record<E, FeedbackSpec>,
  options?: UseFeedbackOptions
): (event: E) => void;
