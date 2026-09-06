// `pwa-screenshots` — ce qui se décide sans navigateur : les options, les
// cadres, le plan de capture et les lignes du manifeste.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  adresseLocale,
  baseDuBuild,
  CADRES,
  cheminVite,
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

test('cheminVite lit le champ bin du paquet installé, sans passer par ses exports', () => {
  // Le paquet vite ferme ses `exports` : résoudre `vite/bin/vite.js` est une
  // erreur, et c'est ce que le bin faisait à sa première exécution réelle.
  const cwd = mkdtempSync(join(tmpdir(), 'dwc-vite-'));
  try {
    const dir = join(cwd, 'node_modules', 'vite');
    mkdirSync(join(dir, 'bin'), { recursive: true });
    writeFileSync(join(cwd, 'package.json'), '{"name":"app"}');
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({
        name: 'vite',
        version: '8.0.0',
        bin: { vite: 'bin/vite.js' },
        exports: { './package.json': './package.json' },
      })
    );
    writeFileSync(join(dir, 'bin', 'vite.js'), '');
    assert.throws(
      () =>
        createRequire(join(cwd, 'package.json')).resolve('vite/bin/vite.js'),
      { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' }
    );
    assert.equal(cheminVite(cwd), join(dir, 'bin', 'vite.js'));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});

test('baseDuBuild lit la base dans le chemin des actifs de index.html', () => {
  // Un build fait pour `/pwa-starter-kit/` servi sous `/` : 404 sur chaque
  // actif, page blanche. Les captures du squelette étaient dans ce cas.
  const kit =
    '<!doctype html><html><head><script type="module" crossorigin src="/pwa-starter-kit/assets/index-CfsxhJUb.js"></script><link rel="stylesheet" crossorigin href="/pwa-starter-kit/assets/index-DBAs9nMW.css"></head></html>';
  assert.equal(baseDuBuild(kit), '/pwa-starter-kit/');
  assert.equal(baseDuBuild('<script src="/assets/index.js"></script>'), '/');
  assert.equal(baseDuBuild('<script src="./assets/index.js"></script>'), '/');
  assert.equal(
    baseDuBuild('<script src="https://cdn.example/app/assets/i.js"></script>'),
    '/app/'
  );
  assert.equal(baseDuBuild('<html><body>rien</body></html>'), '/');
  assert.equal(baseDuBuild(''), '/');
  // Sans `--base`, rien n'est décidé avant d'avoir lu le build.
  assert.equal(parseArgs([]).base, undefined);
  assert.equal(parseArgs(['--base', '/x/']).base, '/x/');
  assert.equal(parseArgs([]).dist, 'dist');
});

test('adresseLocale refuse tout ce qui sortirait de la boucle locale', () => {
  // La base vient d'un FICHIER (`dist/index.html`) ou de `--base` : deux
  // valeurs que ce script ne contrôle pas. CodeQL l'avait relevé
  // (`js/file-access-to-http`), et la parade n'est pas de filtrer des formes
  // connues mais de construire l'URL puis de comparer l'ORIGINE obtenue.
  const ok = adresseLocale(5236, '/mon-app/');
  assert.equal(ok.href, 'http://localhost:5236/mon-app/');
  assert.equal(adresseLocale(5236, '/').href, 'http://localhost:5236/');

  // Une référence protocol-relative change d'hôte une fois résolue : c'est
  // exactement ce qu'une concaténation laissait passer sans le voir.
  assert.equal(adresseLocale(5236, '//ailleurs.example/'), null);
  assert.equal(adresseLocale(5236, 'http://ailleurs.example/'), null);
  assert.equal(adresseLocale(5236, 'https://localhost:5236/'), null);
  // Un autre port n'est pas la même origine non plus.
  assert.equal(adresseLocale(5236, 'http://localhost:5237/'), null);

  // Ce qui n'est pas une URL du tout ne fait pas tomber le script.
  assert.equal(adresseLocale(5236, undefined).href, 'http://localhost:5236/');
});
