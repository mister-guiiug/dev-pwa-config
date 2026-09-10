// La sonde des plafonds : ce qu'une plage interdit, et ce que le registre
// publie. Aucun accès réseau ici — `fetch` est injecté.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  analyse,
  enRetard,
  format,
  plafond,
  versionsPubliees,
} from '../scripts/plafonds.mjs';

test('plafond : la borne haute de chaque forme de plage', () => {
  assert.deepEqual(plafond('^9.39.4'), { majeure: 9, mineure: Infinity });
  assert.deepEqual(plafond('~6.0.3'), { majeure: 6, mineure: 0 });
  // Une union prend la plus haute des bornes : c'est ce qu'une app peut monter.
  assert.deepEqual(plafond('^9.39.4 || ^10.0.0'), {
    majeure: 10,
    mineure: Infinity,
  });
  // `^0.5.2` s'arrête à `0.5.x` — semver traite les 0.x comme des majeures.
  assert.deepEqual(plafond('^0.5.2'), { majeure: 0, mineure: 5 });
});

test('une plage sans borne haute n’interdit rien', () => {
  for (const ouverte of ['>=8.0.0', '>=22', '*', 'x', '', 'workspace:*']) {
    assert.equal(
      plafond(ouverte).majeure,
      Infinity,
      `${ouverte} ne devrait pas plafonner`
    );
  }
  // Et donc jamais de retard, quelle que soit la version publiée.
  assert.equal(enRetard('>=8.0.0', '10.74.0'), false);
});

test('enRetard compare des majeures, pas des chaînes', () => {
  assert.equal(enRetard('^9.39.4', '10.10.0'), true);
  assert.equal(enRetard('^9.39.4 || ^10.0.0', '10.10.0'), false);
  // 9.40 > 9.39 en version, mais la plage l'accepte : ce n'est pas un plafond.
  assert.equal(enRetard('^9.39.4', '9.40.0'), false);
  // Le cas 0.x : `^0.5.2` interdit bien 0.6.
  assert.equal(enRetard('^0.5.2', '0.6.0'), true);
  assert.equal(enRetard('^0.5.2', '0.5.9'), false);
  // Une version illisible ne fabrique pas un retard.
  assert.equal(enRetard('^4.0.0', 'latest'), false);
});

test('une version non lue est « inconnue », jamais un retard', () => {
  const lignes = analyse({ a: '^1.0.0', b: '^2.0.0' }, { a: null, b: '3.0.0' });
  assert.deepEqual(
    lignes.map(l => [l.nom, l.verdict]),
    [
      ['a', 'inconnue'],
      ['b', 'retard'],
    ]
  );
});

test('versionsPubliees lit dist-tags.latest, et encaisse une panne', async () => {
  const vus = [];
  const fetchImpl = async url => {
    vus.push(url);
    if (url.endsWith('casse')) throw new Error('registre injoignable');
    if (url.endsWith('absent')) return { ok: false };
    return {
      ok: true,
      json: async () => ({ 'dist-tags': { latest: '5.0.0' } }),
    };
  };
  const versions = await versionsPubliees(
    ['vitest', '@scope/paquet', 'casse', 'absent'],
    { fetchImpl, registre: 'https://registre.test' }
  );
  assert.deepEqual(versions, {
    vitest: '5.0.0',
    '@scope/paquet': '5.0.0',
    casse: null,
    absent: null,
  });
  // La barre du scope est encodée : sans cela le registre rend un 404.
  assert.ok(vus.includes('https://registre.test/@scope%2fpaquet'));
});

test('format : le tableau ne montre que ce qui est en retard', () => {
  const sortie = format([
    { nom: 'vitest', plage: '^4.0.0', publiee: '5.0.0', verdict: 'retard' },
    { nom: 'react', plage: '^19.0.0', publiee: '19.2.0', verdict: 'ok' },
    { nom: 'sharp', plage: '>=0.33', publiee: null, verdict: 'inconnue' },
  ]);
  assert.match(sortie, /vitest/);
  assert.doesNotMatch(sortie, /\| `react`/);
  assert.match(sortie, /sharp/);
});

test('format : le silence est explicite quand tout est à jour', () => {
  const sortie = format([
    { nom: 'react', plage: '^19.0.0', publiee: '19.2.0', verdict: 'ok' },
  ]);
  assert.match(sortie, /aucun plafond/);
});
