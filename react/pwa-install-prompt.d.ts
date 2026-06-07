import type { FC } from 'react';

export interface PwaInstallPromptProps {
  /** Stockage du refus (défaut `local`). `session` = re-proposé à chaque session. */
  storage?: 'local' | 'session';
  /** Clé de stockage du refus (défaut `dwc_pwa_install_dismissed`). */
  dismissKey?: string;
  title?: string;
  description?: string;
  installLabel?: string;
  dismissLabel?: string;
  className?: string;
}

/** Bandeau « Installer l'application » (non stylé, cibler `[data-dwc]`). */
export declare const PwaInstallPrompt: FC<PwaInstallPromptProps>;
