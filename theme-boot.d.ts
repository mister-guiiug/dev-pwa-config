export interface ThemeBootOptions {
  /** Clé localStorage ; doit être celle passée à `useTheme` (`dwc_theme`). */
  storageKey?: string;
  /** `data-theme` (défaut) ou `class` pour la classe `.dark`. */
  attribute?: 'data-theme' | 'class';
  /** Thème appliqué si le stockage est inaccessible (défaut `system` → clair). */
  defaultTheme?: 'light' | 'dark' | 'system';
  /**
   * Anciennes clés à lire si `storageKey` est vide, puis à réécrire sous
   * `storageKey`. Six clés distinctes existent dans la famille : sans cette
   * migration, adopter le script perd la préférence de l'utilisateur.
   */
  legacyKeys?: string[];
}

export declare const DEFAULT_STORAGE_KEY: string;

/** Le JavaScript seul, sans balise. */
export declare function themeBootSource(options?: ThemeBootOptions): string;

/** Le script enveloppé dans sa balise, prêt pour le `<head>`. */
export declare function themeBootScript(options?: ThemeBootOptions): string;

/**
 * Les deux balises `<meta name="theme-color">` avec `media`, qui suivent le
 * thème SYSTÈME dès le premier rendu. Le choix explicite contraire au système
 * est couvert par `ThemeProvider`.
 */
export declare function themeColorMetaTags(colors: {
  light?: string;
  dark?: string;
}): string;

/** Retire les `<meta name="theme-color">` déjà présentes dans un HTML. */
export declare function stripThemeColorMeta(html: string): string;
