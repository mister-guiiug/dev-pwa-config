import type { ElementType, FC, HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  /** Élément rendu : `div` par défaut ; `article`, `section`, `a`, `li`… */
  as?: ElementType;
  /**
   * `false` pour un contenu qui touche les bords (image, liste). Pose
   * `data-padding="none"`.
   */
  padding?: boolean;
  children?: ReactNode;
}

/**
 * `title` est RETIRÉ des attributs HTML puis redéclaré : celui du DOM est une
 * infobulle en chaîne, celui-ci est le titre rendu, et peut porter un nœud.
 */
export interface CardHeaderProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** Rendu dans un vrai titre — `h3` par défaut, `as` pour le niveau. */
  title: ReactNode;
  subtitle?: ReactNode;
  /** Action à droite (un bouton, un lien) : c'est LÀ que va le clic. */
  action?: ReactNode;
  /** Niveau du titre : `h2`, `h3`, `h4`. */
  as?: ElementType;
}

/**
 * Surface d'une carte — dix apps en avaient une, aucune du paquet. Non
 * stylée : cibler `[data-dwc="card"]`, ou importer `components.css`.
 */
export declare const Card: FC<CardProps>;

/** En-tête de carte : titre (vrai `hN`), sous-titre, action à droite. */
export declare const CardHeader: FC<CardHeaderProps>;
