import type { FC, ReactNode } from 'react';

export interface SheetProps {
  open: boolean;
  /** Sert de `aria-label` au dialogue et de titre visible. */
  title: string;
  onClose: () => void;
  /** Libellé accessible du bouton de fermeture. */
  closeLabel?: string;
  children?: ReactNode;
  /**
   * Barre d'actions épinglée en bas : reste visible pendant que le corps
   * défile. Sur un formulaire long, sans elle le bouton de validation sort de
   * l'écran — miss-uwh la passe dans 15 de ses 23 feuilles.
   */
  footer?: ReactNode;
  className?: string;
}

/**
 * Feuille modale accessible : `role="dialog"` + `aria-modal`, fermeture par
 * Échap et par le fond, piège de focus, focus restitué à la fermeture, scroll
 * de fond verrouillé (non stylée, cibler `[data-dwc="sheet"]`).
 */
export declare const Sheet: FC<SheetProps>;
