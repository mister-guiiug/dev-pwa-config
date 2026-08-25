import type { FC, ReactNode } from 'react';
import type { FamilyTheme } from '../themes.js';

export interface ThemeProviderProps {
  /** Identifiant d'app du catalogue : sa palette peint les `--dwc-*`. */
  appId?: string;
  children?: ReactNode;
  defaultTheme?: 'light' | 'dark' | 'system';
  storageKey?: string;
  attribute?: 'data-theme' | 'class';
  /** `false` pour garder l'état partagé sans peindre les variables. */
  paint?: boolean;
  /**
   * Anciennes clés `localStorage` à migrer vers `storageKey` (six clés
   * distinctes existent dans la famille).
   */
  legacyKeys?: string[];
  /**
   * Couleur de la barre du navigateur par schéma. Sans valeur, le fond de la
   * palette d'`appId` est utilisé.
   */
  themeColor?: { light?: string; dark?: string };
}

export interface ThemeContextValue {
  theme: 'light' | 'dark' | 'system' | string;
  resolved: 'light' | 'dark' | string;
  setTheme: (theme: string) => void;
  toggle: () => void;
  appId: string | null;
  palette: FamilyTheme | null;
}

/** Palette, état et variables du thème, en un seul endroit. */
export declare const ThemeProvider: FC<ThemeProviderProps>;

/** L'état partagé, ou `null` hors fournisseur. */
export declare function useThemeContext(): ThemeContextValue | null;
