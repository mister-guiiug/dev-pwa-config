// Générateur XLSX (`xlsx.js`).
//
// CE QUE CES TESTS TIENNENT. Un tableur vérifie l'archive AVANT de lire son
// contenu : un CRC faux, un offset de répertoire central décalé, et le fichier
// est déclaré corrompu sans autre message. On relit donc ce que `buildXlsx`
// produit avec un extracteur INDÉPENDANT (CRC de référence compris), puis on
// vérifie ce qui a été promu : cellules numériques typées, en-tête en gras,
// XML échappé, nom d'onglet assaini.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildXlsx } from '../xlsx.js';

const dec = new TextDecoder();

/** CRC32 de référence, bit à bit — indépendant de la table de `xlsx.js`. */
function refCrc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    c ^= bytes[i];
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Mini-extracteur d'archive « stored » (méthode 0) : parcourt les en-têtes
 * locaux depuis l'offset 0, en vérifiant au passage la méthode et le CRC de
 * chaque entrée — comme le ferait le tableur.
 */
function unzipStored(zip) {
  const files = new Map();
  const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  let p = 0;
  while (p + 4 <= zip.length && dv.getUint32(p, true) === 0x04034b50) {
    const method = dv.getUint16(p + 8, true);
    const crc = dv.getUint32(p + 14, true);
    const size = dv.getUint32(p + 18, true);
    const nameLen = dv.getUint16(p + 26, true);
    const extraLen = dv.getUint16(p + 28, true);
    const nameStart = p + 30;
    const name = dec.decode(zip.subarray(nameStart, nameStart + nameLen));
    const dataStart = nameStart + nameLen + extraLen;
    const data = zip.subarray(dataStart, dataStart + size);
    assert.equal(method, 0, `${name} : méthode ${method}, STORE attendu`);
    assert.equal(refCrc32(data), crc, `${name} : CRC stocké faux`);
    files.set(name, data);
    p = dataStart + size;
  }
  return files;
}

const SHEET = {
  name: 'Compteurs',
  header: ['Médecin', 'Heures'],
  rows: [
    ['Alice', 12],
    ['Bob', 7],
  ],
};

/* ── L'archive ZIP ─────────────────────────────────────────────────────── */

test('une archive ZIP OOXML relisible, toutes parties présentes', () => {
  const zip = buildXlsx(SHEET);

  // Signature « PK\x03\x04 » : c'est elle que les tableurs reniflent.
  assert.deepEqual([...zip.subarray(0, 4)], [0x50, 0x4b, 0x03, 0x04]);

  const files = unzipStored(zip);
  for (const part of [
    '[Content_Types].xml',
    '_rels/.rels',
    'xl/workbook.xml',
    'xl/_rels/workbook.xml.rels',
    'xl/styles.xml',
    'xl/worksheets/sheet1.xml',
  ]) {
    assert.ok(files.has(part), `partie manquante : ${part}`);
  }
});

test('le répertoire central pointe sur les octets réels', () => {
  // Le tableur lit l'archive PAR LA FIN : fin de répertoire → offset du
  // répertoire central → offset de chaque en-tête local. Un offset décalé
  // d'un octet = « fichier corrompu », sans autre indice.
  const zip = buildXlsx(SHEET);
  const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);

  const eocd = zip.length - 22; // pas de commentaire : l'EOCD est en queue
  assert.equal(dv.getUint32(eocd, true), 0x06054b50, 'signature EOCD absente');
  assert.equal(dv.getUint16(eocd + 8, true), 6, 'six entrées attendues');

  const centralOffset = dv.getUint32(eocd + 16, true);
  assert.equal(
    dv.getUint32(centralOffset, true),
    0x02014b50,
    'l’offset du répertoire central ne tombe pas sur sa signature'
  );

  // Chaque entrée centrale renvoie à un en-tête local à sa signature.
  let p = centralOffset;
  for (let i = 0; i < 6; i += 1) {
    assert.equal(dv.getUint32(p, true), 0x02014b50);
    const localOffset = dv.getUint32(p + 42, true);
    assert.equal(dv.getUint32(localOffset, true), 0x04034b50);
    p += 46 + dv.getUint16(p + 28, true);
  }
});

test('déterministe : même tableau, mêmes octets', () => {
  // La date DOS est figée à 1980-01-01 : sans elle, deux exports du même
  // tableau différeraient par l'horloge — et ce test serait impossible.
  assert.deepEqual(buildXlsx(SHEET), buildXlsx(SHEET));
});

/* ── Le contenu ────────────────────────────────────────────────────────── */

test('en-tête en gras, cellules numériques réellement typées', () => {
  const files = unzipStored(buildXlsx(SHEET));
  const sheet = dec.decode(files.get('xl/worksheets/sheet1.xml'));

  // En-tête : style 1 (gras) + chaîne en ligne.
  assert.ok(sheet.includes('<c r="A1" s="1" t="inlineStr">'));
  assert.ok(sheet.includes('<t xml:space="preserve">Médecin</t>'));
  // Nombre : `<v>`, pas de `t="inlineStr"` — c'est ce typage qui rend la
  // colonne sommable dans le tableur.
  assert.ok(sheet.includes('<c r="B2"><v>12</v></c>'));
  assert.ok(sheet.includes('<t xml:space="preserve">Alice</t>'));
});

test('le XML est échappé et le nom d’onglet assaini', () => {
  const files = unzipStored(
    buildXlsx({
      name: 'A/B:C*[très long nom d onglet au-delà de trente et un caractères]',
      header: ['x'],
      rows: [['a & b <c>']],
    })
  );

  const sheet = dec.decode(files.get('xl/worksheets/sheet1.xml'));
  assert.ok(sheet.includes('a &amp; b &lt;c&gt;'));

  // Excel REFUSE le classeur entier sur un nom d'onglet interdit — il ne le
  // corrige pas. Le nettoyage n'est donc pas cosmétique.
  const workbook = dec.decode(files.get('xl/workbook.xml'));
  const m = workbook.match(/name="([^"]*)"/);
  assert.ok(m, 'aucun nom d’onglet dans workbook.xml');
  assert.ok(m[1].length <= 31);
  assert.ok(!/[\\/?*[\]:]/.test(m[1]), 'caractère interdit resté dans le nom');
});
