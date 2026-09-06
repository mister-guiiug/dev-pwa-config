import type { FC, ReactNode } from 'react';

export interface ErrorBannerProps {
  message?: ReactNode;
  /**
   * Le ton sémantique — le mot de la famille, celui de `Badge`.
   * `danger` = permanent, `warning` = temporaire, `info`.
   */
  tone?: 'danger' | 'warning' | 'info';
  /**
   * @deprecated Ancien nom de `tone`. Il continue de fonctionner et reste
   * l'attribut RENDU (`data-severity`) : les feuilles de style des apps le
   * ciblent. `tone` est le mot à écrire dans du code neuf.
   */
  severity?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  retryLabel?: string;
  onDismiss?: () => void;
  className?: string;
}

/** Bandeau d'erreur récupérable (Réessayer + fermer), non stylé. */
export declare const ErrorBanner: FC<ErrorBannerProps>;
