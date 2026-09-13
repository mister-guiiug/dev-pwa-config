// Les options de `pwa-icons`. La génération elle-même demande `sharp`, une
// peerDependency OPTIONNELLE que le socle n'installe pas : ce qui se teste ici
// est la décision — quoi produire, à quelle taille — pas le pixel.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseArgs } from '../scripts/generate-pwa-icons.mjs';

test("l'icône Apple est produite par défaut", () => {
  const args = parseArgs([]);
  assert.equal(args.apple, true);
  assert.equal(args.appleSize, 180);
});

test('le maskable, lui, reste sur demande', () => {
  // Les deux ne se valent pas : Android lit le manifeste et se rabat sur une
  // icône « any » quand le maskable manque, iOS n'a que la balise `<link>` et
  // prend une capture d'écran à défaut. D'où l'asymétrie des défauts.
  assert.equal(parseArgs([]).maskable, false);
  assert.equal(parseArgs(['--maskable']).maskable, true);
});

test('--no-apple la retire, --apple-size la redimensionne', () => {
  assert.equal(parseArgs(['--no-apple']).apple, false);
  assert.equal(parseArgs(['--apple-size', '152']).appleSize, 152);
  // Retirer l'icône Apple ne touche pas au reste du lot.
  assert.deepEqual(
    parseArgs(['--no-apple']).sizes,
    [96, 144, 192, 256, 384, 512]
  );
});

test('importer le module ne génère rien', async () => {
  // Le script est un bin ; sans la garde `estPointDEntree`, l'importer pour le
  // tester lancerait `main()` et sortirait sur l'absence de `sharp`.
  const mod = await import('../scripts/generate-pwa-icons.mjs');
  assert.equal(typeof mod.parseArgs, 'function');
});

test('une option inconnue est ignorée, pas fatale', () => {
  const args = parseArgs(['--pas-une-option', '--apple-size', '120']);
  assert.equal(args.appleSize, 120);
});
