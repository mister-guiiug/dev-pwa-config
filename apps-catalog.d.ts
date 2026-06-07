/** Niveau de maturité éditorial d'une application (saisi à la main). */
export type Maturity = 'alpha' | 'beta' | 'stable';

/** Une application de la famille (miss / mister). */
export interface FamilyApp {
  /** Identifiant = nom du dépôt GitHub (ex. `miss-dice`). */
  id: string;
  /** Nom d'affichage (ex. `Miss Dice`). */
  name: string;
  /** Description courte, une phrase. */
  description: string;
  /** Maturité éditoriale, OBLIGATOIRE. */
  maturity: Maturity;
  /** URL du dépôt GitHub. */
  repoUrl: string;
  /** URL publique de l'app (GitHub Pages, ou dépôt pour une app desktop). */
  appUrl: string;
  /** Icône de l'app ; `null` si aucune (ex. app desktop). */
  iconUrl: string | null;
  /** Couleur de thème optionnelle (pour accentuer les cartes). */
  themeColor?: string;
}

/** Propriétaire GitHub de la famille. */
export declare const GITHUB_OWNER: string;

/** Lien sponsor commun à toute la famille (Buy Me a Coffee). */
export declare const SPONSOR_URL: string;

/** URL du dépôt GitHub d'une app à partir de son id. */
export declare function repoUrl(id: string): string;

/** URL GitHub Pages d'une app à partir de son id (base path inclus). */
export declare function pagesUrl(id: string): string;

/** Famille d'applications grand public (hors librairie et monorepo Tauri). */
export declare const FAMILY_APPS: FamilyApp[];

/** Les apps de la famille SAUF celle d'id `currentId` (ordre préservé). */
export declare function otherApps(currentId: string): FamilyApp[];
