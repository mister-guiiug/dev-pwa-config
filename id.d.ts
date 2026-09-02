/** Ce dont les générateurs ont besoin : `crypto.randomUUID`, ou rien. */
export interface UuidSource {
  randomUUID?: () => string;
}

/**
 * Identifiant court et préfixé (`id_3f9a2c1b`) : huit hexadécimaux tirés
 * d'un UUID. Assez pour une liste locale, pas pour une table partagée.
 */
export declare function createId(
  prefix?: string,
  source?: UuidSource | null
): string;

/**
 * UUID v4, au format des colonnes `uuid` Postgres — un identifiant local
 * identique à la clé primaire rend l'insertion idempotente. Repli v4 complet
 * (version et variante posées) quand `crypto.randomUUID` manque.
 */
export declare function createUuid(source?: UuidSource | null): string;

/** Vrai si la chaîne a la forme d'un UUID v4. */
export declare function isUuid(value: unknown): value is string;
