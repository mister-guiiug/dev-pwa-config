/**
 * `web-vitals.js` — quatre apps croient mesurer cinq métriques, en mesurent une.
 *
 * Les quatre déclarent `web-vitals: ^4.2.0` (résolu en 4.2.4 dans les quatre
 * verrous) et appellent `onFID`, RETIRÉ en v4.0. Le code lit :
 *
 *   const { onCLS, onFID, … } = await import('web-vitals');
 *   onCLS(logMetric);
 *   onFID(logMetric);   // TypeError, avalé par le try/catch qui entoure tout
 *   onFCP(logMetric);   // jamais atteint
 *
 * Le premier test reproduit exactement ça.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setupDom } from './helpers/dom.mjs';
import { initWebVitals, rate, WEB_VITALS, THRESHOLDS } from '../web-vitals.js';

/** Faux `web-vitals`, dont on choisit les fonctions présentes. */
function fakeLib(present = WEB_VITALS, { throwOn = [] } = {}) {
  const calls = [];
  const lib = {};
  for (const name of present) {
    lib[`on${name}`] = handler => {
      if (throwOn.includes(name)) throw new Error(`${name} indisponible`);
      calls.push(name);
      handler({ name, value: 1, id: `v-${name}`, rating: 'good' });
    };
  }
  return { lib, calls };
}

test('une métrique disparue n’emporte plus les suivantes', async () => {
  // v4 n'expose plus `onFID`. Les copies enregistraient CLS puis mouraient.
  const dom = setupDom();
  try {
    const { lib, calls } = fakeLib(['TTFB', 'FCP', 'LCP', 'CLS']); // pas d'INP
    const erreurs = [];
    const registered = await initWebVitals({
      loader: () => Promise.resolve(lib),
      onError: (name, error) => erreurs.push([name, error.message]),
    });
    assert.deepEqual(registered, ['TTFB', 'FCP', 'LCP', 'CLS']);
    assert.deepEqual(calls, ['TTFB', 'FCP', 'LCP', 'CLS']);
    assert.equal(erreurs.length, 1);
    assert.equal(erreurs[0][0], 'INP');
    assert.match(erreurs[0][1], /onINP/);
  } finally {
    dom.restore();
  }
});

test('une métrique qui lève n’emporte pas les autres non plus', async () => {
  const dom = setupDom();
  try {
    const { lib } = fakeLib(WEB_VITALS, { throwOn: ['LCP'] });
    const erreurs = [];
    const registered = await initWebVitals({
      loader: () => Promise.resolve(lib),
      onError: name => erreurs.push(name),
    });
    assert.deepEqual(registered, ['TTFB', 'FCP', 'CLS', 'INP']);
    assert.deepEqual(erreurs, ['LCP']);
  } finally {
    dom.restore();
  }
});

test('INP remplace FID, qui n’existe plus', () => {
  assert.ok(WEB_VITALS.includes('INP'));
  assert.ok(!WEB_VITALS.includes('FID'));
  assert.ok(THRESHOLDS.INP, 'seuils INP absents');
});

test('chaque relevé est transmis avec son verdict', async () => {
  const dom = setupDom();
  try {
    const { lib } = fakeLib(['LCP']);
    const vus = [];
    await initWebVitals({
      loader: () => Promise.resolve(lib),
      onMetric: m => vus.push(m),
    });
    assert.equal(vus.length, 1);
    assert.deepEqual(vus[0], {
      name: 'LCP',
      value: 1,
      rating: 'good',
      id: 'v-LCP',
    });
  } finally {
    dom.restore();
  }
});

test('une bibliothèque absente ne casse rien, et le dit', async () => {
  const dom = setupDom();
  try {
    const erreurs = [];
    const registered = await initWebVitals({
      loader: () => Promise.reject(new Error('module introuvable')),
      onError: (name, error) => erreurs.push([name, error.message]),
    });
    assert.deepEqual(registered, []);
    assert.deepEqual(erreurs, [['import', 'module introuvable']]);
  } finally {
    dom.restore();
  }
});

test('hors navigateur, initWebVitals ne tente rien', async () => {
  let charge = 0;
  const registered = await initWebVitals({
    loader: () => {
      charge += 1;
      return Promise.resolve({});
    },
  });
  assert.deepEqual(registered, []);
  assert.equal(charge, 0, 'la bibliothèque a été chargée côté serveur');
});

test('rate applique les seuils publiés', () => {
  assert.equal(rate('LCP', 2500), 'good');
  assert.equal(rate('LCP', 2501), 'needs-improvement');
  assert.equal(rate('LCP', 4001), 'poor');
  assert.equal(rate('CLS', 0.05), 'good');
  assert.equal(rate('INP', 200), 'good');
  assert.equal(rate('INCONNU', 1), 'unknown');
  assert.equal(rate('LCP', Number.NaN), 'unknown');
});

test('web-vitals est une peer OPTIONNELLE, et le module l’importe paresseusement', async () => {
  const { readFileSync } = await import('node:fs');
  const pkg = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  );
  assert.equal(pkg.peerDependencies['web-vitals'], '^4.2.0');
  assert.equal(pkg.peerDependenciesMeta['web-vitals'].optional, true);
  const source = readFileSync(
    new URL('../web-vitals.js', import.meta.url),
    'utf8'
  );
  assert.doesNotMatch(
    source,
    /^import .*'web-vitals'/m,
    'un import statique embarquerait la bibliothèque dans toutes les apps'
  );
});
