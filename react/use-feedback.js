import { useCallback, useEffect, useRef } from 'react';
import { vibrate } from '../haptics.js';
import { playSound } from '../audio.js';

/**
 * Retour sensoriel unifié (son + vibration) par événement nommé.
 *
 * PROMU, PAS INVENTÉ. `mister-molkky` et `miss-badminton` portaient chacune
 * un `useFeedback` : une table événement → { vibration, son }, deux
 * interrupteurs de préférence, et des appels gardés. La table est ici une
 * PROP — le socle ne connaît ni « overshoot » ni « elimination », chaque app
 * nomme ses événements.
 *
 * @param {Record<string, { vibration?: number | number[] | string,
 *   sound?: string | Array<import('../audio.js').ToneSpec> }>} events
 *   Par événement : un pattern (ou nom de `HAPTIC_PATTERNS`) et/ou un son
 *   (nom de `TONE_PRESETS` ou séquence de notes).
 * @param {{ sound?: boolean, haptic?: boolean }} [options]
 *   Interrupteurs, typiquement branchés sur les préférences de l'app.
 * @returns {(event: string) => void} Stable : peut se passer en prop.
 */
export function useFeedback(events, options = {}) {
  const { sound = true, haptic = true } = options;

  const eventsRef = useRef(events);
  useEffect(() => {
    eventsRef.current = events;
  });

  return useCallback(
    event => {
      const spec = eventsRef.current?.[event];
      if (!spec) return;
      if (sound && spec.sound != null) {
        try {
          playSound(spec.sound);
        } catch {
          /* audio indisponible : silencieux */
        }
      }
      if (haptic && spec.vibration != null) vibrate(spec.vibration);
    },
    [sound, haptic]
  );
}
