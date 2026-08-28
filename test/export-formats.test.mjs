// Exports Markdown, JSON et vCard, et le modèle de colonnes partagé.
//
// CE QUI SE JOUE. Ces trois formats ont chacun un piège qui ne se voit pas sur
// un jeu de démonstration : une barre verticale dans une cellule Markdown, un
// `undefined` que `JSON.stringify` traite de deux façons, et — le plus subtil —
// un pliage vCard qui se compte en OCTETS et coupe les accents en deux.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyColumns, resolveColumns, toJson } from '../columns.js';
import {
  escapeCell,
  escapeInline,
  toMarkdownList,
  toMarkdownTable,
} from '../markdown.js';
import {
  escapeValue,
  foldLine,
  toVCard,
  toVCards,
  unfoldLines,
} from '../vcard.js';

/* ── Le modèle partagé ─────────────────────────────────────────────────── */

test('sans déclaration, l’UNION des clés — aucune ligne n’est amputée', () => {
  // Prendre les clés de la première ligne perdrait `b`.
  const columns = resolveColumns([{ a: 1 }, { b: 2 }]);
  assert.deepEqual(
    columns.map(c => c.key),
    ['a', 'b']
  );
});

test('une chaîne devient une colonne, son en-tête est sa clé', () => {
  assert.deepEqual(resolveColumns([], ['nom']), [
    { key: 'nom', header: 'nom' },
  ]);
});

test('les trois formats partagent le MÊME contenu', async () => {
  const { toCsv } = await import('../csv.js');
  const lignes = [{ nom: 'Parc', note: 4.5, secret: 'x' }];
  const colonnes = ['nom', { key: 'note', header: 'Note' }];

  // `secret` n'apparaît nulle part : une déclaration, trois formats.
  assert.equal(toCsv(lignes, { columns: colonnes }), 'nom,Note\r\nParc,4.5');
  assert.ok(!toMarkdownTable(lignes, { columns: colonnes }).includes('secret'));
  assert.ok(!toJson(lignes, { columns: colonnes }).includes('secret'));
});

/* ── JSON ──────────────────────────────────────────────────────────────── */

test('JSON traite d’une SEULE façon ce que stringify traite de deux', () => {
  // `undefined` disparaît d'un objet mais devient `null` dans un tableau ;
  // `NaN` et `Infinity` deviennent `null` sans prévenir. Ici tout est `null`.
  const json = JSON.parse(
    toJson([{ a: undefined, b: NaN, c: Infinity, d: 1 }])
  );
  assert.deepEqual(json, [{ a: null, b: null, c: null, d: 1 }]);
});

test('une date part en ISO, une date invalide en null', () => {
  const json = JSON.parse(
    toJson([{ d: new Date('2026-08-28T09:00:00Z'), z: new Date('nawak') }])
  );
  assert.equal(json[0].d, '2026-08-28T09:00:00.000Z');
  assert.equal(json[0].z, null);
});

test('les en-têtes déclarés deviennent les clés du JSON', () => {
  const json = JSON.parse(
    toJson([{ n: 1 }], { columns: [{ key: 'n', header: 'Nombre' }] })
  );
  assert.deepEqual(json, [{ Nombre: 1 }]);
});

test('indent: 0 rend le format compact', () => {
  assert.equal(toJson([{ a: 1 }], { indent: 0 }), '[{"a":1}]');
  assert.ok(toJson([{ a: 1 }]).includes('\n'), 'indenté par défaut');
});

test('applyColumns rend des objets simples, prêts à sérialiser', () => {
  assert.deepEqual(applyColumns([{ a: 1, b: 2 }], { columns: ['b'] }), [
    { b: 2 },
  ]);
});

/* ── Markdown ──────────────────────────────────────────────────────────── */

test('une BARRE VERTICALE ne coupe pas la ligne en colonnes', () => {
  const table = toMarkdownTable([{ score: '8 | 10' }]);
  assert.ok(table.includes('8 \\| 10'), `non échappée dans :\n${table}`);
  // Trois barres par ligne : ouvrante, séparatrice interne (aucune ici), fermante.
  const ligneDonnees = table.split('\n')[2];
  assert.equal((ligneDonnees.match(/(?<!\\)\|/g) ?? []).length, 2);
});

test('un RETOUR À LA LIGNE ne termine pas le tableau', () => {
  // Le défaut le plus déroutant : il n'apparaît qu'avec une description longue.
  const table = toMarkdownTable([{ desc: 'Première\nSeconde' }]);
  assert.ok(table.includes('Première<br>Seconde'));
  assert.equal(table.split('\n').length, 3, 'en-tête, séparateur, une ligne');
});

test('les colonnes sont alignées dans la SOURCE', () => {
  // Un tableau Markdown est lu tel quel au moins autant qu'il est rendu.
  const table = toMarkdownTable([{ a: 'x', bbbbbb: 'y' }]);
  const [entete, separateur, donnees] = table.split('\n');
  assert.equal(entete.length, separateur.length);
  assert.equal(entete.length, donnees.length);
});

test('l’alignement demandé se retrouve dans la ligne de séparation', () => {
  const table = toMarkdownTable([{ n: 1 }], {
    columns: [{ key: 'n', header: 'n', align: 'right' }],
  });
  const separateur = table.split('\n')[1];
  assert.match(separateur, /-:/);
});

test('une cellule vide reste une cellule', () => {
  const table = toMarkdownTable([{ a: '', b: 'x' }]);
  const donnees = table.split('\n')[2];
  assert.equal((donnees.match(/\|/g) ?? []).length, 3, `dans : ${donnees}`);
});

test('un tableau sans données le dit', () => {
  assert.equal(toMarkdownTable([]), '_Aucune donnée._');
  assert.equal(toMarkdownTable([], { empty: 'rien' }), 'rien');
});

test('escapeCell ne laisse passer ni null ni Infinity', () => {
  assert.equal(escapeCell(null), '');
  assert.equal(escapeCell(undefined), '');
  assert.equal(escapeCell(Infinity), '');
});

test('la liste de définitions, pour ce qu’un tableau rend illisible', () => {
  const md = toMarkdownList([{ nom: 'Parc', ville: 'Lyon', vide: '' }], {
    title: 'nom',
  });
  assert.match(md, /^### Parc/);
  assert.match(md, /- \*\*ville\*\* : Lyon/);
  assert.ok(!md.includes('vide'), 'les champs vides sont omis');
  assert.ok(!md.includes('**nom**'), 'le titre n’est pas répété en champ');
});

test('escapeInline reste étroit — il ne rend pas le texte illisible', () => {
  assert.equal(escapeInline('a*b_c`d[e]'), 'a\\*b\\_c\\`d\\[e\\]');
  assert.equal(
    escapeInline('a-b.c!'),
    'a-b.c!',
    'rien d’inutile n’est échappé'
  );
});

/* ── vCard : le pliage en octets ───────────────────────────────────────── */

test('le pliage compte les OCTETS, pas les caractères', () => {
  // 80 « e » : un octet chacun. Pliage après 75.
  const ascii = foldLine('X'.repeat(80));
  const [premiere] = ascii.split('\r\n');
  assert.equal(Buffer.byteLength(premiere, 'utf8'), 75);

  // 80 « é » : DEUX octets chacun. La même longueur en caractères doit se
  // plier deux fois plus tôt.
  const accents = foldLine('é'.repeat(80));
  const morceaux = accents.split('\r\n');
  assert.ok(morceaux.length > 2, `pliage insuffisant : ${morceaux.length}`);
  for (const morceau of morceaux) {
    assert.ok(
      Buffer.byteLength(morceau, 'utf8') <= 75,
      `ligne de ${Buffer.byteLength(morceau, 'utf8')} octets`
    );
  }
});

test('le pliage ne coupe JAMAIS un caractère en deux', () => {
  // Un accent coupé produit un mojibake que le client importe sans broncher.
  const plie = foldLine(`NOTE:${'é'.repeat(60)}`);
  for (const morceau of plie.split('\r\n')) {
    // Un remplacement U+FFFD signale un octet orphelin.
    assert.ok(!morceau.includes('�'), 'caractère coupé');
    assert.equal(
      Buffer.from(morceau, 'utf8').toString('utf8'),
      morceau,
      'aller-retour UTF-8 non conservé'
    );
  }
});

test('un emoji reste entier', () => {
  // Quatre octets, deux unités UTF-16 : `slice()` le couperait en deux.
  const plie = foldLine('X'.repeat(73) + '🎉' + 'Y'.repeat(10));
  assert.ok(plie.includes('🎉'));
  assert.ok(!plie.includes('�'));
});

test('les lignes de continuation commencent par une espace', () => {
  const lignes = foldLine('A'.repeat(200)).split('\r\n');
  for (const ligne of lignes.slice(1)) {
    assert.ok(
      ligne.startsWith(' '),
      `continuation sans espace : ${ligne.slice(0, 5)}`
    );
  }
});

test('déplier annule plier — l’aller-retour est exact', () => {
  const original = `NOTE:${'é'.repeat(100)}`;
  assert.equal(unfoldLines(foldLine(original))[0], original);
});

/* ── vCard : le contenu ────────────────────────────────────────────────── */

test('la structure imposée : BEGIN, VERSION, puis le reste', () => {
  const lignes = toVCard({ firstName: 'Jean', lastName: 'Dupont' }).split(
    '\r\n'
  );
  assert.equal(lignes[0], 'BEGIN:VCARD');
  // VERSION vient IMMÉDIATEMENT après : ce n'est pas de la mise en forme.
  assert.equal(lignes[1], 'VERSION:4.0');
  assert.equal(lignes[lignes.length - 2], 'END:VCARD');
});

test('les fins de ligne sont des CRLF, pas des LF', () => {
  // Un fichier en LF s'importe sur Android et se fait refuser ailleurs.
  const vcf = toVCard({ firstName: 'Jean' });
  assert.ok(vcf.includes('\r\n'));
  assert.ok(!/(?<!\r)\n/.test(vcf), 'un LF orphelin traîne');
  assert.ok(vcf.endsWith('\r\n'));
});

test('FN est produit même quand il n’est pas donné', () => {
  // Sans FN, le contact est refusé ou s'affiche vide : c'est l'oubli le plus
  // fréquent des générateurs qui partent du nom de famille.
  const vcf = toVCard({ firstName: 'Jean', lastName: 'Dupont', prefix: 'Dr' });
  assert.ok(vcf.includes('FN:Dr Jean Dupont'), vcf);
  assert.ok(vcf.includes('N:Dupont;Jean;;Dr;'), vcf);
});

test('N garde ses CINQ places, même vides', () => {
  // En retirer une décale tout ce qui suit.
  const vcf = toVCard({ lastName: 'Dupont' });
  const ligne = vcf.split('\r\n').find(l => l.startsWith('N:'));
  assert.equal(ligne, 'N:Dupont;;;;');
});

test('la virgule et le point-virgule sont échappés — ils SÉPARENT', () => {
  // « Dupont, Jean » non échappé deviendrait deux valeurs.
  const vcf = toVCard({ lastName: 'Dupont, Jean', note: 'a;b' });
  assert.ok(vcf.includes('N:Dupont\\, Jean;;;;'), vcf);
  assert.ok(vcf.includes('NOTE:a\\;b'), vcf);
});

test('la contre-oblique est échappée EN PREMIER', () => {
  // Sinon `\,` deviendrait `\\,` puis serait relu de travers.
  assert.equal(escapeValue('a\\b,c'), 'a\\\\b\\,c');
});

test('un retour à la ligne devient `\\n` littéral', () => {
  assert.equal(escapeValue('a\nb'), 'a\\nb');
  assert.equal(escapeValue('a\r\nb'), 'a\\nb');
});

test('téléphones et courriels portent leur TYPE', () => {
  const vcf = toVCard({
    firstName: 'Jean',
    emails: [{ value: 'jean@exemple.fr', type: 'work' }, 'perso@exemple.fr'],
    phones: [{ value: '+33612345678', type: 'cell' }],
  });
  assert.ok(vcf.includes('EMAIL;TYPE=work:jean@exemple.fr'), vcf);
  assert.ok(vcf.includes('EMAIL:perso@exemple.fr'), vcf);
  assert.ok(vcf.includes('TEL;TYPE=cell:+33612345678'), vcf);
});

test('une adresse a SEPT composants, les deux premiers vides', () => {
  const vcf = toVCard({
    firstName: 'Jean',
    addresses: [
      {
        street: '1 rue des Lilas',
        city: 'Lyon',
        postalCode: '69003',
        country: 'France',
        type: 'home',
      },
    ],
  });
  assert.ok(
    vcf.includes('ADR;TYPE=home:;;1 rue des Lilas;Lyon;;69003;France'),
    vcf
  );
});

test('les catégories se séparent par une virgule NON échappée', () => {
  // C'est précisément pour ça que la virgule est échappée dans chaque valeur.
  const vcf = toVCard({
    firstName: 'Jean',
    categories: ['Famille', 'Sport, loisirs'],
  });
  assert.ok(vcf.includes('CATEGORIES:Famille,Sport\\, loisirs'), vcf);
});

test('une date de naissance part en ISO court', () => {
  const vcf = toVCard({
    firstName: 'Jean',
    birthday: new Date('1980-05-12T00:00:00Z'),
  });
  assert.ok(vcf.includes('BDAY:1980-05-12'), vcf);
});

test('plusieurs contacts se concatènent, sans enveloppe', () => {
  const vcf = toVCards([{ firstName: 'A' }, { firstName: 'B' }]);
  assert.equal((vcf.match(/BEGIN:VCARD/g) ?? []).length, 2);
  assert.equal((vcf.match(/END:VCARD/g) ?? []).length, 2);
  assert.ok(vcf.startsWith('BEGIN:VCARD'));
});

test('`map` convertit les objets de l’app en contacts', () => {
  const vcf = toVCards([{ prenom: 'Jean', tel: '0612345678' }], {
    map: p => ({ firstName: p.prenom, phones: [p.tel] }),
  });
  assert.ok(vcf.includes('FN:Jean'));
  assert.ok(vcf.includes('TEL:0612345678'));
});

test('une longue note reste relisible après dépliage', () => {
  const note =
    'Rendez-vous très détaillé à propos de l’aire de jeux ombragée du parc'.repeat(
      3
    );
  const vcf = toVCard({ firstName: 'Jean', note });
  const lignes = unfoldLines(vcf);
  const ligneNote = lignes.find(l => l.startsWith('NOTE:'));
  assert.equal(ligneNote, `NOTE:${escapeValue(note)}`);
});
