import type { ComponentType } from 'react';

/**
 * Le composant lucide attendu pour chaque rôle. Documentation exécutable : le
 * paquet ne résout aucun de ces noms lui-même.
 */
export declare const LUCIDE_NAMES: Record<string, string>;

export interface LucideIconSetOptions {
  /** Poids de trait commun, pour aligner les icônes du paquet sur l'écran. */
  strokeWidth?: number;
  /** Épaisseur de trait indépendante de la taille (option lucide). */
  absoluteStrokeWidth?: boolean;
}

/**
 * Normalise un jeu de composants d'icônes pour `IconsProvider` : `aria-hidden`
 * par défaut, `focusable="false"`, poids de trait commun.
 */
export declare function lucideIconSet(
  icons: Record<
    string,
    ComponentType<Record<string, unknown>> | null | undefined
  >,
  options?: LucideIconSetOptions
): Record<string, ComponentType<Record<string, unknown>>>;
