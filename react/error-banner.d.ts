import type { FC, ReactNode } from 'react';

export interface ErrorBannerProps {
  message?: ReactNode;
  /** error = permanent (rouge), warning = temporaire, info. */
  severity?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  retryLabel?: string;
  onDismiss?: () => void;
  className?: string;
}

/** Bandeau d'erreur récupérable (Réessayer + fermer), non stylé. */
export declare const ErrorBanner: FC<ErrorBannerProps>;
