// Tests du catalogue famille (`apps-catalog.js`) — données PURES, sans React.
// L'existence et la parité .d.ts/.js de l'export `./apps-catalog` sont déjà
// couvertes dynamiquement par `configs.test.mjs`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  FAMILY_APPS,
  otherApps,
  repoUrl,
  pagesUrl,
  SPONSOR_URL,
  GITHUB_OWNER,
  CATEGORIES,
  BACKENDS,
  PLATFORMS,
  appById,
  sortApps,
  filterApps,
  countBy,
} from '../apps-catalog.js';

const MATURITIES = new Set(['alpha', 'beta', 'stable']);

test('FAMILY_APPS est une liste non vide', () => {
  assert.ok(Array.isArray(FAMILY_APPS) && FAMILY_APPS.length > 0);
});

test('chaque entrée a tous les champs requis et bien typés', () => {
  for (const a of FAMILY_APPS) {
    assert.equal(typeof a.id, 'string', `${a.id}: id`);
    assert.ok(a.id.length > 0, 'id non vide');
    assert.ok(a.name && typeof a.name === 'string', `${a.id}: name`);
    assert.ok(
      a.description && typeof a.description === 'string',
      `${a.id}: description`
    );
    assert.match(a.repoUrl, /^https:\/\//, `${a.id}: repoUrl https`);
    assert.match(a.appUrl, /^https:\/\//, `${a.id}: appUrl https`);
    assert.ok(
      a.iconUrl === null || /^https:\/\//.test(a.iconUrl),
      `${a.id}: iconUrl string https ou null`
    );
  }
});

test('maturity est obligatoire et dans l’ensemble autorisé', () => {
  for (const a of FAMILY_APPS) {
    assert.ok(MATURITIES.has(a.maturity), `${a.id}: maturity invalide`);
  }
});

test('les id sont uniques', () => {
  const ids = FAMILY_APPS.map(a => a.id);
  assert.equal(new Set(ids).size, ids.length, 'doublon d’id');
});

test('chaque app a un port de développement, unique, et le squelette a le sien', async () => {
  // Presque toutes démarraient sur 5173 ; cinq avaient choisi un port à la
  // main sans registre. Deux apps côte à côte sur le même poste ne doivent
  // jamais se disputer un port.
  const { devPortOf, freeDevPort, DEV_PORT_RANGE, STARTER_KIT_DEV_PORT } =
    await import('../apps-catalog.js');
  const ports = FAMILY_APPS.map(a => a.devPort);
  for (const a of FAMILY_APPS) {
    assert.ok(
      Number.isInteger(a.devPort) && a.devPort > 1023 && a.devPort < 65536,
      `${a.id}: devPort`
    );
  }
  assert.equal(new Set(ports).size, ports.length, 'doublon de port');
  assert.ok(
    !ports.includes(STARTER_KIT_DEV_PORT),
    'le port du squelette est réservé'
  );
  assert.equal(
    devPortOf('miss-supaboss'),
    5204,
    'un port choisi à la main est conservé'
  );
  assert.equal(
    devPortOf('miss-ticket-pwa'),
    1420,
    'celui de sa configuration Vite'
  );
  assert.equal(
    devPortOf('app-inconnue'),
    5173,
    'hors catalogue : celui de Vite'
  );
  assert.equal(devPortOf('app-inconnue', 5240), 5240);
  const libre = freeDevPort();
  assert.ok(libre >= DEV_PORT_RANGE.min && libre <= DEV_PORT_RANGE.max);
  assert.ok(!ports.includes(libre) && libre !== STARTER_KIT_DEV_PORT);
  assert.notEqual(
    freeDevPort([libre]),
    libre,
    'un port pris en plus est évité'
  );
});

test('otherApps(id) exclut l’app courante', () => {
  const id = FAMILY_APPS[0].id;
  const rest = otherApps(id);
  assert.equal(rest.length, FAMILY_APPS.length - 1);
  assert.ok(!rest.some(a => a.id === id));
});

test('otherApps tolère un id absent (renvoie toute la liste)', () => {
  assert.equal(otherApps('inconnu-xyz').length, FAMILY_APPS.length);
});

test('helpers d’URL et constantes famille', () => {
  assert.equal(GITHUB_OWNER, 'mister-guiiug');
  assert.match(SPONSOR_URL, /^https:\/\/buymeacoffee\.com\//);
  assert.equal(
    repoUrl('miss-dice'),
    'https://github.com/mister-guiiug/miss-dice'
  );
  assert.equal(
    pagesUrl('miss-dice'),
    'https://mister-guiiug.github.io/miss-dice/'
  );
});

const byId = id => FAMILY_APPS.find(a => a.id === id);

test('iconUrl par défaut = favicon.svg', () => {
  // Une app sans surcharge d'icône pointe sur favicon.svg (racine Pages).
  assert.equal(
    byId('miss-carbook').iconUrl,
    'https://mister-guiiug.github.io/miss-carbook/favicon.svg'
  );
});

test('surcharge `icon` = chemin relatif joint à appUrl', () => {
  // Apps au nommage d'icône différent (sous-dossier ou logo).
  assert.equal(
    byId('miss-genius').iconUrl,
    'https://mister-guiiug.github.io/miss-genius/icons/icon-192.png'
  );
  assert.equal(
    byId('mister-molkky').iconUrl,
    'https://mister-guiiug.github.io/mister-molkky/logo.png'
  );
});

test('mister-cim10 : Pages servi en minuscules (pas de casse mister-CIM10)', () => {
  // Régression : l'ancienne surcharge pointait sur /mister-CIM10/ (404).
  const cim10 = byId('mister-cim10');
  assert.equal(cim10.appUrl, 'https://mister-guiiug.github.io/mister-cim10/');
  assert.ok(!/CIM10/.test(cim10.iconUrl), 'iconUrl ne doit pas contenir CIM10');
});

/* ── Facettes : maturité, domaine, persistance, plateforme ─────────────── */

test('category, backend et platform restent dans leurs ensembles', () => {
  for (const a of FAMILY_APPS) {
    assert.ok(
      a.category === undefined || CATEGORIES.includes(a.category),
      `${a.id}: category inconnue (${a.category})`
    );
    assert.ok(
      a.backend === undefined || BACKENDS.includes(a.backend),
      `${a.id}: backend inconnu (${a.backend})`
    );
    assert.ok(
      PLATFORMS.includes(a.platform),
      `${a.id}: platform inconnue (${a.platform})`
    );
  }
});

test('chaque app a un domaine ; la plateforme vaut `web` par défaut', () => {
  for (const a of FAMILY_APPS) {
    assert.ok(a.category, `${a.id}: domaine manquant`);
  }
  assert.equal(byId('miss-carbook').platform, 'web');
  // Seule exception connue : l'app Electron, sans PWA hébergée.
  const desktop = FAMILY_APPS.filter(a => a.platform === 'desktop');
  assert.deepEqual(
    desktop.map(a => a.id),
    ['mister-quota']
  );
});

test('la persistance non relevée reste vide plutôt qu’inventée', () => {
  const sansBackend = FAMILY_APPS.filter(a => a.backend === undefined);
  assert.deepEqual(
    sansBackend.map(a => a.id),
    ['mister-quota'],
    'une app web sans persistance relevée est un oubli, pas un choix'
  );
});

/*
 * La section « Stack » du showroom annonce en toutes lettres « 6 apps »,
 * « 3 apps », « 5 apps ». Ces nombres et le catalogue décrivent la même chose ;
 * sans ce test, ils dérivent le jour où une app change de persistance et où
 * personne ne relit la prose.
 */
test('les comptes de persistance collent à la prose du showroom', () => {
  const html = readFileSync(
    new URL('../showroom/index.html', import.meta.url),
    'utf8'
  );
  const annonce = key => {
    const m = html.match(
      new RegExp(`data-i18n="stack\\.db\\.${key}\\.apps"[^>]*>\\s*(\\d+)`)
    );
    assert.ok(m, `compte introuvable dans la section Stack : ${key}`);
    return Number(m[1]);
  };
  const compte = countBy('backend');
  assert.equal(compte.supabase, annonce('supabase'), 'apps Supabase');
  assert.equal(compte.firebase, annonce('firebase'), 'apps Firebase');
  assert.equal(compte.local, annonce('local'), 'apps local-first');
});

/* ── Helpers de tri, de filtre et de comptage ──────────────────────────── */

test('appById trouve une app, et rien pour un id inconnu', () => {
  assert.equal(appById('miss-dice').name, 'Miss Dice');
  assert.equal(appById('inconnu-xyz'), undefined);
});

test('sortApps ne mute pas et respecte l’ordre demandé', () => {
  const avant = FAMILY_APPS.map(a => a.id);

  assert.deepEqual(
    sortApps(FAMILY_APPS).map(a => a.id),
    avant,
    '`curated` = ordre du catalogue'
  );

  const parNom = sortApps(FAMILY_APPS, 'name');
  assert.deepEqual(
    parNom.map(a => a.name),
    [...FAMILY_APPS.map(a => a.name)].sort((a, b) => a.localeCompare(b))
  );

  const parMaturite = sortApps(FAMILY_APPS, 'maturity');
  assert.equal(parMaturite[0].maturity, 'stable', 'les plus mûres d’abord');
  assert.equal(parMaturite.at(-1).maturity, 'alpha');

  assert.deepEqual(
    FAMILY_APPS.map(a => a.id),
    avant,
    'sortApps a trié la source en place'
  );
});

test('filterApps combine les critères en ET', () => {
  const stables = filterApps({ maturity: 'stable' });
  assert.ok(stables.length > 0);
  assert.ok(stables.every(a => a.maturity === 'stable'));

  const supabaseStable = filterApps({
    maturity: 'stable',
    backend: 'supabase',
  });
  assert.ok(
    supabaseStable.length < stables.length,
    'un second critère doit affiner'
  );
  assert.ok(supabaseStable.every(a => a.backend === 'supabase'));

  // Un tableau vaut « l'un OU l'autre » à l'intérieur d'un même critère.
  const jeunes = filterApps({ maturity: ['alpha', 'beta'] });
  assert.ok(jeunes.every(a => a.maturity !== 'stable'));

  assert.equal(filterApps().length, FAMILY_APPS.length, 'sans critère : tout');
});

test('la recherche ignore les diacritiques et exige tous les mots', () => {
  assert.deepEqual(
    filterApps({ query: 'molkky' }).map(a => a.id),
    ['mister-molkky'],
    '« molkky » doit trouver « Mölkky »'
  );
  assert.deepEqual(
    filterApps({ query: 'MÖLKKY' }).map(a => a.id),
    ['mister-molkky']
  );
  assert.equal(
    filterApps({ query: 'puzzle badminton' }).length,
    0,
    'deux mots absents ensemble n’élargissent pas la sélection'
  );
});

test('countBy regroupe les valeurs absentes sous la clé vide', () => {
  const parBackend = countBy('backend');
  assert.equal(
    Object.values(parBackend).reduce((a, b) => a + b, 0),
    FAMILY_APPS.length
  );
  assert.equal(parBackend[''], 1, 'la persistance non relevée est comptée');
  assert.equal(countBy('platform').desktop, 1);
});

/* ── Miroir du showroom ────────────────────────────────────────────────── */

/*
 * Le showroom est statique et chargeable en `file://` : il ne peut pas
 * `import` le catalogue, il en lit une copie. Une copie non vérifiée ment tôt
 * ou tard — `npm run sync` la régénère.
 */
test('showroom/apps.js est le miroir exact du catalogue', async () => {
  await import('../showroom/apps.js');
  const { showroomAppsData } = await import('../scripts/sync-generated.mjs');
  assert.deepEqual(
    globalThis.SHOWROOM_APPS,
    showroomAppsData(),
    'miroir périmé : lancer `npm run sync`'
  );
});

test('le showroom charge le miroir avant showroom.js', () => {
  const html = readFileSync(
    new URL('../showroom/index.html', import.meta.url),
    'utf8'
  );
  const miroir = html.indexOf('apps.js"');
  const main = html.indexOf('showroom.js"');
  assert.ok(miroir !== -1, 'showroom/apps.js n’est pas chargé');
  assert.ok(miroir < main, 'showroom.js lirait un catalogue non défini');
});

/* ── Sous-chemins consommés ────────────────────────────────────────────── */

test('configs est toujours un tableau de sous-chemins connus', async () => {
  const { CONFIG_SUBPATHS } = await import('../apps-catalog.js');
  const pkg = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  );
  // Un sous-chemin relevé qui n'existe pas dans `exports` serait soit une
  // faute de frappe du relevé, soit un export retiré sans prévenir les apps.
  const exported = new Set(
    Object.keys(pkg.exports)
      .filter(k => k !== '.')
      .map(k => k.replace(/^\.\//, ''))
  );
  for (const a of FAMILY_APPS) {
    assert.ok(
      Array.isArray(a.configs),
      `${a.id}: configs doit être un tableau`
    );
    for (const c of a.configs) {
      assert.ok(exported.has(c), `${a.id}: sous-chemin inconnu « ${c} »`);
    }
    assert.deepEqual(
      a.configs,
      [...a.configs].sort(),
      `${a.id}: configs doit rester trié`
    );
    assert.equal(
      new Set(a.configs).size,
      a.configs.length,
      `${a.id}: doublon dans configs`
    );
  }
  assert.deepEqual(
    CONFIG_SUBPATHS,
    [...new Set(FAMILY_APPS.flatMap(a => a.configs))].sort(),
    'CONFIG_SUBPATHS a dérivé du relevé'
  );
});

test('countByConfig compte des dépôts, pas des imports', async () => {
  const { countByConfig } = await import('../apps-catalog.js');
  const usage = countByConfig();
  for (const [subpath, n] of Object.entries(usage)) {
    assert.ok(n >= 1 && n <= FAMILY_APPS.length, `${subpath}: compte aberrant`);
    assert.equal(
      n,
      FAMILY_APPS.filter(a => a.configs.includes(subpath)).length,
      `${subpath}: compte incohérent avec le catalogue`
    );
  }
  assert.equal(
    Object.keys(usage).length,
    new Set(FAMILY_APPS.flatMap(a => a.configs)).size
  );
});

test('filterApps({config}) retient les dépôts qui consomment le sous-chemin', () => {
  const withCss = filterApps({ config: 'components.css' });
  assert.ok(withCss.every(a => a.configs.includes('components.css')));
  assert.equal(
    withCss.length,
    FAMILY_APPS.filter(a => a.configs.includes('components.css')).length
  );
  // Un tableau vaut « l'un OU l'autre ».
  const either = filterApps({ config: ['commitlint', 'components.css'] });
  assert.ok(either.length >= withCss.length);
});

/*
 * Le tableau « Projets consommateurs » du README redisait à la main ce que le
 * catalogue sait déjà, et il avait divergé sur la persistance de `miss-uwh`.
 * Il est désormais engendré ; ce test refuse une version périmée.
 */
test('le tableau du README est celui qu’engendre le catalogue', async () => {
  const { consumersTable, README_START, README_END } = await import(
    '../scripts/sync-generated.mjs'
  );
  const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8');
  const start = readme.indexOf(README_START);
  const end = readme.indexOf(README_END);
  assert.ok(start !== -1 && end > start, 'marqueurs du bloc engendré absents');

  const bloc = readme.slice(start + README_START.length, end).trim();
  const attendu = consumersTable().trim();
  const compact = md =>
    md
      .split('\n')
      .map(l =>
        l
          .split('|')
          .map(c => c.trim())
          .join('|')
      )
      // Prettier réaligne les colonnes et les tirets de séparation : on compare
      // le contenu, pas la largeur des cellules.
      .filter(l => !/^\|?[-|\s]+\|?$/.test(l))
      .join('\n');
  assert.equal(
    compact(bloc),
    compact(attendu),
    'tableau périmé : lancer `npm run sync`'
  );
});

/*
 * Le showroom est une page unique : sans données structurées, il n'expose
 * qu'un titre aux moteurs, pour seize applications décrites. Le bloc est
 * ENGENDRÉ dans le `<head>` plutôt qu'injecté en JS — sinon un moteur qui
 * n'exécute pas le script ne le voit pas.
 */
test('le JSON-LD de la vitrine décrit les seize apps', async () => {
  const { appsJsonLd, JSONLD_START, JSONLD_END } = await import(
    '../scripts/sync-generated.mjs'
  );
  const html = readFileSync(
    new URL('../showroom/index.html', import.meta.url),
    'utf8'
  );
  const start = html.indexOf(JSONLD_START);
  const end = html.indexOf(JSONLD_END);
  assert.ok(start !== -1 && end > start, 'marqueurs du bloc JSON-LD absents');

  const bloc = html.slice(start + JSONLD_START.length, end);
  const json = bloc.match(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
  );
  assert.ok(json, 'balise application/ld+json absente du bloc engendré');
  assert.deepEqual(
    JSON.parse(json[1]),
    appsJsonLd(),
    'JSON-LD périmé : lancer `npm run sync`'
  );
});

/* ── Une catégorie sans libellé est une catégorie invisible ────────────── */

/**
 * LE DÉFAUT QUE CECI EMPÊCHE. `mister-family-map` a été rangée dans `outils`
 * « faute de mieux », la taxonomie n'ayant pas de domaine pour une sortie en
 * famille. En ajouter un touche TROIS fichiers en plus du catalogue : le type
 * publié, le libellé français de la vitrine, et sa traduction anglaise. Un
 * oubli ne casse rien — la facette affiche simplement l'identifiant brut, ou
 * rien du tout, et personne ne le voit avant un utilisateur.
 */
test('chaque catégorie du catalogue porte ses libellés', async () => {
  const { readFileSync } = await import('node:fs');
  const read = name =>
    readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

  const showroom = read('showroom/showroom.js');
  const startFr = showroom.indexOf('var CATEGORY_FR = {');
  assert.notEqual(startFr, -1, 'CATEGORY_FR introuvable dans la vitrine');
  const tableFr = showroom.slice(startFr, showroom.indexOf('};', startFr));

  const i18n = read('showroom/i18n.js');

  for (const category of CATEGORIES) {
    assert.match(
      tableFr,
      new RegExp(`\\b${category}:\\s*'`),
      `${category} : libellé français manquant (showroom/showroom.js)`
    );
    assert.ok(
      i18n.includes(`'ui.category.${category}'`),
      `${category} : traduction anglaise manquante (showroom/i18n.js)`
    );
  }

  // Et le type publié doit connaître les mêmes valeurs, sinon une app rangée
  // dans une catégorie neuve ne compile pas chez le consommateur.
  const types = read('apps-catalog.d.ts');
  for (const category of CATEGORIES) {
    assert.ok(
      types.includes(`'${category}'`),
      `${category} : absent de apps-catalog.d.ts`
    );
  }
});
