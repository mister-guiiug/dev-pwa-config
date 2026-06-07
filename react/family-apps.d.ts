import type { FC } from 'react';
import type { FamilyApp, Maturity } from '../apps-catalog';

export interface FamilyAppsLabels {
  /** Libellé du lien code source (défaut : « Code source »). */
  source?: string;
  /** Libellé du lien sponsor (défaut : « M’offrir un café »). */
  sponsor?: string;
  /** Titre de la grille (défaut : « Nos autres applications »). */
  otherApps?: string;
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
  /** URL sponsor (défaut : `SPONSOR_URL`). */
  sponsorUrl?: string;
  /** Afficher le lien code source (défaut : `!!repoUrl`). */
  showSource?: boolean;
  /** Afficher le lien sponsor (défaut : `true`). */
  showSponsor?: boolean;
  /** Libellés (i18n). */
  labels?: FamilyAppsLabels;
  className?: string;
}

/**
 * Met en avant le code source (GitHub), le sponsor (Buy Me a Coffee) et les
 * autres applications de la famille avec leur badge de maturité.
 */
export declare const FamilyApps: FC<FamilyAppsProps>;
