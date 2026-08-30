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
  /**
   * Référence à citer au support, rendue sous le message
   * (`[data-dwc="error-boundary-reference"]`). Absente par défaut :
   * `ObservabilityBoundary` la renseigne seule avec l'identifiant de
   * corrélation de la session.
   */
  reference?: string;
  /** Ce qui précède la référence. Défaut : « Référence à communiquer ». */
  referenceLabel?: string;
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

/**
 * `reference` est RETIRÉE de la base puis redéclarée : ici, `false` est une
 * valeur légitime — elle n'existe pas sur `ErrorBoundary`, qui reçoit soit une
 * chaîne, soit rien.
 */
export interface ObservabilityBoundaryProps
  extends Omit<ErrorBoundaryProps, 'reference'> {
  /** Contexte ajouté à l'entrée du journal ; masqué avant écriture. */
  context?: Record<string, unknown>;
  /**
   * La référence affichée dans l'écran de secours, et jointe à l'erreur
   * enregistrée sous `correlationId`. Par défaut l'identifiant de session de
   * `/correlation` : l'utilisateur cite alors exactement ce que porte la trace
   * collectée. Une chaîne le remplace, `false` retire l'affichage.
   */
  reference?: string | false;
}

/**
 * `ErrorBoundary` déjà branchée sur `recordError` — le câblage que neuf apps
 * réécrivent, et que deux oublient.
 */
export declare const ObservabilityBoundary: FC<ObservabilityBoundaryProps>;
