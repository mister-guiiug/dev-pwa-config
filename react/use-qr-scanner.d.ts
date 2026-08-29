import type { RefObject } from 'react';

export interface UseQrScannerOptions {
  /** Appelé à chaque QR décodé, avec le texte brut. */
  onScan?: (data: string) => void;
  /** Peer absente, caméra refusée ou indisponible. */
  onError?: (error: Error) => void;
  /** Caméra préférée — `'environment'` (dorsale, défaut) ou `'user'`. */
  preferredCamera?: 'environment' | 'user' | (string & {});
  /** Surligner la zone de scan et le QR détecté (défaut `true`). */
  highlight?: boolean;
  /** Arrêter la caméra au premier décodage (défaut `true`). */
  stopOnScan?: boolean;
  /**
   * Import injectable de `qr-scanner` (tests, bundlers exigeant un import
   * statique) — défaut : `import('qr-scanner')`, paresseux.
   */
  loader?: () => Promise<unknown>;
}

export interface UseQrScannerResult {
  /** À poser sur la `<video>` rendue quand `scanning` est vrai. */
  videoRef: RefObject<HTMLVideoElement | null>;
  scanning: boolean;
  error: Error | null;
  start: () => void;
  stop: () => void;
}

/**
 * Cycle de vie caméra de la peer optionnelle `qr-scanner` : import paresseux
 * au premier `start()`, câblage dans un effet (la `<video>` n'existe pas
 * encore au clic), arrêt + destruction garantis au nettoyage.
 */
export declare function useQrScanner(
  options?: UseQrScannerOptions
): UseQrScannerResult;
