// La copie minifiée du showroom, telle qu'elle part à la publication
// (`scripts/minify-showroom.mjs`, 06/10/2026).
//
// Ce qui est verrouillé :
//   1. `index.html` n'est pas touché : la CSP porte l'empreinte de son script
//      en ligne, et les démos y sont comparées à un rendu frais.
//   2. Aucun fichier ne se perd, et le JS et le CSS rétrécissent.
//   3. Un script CLASSIQUE garde ses noms de premier niveau : ce sont des
//      globales que les modules lisent. Un module garde ses exports.
//   4. La page minifiée DÉMARRE : le test de fumée tourne sur la copie.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  minifierJs,
  minifierShowroom,
  scriptsClassiques,
} from '../scripts/minify-showroom.mjs';

const SOURCE = fileURLToPath(new URL('../showroom/', import.meta.url));
const SORTIE = mkdtempSync(join(tmpdir(), 'showroom-min-'));
const bilan = minifierShowroom(SORTIE);

test.after(() => rmSync(SORTIE, { recursive: true, force: true }));

const fichiers = dossier =>
  readdirSync(dossier, { recursive: true })
    .map(f => String(f).replaceAll('\\', '/'))
    .sort();

test('index.html part tel quel, et aucun fichier ne se perd', () => {
  assert.equal(
    readFileSync(join(SORTIE, 'index.html'), 'utf8'),
    readFileSync(join(SOURCE, 'index.html'), 'utf8')
  );
  assert.deepEqual(fichiers(SORTIE), fichiers(SOURCE));
});

test('le JS et le CSS rétrécissent, fichier par fichier', () => {
  assert.ok(bilan.fichiers > 10, `${bilan.fichiers} fichiers minifiés`);
  for (const nom of fichiers(SOURCE).filter(f => /\.(js|css)$/.test(f))) {
    const avant = readFileSync(join(SOURCE, nom)).length;
    const apres = readFileSync(join(SORTIE, nom)).length;
    assert.ok(apres <= avant, `${nom} : ${avant} → ${apres} octets`);
  }
  assert.ok(
    bilan.apres < bilan.avant * 0.8,
    `gain gzip ${bilan.avant} → ${bilan.apres} : moins de 20 %`
  );
});

test('les scripts classiques sont ceux que la page charge sans type="module"', () => {
  const classiques = scriptsClassiques(
    readFileSync(join(SOURCE, 'index.html'), 'utf8')
  );
  assert.ok(classiques.has('themes.js') && classiques.has('i18n.js'));
  assert.ok(!classiques.has('showroom.js'), 'showroom.js est un module');
});

test('un script classique garde ses globales, un module ses exports', () => {
  const classique = minifierJs(
    'donnees.js',
    'var THEMES_LONG = { a: 1 };\nfunction aideLongue(x) { return x + 1; }',
    { module: false }
  );
  assert.match(classique, /\bTHEMES_LONG\b/);
  assert.match(classique, /\baideLongue\b/);
  const module = minifierJs(
    'm.js',
    "import { f } from './c.js?v=1';\nconst interneLong = f(2);\nexport function exportee() { return interneLong; }",
    { module: true }
  );
  assert.match(module, /export function exportee/);
  assert.match(module, /"\.\/c\.js\?v=1"|'\.\/c\.js\?v=1'/);
  assert.doesNotMatch(module, /interneLong/);
});

test('la page minifiée démarre (test de fumée sur la copie)', () => {
  const r = spawnSync(
    process.execPath,
    [
      '--test',
      fileURLToPath(new URL('showroom-fumee.test.mjs', import.meta.url)),
    ],
    { env: { ...process.env, SHOWROOM_DIR: SORTIE }, encoding: 'utf8' }
  );
  assert.equal(r.status, 0, `${r.stdout}\n${r.stderr}`.slice(-2000));
});
