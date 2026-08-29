/**
 * Génération de QR code — par la peer OPTIONNELLE `qrcode`.
 *
 * PROVENANCE. mister-molkky charge `qrcode` PARESSEUSEMENT au moment
 * d'afficher sa feuille de partage (`LiveShareSheet.tsx`) ; mister-qowa
 * embarque `qrcode.react` — un composant — dans son bundle initial pour le
 * même besoin : une image à partir d'une URL. Le socle retient la première
 * approche : une fonction, pas un composant ni une dépendance React, et le
 * poids (~50 ko) n'est téléchargé que si un QR est réellement affiché — le
 * motif de chargement de `map/leaflet.js`.
 *
 * PEER ABSENTE : erreur EXPLICITE, qui nomme le paquet et la commande —
 * plutôt qu'un « Failed to fetch dynamically imported module » cryptique
 * découvert en production.
 *
 * La data-URL se pose dans un `<img src>` (molkky) ; le SVG s'inline quand la
 * netteté prime — impression, très grands écrans.
 */

/**
 * Charge la peer, ou explique ce qui manque. `loader` sert aux tests et aux
 * bundlers qui exigent un import statiquement analysable.
 *
 * @param {(() => Promise<unknown>) | undefined} loader
 */
async function loadQrcode(loader) {
  let mod;
  try {
    mod = await (loader ? loader() : import('qrcode'));
  } catch (cause) {
    throw new Error(
      'La peer optionnelle `qrcode` est requise pour générer un QR code — ' +
        '`npm install qrcode`.',
      { cause }
    );
  }
  return mod.default ?? mod;
}

/**
 * QR en data-URL PNG — à poser dans un `<img src>`.
 *
 * @param {string} text Contenu encodé (URL de partage, lien profond, code…).
 * @param {{ width?: number, margin?: number, scale?: number,
 *   errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H',
 *   color?: { dark?: string, light?: string },
 *   loader?: () => Promise<unknown> }} [options] Passées telles quelles à
 *   `QRCode.toDataURL` (hors `loader`).
 * @returns {Promise<string>}
 */
export async function qrToDataUrl(text, options = {}) {
  const { loader, ...qrOptions } = options;
  const QRCode = await loadQrcode(loader);
  return QRCode.toDataURL(String(text), qrOptions);
}

/**
 * QR en balisage SVG — net à toute échelle.
 *
 * @param {string} text Contenu encodé.
 * @param {{ width?: number, margin?: number, scale?: number,
 *   errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H',
 *   color?: { dark?: string, light?: string },
 *   loader?: () => Promise<unknown> }} [options] Passées telles quelles à
 *   `QRCode.toString` (hors `loader`) ; le `type: 'svg'` est imposé ici.
 * @returns {Promise<string>}
 */
export async function qrToSvg(text, options = {}) {
  const { loader, ...qrOptions } = options;
  const QRCode = await loadQrcode(loader);
  return QRCode.toString(String(text), { ...qrOptions, type: 'svg' });
}
