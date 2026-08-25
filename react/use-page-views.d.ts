/**
 * Envoie une vue de page à chaque changement de chemin. Sans consentement
 * accordé, ne fait rien — le hook peut être monté sans condition.
 */
export declare function usePageViews(
  path: string,
  options?: { title?: string }
): void;
