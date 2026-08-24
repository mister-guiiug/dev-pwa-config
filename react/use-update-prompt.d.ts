import type { ApplyUpdateOptions, ApplyUpdateResult } from '../sw-update.js';

/** Signature de `registerSW`, exportée par `virtual:pwa-register`. */
export type RegisterSW = (options?: {
  immediate?: boolean;
  onNeedRefresh?: () => void;
  onOfflineReady?: () => void;
  onRegisteredSW?: (
    swUrl: string,
    registration?: ServiceWorkerRegistration
  ) => void;
  onRegisterError?: (error: unknown) => void;
}) => (reloadPage?: boolean) => Promise<void>;

export interface UseUpdatePromptOptions {
  /**
   * `registerSW` de `virtual:pwa-register`. Sans lui, `needRefresh` reste faux
   * mais `update()` et `forceUpdate()` restent utilisables.
   */
  registerSW?: RegisterSW;
  /** Si > 0, le bandeau peut être reporté de N heures via `snooze()`. */
  snoozeHours?: number;
  /** Clé localStorage du report (défaut `dwc_sw_update_snoozed_until`). */
  snoozeKey?: string;
  /** Transmis à `applyUpdate` (plafonds, purge sélective, destination). */
  updateOptions?: ApplyUpdateOptions;
}

export interface UseUpdatePrompt {
  needRefresh: boolean;
  offlineReady: boolean;
  /** `needRefresh`, moins ce qui a été écarté ou reporté. */
  visible: boolean;
  /** Vrai pendant l'application d'une mise à jour. */
  updating: boolean;
  /** Active le worker en attente, purge en dernier recours, puis recharge. */
  update: () => Promise<ApplyUpdateResult>;
  /** Purge d'emblée : le bouton « Forcer la mise à jour » des réglages. */
  forceUpdate: () => Promise<ApplyUpdateResult>;
  /** Masque le bandeau pour cette session. */
  dismiss: () => void;
  /** Reporte de `snoozeHours` (ou masque si le report est désactivé). */
  snooze: () => void;
}

/** Mise à jour du service worker : état du bandeau, report, application. */
export declare function useUpdatePrompt(
  options?: UseUpdatePromptOptions
): UseUpdatePrompt;
