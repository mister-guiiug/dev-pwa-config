/**
 * Génération de QR code — par la peer OPTIONNELLE `uqr`.
 *
 * PROVENANCE. mister-molkky chargeait `qrcode` PARESSEUSEMENT au moment
 * d'afficher sa feuille de partage (`LiveShareSheet.tsx`) ; mister-qowa
 * embarquait `qrcode.react` — un composant — dans son bundle initial pour le
 * même besoin : une image à partir d'une URL. Le socle a retenu la première
 * approche : une fonction, pas un composant ni une dépendance React, et le
 * poids n'est téléchargé que si un QR est réellement affiché — le motif de
 * chargement de `map/leaflet.js`.
 *
 * POURQUOI `uqr` ET PLUS `qrcode`. Relevé du 14/09/2026 : `qrcode` n'avait
 * rien publié depuis 769 jours et son dépôt n'avait pas bougé depuis 752. Le
 * paquet fonctionne, mais plus personne ne le tient. `uqr` publie et commite,
 * et la mesure a tranché le reste — bundle esbuild minifié, gzippé :
 *
 *   qrcode  9,5 ko gzip, 3 dépendances transitives
 *   uqr     4,1 ko gzip, AUCUNE, et ses propres types
 *
 * L'API de ce module ne change pas : `qrToDataUrl` et `qrToSvg` gardent leur
 * nom, leur signature et le VOCABULAIRE D'OPTIONS de `qrcode`
 * (`errorCorrectionLevel`, `margin`, `color.dark`…), que trois applications
 * emploient déjà. La traduction vers `uqr` se fait ici, une fois.
 *
 * SEUL CHANGEMENT VISIBLE : `qrToDataUrl` rend désormais une data-URL **SVG**
 * et non plus PNG. Les trois appelants la posent dans un `<img src>`, où les
 * deux marchent — vérifié — et le SVG y est plus net à l'impression comme sur
 * un grand écran. Le préciser importe : qui attendrait un PNG binaire (un
 * `fetch` + `toBlob`, un envoi serveur) doit le savoir.
 *
 * LA DATA-URL EST PLUS LONGUE, ET NON PLUS COURTE — cette ligne a d'abord
 * affirmé l'inverse, sans l'avoir mesuré. Sur trois longueurs d'URL, le SVG
 * encodé pèse 2,4 à 3,2 fois la PNG équivalente (5 à 12 ko contre 2 à 4). Rien
 * qui pèse sur une chaîne posée une fois dans un attribut, mais qui compte
 * pour qui la stocke, la transmet ou l'inscrit dans un document.
 *
 * PEER ABSENTE : erreur EXPLICITE, qui nomme le paquet et la commande —
 * plutôt qu'un « Failed to fetch dynamically imported module » cryptique
 * découvert en production.
 */

/**
 * Charge la peer, ou explique ce qui manque. `loader` sert aux tests et aux
 * bundlers qui exigent un import statiquement analysable.
 *
 * @param {(() => Promise<unknown>) | undefined} loader
 */
async function loadUqr(loader) {
  let mod;
  try {
    mod = await (loader ? loader() : import('uqr'));
  } catch (cause) {
    throw new Error(
      'La peer optionnelle `uqr` est requise pour générer un QR code — ' +
        '`npm install uqr`.',
      { cause }
    );
  }
  return mod.default ?? mod;
}

/**
 * Traduit le vocabulaire `qrcode` vers celui d'`uqr`.
 *
 * Les correspondances sont directes, à un détail près : `errorCorrectionLevel`
 * et `ecc` partagent le MÊME alphabet `L | M | Q | H`, et `margin` comme
 * `border` se comptent en modules, pas en pixels.
 *
 * LES DEUX DÉFAUTS SONT POSÉS ICI, ET C'EST LE CORRECTIF DU 15/09/2026. Garder
 * le vocabulaire de `qrcode` sans garder ses valeurs par défaut était une
 * promesse à moitié tenue : sans `margin`, la marge tombait de 4 modules à 1 ;
 * sans `errorCorrectionLevel`, la correction passait de `'M'` à `'L'`. Rien ne
 * le signalait, et les deux écarts ne se découvrent qu'au lecteur qui peine.
 * mister-molkky, seul appelant à laisser la correction au défaut, avait glissé
 * de M à L en migrant.
 *
 * QUATRE MODULES DE MARGE, PARCE QUE LA NORME LES DEMANDE : la « quiet zone »
 * d'ISO 18004 vaut quatre modules, et c'est elle qui permet au lecteur de
 * trouver les bords du code. `uqr` en pose un, ce qui suffit souvent et pas
 * toujours — sur un fond chargé, jamais.
 *
 * `margin: 0` RESTE UNE VALEUR, pas une absence : c'est `!= null` et non un
 * `||` qui départage, sinon un zéro explicite se verrait remplacé par quatre.
 * `scale` n'a pas de défaut à restaurer — chez `uqr` il ne change que l'échelle
 * du `viewBox`, jamais ce qui s'affiche.
 *
 * `width` n'a pas d'équivalent : `uqr` raisonne en pixels PAR MODULE
 * (`pixelSize`), pas en largeur d'image. Il est donc appliqué après coup, sur
 * la racine du SVG, par `dimensionne()`.
 */
function versUqr({ margin, errorCorrectionLevel, color, scale } = {}) {
  return {
    ecc: errorCorrectionLevel ?? 'M',
    border: margin ?? 4,
    ...(scale != null ? { pixelSize: scale } : {}),
    ...(color?.dark ? { blackColor: color.dark } : {}),
    ...(color?.light ? { whiteColor: color.light } : {}),
  };
}

/**
 * Pose une largeur en pixels sur un SVG qui n'a qu'un `viewBox`.
 *
 * `uqr` rend `<svg xmlns="…" viewBox="0 0 N N">`, sans `width` ni `height` :
 * le SVG s'étire alors à son conteneur, ce qui convient à un rendu inline mais
 * pas à un `<img>` dont on veut fixer la taille.
 */
function dimensionne(svg, width) {
  if (!width) return svg;
  const px = Number(width);
  if (!Number.isFinite(px) || px <= 0) return svg;
  return svg.replace('<svg ', `<svg width="${px}" height="${px}" `);
}

/**
 * QR en balisage SVG — net à toute échelle.
 *
 * @param {string} text Contenu encodé.
 * @param {{ width?: number, margin?: number, scale?: number,
 *   errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H',
 *   color?: { dark?: string, light?: string },
 *   loader?: () => Promise<unknown> }} [options]
 * @returns {Promise<string>}
 */
export async function qrToSvg(text, options = {}) {
  const { loader, width, ...reste } = options;
  const uqr = await loadUqr(loader);
  return dimensionne(uqr.renderSVG(String(text), versUqr(reste)), width);
}

/**
 * QR en data-URL — à poser dans un `<img src>`.
 *
 * Le SVG est encodé par `encodeURIComponent` et non en base64 : pas de `btoa`,
 * donc aucun piège d'encodage si une couleur ou un contenu sort de l'ASCII, et
 * la même chaîne fonctionne en navigateur comme en Node.
 *
 * @param {string} text Contenu encodé (URL de partage, lien profond, code…).
 * @param {{ width?: number, margin?: number, scale?: number,
 *   errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H',
 *   color?: { dark?: string, light?: string },
 *   loader?: () => Promise<unknown> }} [options]
 * @returns {Promise<string>}
 */
export async function qrToDataUrl(text, options = {}) {
  const svg = await qrToSvg(text, options);
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
