/**
 * Les données de référencement (`apps-seo.js`) : complètes, bien formées, et
 * HORS du bundle. Elles vivaient dans les fiches du catalogue en 6.19.0, que
 * `FamilyApps` importe à l'exécution — 4 kB gzip de plus dans chaque app,
 * relevés le 29/09/2026 par le budget de miss-supaboss (chemin critique de
 * 199,9 à 203,4 kB). Ces tests gardent la frontière.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAMILY_APPS } from '../apps-catalog.js';
import { APP_SEO, appSeo } from '../apps-seo.js';

const RACINE = fileURLToPath(new URL('..', import.meta.url));

/** Un `import … from '…apps-seo…'` statique, ou un `import('…apps-seo…')`. */
const IMPORTE_APPS_SEO =
  /\bfrom\s+['"][^'"]*apps-seo(?:\.js)?['"]|\bimport\(\s*['"][^'"]*apps-seo/;

test('chaque app du catalogue a ses données, et rien d’autre n’en a', () => {
  // Desktop compris : le relevé du 29/09/2026 couvre toutes les fiches.
  const ids = FAMILY_APPS.map(a => a.id);
  for (const id of ids)
    assert.ok(appSeo(id), `${id} sans données de référencement`);
  for (const id of Object.keys(APP_SEO))
    assert.ok(ids.includes(id), `${id} n’est pas une app du catalogue`);
  assert.equal(appSeo('inconnue'), undefined);
  assert.equal(appSeo('toString'), undefined);
});

test('les fiches du catalogue ne portent plus languages ni features', () => {
  for (const a of FAMILY_APPS) {
    assert.ok(!('languages' in a), `${a.id} : languages dans le catalogue`);
    assert.ok(!('features' in a), `${a.id} : features dans le catalogue`);
  }
});

test('les données sont gelées', () => {
  assert.ok(Object.isFrozen(APP_SEO));
  for (const [id, s] of Object.entries(APP_SEO)) {
    assert.ok(Object.isFrozen(s), id);
    assert.ok(Object.isFrozen(s.languages) && Object.isFrozen(s.features), id);
  }
});

test('le motif d’import reconnaît les deux formes, et elles seules', () => {
  assert.match("import { appSeo } from './apps-seo.js';", IMPORTE_APPS_SEO);
  assert.match("const m = await import('../apps-seo.js');", IMPORTE_APPS_SEO);
  assert.doesNotMatch('// voir apps-seo.js, lu au build', IMPORTE_APPS_SEO);
});

test('seul le build importe apps-seo : aucun module publié d’exécution', () => {
  // Les fichiers PUBLIÉS (`files` du paquet), dossiers compris. Le build et
  // l'outillage Node ont le droit ; tout le reste peut finir dans un bundle.
  const { files } = JSON.parse(
    readFileSync(join(RACINE, 'package.json'), 'utf8')
  );
  const autorises = new Set([
    'vite-pwa-base.js',
    'apps-seo.js',
    'apps-seo.d.ts',
  ]);
  const liste = [];
  const parcourir = chemin => {
    const complet = join(RACINE, chemin);
    if (statSync(complet).isDirectory())
      for (const e of readdirSync(complet)) parcourir(join(chemin, e));
    else if (/\.(?:m?js|jsx|ts|tsx)$/.test(chemin))
      liste.push(relative(RACINE, complet).replaceAll('\\', '/'));
  };
  for (const f of files) parcourir(f);
  assert.ok(liste.length > 50, `fichiers publiés lus : ${liste.length}`);
  const fautifs = liste.filter(
    f =>
      !autorises.has(f) &&
      !f.startsWith('scripts/') &&
      IMPORTE_APPS_SEO.test(readFileSync(join(RACINE, f), 'utf8'))
  );
  assert.deepEqual(fautifs, [], 'apps-seo importé hors du build');
});

test('languages : relevées, le français d’abord, en codes à deux lettres', () => {
  for (const [id, a] of Object.entries(APP_SEO)) {
    assert.ok(Array.isArray(a.languages) && a.languages.length, id);
    assert.equal(a.languages[0], 'fr', `${id} : le français d’abord`);
    assert.ok(
      a.languages.every(l => /^[a-z]{2}$/.test(l)),
      `${id} : codes à deux lettres`
    );
    assert.equal(new Set(a.languages).size, a.languages.length, id);
  }
});

test('features : trois à six fonctions, courtes, sans point final ni doublon', () => {
  for (const [id, a] of Object.entries(APP_SEO)) {
    assert.ok(
      Array.isArray(a.features) &&
        a.features.length >= 3 &&
        a.features.length <= 6,
      `${id} : ${a.features?.length} fonctions`
    );
    for (const f of a.features) {
      assert.ok([...f].length <= 70, `${id} : « ${f} » trop longue`);
      assert.doesNotMatch(f, /\.$/, `${id} : « ${f} »`);
      assert.match(f, /^\p{Lu}/u, `${id} : « ${f} » sans majuscule`);
    }
    assert.equal(new Set(a.features).size, a.features.length, id);
    // Pas d'avis ni d'étoiles : l'absence voulue d'`aggregateRating` tient
    // (« note » est ici une note SCOLAIRE — miss-genius).
    assert.ok(
      !a.features.some(f => /\b(?:avis|étoiles?|rating)\b/i.test(f)),
      id
    );
  }
});
