// Pages de contenu et image de partage de `pwaSeoPlugin` (vite-pwa-base.js).
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

import {
  contentPageHtml,
  faqFromMarkdown,
  findShareImage,
  imageDimensions,
  parseContentPage,
  pwaSeoPlugin,
  readContentPages,
  renderMarkdown,
  setShareImage,
  textOn,
} from '../vite-pwa-base.js';

/** Un JPEG réduit à ses en-têtes : SOI, APP0, puis le cadre SOF0. */
function jpeg(width, height) {
  return Buffer.from([
    0xff,
    0xd8,
    0xff,
    0xe0,
    0x00,
    0x10,
    ...Array(14).fill(0),
    0xff,
    0xc0,
    0x00,
    0x11,
    0x08,
    height >> 8,
    height & 255,
    width >> 8,
    width & 255,
    0x03,
    ...Array(9).fill(0),
  ]);
}

/** Un PNG réduit à sa signature et à son IHDR. */
function png(width, height) {
  const b = Buffer.alloc(33);
  Buffer.from('89504e470d0a1a0a', 'hex').copy(b, 0);
  b.writeUInt32BE(13, 8);
  b.write('IHDR', 12, 'ascii');
  b.writeUInt32BE(width, 16);
  b.writeUInt32BE(height, 20);
  return b;
}

const PAGE_MD = `---
title: Règles du Mölkky : le jeu et le score
description: Les règles du Mölkky expliquées simplement, et une app pour tenir le score.
date: 2026-09-25
---

# Règles du Mölkky

Le **Mölkky** se joue avec *douze* quilles. Voir [la FAQ](#questions-frequentes).

## Le score

1. Une quille seule : sa valeur.
2. Plusieurs quilles : leur nombre.

## Le score

- Atteindre 50
  exactement.
- Au-delà, retour à 25.

## Questions fréquentes

### Combien de joueurs ?

De deux à autant que l'on veut.

### Que faire après trois ratés ?

Le joueur est éliminé.
`;

const INDEX = `<!doctype html>
<html lang="fr">
  <head>
    <meta name="theme-color" content="#4a7c2a" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0b1a05" media="(prefers-color-scheme: dark)" />
    <link rel="icon" href="/mister-molkky/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/mister-molkky/icons/apple-touch-icon.png" />
    <link rel="manifest" href="/mister-molkky/manifest.webmanifest" />
    <title>Mister Mölkky — compteur de points de Mölkky</title>
    <meta name="description" content="Comptez les points d'une partie de Mölkky." />
    <meta property="og:image" content="https://mister-guiiug.github.io/mister-molkky/og-image.jpg?v=1" />
    <meta property="og:image:width" content="1200" />
    <meta name="twitter:card" content="summary_large_image" />
  </head>
  <body><div id="app"></div></body>
</html>`;

const HOME = 'https://mister-guiiug.github.io/mister-molkky/';

test('le Markdown court : titres ancrés, listes, marques en ligne', () => {
  const html = renderMarkdown(parseContentPage(PAGE_MD, 'regles.md').markdown);
  assert.match(html, /^<h1>Règles du Mölkky<\/h1>/);
  // Deux sections de même titre : deux ancres distinctes.
  assert.match(html, /<h2 id="le-score">Le score<\/h2>/);
  assert.match(html, /<h2 id="le-score-2">Le score<\/h2>/);
  assert.match(html, /<ol><li>Une quille seule : sa valeur\.<\/li><li>/);
  // Une ligne sans puce continue l'élément précédent.
  assert.match(html, /<ul><li>Atteindre 50 exactement\.<\/li><li>/);
  assert.match(html, /<strong>Mölkky<\/strong>/);
  assert.match(html, /<em>douze<\/em>/);
  assert.match(html, /<a href="#questions-frequentes">la FAQ<\/a>/);
  assert.match(html, /<h3 id="combien-de-joueurs">/);
});

test('aucun HTML ne passe, aucun lien dangereux non plus', () => {
  const html = renderMarkdown(
    [
      '# Titre <script>alert(1)</script>',
      '',
      'Un [piège](javascript:alert%281%29) et un [bon lien](https://example.org/a?b=1&c=2).',
      '',
      'Du `<b>code</b>` et une [page sœur](autre-page.html).',
    ].join('\n')
  );
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /&lt;script&gt;/);
  assert.doesNotMatch(html, /javascript:/, 'le lien piégé perd son adresse');
  assert.match(html, /Un piège et un/);
  assert.match(
    html,
    /<a href="https:\/\/example\.org\/a\?b=1&amp;c=2">bon lien<\/a>/
  );
  assert.match(html, /<code>&lt;b&gt;code&lt;\/b&gt;<\/code>/);
  assert.match(html, /<a href="autre-page\.html">page sœur<\/a>/);
});

test('la FAQ ne lit que la section « Questions fréquentes »', () => {
  const faq = faqFromMarkdown(
    `${PAGE_MD}\n## Après\n\n### Pas une question de la FAQ\n\nTexte.`
  );
  assert.deepEqual(faq, [
    {
      question: 'Combien de joueurs ?',
      reponse: "De deux à autant que l'on veut.",
    },
    {
      question: 'Que faire après trois ratés ?',
      reponse: 'Le joueur est éliminé.',
    },
  ]);
});

test('une page se lit : en-tête, slug du nom de fichier, h1, mots', () => {
  const p = parseContentPage(
    PAGE_MD.replace(/\n/g, '\r\n'),
    'regles-du-molkky.md'
  );
  assert.equal(p.slug, 'regles-du-molkky');
  assert.equal(p.title, 'Règles du Mölkky : le jeu et le score');
  assert.equal(p.date, '2026-09-25');
  assert.equal(p.titre, 'Règles du Mölkky');
  assert.equal(p.faq.length, 2);
  assert.ok(p.mots > 40, `${p.mots} mots`);
});

test('ce qui produirait une page fausse est refusé, avec le nom du fichier', () => {
  assert.throws(
    () => parseContentPage('# Sans en-tête', 'a.md'),
    /a\.md : en-tête manquant/
  );
  assert.throws(
    () => parseContentPage('---\ntitle: T\n---\n\n# H', 'b.md'),
    /b\.md : title et description sont requis/
  );
  assert.throws(
    () =>
      parseContentPage(
        '---\ntitle: T\ndescription: D\n---\n\n# Un\n\n# Deux',
        'c.md'
      ),
    /un seul titre « # … » attendu, 2 trouvé/
  );
  assert.throws(
    () =>
      parseContentPage('---\ntitle: T\ndescription: D\n---\n\n# H', 'index.md'),
    /slug « index » invalide/
  );
  assert.throws(
    () =>
      parseContentPage(
        '---\ntitle: T\ndescription: D\n---\n\n# H',
        'règles.md'
      ),
    /slug « règles » invalide/
  );
});

test('un dossier absent ne donne rien ; README et brouillons sont ignorés', () => {
  assert.deepEqual(readContentPages(join(tmpdir(), 'dwc-pas-de-pages')), []);
  const dossier = mkdtempSync(join(tmpdir(), 'dwc-pages-'));
  try {
    writeFileSync(join(dossier, 'README.md'), '# Notes');
    writeFileSync(join(dossier, '_brouillon.md'), '# Brouillon');
    writeFileSync(join(dossier, 'b.md'), PAGE_MD);
    writeFileSync(join(dossier, 'a.md'), PAGE_MD);
    assert.deepEqual(
      readContentPages(dossier).map(p => p.slug),
      ['a', 'b']
    );
    writeFileSync(
      join(dossier, 'c.md'),
      PAGE_MD.replace('date:', 'slug: a\ndate:')
    );
    assert.throws(
      () => readContentPages(dossier),
      /deux pages portent le slug « a »/
    );
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

test('la page est autonome : SEO complet, CSP, aucune exécution', () => {
  const page = parseContentPage(PAGE_MD, 'regles-du-molkky.md');
  const autre = parseContentPage(
    PAGE_MD.replace('# Règles du Mölkky', '# Le terrain'),
    'terrain.md'
  );
  const html = contentPageHtml({
    page,
    pages: [page, autre],
    indexHtml: INDEX,
    homeUrl: HOME,
  });
  const url = `${HOME}regles-du-molkky.html`;
  assert.match(html, /^<!doctype html>\n<html lang="fr">/);
  assert.match(html, /<title>Règles du Mölkky : le jeu et le score<\/title>/);
  assert.ok(html.includes(`<link rel="canonical" href="${url}" />`));
  assert.match(html, /Content-Security-Policy" content="default-src 'none';/);
  assert.match(
    html,
    /<meta name="theme-color" content="#4a7c2a" \/>/,
    'la couleur CLAIRE'
  );
  // L'image et la carte de l'accueil, reprises.
  assert.match(
    html,
    /og:image" content="https:\/\/mister-guiiug\.github\.io\/mister-molkky\/og-image\.jpg\?v=1"/
  );
  assert.match(html, /og:image:width" content="1200"/);
  assert.match(html, /twitter:card" content="summary_large_image"/);
  assert.match(html, /<link rel="icon" href="\/mister-molkky\/favicon\.svg"/);
  assert.doesNotMatch(html, /rel="manifest"/);
  // Aucun script exécutable : le seul <script> est le JSON-LD.
  assert.equal(html.match(/<script\b/g).length, 1);
  const ld = JSON.parse(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]
  );
  const types = ld['@graph'].map(n => n['@type']);
  assert.deepEqual(types, ['Article', 'BreadcrumbList', 'FAQPage']);
  assert.equal(ld['@graph'][0].dateModified, '2026-09-25');
  assert.equal(ld['@graph'][0].about.name, 'Mister Mölkky');
  assert.equal(ld['@graph'][1].itemListElement[2].item, url);
  assert.equal(ld['@graph'][2].mainEntity.length, 2);
  // L'encadré mène à l'app, la liste mène à l'autre page, pas à elle-même.
  assert.match(
    html,
    /<a href="https:\/\/mister-guiiug\.github\.io\/mister-molkky\/">Ouvrir Mister Mölkky<\/a>/
  );
  assert.match(html, /<li><a href="terrain\.html">Le terrain<\/a><\/li>/);
  assert.doesNotMatch(html, /href="regles-du-molkky\.html"/);
  // Le texte du bouton contraste avec la couleur du thème.
  assert.match(html, /--accent:#4a7c2a;--sur-accent:#ffffff/);
});

test('textOn : noir sur clair, blanc sur foncé', () => {
  assert.equal(textOn('#ffffff'), '#111111');
  assert.equal(textOn('#f4f5fb'), '#111111');
  assert.equal(textOn('#000000'), '#ffffff');
  assert.equal(textOn('#4a7c2a'), '#ffffff');
  assert.equal(textOn('pas une couleur'), '#ffffff');
});

test('imageDimensions lit un PNG et un JPEG, et rien d’autre', () => {
  assert.deepEqual(imageDimensions(png(1200, 630)), {
    width: 1200,
    height: 630,
    type: 'image/png',
  });
  assert.deepEqual(imageDimensions(jpeg(1200, 630)), {
    width: 1200,
    height: 630,
    type: 'image/jpeg',
  });
  assert.equal(imageDimensions(Buffer.from('GIF89a'.padEnd(40, '\0'))), null);
});

test('l’image de partage remplace les balises écrites à la main, même sur plusieurs lignes', () => {
  const page = `<html><head>
    <meta property="og:image" content="__SEO_LOGO_URL__" />
    <meta
      property="og:image:alt"
      content="icône"
    />
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content="garde-moi" />
    <meta name="twitter:image" content="x" />
  </head><body></body></html>`;
  const image = {
    url: `${HOME}og-image.jpg?v=abc`,
    width: 1200,
    height: 630,
    type: 'image/jpeg',
    alt: 'A & B',
  };
  const out = setShareImage(page, image);
  assert.equal(out.match(/og:image"/g).length, 1);
  assert.equal(out.match(/twitter:card/g).length, 1);
  assert.match(out, /twitter:card" content="summary_large_image"/);
  assert.match(out, /og:image:alt" content="A &amp; B"/);
  assert.match(
    out,
    /twitter:title" content="garde-moi"/,
    'les autres balises restent'
  );
  assert.doesNotMatch(out, /icône/);
  assert.doesNotMatch(
    out,
    /\n\s*\n\s*\n/,
    'aucune ligne vide laissée par les balises retirées'
  );
  // Deux passes : toujours un seul jeu.
  assert.equal(setShareImage(out, image).match(/og:image"/g).length, 1);
});

test('findShareImage : JPEG d’abord, empreinte du contenu dans l’URL', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'dwc-og-'));
  try {
    assert.equal(findShareImage({ publicDir: dossier, homeUrl: HOME }), null);
    writeFileSync(join(dossier, 'og-image.png'), png(1200, 630));
    writeFileSync(join(dossier, 'og-image.jpg'), jpeg(1200, 630));
    const image = findShareImage({ publicDir: dossier, homeUrl: HOME });
    assert.match(
      image.url,
      /^https:\/\/mister-guiiug\.github\.io\/mister-molkky\/og-image\.jpg\?v=[0-9a-f]{8}$/
    );
    assert.equal(image.type, 'image/jpeg');
    assert.equal(findShareImage({ publicDir: '', homeUrl: HOME }), null);
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

test('au build : pages écrites, listées, au plan de site ; l’image de partage posée', async () => {
  const racine = mkdtempSync(join(tmpdir(), 'dwc-app-'));
  const dist = join(racine, 'dist');
  try {
    mkdirSync(join(racine, 'content', 'pages'), { recursive: true });
    mkdirSync(join(racine, 'public'), { recursive: true });
    mkdirSync(dist);
    writeFileSync(
      join(racine, 'content', 'pages', 'regles-du-molkky.md'),
      PAGE_MD
    );
    writeFileSync(
      join(racine, 'content', 'pages', 'terrain.md'),
      PAGE_MD.replace('# Règles du Mölkky', '# Le terrain')
    );
    writeFileSync(join(racine, 'public', 'og-image.jpg'), jpeg(1200, 630));

    const plugin = pwaSeoPlugin({ basePath: '/mister-molkky/', robots: false });
    plugin.configResolved({
      command: 'build',
      root: racine,
      publicDir: join(racine, 'public'),
      build: { outDir: dist },
    });
    const source = INDEX.replace(
      /<meta property="og:image"[\s\S]*?summary_large_image" \/>/,
      '<meta property="og:image" content="__SEO_LOGO_URL__" />\n    <meta name="twitter:card" content="summary" />'
    );
    const index = plugin.transformIndexHtml(source);
    assert.equal(index.match(/og:image"/g).length, 1);
    assert.match(
      index,
      /og:image" content="https:\/\/mister-guiiug\.github\.io\/mister-molkky\/og-image\.jpg\?v=/
    );
    assert.match(index, /og:image:height" content="630"/);
    assert.match(index, /twitter:card" content="summary_large_image"/);
    // Le WebApplication prend l'image de partage.
    assert.match(
      index,
      /"image":"https:\/\/mister-guiiug\.github\.io\/mister-molkky\/og-image\.jpg\?v=/
    );
    // Le contenu servi liste les pages.
    assert.match(
      index,
      /<ul><li><a href="https:\/\/mister-guiiug\.github\.io\/mister-molkky\/regles-du-molkky\.html">Règles du Mölkky<\/a><\/li><li><a href="[^"]*terrain\.html">Le terrain<\/a><\/li><\/ul>/
    );

    writeFileSync(join(dist, 'index.html'), index);
    plugin.writeBundle({ dir: dist });
    const page = readFileSync(join(dist, 'regles-du-molkky.html'), 'utf8');
    assert.match(page, /twitter:card" content="summary_large_image"/);
    assert.ok(existsSync(join(dist, 'terrain.html')));

    await plugin.closeBundle();
    const xml = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
    assert.equal(xml.match(/<url>/g).length, 3);
    assert.match(
      xml,
      /<loc>https:\/\/mister-guiiug\.github\.io\/mister-molkky\/regles-du-molkky\.html<\/loc>/
    );

    // Un fichier déjà construit sous ce nom : refus, plutôt qu'écraser.
    assert.throws(
      () => plugin.writeBundle({ dir: dist }),
      /regles-du-molkky\.html existe déjà/
    );
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test('contentPages: false et ogImage: false coupent tout', async () => {
  const racine = mkdtempSync(join(tmpdir(), 'dwc-app-'));
  try {
    mkdirSync(join(racine, 'content', 'pages'), { recursive: true });
    mkdirSync(join(racine, 'public'));
    writeFileSync(join(racine, 'content', 'pages', 'a.md'), PAGE_MD);
    writeFileSync(join(racine, 'public', 'og-image.jpg'), jpeg(1200, 630));
    const plugin = pwaSeoPlugin({
      basePath: '/mister-molkky/',
      contentPages: false,
      ogImage: false,
      robots: false,
    });
    plugin.configResolved({
      command: 'build',
      root: racine,
      build: { outDir: join(racine, 'dist') },
    });
    const index = plugin.transformIndexHtml(
      INDEX.replace('og-image.jpg?v=1', 'autre.png')
    );
    assert.match(index, /autre\.png/);
    assert.doesNotMatch(index, /<ul>/);
    await plugin.closeBundle();
    assert.equal(
      readFileSync(join(racine, 'dist', 'sitemap.xml'), 'utf8').match(/<url>/g)
        .length,
      1
    );
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});
