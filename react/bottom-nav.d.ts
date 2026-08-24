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
  /** `'a'` par défaut ; passer `Link` de react-router avec `hrefProp="to"`. */
  linkComponent?: string | ComponentType<Record<string, unknown>>;
  hrefProp?: string;
  onNavigate?: (item: BottomNavItem) => void;
  className?: string;
}

/** Barre de navigation basse, agnostique de routeur. */
export declare const BottomNav: FC<BottomNavProps>;
