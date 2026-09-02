// `scripts/dead-exports.mjs` — les deux verdicts, et ce qui n'en est pas un.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENTRY_POINTS, findDeadExports } from '../scripts/dead-exports.mjs';

const app = {
  'src/main.tsx': `import { App } from './App';\nimport { boot } from './lib/boot';\nboot(); App;`,
  'src/App.tsx': `export function App() { return null; }`,
  'src/lib/boot.ts': `export function boot() { helper(); }\nexport function helper() {}\nexport function orphan() {}\nexport const ONLY_TESTED = 1;`,
  'src/lib/boot.test.ts': `import { ONLY_TESTED } from './boot';\nONLY_TESTED;`,
  'src/lib/shadow.ts': `export const orphanCousin = 'orphan is a word here';`,
};
const files = Object.entries(app).map(([rel, source]) => ({ rel, source }));

test('un export cité ailleurs vit ; cité nulle part, il est mort', () => {
  const { dead, unused } = findDeadExports(files);
  assert.ok(!dead.some(d => d.name === 'boot'), 'boot est importé par main');
  assert.deepEqual(
    dead.map(d => d.name),
    ['orphanCousin'],
    'orphanCousin n’est cité nulle part — même pas dans son fichier'
  );
  assert.ok(!unused.some(u => u.name === 'orphanCousin'));
});

test('un export utilisé dans son seul fichier est SUPERFLU, pas mort', () => {
  const { dead, unused } = findDeadExports(files);
  assert.ok(
    unused.some(u => u.name === 'helper'),
    'helper sert à boot'
  );
  assert.ok(!dead.some(d => d.name === 'helper'));
});

test('cité par un test seulement : vivant — un utilitaire de test n’est pas un cadavre', () => {
  const { dead, unused } = findDeadExports(files);
  assert.ok(!dead.some(d => d.name === 'ONLY_TESTED'));
  assert.ok(!unused.some(u => u.name === 'ONLY_TESTED'));
});

test('le mot entier compte : « orphan » dans « orphanCousin » ne ressuscite pas orphan', () => {
  // `shadow.ts` contient le mot « orphan » dans une chaîne, en entier : c'est
  // une citation (l'outil lit, il n'exécute pas). `orphanCousin`, lui, ne
  // contient pas le mot entier `orphan` — la frontière de mot tient.
  const { dead } = findDeadExports(files);
  assert.ok(
    !dead.some(d => d.name === 'orphan'),
    'cité en clair dans shadow.ts'
  );
});

test('un consommateur hors src/ (Edge Function, serveur) tient l’export en vie sans être jugé', () => {
  // miss-lookhouse : `collectSite` n'avait aucun importateur dans src/ et
  // faisait tourner la collecte dans une Edge Function Deno (copie du cœur).
  const { dead, total } = findDeadExports([
    ...files,
    {
      rel: 'supabase/functions/_shared/collect.ts',
      source: `import { orphanCousin } from '../../../src/lib/shadow';\nexport function handler() { return orphanCousin; }`,
      citationOnly: true,
    },
  ]);
  assert.ok(
    !dead.some(d => d.name === 'orphanCousin'),
    'cité par la fonction Edge'
  );
  assert.equal(
    total,
    5,
    '`handler` n’est pas jugé : le fichier ne fait que citer'
  );
});

test('les points d’entrée ne sont pas jugés, et les tests ne déclarent rien', () => {
  assert.ok(ENTRY_POINTS.test('src/main.tsx'));
  assert.ok(ENTRY_POINTS.test('src/App.tsx'));
  assert.ok(!ENTRY_POINTS.test('src/lib/App.tsx'));
  const { total } = findDeadExports(files);
  // boot, helper, orphan, ONLY_TESTED, orphanCousin — pas App (entrée), pas
  // le test.
  assert.equal(total, 5);
});
