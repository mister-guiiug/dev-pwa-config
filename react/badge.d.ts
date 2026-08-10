import type { FC, HTMLAttributes, ReactNode } from 'react';

export type BadgeTone =
  | 'brand'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted';

/**
 * Pas de variante « pleine » : avec une seule couleur par ton, le texte posé
 * en aplat ne tient pas 4,5:1 sur les tons clairs.
 */
export type BadgeVariant = 'soft' | 'outline';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Intention sémantique, pas une couleur. */
  tone?: BadgeTone;
  variant?: BadgeVariant;
  icon?: ReactNode;
  children?: ReactNode;
}

/** Pastille d'état (non stylée, cibler `[data-dwc="badge"][data-tone]`). */
export declare const Badge: FC<BadgeProps>;
