// `pwa-og-image` : ce que la carte lit dans l'app, et ce qu'elle dessine.
// Sans navigateur : le rendu Chromium n'est pas éprouvé ici.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  assombrir,
  captureEnHauteur,
  couper,
  lireApp,
  meilleureIcone,
  ogCardHtml,
  parseArgs,
  themeColorDe,
} from '../scripts/pwa-og-image.mjs';

function png(width, height) {
  const b = Buffer.alloc(33);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(b, 0);
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  return b;
}

test('parseArgs : valeurs, --no-screenshot, aide', () => {
  assert.deepEqual(parseArgs(['--tagline', 'Le score', '--no-screenshot']), {
    aide: false,
    dir: undefined,
    out: undefined,
    name: undefined,
    tagline: 'Le score',
    color: undefined,
    icon: undefined,
    screenshot: false,
  });
  assert.equal(parseArgs(['--help']).aide, true);
});

test('couper : sur un mot, avec une ellipse', () => {
  assert.equal(couper('court'), 'court');
  const long = 'mot '.repeat(60);
  const c = couper(long, 50);
  assert.ok(c.length <= 51, c);
  assert.match(c, /mot…$/);
});

test('themeColorDe : la couleur claire, et seulement une couleur', () => {
  assert.equal(
    themeColorDe(
      '<meta name="theme-color" content="#000" media="(prefers-color-scheme: dark)"><meta name="theme-color" content="#4a7c2a" media="(prefers-color-scheme: light)">'
    ),
    '#4a7c2a'
  );
  assert.equal(themeColorDe('<meta name="theme-color" content="red">'), '');
});

test('assombrir', () => {
  assert.equal(assombrir('#ffffff', 0.5), '#808080');
  assert.equal(assombrir('#fff', 0), '#ffffff');
});

test('l’icône : le plus grand PNG carré, hors maskable ; la capture : celle en hauteur', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dwc-ogi-'));
  try {
    mkdirSync(join(dir, 'icons'));
    mkdirSync(join(dir, 'screenshots'));
    writeFileSync(join(dir, 'icons', 'icon-192.png'), png(192, 192));
    writeFileSync(join(dir, 'icons', 'icon-512.png'), png(512, 512));
    writeFileSync(
      join(dir, 'icons', 'icon-1024-maskable.png'),
      png(1024, 1024)
    );
    writeFileSync(join(dir, 'screenshots', 'wide.png'), png(1280, 720));
    writeFileSync(join(dir, 'screenshots', 'mobile.png'), png(540, 1170));
    assert.equal(meilleureIcone(dir), join(dir, 'icons', 'icon-512.png'));
    assert.equal(
      captureEnHauteur(join(dir, 'screenshots')),
      join(dir, 'screenshots', 'mobile.png')
    );
    assert.equal(captureEnHauteur(join(dir, 'absent')), null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('lireApp : nom du catalogue, accroche du titre avec sa capitale, couleur construite', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dwc-ogi-'));
  try {
    mkdirSync(join(dir, 'dist'));
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: 'mister-molkky' })
    );
    writeFileSync(
      join(dir, 'index.html'),
      '<title>Mister Mölkky — compteur de points de Mölkky</title>'
    );
    writeFileSync(
      join(dir, 'dist', 'index.html'),
      '<meta name="theme-color" content="#4a7c2a"><title>Mister Mölkky — compteur de points de Mölkky</title>'
    );
    const app = lireApp(dir, {});
    assert.equal(app.nom, 'Mister Mölkky');
    assert.equal(app.accroche, 'Compteur de points de Mölkky');
    assert.equal(app.couleur, '#4a7c2a');
    assert.equal(app.adresse, 'mister-guiiug.github.io/mister-molkky');
    assert.deepEqual(
      app.manque,
      ['icône'],
      'rien d’inventé : l’icône manquante est dite'
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('ogCardHtml : 1200×630, texte échappé, contraste, place de la capture', () => {
  const html = ogCardHtml({
    nom: 'A <b>',
    accroche: 'x & y',
    couleur: '#f4f5fb',
    adresse: 'mister-guiiug.github.io/a',
  });
  assert.match(html, /width:1200px;height:630px/);
  assert.match(html, /<h1>A &lt;b&gt;<\/h1>/);
  assert.match(html, /<p>x &amp; y<\/p>/);
  assert.match(html, /color:#111111/, 'fond clair : texte sombre');
  assert.match(html, /width:1040px/, 'sans capture, le texte prend la place');
  assert.doesNotMatch(html, /class="tel"/);
  const avec = ogCardHtml({
    nom: 'A',
    accroche: '',
    couleur: '#4a7c2a',
    adresse: 'a',
    capture: 'data:image/png;base64,AA==',
  });
  assert.match(avec, /class="tel"/);
  assert.match(avec, /color:#ffffff/);
});
