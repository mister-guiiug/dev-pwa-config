import type { FC } from 'react';
import type { ApplyUpdateOptions } from '../sw-update.js';
import type { RegisterSW } from './use-update-prompt.js';

export interface UpdatePromptBannerProps {
  /** `registerSW` de `virtual:pwa-register` ; sans lui le bandeau ne s'affiche jamais. */
  registerSW?: RegisterSW;
  /** Si > 0, le bouton secondaire reporte la mise à jour de N heures. */
  snoozeHours?: number;
  title?: string;
  updateLabel?: string;
  updatingLabel?: string;
  snoozeLabel?: string;
  dismissLabel?: string;
  className?: string;
  updateOptions?: ApplyUpdateOptions;
}

/** Bandeau « Mise à jour disponible », branché sur `useUpdatePrompt`. */
export declare const UpdatePromptBanner: FC<UpdatePromptBannerProps>;
