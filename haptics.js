/**
 * Retour haptique — encapsulation sûre de l'API Vibration.
 *
 * PROMU, PAS INVENTÉ. Quatre apps gardaient chacune leur enveloppe :
 * `miss-dice` (patterns nommés), `miss-badminton` et `mister-molkky`
 * (vibrations graduées dans `useFeedback`), `mister-puzzle` (tick de
 * sauvegarde). Toutes disent la même chose : l'API n'existe que sur certains
 * mobiles (Android Chrome notamment ; iOS l'ignore), donc chaque appel est
 * gardé et silencieux en absence — jamais d'erreur, simple no-op.
 *
 * Les patterns nommés viennent des mesures de `mister-molkky` : la durée et la
 * cadence télégraphient l'importance de l'événement sans regarder l'écran.
 */

/**
 * Patterns gradués, du plus discret au plus long :
 * - `tap` : pichenette d'affordance (bouton, sélection) ;
 * - `confirm` : accusé de réception d'une action validée ;
 * - `success` : motif court de validation ;
 * - `warning` : trois pulsations moyennes (« oups ») ;
 * - `error` : pulsations fortes (avertissement) ;
 * - `victory` : escalade terminée par une longue (célébration).
 */
export const HAPTIC_PATTERNS = {
  tap: 8,
  confirm: 18,
  success: [0, 22, 40, 16],
  warning: [40, 50, 40, 50, 40],
  error: [70, 60, 70, 60, 90],
  victory: [50, 40, 50, 40, 80, 40, 140],
};

/** `true` si l'API Vibration est disponible (jamais le cas sur iOS). */
export function canVibrate() {
  return (
    typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
  );
}

/**
 * Vibre selon un pattern (durée unique ou alternance vibration/pause), ou un
 * nom de `HAPTIC_PATTERNS`. No-op silencieux si l'API manque ou refuse.
 *
 * @param {number | number[] | keyof typeof HAPTIC_PATTERNS} pattern
 * @returns {boolean} `true` si la vibration a été demandée.
 */
export function vibrate(pattern) {
  if (!canVibrate()) return false;
  const resolved =
    typeof pattern === 'string' ? HAPTIC_PATTERNS[pattern] : pattern;
  if (resolved == null) return false;
  try {
    return navigator.vibrate(resolved) === true;
  } catch {
    return false;
  }
}
