export interface PwaIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: 'any' | 'maskable' | 'monochrome' | string;
}

export interface PwaShortcut {
  name: string;
  short_name?: string;
  /** URL relative à l'app (`#/journal`) ou absolue (`/autre/`). */
  url: string;
  description?: string;
  icons?: PwaIcon[];
}

export interface PwaOptions {
  /**
   * Identifiant du dépôt (`miss-uwh`). Sert de base au `basePath` et permet de
   * LIRE `theme_color` / `background_color` dans `themes.js` au lieu de les
   * recopier.
   */
  id?: string;
  name?: string;
  shortName?: string;
  description?: string;
  /** Défaut : `/<id>/`. */
  basePath?: string;
  /** Défaut : la primaire du thème de l'app. */
  themeColor?: string;
  /** Défaut : le fond du thème de l'app. */
  backgroundColor?: string;
  lang?: string;
  dir?: 'ltr' | 'rtl' | 'auto';
  display?: 'standalone' | 'fullscreen' | 'minimal-ui' | 'browser';
  orientation?: string;
  categories?: string[];
  shortcuts?: PwaShortcut[];
  icons?: PwaIcon[];
  /**
   * `'prompt'` par défaut : seul mode compatible avec
   * `react/use-update-prompt`, et ce que dix apps sur seize font déjà.
   */
  registerType?: 'prompt' | 'autoUpdate';
  includeAssets?: string[];
  /**
   * Origines d'API à mettre en cache (`NetworkFirst`). Vide par défaut, et
   * c'est voulu : mettre en cache des réponses authentifiées expose les données
   * d'un utilisateur au suivant sur un appareil partagé.
   */
  apiOrigins?: Array<string | RegExp>;
  /** Règles Workbox supplémentaires, ajoutées après celles par défaut. */
  runtimeCaching?: unknown[];
  /** Surcharges profondes du manifest. */
  manifest?: Record<string, unknown>;
  /** Surcharges profondes des options Workbox. */
  workbox?: Record<string, unknown>;
}

/** Chemin de base normalisé : toujours `/…/`, ou `/`. */
export declare function normalizeBasePath(basePath?: string): string;

/** Manifest par défaut, couleurs lues dans `themes.js` quand c'est possible. */
export declare function pwaManifest(
  options?: PwaOptions
): Record<string, unknown>;

/** Options Workbox par défaut (sans mise en cache d'API). */
export declare function pwaWorkbox(
  options?: PwaOptions
): Record<string, unknown>;

/** Options complètes à passer à `VitePWA()`. */
export declare function pwaBaseOptions(options?: PwaOptions): {
  registerType: 'prompt' | 'autoUpdate';
  includeAssets: string[];
  manifest: Record<string, unknown>;
  workbox: Record<string, unknown>;
};
