// Générateur XLSX (`xlsx.js`).
//
// CE QUE CES TESTS TIENNENT. Un tableur vérifie l'archive AVANT de lire son
// contenu : un CRC faux, un offset de répertoire central décalé, et le fichier
// est déclaré corrompu sans autre message. On relit donc ce que `buildXlsx`
// produit avec un extracteur INDÉPENDANT (CRC de référence compris), puis on
// vérifie ce qui a été promu : cellules numériques typées, en-tête en gras,
// XML échappé, nom d'onglet assaini.
//
// ET POUR PLUSIEURS FEUILLES : quatre numérotations doivent coïncider — la
// partie `sheetN.xml`, son `Override` de type de contenu, son `Relationship`
// `rIdN` et le `<sheet r:id>` du classeur. Aucune ne se vérifie seule ; on les
// relit donc ENSEMBLE, en suivant le chemin du tableur (`resolveWorkbook`).
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

/**
 * Suit le chemin qu'emprunte un tableur pour atteindre un onglet : le
 * `<sheet r:id>` du classeur → la relation de même Id → la partie visée → son
 * type de contenu déclaré. Vérifie au passage tout ce qui doit être unique, et
 * qu'aucune feuille de l'archive n'est orpheline. Rend les onglets, dans
 * l'ordre du classeur.
 */
function resolveWorkbook(zip) {
  const files = unzipStored(zip);
  const types = dec.decode(files.get('[Content_Types].xml'));
  const book = dec.decode(files.get('xl/workbook.xml'));
  const relsXml = dec.decode(files.get('xl/_rels/workbook.xml.rels'));

  // Les relations, par Id — un `rId` en double et le classeur ne s'ouvre pas.
  const rels = new Map();
  for (const [, id, type, target] of relsXml.matchAll(
    /<Relationship Id="([^"]+)" Type="[^"]*\/([^/"]+)" Target="([^"]+)"\/>/g
  )) {
    assert.ok(!rels.has(id), `relation ${id} déclarée deux fois`);
    rels.set(id, { type, target });
  }

  // Les styles ont leur propre relation, distincte de celles des feuilles.
  const styles = [...rels].filter(([, r]) => r.type === 'styles');
  assert.equal(styles.length, 1, 'une relation « styles » et une seule');
  assert.equal(styles[0][1].target, 'styles.xml');

  const seenNames = new Set();
  const seenIds = new Set();
  const sheets = [];
  for (const [, name, sheetId, rId] of book.matchAll(
    /<sheet name="([^"]*)" sheetId="([^"]+)" r:id="([^"]+)"\/>/g
  )) {
    const rel = rels.get(rId);
    assert.ok(rel, `${rId} : aucune relation de ce nom`);
    assert.equal(rel.type, 'worksheet', `${rId} ne pointe pas sur une feuille`);

    const part = `xl/${rel.target}`;
    assert.ok(files.has(part), `partie absente de l’archive : ${part}`);
    assert.ok(
      types.includes(
        `<Override PartName="/${part}" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      ),
      `type de contenu non déclaré : ${part}`
    );

    // Excel refuse le classeur ENTIER sur un nom d'onglet invalide ou répété.
    assert.ok(name.length <= 31, `nom trop long : « ${name} »`);
    assert.ok(!/[\\/?*[\]:]/.test(name), `caractère interdit : « ${name} »`);
    assert.ok(!seenNames.has(name.toLowerCase()), `nom répété : « ${name} »`);
    assert.ok(!seenIds.has(sheetId), `sheetId répété : ${sheetId}`);
    seenNames.add(name.toLowerCase());
    seenIds.add(sheetId);

    sheets.push({ name, sheetId, rId, part, xml: dec.decode(files.get(part)) });
  }

  // Une feuille présente dans l'archive mais que rien ne désigne est du poids
  // mort qu'aucun onglet ne montre.
  const referenced = new Set(sheets.map(s => s.part));
  for (const part of files.keys()) {
    if (part.startsWith('xl/worksheets/'))
      assert.ok(referenced.has(part), `feuille orpheline : ${part}`);
  }
  assert.ok(sheets.length > 0, 'un classeur sans onglet ne s’ouvre pas');
  return { files, sheets };
}

const SHEET = {
  name: 'Compteurs',
  header: ['Médecin', 'Heures'],
  rows: [
    ['Alice', 12],
    ['Bob', 7],
  ],
};

// Trois onglets calqués sur l'export de miss-uwh : un bilan SANS en-tête (un
// titre sur une cellule, une ligne vide, des lignes de deux colonnes), un
// journal avec en-tête, un récapitulatif.
const BILAN = {
  name: 'Bilan',
  rows: [
    ['BILAN 2025-2026 — Club'],
    [],
    ['RECETTES', 'Montant € TTC'],
    ['R1 Cotisations', 1234.5],
    [],
    ['Total recettes', 1234.5],
  ],
};
const COMPTE = {
  name: 'Compte',
  header: ['Date', 'Libellé', 'Débit', 'Crédit'],
  rows: [['2026-01-05', 'Cotisation', '', 1234.5]],
};
const EVOLUTION = {
  name: 'Evolution',
  header: ['Saison', 'Solde'],
  rows: [['2025-2026', 1234.5]],
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

/* ── Plusieurs feuilles ────────────────────────────────────────────────── */

test('un onglet = une partie, un Override, une relation, un <sheet>', () => {
  const zip = buildXlsx([BILAN, COMPTE, EVOLUTION]);
  const { files, sheets } = resolveWorkbook(zip);

  // Cinq parties fixes, plus une par feuille — ni plus, ni moins.
  assert.deepEqual(
    [...files.keys()],
    [
      '[Content_Types].xml',
      '_rels/.rels',
      'xl/workbook.xml',
      'xl/_rels/workbook.xml.rels',
      'xl/styles.xml',
      'xl/worksheets/sheet1.xml',
      'xl/worksheets/sheet2.xml',
      'xl/worksheets/sheet3.xml',
    ]
  );
  // Le compte d'entrées de l'EOCD est ce que lit le tableur en premier.
  const dv = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  assert.equal(dv.getUint16(zip.length - 22 + 8, true), 8);

  assert.deepEqual(
    sheets.map(s => [s.name, s.sheetId, s.rId, s.part]),
    [
      ['Bilan', '1', 'rId1', 'xl/worksheets/sheet1.xml'],
      ['Compte', '2', 'rId2', 'xl/worksheets/sheet2.xml'],
      ['Evolution', '3', 'rId3', 'xl/worksheets/sheet3.xml'],
    ]
  );
  // L'onglet montre bien SON contenu, pas celui du voisin.
  assert.ok(sheets[0].xml.includes('BILAN 2025-2026 — Club'));
  assert.ok(sheets[1].xml.includes('Libellé'));
  assert.ok(sheets[2].xml.includes('2025-2026'));
});

test('le rId des styles suit le nombre de feuilles, sans collision', () => {
  // Les styles sont la dernière relation : leur Id DÉCALE quand une feuille
  // s'ajoute. Le figer à rId2 le mettrait en collision avec la deuxième
  // feuille, et le classeur ne s'ouvrirait plus.
  for (const n of [1, 2, 3, 12]) {
    const sheets = Array.from({ length: n }, (_, i) => ({
      name: `F${i + 1}`,
      header: ['x'],
      rows: [[i]],
    }));
    const { files } = resolveWorkbook(buildXlsx(sheets)); // vérifie l'unicité
    const rels = dec.decode(files.get('xl/_rels/workbook.xml.rels'));
    assert.ok(
      rels.includes(
        `<Relationship Id="rId${n + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>`
      ),
      `${n} feuille(s) : styles attendus en rId${n + 1}`
    );
  }
});

test('les noms d’onglets sont dédoublonnés, sans tenir compte de la casse', () => {
  const { sheets } = resolveWorkbook(
    buildXlsx([
      { name: 'Bilan', rows: [] },
      { name: 'bilan', rows: [] }, // même onglet pour Excel
      { name: 'BILAN', rows: [] },
      { name: 'R1/R2', rows: [] }, // assaini d'abord, dédoublonné ensuite
      { name: 'R1 R2', rows: [] },
      { name: '', rows: [] }, // vide : repli sur le nom par défaut
      { name: 'x'.repeat(40), rows: [] },
      { name: 'x'.repeat(40), rows: [] }, // 31 caractères, suffixe compris
    ])
  );
  // La casse donnée par l'appelant est conservée : elle sert à départager
  // pour Excel, pas à réécrire l'intitulé que l'utilisateur lira.
  assert.deepEqual(
    sheets.map(s => s.name),
    [
      'Bilan',
      'bilan 2',
      'BILAN 3',
      'R1 R2',
      'R1 R2 2',
      'Feuille1',
      'x'.repeat(31),
      `${'x'.repeat(29)} 2`,
    ]
  );
});

test('un tableau d’une feuille rend les mêmes octets que la feuille seule', () => {
  // La compatibilité ascendante n'est pas « ça marche encore » : c'est le même
  // fichier, octet pour octet, pour les consommateurs déjà en place.
  assert.deepEqual(buildXlsx(SHEET), buildXlsx([SHEET]));
});

test('déterministe aussi à plusieurs feuilles', () => {
  assert.deepEqual(
    buildXlsx([BILAN, COMPTE, EVOLUTION]),
    buildXlsx([BILAN, COMPTE, EVOLUTION])
  );
});

test('un tableau vide rend un classeur d’un onglet vide, sans lever', () => {
  // Un classeur sans onglet ne s'ouvre pas : le repli en fournit un — comme
  // `buildPdf([])` rend une page vide.
  const { sheets } = resolveWorkbook(buildXlsx([]));
  assert.equal(sheets.length, 1);
  assert.ok(sheets[0].xml.includes('<sheetData></sheetData>'));
});

/* ── Lignes irrégulières, en-tête facultatif ───────────────────────────── */

test('sans en-tête, les données commencent en ligne 1', () => {
  const [bilan] = resolveWorkbook(buildXlsx([BILAN])).sheets;

  // Une feuille de bilan n'a pas d'en-tête au sens du module : son titre est
  // une cellule ordinaire, en ligne 1, et surtout PAS en gras.
  assert.ok(bilan.xml.includes('<c r="A1" t="inlineStr">'));
  assert.ok(
    !bilan.xml.includes('s="1"'),
    'aucune ligne ne devrait être grasse'
  );
  assert.ok(
    bilan.xml.includes('<t xml:space="preserve">BILAN 2025-2026 — Club</t>')
  );

  // Une ligne vide reste une ligne : sans elle, tout ce qui suit remonte d'un
  // cran et les références de cellules ne désignent plus la même chose.
  assert.ok(bilan.xml.includes('<row r="2"/>'));
  assert.ok(bilan.xml.includes('<c r="A3" t="inlineStr">'));
  assert.ok(bilan.xml.includes('<c r="B4"><v>1234.5</v></c>'));
  assert.match(bilan.xml, /<row r="6">.*Total recettes/);
});

test('chaque ligne porte sa propre longueur', () => {
  // Tableau CREUX (deux trous, pas deux `undefined`) : `[, , 'creux']` dirait
  // la même chose, mais la virgule flottante est justement ce que `eslint`
  // interdit — elle se lit trop mal pour être écrite par accident.
  const creux = new Array(3);
  creux[2] = 'creux';

  const [feuille] = resolveWorkbook(
    buildXlsx([
      {
        name: 'Ragged',
        header: ['a', 'b', 'c'],
        rows: [['seule'], [], [1, 2, 3, 4], ['x', null, 'z'], creux],
      },
    ])
  ).sheets;

  assert.ok(feuille.xml.includes('<row r="2"><c r="A2" t="inlineStr">'));
  assert.ok(feuille.xml.includes('<row r="3"/>'));
  assert.ok(feuille.xml.includes('<c r="D4"><v>4</v></c>'));
  // Une cellule absente n'est pas une cellule vide : elle n'est pas émise, et
  // les suivantes gardent leur colonne.
  assert.ok(!feuille.xml.includes('<c r="B5"'));
  assert.ok(feuille.xml.includes('<c r="C5" t="inlineStr">'));
  assert.ok(!feuille.xml.includes('undefined'));
  assert.ok(feuille.xml.includes('<c r="C6" t="inlineStr">'));
});
