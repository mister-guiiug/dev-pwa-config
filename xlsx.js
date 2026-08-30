/**
 * Générer un vrai classeur Excel (`.xlsx`) — une archive ZIP, du XML, et rien
 * d'autre.
 *
 * PROMU, PAS INVENTÉ. `mister-doc/src/lib/xlsx.ts` — 259 lignes et leurs
 * tests — exporte les compteurs de l'équipe médicale dans un classeur Office
 * Open XML complet : une archive ZIP contenant les parties XML minimales
 * (workbook, feuilles, styles). Ouvrable par Excel, LibreOffice et Google
 * Sheets.
 *
 * POURQUOI, ALORS QUE `./csv` EXISTE. Le dialecte `excel-fr` règle l'ouverture
 * en colonnes ; il ne règle pas le TYPE des cellules. Ici les cellules
 * numériques sont réellement typées — donc sommables dans le tableur — et
 * l'en-tête est en gras. C'est le fichier que l'utilisateur demande quand il
 * dit « en Excel », là où charger SheetJS par CDN fait venir une bibliothèque
 * entière, d'un domaine tiers, à l'exécution, pour écrire un tableau.
 *
 * PLUSIEURS FEUILLES, PARCE QU'UNE ADOPTION L'A EXIGÉ. La version promue de
 * mister-doc n'écrivait qu'une feuille, et cet en-tête annonçait qu'elle
 * remplacerait le SheetJS-par-CDN de miss-uwh. L'affirmation était fausse, et
 * la lecture du code cible l'a montrée telle : `buildWorkbookSheets`
 * (miss-uwh) rend AU MOINS trois onglets — Bilan, Compte, Evolution —, 19 sur
 * son jeu de démonstration, 30 au maximum (un par catégorie mouvementée du
 * référentiel R1–R9 / D1–D13). Basculer, c'était livrer un onglet sur
 * dix-neuf : la bascule a été refusée pour cette raison (miss-uwh PR #54).
 * `buildXlsx` accepte donc une feuille OU un tableau de feuilles, et
 * l'assainissement des noms d'onglets dédoublonne — repris de `safeSheetName`
 * (miss-uwh, `src/features/export/buildWorkbook.ts`), parce qu'Excel refuse
 * d'ouvrir un classeur où deux onglets portent le même nom.
 *
 * DES LIGNES IRRÉGULIÈRES, PARCE QUE LES VRAIS CLASSEURS EN ONT. Une feuille
 * de bilan n'a pas d'en-tête au sens de ce module : elle a un titre sur une
 * cellule, des lignes vides et des lignes de deux colonnes. `header` est donc
 * facultatif, et chaque ligne porte la longueur qu'elle a — la référence de
 * cellule (`A1`, `B7`…) est calculée par ligne, jamais déduite de l'en-tête.
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
 * CE QUE ÇA N'EST PAS : un tableur. Des chaînes et des nombres, un seul style
 * (l'en-tête en gras) ; pas de formules, pas de dates typées, pas de largeurs
 * de colonnes, pas de cellules fusionnées — et pas de lecture.
 */
import { downloadBlob } from './download.js';

const enc = new TextEncoder();

/** @typedef {string | number} XlsxValue */

/**
 * @typedef {object} XlsxSheet
 * @property {string} name Nom d'onglet (assaini : ≤ 31 car., sans `\ / ? * [ ] :`, dédoublonné).
 * @property {string[]} [header] Ligne d'en-tête, rendue en gras. Absente ou vide : la feuille commence à sa première ligne de données.
 * @property {XlsxValue[][]} rows Lignes de données ; chacune peut avoir sa propre longueur, y compris zéro.
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
 * Nettoie un nom d'onglet, et le rend UNIQUE dans le classeur : Excel REFUSE
 * d'ouvrir un classeur dont un onglet porte un caractère interdit, dépasse 31
 * caractères, ou répète le nom d'un autre onglet (comparaison insensible à la
 * casse) — il ne corrige rien, il refuse le fichier entier.
 *
 * Le dédoublonnage est repris de `safeSheetName` (miss-uwh,
 * `src/features/export/buildWorkbook.ts`), où deux catégories homonymes se
 * croisaient déjà : suffixe ` 2`, ` 3`… et base retaillée pour rester sous 31.
 *
 * @param {string} name
 * @param {Set<string>} used Noms déjà attribués, en minuscules. Muté.
 */
function sanitizeSheetName(name, used) {
  const base =
    String(name ?? '')
      .replace(/[\\/?*[\]:]/g, ' ')
      .trim()
      .slice(0, 31)
      .trim() || 'Feuille1';
  let final = base;
  // Le suffixe grandit strictement à chaque tour (` 2`, ` 3`…) : deux tours ne
  // peuvent pas produire le même nom, la boucle termine.
  for (let i = 2; used.has(final.toLowerCase()); i += 1) {
    const suffix = ` ${i}`;
    final = base.slice(0, 31 - suffix.length).trim() + suffix;
  }
  used.add(final.toLowerCase());
  return final;
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

/**
 * Une feuille. Le numéro de ligne est COMPTÉ à l'émission, pas déduit d'un
 * index d'en-tête : sans en-tête les données commencent en ligne 1, avec en
 * ligne 2 — et une ligne vide occupe sa ligne comme les autres.
 *
 * @param {XlsxSheet} sheet
 */
function sheetXml(sheet) {
  /** @type {string[]} */
  const rowsXml = [];
  let r = 0;
  /**
   * @param {XlsxValue[]} cells
   * @param {boolean} bold
   */
  const emit = (cells, bold) => {
    r += 1;
    const cs = cells
      // Une cellule absente (`null`, `undefined`, trou de tableau creux) n'est
      // pas une cellule vide : elle n'est pas émise du tout. La référence des
      // suivantes ne bouge pas, elle vient de l'index.
      .map((v, ci) => (v == null ? '' : cellXml(`${colName(ci)}${r}`, v, bold)))
      .join('');
    // `<row r="7"/>` : une ligne sans cellule reste une ligne, et c'est ainsi
    // que se rend le séparateur vide d'une feuille de bilan.
    rowsXml.push(cs ? `<row r="${r}">${cs}</row>` : `<row r="${r}"/>`);
  };
  if (sheet.header?.length) emit(sheet.header, true);
  for (const row of sheet.rows ?? []) emit(row ?? [], false);
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    `<sheetData>${rowsXml.join('')}</sheetData>` +
    '</worksheet>'
  );
}

/**
 * Types de contenu : une partie déclarée pour CHAQUE feuille. Une feuille
 * présente dans l'archive mais absente d'ici est une feuille qu'Excel ne lit
 * pas — c'est ce fichier qui dit ce que contient le paquet.
 *
 * @param {number} count Nombre de feuilles.
 */
function contentTypesXml(count) {
  const sheets = Array.from(
    { length: count },
    (_, i) =>
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
  ).join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    sheets +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    '</Types>'
  );
}

const ROOT_RELS =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
  '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
  '</Relationships>';

/**
 * Relations du classeur : `rId1`…`rIdN` pour les N feuilles, puis `rId{N+1}`
 * pour les styles. Les identifiants sont uniques dans CE fichier et nulle part
 * ailleurs — d'où le décalage des styles quand une feuille s'ajoute ; un
 * `rId` en double, et le classeur ne s'ouvre pas.
 *
 * @param {number} count Nombre de feuilles.
 */
function workbookRelsXml(count) {
  const sheets = Array.from(
    { length: count },
    (_, i) =>
      `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
  ).join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    sheets +
    `<Relationship Id="rId${count + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    '</Relationships>'
  );
}

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

/**
 * L'ordre des `<sheet>` est celui des onglets à l'écran. `sheetId` et `r:id`
 * suivent le même rang que la partie `sheetN.xml` : trois numérotations qui
 * doivent coïncider, sans quoi un onglet montre le contenu d'un autre.
 *
 * @param {string[]} names Noms d'onglets, déjà assainis et dédoublonnés.
 */
function workbookXml(names) {
  const sheets = names
    .map(
      (n, i) =>
        `<sheet name="${escapeXml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
    )
    .join('');
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    `<sheets>${sheets}</sheets>` +
    '</workbook>'
  );
}

/** Un classeur sans onglet ne s'ouvre pas : le repli en fournit un, vide. */
const EMPTY_SHEET = { name: 'Feuille1', header: [], rows: [] };

/**
 * Construit les octets d'un fichier `.xlsx` — une feuille, ou plusieurs.
 *
 * Passer un objet reste équivalent à passer un tableau d'un seul élément, aux
 * octets près : la forme mono-feuille d'origine n'a pas bougé.
 *
 * @param {XlsxSheet | XlsxSheet[]} input Une feuille, ou les onglets dans leur ordre d'affichage.
 * @returns {Uint8Array<ArrayBuffer>}
 */
export function buildXlsx(input) {
  const given = Array.isArray(input) ? input : [input];
  const sheets = given.length ? given : [EMPTY_SHEET];
  /** Noms déjà pris, en minuscules — Excel compare sans la casse. */
  const used = new Set();
  const names = sheets.map(s => sanitizeSheetName(s?.name, used));
  /** @type {ZipEntry[]} */
  const entries = [
    {
      name: '[Content_Types].xml',
      data: enc.encode(contentTypesXml(sheets.length)),
    },
    { name: '_rels/.rels', data: enc.encode(ROOT_RELS) },
    { name: 'xl/workbook.xml', data: enc.encode(workbookXml(names)) },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: enc.encode(workbookRelsXml(sheets.length)),
    },
    { name: 'xl/styles.xml', data: enc.encode(STYLES) },
    ...sheets.map((s, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: enc.encode(sheetXml(s ?? EMPTY_SHEET)),
    })),
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
