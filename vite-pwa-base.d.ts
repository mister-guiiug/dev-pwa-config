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
  /**
   * Dossier des pages de contenu, relatif à la racine du projet (défaut
   * `content/pages`). Chaque `<slug>.md` devient `<slug>.html` au build, entre
   * au plan de site et au contenu servi. `false` coupe.
   */
  contentPages?: string | false;
  /**
   * Image de partage, relative au dossier public. Par défaut `og-image.jpg` ou
   * `og-image.png` s'il existe ; `false` coupe.
   */
  ogImage?: string | false;
}

/** Une page de contenu lue dans `content/pages/<slug>.md`. */
export interface ContentPage {
  slug: string;
  /** Le `<title>` de la page. */
  title: string;
  /** La meta description. */
  description: string;
  /** `date` de l'en-tête, reprise en `dateModified`. */
  date?: string;
  /** Le texte du `# titre` (h1). */
  titre: string;
  markdown: string;
  html: string;
  faq: Array<{ question: string; reponse: string }>;
  mots: number;
}

/** Les noms d'image de partage cherchés dans le dossier public. */
export const OG_IMAGE_FILES: readonly string[];

/** Largeur, hauteur et type d'un PNG ou d'un JPEG, lus dans l'en-tête. */
export function imageDimensions(
  octets: Uint8Array
): { width: number; height: number; type: string } | null;

/** Remplace les balises d'image de partage par le jeu complet. */
export function setShareImage(
  html: string,
  image: {
    url: string;
    width: number;
    height: number;
    type: string;
    alt?: string;
  }
): string;

/** L'image de partage trouvée dans le dossier public, ou `null`. */
export function findShareImage(opts: {
  publicDir: string;
  homeUrl: string;
  fichier?: string;
}): { url: string; width: number; height: number; type: string } | null;

/** Le dossier des pages de contenu, relatif à la racine du projet. */
export const CONTENT_PAGES_DIR: string;

/** Le Markdown court des pages de contenu, en HTML échappé. */
export function renderMarkdown(md: string): string;

/** Les questions de la section « Questions fréquentes ». */
export function faqFromMarkdown(
  md: string
): Array<{ question: string; reponse: string }>;

/** Lit une page de contenu ; lève une erreur qui nomme le fichier. */
export function parseContentPage(texte: string, fichier?: string): ContentPage;

/** Les pages de contenu d'un dossier, triées par slug. */
export function readContentPages(dossier: string): ContentPage[];

/** Noir ou blanc : le texte qui contraste le plus sur un fond `#rrggbb`. */
export function textOn(hex: string): string;

/** Le document HTML autonome d'une page de contenu. */
export function contentPageHtml(opts: {
  page: ContentPage;
  pages?: ContentPage[];
  indexHtml: string;
  homeUrl: string;
}): string;

/** La mise en page, en ligne, du contenu servi. */
export const SERVED_CONTENT_STYLE: string;

/**
 * Injecte `<h1>` (le `<title>`), la description et un lien vers l'accueil du
 * parc dans le premier `<div id="…"></div>` vide du `<body>`.
 */
export function injectServedContent(
  html: string,
  opts?: { pages?: Array<{ href: string; titre: string }> }
): {
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
    root?: string;
    publicDir?: string;
    build?: { outDir?: string };
  }): void;
  transformIndexHtml(html: string): string;
  writeBundle(options?: { dir?: string }): void;
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
