import type { FC, ReactNode } from 'react';
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
   * Rendu EN PREMIER, avant les liens — la seule position qu'aucune autre prop
   * n'atteint. Pour un avertissement, une mention légale, une note.
   */
  children?: ReactNode;
  /**
   * Liens de l'app, rendus avec ceux du socle. C'est ici que passe un `Link`
   * de routeur : ce composant ne dépend d'aucun routeur et ne peut pas en
   * fabriquer un, mais il peut en accueillir.
   */
  links?: ReactNode;
  /**
   * Rendu EN DERNIER, sous les liens et le numéro. Pour ce que `version` ne
   * sait pas rendre — un identifiant de déploiement qui porte des métadonnées
   * de build, une mention légale, une date.
   */
  after?: ReactNode;
  /**
   * Affiche le numéro de version sous les liens. `true` pour les réglages par
   * défaut (le `repoUrl` du pied de page sert de lien vers la release), ou les
   * options d'`AppVersion`.
   */
  version?: boolean | AppVersionProps;
}

/** Footer famille : lien code source (GitHub) + lien sponsor (café). */
export declare const AppFooter: FC<AppFooterProps>;
