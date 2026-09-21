import type { FC } from 'react';
import type { FamilyApp, Maturity, SortBy } from '../apps-catalog';

export interface FamilyAppsLabels {
  /** Libellé du lien code source (défaut : « Code source »). */
  source?: string;
  /** Libellé du lien sponsor (défaut : « M’offrir un café »). */
  sponsor?: string;
  /** Titre de la grille (défaut : « Nos autres applications »). */
  otherApps?: string;
  /**
   * Libellé accessible du lien dépôt par carte. `{app}` est remplacé par le
   * nom de l'application (défaut : « Code source de {app} »).
   */
  repo?: string;
  /** Libellés des badges de maturité (défaut : Alpha / Bêta / Stable). */
  maturity?: Partial<Record<Maturity, string>>;
}

export interface FamilyAppsProps {
  /** Id de l'app courante : retirée de la grille. */
  currentAppId: string;
  /** Liste à présenter (défaut : `FAMILY_APPS`). */
  apps?: FamilyApp[];
  /** URL du dépôt de l'app courante ; si fourni, affiche la carte « Code source ». */
  repoUrl?: string;
  /**
   * URL sponsor. Absente, `SponsorProvider` répond, puis `SPONSOR_URL`.
   * `null` retire le lien.
   */
  sponsorUrl?: string | null;
  /** Afficher le lien code source (défaut : `!!repoUrl`). */
  showSource?: boolean;
  /** Afficher le lien sponsor (défaut : `true`). */
  showSponsor?: boolean;
  /**
   * Ajouter à chaque carte un lien discret vers son dépôt GitHub
   * (défaut : `false`). La carte reste un lien vers l'application ; le lien
   * dépôt est un frère dans le `<li>`, jamais une ancre imbriquée.
   */
  showRepoLinks?: boolean;
  /** Ordre d'affichage (défaut : `curated`, l'ordre du catalogue). */
  sort?: SortBy;
  /**
   * Regroupe les cartes en `<details>` repliables, un par valeur de la
   * facette, dans l'ordre du catalogue. Absent, la grille reste plate.
   *
   * Les groupes naissent DÉPLIÉS, et le repli choisi est retenu (cf.
   * `groupStorageKey`).
   */
  groupBy?: 'category' | 'maturity';
  /**
   * Clé `localStorage` où le repli des groupes est retenu. Défaut
   * `'dwc_family_groups'` — clé FAMILLE, comme `dwc_theme` : les apps
   * partageant une origine, replier un groupe le replie dans toutes, et c'est
   * voulu puisque le catalogue est le même.
   *
   * `null` renonce à la mémoire sans renoncer au regroupement : les groupes
   * s'ouvrent alors à chaque visite.
   */
  groupStorageKey?: string | null;
  /**
   * Disposition des cartes. `'grid'` (défaut) remplit la largeur par colonnes
   * de 16 rem ; `'list'` force une colonne unique — ce que treize apps du parc
   * écrivaient à la main, leur grille vivant dans un tiroir étroit.
   */
  layout?: 'grid' | 'list';
  /**
   * Rendre le `<h3>` de section (défaut : `true`). `false` pour un écran qui
   * annonce déjà « Nos autres applications » : le `aria-label` de la
   * `<section>` porte le titre, il n'est donc pas perdu.
   */
  showTitle?: boolean;
  /** Nombre maximum de cartes, appliqué APRÈS le tri. */
  max?: number;
  /** Libellés (i18n). */
  labels?: FamilyAppsLabels;
  className?: string;
}

/**
 * Met en avant le code source (GitHub), le sponsor (Buy Me a Coffee) et les
 * autres applications de la famille avec leur badge de maturité.
 */
export declare const FamilyApps: FC<FamilyAppsProps>;
