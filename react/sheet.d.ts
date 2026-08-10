import type { FC, ReactNode } from 'react';

export interface SheetProps {
  open: boolean;
  /** Sert de `aria-label` au dialogue et de titre visible. */
  title: string;
  onClose: () => void;
  /** Libellé accessible du bouton de fermeture. */
  closeLabel?: string;
  children?: ReactNode;
  className?: string;
}

/**
 * Feuille modale accessible : `role="dialog"` + `aria-modal`, fermeture par
 * Échap et par le fond, piège de focus, focus restitué à la fermeture, scroll
 * de fond verrouillé (non stylée, cibler `[data-dwc="sheet"]`).
 */
export declare const Sheet: FC<SheetProps>;
