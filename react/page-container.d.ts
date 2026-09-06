import type { ElementType, FC, HTMLAttributes, ReactNode } from 'react';

export type PageWidth = 'sm' | 'md' | 'lg' | 'xl' | 'full';

export interface PageContainerProps extends HTMLAttributes<HTMLElement> {
  /** `div` par défaut ; `main` quand il est la région principale. */
  as?: ElementType;
  /** Palier de largeur : `sm` 28 rem, `md` 36, `lg` 48, `xl` 64, `full`. */
  width?: PageWidth;
  /** `false` : aucune marge — la vue gère les siennes. */
  padding?: boolean;
  /**
   * `bottom-nav` réserve, en bas, la place d'une `<BottomNav placement="fixed">` :
   * sans elle, le dernier élément de la vue passe sous la barre. Prime sur
   * `padding={false}`.
   */
  reserve?: 'bottom-nav';
  children?: ReactNode;
}

/**
 * Conteneur de vue : centré, borné à un palier de largeur, zones sûres iOS
 * comprises. Non stylé : cibler `[data-dwc="page-container"]`.
 */
export declare const PageContainer: FC<PageContainerProps>;
