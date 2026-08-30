export interface ApplyUpdateOptions {
  /** Saute le chemin propre et purge directement (bouton « Forcer »). */
  hard?: boolean;
  /** Plafond par appel aux API service worker / caches (défaut 600 ms). */
  timeoutMs?: number;
  /** Plafond d'attente de `controllerchange` (défaut 3000 ms). */
  activationTimeoutMs?: number;
  /** Minuterie de secours qui recharge quoi qu'il arrive (défaut 1500 ms). */
  safetyMs?: number;
  /** Caches à conserver pendant la purge (défaut : aucun). */
  keepCache?: (name: string) => boolean;
  /** URL de destination (défaut : l'URL courante, avec un anti-cache `_t`). */
  reloadTo?: string;
  /** Point d'injection de la navigation ; utilisé par les tests. */
  navigate?: (target: string) => boolean;
}

/** Chemin réellement emprunté par `applyUpdate`. */
export type ApplyUpdateResult = 'activated' | 'purged' | 'none';

/**
 * Applique la mise à jour disponible, puis recharge : activation du worker en
 * attente si possible, purge du Cache Storage sinon. Ne touche jamais à
 * `localStorage`, `sessionStorage` ni IndexedDB.
 */
export declare function applyUpdate(
  options?: ApplyUpdateOptions
): Promise<ApplyUpdateResult>;

/** Échelle `assign` → `href` → `replace` → `reload`. */
export declare function hardNavigate(target: string): boolean;

/**
 * Désinscrit tous les service workers et rend le nombre de workers tombés.
 *
 * Ne recharge pas, ne touche à aucun cache : c'est la désinscription **de
 * développement** que cinq apps portaient à la main, pour qu'un worker resté
 * d'une session précédente ne serve pas du cache périmé. La condition
 * (`import.meta.env.DEV`) reste dans l'app — ce paquet est aussi lu par
 * `node --test`, qui n'a pas `import.meta.env`.
 *
 * Ne rejette jamais : sans `navigator.serviceWorker`, rend `0`.
 */
export declare function unregisterServiceWorkers(options?: {
  /** Plafond par appel aux API service worker (défaut 600 ms). */
  timeoutMs?: number;
}): Promise<number>;
