/**
 * LE BALAYAGE du relevé d'adoption. Ce fichier existe parce que les deux
 * défauts corrigés le 31/08/2026 vivaient dans du code que RIEN ne pouvait
 * exercer : le point d'entrée de `measure-adoption.mjs` balaie dix-sept dépôts
 * dès qu'on le charge, donc aucun test ne pouvait l'importer.
 *
 * LES DEUX DÉFAUTS, mesurés sur les copies de travail :
 *
 *   1. `.claude` — les worktrees d'agent étaient comptés comme du code d'app.
 *      98 fichiers source sous `miss-contraction/.claude`, 298 sous
 *      `mister-footcoach`, 116 sous `mister-qowa`. miss-contraction était
 *      comptée en dette sur `useI18n` pour un fichier qui n'existe QUE dans un
 *      worktree, donc dans aucune version de l'app.
 *   2. `storage.ts` — la détection de `backup` par nom de fichier était devenue
 *      cent pour cent faux positifs, son seul vrai positif ayant migré.
 *
 * Le premier pouvait aussi mentir DANS L'AUTRE SENS : un worktree qui importe
 * le paquet ajoute ses symboles à ceux de l'app, et acquitte donc un besoin que
 * `main` ne couvre pas. Vérifié le 31/08 — aucune app n'était dans ce cas ce
 * jour-là, mais rien ne l'empêchait.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';

import {
  IGNORED_DIRS,
  PACKAGE,
  EXPORT_RE,
  findDuplicates,
  indexByName,
  walk,
} from '../scripts/adoption-scan.mjs';
import { EQUIVALENTS } from '../scripts/adoption-equivalents.mjs';

/* ── Le balayage ────────────────────────────────────────────────────────── */

/** Un faux dépôt sur disque : `walk` touche le vrai système de fichiers. */
function faussDepot(fichiers) {
  const racine = mkdtempSync(join(tmpdir(), 'dwc-scan-'));
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    const complet = join(racine, ...chemin.split('/'));
    mkdirSync(complet.slice(0, complet.lastIndexOf(sep)), { recursive: true });
    writeFileSync(complet, contenu);
  }
  return racine;
}

test('le balayage ignore les worktrees d’agent', () => {
  const racine = faussDepot({
    'src/App.tsx': 'export const App = () => null;',
    'src/styles.css': '@import "@mister-guiiug/dev-wpa-config/components.css";',
    '.claude/worktrees/abc/src/hooks/useI18n.ts': 'export const useI18n = 1;',
    'node_modules/x/index.js': 'export const x = 1;',
  });
  try {
    const trouves = walk(racine).map(f => f.slice(racine.length + 1));
    assert.deepEqual(
      trouves.map(f => f.split(sep).join('/')).sort(),
      ['src/App.tsx', 'src/styles.css'],
      'un fichier de worktree n’est dans aucune version de l’app'
    );
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
});

test('`.claude` est bien dans la liste, et les artefacts avec lui', () => {
  for (const nom of ['.claude', 'node_modules', 'dist', 'coverage']) {
    assert.ok(IGNORED_DIRS.has(nom), `${nom} devrait être ignoré`);
  }
});

test('l’index par nom écarte les tests', () => {
  const index = indexByName([
    join('src', 'Button.tsx'),
    join('src', 'Button.test.tsx'),
    join('src', 'Sheet.spec.tsx'),
  ]);
  assert.ok(index.has('Button.tsx'));
  assert.equal(index.has('Button.test.tsx'), false);
  assert.equal(index.has('Sheet.spec.tsx'), false);
});

/* ── Ce qui compte comme un doublon ─────────────────────────────────────── */

const etat = ({ symbols = [], fichiers = {}, declares = {} }) => ({
  symbols: new Set(symbols),
  sourceFile: new Map(Object.keys(fichiers).map(n => [n, `src/${n}`])),
  declares: new Map(Object.entries(declares)),
  read: chemin => fichiers[chemin.replace('src/', '')] ?? '',
});

test('l’acquittement par symbole passe AVANT toute détection', () => {
  // L'app déclare son propre `createBackup` ET importe celui du paquet : c'est
  // une migration en cours, pas un doublon. Sans cet ordre, elle resterait
  // comptée en dette jusqu'à la suppression du dernier fichier.
  const trouves = findDuplicates(
    etat({ symbols: ['createBackup'], declares: { createBackup: 'src/x.ts' } }),
    { backup: { exports: ['createBackup'], symbols: ['createBackup'] } }
  );
  assert.deepEqual(trouves, []);
});

test('la détection par le code trouve le vrai coupable, où qu’il soit', () => {
  const trouves = findDuplicates(
    etat({ declares: { restoreBackup: 'src/lib/persistance.ts' } }),
    { backup: { exports: ['createBackup', 'restoreBackup'] } }
  );
  assert.deepEqual(trouves, [
    {
      exported: 'backup',
      file: 'src/lib/persistance.ts',
      declares: 'restoreBackup',
    },
  ]);
});

test('une façade n’est pas un doublon : elle délègue au paquet', () => {
  const trouves = findDuplicates(
    etat({
      fichiers: { 'storage.ts': `export * from '${PACKAGE}/backup';` },
    }),
    { backup: { files: ['storage.ts'] } }
  );
  assert.deepEqual(trouves, [], 'un fichier qui importe le paquet est adopté');
});

test('un fichier homonyme qui n’importe rien reste un doublon', () => {
  const trouves = findDuplicates(
    etat({ fichiers: { 'Button.tsx': 'export const Button = () => null;' } }),
    { Button: { files: ['Button.tsx'] } }
  );
  assert.deepEqual(trouves, [{ exported: 'Button', file: 'Button.tsx' }]);
});

/* ── Ce que la règle `exports` reconnaît, et ce qu'elle refuse ──────────── */

const declaresDe = source =>
  [...source.matchAll(EXPORT_RE)].map(match => match[1]);

test('`exports` reconnaît les formes qu’une réimplémentation prend', () => {
  assert.deepEqual(
    declaresDe(`
      export function createBackup() {}
      export async function restoreBackup() {}
      export const downloadBackup = () => {};
      export class BackupStore {}
    `),
    ['createBackup', 'restoreBackup', 'downloadBackup', 'BackupStore']
  );
});

test('une RÉEXPORTATION n’est pas une réimplémentation', () => {
  // C'est une façade, et la règle de la façade l'acquitte déjà. La confondre
  // avec une déclaration recréerait le faux positif qu'on vient de retirer.
  assert.deepEqual(
    declaresDe(
      `export { createBackup, restoreBackup } from '${PACKAGE}/backup';`
    ),
    []
  );
  assert.deepEqual(declaresDe(`export * from '${PACKAGE}/backup';`), []);
  assert.deepEqual(declaresDe('export type Backup = { v: number };'), []);
});

/* ── La régression qu'on vient de payer ─────────────────────────────────── */

test('`storage.ts` ne compte plus comme une dette de sauvegarde', () => {
  // Les deux fichiers restants du parc, vérifiés ligne à ligne le 31/08 :
  // `mister-molkky/src/storage.ts` est un adaptateur `Storage` à repli mémoire
  // pour `zustand/persist`, et `miss-contraction/src/storage.ts` de la
  // persistance métier. Ni l'un ni l'autre n'exporte, ne restaure, ni ne
  // sérialise un fichier.
  const molkky = findDuplicates(
    etat({
      fichiers: {
        'storage.ts':
          'export function safeLocalStorage(): Storage { return localStorage; }',
      },
      declares: { safeLocalStorage: 'src/storage.ts' },
    }),
    EQUIVALENTS
  );
  assert.deepEqual(
    molkky.filter(d => d.exported === 'backup'),
    [],
    'un nom de fichier ne dit pas ce qu’un fichier fait'
  );
});

test('une VRAIE réimplémentation de la sauvegarde est toujours vue', () => {
  // Le rappel que la suppression pure et simple de la règle aurait perdu.
  const trouves = findDuplicates(
    etat({ declares: { createBackup: 'src/lib/export.ts' } }),
    EQUIVALENTS
  );
  assert.deepEqual(
    trouves.filter(d => d.exported === 'backup').map(d => d.file),
    ['src/lib/export.ts']
  );
});
