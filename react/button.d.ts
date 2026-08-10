import type { ButtonHTMLAttributes, FC } from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-busy'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Affiche un indicateur, pose `aria-busy` et désactive le bouton. */
  loading?: boolean;
  /** Occupe toute la largeur disponible. */
  block?: boolean;
  /** Bouton carré sans libellé visible — fournir `aria-label`. */
  iconOnly?: boolean;
}

/**
 * Bouton famille (non stylé, cibler `[data-dwc="button"]` ou importer
 * `components.css`). Cible tactile de 2,75 rem garantie à toutes les tailles.
 */
export declare const Button: FC<ButtonProps>;
