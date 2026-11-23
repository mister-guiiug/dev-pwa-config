/**
 * Les langues et les fonctions d'une app, pour son `WebApplication` : lues au
 * BUILD par `pwaSeoPlugin`, jamais à l'exécution (le catalogue, lui, part
 * dans le bundle).
 */
export interface AppSeo {
  /**
   * Langues de l'INTERFACE, en codes à deux lettres, le français d'abord —
   * relevées dans l'i18n de l'app (un dictionnaire réel et un moyen de le
   * choisir). Reprises en `inLanguage` du `WebApplication` de l'accueil.
   */
  readonly languages: readonly string[];
  /**
   * Trois à six fonctions réelles, en français court, lues dans le README et
   * vérifiées dans le code. Reprises en `featureList` du `WebApplication`.
   */
  readonly features: readonly string[];
}

/** Les données de référencement, par identifiant d'app du catalogue. */
export declare const APP_SEO: Readonly<Record<string, AppSeo>>;

/** Celles d'une app du catalogue, ou `undefined` pour une app hors catalogue. */
export declare function appSeo(id: string): AppSeo | undefined;

/** Un guide d'une app : chemin relatif à son accueil, titre court en français. */
export interface AppGuide {
  readonly chemin: string;
  readonly titre: string;
}

/** Les guides de chaque app du catalogue, au plus deux, lus au BUILD. */
export declare const APP_GUIDES: Readonly<Record<string, readonly AppGuide[]>>;

/** Ceux d'une app du catalogue, ou une liste vide. */
export declare function guidesDe(id: string): readonly AppGuide[];
