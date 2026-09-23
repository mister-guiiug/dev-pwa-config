import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  jsonLdScript,
  pwaSeoPlugin,
  SCHEMA_APPLICATION_CATEGORIES,
  webApplicationJsonLd,
} from '../vite-pwa-base.js';
import { CATEGORIES } from '../apps-catalog.js';

/** Le JSON-LD injecté dans une page, ou `null`. */
function jsonLdDe(html) {
  const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(
    html
  );
  return m ? JSON.parse(m[1]) : null;
}

const PAGE = `<!doctype html>
<html lang="fr">
  <head>
    <title>Miss Dice - lance un dé</title>
    <meta name="description" content="Lancer un dé d'un geste, hors ligne." />
    <meta property="og:image" content="__SEO_LOGO_URL__" />
  </head>
  <body><div id="root"></div></body>
</html>`;

test('pwaSeoPlugin injecte un WebApplication tiré du catalogue et de la page', () => {
  const out = pwaSeoPlugin({
    basePath: '/miss-dice/',
    logoPath: '/favicon.svg',
  }).transformIndexHtml(PAGE);
  const d = jsonLdDe(out);
  assert.ok(d, 'aucun JSON-LD injecté');
  assert.equal(d['@type'], 'WebApplication');
  // Le NOM vient du catalogue, pas du <title> ; la DESCRIPTION vient de la
  // page, apostrophe comprise — le motif `[^"']*` la coupait à « d ».
  assert.equal(d.name, 'Miss Dice');
  assert.equal(d.description, "Lancer un dé d'un geste, hors ligne.");
  assert.equal(d.url, 'https://mister-guiiug.github.io/miss-dice/');
  assert.equal(
    d.image,
    'https://mister-guiiug.github.io/miss-dice/favicon.svg'
  );
  assert.equal(d.applicationCategory, 'GameApplication');
  assert.equal(d.inLanguage, 'fr');
  assert.deepEqual(d.offers, {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
  });
  assert.deepEqual(d.sameAs, ['https://github.com/mister-guiiug/miss-dice']);
  // Dans <head>, pas ailleurs.
  assert.ok(out.indexOf('application/ld+json') < out.indexOf('</head>'));
});

test('une page qui porte déjà ses données structurées est laissée telle quelle', () => {
  const page = PAGE.replace(
    '</head>',
    '<script type="application/ld+json">{"@type":"Thing"}</script></head>'
  );
  const out = pwaSeoPlugin({ basePath: '/miss-dice/' }).transformIndexHtml(
    page
  );
  assert.equal(out.match(/application\/ld\+json/g).length, 1);
});

test('jsonLd: false coupe l’injection ; un objet surcharge', () => {
  const coupe = pwaSeoPlugin({ basePath: '/miss-dice/', jsonLd: false });
  assert.equal(jsonLdDe(coupe.transformIndexHtml(PAGE)), null);

  const surcharge = pwaSeoPlugin({
    basePath: '/miss-dice/',
    jsonLd: { applicationCategory: 'EntertainmentApplication' },
  });
  assert.equal(
    jsonLdDe(surcharge.transformIndexHtml(PAGE)).applicationCategory,
    'EntertainmentApplication'
  );
});

test('une image qui n’est que l’URL d’accueil est remplacée par l’icône du catalogue', () => {
  // Le repli de `__SEO_LOGO_URL__` sans `logoPath` est l'URL d'accueil : c'est
  // ce que servait `miss-carbook` en `og:image` le 23/09/2026.
  const out = pwaSeoPlugin({ basePath: '/miss-carbook/' }).transformIndexHtml(
    PAGE
  );
  assert.equal(
    jsonLdDe(out).image,
    'https://mister-guiiug.github.io/miss-carbook/favicon.svg'
  );
});

test('une app hors catalogue garde ses données, sans catégorie inventée', () => {
  const d = webApplicationJsonLd({
    html: PAGE.replace(
      '<title>Miss Dice - lance un dé</title>',
      '<title>Squelette</title>'
    ),
    homeUrl: 'https://mister-guiiug.github.io/pwa-starter-kit/',
  });
  assert.equal(d.name, 'Squelette');
  assert.equal(d.applicationCategory, undefined);
  assert.equal(d.sameAs, undefined);
});

test('sans description, rien n’est injecté', () => {
  const d = webApplicationJsonLd({
    html: '<html><head><title>X</title></head></html>',
    homeUrl: 'https://mister-guiiug.github.io/inconnue/',
  });
  assert.equal(d, null);
});

test('jsonLdScript échappe `<` : une description ne peut pas fermer le bloc', () => {
  const bloc = jsonLdScript({ description: 'a </script><script>alert(1)' });
  assert.equal(
    bloc.match(/<\/script>/g).length,
    1,
    'un seul </script>, le sien'
  );
  assert.match(bloc, /\\u003c\/script>/);
});

test('chaque catégorie du catalogue a son équivalent schema.org', () => {
  // Une catégorie ajoutée au catalogue sans correspondance ferait disparaître
  // `applicationCategory` de toutes les apps qui la portent, sans un mot.
  for (const c of CATEGORIES) {
    assert.match(SCHEMA_APPLICATION_CATEGORIES[c] ?? '', /Application$/, c);
  }
});

test('le plan de site porte lastmod, les routes publiques, et échappe &', async () => {
  const dossier = mkdtempSync(join(tmpdir(), 'seo-'));
  try {
    const plugin = pwaSeoPlugin({
      basePath: '/miss-dice/',
      routes: ['/a-propos', '?play=yahtzee&x=1'],
      robots: false,
    });
    plugin.configResolved({ command: 'build', build: { outDir: dossier } });
    await plugin.closeBundle();
    const xml = readFileSync(join(dossier, 'sitemap.xml'), 'utf8');
    const jour = new Date().toISOString().slice(0, 10);
    assert.equal(xml.match(/<url>/g).length, 3);
    assert.equal(
      xml.match(new RegExp(`<lastmod>${jour}</lastmod>`, 'g')).length,
      3
    );
    assert.match(
      xml,
      /<loc>https:\/\/mister-guiiug\.github\.io\/miss-dice\/a-propos<\/loc>/
    );
    assert.match(xml, /\?play=yahtzee&amp;x=1<\/loc>/);
    assert.doesNotMatch(xml, /&x=/, '& non échappé : XML invalide');
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});
