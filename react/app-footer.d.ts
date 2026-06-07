import type { FC } from 'react';

export interface AppFooterProps {
  /** URL du dépôt GitHub. Si absent, le lien source n'est pas rendu. */
  repoUrl?: string;
  /** URL sponsor (défaut Buy Me a Coffee famille `mister.guiiug`). */
  sponsorUrl?: string;
  sourceLabel?: string;
  sponsorLabel?: string;
  className?: string;
}

/** Footer famille : lien code source (GitHub) + lien sponsor (café). */
export declare const AppFooter: FC<AppFooterProps>;
