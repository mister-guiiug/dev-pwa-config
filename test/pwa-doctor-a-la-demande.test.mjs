/**
 * `pwa-doctor` — `module-a-la-demande-precharge` : un module du socle chargé
 * à la demande, qu'un regroupement a rangé dans un morceau du démarrage.
 *
 * Relevé le 21/11/2026 : à la sortie de 6.38.0, `analytics-erreurs.js`
 * (1,8 kB gzip), importé par `import()` seulement, est tombé dans le `vendor`
 * préchargé des quinze apps dont le `manualChunks` y range tout
 * `node_modules`. Trois montées ont dépassé leur budget le même soir
 * (mister-cim10, miss-uwh, mister-footcoach) ; le budget disait « trop
 * lourd », rien ne disait QUOI.
 *
 * Les builds factices reprennent la forme de celui de mister-cim10 : la page,
 * l'entrée, le `vendor` qu'elle importe statiquement, et leurs cartes de
 * source — c'est par elles que le contrôle sait quels modules un fichier
 * porte.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { aLaDemandeAuDemarrage, diagnose } from '../scripts/pwa-doctor.mjs';

function repo(files, fn) {
  const root = mkdtempSync(join(tmpdir(), 'dwc-doctor-a-la-demande-'));
  for (const [rel, content] of Object.entries(files)) {
    const path = join(root, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      typeof content === 'string' ? content : JSON.stringify(content)
    );
  }
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const ID = 'module-a-la-demande-precharge';
const trouve = root => diagnose(root).findings.find(f => f.id === ID);

const INDEX = 'index-DMQmPuWr.js';
const VENDOR = 'vendor-DmHh4SAt.js';
const SOCLE = '../../node_modules/@mister-guiiug/dev-pwa-config';

const page = [
  '<!doctype html><html lang="fr"><head>',
  '<meta name="viewport" content="width=device-width">',
  `<script type="module" crossorigin src="/miss-x/assets/${INDEX}"></script>`,
  `<link rel="modulepreload" crossorigin href="/miss-x/assets/${VENDOR}">`,
  '</head><body><div id="root"></div></body></html>',
].join('\n');

const carte = sources => ({ version: 3, sources, mappings: '' });

/** Un build : `vendor` porte les `sources` données. */
const build = (sourcesVendor, extra = {}) => ({
  'package.json': { name: 'miss-x' },
  'dist/index.html': page,
  [`dist/assets/${INDEX}`]: `import{a}from"./${VENDOR}";a();`,
  [`dist/assets/${INDEX}.map`]: carte(['../../src/main.tsx']),
  [`dist/assets/${VENDOR}`]: 'export const a=()=>{};',
  [`dist/assets/${VENDOR}.map`]: carte(sourcesVendor),
  ...extra,
});

test('le cas de 6.38.0 : analytics-erreurs dans le vendor préchargé', () => {
  repo(
    build([
      `${SOCLE}/analytics.js`,
      `${SOCLE}/analytics-erreurs.js`,
      '../../node_modules/zustand/esm/index.mjs',
    ]),
    root => {
      const f = trouve(root);
      assert.ok(f, 'le module à la demande préchargé doit être signalé');
      assert.equal(f.level, 'dette');
      assert.match(f.message, /analytics-erreurs\.js/u);
      // Le chemin le plus court : `vendor` est un `modulepreload` de la page.
      assert.ok(f.message.includes(`index.html → ${VENDOR}`), f.message);
      assert.match(f.fix, /isOnDemandSocleModule/u);
    }
  );
});

test('rangé à part, il ne pèse pas sur le démarrage : rien à dire', () => {
  repo(
    build([`${SOCLE}/analytics.js`], {
      // Un morceau atteint par `import()` seulement : hors de la fermeture
      // statique, donc hors du contrôle — même avec sa carte.
      'dist/assets/analytics-erreurs-DE794IaG.js': 'export const x=1;',
      'dist/assets/analytics-erreurs-DE794IaG.js.map': carte([
        `${SOCLE}/analytics-erreurs.js`,
      ]),
    }),
    root => assert.equal(trouve(root), undefined)
  );
});

test('analytics.js, lui, est chargé au démarrage : ce n’est pas une dette', () => {
  repo(build([`${SOCLE}/analytics.js`, `${SOCLE}/vite-pwa.js`]), root =>
    assert.equal(trouve(root), undefined)
  );
});

test('sans carte de source, le contrôle se tait : il ne sait pas', () => {
  const sansCarte = build([`${SOCLE}/analytics-erreurs.js`]);
  delete sansCarte[`dist/assets/${VENDOR}.map`];
  repo(sansCarte, root => assert.equal(trouve(root), undefined));
});

test('une carte illisible ne fait pas tomber le docteur', () => {
  const cassee = build([]);
  cassee[`dist/assets/${VENDOR}.map`] = '{ pas du json';
  repo(cassee, root => assert.equal(trouve(root), undefined));
});

test('aLaDemandeAuDemarrage nomme chaque module et le fichier qui le porte', () => {
  repo(
    build([`${SOCLE}/analytics-url.js`, `${SOCLE}/analytics-erreurs.js`]),
    root => {
      const liste = aLaDemandeAuDemarrage(
        root,
        [`/miss-x/assets/${INDEX}`, `/miss-x/assets/${VENDOR}`],
        '/miss-x/'
      );
      assert.deepEqual(
        liste.map(x => `${x.module}@${x.fichier}`),
        [
          `analytics-url.js@assets/${VENDOR}`,
          `analytics-erreurs.js@assets/${VENDOR}`,
        ]
      );
    }
  );
});
