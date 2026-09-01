import type { ComponentType, FC, ReactNode } from 'react';

export interface BottomNavItem {
  /** Clé de rendu ; `href` par défaut. */
  key?: string;
  href: string;
  label: string;
  icon?: ReactNode;
  /** Compte affiché en pastille ; doublé d'un texte lu. */
  badge?: number;
  /** Ce que le lecteur d'écran entend de la pastille (« 3 non lues »). */
  badgeLabel?: string;
  /** Correspondance exacte du chemin (implicite pour `/`). */
  end?: boolean;
  /**
   * Habillage de CET élément. `key` ne descend pas dans le DOM, et un sélecteur
   * sur le `href` ne tient pas quand les chemins sont traduits : c'est la seule
   * accroche pour distinguer un bouton d'action d'un onglet ordinaire.
   */
  className?: string;
}

export interface BottomNavProps {
  items?: BottomNavItem[];
  /** Chemin courant ; `location.pathname` par défaut. */
  currentPath?: string;
  /** Nom du repère de navigation ; le dictionnaire sinon. */
  label?: string;
  /** Au-delà, les destinations restantes passent sous un bouton « Plus » (5). */
  maxVisible?: number;
  moreLabel?: string;
  /**
   * `'a'` par défaut ; passer `Link` de react-router avec `hrefProp="to"`.
   *
   * `ComponentType<any>` ET NON `ComponentType<Record<string, unknown>>` : le
   * second refuse tout composant à prop OBLIGATOIRE, donc précisément `Link`
   * et son `to` — l'usage que cette ligne documente. Cinq apps portaient la
   * même conversion, avec le même commentaire : « c'est l'usage documenté du
   * socle ». Un type qui interdit ce que sa propre documentation recommande
   * est un défaut du type, pas des cinq apps.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- voir ci-dessus
  linkComponent?: string | ComponentType<any>;
  hrefProp?: string;
  onNavigate?: (item: BottomNavItem) => void;
  className?: string;
  /**
   * Emplacement libre en fin de barre, DANS le repère `<nav>` : une cellule qui
   * n'est pas une destination — bouton de tiroir, action d'urgence. Le bouton
   * « Plus » interne reste réservé aux `items` en surnombre.
   */
  trailing?: ReactNode;
}

/** Barre de navigation basse, agnostique de routeur. */
export declare const BottomNav: FC<BottomNavProps>;
