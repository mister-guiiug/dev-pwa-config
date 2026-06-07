import type { FC } from 'react';

export interface UpdatePromptBannerProps {
  /** Si > 0, le bouton secondaire reporte la MAJ de N heures (snooze). */
  snoozeHours?: number;
  title?: string;
  updateLabel?: string;
  snoozeLabel?: string;
  dismissLabel?: string;
  className?: string;
}

/** Bandeau MAJ service worker prêt à l'emploi (couplé vite-plugin-pwa). */
export declare const UpdatePromptBanner: FC<UpdatePromptBannerProps>;
