/**
 * LE BALAYAGE du relevé d'adoption. Ce fichier existe parce que les deux
 * défauts corrigés le 31/08/2026 vivaient dans du code que RIEN ne pouvait
 * exercer : le point d'entrée de `measure-adoption.mjs` balaie dix-sept dépôts
 * dès qu'on le charge, donc aucun test ne pouvait l'importer.
 *
 * LES TROIS DÉFAUTS, mesurés sur les copies de travail :
 *
 *   1. `.claude` — les worktrees d'agent étaient comptés comme du code d'app.
 *      98 fichiers source sous `miss-contraction/.claude`, 298 sous
 *      `mister-footcoach`, 116 sous `mister-qowa`. miss-contraction était
 *      comptée en dette sur `useI18n` pour un fichier qui n'existe QUE dans un
 *      worktree, donc dans aucune version de l'app.
 *   2. `storage.ts` — la détection de `backup` par nom de fichier était devenue
 *      cent pour cent faux positifs, son seul vrai positif ayant migré.
 *   3. Les FORMES D'IMPORT — le relevé ne connaissait que l'import nommé et le
 *      `@import` CSS. Sept sous-chemins étaient comptés à ZÉRO consommateur
 *      alors qu'ils en avaient dix à seize : `/prettier`, `/vitest-setup`,
 *      `/tsconfig-app-react`, `/tsconfig-node`, `/lint-staged`,
 *      `/eslint-react`, `/commitlint`.
 *
 * LES TROIS SENS DE L'ERREUR, et ils comptent tous. Le premier défaut mentait
 * en PESSIMISTE (une dette qui n'existe pas), et pouvait mentir en FLATTEUR (un
 * worktree qui importe le paquet acquitte un besoin que `main` ne couvre pas —
 * vérifié le 31/08, aucune app n'était dans ce cas, mais rien ne l'empêchait).
 * Le troisième faisait passer pour MORTE la couche la plus adoptée du socle,
 * c'est-à-dire décidait à tort de ce qu'il fallait promouvoir ensuite.
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
  SCANNED,
  findDuplicates,
  indexByName,
  scanFile,
  tsconfigSubpaths,
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

/* ── Les formes d'import que le relevé ne voyait pas ────────────────────── */

/**
 * TROISIÈME DÉFAUT, mesuré le 31/08/2026 : le relevé ne connaissait que
 * l'import NOMMÉ et le `@import` CSS. Or la couche outillage — la plus adoptée
 * du socle — ne s'importe presque jamais comme ça. Sept sous-chemins étaient
 * comptés à ZÉRO consommateur alors qu'ils en avaient dix à seize.
 *
 * Le README affirmait « la couche outillage est adoptée » : c'était vrai, et
 * l'instrument affichait zéro. Un module qu'on ne sait pas mesurer passe pour
 * mort — et c'est ce chiffre qui décide quoi promouvoir ensuite.
 */

test('la réexportation compte : c’est la forme d’un prettier.config', () => {
  const lu = scanFile(
    'prettier.config.js',
    `export { default } from '${PACKAGE}/prettier';`
  );
  assert.deepEqual(lu.subpaths, ['/prettier']);
  assert.deepEqual(lu.symbols, [], 'aucun nom à lire dans `{ default }`');
});

test('l’import pour effet de bord compte : c’est la forme d’un setup.ts', () => {
  const lu = scanFile('setup.ts', `import '${PACKAGE}/vitest-setup';`);
  assert.deepEqual(lu.subpaths, ['/vitest-setup']);
});

test('l’import par défaut compte : c’est la forme d’un eslint.config', () => {
  const lu = scanFile(
    'eslint.config.js',
    `import base from '${PACKAGE}/eslint-react';\nexport default base;`
  );
  assert.deepEqual(lu.subpaths, ['/eslint-react']);
});

test('l’import nommé rend toujours ses symboles ET son sous-chemin', () => {
  const lu = scanFile(
    'App.tsx',
    `import { Button, type ButtonProps } from '${PACKAGE}/react/button';`
  );
  assert.deepEqual(lu.symbols, ['Button', 'ButtonProps']);
  assert.deepEqual(lu.subpaths, ['/react/button', '/react/button']);
});

test('la recherche ne franchit ni ligne ni chaîne voisine', () => {
  // Sans la borne, la recherche part d'un `import` quelconque et avale son
  // voisin jusqu'à trouver le nom du paquet — le défaut déjà payé sur
  // `IMPORT_RE`, qui rendait « 185 symboles » dont `useState`.
  const lu = scanFile(
    'App.tsx',
    `import { useState } from 'react';\nimport '${PACKAGE}/vitest-setup';`
  );
  assert.deepEqual(lu.subpaths, ['/vitest-setup']);
  assert.deepEqual(lu.symbols, [], 'useState n’est pas un export du socle');
});

/* ── Les tsconfig, et le piège de miss-dice ─────────────────────────────── */

test('un tsconfig compte ce dont il HÉRITE, chaîne ou tableau', () => {
  assert.deepEqual(
    tsconfigSubpaths(`{ "extends": "${PACKAGE}/tsconfig-app-react" }`),
    ['/tsconfig-app-react']
  );
  assert.deepEqual(
    tsconfigSubpaths(
      `{ "extends": ["./base.json", "${PACKAGE}/tsconfig-node"] }`
    ),
    ['/tsconfig-node']
  );
});

test('un tsconfig qui CITE le paquet sans l’étendre ne compte pas', () => {
  // miss-dice a recopié le contenu au lieu de l'étendre, en expliquant
  // pourquoi : « Inlined from @mister-guiiug/dev-wpa-config/tsconfig-app ».
  // Chercher le nom du paquet n'importe où compterait cette app comme
  // adoptante alors qu'elle a fait exactement l'inverse.
  const dice = `{
    "compilerOptions": {
      // === Inlined from ${PACKAGE}/tsconfig-app ===
      "target": "ES2025",
      // === Inlined from ${PACKAGE}/tsconfig-app-react ===
      "jsx": "react-jsx"
    }
  }`;
  assert.deepEqual(tsconfigSubpaths(dice), []);
  assert.deepEqual(scanFile('tsconfig.app.json', dice).subpaths, []);
});

test('citer le paquet AILLEURS que dans `extends` n’est pas en hériter', () => {
  // Le cas précédent passait pour une mauvaise raison — mutation faite : les
  // commentaires de miss-dice ne sont pas entre guillemets, si bien que la
  // seule exigence de guillemets suffisait à les écarter. C'est ICI que
  // l'ancrage sur `extends` se prouve : la référence est bien une chaîne JSON,
  // et elle ne dit pourtant rien d'un héritage.
  const ailleurs = `{
    "extends": "./tsconfig.base.json",
    "compilerOptions": {
      "types": ["${PACKAGE}/types"],
      "paths": { "@socle/*": ["${PACKAGE}/*"] }
    }
  }`;
  assert.deepEqual(tsconfigSubpaths(ailleurs), []);
});

test('un tsconfig n’apporte ni symbole ni déclaration', () => {
  const lu = scanFile(
    'tsconfig.json',
    `{ "extends": "${PACKAGE}/tsconfig-node" }`
  );
  assert.deepEqual(lu.symbols, []);
  assert.deepEqual(lu.declares, []);
});

test('le balayage ouvre les tsconfig, et rien d’autre en JSON', () => {
  for (const nom of ['tsconfig.json', 'tsconfig.app.json', 'jsconfig.json']) {
    assert.ok(SCANNED.test(nom), `${nom} devrait être lu`);
  }
  // Un `package-lock.json` de PWA pèse plusieurs mégaoctets et cite le paquet
  // des dizaines de fois sans jamais dire ce que l'app en fait.
  for (const nom of ['package.json', 'package-lock.json', 'data.json']) {
    assert.equal(SCANNED.test(nom), false, `${nom} ne devrait pas être lu`);
  }
});
