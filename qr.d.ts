/**
 * Options de rendu. Le VOCABULAIRE est celui de `qrcode`, que trois
 * applications employaient déjà ; `qr.js` le traduit vers celui d'`uqr`, la
 * peer optionnelle qui rend réellement le code depuis la 4.16.0.
 *
 * LES DÉFAUTS, EUX, SONT CEUX D'`uqr` — et ce ne sont pas ceux de `qrcode`.
 * Une option absente n'est pas transmise, donc `uqr` applique le sien. Deux
 * écarts se voient à l'œil ou au scanner, et sont donc nommés ci-dessous.
 *
 * `loader` sert aux tests et aux bundlers qui exigent un import
 * statiquement analysable.
 */
export interface QrOptions {
  /**
   * Largeur du rendu en pixels. Sans équivalent chez `uqr`, qui raisonne en
   * pixels par module : elle est posée après coup sur la racine du SVG.
   * Absente, le SVG n'a qu'un `viewBox` et s'étire à son conteneur — ce qui
   * convient à un rendu inline, mais laisse un `<img>` sans taille.
   */
  width?: number;
  /**
   * Marge autour du motif, en modules. **Défaut `uqr` : 1**, là où `qrcode`
   * en posait 4. La norme recommande 4 : passer la valeur explicitement quand
   * le code doit être scanné depuis un écran ou une impression chargée.
   */
  margin?: number;
  /** Pixels par module (`pixelSize` chez `uqr`). Défaut : 10. */
  scale?: number;
  /**
   * Robustesse au salissement et à l'occultation. **Défaut `uqr` : `'L'`**
   * (7 % de perte tolérée), là où `qrcode` retenait `'M'` (15 %).
   */
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  /** Couleurs des modules (`blackColor` / `whiteColor` chez `uqr`). */
  color?: { dark?: string; light?: string };
  loader?: () => Promise<unknown>;
}

/**
 * QR en data-URL **SVG** — à poser dans un `<img src>`, où elle s'affiche
 * comme une PNG et reste nette à toute échelle.
 *
 * Ce n'était pas toujours du SVG : jusqu'à la 4.16.0, cette fonction rendait
 * une data-URL PNG. Qui attend des octets d'image — un `fetch` suivi d'un
 * `toBlob`, un envoi vers un serveur — doit en tenir compte. La contrepartie
 * du vecteur est la longueur : la data-URL est deux à trois fois plus longue
 * qu'en PNG.
 *
 * Rejette avec une erreur explicite si la peer optionnelle `uqr` est absente.
 */
export declare function qrToDataUrl(
  text: string,
  options?: QrOptions
): Promise<string>;

/**
 * QR en balisage SVG — net à toute échelle (impression, zoom). Rejette avec
 * une erreur explicite si la peer optionnelle `uqr` est absente.
 */
export declare function qrToSvg(
  text: string,
  options?: QrOptions
): Promise<string>;
