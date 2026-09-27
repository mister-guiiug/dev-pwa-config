import type { ReactNode } from 'react';
import type { FamilyAppsProps } from './family-apps';
import type { AppFooterProps } from './app-footer';

export type FamilyAboutProps = {
  currentAppId: string;
  repoUrl?: string;
  sponsorUrl?: string | null;
  showInstall?: boolean;
  showRepoLinks?: boolean;
  groupBy?: FamilyAppsProps['groupBy'];
  issues?: AppFooterProps['issues'];
  className?: string;
  /** Intro métier avant la grille (carte titre, tagline…). */
  children?: ReactNode;
};

export declare function FamilyAbout(props: FamilyAboutProps): React.JSX.Element;
