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
  contentPageFiles,
  contentPageHtml,
  faqFromMarkdown,
  findShareImage,
  formatLongDate,
  imageDimensions,
  parseContentPage,
  pwaSeoPlugin,
  readContentPages,
  relatedApps,
  renderMarkdown,
  setShareImage,
  textOn,
} from '../vite-pwa-base.js';

// L'état SEO écrit `seo-changed.json` HORS du dossier de sortie : ici, dans un
// dossier temporaire, et pas dans le `node_modules` du dépôt.
process.env.PWA_SEO_CHANGED_FILE = join(
  mkdtempSync(join(tmpdir(), 'seo-changed-')),
  'seo-changed.json'
);
delete process.env.PWA_SEO_PREVIOUS_STATE;

/** Le JSON-LD d'une page. */
function jsonLdDe(html) {
  return JSON.parse(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(html)[1]
  );
}

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
  assert.doesNotMatch(html, /<script>/i);
  assert.match(html, /&lt;script&gt;/i);
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
  const ld = jsonLdDe(html);
  const types = ld['@graph'].map(n => n['@type']);
  assert.deepEqual(types, [
    'Article',
    'BreadcrumbList',
    'FAQPage',
    'Organization',
  ]);
  const article = ld['@graph'][0];
  assert.equal(article.datePublished, '2026-09-25');
  assert.equal(article.dateModified, '2026-09-25', 'sans updated : la date');
  // UN SEUL GRAPHE : l'éditeur, l'app et le site par leur @id.
  const org = { '@id': 'https://mister-guiiug.github.io/#org' };
  assert.deepEqual(article.author, org);
  assert.deepEqual(article.publisher, org);
  assert.deepEqual(article.about, { '@id': `${HOME}#app` });
  assert.deepEqual(article.isPartOf, {
    '@id': 'https://mister-guiiug.github.io/#site',
  });
  assert.equal(ld['@graph'][3]['@id'], org['@id']);
  assert.equal(ld['@graph'][1].itemListElement[2].item, url);
  assert.equal(ld['@graph'][2].mainEntity.length, 2);
  // Open Graph : `fr_FR`, les dates de l'article, un alt qui décrit LA PAGE.
  assert.match(html, /og:locale" content="fr_FR"/);
  assert.match(html, /article:published_time" content="2026-09-25"/);
  assert.match(html, /article:modified_time" content="2026-09-25"/);
  assert.match(
    html,
    /og:image:alt" content="Règles du Mölkky : le jeu et le score"/
  );
  // La signature, visible sous le titre, et liée à la page de l'auteur.
  assert.match(
    html,
    /<h1>Règles du Mölkky<\/h1>\n<p class="signature">Publié le <time datetime="2026-09-25">25 septembre 2026<\/time> · par <a href="https:\/\/mister-guiiug\.github\.io\/a-propos\.html" rel="author">mister-guiiug<\/a><\/p>/
  );
  // Sans traduction : aucun hreflang.
  assert.doesNotMatch(html, /hreflang/);
  // L'encadré mène à l'app, la liste mène à l'autre page, pas à elle-même.
  assert.match(
    html,
    /<a href="https:\/\/mister-guiiug\.github\.io\/mister-molkky\/">Ouvrir Mister Mölkky<\/a>/
  );
  assert.match(html, /<li><a href="terrain\.html">Le terrain<\/a><\/li>/);
  assert.doesNotMatch(html, /href="regles-du-molkky\.html"/);
  // Le texte du bouton contraste avec la couleur du thème.
  assert.match(html, /--accent:#4a7c2a;--sur-accent:#ffffff/);
  // Avant le pied de page, les apps sœurs du catalogue.
  assert.match(html, /<h2 id="dwc-voisines">Dans la même catégorie<\/h2>/);
  for (const a of relatedApps('mister-molkky').apps)
    assert.ok(
      html.includes(`<a href="${a.appUrl}">${a.name}</a> — `),
      `${a.id} absent`
    );
  assert.ok(html.indexOf('dwc-voisines') < html.indexOf('<footer>'));
});

test('answer : « En bref. » sous le titre, et abstract ; updated : « Mis à jour le »', () => {
  const md = PAGE_MD.replace(
    'date: 2026-09-25',
    'date: 2026-09-25\nupdated: 2026-10-01\nanswer: « Le premier à 50 points **pile** gagne ; au-delà, on retombe à 25. »'
  );
  const page = parseContentPage(md, 'regles-du-molkky.md');
  assert.equal(
    page.answer,
    'Le premier à 50 points **pile** gagne ; au-delà, on retombe à 25.'
  );
  // Les mots, pas la ponctuation que la typographie française isole (« ; »).
  assert.equal(page.motsReponse, 12);
  assert.equal(page.updated, '2026-10-01');
  const html = contentPageHtml({ page, indexHtml: INDEX, homeUrl: HOME });
  assert.match(
    html,
    /Publié le <time datetime="2026-09-25">25 septembre 2026<\/time> · Mis à jour le <time datetime="2026-10-01">1er octobre 2026<\/time> · par /
  );
  assert.match(
    html,
    /<p class="en-bref"><strong>En bref\.<\/strong> Le premier à 50 points <strong>pile<\/strong> gagne/
  );
  // Signature, puis « En bref », puis le texte.
  assert.ok(html.indexOf('signature') < html.indexOf('en-bref'));
  assert.ok(html.indexOf('en-bref') < html.indexOf('se joue avec'));
  const article = jsonLdDe(html)['@graph'][0];
  assert.equal(
    article.abstract,
    'Le premier à 50 points pile gagne ; au-delà, on retombe à 25.'
  );
  assert.equal(article.dateModified, '2026-10-01');
  assert.match(html, /article:modified_time" content="2026-10-01"/);
});

test('une date qui n’en est pas une est refusée, en nommant le fichier', () => {
  assert.throws(
    () => parseContentPage(PAGE_MD.replace('2026-09-25', '25/09/2026'), 'r.md'),
    /r\.md : date « 25\/09\/2026 » n’est pas une date AAAA-MM-JJ/
  );
  assert.throws(
    () =>
      parseContentPage(
        PAGE_MD.replace('date: 2026-09-25', 'updated: 2026-02-30'),
        'r.md'
      ),
    /updated « 2026-02-30 »/
  );
});

test('formatLongDate : format long de la langue, sans fuseau', () => {
  assert.equal(formatLongDate('2026-09-25'), '25 septembre 2026');
  assert.equal(formatLongDate('2026-10-01', 'fr'), '1er octobre 2026');
  assert.equal(formatLongDate('2026-09-25', 'en'), 'September 25, 2026');
  assert.equal(formatLongDate('pas une date'), 'pas une date');
});

/** Une page anglaise qui traduit `regles-du-molkky`. */
const PAGE_EN = `---
title: Mölkky rules: the game and the score
description: The Mölkky rules explained simply, and an app to keep the score.
date: 2026-09-26
translation: regles-du-molkky
answer: "The first player to reach exactly 50 points wins; going over sends you back to 25."
---

# Mölkky rules

The game is played with *twelve* pins. See [the French page](../regles-du-molkky.html).

## Frequently asked questions

### How many players?

Two or more.

## References

- Official rules: https://www.molkky.com/rules.
`;

test('traduction : hreflang RÉCIPROQUES, x-default vers la française, lien visible', () => {
  const racine = mkdtempSync(join(tmpdir(), 'dwc-pages-en-'));
  try {
    mkdirSync(join(racine, 'en'));
    writeFileSync(join(racine, 'regles-du-molkky.md'), PAGE_MD);
    writeFileSync(join(racine, 'en', 'molkky-rules.md'), PAGE_EN);
    const pages = readContentPages(racine);
    assert.deepEqual(
      pages.map(p => [p.lang, p.chemin]),
      [
        ['fr', 'regles-du-molkky.html'],
        ['en', 'en/molkky-rules.html'],
      ]
    );
    const [fr, en] = pages;
    const htmlFr = contentPageHtml({
      page: fr,
      pages,
      indexHtml: INDEX,
      homeUrl: HOME,
    });
    const htmlEn = contentPageHtml({
      page: en,
      pages,
      indexHtml: INDEX,
      homeUrl: HOME,
    });
    const urlFr = `${HOME}regles-du-molkky.html`;
    const urlEn = `${HOME}en/molkky-rules.html`;
    for (const html of [htmlFr, htmlEn]) {
      assert.ok(
        html.includes(`<link rel="alternate" hreflang="fr" href="${urlFr}" />`)
      );
      assert.ok(
        html.includes(`<link rel="alternate" hreflang="en" href="${urlEn}" />`)
      );
      assert.ok(
        html.includes(
          `<link rel="alternate" hreflang="x-default" href="${urlFr}" />`
        )
      );
    }
    // La page anglaise se déclare en anglais, partout.
    assert.match(htmlEn, /^<!doctype html>\n<html lang="en">/);
    assert.match(htmlEn, /og:locale" content="en_US"/);
    assert.match(htmlEn, /og:locale:alternate" content="fr_FR"/);
    assert.ok(htmlEn.includes(`<link rel="canonical" href="${urlEn}" />`));
    assert.match(
      htmlEn,
      /<p class="signature">Published <time datetime="2026-09-26">September 26, 2026<\/time> · by <a /
    );
    assert.match(htmlEn, /<strong>In short\.<\/strong> The first player/);
    assert.match(htmlEn, /<nav aria-label="Breadcrumb">/);
    assert.match(htmlEn, /<h2 id="dwc-voisines">In the same category<\/h2>/);
    assert.doesNotMatch(htmlEn, /Dans la même catégorie| — Suivi/);
    assert.match(
      htmlEn,
      /<p class="langue" lang="fr"><a href="[^"]*regles-du-molkky\.html" hreflang="fr">Lire en français<\/a><\/p>/
    );
    assert.match(
      htmlFr,
      /<p class="langue" lang="en"><a href="[^"]*en\/molkky-rules\.html" hreflang="en">Read in English<\/a><\/p>/
    );
    // Le lien relatif `../` est sûr depuis `en/`.
    assert.match(
      htmlEn,
      /<a href="\.\.\/regles-du-molkky\.html">the French page<\/a>/
    );
    // La FAQ anglaise se lit sous « Frequently asked questions ».
    const ldEn = jsonLdDe(htmlEn)['@graph'];
    assert.equal(ldEn[0].inLanguage, 'en');
    assert.deepEqual(ldEn[0].translationOfWork, { '@id': urlFr });
    assert.deepEqual(jsonLdDe(htmlFr)['@graph'][0].workTranslation, {
      '@id': urlEn,
    });
    assert.equal(ldEn.find(n => n['@type'] === 'FAQPage').mainEntity.length, 1);
    // Les références : rendues à part, l'URL nue devenue un lien, en citation.
    assert.match(
      htmlEn,
      /<section class="sources">\n<h2 id="references">References<\/h2>\n<ul><li>Official rules: <a href="https:\/\/www\.molkky\.com\/rules">https:\/\/www\.molkky\.com\/rules<\/a>\.<\/li><\/ul>\n<\/section>/
    );
    assert.deepEqual(ldEn[0].citation, ['https://www.molkky.com/rules']);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test('une traduction orpheline, ou en double, fait échouer la lecture', () => {
  const racine = mkdtempSync(join(tmpdir(), 'dwc-pages-en-'));
  try {
    mkdirSync(join(racine, 'en'));
    writeFileSync(join(racine, 'en', 'rules.md'), PAGE_EN);
    assert.throws(
      () => readContentPages(racine),
      /en\/rules\.md : translation « regles-du-molkky » ne désigne aucune page française/
    );
    writeFileSync(join(racine, 'regles-du-molkky.md'), PAGE_MD);
    writeFileSync(join(racine, 'en', 'rules-bis.md'), PAGE_EN);
    assert.throws(
      () => readContentPages(racine),
      /en\/rules-bis\.md et en\/rules\.md traduisent la même page|en\/rules\.md et en\/rules-bis\.md traduisent la même page/
    );
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test('contentPageFiles : les fichiers publiés, et eux seuls', () => {
  const racine = mkdtempSync(join(tmpdir(), 'dwc-pages-'));
  try {
    mkdirSync(join(racine, 'en'));
    for (const f of ['README.md', '_brouillon.md', 'a.md', 'notes.txt'])
      writeFileSync(join(racine, f), PAGE_MD);
    for (const f of ['README.md', 'b.md'])
      writeFileSync(join(racine, 'en', f), PAGE_MD);
    assert.deepEqual(contentPageFiles(racine), ['a.md', 'en/b.md']);
    assert.deepEqual(contentPageFiles(join(racine, 'absent')), []);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test('la section des sources : un bloc à part, qui se referme au titre suivant', () => {
  const html = renderMarkdown(
    [
      '# T',
      '',
      '## Sources',
      '',
      '- [OMS](https://www.who.int/fr) : la classification.',
      '- ATIH : https://www.atih.sante.fr/cim-10-fr.',
      '',
      '## Après',
      '',
      'Une URL ici https://exemple.org reste du texte.',
    ].join('\n')
  );
  assert.match(
    html,
    /<section class="sources">\n<h2 id="sources">Sources<\/h2>\n<ul><li><a href="https:\/\/www\.who\.int\/fr">OMS<\/a> : la classification\.<\/li><li>ATIH : <a href="https:\/\/www\.atih\.sante\.fr\/cim-10-fr">https:\/\/www\.atih\.sante\.fr\/cim-10-fr<\/a>\.<\/li><\/ul>\n<\/section>\n<h2 id="apres">Après<\/h2>/
  );
  assert.match(
    html,
    /<p>Une URL ici https:\/\/exemple\.org reste du texte\.<\/p>/
  );
  const avecSources = [
    '---',
    'title: T',
    'description: D',
    '---',
    '',
    '# T',
    '',
    '## Sources',
    '',
    '- [OMS](https://www.who.int/fr)',
    '- https://www.atih.sante.fr/cim-10-fr',
  ].join('\n');
  assert.deepEqual(parseContentPage(avecSources, 's.md').sources, [
    'https://www.who.int/fr',
    'https://www.atih.sante.fr/cim-10-fr',
  ]);
});

test('au build : les pages anglaises sous en/, au plan de site et au contenu servi', async () => {
  const racine = mkdtempSync(join(tmpdir(), 'dwc-app-en-'));
  const dist = join(racine, 'dist');
  try {
    mkdirSync(join(racine, 'content', 'pages', 'en'), { recursive: true });
    mkdirSync(dist);
    writeFileSync(
      join(racine, 'content', 'pages', 'regles-du-molkky.md'),
      PAGE_MD
    );
    writeFileSync(
      join(racine, 'content', 'pages', 'en', 'molkky-rules.md'),
      PAGE_EN
    );
    const plugin = pwaSeoPlugin({ basePath: '/mister-molkky/' });
    plugin.configResolved({
      command: 'build',
      root: racine,
      build: { outDir: dist },
    });
    plugin.buildStart();
    const index = plugin.transformIndexHtml(INDEX);
    assert.match(
      index,
      /<li lang="en"><a href="https:\/\/mister-guiiug\.github\.io\/mister-molkky\/en\/molkky-rules\.html" hreflang="en">Mölkky rules<\/a><\/li>/
    );
    writeFileSync(join(dist, 'index.html'), index);
    plugin.writeBundle({ dir: dist });
    assert.ok(existsSync(join(dist, 'en', 'molkky-rules.html')));
    await plugin.closeBundle();
    const xml = readFileSync(join(dist, 'sitemap.xml'), 'utf8');
    assert.equal(xml.match(/<url>/g).length, 3);
    assert.match(
      xml,
      /<loc>https:\/\/mister-guiiug\.github\.io\/mister-molkky\/en\/molkky-rules\.html<\/loc>\n\s*<lastmod>2026-09-26<\/lastmod>/
    );
    // La date éditoriale fixe le `lastmod` de la page française aussi.
    assert.match(
      xml,
      /regles-du-molkky\.html<\/loc>\n\s*<lastmod>2026-09-25<\/lastmod>/
    );
    // Une route ne peut pas prendre la place des pages anglaises.
    const fautif = pwaSeoPlugin({
      basePath: '/mister-molkky/',
      routes: ['en'],
    });
    fautif.configResolved({
      command: 'build',
      root: racine,
      build: { outDir: dist },
    });
    assert.throws(
      () => fautif.buildStart(),
      /en\/ porte les pages de contenu anglaises/
    );
    const collision = pwaSeoPlugin({
      basePath: '/mister-molkky/',
      routes: ['regles-du-molkky'],
    });
    collision.configResolved({
      command: 'build',
      root: racine,
      build: { outDir: dist },
    });
    assert.throws(
      () => collision.buildStart(),
      /en collision avec la page de contenu regles-du-molkky\.md/
    );
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
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
    // Aucune page de contenu listée — les apps sœurs, elles, le restent.
    assert.doesNotMatch(index, /\/a\.html/);
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
