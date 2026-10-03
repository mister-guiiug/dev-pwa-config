import type { ElementType, ReactNode } from 'react';
import type { BottomNavItem } from './bottom-nav';

export type AppShellProps = {
  title?: ReactNode;
  /** Rangée droite de l'en-tête. `undefined` → `<ThemeToggle />` ; `null` → rien. */
  actions?: ReactNode | null;
  backHref?: string;
  onBack?: () => void;
  linkComponent?: ElementType;
  hrefProp?: string;
  navItems?: BottomNavItem[];
  /**
   * Chemin courant, RELATIF AU ROUTEUR (`useLocation().pathname`), transmis
   * au `currentPath` de `BottomNav`. Obligatoire dès que le routeur a un
   * `basename` : sans lui, aucun onglet n'est actif une fois déployé.
   */
  navCurrentPath?: string;
  navPlacement?: 'static' | 'fixed';
  navLabel?: string;
  width?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  reserve?: 'bottom-nav';
  skipHref?: string;
  skipLabel?: string;
  mainId?: string;
  /** Sous l'en-tête, hors du `main` (ex. `ConnectionBanner`). */
  beforeMain?: ReactNode;
  /** Dans le `main`, après les enfants (ex. `ConsentBanner`). */
  afterMain?: ReactNode;
  /** Sous la rangée titre de l'en-tête. */
  headerChildren?: ReactNode;
  className?: string;
  children?: ReactNode;
};

export declare function AppShell(props?: AppShellProps): React.JSX.Element;
