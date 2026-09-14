/**
 * Options de rendu. Le VOCABULAIRE est celui de `qrcode`, que trois
 * applications employaient déjà ; `qr.js` le traduit vers celui d'`uqr`, la
 * peer optionnelle qui rend réellement le code depuis la 4.16.0.
 *
 * LES DÉFAUTS AUSSI sont ceux de `qrcode`, depuis la correction du 15/09/2026.
 * Ils ne l'ont pas toujours été : entre la 4.16.0 et elle, une option omise
 * laissait `uqr` appliquer le sien — 1 module de marge au lieu de 4, correction
 * `'L'` au lieu de `'M'`. Le vocabulaire commun masquait l'écart, et il ne se
 * découvrait qu'au lecteur qui peine.
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
   * Marge autour du motif, en modules. **Défaut : 4**, la « quiet zone » de la
   * norme ISO 18004 — c'est elle qui permet au lecteur de trouver les bords du
   * code. `0` est une valeur admise, et non une absence.
   */
  margin?: number;
  /**
   * Pixels par module (`pixelSize` chez `uqr`, défaut 10). Ne change que
   * l'échelle du `viewBox` : le rendu, lui, suit `width` ou le conteneur.
   */
  scale?: number;
  /**
   * Robustesse au salissement et à l'occultation. **Défaut : `'M'`**, soit
   * 15 % de perte tolérée — `'L'` en tolère 7, `'Q'` 25, `'H'` 30. Monter d'un
   * cran densifie le motif à contenu égal.
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
