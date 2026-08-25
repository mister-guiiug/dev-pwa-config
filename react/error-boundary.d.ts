import type { Component, ErrorInfo, FC, ReactNode } from 'react';

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

export interface ObservabilityBoundaryProps extends ErrorBoundaryProps {
  /** Contexte ajouté à l'entrée du journal ; masqué avant écriture. */
  context?: Record<string, unknown>;
}

/**
 * `ErrorBoundary` déjà branchée sur `recordError` — le câblage que neuf apps
 * réécrivent, et que deux oublient.
 */
export declare const ObservabilityBoundary: FC<ObservabilityBoundaryProps>;
