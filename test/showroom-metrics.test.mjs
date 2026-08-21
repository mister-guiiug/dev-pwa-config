// Forme du relevé nocturne (`showroom/metrics.js`).
//
// Le fichier est ENGENDRÉ par `scripts/fetch-metrics.mjs` et commité par un
// workflow, donc écrit par personne. Deux façons de le casser en silence :
// changer la forme sans prévenir la page, ou y laisser un dépôt qui n'existe
// plus au catalogue. Ce test tient les deux — et le workflow le rejoue avant de
// commiter, pour ne jamais pousser un fichier que la page ne saurait lire.
//
// Il doit passer sur un fichier VIDE : c'est l'état par défaut du dépôt, tant
// que le workflow n'est jamais passé.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FAMILY_APPS } from '../apps-catalog.js';

await import('../showroom/metrics.js');
const METRICS = globalThis.SHOWROOM_METRICS;

const IDS = new Set(FAMILY_APPS.map(a => a.id));

test('metrics.js pose un objet bien formé sur globalThis', () => {
  assert.ok(METRICS && typeof METRICS === 'object', 'SHOWROOM_METRICS absent');
  assert.ok(
    METRICS.generatedAt === null || typeof METRICS.generatedAt === 'string',
    'generatedAt doit être une date ISO ou null'
  );
  if (METRICS.generatedAt) {
    assert.ok(
      Number.isFinite(Date.parse(METRICS.generatedAt)),
      'generatedAt illisible'
    );
  }
  assert.ok(
    METRICS.repos && typeof METRICS.repos === 'object',
    'repos doit être un objet (vide au repos)'
  );
});

test('chaque entrée relevée correspond à une app du catalogue', () => {
  for (const id of Object.keys(METRICS.repos)) {
    assert.ok(IDS.has(id), `dépôt inconnu au catalogue : ${id}`);
  }
});

test('les champs relevés ont la forme attendue', () => {
  for (const [id, m] of Object.entries(METRICS.repos)) {
    assert.equal(typeof m.archived, 'boolean', `${id}: archived`);
    assert.equal(typeof m.openIssues, 'number', `${id}: openIssues`);
    for (const key of ['pushedAt', 'releasedAt']) {
      assert.ok(
        m[key] === null || Number.isFinite(Date.parse(m[key])),
        `${id}: ${key} doit être une date ISO ou null`
      );
    }
    assert.ok(
      m.version === null || typeof m.version === 'string',
      `${id}: version doit être une chaîne ou null`
    );
  }
});

test('le showroom charge le relevé avant showroom.js', () => {
  const html = readFileSync(
    new URL('../showroom/index.html', import.meta.url),
    'utf8'
  );
  const metrics = html.indexOf('metrics.js"');
  const main = html.indexOf('showroom.js"');
  assert.ok(metrics !== -1, 'metrics.js n’est pas chargé par la page');
  assert.ok(metrics < main, 'showroom.js lirait un relevé non défini');
});

test('le fichier engendré est exactement celui que produit le script', async () => {
  const { renderMetrics } = await import('../scripts/fetch-metrics.mjs');
  const onDisk = readFileSync(
    new URL('../showroom/metrics.js', import.meta.url),
    'utf8'
  );
  assert.equal(
    onDisk,
    renderMetrics({
      generatedAt: METRICS.generatedAt,
      repos: METRICS.repos,
    }),
    'metrics.js a été édité à la main, ou le format a changé sans le script'
  );
});
