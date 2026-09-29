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
  defaultLlmsTxt,
  homeFingerprint,
  injectServedContent,
  jsonLdScript,
  normalizeRoutes,
  ogLocale,
  pwaSeoPlugin,
  relatedApps,
  renderServedHome,
  routePageHtml,
  SCHEMA_APPLICATION_CATEGORIES,
  seoState,
  setTextMeta,
  webApplicationJsonLd,
  withNoindex,
} from '../vite-pwa-base.js';
import { appById, CATEGORIES, PUBLISHER, SITE_ID } from '../apps-catalog.js';

// L'état SEO écrit `seo-changed.json` HORS du dossier de sortie : ici, dans un
// dossier temporaire, et pas dans le `node_modules` du dépôt.
process.env.PWA_SEO_CHANGED_FILE = join(
  mkdtempSync(join(tmpdir(), 'seo-changed-')),
  'seo-changed.json'
);
delete process.env.PWA_SEO_PREVIOUS_STATE;

/** Le JSON-LD injecté dans une page, ou `null`. */
function jsonLdDe(html) {
  const m = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(
    html
  );
  return m ? JSON.parse(m[1]) : null;
}

/** Le `WebApplication` du graphe injecté. */
const appDe = html => jsonLdDe(html)?.['@graph']?.[0] ?? null;

const PAGE = `<!doctype html>
<html lang="fr">
  <head>
    <title>Miss Dice - lance un dé</title>
    <meta name="description" content="Lancer un dé d'un geste, hors ligne." />
    <meta property="og:image" content="__SEO_LOGO_URL__" />
  </head>
  <body><div id="root"></div></body>
</html>`;

const ORG = 'https://mister-guiiug.github.io/#org';

test('pwaSeoPlugin injecte un WebApplication tiré du catalogue et de la page', () => {
  const out = pwaSeoPlugin({
    basePath: '/miss-dice/',
    logoPath: '/favicon.svg',
  }).transformIndexHtml(PAGE);
  const ld = jsonLdDe(out);
  assert.ok(ld, 'aucun JSON-LD injecté');
  const d = ld['@graph'][0];
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
  assert.deepEqual(d.offers, {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'EUR',
  });
  assert.deepEqual(d.potentialAction, {
    '@type': 'ViewAction',
    target: 'https://mister-guiiug.github.io/miss-dice/',
    name: 'Miss Dice',
  });
  // Dans <head>, pas ailleurs.
  assert.ok(out.indexOf('application/ld+json') < out.indexOf('</head>'));
  // Pas de note inventée.
  assert.equal(d.aggregateRating, undefined);
});

test('UN SEUL GRAPHE : @id, éditeur et site par référence, sameAs = le dépôt seul', () => {
  const out = pwaSeoPlugin({ basePath: '/miss-dice/' }).transformIndexHtml(
    PAGE
  );
  const ld = jsonLdDe(out);
  const [app, org] = ld['@graph'];
  assert.equal(app['@id'], 'https://mister-guiiug.github.io/miss-dice/#app');
  assert.deepEqual(app.author, { '@id': ORG });
  assert.deepEqual(app.publisher, { '@id': ORG });
  assert.deepEqual(app.isPartOf, { '@id': SITE_ID });
  // L'accueil du parc est une AUTRE entité, déjà reliée par `isPartOf`.
  assert.deepEqual(app.sameAs, ['https://github.com/mister-guiiug/miss-dice']);
  // Le nœud de l'éditeur, complet, dans le même graphe.
  assert.deepEqual(org, JSON.parse(JSON.stringify(PUBLISHER)));
  assert.equal(org['@type'], 'Organization');
  assert.equal(org.alternateName, 'GuiiuG');
});

test('inLanguage suit les langues du catalogue ; featureList ses fonctions', () => {
  const dice = appDe(
    pwaSeoPlugin({ basePath: '/miss-dice/' }).transformIndexHtml(PAGE)
  );
  assert.deepEqual(dice.inLanguage, appById('miss-dice').languages);
  assert.ok(dice.inLanguage.length > 1, 'miss-dice parle six langues');
  assert.deepEqual(dice.featureList, appById('miss-dice').features);
  // Une app hors catalogue garde la langue de sa page, sans featureList.
  const hors = webApplicationJsonLd({
    html: PAGE,
    homeUrl: 'https://mister-guiiug.github.io/pwa-starter-kit/',
  })['@graph'][0];
  assert.equal(hors.inLanguage, 'fr');
  assert.equal(hors.featureList, undefined);
});

test('les captures passées deviennent screenshot', () => {
  const d = webApplicationJsonLd({
    html: PAGE,
    homeUrl: 'https://mister-guiiug.github.io/miss-dice/',
    screenshots: [
      'https://mister-guiiug.github.io/miss-dice/screenshots/narrow.png',
    ],
  })['@graph'][0];
  assert.deepEqual(d.screenshot, [
    'https://mister-guiiug.github.io/miss-dice/screenshots/narrow.png',
  ]);
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
    appDe(surcharge.transformIndexHtml(PAGE)).applicationCategory,
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
    appDe(out).image,
    'https://mister-guiiug.github.io/miss-carbook/favicon.svg'
  );
});

test('une app hors catalogue garde ses données, sans catégorie ni sameAs inventés', () => {
  const d = webApplicationJsonLd({
    html: PAGE.replace(
      '<title>Miss Dice - lance un dé</title>',
      '<title>Squelette</title>'
    ),
    homeUrl: 'https://mister-guiiug.github.io/pwa-starter-kit/',
  })['@graph'][0];
  assert.equal(d.name, 'Squelette');
  assert.equal(d.applicationCategory, undefined);
  assert.equal(d.sameAs, undefined, 'pas le hub : une autre entité');
  assert.deepEqual(d.author, { '@id': ORG });
});

test('un <title> répété sans fin reste linéaire (CodeQL js/polynomial-redos)', () => {
  // Avec `/<title>([\s\S]*?)<\/title>/`, 100 000 répétitions prenaient un
  // temps quadratique. Deux `indexOf` restent linéaires.
  const html = `<meta name="description" content="d">${'<title>a'.repeat(100_000)}`;
  const debut = performance.now();
  const d = webApplicationJsonLd({
    html,
    homeUrl: 'https://mister-guiiug.github.io/inconnue/',
  });
  assert.ok(performance.now() - debut < 500, 'trop lent : motif quadratique');
  assert.equal(d, null, 'titre jamais fermé : pas de nom');
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

/* ── Les balises texte de l'accueil ────────────────────────────────────── */

test('ogLocale : langue_TERRITOIRE, et rien d’inventé', () => {
  assert.equal(ogLocale('fr'), 'fr_FR');
  assert.equal(ogLocale('en'), 'en_US');
  assert.equal(ogLocale('pt-BR'), 'pt_BR');
  assert.equal(ogLocale('fr_FR'), 'fr_FR');
  assert.equal(ogLocale('xx'), '', 'une langue sans région connue');
  assert.equal(ogLocale(''), '');
});

test('setTextMeta pose ce qui manque, sans jamais écraser ce qui est écrit', () => {
  const page = `<html lang="fr"><head>
    <title>Miss Dice - lanceur de dés</title>
    <meta name="description" content="Des dés." />
    <link rel="canonical" href="https://o/miss-dice/" />
    <meta property="og:title" content="Titre écrit à la main" />
    <meta property="og:locale" content="fr" />
  </head><body></body></html>`;
  const out = setTextMeta(page, { siteName: 'Miss Dice', url: 'https://x/' });
  assert.match(out, /og:title" content="Titre écrit à la main"/);
  assert.equal(out.match(/og:title"/g).length, 1, 'jamais en double');
  // og:locale : le seul NORMALISÉ.
  assert.match(out, /og:locale" content="fr_FR"/);
  assert.equal(out.match(/og:locale"/g).length, 1);
  assert.match(out, /og:site_name" content="Miss Dice"/);
  // og:url = la canonique, pas l'URL de repli.
  assert.match(out, /og:url" content="https:\/\/o\/miss-dice\/"/);
  assert.match(out, /og:description" content="Des dés\."/);
  assert.match(out, /og:type" content="website"/);
  assert.match(out, /twitter:title" content="Miss Dice - lanceur de dés"/);
  assert.match(out, /twitter:description" content="Des dés\."/);
  assert.match(out, /twitter:card" content="summary"/);
  // Deux passes n'en font qu'une.
  assert.equal(setTextMeta(out, { siteName: 'Miss Dice' }), out);
});

test('setTextMeta : un `$&` du titre reste du texte', () => {
  const out = setTextMeta(
    '<html lang="fr"><head><title>Gagner $& $1</title><meta name="description" content="d" /></head></html>'
  );
  assert.match(out, /og:title" content="Gagner \$&amp; \$1"/);
  assert.equal(out.match(/<\/head>/g).length, 1);
});

test('le plugin nomme le site : catalogue d’abord, `siteName` hors catalogue', () => {
  const dice = pwaSeoPlugin({
    basePath: '/miss-dice/',
    siteName: 'Autre nom',
  }).transformIndexHtml(PAGE);
  assert.match(dice, /og:site_name" content="Miss Dice"/);
  assert.match(dice, /og:locale" content="fr_FR"/);
  assert.match(
    dice,
    /og:url" content="https:\/\/mister-guiiug\.github\.io\/miss-dice\/"/
  );

  // Le squelette, hors catalogue : son `siteName` nomme aussi le WebApplication
  // — il prenait jusqu'ici le `og:title` entier.
  const squelette = pwaSeoPlugin({
    basePath: '/pwa-starter-kit/',
    siteName: 'PWA Starter Kit',
  }).transformIndexHtml(PAGE);
  assert.match(squelette, /og:site_name" content="PWA Starter Kit"/);
  assert.equal(appDe(squelette).name, 'PWA Starter Kit');
});

/* ── Routes, plan de site, état SEO ────────────────────────────────────── */

test('une route invalide, réservée ou en double est refusée à la configuration', () => {
  assert.throws(
    () => pwaSeoPlugin({ routes: ['?play=yahtzee&x=1'] }),
    /route « \?play=yahtzee&x=1 » invalide/
  );
  assert.throws(() => normalizeRoutes(['À-propos']), /invalide/);
  assert.throws(() => normalizeRoutes(['index']), /réservée/);
  assert.throws(
    () => normalizeRoutes(['a-propos', { path: '/a-propos/' }]),
    /déclarée deux fois/
  );
  assert.deepEqual(
    normalizeRoutes([
      '/a-propos',
      { path: 'lieux/1', title: 'Le parc', description: 'Un lieu.' },
    ]),
    [
      { path: 'a-propos' },
      { path: 'lieux/1', title: 'Le parc', description: 'Un lieu.' },
    ]
  );
});

test('chaque route devient un fichier en 200 ; le plan de site ne liste que ce qui est écrit', async () => {
  const dossier = mkdtempSync(join(tmpdir(), 'seo-'));
  try {
    const plugin = pwaSeoPlugin({
      basePath: '/miss-dice/',
      routes: [
        '/a-propos',
        {
          path: 'lieux/1',
          title: 'Le parc — une fiche',
          description: 'Un lieu.',
        },
      ],
      llms: false,
    });
    plugin.configResolved({ command: 'build', build: { outDir: dossier } });
    plugin.buildStart();
    writeFileSync(join(dossier, 'index.html'), plugin.transformIndexHtml(PAGE));
    plugin.writeBundle({ dir: dossier });
    await plugin.closeBundle();

    // La route porte ses textes, sa canonique SANS extension, son Open Graph.
    const lieu = readFileSync(join(dossier, 'lieux', '1.html'), 'utf8');
    assert.match(lieu, /<title>Le parc — une fiche<\/title>/);
    assert.match(
      lieu,
      /rel="canonical" href="https:\/\/mister-guiiug\.github\.io\/miss-dice\/lieux\/1"/
    );
    assert.match(
      lieu,
      /og:url" content="https:\/\/mister-guiiug\.github\.io\/miss-dice\/lieux\/1"/
    );
    assert.match(lieu, /og:title" content="Le parc — une fiche"/);
    assert.match(lieu, /name="description" content="Un lieu\."/);
    assert.match(lieu, /og:description" content="Un lieu\."/);
    // Une route sans textes garde ceux de l'accueil, avec SA canonique.
    const propos = readFileSync(join(dossier, 'a-propos.html'), 'utf8');
    assert.match(propos, /<title>Miss Dice - lance un dé<\/title>/);
    assert.match(propos, /canonical" href="[^"]*\/miss-dice\/a-propos"/);

    const xml = readFileSync(join(dossier, 'sitemap.xml'), 'utf8');
    const jour = new Date().toISOString().slice(0, 10);
    assert.equal(xml.match(/<url>/g).length, 3);
    assert.equal(
      xml.match(new RegExp(`<lastmod>${jour}</lastmod>`, 'g')).length,
      3,
      'sans état précédent : tout est daté du jour'
    );
    assert.match(
      xml,
      /<loc>https:\/\/mister-guiiug\.github\.io\/miss-dice\/lieux\/1<\/loc>/
    );
    // robots.txt : plus par défaut — un robots.txt de sous-chemin est ignoré.
    assert.equal(existsSync(join(dossier, 'robots.txt')), false);
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

test('sans index.html, aucune route n’entre au plan de site', async () => {
  const dossier = mkdtempSync(join(tmpdir(), 'seo-'));
  const avertissements = [];
  const original = console.warn;
  console.warn = m => avertissements.push(String(m));
  try {
    const plugin = pwaSeoPlugin({
      basePath: '/miss-dice/',
      routes: ['a-propos'],
    });
    plugin.configResolved({ command: 'build', build: { outDir: dossier } });
    plugin.writeBundle({ dir: dossier });
    await plugin.closeBundle();
    const xml = readFileSync(join(dossier, 'sitemap.xml'), 'utf8');
    assert.equal(xml.match(/<url>/g).length, 1, 'l’accueil seul');
    assert.equal(avertissements.length, 1);
  } finally {
    console.warn = original;
    rmSync(dossier, { recursive: true, force: true });
  }
});

test('une route qui tomberait sur un dossier du build est refusée', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'seo-'));
  try {
    mkdirSync(join(dossier, 'assets'));
    writeFileSync(join(dossier, 'index.html'), PAGE);
    const plugin = pwaSeoPlugin({
      basePath: '/miss-dice/',
      routes: ['assets'],
    });
    plugin.configResolved({ command: 'build', build: { outDir: dossier } });
    assert.throws(
      () => plugin.writeBundle({ dir: dossier }),
      /le dossier assets\/ existe/
    );
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

test('robots: true écrit robots.txt, pour une app servie à la racine d’une origine', async () => {
  const dossier = mkdtempSync(join(tmpdir(), 'seo-'));
  try {
    const plugin = pwaSeoPlugin({ basePath: '/', robots: true });
    plugin.configResolved({ command: 'build', build: { outDir: dossier } });
    await plugin.closeBundle();
    assert.match(
      readFileSync(join(dossier, 'robots.txt'), 'utf8'),
      /Sitemap: https:\/\/mister-guiiug\.github\.io\/sitemap\.xml/
    );
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

test('routePageHtml : textes de la route, et plus le texte propre à l’accueil', () => {
  const accueil = injectServedContent(
    setTextMeta(PAGE.replace('__SEO_LOGO_URL__', 'https://x/og.jpg'), {
      url: 'https://o/app/',
    }),
    {
      accueil: renderServedHome('Du texte.\n\n## Sources\n\n- https://who.int'),
    }
  ).html;
  assert.match(accueil, /served-text/);
  const route = routePageHtml(accueil, {
    url: 'https://o/app/a-propos',
    title: 'À propos — $&',
    description: 'Qui fait quoi.',
  });
  assert.match(route, /<h1>À propos — \$&amp;<\/h1>/);
  assert.match(route, /<p>Qui fait quoi\.<\/p>/);
  // Le texte de l'accueil est parti, sections imbriquées comprises — la
  // feuille de style, elle, garde ses sélecteurs.
  assert.doesNotMatch(route, /data-dwc="served-text"|who\.int|<\/section>/);
  assert.match(route, /twitter:title" content="À propos — \$&amp;"/);
  assert.match(route, /canonical" href="https:\/\/o\/app\/a-propos"/);
});

test('seoState : lastmod repris si rien n’a bougé, la date éditoriale prime', () => {
  const precedent = {
    'https://o/app/': { hash: 'aaa', lastmod: '2026-09-01' },
    'https://o/app/p.html': { hash: 'bbb', lastmod: '2026-09-02' },
    'https://o/app/q.html': { hash: 'ccc', lastmod: '2026-09-03' },
  };
  const { etat, changees } = seoState({
    entrees: [
      { url: 'https://o/app/', hash: 'aaa' },
      { url: 'https://o/app/p.html', hash: 'NOUVEAU' },
      { url: 'https://o/app/q.html', hash: 'ccc', date: '2026-09-25' },
      { url: 'https://o/app/r.html', hash: 'ddd' },
    ],
    precedent,
    aujourdHui: '2026-09-29',
  });
  assert.deepEqual(etat['https://o/app/'], {
    hash: 'aaa',
    lastmod: '2026-09-01',
  });
  assert.equal(etat['https://o/app/p.html'].lastmod, '2026-09-29');
  assert.equal(etat['https://o/app/q.html'].lastmod, '2026-09-25');
  assert.equal(etat['https://o/app/r.html'].lastmod, '2026-09-29');
  assert.deepEqual(changees, ['https://o/app/p.html', 'https://o/app/r.html']);
  // Sans état précédent : tout est changé, et daté du jour.
  const vierge = seoState({
    entrees: [{ url: 'https://o/app/', hash: 'aaa' }],
    aujourdHui: '2026-09-29',
  });
  assert.deepEqual(vierge.changees, ['https://o/app/']);
  assert.equal(vierge.etat['https://o/app/'].lastmod, '2026-09-29');
});

test('homeFingerprint ignore le volatil, pas le contenu', () => {
  const avec = (date, v, texte) =>
    `<html><head><title>T</title><meta name="description" content="D" />${jsonLdScript(
      {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebApplication',
            dateModified: date,
            image: `https://o/og.jpg?v=${v}`,
          },
        ],
      }
    )}</head><body><div id="app"><div data-dwc="served-content"><h1>T</h1><p>${texte}</p><noscript></noscript></div></div></body></html>`;
  const base = homeFingerprint(avec('2026-09-01', 'aaaa', 'Un texte.'));
  assert.equal(homeFingerprint(avec('2026-09-29', 'bbbb', 'Un texte.')), base);
  assert.notEqual(
    homeFingerprint(avec('2026-09-01', 'aaaa', 'Un autre.')),
    base
  );
});

test('au build : seo-state.json publié, lastmod repris, seo-changed.json hors du site', async () => {
  const dossier = mkdtempSync(join(tmpdir(), 'seo-'));
  const etatAvant = join(dossier, '..', `etat-${Date.now()}.json`);
  try {
    const construire = async () => {
      const plugin = pwaSeoPlugin({ basePath: '/miss-dice/' });
      plugin.configResolved({ command: 'build', build: { outDir: dossier } });
      writeFileSync(
        join(dossier, 'index.html'),
        plugin.transformIndexHtml(PAGE)
      );
      plugin.writeBundle({ dir: dossier });
      await plugin.closeBundle();
      return {
        etat: JSON.parse(readFileSync(join(dossier, 'seo-state.json'), 'utf8')),
        changees: JSON.parse(
          readFileSync(process.env.PWA_SEO_CHANGED_FILE, 'utf8')
        ),
        xml: readFileSync(join(dossier, 'sitemap.xml'), 'utf8'),
      };
    };
    const premier = await construire();
    const accueil = 'https://mister-guiiug.github.io/miss-dice/';
    assert.deepEqual(premier.changees, [accueil]);
    assert.match(premier.etat[accueil].hash, /^[0-9a-f]{16}$/);
    assert.equal(existsSync(join(dossier, 'seo-changed.json')), false);

    // Le déploiement suivant relit l'état publié : rien n'a bougé, donc rien
    // à signaler, et le `lastmod` d'hier est repris.
    writeFileSync(
      etatAvant,
      JSON.stringify({
        [accueil]: { ...premier.etat[accueil], lastmod: '2026-09-01' },
      })
    );
    process.env.PWA_SEO_PREVIOUS_STATE = etatAvant;
    const second = await construire();
    assert.deepEqual(second.changees, []);
    assert.match(second.xml, /<lastmod>2026-09-01<\/lastmod>/);
  } finally {
    delete process.env.PWA_SEO_PREVIOUS_STATE;
    rmSync(etatAvant, { force: true });
    rmSync(dossier, { recursive: true, force: true });
  }
});

test('les captures du manifeste construit rejoignent le WebApplication', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'seo-'));
  try {
    const plugin = pwaSeoPlugin({ basePath: '/miss-dice/' });
    plugin.configResolved({ command: 'build', build: { outDir: dossier } });
    const index = plugin
      .transformIndexHtml(PAGE)
      .replace(
        '</head>',
        '<link rel="manifest" href="/miss-dice/manifest.webmanifest"></head>'
      );
    writeFileSync(join(dossier, 'index.html'), index);
    writeFileSync(
      join(dossier, 'manifest.webmanifest'),
      JSON.stringify({
        screenshots: [
          { src: 'screenshots/narrow.png', form_factor: 'narrow' },
          { src: '/miss-dice/screenshots/wide.png', form_factor: 'wide' },
        ],
      })
    );
    plugin.writeBundle({ dir: dossier });
    const app = appDe(readFileSync(join(dossier, 'index.html'), 'utf8'));
    assert.deepEqual(app.screenshot, [
      'https://mister-guiiug.github.io/miss-dice/screenshots/narrow.png',
      'https://mister-guiiug.github.io/miss-dice/screenshots/wide.png',
    ]);
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

test('llms.txt : omis = rien ; true = auto ; chaîne conserve', async () => {
  const dossier = mkdtempSync(join(tmpdir(), 'seo-llms-'));
  try {
    writeFileSync(
      join(dossier, 'index.html'),
      PAGE.replaceAll('__SEO_LOGO_URL__', 'https://x/logo.svg')
    );

    const defaut = pwaSeoPlugin({
      basePath: '/miss-dice/',
      sitemap: false,
      robots: false,
    });
    defaut.configResolved({ command: 'build', build: { outDir: dossier } });
    await defaut.closeBundle();
    assert.equal(existsSync(join(dossier, 'llms.txt')), false);

    const auto = pwaSeoPlugin({
      basePath: '/miss-dice/',
      sitemap: false,
      robots: false,
      llms: true,
    });
    auto.configResolved({ command: 'build', build: { outDir: dossier } });
    await auto.closeBundle();
    const texte = readFileSync(join(dossier, 'llms.txt'), 'utf8');
    assert.match(texte, /^# Miss Dice/m);
    assert.match(
      texte,
      /Application : https:\/\/mister-guiiug\.github\.io\/miss-dice\//
    );

    rmSync(join(dossier, 'llms.txt'));
    const custom = pwaSeoPlugin({
      basePath: '/miss-dice/',
      sitemap: false,
      robots: false,
      llms: '# Custom\n',
    });
    custom.configResolved({ command: 'build', build: { outDir: dossier } });
    await custom.closeBundle();
    assert.equal(readFileSync(join(dossier, 'llms.txt'), 'utf8'), '# Custom\n');
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

test('defaultLlmsTxt : null hors catalogue sans matière', () => {
  assert.equal(
    defaultLlmsTxt({
      homeUrl: 'https://mister-guiiug.github.io/inconnu/',
      html: '<html></html>',
    }),
    null
  );
  assert.match(
    defaultLlmsTxt({
      homeUrl: 'https://mister-guiiug.github.io/miss-dice/',
    }),
    /Miss Dice/
  );
});

/* ── Le contenu servi ──────────────────────────────────────────────────── */

/** Le plugin tel qu'au BUILD : le contenu servi n'est injecté qu'à ce moment-là. */
function pluginDeBuild(opts = {}) {
  const plugin = pwaSeoPlugin({ basePath: '/miss-dice/', ...opts });
  plugin.configResolved({ command: 'build', build: { outDir: 'dist' } });
  return plugin;
}

test('le contenu servi décrit l’app dans son point de montage vide', () => {
  const out = pluginDeBuild().transformIndexHtml(
    PAGE.replace('<div id="root"></div>', '<div id="app"></div>')
  );
  const bloc = /<div id="app">([\s\S]*?)<\/div><\/div>/.exec(out)?.[1] ?? '';
  // Le titre de la PAGE en h1, sa description, un lien vers l'accueil du parc.
  // L'apostrophe sort en `&#39;` : `echapperXml` échappe aussi les quotes
  // depuis la revue de #360 (CodeQL js/incomplete-html-attribute-sanitization).
  // Navigateurs et robots décodent l'entité : le texte lu est le même.
  assert.match(bloc, /<h1>Miss Dice - lance un dé<\/h1>/);
  assert.match(bloc, /<p>Lancer un dé d&#39;un geste, hors ligne\.<\/p>/);
  assert.match(
    bloc,
    /<a href="https:\/\/mister-guiiug\.github\.io\/">Les autres applications de mister-guiiug<\/a>/
  );
  assert.match(bloc, /<noscript>/);
  // La mise en page, une seule fois, dans <head>. Le lien est SOULIGNÉ : sa
  // couleur est celle du texte, et Tailwind retire le soulignement.
  assert.equal(out.match(/data-dwc="served-content-style"/g).length, 1);
  assert.match(out, /served-content\] a\{[^}]*text-decoration:underline/);
  assert.ok(out.indexOf('served-content-style') < out.indexOf('</head>'));
});

test('le contenu servi lie les apps sœurs et le dépôt, depuis le catalogue', () => {
  const out = pluginDeBuild().transformIndexHtml(PAGE);
  const bloc = /data-dwc="served-content">([\s\S]*?)<noscript>/.exec(out)[1];
  assert.match(bloc, /<h2>Dans la même catégorie<\/h2>/);
  for (const a of relatedApps('miss-dice').apps) {
    assert.ok(
      bloc.includes(`<a href="${a.appUrl}">${a.name}</a>`),
      `${a.id} absent`
    );
    assert.equal(a.category, 'jeux');
  }
  assert.match(
    bloc,
    /<a href="https:\/\/github\.com\/mister-guiiug\/miss-dice">Code source sur GitHub<\/a>/
  );
  // Le dépôt et les sœurs AVANT le lien vers le parc.
  assert.ok(
    bloc.indexOf('Code source') < bloc.indexOf('Les autres applications')
  );
});

test('content/accueil.md : rendu après la description, avant les pages', () => {
  const racine = mkdtempSync(join(tmpdir(), 'dwc-accueil-'));
  try {
    mkdirSync(join(racine, 'content', 'pages'), { recursive: true });
    writeFileSync(
      join(racine, 'content', 'accueil.md'),
      '---\n---\n\n## Pour qui ?\n\nPour **les joueurs**, sans compte.\n\n- hors ligne\n- gratuit\n'
    );
    writeFileSync(
      join(racine, 'content', 'pages', 'regles.md'),
      '---\ntitle: Règles\ndescription: Les règles.\n---\n\n# Les règles\n\nTexte.\n'
    );
    const plugin = pwaSeoPlugin({ basePath: '/miss-dice/' });
    plugin.configResolved({
      command: 'build',
      root: racine,
      build: { outDir: join(racine, 'dist') },
    });
    const out = plugin.transformIndexHtml(PAGE);
    const bloc = /data-dwc="served-content">([\s\S]*?)<noscript>/.exec(out)[1];
    const texte = bloc.indexOf('<section data-dwc="served-text">');
    assert.ok(texte > bloc.indexOf('Lancer un dé'), 'après la description');
    assert.ok(texte < bloc.indexOf('regles.html'), 'avant les pages');
    assert.match(bloc, /<h2 id="pour-qui">Pour qui \?<\/h2>/);
    assert.match(bloc, /<strong>les joueurs<\/strong>/);
    assert.match(bloc, /<ul><li>hors ligne<\/li><li>gratuit<\/li><\/ul>/);
    // Le texte se lit à gauche, avec ses puces.
    assert.match(out, /\[data-dwc=served-text\]\{text-align:left\}/);
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test('renderServedHome : en-tête toléré, `#` refusé, fichier vide sans effet', () => {
  assert.equal(renderServedHome(''), '');
  assert.equal(renderServedHome('---\n---\n'), '');
  assert.match(
    renderServedHome('---\nnote: libre\n---\nUn paragraphe.'),
    /^<p>Un paragraphe\.<\/p>$/
  );
  assert.throws(
    () => renderServedHome('# Un titre\n\nTexte.', 'content/accueil.md'),
    /content\/accueil\.md : pas de titre « # »/
  );
});

test('relatedApps : la catégorie, sinon une rotation — jamais une app de bureau', () => {
  const jeux = relatedApps('miss-dice');
  assert.equal(jeux.memeCategorie, true);
  assert.ok(jeux.apps.length >= 2 && jeux.apps.length <= 4);
  assert.ok(
    jeux.apps.every(a => a.category === 'jeux' && a.id !== 'miss-dice')
  );
  // Seule de sa catégorie : complétée, et le titre le dira.
  const seule = relatedApps('miss-genius');
  assert.equal(seule.memeCategorie, false);
  assert.equal(seule.apps.length, 2);
  // Une app de bureau n'a pas de page sur l'origine : jamais liée.
  for (const a of ['miss-supaboss', 'miss-supatool'].flatMap(
    id => relatedApps(id).apps
  ))
    assert.notEqual(a.platform, 'desktop');
  assert.deepEqual(relatedApps('pwa-starter-kit'), {
    memeCategorie: false,
    apps: [],
  });
});

test('les trois points de montage du parc sont reconnus', () => {
  for (const id of ['app', 'root', 'react-root']) {
    const r = injectServedContent(
      PAGE.replace('<div id="root"></div>', `<div id="${id}"></div>`)
    );
    assert.equal(r.injecte, true, id);
    assert.equal(r.montage, id);
  }
});

test('un point de montage qui porte déjà du contenu est laissé tel quel', () => {
  const page = PAGE.replace(
    '<div id="root"></div>',
    '<div id="root"><p>Chargement</p></div>'
  );
  const r = injectServedContent(page);
  assert.equal(r.injecte, false);
  assert.equal(r.html, page);
});

test('en développement, rien n’est injecté ; servedContent: false coupe au build', () => {
  const dev = pwaSeoPlugin({ basePath: '/miss-dice/' });
  dev.configResolved({ command: 'serve' });
  assert.doesNotMatch(dev.transformIndexHtml(PAGE), /served-content/);
  assert.doesNotMatch(
    pluginDeBuild({ servedContent: false }).transformIndexHtml(PAGE),
    /served-content/
  );
});

test('le titre et la description sont échappés ; deux passes n’en font qu’un', () => {
  const page = PAGE.replace(
    '<title>Miss Dice - lance un dé</title>',
    '<title>A &amp; B <script></title>'
  );
  const une = injectServedContent(page).html;
  assert.match(une, /<h1>A &amp; B &lt;script&gt;<\/h1>/);
  assert.doesNotMatch(une, /<h1>[^<]*<script>/);
  const deux = injectServedContent(une).html;
  assert.equal(deux, une, 'idempotent');
});

test('les guillemets du point de montage sont échappés dans l’attribut id injecté', () => {
  const page = PAGE.replace(
    '<div id="root"></div>',
    '<div id="root&quot; onclick=&quot;alert(1)"></div>'
  );
  const r = injectServedContent(page);
  assert.equal(r.injecte, false);
  assert.match(r.raison, /aucun point de montage vide/);
});

test('une page en anglais reçoit ses libellés en anglais', () => {
  const r = injectServedContent(
    PAGE.replace('<html lang="fr">', '<html lang="en">'),
    {
      voisines: { memeCategorie: false, apps: relatedApps('miss-dice').apps },
      depot: 'https://github.com/mister-guiiug/miss-dice',
    }
  );
  assert.match(r.html, /More apps by mister-guiiug/);
  assert.match(r.html, /This app needs JavaScript/);
  assert.match(r.html, /<h2>You may also like<\/h2>/);
  assert.match(r.html, /Source code on GitHub/);
  // Les descriptions du catalogue sont en français : le nom seul.
  assert.doesNotMatch(r.html, / — /);
});

test('une page dans une autre langue est annoncée comme telle', () => {
  const r = injectServedContent(PAGE, {
    pages: [
      { href: 'https://o/app/en/rules.html', titre: 'Rules', lang: 'en' },
      { href: 'https://o/app/regles.html', titre: 'Règles', lang: 'fr' },
    ],
  });
  assert.match(
    r.html,
    /<ul><li><a href="https:\/\/o\/app\/regles\.html">Règles<\/a><\/li><li lang="en"><a href="https:\/\/o\/app\/en\/rules\.html" hreflang="en">Rules<\/a><\/li><\/ul>/
  );
});

/* ── Le 404 ────────────────────────────────────────────────────────────── */

test('withNoindex : la balise posée, les contraires retirés, une seule passe utile', () => {
  const html = `<!doctype html><html><head>
    <meta name="robots" content="index, follow" />
    <link rel="canonical" href="https://o/app/" />
    <title>App</title>
  </head><body></body></html>`;
  const out = withNoindex(html);
  assert.equal(out.match(/name="robots"/g).length, 1);
  assert.match(out, /<head>\n {4}<meta name="robots" content="noindex" \/>/);
  assert.doesNotMatch(out, /index, follow|canonical/);
  assert.doesNotMatch(out, /\n\s*\n\s*\n/, 'aucune ligne vide laissée');
  assert.equal(withNoindex(out), out, 'idempotent');
});
