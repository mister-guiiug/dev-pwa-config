export type ThemeScheme = 'light' | 'dark';

/** Rôles sémantiques d'une palette, tels que relevés dans le CSS de l'app. */
export interface ThemePalette {
  /** Fond de page. */
  bg: string;
  /** Dégradé ou halo de fond, quand l'app en pose un. */
  bgImage?: string;
  surface: string;
  surface2: string;
  text: string;
  textSoft: string;
  border: string;
  primary: string;
  primaryContrast: string;
  primarySoft: string;
  /** Second ton de marque ; répète `primary` quand l'app n'en a qu'un. */
  accent: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export interface FamilyTheme {
  /** Identifiant du dépôt GitHub, ou `generic`. */
  id: string;
  name: string;
  tagline: string;
  schemes: ThemeScheme[];
  attribute: 'data-theme' | 'class';
  /** Police de titrage de l'app, ou `null` si elle s'en tient au système. */
  fontDisplay: string | null;
  radius: string;
  /** `true` pour le thème générique, qui ne porte aucune couleur. */
  usesCssDefaults?: boolean;
  light?: ThemePalette;
  dark?: ThemePalette;
}

/** Les dix-sept palettes : le thème générique, plus une par app de la famille. */
export declare const FAMILY_THEMES: FamilyTheme[];

/** Thème d'une app par son identifiant de dépôt. */
export declare function themeById(id: string): FamilyTheme | undefined;

/** Couleur de marque d'une app, dans un schéma donné. */
export declare function brandColor(
  id: string,
  scheme?: ThemeScheme
): string | undefined;
