/**
 * Générer un vrai fichier PDF — A4, tableaux, zéro dépendance.
 *
 * PROMU, PAS INVENTÉ. `mister-doc/src/lib/pdf.ts` — 211 lignes en production —
 * produit les plannings mensuels et les compteurs de l'équipe médicale : un
 * binaire `application/pdf` complet, fabriqué octet par octet. Les
 * bibliothèques du domaine pèsent des centaines de kilo-octets pour couvrir
 * tout le format ; ces exports n'ont besoin que de rectangles, de traits et de
 * texte Helvetica.
 *
 * CE QUI REND LE FICHIER OUVRABLE PARTOUT : la table `xref`. Un lecteur PDF ne
 * lit pas le fichier en continu — il saute aux objets par les OFFSETS déclarés
 * en fin de fichier. Un offset faux d'un octet, et le document s'ouvre dans un
 * lecteur tolérant mais pas dans les autres. Ici, chaque offset est RELEVÉ sur
 * les octets réellement écrits au moment où l'objet commence, jamais recalculé
 * à part ; le test le vérifie en sautant à chaque offset pour y lire l'objet
 * annoncé.
 *
 * LE REPÈRE EST CELUI DE L'ÉCRAN, pas celui du PDF : origine en HAUT-gauche,
 * y vers le bas — comme partout ailleurs dans une app web. La conversion vers
 * le repère PDF (origine bas-gauche) est faite en interne, parce que c'est
 * elle qu'on écrit fausse quand on l'écrit à chaque appel.
 *
 * DEUX CHANGEMENTS À LA PROMOTION :
 *
 * 1. **`downloadPdf` passe par `downloadBlob`** (`./download.js`) au lieu de
 *    recopier la danse ObjectURL + ancre — c'est précisément la duplication
 *    que ce module-là a résorbée.
 * 2. **`buildPdf([])` rend une page vide** au lieu de lever : un PDF sans page
 *    est invalide, et les deux consommateurs d'origine portaient chacun ce
 *    repli. Il est monté ici pour ne plus être réécrit.
 *
 * CE QUE ÇA N'EST PAS : une bibliothèque PDF. A4 portrait uniquement, pas
 * d'images, pas de compression, pas de fontes embarquées — Helvetica et
 * Helvetica-Bold sont deux des quatorze fontes standard que tout lecteur doit
 * fournir. Le texte est encodé WinAnsi (CP1252) : Latin-1, PLUS la ponctuation
 * typographique et quelques lettres que CP1252 place sur 0x80–0x9F (€, ’,
 * “ ”, —, –, …, œ, ™…), transcodées par table. Tout autre caractère (émoji,
 * grec…) devient « ? ».
 */
import { downloadBlob } from './download.js';

/** Dimensions A4 portrait, en points PostScript (1/72 de pouce). */
export const PAGE = { w: 595.28, h: 841.89 };

/** @typedef {[number, number, number]} Rgb Couleur RVB, composantes 0..1. */

/**
 * @typedef {object} TextOptions
 * @property {boolean} [bold] Helvetica-Bold au lieu de Helvetica.
 * @property {Rgb} [color] Couleur du texte. Défaut : noir.
 * @property {'left'|'center'} [align] Défaut : `left`.
 * @property {number} [width] Largeur de la colonne pour l'alignement centré.
 */

/**
 * Formatage insensible à la locale (séparateur décimal « . »), 2 décimales.
 *
 * `toFixed` écrirait des zéros inutiles et une locale française écrirait une
 * virgule — que le format PDF ne comprend pas.
 *
 * @param {number} n
 */
function fmt(n) {
  return String(Math.round(n * 100) / 100);
}

/**
 * Largeur approximative d'un glyphe Helvetica, en cadratins — heuristique
 * suffisante pour centrer des libellés courts sans embarquer les métriques
 * AFM de la fonte.
 *
 * @param {string} ch
 */
function glyphEm(ch) {
  if (ch === ' ') return 0.278;
  if ("iIl.,:;'|!".includes(ch)) return 0.28;
  if ('ftjr()[]-'.includes(ch)) return 0.34;
  if ('mwMW'.includes(ch)) return 0.86;
  if (ch >= 'A' && ch <= 'Z') return 0.68;
  if (ch >= '0' && ch <= '9') return 0.556;
  return 0.5;
}

/**
 * Largeur approximative d'un texte Helvetica, en points.
 *
 * @param {string} str
 * @param {number} size
 */
export function textWidth(str, size) {
  let em = 0;
  for (const ch of str) em += glyphEm(ch);
  return em * size;
}

/**
 * Points de code Unicode > 0xFF qui EXISTENT en WinAnsi. CP1252 n'est pas
 * Latin-1 : les positions 0x80–0x9F, des contrôles jamais imprimés en
 * Latin-1, y portent la ponctuation typographique et quelques lettres — les
 * 27 entrées ci-dessous, dans l'ordre des octets (cinq positions restent
 * indéfinies : 0x81, 0x8D, 0x8F, 0x90, 0x9D). Tout autre point > 0xFF n'a
 * pas d'octet et devient « ? ».
 *
 * @type {Record<number, number>}
 */
const WINANSI = {
  0x20ac: 0x80, // €
  0x201a: 0x82, // ‚
  0x0192: 0x83, // ƒ
  0x201e: 0x84, // „
  0x2026: 0x85, // …
  0x2020: 0x86, // †
  0x2021: 0x87, // ‡
  0x02c6: 0x88, // ˆ
  0x2030: 0x89, // ‰
  0x0160: 0x8a, // Š
  0x2039: 0x8b, // ‹
  0x0152: 0x8c, // Œ
  0x017d: 0x8e, // Ž
  0x2018: 0x91, // ‘
  0x2019: 0x92, // ’
  0x201c: 0x93, // “
  0x201d: 0x94, // ”
  0x2022: 0x95, // •
  0x2013: 0x96, // –
  0x2014: 0x97, // —
  0x02dc: 0x98, // ˜
  0x2122: 0x99, // ™
  0x0161: 0x9a, // š
  0x203a: 0x9b, // ›
  0x0153: 0x9c, // œ
  0x017e: 0x9e, // ž
  0x0178: 0x9f, // Ÿ
};

/** Flux de contenu d'une page (repère haut-gauche). Une instance = une page. */
export class PdfContent {
  /** @type {number[]} */
  #ops = [];

  /** @param {string} s */
  #ascii(s) {
    for (let i = 0; i < s.length; i += 1) {
      this.#ops.push(s.charCodeAt(i) & 0xff);
    }
  }

  /**
   * Rectangle plein. `(x, yTop)` = coin haut-gauche.
   *
   * @param {number} x
   * @param {number} yTop
   * @param {number} w
   * @param {number} h
   * @param {Rgb} color
   */
  fillRect(x, yTop, w, h, color) {
    const yBottom = PAGE.h - (yTop + h);
    this.#ascii(`${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} rg\n`);
    this.#ascii(`${fmt(x)} ${fmt(yBottom)} ${fmt(w)} ${fmt(h)} re f\n`);
  }

  /**
   * Trait de `(x1, y1Top)` à `(x2, y2Top)`, en repère haut-gauche.
   *
   * @param {number} x1
   * @param {number} y1Top
   * @param {number} x2
   * @param {number} y2Top
   * @param {number} width Épaisseur du trait, en points.
   * @param {number} gray Gris du trait, 0 (noir) à 1 (blanc).
   */
  line(x1, y1Top, x2, y2Top, width, gray) {
    this.#ascii(`${fmt(gray)} G ${fmt(width)} w\n`);
    this.#ascii(
      `${fmt(x1)} ${fmt(PAGE.h - y1Top)} m ${fmt(x2)} ${fmt(PAGE.h - y2Top)} l S\n`
    );
  }

  /**
   * Texte. `(x, baselineTop)` = position de la ligne de base depuis le haut.
   *
   * @param {number} x
   * @param {number} baselineTop
   * @param {number} size Corps, en points.
   * @param {string} str
   * @param {TextOptions} [opts]
   */
  text(x, baselineTop, size, str, opts = {}) {
    const color = opts.color ?? [0, 0, 0];
    let tx = x;
    if (opts.align === 'center' && opts.width != null) {
      tx = x + (opts.width - textWidth(str, size)) / 2;
    }
    this.#ascii(`${fmt(color[0])} ${fmt(color[1])} ${fmt(color[2])} rg\n`);
    this.#ascii(
      `BT /${opts.bold ? 'F2' : 'F1'} ${fmt(size)} Tf ${fmt(tx)} ${fmt(PAGE.h - baselineTop)} Td `
    );
    this.#showText(str);
    this.#ascii(' Tj ET\n');
  }

  /**
   * Littéral chaîne PDF : encodage WinAnsi + échappement de « ( ) \ » — les
   * trois seuls caractères qui terminent ou piègent un littéral. L'itération
   * se fait par POINTS DE CODE : un émoji (paire de substitution) rend un
   * seul « ? », pas un par moitié.
   *
   * @param {string} str
   */
  #showText(str) {
    this.#ops.push(0x28); // (
    for (const ch of str) {
      let c = ch.codePointAt(0) ?? 0x3f;
      if (c > 0xff) c = WINANSI[c] ?? 0x3f; // sans position WinAnsi → « ? »
      if (c === 0x28 || c === 0x29 || c === 0x5c) this.#ops.push(0x5c);
      this.#ops.push(c);
    }
    this.#ops.push(0x29); // )
  }

  /** Les octets du flux de contenu — consommés par `buildPdf`. */
  bytes() {
    return this.#ops;
  }
}

/**
 * Assemble un document PDF (une page par flux de contenu) et rend ses octets.
 *
 * Objets : 1=Catalog, 2=Pages, 3=Helvetica, 4=Helvetica-Bold, puis pour chaque
 * page (5, 7, 9…) et son contenu (6, 8, 10…). Sans aucun flux, une page vide
 * est rendue : un PDF sans page est invalide.
 *
 * @param {PdfContent[]} contents
 * @returns {Uint8Array<ArrayBuffer>}
 */
export function buildPdf(contents) {
  const pages = contents.length > 0 ? contents : [new PdfContent()];

  /** @type {number[]} */
  const out = [];
  /** @param {string} s */
  const pushAscii = s => {
    for (let i = 0; i < s.length; i += 1) out.push(s.charCodeAt(i) & 0xff);
  };
  /** @param {number[]} arr */
  const pushBytes = arr => {
    for (const b of arr) out.push(b);
  };

  const nPages = pages.length;
  const totalObjs = 4 + nPages * 2;
  /** @type {number[]} */
  const offsets = new Array(totalObjs + 1).fill(0);

  pushAscii('%PDF-1.4\n');
  // Commentaire binaire : quatre octets > 0x7f, pour que les outils qui
  // reniflent le fichier le traitent en binaire et ne touchent pas aux octets.
  pushBytes([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]);

  /** @param {number} num */
  const startObj = num => {
    // L'offset est RELEVÉ ici, sur les octets déjà écrits : c'est ce qui rend
    // la table xref juste sans double comptabilité.
    offsets[num] = out.length;
    pushAscii(`${num} 0 obj\n`);
  };
  const endObj = () => pushAscii('\nendobj\n');

  startObj(1);
  pushAscii('<< /Type /Catalog /Pages 2 0 R >>');
  endObj();

  /** @type {string[]} */
  const kids = [];
  for (let i = 0; i < nPages; i += 1) kids.push(`${5 + i * 2} 0 R`);
  startObj(2);
  pushAscii(`<< /Type /Pages /Kids [ ${kids.join(' ')} ] /Count ${nPages} >>`);
  endObj();

  startObj(3);
  pushAscii(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'
  );
  endObj();
  startObj(4);
  pushAscii(
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'
  );
  endObj();

  for (let i = 0; i < nPages; i += 1) {
    const pageNum = 5 + i * 2;
    const contentNum = 6 + i * 2;
    startObj(pageNum);
    pushAscii(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${fmt(PAGE.w)} ${fmt(PAGE.h)}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentNum} 0 R >>`
    );
    endObj();

    const streamBytes = pages[i].bytes();
    startObj(contentNum);
    pushAscii(`<< /Length ${streamBytes.length} >>\nstream\n`);
    pushBytes(streamBytes);
    pushAscii('\nendstream');
    endObj();
  }

  const xrefOffset = out.length;
  pushAscii(`xref\n0 ${totalObjs + 1}\n`);
  // L'entrée 0 est imposée par le format ; les fins de ligne de la table font
  // exactement DEUX octets (`\r\n`), c'est une exigence, pas un style.
  pushAscii('0000000000 65535 f\r\n');
  for (let n = 1; n <= totalObjs; n += 1) {
    pushAscii(`${String(offsets[n]).padStart(10, '0')} 00000 n\r\n`);
  }
  pushAscii(
    `trailer\n<< /Size ${totalObjs + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  );

  return Uint8Array.from(out);
}

/**
 * Télécharge un binaire PDF, par la mécanique éprouvée de `./download.js`.
 *
 * @param {Uint8Array<ArrayBuffer>} bytes
 * @param {string} filename
 * @returns {boolean} `false` si aucun DOM n'est disponible.
 */
export function downloadPdf(bytes, filename) {
  return downloadBlob(new Blob([bytes], { type: 'application/pdf' }), filename);
}
