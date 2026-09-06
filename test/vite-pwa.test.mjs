/**
 * La couche PWA partagée.
 *
 * Les seize apps configuraient leur service worker chacune de leur côté :
 * dix en `prompt`, quatre en `autoUpdate`, deux sans ; cinq seulement
 * déclaraient un `runtimeCaching`. Ces tests verrouillent les défauts, et
 * surtout les deux choix qui pourraient être « améliorés » à tort — le mode
 * `prompt` et l'absence de cache d'API.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  manifestScreenshots,
  paletteFromCss,
  pngDimensions,
  pwaBaseOptions,
  pwaManifest,
  pwaWorkbox,
  normalizeBasePath,
} from '../vite-pwa.js';
import { brandColor, themeById } from '../themes.js';

/** Un PNG réduit à sa signature et à son en-tête IHDR : de quoi lire la taille. */
function faussePng(width, height) {
  const buffer = Buffer.alloc(33);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(buffer, 0);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

test('une app HORS catalogue prend ses couleurs dans sa feuille de style', () => {
  // Le squelette passait ses couleurs à la main parce que `pwaBaseOptions` ne
  // savait lire que themes.js. `src/index.css` les peint déjà : on les y lit.
  const css = `:root { color-scheme: light; --dwc-bg: #f7f8fa; --dwc-primary: #3b6ea5; }`;
  const manifest = pwaManifest({
    id: 'miss-inconnue',
    css,
    screenshots: false,
  });
  assert.equal(manifest.theme_color, '#3b6ea5');
  assert.equal(manifest.background_color, '#f7f8fa');
  // L'explicite et le catalogue passent avant : la feuille n'est qu'un repli.
  assert.equal(
    pwaManifest({ id: 'miss-uwh', css, screenshots: false }).theme_color,
    brandColor('miss-uwh')
  );
  assert.deepEqual(paletteFromCss(''), null);
  assert.deepEqual(paletteFromCss('body { margin: 0 }'), null);
});

test('sans aucune couleur, un avertissement qui dit les trois remèdes', () => {
  const original = console.warn;
  const messages = [];
  console.warn = message => messages.push(String(message));
  try {
    pwaManifest({ id: 'miss-inconnue', css: '', screenshots: false });
  } finally {
    console.warn = original;
  }
  assert.equal(messages.length, 1);
  assert.match(messages[0], /themeColor/);
  assert.match(messages[0], /catalogue/);
  assert.match(messages[0], /--dwc-primary/);
});

test('les captures présentes sur le disque entrent au manifeste, à leur taille réelle', () => {
  assert.deepEqual(pngDimensions(faussePng(540, 1170)), {
    width: 540,
    height: 1170,
  });
  assert.equal(pngDimensions(Buffer.from('pas un png')), null);

  const root = mkdtempSync(join(tmpdir(), 'dwc-shots-'));
  try {
    const dir = join(root, 'public', 'screenshots');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'narrow.png'), faussePng(540, 1170));
    writeFileSync(join(dir, 'wide.png'), faussePng(1280, 720));
    const entries = manifestScreenshots(dir, {
      publicDir: join(root, 'public'),
    });
    assert.deepEqual(
      entries.map(e => [e.src, e.sizes, e.form_factor]),
      [
        ['screenshots/narrow.png', '540x1170', 'narrow'],
        ['screenshots/wide.png', '1280x720', 'wide'],
      ]
    );
    const manifest = pwaManifest({
      id: 'miss-uwh',
      screenshotsDir: dir,
    });
    assert.equal(manifest.screenshots.length, 2);
    // Sans fichier, pas de clé : un tableau vide serait un mensonge poli.
    assert.equal(
      'screenshots' in pwaManifest({ id: 'miss-uwh', screenshots: false }),
      false
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('normalizeBasePath produit toujours /…/ ou /', () => {
  assert.equal(normalizeBasePath(), '/');
  assert.equal(normalizeBasePath('/'), '/');
  assert.equal(normalizeBasePath('miss-uwh'), '/miss-uwh/');
  assert.equal(normalizeBasePath('/miss-uwh'), '/miss-uwh/');
  assert.equal(normalizeBasePath('/miss-uwh/'), '/miss-uwh/');
  assert.equal(normalizeBasePath('//miss-uwh//'), '/miss-uwh/');
});

test('les couleurs du manifest sont LUES dans themes.js, pas recopiées', () => {
  const manifest = pwaManifest({ id: 'miss-uwh', name: 'Miss UWH' });
  assert.equal(manifest.theme_color, brandColor('miss-uwh'));
  assert.equal(manifest.background_color, themeById('miss-uwh').light.bg);
});

test('une couleur explicite l’emporte sur le relevé', () => {
  // Une app peut vouloir une barre système sombre plutôt que sa primaire :
  // c'est un choix légitime, il doit juste être écrit.
  const manifest = pwaManifest({ id: 'miss-uwh', themeColor: '#0c1222' });
  assert.equal(manifest.theme_color, '#0c1222');
});

test('scope, start_url et id suivent le chemin de base', () => {
  const manifest = pwaManifest({ id: 'mister-puzzle' });
  assert.equal(manifest.scope, '/mister-puzzle/');
  assert.equal(manifest.start_url, '/mister-puzzle/');
  assert.equal(manifest.id, '/mister-puzzle/');
});

test('les raccourcis sont préfixés par le chemin de base', () => {
  const manifest = pwaManifest({
    id: 'miss-uwh',
    shortcuts: [
      { name: 'Journal', url: '#/finances/journal' },
      { name: 'Ailleurs', url: '/autre/page' },
    ],
  });
  assert.equal(manifest.shortcuts[0].url, '/miss-uwh/#/finances/journal');
  assert.equal(manifest.shortcuts[0].short_name, 'Journal');
  assert.equal(
    manifest.shortcuts[1].url,
    '/autre/page',
    'une URL absolue ne doit pas être re-préfixée'
  );
});

test('aucune mise en cache d’API par défaut', () => {
  // Défaut délibéré : une réponse authentifiée mise en cache expose les données
  // d'un utilisateur au suivant sur un appareil partagé. C'est une décision à
  // écrire app par app, pas un réglage à hériter.
  const workbox = pwaWorkbox({ id: 'miss-uwh' });
  const cacheNames = workbox.runtimeCaching.map(rule => rule.options.cacheName);
  assert.deepEqual(cacheNames, ['dwc-images']);
});

test('apiOrigins produit une règle NetworkFirst, jamais CacheFirst', () => {
  const workbox = pwaWorkbox({
    id: 'miss-uwh',
    apiOrigins: ['https://abc.supabase.co'],
  });
  const api = workbox.runtimeCaching.find(rule =>
    rule.options.cacheName.startsWith('dwc-api')
  );
  assert.equal(api.handler, 'NetworkFirst');
  assert.ok(api.options.networkTimeoutSeconds > 0);
  assert.ok(api.urlPattern.test('https://abc.supabase.co/rest/v1/x'));
  assert.ok(!api.urlPattern.test('https://autre.example/rest'));
});

test('navigateFallback pointe dans le chemin de base', () => {
  assert.equal(
    pwaWorkbox({ id: 'mister-puzzle' }).navigateFallback,
    '/mister-puzzle/index.html'
  );
});

test('registerType vaut prompt : le seul mode compatible avec le hook livré', () => {
  // `autoUpdate` recharge l'app sous les doigts de l'utilisateur, parfois au
  // milieu d'une saisie — et rend `useUpdatePrompt` inutile.
  assert.equal(pwaBaseOptions({ id: 'miss-uwh' }).registerType, 'prompt');
  assert.equal(
    pwaBaseOptions({ id: 'miss-uwh', registerType: 'autoUpdate' }).registerType,
    'autoUpdate'
  );
});

test('includeAssets suit les icônes déclarées', () => {
  const options = pwaBaseOptions({ id: 'miss-uwh' });
  assert.deepEqual(
    options.includeAssets,
    options.manifest.icons.map(i => i.src)
  );
  assert.ok(
    options.manifest.icons.some(icon => icon.purpose === 'maskable'),
    'une icône maskable est attendue (npx pwa-icons --maskable)'
  );
});

test('les surcharges profondes passent', () => {
  const options = pwaBaseOptions({
    id: 'miss-uwh',
    manifest: { display: 'fullscreen' },
    workbox: { maximumFileSizeToCacheInBytes: 1 },
  });
  assert.equal(options.manifest.display, 'fullscreen');
  assert.equal(options.workbox.maximumFileSizeToCacheInBytes, 1);
});

test('le module ne dépend pas de vite-plugin-pwa', async () => {
  // Il renvoie un objet ordinaire : le paquet n'a pas à s'ajouter une
  // dépendance, ni à imposer sa version à l'app.
  const source = await import('node:fs').then(fs =>
    fs.readFileSync(new URL('../vite-pwa.js', import.meta.url), 'utf8')
  );
  assert.doesNotMatch(source, /from 'vite-plugin-pwa'/);
  assert.doesNotMatch(source, /from 'vite'/);
});
