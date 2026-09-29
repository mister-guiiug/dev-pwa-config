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
