import type { FC } from 'react';

export interface ThemeToggleProps {
  /**
   * États parcourus, dans l'ordre. Défaut `['light','dark','system']` — les
   * trois de `useTheme`. Passer `['light','dark']` retrouve la bascule à deux
   * états des apps, et alors `aria-pressed` est posé.
   */
  states?: string[];
  className?: string;
  /** Remplace le nom accessible calculé. */
  label?: string;
  /** Affiche le libellé à côté de l'icône, au lieu de le réserver aux lecteurs d'écran. */
  showLabel?: boolean;
}

/** Bascule de thème : cycle clair → sombre → système, `type="button"`. */
export declare const ThemeToggle: FC<ThemeToggleProps>;
