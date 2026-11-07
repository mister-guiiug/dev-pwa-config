/**
 * Le stockage persistant de l'origine : demandé une fois, il vaut pour toutes
 * les applications de la famille. `null` = le navigateur n'offre pas l'API.
 */

/** Le navigateur garde-t-il les données de l'origine ? */
export declare function isStoragePersisted(): Promise<boolean | null>;

/**
 * Demande au navigateur de garder les données de l'origine (sans redemander
 * ce qui est accordé). À appeler sur un geste ou à l'installation : Firefox
 * affiche une invite.
 */
export declare function requestPersistentStorage(): Promise<boolean | null>;

/** Place utilisée et disponible pour l'origine, en octets. */
export declare function storageEstimate(): Promise<{
  usage: number | null;
  quota: number | null;
} | null>;
