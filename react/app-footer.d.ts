import type { FC } from 'react';
import type { AppVersionProps } from './app-version.js';

export interface AppFooterProps {
  /** URL du dépôt GitHub. Si absent, le lien source n'est pas rendu. */
  repoUrl?: string;
  /** URL sponsor (défaut Buy Me a Coffee famille `mister.guiiug`). */
  sponsorUrl?: string;
  sourceLabel?: string;
  sponsorLabel?: string;
  className?: string;
  /**
   * Affiche le numéro de version sous les liens. `true` pour les réglages par
   * défaut (le `repoUrl` du pied de page sert de lien vers la release), ou les
   * options d'`AppVersion`.
   */
  version?: boolean | AppVersionProps;
}

/** Footer famille : lien code source (GitHub) + lien sponsor (café). */
export declare const AppFooter: FC<AppFooterProps>;
