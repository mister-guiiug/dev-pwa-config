/**
 * Types pour vite-pwa-base. Le plugin est typé structurellement pour éviter
 * d'importer `vite` (peerDep côté consumer).
 */

export function resolveSeoPublicUrls(
  arg?: string | { basePath?: string; logoPath?: string; iconQuery?: string }
): {
  origin: string;
  homeUrl: string;
  logoUrl?: string;
};

export interface PwaSeoPluginOptions {
  siteName?: string;
  sitemap?: boolean;
  robots?: boolean;
  outDir?: string;
  changefreq?: string;
  basePath?: string;
  logoPath?: string;
  iconQuery?: string;
  llms?: string;
  /**
   * Injecte le script anti-FOUC en tête de `<head>`. `true` pour les valeurs
   * par défaut, ou les options de `themeBootSource` (dont `legacyKeys`, sans
   * lesquelles adopter le script perd la préférence déjà enregistrée).
   */
  themeBoot?: boolean | import('./theme-boot.js').ThemeBootOptions;
  /**
   * Remplace les `<meta name="theme-color">` par deux balises `media`, qui
   * suivent le thème système dès le premier rendu.
   */
  themeColor?: { light?: string; dark?: string };
  extraReplacements?: Record<string, string>;
}

/** Renvoie un objet Plugin Vite (structurel). */
export function pwaSeoPlugin(opts?: PwaSeoPluginOptions): {
  name: string;
  configResolved(config: {
    command?: string;
    build?: { outDir?: string };
  }): void;
  transformIndexHtml(html: string): string;
  closeBundle(): Promise<void>;
};

export interface SpaFallbackPluginOptions {
  /** Dossier de sortie (défaut `dist`, ou `build.outDir` de la config). */
  outDir?: string;
  /** Fichier copié (défaut `index.html`). */
  from?: string;
  /** Fichier écrit (défaut `404.html`). */
  to?: string;
}

/**
 * Repli SPA pour GitHub Pages : copie `index.html` en `404.html` à la fin du
 * build. Sans lui, rafraîchir un lien profond sert la page 404 de GitHub.
 * Inoffensif pour une app qui route par `#`.
 */
export function spaFallbackPlugin(opts?: SpaFallbackPluginOptions): {
  name: string;
  configResolved(config: {
    command?: string;
    build?: { outDir?: string };
  }): void;
  closeBundle(): Promise<void>;
};
