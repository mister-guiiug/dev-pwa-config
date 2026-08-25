import type { ComponentType, FC, ReactNode } from 'react';

/**
 * Un composant d'icône : `size` et `aria-hidden` lui sont passés, le reste est
 * libre — c'est la forme qu'ont `lucide-react` comme les SVG maison.
 */
export type IconComponent = ComponentType<Record<string, unknown>>;

/** Rôles attendus par les composants du paquet. */
export type IconRole =
  | 'close'
  | 'light'
  | 'dark'
  | 'system'
  | 'repo'
  | 'sponsor'
  | 'external';

export type IconSet = Partial<Record<IconRole, IconComponent>> &
  Record<string, IconComponent | undefined>;

/** Les SVG maison, replis de chaque rôle. */
export declare const DEFAULT_ICONS: Record<IconRole, IconComponent>;

export interface IconsProviderProps {
  /** Fusionné avec les replis : fournir un seul rôle est valable. */
  icons?: IconSet;
  children?: ReactNode;
}

/** Injecte les icônes de l'app pour les composants du paquet. */
export declare const IconsProvider: FC<IconsProviderProps>;

/** Le composant d'icône d'un rôle (repli maison hors fournisseur). */
export declare function useIcon(role: string): IconComponent | null;

/** Rend l'icône d'un rôle, décorative. */
export declare const Icon: FC<
  { role: string; size?: number } & Record<string, unknown>
>;
