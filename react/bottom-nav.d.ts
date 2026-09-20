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
  /**
   * Le chargeur du morceau de cette destination — `() => import('./Page')`,
   * LE MÊME thunk que celui passé à `lazy()`, nommé une fois au niveau du
   * module. La barre le tire à l'approche du pointeur, au focus ou au doigt
   * (`prefetch` du socle : une fois, sans jamais dépenser un forfait `saveData`).
   */
  load?: () => Promise<unknown>;
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
   * et son `to` — l'usage que cette ligne documente. SEPT apps portaient la
   * même conversion, avec le même commentaire : « c'est l'usage documenté du
   * socle ». Un type qui interdit ce que sa propre documentation recommande
   * est un défaut du type, pas des sept apps.
   *
   * « Cinq » a été annoncé d'abord — dans le changeset de la 3.32.0 et dans
   * les PR qui l'accompagnaient — sur la foi d'un relevé tronqué par un
   * `head -8` lu sans être vérifié. mister-doc et mister-footcoach
   * manquaient. Le chiffre ne change pas la conclusion ; un compte annoncé se
   * vérifie quand même.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- voir ci-dessus
  linkComponent?: string | ComponentType<any>;
  hrefProp?: string;
  /**
   * La navigation, pilotée par la barre dans SA transition. Passer le
   * `navigate` de react-router : le clic est intercepté (sauf touche de
   * modification ou bouton non gauche), l'entrée cliquée se dit occupée
   * (`aria-busy`, pastille qui tourne) tant que le morceau `lazy` n'est pas
   * arrivé, et une zone vive hors des liens annonce le chargement. Sans cette
   * prop, rien ne change : le lien navigue seul.
   */
  navigate?: (href: string) => void;
  /** Au clic, avant la navigation ; l'évènement permet de le laisser au navigateur. */
  onNavigate?: (
    item: BottomNavItem,
    event?: import('react').MouseEvent<HTMLElement>
  ) => void;
  className?: string;
  /**
   * Emplacement libre en fin de barre, DANS le repère `<nav>` : une cellule qui
   * n'est pas une destination — bouton de tiroir, action d'urgence. Le bouton
   * « Plus » interne reste réservé aux `items` en surnombre.
   */
  trailing?: ReactNode;
  /**
   * `fixed` colle la barre au bas de la fenêtre (`position: fixed`, pleine
   * largeur, au-dessus du contenu) — la règle que huit dépôts recopiaient.
   * Réserver la place qu'elle occupe avec `<PageContainer reserve="bottom-nav">`.
   * Défaut `static` : la barre reste dans le flux, comme avant.
   */
  placement?: 'static' | 'fixed';
}

/** Barre de navigation basse, agnostique de routeur. */
export declare const BottomNav: FC<BottomNavProps>;
