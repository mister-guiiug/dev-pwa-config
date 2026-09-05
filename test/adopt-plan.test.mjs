// Plan d'adoption (`scripts/adopt-plan.mjs`).
//
// CE QUI SE JOUE. Un codemod qui interprète mal ne casse pas : il réécrit du
// code juste en code faux, sur seize dépôts d'un coup. Ces tests éprouvent
// surtout ce qu'il REFUSE de faire — c'est là que se trouve sa sûreté.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPORTED_TYPES,
  EXPORTS,
  SUBPATHS,
  findLocalImports,
  importedSymbols,
  planForApp,
  rewriteImports,
  splitImportedSymbols,
} from '../scripts/adopt-plan.mjs';

/* ── Le relevé des imports ─────────────────────────────────────────────── */

test('les symboles nommés sont relevés, alias compris', () => {
  const source = `
    import { Button, Card as Panneau } from '../ui/Button';
    import autre from 'ailleurs';
  `;
  assert.deepEqual(importedSymbols(source, '../ui/Button'), ['Button', 'Card']);
});

test('un import par défaut ou étoilé est IGNORÉ, pas deviné', () => {
  // Un codemod qui interprète mal réécrit du code juste en code faux : mieux
  // vaut ne rien faire et le signaler.
  const parDefaut = `import Button from '../ui/Button';`;
  const etoile = `import * as UI from '../ui/Button';`;
  assert.deepEqual(importedSymbols(parDefaut, '../ui/Button'), []);
  assert.deepEqual(importedSymbols(etoile, '../ui/Button'), []);
});

test('le chemin d’import est RELEVÉ, jamais construit', () => {
  // Deviner `../../shared/ui/Button` depuis une arborescence suppose une
  // convention que les dix-sept apps ne partagent pas.
  const source = `
    import { Button } from '../../shared/ui/Button';
    import { Other } from './Button.tsx';
  `;
  const trouves = findLocalImports(source, 'Button');
  assert.ok(trouves.includes('../../shared/ui/Button'));
  assert.ok(trouves.includes('./Button.tsx'));
});

test('les types sont relevés à part, sous leur nom nu', () => {
  const source = [
    `import { distanceKm, type Coordinates } from './geo';`,
    `import type { BoundingBox } from './geo';`,
  ].join('\n');
  const { values, types } = splitImportedSymbols(source, './geo');
  assert.deepEqual(values, ['distanceKm']);
  assert.deepEqual(types, ['Coordinates', 'BoundingBox']);
});

test('un import DÉJÀ migré n’est pas repris pour un voisin', () => {
  // `@mister-guiiug/dev-pwa-config/storage` se termine par `/storage` : pris
  // pour un fichier local, il était réécrit vers lui-même et compté comme une
  // réécriture. Le chiffre de la campagne grossissait de ce qui était déjà fait.
  const source = [
    `import { createStore } from '@mister-guiiug/dev-pwa-config/storage';`,
    `import { loadData } from '../lib/storage';`,
  ].join('\n');
  assert.deepEqual(findLocalImports(source, 'storage'), ['../lib/storage']);
});

/* ── La réécriture ─────────────────────────────────────────────────────── */

test('un type publié par le sous-chemin ne bloque PAS le fichier', () => {
  // Le cas réel : quatorze fichiers de `mister-family-map` importent
  // `type Coordinates` à côté de `distanceKm`. Cherché parmi les valeurs d'un
  // module JavaScript, un type est toujours absent — six réécritures
  // légitimes étaient déclarées bloquées pour cette seule raison.
  const source = `import { distanceKm, type Coordinates } from './geo';`;
  const result = rewriteImports(source, {
    localPath: './geo',
    subpath: 'geo',
    expected: EXPORTS.geo,
    expectedTypes: EXPORTED_TYPES.geo,
  });
  assert.equal(result.blocked, undefined);
  assert.match(result.source, /from '@mister-guiiug\/dev-pwa-config\/geo'/);
  assert.ok(result.source.includes('type Coordinates'), 'le type est conservé');
});

test('une clause `import type` entière est réécrite elle aussi', () => {
  // Laissée derrière, elle garderait le fichier recopié vivant — et l'orphelin
  // ne serait jamais supprimable.
  const source = `import type { Coordinates } from './geo';`;
  const result = rewriteImports(source, {
    localPath: './geo',
    subpath: 'geo',
    expected: EXPORTS.geo,
    expectedTypes: EXPORTED_TYPES.geo,
  });
  assert.equal(
    result.source,
    `import type { Coordinates } from '@mister-guiiug/dev-pwa-config/geo';`
  );
});

test('un type ABSENT des deux tables bloque comme une valeur', () => {
  const source = `import { distanceKm, type Zone } from './geo';`;
  const result = rewriteImports(source, {
    localPath: './geo',
    subpath: 'geo',
    expected: EXPORTS.geo,
    expectedTypes: EXPORTED_TYPES.geo,
  });
  assert.deepEqual(result.blocked, ['Zone']);
  assert.equal(result.source, undefined, 'rien n’est réécrit');
});

test('l’import local devient le sous-chemin du socle', () => {
  const source = `import { EmptyState } from '../ui/EmptyState';\nexport const x = 1;`;
  const result = rewriteImports(source, {
    localPath: '../ui/EmptyState',
    subpath: 'react/empty-state',
    expected: ['EmptyState'],
  });
  assert.equal(
    result.source,
    `import { EmptyState } from '@mister-guiiug/dev-pwa-config/react/empty-state';\nexport const x = 1;`
  );
  assert.deepEqual(result.symbols, ['EmptyState']);
});

test('un symbole ABSENT du sous-chemin bloque tout le fichier', () => {
  // Le cas réel : l'app a collé son `ListSkeleton` à côté du `Skeleton`
  // promu. Réécrire l'import casserait la compilation.
  const source = `import { Skeleton, ListSkeleton } from '../ui/Skeleton';`;
  const result = rewriteImports(source, {
    localPath: '../ui/Skeleton',
    subpath: 'react/skeleton',
    expected: ['Skeleton'],
  });
  assert.deepEqual(result.blocked, ['ListSkeleton']);
  assert.equal(result.source, undefined, 'rien n’est réécrit');
});

test('un fichier qui n’importe rien de ce module rend `null`', () => {
  // Distingue « déjà migré » de « migré maintenant » : un rapport honnête en
  // dépend.
  const result = rewriteImports(`import { A } from 'ailleurs';`, {
    localPath: '../ui/Button',
    subpath: 'react/button',
    expected: ['Button'],
  });
  assert.equal(result, null);
});

test('plusieurs imports du même module sont tous réécrits', () => {
  const source = [
    `import { Sheet } from '../ui/Sheet';`,
    `import { Sheet as S } from '../ui/Sheet';`,
  ].join('\n');
  const result = rewriteImports(source, {
    localPath: '../ui/Sheet',
    subpath: 'react/sheet',
    expected: ['Sheet'],
  });
  assert.equal(result.source.match(/dev-pwa-config\/react\/sheet/g).length, 2);
});

test('les imports d’AUTRES modules ne sont pas touchés', () => {
  const source = [
    `import { Button } from '../ui/Button';`,
    `import { Card } from '../ui/Card';`,
  ].join('\n');
  const result = rewriteImports(source, {
    localPath: '../ui/Button',
    subpath: 'react/button',
    expected: ['Button'],
  });
  assert.ok(result.source.includes(`import { Card } from '../ui/Card';`));
});

/* ── Le plan ───────────────────────────────────────────────────────────── */

test('un doublon sans sous-chemin est un candidat à la PROMOTION', () => {
  // Migrer et promouvoir ne se confondent pas : dire « aucun sous-chemin » est
  // une information, pas un échec.
  const [step] = planForApp({
    duplicates: [{ exported: 'inconnu', file: 'inconnu.ts' }],
  });
  assert.equal(step.status, 'no-subpath');
  assert.match(step.reason, /aucun sous-chemin/);
});

test('un doublon connu porte son sous-chemin et ses symboles attendus', () => {
  const [step] = planForApp({
    duplicates: [{ exported: 'Toast', file: 'Toast.tsx' }],
  });
  assert.equal(step.status, 'ready');
  assert.equal(step.subpath, 'react/toast');
  assert.deepEqual(step.expected, ['Toast']);
});

test('un sous-chemin qui exporte plusieurs symboles les déclare tous', () => {
  const [step] = planForApp({
    duplicates: [
      {
        exported: 'TextField / SelectField / TextAreaField',
        file: 'Field.tsx',
      },
    ],
  });
  assert.deepEqual(step.expected, EXPORTS['react/field']);
  assert.ok(step.expected.includes('SelectField'));
});

/* ── La carte elle-même ────────────────────────────────────────────────── */

test('chaque sous-chemin cité est réellement publié', async () => {
  // Une carte qui pointe vers un sous-chemin inexistant produirait des imports
  // cassés — sur seize dépôts.
  const { readFileSync } = await import('node:fs');
  const pkg = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  );
  for (const subpath of Object.values(SUBPATHS)) {
    assert.ok(
      pkg.exports[`./${subpath}`],
      `${subpath} n’est pas publié par package.json`
    );
  }
});

test('les symboles déclarés existent vraiment dans leur module', async () => {
  for (const [subpath, symbols] of Object.entries(EXPORTS)) {
    const module = await import(`../${subpath}.js`);
    for (const name of symbols) {
      assert.ok(name in module, `${subpath} n’exporte pas ${name}`);
    }
  }
});

test('les types déclarés existent vraiment dans leur déclaration', async () => {
  // Un type ne s'importe pas à l'exécution : c'est le `.d.ts` qui fait foi.
  // Sans ce test, la table des types serait la seule affirmation du dépôt que
  // rien ne vérifie — et un codemod qui débloque à tort est pire qu'un codemod
  // qui bloque à tort.
  const { readFileSync } = await import('node:fs');
  for (const [subpath, names] of Object.entries(EXPORTED_TYPES)) {
    const declaration = readFileSync(
      new URL(`../${subpath}.d.ts`, import.meta.url),
      'utf8'
    );
    for (const name of names) {
      assert.match(
        declaration,
        new RegExp(`export (declare )?(type|interface) ${name}\\b`),
        `${subpath}.d.ts ne déclare pas ${name}`
      );
    }
  }
});
