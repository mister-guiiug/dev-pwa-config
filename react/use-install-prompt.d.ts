export interface UseInstallPrompt {
  /** `true` si un prompt d'installation est disponible et l'app non installée. */
  canInstall: boolean;
  /** `true` si l'app tourne en mode standalone (déjà installée). */
  installed: boolean;
  /** Déclenche le prompt natif ; résout l'issue, ou `null` si indisponible. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | null>;
}

/** Capture `beforeinstallprompt` et expose un déclencheur d'installation A2HS. */
export declare function useInstallPrompt(): UseInstallPrompt;
