export interface UseUpdatePromptOptions {
  /** Si > 0, le bandeau peut être reporté de N heures via `snooze()`. */
  snoozeHours?: number;
  /** Clé localStorage du report (défaut `dwc_sw_update_snoozed_until`). */
  snoozeKey?: string;
}

export interface UseUpdatePrompt {
  needRefresh: boolean;
  offlineReady: boolean;
  /** `needRefresh` en tenant compte du report (snooze). */
  visible: boolean;
  /** Applique la mise à jour et recharge. */
  update: () => Promise<void>;
  /** Masque le bandeau pour cette session. */
  dismiss: () => void;
  /** Reporte de `snoozeHours` (ou `dismiss()` si snooze désactivé). */
  snooze: () => void;
}

/** Gestion unifiée de la mise à jour du service worker (vite-plugin-pwa). */
export declare function useUpdatePrompt(
  options?: UseUpdatePromptOptions
): UseUpdatePrompt;
