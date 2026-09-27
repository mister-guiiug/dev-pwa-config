import type { ReactNode } from 'react';
import type { ThemeToggleProps } from './theme-toggle';

export type ChromePrefsProps = {
  /** Boutons langue / densités, à côté du thème. */
  children?: ReactNode;
  /** Nom accessible du groupe (défaut : label thème). */
  label?: string;
  className?: string;
  /** Props passées à `ThemeToggle`, ou `false` pour l'omettre. */
  themeToggle?: ThemeToggleProps | false;
};

export declare function ChromePrefs(
  props?: ChromePrefsProps
): React.JSX.Element;
