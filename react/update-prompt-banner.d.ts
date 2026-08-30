import type { FC } from 'react';
import type { ApplyUpdateOptions } from '../sw-update.js';
import type { RegisterSW } from './use-update-prompt.js';

export interface UpdatePromptBannerProps {
  /** `registerSW` de `virtual:pwa-register` ; sans lui le bandeau ne s'affiche jamais. */
  registerSW?: RegisterSW;
  /** Si > 0, le bouton secondaire reporte la mise à jour de N heures. */
  snoozeHours?: number;
  /**
   * Clé localStorage du report (défaut `dwc_sw_update_snoozed_until`). À
   * renseigner pour reprendre le report d'une bannière écrite à la main, sans
   * quoi la migration oublie tout report en cours.
   */
  snoozeKey?: string;
  /** L'enregistrement du service worker a échoué : une panne qui, sinon, est muette. */
  onRegisterError?: (error: unknown) => void;
  /** Le service worker est enregistré ; `registration` sert à le revérifier. */
  onRegisteredSW?: (
    swUrl: string,
    registration?: ServiceWorkerRegistration
  ) => void;
  /** Forme historique de `onRegisteredSW`, sans l'URL du script. */
  onRegistered?: (registration?: ServiceWorkerRegistration) => void;
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
