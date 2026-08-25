/**
 * Enregistre le chemin courant dans le fil d'Ariane et le contexte de session.
 * Agnostique du routeur : on lui passe le chemin.
 */
export declare function useRouteBreadcrumbs(
  path: string,
  options?: { category?: string }
): void;
