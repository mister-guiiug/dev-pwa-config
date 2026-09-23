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
  /**
   * Données structurées `WebApplication` injectées dans `<head>`, tirées du
   * catalogue et de la page (défaut `true`). `false` les coupe ; un objet
   * surcharge des champs. Jamais injectées si la page porte déjà un
   * `application/ld+json`.
   */
  jsonLd?: boolean | Record<string, unknown>;
  /**
   * Chemins PUBLICS à ajouter au plan de site, relatifs à l'accueil
   * (`'a-propos'`, `'en/'`).
   */
  routes?: string[];
  /**
   * Sert, au BUILD, le titre et la description de l'app dans son point de
   * montage vide — ce qu'un robot lit sans exécuter le JavaScript. React le
   * remplace au premier rendu. Défaut `true`.
   */
  servedContent?: boolean;
}

/** La mise en page, en ligne, du contenu servi. */
export const SERVED_CONTENT_STYLE: string;

/**
 * Injecte `<h1>` (le `<title>`), la description et un lien vers l'accueil du
 * parc dans le premier `<div id="…"></div>` vide du `<body>`.
 */
export function injectServedContent(html: string): {
  html: string;
  injecte: boolean;
  raison?: string;
  montage?: string;
};

/** `category` du catalogue → `applicationCategory` documentée par Google. */
export const SCHEMA_APPLICATION_CATEGORIES: Readonly<Record<string, string>>;

/**
 * Le `WebApplication` schema.org d'une app du parc, ou `null` sans nom ni
 * description.
 */
export function webApplicationJsonLd(opts: {
  html: string;
  homeUrl: string;
  overrides?: Record<string, unknown>;
}): Record<string, unknown> | null;

/** Le bloc `<script type="application/ld+json">`, `<` échappé. */
export function jsonLdScript(donnees: Record<string, unknown>): string;

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
