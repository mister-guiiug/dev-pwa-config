// Générateur PDF (`pdf.js`).
//
// CE QUE CES TESTS TIENNENT. Un PDF cassé s'ouvre quand même — dans les
// lecteurs tolérants. Le fichier qui « marche chez moi » avec une table xref
// fausse échoue chez l'utilisateur qui a un lecteur strict, et rien dans
// l'app ne le voit. On vérifie donc les invariants du FORMAT : les offsets de
// la xref pointent sur les octets réels, chaque flux annonce sa longueur
// exacte, les littéraux texte sont échappés.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAGE, PdfContent, buildPdf, textWidth } from '../pdf.js';

// latin1 : un octet = un caractère, donc les index de chaîne SONT des offsets.
const dec = new TextDecoder('latin1');

/** Une page d'exemple : un bandeau, un titre, un trait. */
function samplePage(title = 'Compteurs — Juillet 2026') {
  const c = new PdfContent();
  c.fillRect(34, 64, PAGE.w - 68, 20, [0.42, 0.12, 0.42]);
  c.text(40, 78, 9.5, title, { bold: true, color: [1, 1, 1] });
  c.line(34, 90, PAGE.w - 34, 90, 0.8, 0.55);
  return c;
}

/* ── Le binaire ────────────────────────────────────────────────────────── */

test('le fichier commence par %PDF-1.4 et finit par %%EOF', () => {
  const text = dec.decode(buildPdf([samplePage()]));
  assert.ok(text.startsWith('%PDF-1.4\n'));
  assert.ok(text.trimEnd().endsWith('%%EOF'));
});

test('la table xref pointe sur les octets RÉELS', () => {
  // C'est l'invariant central du module : un lecteur ne lit pas le fichier en
  // continu, il SAUTE aux objets par ces offsets. On refait le trajet du
  // lecteur : startxref → table → chaque objet annoncé, à l'octet près.
  const pdf = buildPdf([samplePage(), samplePage('Page 2')]);
  const text = dec.decode(pdf);

  const start = text.match(/startxref\n(\d+)\n%%EOF/);
  assert.ok(start, 'startxref absent ou mal formé');
  const xrefOffset = Number(start[1]);
  assert.equal(text.slice(xrefOffset, xrefOffset + 5), 'xref\n');

  const entries = [...text.slice(xrefOffset).matchAll(/(\d{10}) 00000 n/g)];
  assert.equal(entries.length, 8, '2 pages = 4 objets fixes + 2×(page+flux)');
  entries.forEach((entry, i) => {
    const expected = `${i + 1} 0 obj`;
    const offset = Number(entry[1]);
    assert.equal(
      text.slice(offset, offset + expected.length),
      expected,
      `l'offset de l'objet ${i + 1} ne tombe pas sur lui`
    );
  });
});

test('chaque flux annonce sa longueur exacte', () => {
  // `/Length` faux = le lecteur lit trop ou trop peu, et l'erreur se voit
  // plusieurs objets plus loin — le pire endroit pour la comprendre.
  const text = dec.decode(buildPdf([samplePage()]));
  const m = text.match(/\/Length (\d+) >>\nstream\n/);
  assert.ok(m, 'aucun flux de contenu');
  const body = text.slice(
    text.indexOf('stream\n') + 'stream\n'.length,
    text.indexOf('\nendstream')
  );
  assert.equal(body.length, Number(m[1]));
});

/* ── Les pages ─────────────────────────────────────────────────────────── */

test('une page par flux de contenu, comptées dans /Count', () => {
  const text = dec.decode(buildPdf([samplePage(), samplePage(), samplePage()]));
  // L'espace final exclut `/Type /Pages`, l'objet parent.
  assert.equal((text.match(/\/Type \/Page /g) ?? []).length, 3);
  assert.ok(text.includes('/Count 3'));
});

test('sans aucun flux, une page vide plutôt qu’un binaire invalide', () => {
  // Un PDF sans page est invalide ; les deux consommateurs d'origine
  // fabriquaient chacun ce repli, il est monté dans `buildPdf`.
  const text = dec.decode(buildPdf([]));
  assert.equal((text.match(/\/Type \/Page /g) ?? []).length, 1);
  assert.ok(text.trimEnd().endsWith('%%EOF'));
});

/* ── Le texte ──────────────────────────────────────────────────────────── */

test('parenthèses et contre-oblique sont échappées dans les littéraux', () => {
  // `(` et `)` DÉLIMITENT un littéral texte : non échappées, elles le
  // terminent au milieu et tout ce qui suit devient des opérateurs invalides.
  const c = new PdfContent();
  c.text(10, 20, 10, 'a (b) \\ c');
  const stream = dec.decode(Uint8Array.from(c.bytes()));
  assert.ok(stream.includes('(a \\(b\\) \\\\ c)'));
});

test('hors Latin-1, le caractère devient « ? » plutôt qu’un octet faux', () => {
  const c = new PdfContent();
  c.text(10, 20, 10, 'Payé : 3€ — oui');
  const stream = dec.decode(Uint8Array.from(c.bytes()));
  // « é » (0xE9) passe tel quel ; « € » (U+20AC) et « — » (U+2014) n'ont pas
  // d'octet ici : mieux vaut un « ? » visible qu'un glyphe au hasard.
  assert.ok(stream.includes('(Payé : 3? ? oui)'));
});

test('l’alignement centré se calcule depuis la largeur estimée', () => {
  const wide = textWidth('MMMM', 10);
  const narrow = textWidth('iiii', 10);
  assert.ok(wide > narrow, 'l’heuristique doit distinguer M de i');

  const c = new PdfContent();
  c.text(0, 20, 10, 'ab', { align: 'center', width: 100 });
  const stream = dec.decode(Uint8Array.from(c.bytes()));
  const td = stream.match(/Tf (-?[\d.]+) [\d.]+ Td/);
  assert.ok(td, 'aucun positionnement de texte');
  const expected = (100 - textWidth('ab', 10)) / 2;
  assert.ok(Math.abs(Number(td[1]) - expected) < 0.01);
});

test('le repère est en HAUT-gauche : y est converti vers le repère PDF', () => {
  const c = new PdfContent();
  c.line(0, 0, 10, 0, 1, 0); // un trait tout en haut de la page
  const stream = dec.decode(Uint8Array.from(c.bytes()));
  // En repère PDF (origine bas-gauche), « tout en haut » = y ≈ hauteur A4.
  assert.ok(stream.includes(`0 ${PAGE.h} m`));
});
