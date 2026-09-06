import type { FC, ReactNode } from 'react';
import type { InstallCadence } from '../install.js';

export interface PwaInstallPromptProps {
  /** Où vit la cadence (défaut `local`). `session` = repart à chaque session. */
  storage?: 'local' | 'session';
  /**
   * L'ANCIENNE clé booléenne du refus (défaut `dwc_pwa_install_dismissed`),
   * conservée pour la migration : un refus écrit avant la 4.6 vaut un report
   * d'une période, pas un silence définitif. La cadence, elle, vit sous
   * `storageKey`.
   */
  dismissKey?: string;
  /** Clé de la cadence (défaut `dwc_pwa_install`). */
  storageKey?: string;
  /**
   * Quand reproposer. Défaut : au premier lancement, puis tous les 30 jours,
   * 3 fois en tout. `false` : aucune cadence — le bandeau paraît dès qu'une
   * installation est possible, ce que veut un écran de réglages.
   */
  cadence?: Partial<InstallCadence> | false;
  title?: ReactNode;
  /**
   * Remplace la description. Par défaut, le bandeau dit l'intérêt de
   * l'installation là où elle est automatique, et la MARCHE À SUIVRE là où
   * elle ne l'est pas (iOS, Safari) : la remplacer perd cette distinction.
   */
  description?: string;
  installLabel?: string;
  dismissLabel?: string;
  className?: string;
}

/**
 * Bandeau « Installer l'application » (non stylé au-delà de `components.css`,
 * cibler `[data-dwc]`). Porte `data-method` (`prompt` / `instructions`) et
 * `data-platform` (`ios`, `safari`, `generic`…) pour l'habillage.
 */
export declare const PwaInstallPrompt: FC<PwaInstallPromptProps>;
