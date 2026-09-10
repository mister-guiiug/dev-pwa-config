/**
 * La session Supabase rangée dans le stockage de l'appareil, ou `null`.
 * Best-effort : aucune erreur ne remonte. Rendue MÊME PÉRIMÉE — c'est tout
 * l'objet du module (voir le commentaire d'en-tête de `stored-session.js`).
 */
export declare function storedSupabaseSession(): object | null;

/** `navigator.onLine === false` — jamais `!onLine`, qui vaudrait hors navigateur. */
export declare function navigateurHorsLigne(): boolean;
