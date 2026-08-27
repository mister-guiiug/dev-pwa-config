export interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

/**
 * Faut-il précharger ici ? `false` si l'utilisateur économise ses données ou
 * si la connexion est en 2G — précharger reviendrait à dépenser son forfait.
 */
export declare function shouldPrefetch(
  connection?: NetworkInformationLike
): boolean;

/**
 * Déclenche un chargeur une seule fois, sans jamais laisser échapper d'erreur.
 * `true` si l'appel est parti maintenant.
 */
export declare function prefetch(loader: () => Promise<unknown>): boolean;

/** `true` si ce chargeur a déjà été déclenché. */
export declare function isPrefetched(loader: () => Promise<unknown>): boolean;

/** Les évènements qui trahissent l'intention de cliquer. */
export declare const INTENT_EVENTS: readonly string[];

export interface IntentOptions {
  /** Défaut : `INTENT_EVENTS`. */
  events?: readonly string[];
}

/** Précharge à l'approche (pointeur, focus, doigt). Rend le désabonnement. */
export declare function prefetchOnIntent(
  element: EventTarget | null | undefined,
  loader: () => Promise<unknown>,
  options?: IntentOptions
): () => void;

export interface VisibleOptions {
  /** Marge d'anticipation. Défaut : `200px`. */
  rootMargin?: string;
}

/** Précharge quand l'élément approche de l'écran. Rend le désabonnement. */
export declare function prefetchWhenVisible(
  element: Element | null | undefined,
  loader: () => Promise<unknown>,
  options?: VisibleOptions
): () => void;

export interface IdleOptions {
  /** Délai de repli, et plafond de `requestIdleCallback`. Défaut : 2000 ms. */
  timeout?: number;
}

/** Précharge quand le navigateur est au repos. Rend l'annulation. */
export declare function prefetchWhenIdle(
  loader: () => Promise<unknown>,
  options?: IdleOptions
): () => void;
