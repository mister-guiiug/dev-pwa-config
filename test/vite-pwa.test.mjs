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

import {
  pwaBaseOptions,
  pwaManifest,
  pwaWorkbox,
  normalizeBasePath,
} from '../vite-pwa.js';
import { brandColor, themeById } from '../themes.js';

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
