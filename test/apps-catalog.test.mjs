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
 * ou tard — `npm run showroom:sync` la régénère.
 */
test('showroom/apps.js est le miroir exact du catalogue', async () => {
  await import('../showroom/apps.js');
  const { showroomAppsData } = await import('../scripts/sync-showroom.mjs');
  assert.deepEqual(
    globalThis.SHOWROOM_APPS,
    showroomAppsData(),
    'miroir périmé : lancer `npm run showroom:sync`'
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
