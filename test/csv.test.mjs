// Sérialisation et lecture CSV (`csv.js`).
//
// CE QUE CES TESTS TIENNENT. Un CSV fabriqué à la main est parfait chez le
// développeur et décalé chez l'utilisateur : les jeux de démonstration n'ont ni
// virgule, ni guillemet, ni retour à la ligne dans leurs champs. Ce sont
// pourtant les trois caractères qui cassent, et ils sont éprouvés un par un.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DIALECTS,
  UTF8_BOM,
  detectDelimiter,
  escapeField,
  fromCsv,
  parseCsv,
  toCsv,
} from '../csv.js';

/* ── Les trois caractères qui cassent ──────────────────────────────────── */

test('une virgule dans un champ ne décale pas la ligne', () => {
  const csv = toCsv([{ nom: 'Parc, côté sud', ville: 'Lyon' }]);
  assert.equal(csv, 'nom,ville\r\n"Parc, côté sud",Lyon');
  // Et l'aller-retour rend le champ intact, pas deux colonnes.
  assert.deepEqual(fromCsv(csv), [{ nom: 'Parc, côté sud', ville: 'Lyon' }]);
});

test('un guillemet se DOUBLE, il ne s’échappe pas', () => {
  // RFC 4180 : `""`, pas `\"`. La contre-oblique ne veut rien dire en CSV, et
  // c'est l'erreur la plus fréquente des sérialiseurs maison.
  const csv = toCsv([{ avis: 'le "petit" toboggan' }]);
  assert.equal(csv, 'avis\r\n"le ""petit"" toboggan"');
  assert.deepEqual(fromCsv(csv), [{ avis: 'le "petit" toboggan' }]);
});

test('un retour à la ligne reste DANS le champ', () => {
  const csv = toCsv([{ desc: 'Première ligne\nSeconde ligne' }]);
  assert.ok(csv.includes('"Première ligne\nSeconde ligne"'));
  const relu = fromCsv(csv);
  assert.equal(relu.length, 1, 'une seule ligne, pas deux');
  assert.equal(relu[0].desc, 'Première ligne\nSeconde ligne');
});

test('les trois ensemble, dans le même champ', () => {
  const infernal = 'a, b "c"\nd';
  assert.deepEqual(fromCsv(toCsv([{ x: infernal }])), [{ x: infernal }]);
});

/* ── Le piège français ─────────────────────────────────────────────────── */

test('excel-fr : point-virgule, virgule décimale, BOM', () => {
  const csv = toCsv([{ lieu: 'Café', note: 4.5 }], { dialect: 'excel-fr' });

  assert.ok(csv.startsWith(UTF8_BOM), 'sans BOM, « Café » devient « CafÃ© »');
  const corps = csv.slice(1);
  assert.equal(corps, 'lieu;note\r\nCafé;4,5');
});

test('la virgule décimale n’est PAS appliquée si le séparateur en est une', () => {
  // Sinon on fabrique soi-même l'ambiguïté qu'on prétend éviter.
  const csv = toCsv([{ note: 4.5 }], { delimiter: ',', decimalComma: true });
  assert.equal(csv, 'note\r\n4.5');
});

test('le BOM est retiré à la lecture', () => {
  const csv = toCsv([{ a: '1' }], { dialect: 'excel-fr' });
  assert.deepEqual(fromCsv(csv), [{ a: '1' }]);
});

/* ── Les colonnes ──────────────────────────────────────────────────────── */

test('les colonnes déclarées fixent l’ordre et les en-têtes', () => {
  const rows = [{ id: 'a', nom: 'Parc', secret: 'x' }];
  const csv = toCsv(rows, {
    columns: ['nom', { key: 'id', header: 'Identifiant' }],
  });
  // `secret` n'est pas exporté : les colonnes déclarées font foi.
  assert.equal(csv, 'nom,Identifiant\r\nParc,a');
});

test('une colonne peut transformer sa valeur', () => {
  const csv = toCsv([{ n: 0.42 }], {
    columns: [
      { key: 'n', header: 'part', map: v => `${Math.round(v * 100)} %` },
    ],
  });
  assert.equal(csv, 'part\r\n42 %');
});

test('sans colonnes, l’union des clés — aucune ligne n’est amputée', () => {
  const csv = toCsv([{ a: 1 }, { b: 2 }]);
  assert.equal(csv, 'a,b\r\n1,\r\n,2');
});

/* ── Les valeurs particulières ─────────────────────────────────────────── */

test('null, undefined et NaN donnent un champ vide, pas « null »', () => {
  const csv = toCsv([{ a: null, b: undefined, c: NaN, d: Infinity }]);
  assert.equal(csv, 'a,b,c,d\r\n,,,');
});

test('une date part en ISO — la seule écriture lue pareil des deux côtés', () => {
  const csv = toCsv([{ d: new Date('2026-08-27T08:00:00Z') }]);
  assert.equal(csv, 'd\r\n2026-08-27T08:00:00.000Z');
  // Une date invalide ne doit pas écrire « Invalid Date » dans le fichier.
  assert.equal(toCsv([{ d: new Date('n’importe quoi') }]), 'd\r\n');
});

test('les espaces de bord survivent — elles sont parfois signifiantes', () => {
  assert.equal(escapeField(' a '), '" a "');
  assert.deepEqual(fromCsv('x\r\n" a "'), [{ x: ' a ' }]);
});

/* ── La lecture ────────────────────────────────────────────────────────── */

test('le séparateur se devine HORS guillemets', () => {
  // Compter partout ferait gagner la virgule dès qu'un champ cité en contient.
  const texte = 'a;b;c\r\n"x,y,z,w,v";2;3';
  assert.equal(detectDelimiter(texte), ';');
  assert.deepEqual(fromCsv(texte), [{ a: 'x,y,z,w,v', b: '2', c: '3' }]);
});

test('CRLF, LF et dernière ligne sans fin de ligne', () => {
  assert.equal(parseCsv('a,b\r\n1,2\r\n3,4').length, 3);
  assert.equal(parseCsv('a,b\n1,2\n3,4').length, 3);
  assert.equal(parseCsv('a,b\r\n1,2').length, 2, 'pas de ligne fantôme');
});

test('un fichier retouché à la main ne fait pas tomber l’import', () => {
  // Colonne en trop, colonne manquante, ligne vide au milieu.
  const relu = fromCsv('a,b\r\n1,2,3\r\n\r\n4');
  assert.deepEqual(relu, [
    { a: '1', b: '2' },
    { a: '4', b: '' },
  ]);
});

test('un texte vide rend un tableau vide, pas une ligne vide', () => {
  assert.deepEqual(parseCsv(''), []);
  assert.deepEqual(fromCsv(''), []);
  assert.deepEqual(toCsv([]), '');
});

test('les trois dialectes livrés diffèrent bien', () => {
  assert.equal(DIALECTS.rfc4180.delimiter, ',');
  assert.equal(DIALECTS['excel-fr'].delimiter, ';');
  assert.equal(DIALECTS.unix.newline, '\n');
});
