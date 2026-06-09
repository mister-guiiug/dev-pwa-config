import type { Component, ErrorInfo, ReactNode } from 'react';

export interface ErrorBoundaryProps {
  children?: ReactNode;
  /** ReactNode statique, ou render-prop `(error, reset) => ReactNode`. */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Branchez ici le reporting (recordError / Sentry). */
  onError?: (error: Error, info: ErrorInfo) => void;
  onReset?: () => void;
  /** Si fourni, un bouton « Télécharger une sauvegarde » est rendu. */
  onDownloadBackup?: () => void;
  title?: string;
  resetLabel?: string;
  backupLabel?: string;
}

export interface ErrorBoundaryState {
  error: Error | null;
}

/** ErrorBoundary générique, non couplé à un reporter (anti écran blanc). */
export declare class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  reset(): void;
}
