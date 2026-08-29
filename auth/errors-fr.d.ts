/** Le repli par défaut : toujours une phrase française. */
export declare const GENERIC_AUTH_ERROR_FR: string;

/**
 * Message utilisateur français pour une erreur d'authentification Supabase.
 * Accepte le message seul, l'objet d'erreur avec son code stable, une
 * `Error`, ou rien. Fusion des cartes de mister-doc (sous-chaînes) et
 * miss-carbook (codes).
 *
 * `fallback: null` rend `null` pour une erreur inconnue (comportement
 * carbook : l'appelant affiche son propre générique, avec le détail
 * technique à part). Défaut : `GENERIC_AUTH_ERROR_FR`.
 */
export declare function frAuthError(error: unknown): string;
export declare function frAuthError(
  error: unknown,
  options: { fallback: string }
): string;
export declare function frAuthError(
  error: unknown,
  options?: { fallback?: string | null }
): string | null;
