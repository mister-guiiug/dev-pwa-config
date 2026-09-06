import type { FC, ReactNode } from 'react';

/**
 * Le ton sémantique. `danger` est le mot de la famille — celui de `Badge` —
 * et `error` son ancien nom, conservé : les apps le passent, et leurs
 * feuilles de style ciblent `[data-tone='error']`. Les deux rendent le même
 * trait. Écrire `danger` dans du code neuf.
 */
export type ToastTone = 'info' | 'success' | 'danger' | 'error';

export interface ToastOptions {
  tone?: ToastTone;
  /**
   * Millisecondes avant effacement ; `0` = permanent. Par défaut celle du
   * fournisseur, sauf pour `tone: 'error'`, permanente.
   */
  duration?: number;
  /** Identifiant stable : une seconde notification du même id remplace la première. */
  id?: string;
}

export interface ToastItem {
  id: string;
  message: ReactNode;
  tone?: ToastTone;
}

export interface ToastApi {
  /** Empile une notification et rend son identifiant. */
  show: (message: ReactNode, options?: ToastOptions) => string | null;
  success: (message: ReactNode, options?: ToastOptions) => string | null;
  error: (message: ReactNode, options?: ToastOptions) => string | null;
  info: (message: ReactNode, options?: ToastOptions) => string | null;
  dismiss: (id: string) => void;
  clear: () => void;
}

export interface ToastProviderProps {
  children?: ReactNode;
  /** Durée par défaut, en millisecondes (5000). */
  duration?: number;
  /** Taille maximale de la pile ; au-delà, le plus ancien cède (4). */
  max?: number;
  className?: string;
}

/** Fournisseur : file, minuteries suspendables, zone d'affichage. */
export declare const ToastProvider: FC<ToastProviderProps>;

export interface ToastViewportProps {
  toasts?: ToastItem[];
  onDismiss?: (id: string) => void;
  /** Appelé au survol et au focus, pour suspendre les minuteries. */
  onPauseChange?: (paused: boolean) => void;
  className?: string;
}

/** Zone d'affichage seule, pour les apps qui gèrent la file ailleurs. */
export declare const ToastViewport: FC<ToastViewportProps>;

/** API de notification. Hors fournisseur : ne fait rien (et le dit en dev). */
export declare function useToast(): ToastApi;
