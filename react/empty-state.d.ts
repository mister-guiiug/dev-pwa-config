import type { FC, ReactNode } from 'react';

export interface EmptyStateProps {
  icon?: ReactNode;
  title?: string;
  description?: string;
  /** CTA contextuel (bouton/lien). */
  action?: ReactNode;
  className?: string;
}

/** État vide avec action suivante (non stylé, cibler `[data-dwc]`). */
export declare const EmptyState: FC<EmptyStateProps>;
