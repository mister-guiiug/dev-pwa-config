import type { FC } from 'react';
import type { ShareData, ShareResult } from '../share.js';

export interface ShareButtonProps extends ShareData {
  /** Libellé du bouton (défaut : « Partager »). */
  label?: string;
  /** Message après une copie (défaut : « Lien copié »). */
  copiedLabel?: string;
  /** Message après un échec (défaut : « Partage impossible »). */
  failedLabel?: string;
  /**
   * Délai avant le retour à l'état initial, en millisecondes (défaut 2500).
   * `0` garde le message affiché — à réserver aux écrans qui le retirent
   * eux-mêmes.
   */
  resetAfterMs?: number;
  className?: string;
  /** Reçoit le résultat RÉEL, annulation comprise. */
  onResult?: (result: ShareResult) => void;
  /** Injectable en test ; `shareOrCopy` par défaut. */
  share?: (data?: ShareData) => Promise<ShareResult>;
}

/**
 * Bouton « Partager » : partage natif, repli presse-papiers, retour annoncé.
 * Une annulation n'affiche rien — ce n'est pas un échec.
 */
export declare const ShareButton: FC<ShareButtonProps>;
