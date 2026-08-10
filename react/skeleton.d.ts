import type { FC, ReactNode } from 'react';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

export interface SkeletonGroupProps {
  /** Libellé annoncé par les lecteurs d'écran (ex. « Chargement des scores »). */
  label: string;
  /** Nombre de barres générées si aucun enfant n'est fourni. */
  lines?: number;
  className?: string;
  children?: ReactNode;
}

/** Barre décorative (`aria-hidden`). */
export declare const Skeleton: FC<SkeletonProps>;
/** Conteneur annoncé (`role="status"` + `aria-busy`). */
export declare const SkeletonGroup: FC<SkeletonGroupProps>;
