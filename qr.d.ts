/**
 * Options de rendu, passées telles quelles à `qrcode`
 * (`toDataURL`/`toString`). `loader` sert aux tests et aux bundlers qui
 * exigent un import statiquement analysable.
 */
export interface QrOptions {
  /** Largeur du rendu en pixels (défaut `qrcode` : échelle 4). */
  width?: number;
  /** Marge autour du motif, en modules (défaut `qrcode` : 4). */
  margin?: number;
  scale?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  color?: { dark?: string; light?: string };
  loader?: () => Promise<unknown>;
}

/**
 * QR en data-URL PNG — à poser dans un `<img src>`. Rejette avec une erreur
 * explicite si la peer optionnelle `qrcode` est absente.
 */
export declare function qrToDataUrl(
  text: string,
  options?: QrOptions
): Promise<string>;

/**
 * QR en balisage SVG — net à toute échelle (impression, zoom). Rejette avec
 * une erreur explicite si la peer optionnelle `qrcode` est absente.
 */
export declare function qrToSvg(
  text: string,
  options?: QrOptions
): Promise<string>;
