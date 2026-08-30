export interface RateLimiter {
  /** Tente de consommer un jeton ; renvoie `false` si la fenêtre est saturée. */
  tryAcquire(): boolean;
  /** Millisecondes avant qu'un jeton se libère (0 si disponible). */
  retryInMs(now?: number): number;
}

/**
 * Limiteur de débit côté client (fenêtre glissante). Confort uniquement :
 * la limitation d'autorité vit côté serveur.
 */
export declare function createRateLimiter(
  maxActions: number,
  windowMs: number,
  clock?: () => number
): RateLimiter;
