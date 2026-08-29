/**
 * Générer un vrai classeur Excel (`.xlsx`) — une archive ZIP, du XML, et rien
 * d'autre.
 *
 * PROMU, PAS INVENTÉ. `mister-doc/src/lib/xlsx.ts` — 259 lignes et leurs
 * tests — exporte les compteurs de l'équipe médicale dans un classeur Office
 * Open XML complet : une archive ZIP contenant les parties XML minimales
 * (workbook, une feuille, styles). Ouvrable par Excel, LibreOffice et Google
 * Sheets.
 *
 * POURQUOI, ALORS QUE `./csv` EXISTE. Le dialecte `excel-fr` règle l'ouverture
 * en colonnes ; il ne règle pas le TYPE des cellules. Ici les cellules
 * numériques sont réellement typées — donc sommables dans le tableur — et
 * l'en-tête est en gras. C'est le fichier que l'utilisateur demande quand il
 * dit « en Excel », et c'est celui que miss-uwh produit aujourd'hui en
 * chargeant SheetJS par CDN — une bibliothèque entière, tirée d'un domaine
 * tiers à l'exécution, pour écrire un tableau.
 *
 * STORE, PAS DEFLATE. Le format ZIP autorise des entrées non compressées
 * (méthode 0), et c'est ce qui permet de tenir sans dépendance : compresser
 * exigerait d'embarquer un deflate, pour gagner quelques kilo-octets sur du
 * XML minuscule. Le CRC32 de chaque entrée est calculé ici (table de 256) —
 * un tableur le vérifie avant de lire.
 *
 * DÉTERMINISTE, VOLONTAIREMENT. La date DOS des entrées est FIGÉE à
 * 1980-01-01 : deux exports du même tableau donnent le même fichier, octet
 * pour octet, sans dépendre du fuseau ni de l'horloge — une date de
 * modification n'apprend rien dans un export de tableur, et elle rend les
 * tests et les comparaisons impossibles.
 *
 * UN CHANGEMENT À LA PROMOTION : `downloadXlsx` passe par `downloadBlob`
 * (`./download.js`) au lieu de recopier la danse ObjectURL + ancre.
 *
 * CE QUE ÇA N'EST PAS : un tableur. Une seule feuille, des chaînes et des
 * nombres, un seul style (l'en-tête en gras) ; pas de formules, pas de dates
 * typées, pas de largeurs de colonnes — et pas de lecture.
 */
import { downloadBlob } from './download.js';

const enc = new TextEncoder();

/** @typedef {string | number} XlsxValue */

/**
 * @typedef {object} XlsxSheet
 * @property {string} name Nom d'onglet (assaini : ≤ 31 car., sans `\ / ? * [ ] :`).
 * @property {string[]} header Ligne d'en-tête, rendue en gras.
 * @property {XlsxValue[][]} rows Lignes de données, alignées sur l'en-tête.
 */

/* ── CRC32 ─────────────────────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

/** @param {Uint8Array} bytes */
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    // `& 0xff` borne l'index à 0-255, la taille de la table.
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

/* ── ZIP (méthode STORE) ───────────────────────────────────────────────── */

/**
 * @typedef {object} ZipEntry
 * @property {string} name
 * @property {Uint8Array} data
 */

// Date DOS fixe (1980-01-01) : rend l'archive déterministe, sans dépendre du
// fuseau ni de l'horloge (aucune information utile dans un export tableur).
const DOS_DATE = 0x0021;
const DOS_TIME = 0x0000;

/**
 * Concatène une archive ZIP « stored » (sans compression) : en-têtes locaux et
 * données, puis répertoire central, puis fin de répertoire — chaque offset
 * compté sur les octets réellement écrits.
 *
 * @param {ZipEntry[]} entries
 * @returns {Uint8Array<ArrayBuffer>}
 */
function zipStore(entries) {
  /** @type {Uint8Array[]} */
  const local = [];
  /** @type {Uint8Array[]} */
  const central = [];
  let offset = 0;

  for (const e of entries) {
    const nameBytes = enc.encode(e.name);
    const crc = crc32(e.data);
    const size = e.data.length;

    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); // signature en-tête local
    lh.setUint16(4, 20, true); // version nécessaire (2.0)
    lh.setUint16(6, 0x0800, true); // drapeaux : nom de fichier en UTF-8
    lh.setUint16(8, 0, true); // méthode : STORE
    lh.setUint16(10, DOS_TIME, true);
    lh.setUint16(12, DOS_DATE, true);
    lh.setUint32(14, crc, true);
    lh.setUint32(18, size, true); // taille compressée = taille brute
    lh.setUint32(22, size, true);
    lh.setUint16(26, nameBytes.length, true);
    lh.setUint16(28, 0, true); // longueur du champ « extra »
    local.push(new Uint8Array(lh.buffer), nameBytes, e.data);

    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); // signature répertoire central
    ch.setUint16(4, 20, true); // version créatrice
    ch.setUint16(6, 20, true); // version nécessaire
    ch.setUint16(8, 0x0800, true);
    ch.setUint16(10, 0, true);
    ch.setUint16(12, DOS_TIME, true);
    ch.setUint16(14, DOS_DATE, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, size, true);
    ch.setUint32(24, size, true);
    ch.setUint16(28, nameBytes.length, true);
    ch.setUint16(30, 0, true); // extra
    ch.setUint16(32, 0, true); // commentaire
    ch.setUint16(34, 0, true); // n° de disque
    ch.setUint16(36, 0, true); // attributs internes
    ch.setUint32(38, 0, true); // attributs externes
    ch.setUint32(42, offset, true); // offset de l'en-tête local
    central.push(new Uint8Array(ch.buffer), nameBytes);

    offset += 30 + nameBytes.length + size;
  }

  const centralSize = central.reduce((a, c) => a + c.length, 0);
  const centralOffset = offset;

  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true); // fin du répertoire central
  eocd.setUint16(4, 0, true);
  eocd.setUint16(6, 0, true);
  eocd.setUint16(8, entries.length, true);
  eocd.setUint16(10, entries.length, true);
  eocd.setUint32(12, centralSize, true);
  eocd.setUint32(16, centralOffset, true);
  eocd.setUint16(20, 0, true);

  const parts = [...local, ...central, new Uint8Array(eocd.buffer)];
  const total = parts.reduce((a, c) => a + c.length, 0);
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of parts) {
    out.set(c, p);
    p += c.length;
  }
  return out;
}

/* ── Parties OOXML ─────────────────────────────────────────────────────── */

/** @param {string} s */
function escapeXml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Lettre de colonne A1 (0 → « A », 26 → « AA »…).
 *
 * @param {number} index
 */
function colName(index) {
  let s = '';
  let i = index + 1;
  while (i > 0) {
    const m = (i - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

/**
 * Nettoie un nom d'onglet : Excel REFUSE d'ouvrir un classeur dont un onglet
 * porte un caractère interdit ou dépasse 31 caractères — il ne le corrige pas.
 *
 * @param {string} name
 */
function sanitizeSheetName(name) {
  const cleaned = name.replace(/[\\/?*[\]:]/g, ' ').trim();
  return (cleaned || 'Feuille1').slice(0, 31);
}

/**
 * Une cellule : un nombre fini part TYPÉ (`<v>`), tout le reste part en chaîne
 * en ligne — c'est ce typage qui rend les colonnes sommables dans le tableur.
 *
 * @param {string} ref
 * @param {XlsxValue} value
 * @param {boolean} bold
 */
function cellXml(ref, value, bold) {
  const s = bold ? ' s="1"' : '';
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"${s}><v>${value}</v></c>`;
  }
  return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`;
}

/** @param {XlsxSheet} sheet */
function sheetXml(sheet) {
  /** @type {string[]} */
  const rowsXml = [];
  /**
   * @param {XlsxValue[]} cells
   * @param {number} rowIndex
   * @param {boolean} bold
   */
  const emit = (cells, rowIndex, bold) => {
    const r = rowIndex + 1;
    const cs = cells
      .map((v, ci) => cellXml(`${colName(ci)}${r}`, v, bold))
      .join('');
    rowsXml.push(`<row r="${r}">${cs}</row>`);
  };
  emit(sheet.header, 0, true);
  sheet.rows.forEach((row, i) => emit(row, i + 1, false));
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetData>${rowsXml.join('')}</sheetData>` +
    '</worksheet>'
  );
}

const CONTENT_TYPES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
  '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>' +
  '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
  '</Types>';

const ROOT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  '</Relationships>';

const WORKBOOK_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>' +
  '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>' +
  '</Relationships>';

// Deux styles : xf 0 = normal, xf 1 = gras (en-tête).
const STYLES =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<fonts count="2">' +
  '<font><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><name val="Calibri"/></font>' +
  '</fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="2">' +
  '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
  '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
  '</cellXfs>' +
  '</styleSheet>';

/** @param {string} sheetName */
function workbookXml(sheetName) {
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets><sheet name="${escapeXml(sheetName)}" sheetId="1" r:id="rId1"/></sheets>` +
    '</workbook>'
  );
}

/**
 * Construit les octets d'un fichier `.xlsx` mono-feuille.
 *
 * @param {XlsxSheet} sheet
 * @returns {Uint8Array<ArrayBuffer>}
 */
export function buildXlsx(sheet) {
  const name = sanitizeSheetName(sheet.name);
  /** @type {ZipEntry[]} */
  const entries = [
    { name: '[Content_Types].xml', data: enc.encode(CONTENT_TYPES) },
    { name: '_rels/.rels', data: enc.encode(ROOT_RELS) },
    { name: 'xl/workbook.xml', data: enc.encode(workbookXml(name)) },
    { name: 'xl/_rels/workbook.xml.rels', data: enc.encode(WORKBOOK_RELS) },
    { name: 'xl/styles.xml', data: enc.encode(STYLES) },
    { name: 'xl/worksheets/sheet1.xml', data: enc.encode(sheetXml(sheet)) },
  ];
  return zipStore(entries);
}

/**
 * Télécharge un binaire XLSX, par la mécanique éprouvée de `./download.js`.
 *
 * @param {Uint8Array<ArrayBuffer>} bytes
 * @param {string} filename
 * @returns {boolean} `false` si aucun DOM n'est disponible.
 */
export function downloadXlsx(bytes, filename) {
  return downloadBlob(
    new Blob([bytes], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename
  );
}
