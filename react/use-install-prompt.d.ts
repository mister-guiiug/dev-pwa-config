import type { InstallCadence, InstallFallback } from '../install.js';

export interface UseInstallPromptOptions {
  /** Défaut : `localStorage`. `sessionStorage` pour ne rien garder. */
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  /** Défaut : `'dwc_pwa_install'`. */
  storageKey?: string;
  /** L'ancienne clé booléenne à migrer, si l'app en avait choisi une. */
  legacyKey?: string;
  /** Quand reproposer. Défaut : au premier lancement, puis tous les 30 j, 3 fois. */
  cadence?: Partial<InstallCadence>;
  /**
   * `false` : ne compte rien et ne décide rien — `shouldPrompt` reste faux.
   * Pour une app qui place l'invite elle-même, dans un écran de réglages.
   */
  enabled?: boolean;
}

export interface UseInstallPrompt {
  /** `true` si une invite NATIVE est disponible et l'app non installée. */
  canInstall: boolean;
  /** `true` si l'app tourne depuis l'installation, ou vient d'être installée. */
  installed: boolean;
  /**
   * La voie ouverte ici et maintenant : `prompt` (invite native prête),
   * `instructions` (le navigateur installe, mais à la main : iOS, Safari),
   * `none` (déjà installée, ou rien de possible).
   */
  method: 'prompt' | 'instructions' | 'none';
  /** Sur quoi choisir le libellé d'instructions. */
  platform: InstallFallback['platform'];
  /**
   * `true` quand la cadence dit de proposer MAINTENANT. Reste vrai pour tout
   * le chargement de page une fois affiché, jusqu'à ce que l'utilisateur
   * tranche : sinon le bandeau disparaîtrait sous les doigts.
   */
  shouldPrompt: boolean;
  /** Déclenche l'invite native ; résout l'issue, ou `null` si indisponible. */
  promptInstall: () => Promise<'accepted' | 'dismissed' | null>;
  /** « Plus tard » : masque et reporte d'une période. */
  snooze: () => void;
  /** « Ne plus proposer » : définitif. */
  dismiss: () => void;
}

/**
 * Capture `beforeinstallprompt`, sait installer là où il n'existe pas (iOS,
 * Safari), et dit quand proposer.
 */
export declare function useInstallPrompt(
  options?: UseInstallPromptOptions
): UseInstallPrompt;
