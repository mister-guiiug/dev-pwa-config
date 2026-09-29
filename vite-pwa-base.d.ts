/**
 * Types pour vite-pwa-base. Le plugin est typé structurellement pour éviter
 * d'importer `vite` (peerDep côté consumer).
 */

import type { FamilyApp } from './apps-catalog.js';

export function resolveSeoPublicUrls(
  arg?: string | { basePath?: string; logoPath?: string; iconQuery?: string }
): {
  origin: string;
  homeUrl: string;
  logoUrl?: string;
};

/** Une route publique : un chemin relatif à l'accueil, et ses textes. */
export interface PublicRoute {
  /** `a-propos`, `lieux/1` : minuscules ASCII et tirets, sans extension. */
  path: string;
  /** Le `<title>` de la route (sinon celui de l'accueil). */
  title?: string;
  /** La description de la route (sinon celle de l'accueil). */
  description?: string;
}

export interface PwaSeoPluginOptions {
  /**
   * Nom du site pour `og:site_name`, quand l'app n'est pas au catalogue — le
   * nom du catalogue l'emporte. Une balise écrite à la main n'est jamais
   * remplacée.
   */
  siteName?: string;
  sitemap?: boolean;
  /**
   * Générer `robots.txt` (défaut `false`). Un `robots.txt` n'est lu qu'à la
   * racine d'une origine : sous `/<app>/`, les robots l'ignorent. À `true`
   * pour une app servie à la racine d'une origine.
   */
  robots?: boolean;
  outDir?: string;
  changefreq?: string;
  basePath?: string;
  logoPath?: string;
  iconQuery?: string;
  /**
   * Contenu d'un `llms.txt`. Omis ou `false` : aucun fichier (défaut).
   * `true` : fichier minimal depuis le catalogue. Une chaîne : ce texte.
   */
  llms?: string | boolean;
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
   * catalogue et de la page (défaut `true`), avec le nœud de l'éditeur dans
   * un `@graph`. `false` les coupe ; un objet surcharge des champs du
   * `WebApplication`. Jamais injectées si la page porte déjà un
   * `application/ld+json`.
   */
  jsonLd?: boolean | Record<string, unknown>;
  /**
   * Routes PUBLIQUES, relatives à l'accueil : `'a-propos'`, ou `{ path,
   * title, description }`. Chacune devient au build `<path>.html` — l'accueil
   * construit, avec son titre, sa description, sa canonique sans extension et
   * son Open Graph — et entre au plan de site. Un chemin invalide, réservé ou
   * en collision avec une page de contenu fait échouer le build.
   */
  routes?: Array<string | PublicRoute>;
  /**
   * Sert, au BUILD, le titre, la description, le texte de
   * `content/accueil.md`, les pages de contenu, les apps sœurs et le dépôt
   * dans le point de montage vide — ce qu'un robot lit sans exécuter le
   * JavaScript. React le remplace au premier rendu. Défaut `true`.
   */
  servedContent?: boolean;
  /**
   * Dossier des pages de contenu, relatif à la racine du projet (défaut
   * `content/pages`). Chaque `<slug>.md` devient `<slug>.html` au build, et
   * chaque `en/<slug>.md` `en/<slug>.html` ; elles entrent au plan de site et
   * au contenu servi. `false` coupe.
   */
  contentPages?: string | false;
  /**
   * Image de partage, relative au dossier public. Par défaut `og-image.jpg` ou
   * `og-image.png` s'il existe ; `false` coupe.
   */
  ogImage?: string | false;
}

/**
 * Une page de contenu lue dans `content/pages/<slug>.md` (française) ou
 * `content/pages/en/<slug>.md` (anglaise).
 */
export interface ContentPage {
  slug: string;
  /** La langue de la page : `fr` à la racine, `en` sous `en/`. */
  lang: string;
  /** Le fichier lu, relatif au dossier des pages (`en/rules.md`). */
  fichier: string;
  /** Le fichier écrit, relatif à l'accueil (`slug.html`, `en/slug.html`). */
  chemin: string;
  /** Le `<title>` de la page. */
  title: string;
  /** La meta description. */
  description: string;
  /** `date` de l'en-tête : la publication (`AAAA-MM-JJ`). */
  date?: string;
  /** `updated` de l'en-tête : la dernière mise à jour de fond. */
  updated?: string;
  /** `answer` de l'en-tête, guillemets englobants retirés. */
  answer?: string;
  /** Le nombre de mots de `answer`. */
  motsReponse?: number;
  /** Sur une page anglaise : le slug de la page française traduite. */
  translation?: string;
  /** Le texte du `# titre` (h1). */
  titre: string;
  markdown: string;
  html: string;
  faq: Array<{ question: string; reponse: string }>;
  /** Les URL de la section `## Sources` / `## References`. */
  sources: string[];
  mots: number;
  /** L'empreinte de la source, en-tête compris (voir `seoState`). */
  empreinte: string;
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

/**
 * Le Markdown court des pages de contenu, en HTML échappé. La section
 * `## Sources` / `## References` est rendue dans un `<section
 * class="sources">`, ses URL nues en liens.
 */
export function renderMarkdown(md: string): string;

/** Les questions de la section « Questions fréquentes ». */
export function faqFromMarkdown(
  md: string
): Array<{ question: string; reponse: string }>;

/**
 * Lit une page de contenu ; lève une erreur qui nomme le fichier (en-tête
 * incomplet, slug invalide, date qui n'en est pas une, deux `#`…).
 */
export function parseContentPage(
  texte: string,
  fichier?: string,
  options?: { lang?: string; dossier?: string }
): ContentPage;

/**
 * Les fichiers de pages d'un dossier, relatifs à lui : les français, puis les
 * anglais sous `en/`. Brouillons (`_…`) et README ignorés — la liste que
 * compte `pwa-doctor`.
 */
export function contentPageFiles(dossier: string): string[];

/**
 * Les pages de contenu d'un dossier (françaises, puis anglaises). Refuse deux
 * slugs identiques dans une langue, et une traduction orpheline ou en double.
 */
export function readContentPages(dossier: string): ContentPage[];

/** Noir ou blanc : le texte qui contraste le plus sur un fond `#rrggbb`. */
export function textOn(hex: string): string;

/**
 * Une date `AAAA-MM-JJ` au format long de la langue : « 25 septembre 2026 »,
 * « 1er octobre 2026 », « September 25, 2026 ».
 */
export function formatLongDate(iso: string, lang?: string): string;

/**
 * Le document HTML autonome d'une page de contenu : signature datée, bloc
 * « En bref », `hreflang` réciproques avec sa traduction, « Dans la même
 * catégorie ».
 */
export function contentPageHtml(opts: {
  page: ContentPage;
  pages?: ContentPage[];
  indexHtml: string;
  homeUrl: string;
}): string;

/** La mise en page, en ligne, du contenu servi. */
export const SERVED_CONTENT_STYLE: string;

/**
 * Injecte `<h1>` (le `<title>`), la description, le texte de l'accueil, les
 * pages de contenu, les apps sœurs, le dépôt et un lien vers l'accueil du
 * parc dans le premier `<div id="…"></div>` vide du `<body>`.
 */
export function injectServedContent(
  html: string,
  opts?: {
    pages?: Array<{ href: string; titre: string; lang?: string }>;
    /** HTML déjà sûr : celui de `renderServedHome`. */
    accueil?: string;
    voisines?: {
      memeCategorie?: boolean;
      apps: Array<{ name: string; description?: string; appUrl: string }>;
    };
    depot?: string;
  }
): {
  html: string;
  injecte: boolean;
  raison?: string;
  montage?: string;
};

/** Le texte de l'accueil servi, relatif à la racine du projet. */
export const SERVED_HOME_FILE: string;

/**
 * `content/accueil.md` en HTML (Markdown court, sans `#`, en-tête toléré).
 * `''` pour un fichier vide.
 */
export function renderServedHome(texte: string, fichier?: string): string;

/**
 * Les apps sœurs : même catégorie, web seulement, quatre au plus ; complétées
 * par rotation dans le catalogue sous deux (`memeCategorie` vaut alors
 * `false`). Vide hors catalogue.
 */
export function relatedApps(id: string): {
  memeCategorie: boolean;
  apps: FamilyApp[];
};

/** `fr` → `fr_FR`, `en` → `en_US`, `pt-BR` → `pt_BR` ; `''` si inconnue. */
export function ogLocale(lang: string): string;

/**
 * Pose les balises texte manquantes de l'accueil (Open Graph, Twitter), sans
 * jamais remplacer une valeur écrite à la main — sauf `og:locale`, normalisé.
 */
export function setTextMeta(
  html: string,
  opts?: { siteName?: string; url?: string }
): string;

/** `category` du catalogue → `applicationCategory` documentée par Google. */
export const SCHEMA_APPLICATION_CATEGORIES: Readonly<Record<string, string>>;

/**
 * Le `WebApplication` schema.org d'une app du parc et le nœud de l'éditeur,
 * dans un `@graph` ; `null` sans nom ni description.
 */
export function webApplicationJsonLd(opts: {
  html: string;
  homeUrl: string;
  overrides?: Record<string, unknown>;
  /** Les captures du manifeste, en URL absolues. */
  screenshots?: string[];
}): { '@context': string; '@graph': Array<Record<string, unknown>> } | null;

/** Un `llms.txt` minimal depuis le catalogue, ou `null` sans matière. */
export function defaultLlmsTxt(opts: {
  homeUrl: string;
  html?: string;
}): string | null;

/** Le bloc `<script type="application/ld+json">`, `<` échappé. */
export function jsonLdScript(donnees: Record<string, unknown>): string;

/**
 * Les routes normalisées ; lève une erreur qui nomme la route pour un chemin
 * invalide, réservé ou en double.
 */
export function normalizeRoutes(
  routes?: Array<string | PublicRoute>
): PublicRoute[];

/**
 * La page d'une route : l'`index.html` construit avec le titre, la
 * description, la canonique et l'Open Graph de la route.
 */
export function routePageHtml(
  indexHtml: string,
  route: { url: string; title?: string; description?: string }
): string;

/**
 * Le document marqué `noindex` : balise robots posée, celles écrites à la
 * main et la canonique retirées. Idempotent.
 */
export function withNoindex(html: string): string;

/** Le fichier d'état SEO publié avec le site : `seo-state.json`. */
export const SEO_STATE_FILE: string;

/**
 * L'empreinte d'un accueil construit : titre, description, contenu servi,
 * JSON-LD hors valeurs volatiles.
 */
export function homeFingerprint(html: string): string;

/**
 * Le `lastmod` réel de chaque URL et la liste de celles qui ont changé,
 * d'après l'état du déploiement précédent.
 */
export function seoState(opts: {
  entrees: Array<{ url: string; hash: string; date?: string }>;
  precedent?: Record<string, { hash?: string; lastmod?: string }> | null;
  aujourdHui?: string;
}): {
  etat: Record<string, { hash: string; lastmod: string }>;
  changees: string[];
};

/** Renvoie un objet Plugin Vite (structurel). */
export function pwaSeoPlugin(opts?: PwaSeoPluginOptions): {
  name: string;
  config(): { optimizeDeps: { exclude: string[] } };
  configResolved(config: {
    command?: string;
    root?: string;
    publicDir?: string;
    build?: { outDir?: string };
  }): void;
  buildStart(): void;
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
 * build, marqué `noindex`. Sans lui, rafraîchir un lien profond sert la page
 * 404 de GitHub. Inoffensif pour une app qui route par `#`.
 */
export function spaFallbackPlugin(opts?: SpaFallbackPluginOptions): {
  name: string;
  configResolved(config: {
    command?: string;
    build?: { outDir?: string };
  }): void;
  closeBundle(): Promise<void>;
};
