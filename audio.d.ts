export interface ToneSpec {
  freq: number;
  /** Durée en secondes. */
  duration: number;
  type?: OscillatorType;
  /** Montée de l'enveloppe, en secondes (défaut 0,01). */
  attack?: number;
  /** 0–1 (défaut 0,15). */
  volume?: number;
  /** Décalage du départ, en secondes (séquences). */
  at?: number;
}

/** Joue une note synthétisée. No-op silencieux si Web Audio manque. */
export declare function playTone(spec: ToneSpec): void;

/** Séquences alignées sur les patterns de `haptics` (mêmes noms). */
export declare const TONE_PRESETS: Record<
  'tap' | 'confirm' | 'success' | 'warning' | 'error' | 'victory',
  ToneSpec[]
>;

export type TonePresetName = keyof typeof TONE_PRESETS;

/** Joue un preset nommé ou une séquence de notes. */
export declare function playSound(sound: TonePresetName | ToneSpec[]): void;
