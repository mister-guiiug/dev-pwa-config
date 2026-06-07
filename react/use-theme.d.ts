export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export interface UseThemeOptions {
  /** Thème initial si rien n'est stocké (défaut `system`). */
  defaultTheme?: ThemePreference;
  /** Clé localStorage (défaut `dwc_theme`). */
  storageKey?: string;
  /** Application sur `<html>` : attribut `data-theme` ou classe `.dark`. */
  attribute?: 'data-theme' | 'class';
}

export interface UseTheme {
  theme: ThemePreference;
  resolved: ResolvedTheme;
  setTheme: (theme: ThemePreference) => void;
  toggle: () => void;
}

/** Thème unifié light/dark/system, persistant, qui suit les préférences OS. */
export declare function useTheme(options?: UseThemeOptions): UseTheme;
