// Forme du relevé d'adoption (`showroom/adoption.js`).
//
// Le fichier est ENGENDRÉ par `scripts/measure-adoption.mjs`, qui exige les
// dépôts des seize apps clonés à côté — ce que la CI n'a pas. Il est donc
// commité, comme `metrics.js`, et ce test doit passer sur un fichier VIDE :
// `measured: 0` est un état valide.
//
// Ce qu'il tient : la forme que lit la page, et la cohérence avec le catalogue.
// Un identifiant d'app disparu, ou un compte qui ne colle pas au détail,
// passerait sinon inaperçu — et c'est précisément le genre de chiffre qu'on
// finit par citer sans le vérifier.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FAMILY_APPS } from '../apps-catalog.js';

await import('../showroom/adoption.js');
const ADOPTION = globalThis.SHOWROOM_ADOPTION;

const IDS = new Set(FAMILY_APPS.map(app => app.id));

test('adoption.js pose un objet bien formé sur globalThis', () => {
  assert.ok(
    ADOPTION && typeof ADOPTION === 'object',
    'SHOWROOM_ADOPTION absent'
  );
  assert.ok(
    ADOPTION.generatedAt === null ||
      Number.isFinite(Date.parse(ADOPTION.generatedAt)),
    'generatedAt doit être une date ISO ou null'
  );
  assert.equal(typeof ADOPTION.measured, 'number');
  assert.equal(ADOPTION.total, FAMILY_APPS.length);
  for (const key of ['apps', 'bySymbol', 'byDuplicate']) {
    assert.equal(typeof ADOPTION[key], 'object', `${key} absent`);
  }
});

test('le relevé ne parle que d’apps que le catalogue connaît', () => {
  for (const id of Object.keys(ADOPTION.apps)) {
    assert.ok(IDS.has(id), `${id} n’est pas au catalogue`);
  }
  for (const list of Object.values(ADOPTION.bySymbol)) {
    for (const id of list)
      assert.ok(IDS.has(id), `${id} n’est pas au catalogue`);
  }
  for (const list of Object.values(ADOPTION.byDuplicate)) {
    for (const id of list)
      assert.ok(IDS.has(id), `${id} n’est pas au catalogue`);
  }
});

test('les index inversés collent au détail par app', () => {
  // `bySymbol` et `byDuplicate` sont ce que la page affiche ; `apps` est la
  // source. Les deux doivent dire la même chose, sinon le taux affiché est faux.
  const symbols = new Map();
  const duplicates = new Map();
  for (const [id, data] of Object.entries(ADOPTION.apps)) {
    for (const symbol of data.symbols ?? []) {
      if (!symbols.has(symbol)) symbols.set(symbol, new Set());
      symbols.get(symbol).add(id);
    }
    for (const dup of data.duplicates ?? []) {
      if (!duplicates.has(dup.exported))
        duplicates.set(dup.exported, new Set());
      duplicates.get(dup.exported).add(id);
    }
  }
  for (const [symbol, list] of Object.entries(ADOPTION.bySymbol)) {
    assert.deepEqual(
      [...list].sort(),
      [...(symbols.get(symbol) ?? [])].sort(),
      `bySymbol[${symbol}] ne colle pas au détail`
    );
  }
  for (const [symbol, list] of Object.entries(ADOPTION.byDuplicate)) {
    assert.deepEqual(
      [...list].sort(),
      [...(duplicates.get(symbol) ?? [])].sort(),
      `byDuplicate[${symbol}] ne colle pas au détail`
    );
  }
});

test('une app ne peut pas à la fois importer un export et le recopier', () => {
  // Le doublon n'est compté que si le symbole n'est PAS importé : c'est la
  // définition. Si les deux apparaissent, la détection s'est trompée de fichier.
  for (const [id, data] of Object.entries(ADOPTION.apps)) {
    const imported = new Set(data.symbols ?? []);
    for (const dup of data.duplicates ?? []) {
      assert.ok(
        !imported.has(dup.exported),
        `${id} : ${dup.exported} compté comme recopié ET importé`
      );
    }
  }
});

test('le relevé n’est pas publié : c’est un outil du dépôt', async () => {
  const { readFileSync } = await import('node:fs');
  const pkg = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  );
  assert.ok(
    !pkg.files.includes('showroom'),
    'le showroom ne doit pas être publié'
  );
});
