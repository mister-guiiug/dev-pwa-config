/** Niveau de maturité éditorial d'une application (saisi à la main). */
export type Maturity = 'alpha' | 'beta' | 'stable';

/** Domaine d'usage (éditorial). Identifiant ASCII stable, libellé côté UI. */
export type Category =
  | 'sante'
  | 'sport'
  | 'jeux'
  | 'education'
  | 'loisirs'
  | 'outils'
  | 'dev';

/** Famille de persistance, relevée dans le code de l'application. */
export type Backend = 'supabase' | 'firebase' | 'local' | 'api';

/** Plateforme de livraison. */
export type Platform = 'web' | 'desktop';

/** Champs du catalogue sur lesquels on sait compter et filtrer. */
export type FacetKey = 'maturity' | 'category' | 'backend' | 'platform';

/** Critères de `filterApps` : chaque critère absent n'exclut rien. */
export interface AppFilter {
  /** Mots cherchés dans l'id, le nom et la description (sans diacritiques). */
  query?: string;
  maturity?: Maturity | Maturity[];
  category?: Category | Category[];
  backend?: Backend | Backend[];
  platform?: Platform | Platform[];
  /** Un dépôt correspond dès qu'il consomme L'UN de ces sous-chemins. */
  config?: string | string[];
}

/** Ordre de tri accepté par `sortApps`. */
export type SortBy = 'curated' | 'maturity' | 'name';

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
  /** Domaine d'usage éditorial. */
  category?: Category;
  /** Persistance relevée ; absente quand elle ne l'a pas été. */
  backend?: Backend;
  /** Plateforme de livraison (défaut `web`). */
  platform: Platform;
  /**
   * Sous-chemins du paquet réellement importés par le dépôt, relevés dans son
   * code source. Tableau VIDE pour un dépôt qui ne consomme pas le paquet.
   */
  configs: string[];
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

/** Maturités éditoriales, de la plus jeune à la plus mûre. */
export declare const MATURITIES: Maturity[];

/** Rang d'une maturité — sert au tri, pas à l'affichage. */
export declare const MATURITY_ORDER: Record<Maturity, number>;

/** Domaines d'usage connus. */
export declare const CATEGORIES: Category[];

/** Familles de persistance connues. */
export declare const BACKENDS: Backend[];

/** Plateformes de livraison connues. */
export declare const PLATFORMS: Platform[];

/** Tous les sous-chemins consommés au moins une fois par la famille, triés. */
export declare const CONFIG_SUBPATHS: string[];

/** URL du dépôt GitHub d'une app à partir de son id. */
export declare function repoUrl(id: string): string;

/** URL GitHub Pages d'une app à partir de son id (base path inclus). */
export declare function pagesUrl(id: string): string;

/** Famille d'applications grand public (hors librairie et monorepo Tauri). */
export declare const FAMILY_APPS: FamilyApp[];

/** Les apps de la famille SAUF celle d'id `currentId` (ordre préservé). */
export declare function otherApps(currentId: string): FamilyApp[];

/** Une app par son id, ou `undefined`. */
export declare function appById(id: string): FamilyApp | undefined;

/** Trie sans muter : ordre du catalogue, par maturité, ou par nom. */
export declare function sortApps(apps: FamilyApp[], by?: SortBy): FamilyApp[];

/** Filtre le catalogue ; un critère absent n'exclut rien. */
export declare function filterApps(
  criteria?: AppFilter,
  apps?: FamilyApp[]
): FamilyApp[];

/** Compte par valeur de facette ; la clé `''` regroupe les valeurs absentes. */
export declare function countBy(
  key: FacetKey,
  apps?: FamilyApp[]
): Record<string, number>;

/** Taux d'adoption par sous-chemin : un dépôt n'est compté qu'une fois. */
export declare function countByConfig(
  apps?: FamilyApp[]
): Record<string, number>;
