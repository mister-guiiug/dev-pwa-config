// Tests du catalogue famille (`apps-catalog.js`) — données PURES, sans React.
// L'existence et la parité .d.ts/.js de l'export `./apps-catalog` sont déjà
// couvertes dynamiquement par `configs.test.mjs`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  FAMILY_APPS,
  otherApps,
  repoUrl,
  pagesUrl,
  SPONSOR_URL,
  GITHUB_OWNER,
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
