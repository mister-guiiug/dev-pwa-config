import type { FC, ReactNode } from 'react';

export interface ConnectionBannerProps {
  /** Défaut « Hors ligne — reconnexion… ». */
  label?: ReactNode;
  /** Hors ligne continu avant affichage (défaut 1500 ms). */
  delayMs?: number;
  /** Remplace `navigator.onLine` (connectivité applicative). */
  online?: boolean;
  className?: string;
}

/**
 * Bandeau « hors ligne » débouncé (`role="status"`). Non stylé : cibler
 * `[data-dwc="connection-banner"]`.
 */
export declare const ConnectionBanner: FC<ConnectionBannerProps>;
