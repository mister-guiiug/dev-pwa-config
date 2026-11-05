/**
 * La session Supabase rangée dans le stockage de l'appareil, ou `null`.
 * Best-effort : aucune erreur ne remonte. Rendue MÊME PÉRIMÉE — c'est tout
 * l'objet du module (voir le commentaire d'en-tête de `stored-session.js`).
 *
 * **Passez le client** : la session lue est alors celle de CE projet
 * (`client.auth.storageKey`), jamais celle d'une autre app de la même
 * origine. Sans lui, c'est la première case `sb-*-auth-token` venue.
 *
 * @param client Le client Supabase de l'app (`createClient(…)`).
 */
export declare function storedSupabaseSession(client?: {
  auth: object;
}): object | null;

/**
 * `true` quand un évènement d'auth SANS session est à ignorer : navigateur hors
 * ligne et session de ce projet encore rangée — le renouvellement du jeton a
 * échoué, personne n'a été déconnecté. Une vraie déconnexion efface d'abord
 * la session, et passe.
 */
export declare function ignoreOfflineSignOut(
  session: unknown,
  client?: { auth: object }
): boolean;

/** `navigator.onLine === false` — jamais `!onLine`, qui vaudrait hors navigateur. */
export declare function navigateurHorsLigne(): boolean;
