// `pwa-screenshots` — ce qui se décide sans navigateur : les options, les
// cadres, le plan de capture et les lignes du manifeste.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CADRES,
  parseArgs,
  parseSize,
  plan,
  run,
  snippet,
} from '../scripts/pwa-screenshots.mjs';

test('les cadres par défaut sont ceux que Chrome attend', () => {
  assert.deepEqual(CADRES.narrow, { width: 540, height: 1170 });
  assert.deepEqual(CADRES.wide, { width: 1280, height: 720 });
  const o = parseArgs([]);
  assert.equal(o.out, 'public/screenshots');
  assert.equal(o.locale, 'fr-FR');
  assert.equal(o.scheme, 'light');
  assert.equal(o.port, 4319);
  assert.deepEqual(
    plan(o).map(s => s.name),
    ['narrow', 'wide']
  );
});

test('parseSize accepte 540x1170 et retombe sur le cadre sinon', () => {
  assert.deepEqual(parseSize('390x844'), { width: 390, height: 844 });
  assert.deepEqual(parseSize('n’importe quoi', CADRES.wide), CADRES.wide);
  assert.deepEqual(parseSize(undefined, CADRES.narrow), CADRES.narrow);
});

test('les options nomment un chemin par cadre, un module de préparation, une seule capture', () => {
  const o = parseArgs([
    '--url',
    'http://localhost:5236/mister-miss-koh/',
    '--narrow-path',
    '#/episodes',
    '--wide-path',
    '#/candidats',
    '--wide',
    '1280x800',
    '--prepare',
    'scripts/captures-prepare.mjs',
    '--scheme',
    'dark',
    '--only',
    'wide',
  ]);
  assert.equal(o.url, 'http://localhost:5236/mister-miss-koh/');
  assert.equal(o.prepare, 'scripts/captures-prepare.mjs');
  assert.equal(o.scheme, 'dark');
  assert.deepEqual(plan(o), [
    { name: 'wide', width: 1280, height: 800, path: '#/candidats' },
  ]);
});

test('le snippet reprend les entrées telles que le manifeste les veut', () => {
  const texte = snippet([
    {
      src: 'screenshots/narrow.png',
      sizes: '540x1170',
      type: 'image/png',
      form_factor: 'narrow',
      label: 'L’application, sur téléphone',
    },
  ]);
  assert.match(texte, /^screenshots: \[/);
  assert.match(texte, /form_factor: "narrow"/);
  assert.match(texte, /label: "L’application, sur téléphone"/);
  assert.equal(snippet([]), 'aucune capture trouvée');
});

test('--help ne lance ni navigateur ni serveur', async () => {
  const logs = [];
  const original = console.log;
  console.log = m => logs.push(String(m));
  try {
    assert.equal(await run(['--help']), 0);
  } finally {
    console.log = original;
  }
  assert.match(logs.join('\n'), /--prepare/);
});
