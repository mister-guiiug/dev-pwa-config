/**
 * Limitation de débit CÔTÉ CLIENT — confort et anti-maladresse uniquement
 * (double envoi, spam involontaire). La limitation d'autorité vit côté
 * serveur (contraintes + fonctions).
 *
 * PROMU depuis `bac-sable/src/shared/lib/rate-limit.ts` (mister-family-map).
 * L'horloge est injectable : les tests n'attendent pas.
 */

/**
 * @param {number} maxActions Jetons disponibles par fenêtre.
 * @param {number} windowMs Largeur de la fenêtre glissante.
 * @param {() => number} [clock] Horloge injectable (défaut `Date.now`).
 * @returns {{ tryAcquire(): boolean, retryInMs(now?: number): number }}
 */
export function createRateLimiter(
  maxActions,
  windowMs,
  clock = () => Date.now()
) {
  let timestamps = [];

  const prune = now => {
    timestamps = timestamps.filter(t => now - t < windowMs);
  };

  return {
    /** Tente de consommer un jeton ; `false` si la fenêtre est saturée. */
    tryAcquire() {
      const now = clock();
      prune(now);
      if (timestamps.length >= maxActions) return false;
      timestamps.push(now);
      return true;
    },
    /** Millisecondes avant qu'un jeton se libère (0 si disponible). */
    retryInMs(now = clock()) {
      prune(now);
      if (timestamps.length < maxActions) return 0;
      const oldest = timestamps[0];
      return oldest === undefined ? 0 : Math.max(0, oldest + windowMs - now);
    },
  };
}
