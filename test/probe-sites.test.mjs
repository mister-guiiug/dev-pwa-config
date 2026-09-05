// `scripts/site-readers.mjs` — les lectures pures de la sonde des sites et de
// `pwa-doctor`. Le réseau ne se teste pas ; ce qu'on fait d'une réponse, si.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  htmlMarkers,
  initialScripts,
  isAppShell,
  manifestSummary,
  resolveUrl,
} from '../scripts/site-readers.mjs';
import { probe } from '../scripts/probe-sites.mjs';

const HTML = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />
    <meta name="description" content="Une app" />
    <meta name="theme-color" content="#fff" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#000" media="(prefers-color-scheme: dark)" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'" />
    <link rel="apple-touch-icon" href="/x/apple.png" />
    <link rel="manifest" href="/x/manifest.webmanifest" />
    <link rel="canonical" href="https://o/x/" />
    <meta property="og:image" content="https://o/x/og.png" />
    <title> Miss X </title>
    <script type="module" crossorigin src="/x/assets/index-abc.js"></script>
    <link rel="modulepreload" crossorigin href="/x/assets/vendor-def.js" />
    <link rel="modulepreload" crossorigin href="/x/assets/vendor-def.js" />
  </head>
  <body><div id="root"></div></body>
</html>`;

test('htmlMarkers lit des balises étalées sur plusieurs lignes', () => {
  // La première sonde, en shell, comptait zéro viewport sur seize sites :
  // Vite écrit `<meta` sur une ligne et `name=` sur la suivante.
  const m = htmlMarkers(HTML);
  assert.equal(m.lang, 'fr');
  assert.equal(m.title, 'Miss X');
  assert.equal(m.viewport, true);
  assert.equal(m.description, true);
  assert.equal(m.themeColor, 2);
  assert.equal(m.themeColorMedia, 2);
  assert.equal(m.csp, true);
  assert.equal(m.appleTouchIcon, true);
  assert.equal(m.ogImage, true);
  assert.equal(m.canonical, true);
  assert.equal(m.jsonLd, false);
  assert.equal(m.manifest, '/x/manifest.webmanifest');
});

test('initialScripts : modules et modulepreload, sans doublon', () => {
  assert.deepEqual(initialScripts(HTML), [
    '/x/assets/index-abc.js',
    '/x/assets/vendor-def.js',
  ]);
});

test('manifestSummary : 512, maskable, id, lang — et « any » n’est pas un 512', () => {
  const ok = manifestSummary({
    name: 'Miss X',
    lang: 'fr',
    id: '/x/',
    display: 'standalone',
    start_url: '/x/',
    icons: [
      { src: 'i-192.png', sizes: '192x192', type: 'image/png' },
      {
        src: 'i-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [{ src: 's.png' }],
  });
  assert.equal(ok.has512, true);
  assert.equal(ok.hasPng, true);
  assert.equal(ok.maskable, true);
  assert.equal(ok.hasId, true);
  assert.equal(ok.screenshots, 1);
  assert.equal(ok.shortcuts, 0);

  // miss-lookhouse : deux SVG `any`, aucun PNG — iOS n'en fera pas une icône.
  const svg = manifestSummary(
    JSON.stringify({
      icons: [
        { src: 'i.svg', sizes: 'any', type: 'image/svg+xml' },
        { src: 'm.svg', sizes: 'any', purpose: 'maskable' },
      ],
    })
  );
  assert.equal(svg.has512, false);
  assert.equal(svg.hasAny, true, 'un vectoriel couvre toutes les tailles');
  assert.equal(svg.hasPng, false);
  assert.equal(svg.maskable, true);
  assert.equal(svg.hasId, false);

  assert.equal(manifestSummary('pas du json'), null);
});

test('resolveUrl : la racine de l’origine n’est pas la racine du site', () => {
  // miss-ticket-pwa lie `/manifest.json` : c'est la racine de l'ORIGINE,
  // où rien n'existe — le manifeste réel vit sous `/miss-ticket-pwa/`.
  const base = 'https://o.github.io/miss-ticket-pwa/';
  assert.equal(
    resolveUrl('/manifest.json', base),
    'https://o.github.io/manifest.json'
  );
  assert.equal(
    resolveUrl('manifest.json', base),
    'https://o.github.io/miss-ticket-pwa/manifest.json'
  );
  assert.equal(resolveUrl('https://cdn/x.json', base), 'https://cdn/x.json');
  assert.equal(resolveUrl(null, base), null);
});

test('isAppShell distingue la coquille de la page 404 de GitHub', () => {
  assert.equal(isAppShell(HTML), true);
  assert.equal(isAppShell('<h1>404</h1><p>File not found</p>'), false);
});

test('probe : un lien profond qui rend le corps d’index.html est une coquille, quel que soit l’élément racine', async () => {
  // mister-cim10 monte sur `id="react-root"` : `isAppShell` ne le reconnaît
  // pas, et la sonde le classait « page GitHub » alors que Pages lui servait
  // exactement son index (6 216 octets, relevé du 05/09/2026).
  const index = HTML.replace('id="root"', 'id="react-root"');
  const reponse = (body, status = 200) => ({
    ok: status < 400,
    status,
    headers: { get: () => null },
    text: async () => body,
    arrayBuffer: async () => new ArrayBuffer(0),
  });
  const fauxFetch = async url => {
    if (url.endsWith('/quelque-chose-qui-n-existe-pas'))
      return reponse(index, 404);
    if (url.endsWith('/miss-x/')) return reponse(index);
    return reponse('', 404);
  };
  const r = await probe('miss-x', fauxFetch);
  assert.equal(r.fallback, 'coquille');

  const pageGitHub = async url =>
    url.endsWith('/quelque-chose-qui-n-existe-pas')
      ? reponse('<h1>404</h1><p>File not found</p>', 404)
      : fauxFetch(url);
  assert.equal((await probe('miss-x', pageGitHub)).fallback, 'page GitHub');
});
