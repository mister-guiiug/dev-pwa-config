import type { ButtonHTMLAttributes, FC } from 'react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonBaseProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-busy'> {
  /**
   * Bloque le bouton SANS lui voler le focus — le clic est neutralisé ici.
   *
   * Prévu pour recevoir `disabledProps` de `react/use-action-guard`, qui rend
   * exactement `{ 'aria-disabled': true }`. Le type l'omettait, au motif que
   * `loading` le pose : les deux modules ne composaient donc pas, et une app a
   * dû retomber sur `disabled` natif. Les deux raisons se cumulent.
   */
  'aria-disabled'?: boolean | 'true' | 'false';
  variant?: ButtonVariant;
  size?: ButtonSize;
  /**
   * Affiche un indicateur et pose `aria-busy`. Le bouton reçoit
   * `aria-disabled` (pas `disabled`) : il garde le focus, et le clic est
   * neutralisé par le composant.
   */
  loading?: boolean;
  /** Occupe toute la largeur disponible. */
  block?: boolean;
}

/**
 * En mode icône seule, un nom accessible est EXIGÉ par le type — pas seulement
 * recommandé par la documentation. Un avertissement console double la règle en
 * développement, pour les appelants en JavaScript.
 */
export type ButtonProps =
  | (ButtonBaseProps & { iconOnly?: false })
  | (ButtonBaseProps & { iconOnly: true; 'aria-label': string })
  | (ButtonBaseProps & { iconOnly: true; 'aria-labelledby': string });

/**
 * Bouton famille (non stylé, cibler `[data-dwc="button"]` ou importer
 * `components.css`). Cible tactile de 2,75 rem garantie à toutes les tailles.
 */
export declare const Button: FC<ButtonProps>;
