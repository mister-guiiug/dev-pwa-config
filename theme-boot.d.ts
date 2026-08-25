export interface ThemeBootOptions {
  /** Clé localStorage ; doit être celle passée à `useTheme` (`dwc_theme`). */
  storageKey?: string;
  /** `data-theme` (défaut) ou `class` pour la classe `.dark`. */
  attribute?: 'data-theme' | 'class';
  /** Thème appliqué si le stockage est inaccessible (défaut `system` → clair). */
  defaultTheme?: 'light' | 'dark' | 'system';
}

export declare const DEFAULT_STORAGE_KEY: string;

/** Le JavaScript seul, sans balise. */
export declare function themeBootSource(options?: ThemeBootOptions): string;

/** Le script enveloppé dans sa balise, prêt pour le `<head>`. */
export declare function themeBootScript(options?: ThemeBootOptions): string;
