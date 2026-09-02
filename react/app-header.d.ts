import type { ElementType, FC, HTMLAttributes, ReactNode } from 'react';

/**
 * `title` est RETIRÉ des attributs HTML puis redéclaré : celui du DOM est une
 * infobulle en chaîne, celui-ci est le titre de la page, et peut porter un
 * nœud.
 */
export interface AppHeaderProps
  extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Le titre de la page — rendu dans un `h1` (`as` pour un autre niveau). */
  title?: ReactNode;
  as?: ElementType;
  /** Avant le titre : un logo, une marque. */
  leading?: ReactNode;
  /** Après le titre, à droite : bascule de thème, cloche, réglages… */
  actions?: ReactNode;
  /**
   * Destination du retour : rend un LIEN par `linkComponent`. Exclusif avec
   * `onBack`, qui rend un bouton.
   */
  backHref?: string;
  onBack?: () => void;
  /** Nom accessible du retour. Défaut : « Retour » dans la langue du contexte. */
  backLabel?: string;
  /** `Link` de react-router avec `hrefProp="to"` — jamais `NavLink`. */
  linkComponent?: ElementType;
  hrefProp?: string;
  /** Collant en haut de l'écran (défaut `true`). */
  sticky?: boolean;
  /** Rendu SOUS la rangée du titre : une accroche, un guide, un bandeau. */
  children?: ReactNode;
}

/**
 * En-tête d'application : titre, retour, actions — la mise en page que neuf
 * apps écrivaient chacune. Non stylé : cibler `[data-dwc="app-header"]`.
 */
export declare const AppHeader: FC<AppHeaderProps>;
