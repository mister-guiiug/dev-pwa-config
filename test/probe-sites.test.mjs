// `scripts/site-readers.mjs` — les lectures pures de la sonde des sites et de
// `pwa-doctor`. Le réseau ne se teste pas ; ce qu'on fait d'une réponse, si.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dansPorteeManifeste,
  htmlMarkers,
  initialScripts,
  isAppShell,
  manifestSummary,
  problemePorteeHubPublie,
  resolveUrl,
} from '../scripts/site-readers.mjs';
import { probe, probeHub } from '../scripts/probe-sites.mjs';

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
    id: 'https://o.github.io/x/',
    scope: '/x/',
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
  assert.equal(ok.idAbsolu, true);
  assert.equal(ok.scope, '/x/');
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
  assert.equal(svg.idAbsolu, false);

  assert.equal(manifestSummary('pas du json'), null);
});

test('problemePorteeHubPublie refuse scope « / » et un préfixe d’app', () => {
  const origin = 'https://mister-guiiug.github.io';
  const appIds = ['mister-settle', 'miss-contraction'];
  assert.equal(
    problemePorteeHubPublie(
      { scope: `${origin}/index.html` },
      { origin, appIds }
    ),
    null
  );
  assert.equal(
    problemePorteeHubPublie({ scope: '/' }, { origin, appIds })?.code,
    'scope-racine'
  );
  assert.ok(
    dansPorteeManifeste(
      `${origin}/mister-settle/`,
      `${origin}/mister-`,
      origin
    )
  );
  const apps = problemePorteeHubPublie(
    { scope: `${origin}/mister-` },
    { origin, appIds }
  );
  assert.equal(apps?.code, 'scope-apps');
  assert.deepEqual(apps.apps, ['mister-settle']);
});

test('probeHub échoue si le manifeste publié a une portée racine', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    text: async () =>
      JSON.stringify({
        id: 'https://mister-guiiug.github.io/',
        scope: 'https://mister-guiiug.github.io/',
        start_url: 'https://mister-guiiug.github.io/index.html',
      }),
  });
  const hub = await probeHub(fetchImpl);
  assert.equal(hub.status, 200);
  assert.equal(hub.probleme?.code, 'scope-racine');
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

/* ── Les lectures du référencement, et le mode `--seo` (29/09/2026) ─────── */

test('visibleText : ce qu’un robot sans JavaScript lit, entités décodées', async () => {
  const { visibleText } = await import('../scripts/site-readers.mjs');
  const texte = visibleText(
    '<html><head><title>T</title><style>p{x:1}</style><script>var a="<p>";</script>' +
      '<script type="application/ld+json">{"name":"caché"}</script></head>' +
      '<body><!-- note --><h1>Règles&nbsp;du&#160;jeu</h1><p>A &amp; B</p>' +
      '<template><p>modèle</p></template><noscript>Sans JS</noscript></body></html>'
  );
  assert.equal(texte, 'T Règles du jeu A & B Sans JS');
});

test('jsonLdTypes : les types de tête et ceux du @graph, sans doublon', async () => {
  const { jsonLdTypes } = await import('../scripts/site-readers.mjs');
  const html =
    '<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebApplication"},{"@type":"Organization"}]}</script>' +
    '<script type="application/ld+json">{"@type":["Article","WebApplication"]}</script>' +
    '<script type="application/ld+json">pas du json</script>';
  assert.deepEqual(jsonLdTypes(html), [
    'WebApplication',
    'Organization',
    'Article',
  ]);
});

test('hreflangLinks et hreflangCollisions : deux langues, une URL, c’est un défaut', async () => {
  const { hreflangCollisions, hreflangLinks } =
    await import('../scripts/site-readers.mjs');
  const liens = hreflangLinks(
    '<link rel="alternate" hreflang="fr" href="https://o/a/" />' +
      '<link\n  rel="alternate"\n  hreflang="en"\n  href="https://o/a/" />' +
      '<link rel="alternate" hreflang="x-default" href="https://o/a/" />' +
      '<link rel="alternate icon" href="/favicon.ico" />'
  );
  assert.equal(liens.length, 3);
  assert.deepEqual(hreflangCollisions(liens), ['fr = en → https://o/a/']);
  // x-default désigne, par construction, l'URL d'une des langues.
  assert.deepEqual(
    hreflangCollisions([
      { lang: 'fr', href: 'https://o/a.html' },
      { lang: 'en', href: 'https://o/en/a.html' },
      { lang: 'x-default', href: 'https://o/a.html' },
    ]),
    []
  );
});

test('servedContentWords : les mots du contenu servi, sans le noscript', async () => {
  const { servedContentWords } = await import('../scripts/site-readers.mjs');
  assert.equal(
    servedContentWords(
      '<div id="app"><div data-dwc="served-content"><h1>Miss Dice - lanceur</h1><p>Lancer un dé.</p><noscript><p>Il faut JavaScript.</p></noscript></div></div>'
    ),
    6
  );
  assert.equal(servedContentWords('<div id="app"></div>'), 0);
});

test('probe --seo : longueurs, JSON-LD, contenu servi, pages et hreflang', async () => {
  const { probe, seoLine, sitemapLocs } =
    await import('../scripts/probe-sites.mjs');
  const base = 'https://mister-guiiug.github.io/miss-x/';
  const accueil = HTML.replace(
    '<body><div id="root"></div></body>',
    '<body><div id="root"><div data-dwc="served-content"><h1>Miss X</h1><p>Une app.</p></div></div></body>'
  ).replace(
    '</head>',
    '<script type="application/ld+json">{"@graph":[{"@type":"WebApplication"},{"@type":"Organization"}]}</script></head>'
  );
  const plan = `<urlset><url><loc>${base}</loc></url><url><loc>${base}regles.html</loc></url><url><loc>${base}en/rules.html</loc></url><url><loc>${base}absente.html</loc></url></urlset>`;
  const pageTraduite =
    '<html><head><link rel="alternate" hreflang="fr" href="x" /><link rel="alternate" hreflang="en" href="y" /><script type="application/ld+json">{"@type":"Article"}</script></head></html>';
  const reponse = (body, status = 200) => ({
    ok: status < 400,
    status,
    headers: { get: () => null },
    text: async () => body,
    arrayBuffer: async () => new ArrayBuffer(0),
  });
  const fauxFetch = async url => {
    if (url === base) return reponse(accueil);
    if (url === `${base}sitemap.xml`) return reponse(plan);
    if (url.endsWith('/regles.html') || url.endsWith('/en/rules.html'))
      return reponse(pageTraduite);
    return reponse('', 404);
  };
  assert.deepEqual(sitemapLocs(plan).length, 4);
  const r = await probe('miss-x', fauxFetch, { seo: true });
  assert.equal(r.seo.titleLength, 6);
  assert.equal(r.seo.descriptionLength, 7);
  assert.deepEqual(r.seo.jsonLdTypes, ['WebApplication', 'Organization']);
  assert.equal(r.seo.servedWords, 4);
  assert.deepEqual(
    r.seo.pages.map(p => [p.en, p.status, p.hreflang]),
    [
      [false, 200, 2],
      [true, 200, 2],
      [false, 404, 0],
    ]
  );
  assert.equal(
    seoLine(r),
    'miss-x              titre=6c  desc=7c  ld=WebApplication+Organization  servi=4 mots  pages=1/2  en=1/1  hreflang=accueil:0 pages:2/3'
  );
  // Sans `--seo`, la sonde reste ce qu'elle était.
  assert.equal((await probe('miss-x', fauxFetch)).seo, undefined);
});
