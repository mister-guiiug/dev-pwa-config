/**
 * Le repli SPA de GitHub Pages : `404.html` copié d'`index.html`, marqué
 * `noindex`.
 *
 * Mesuré le 02/09/2026 : quatre apps à routage par chemin servaient la page
 * « File not found » de GitHub sur un lien profond, et trois autres avaient
 * chacune recopié la même correction. Ce qui est verrouillé ici : la copie a
 * lieu au build, pas en dev ; elle est fidèle à l'accueil, au `noindex` près
 * (29/09/2026 : `/<app>/404.html` répondait 200, doublon de l'accueil) ; un
 * `outDir` de la config est honoré ; et l'absence d'`index.html` ne casse pas
 * le build.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { spaFallbackPlugin, withNoindex } from '../vite-pwa-base.js';

const HTML =
  '<!doctype html><html><head><title>App</title><link rel="canonical" href="https://o/app/" /></head><body><div id="root"></div></body></html>';

async function withDist(run) {
  const root = mkdtempSync(join(tmpdir(), 'dwc-spa-'));
  const outDir = join(root, 'dist');
  mkdirSync(outDir);
  try {
    await run(outDir);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('au build, 404.html est la copie d’index.html, marquée noindex', async () => {
  await withDist(async outDir => {
    writeFileSync(join(outDir, 'index.html'), HTML);
    const plugin = spaFallbackPlugin();
    plugin.configResolved({ command: 'build', build: { outDir } });
    await plugin.closeBundle();
    const copie = readFileSync(join(outDir, '404.html'), 'utf8');
    assert.equal(copie, withNoindex(HTML));
    assert.ok(copie.includes('<meta name="robots" content="noindex" />'));
    // La coquille démarre toujours : le corps est intact.
    assert.ok(copie.endsWith('<body><div id="root"></div></body></html>'));
    // Plus de canonique : `noindex` et canonique se contrediraient.
    assert.doesNotMatch(copie, /canonical/);
    // L'accueil, lui, n'est pas touché.
    assert.equal(readFileSync(join(outDir, 'index.html'), 'utf8'), HTML);
  });
});

test('en dev, rien n’est écrit', async () => {
  await withDist(async outDir => {
    writeFileSync(join(outDir, 'index.html'), HTML);
    const plugin = spaFallbackPlugin();
    plugin.configResolved({ command: 'serve', build: { outDir } });
    await plugin.closeBundle();
    assert.ok(!existsSync(join(outDir, '404.html')));
  });
});

test('l’outDir de la config l’emporte sur le défaut, et `to` se renomme', async () => {
  await withDist(async outDir => {
    // Un `build.outDir` personnalisé : le plugin n'écrit pas dans `dist/`.
    const custom = join(outDir, 'site');
    mkdirSync(custom);
    writeFileSync(join(custom, 'index.html'), HTML);
    const plugin = spaFallbackPlugin({ to: 'not-found.html' });
    plugin.configResolved({ command: 'build', build: { outDir: custom } });
    await plugin.closeBundle();
    assert.equal(
      readFileSync(join(custom, 'not-found.html'), 'utf8'),
      withNoindex(HTML)
    );
    assert.ok(!existsSync(join(outDir, '404.html')));
  });
});

test('sans index.html, un avertissement — jamais un build cassé', async () => {
  await withDist(async outDir => {
    const warnings = [];
    const original = console.warn;
    console.warn = message => warnings.push(String(message));
    try {
      const plugin = spaFallbackPlugin();
      plugin.configResolved({ command: 'build', build: { outDir } });
      await plugin.closeBundle();
    } finally {
      console.warn = original;
    }
    assert.ok(!existsSync(join(outDir, '404.html')));
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /index\.html introuvable/);
  });
});
