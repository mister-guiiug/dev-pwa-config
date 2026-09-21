/**
 * `pwa-typecheck-7` — le second avis TypeScript 7.
 *
 * CE QUE CES TESTS TIENNENT, et ce n'est pas le chemin heureux : les DEUX
 * gardes du bin, chacune née d'une erreur mesurée.
 *
 *  1. un `tsconfig.json` SOLUTION (`files: []` + `references`) doit être
 *     TRAVERSÉ jusqu'aux projets qui portent du code. Viser la solution
 *     elle-même fait lire zéro fichier et sortir 0 — un avis vert qui n'a rien
 *     lu, mesuré sur vingt apps du parc avant d'écrire ce bin ;
 *  2. zéro fichier lu doit ÉCHOUER. C'est la garde qui transforme le défaut
 *     précédent en panne bruyante au lieu d'un mensonge silencieux.
 *
 * Les fixtures sont synthétiques et jetables : aucun dépôt du parc n'est touché,
 * et le test ne dépend pas de l'état d'une copie de travail.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  existsSync,
  symlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const BIN = resolve(ICI, '..', 'scripts', 'pwa-typecheck-7.mjs');

/** Le `typescript` du paquet, pour jouer le rôle de l'alias dans les fixtures. */
const TS_LOCAL = resolve(ICI, '..', 'node_modules', 'typescript');

/** Lance le bin dans un dossier et rend `{ code, sortie }`, sans jamais lever. */
function lancer(cwd, args = []) {
  try {
    const sortie = execFileSync(process.execPath, [BIN, ...args], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 1 << 24,
    });
    return { code: 0, sortie };
  } catch (e) {
    return {
      code: e.status ?? 1,
      sortie: `${e.stdout ?? ''}${e.stderr ?? ''}`,
    };
  }
}

/**
 * Un dépôt de fixture. `alias: true` y installe `node_modules/typescript-7`
 * comme lien vers le `typescript` du paquet — la 6, donc, et c'est SUFFISANT :
 * ce qu'on éprouve est la découverte des projets et les gardes, pas le verdict
 * d'une version de compilateur. Le vrai alias 7 est l'affaire des dépôts.
 */
function fixture(fichiers, { alias = true } = {}) {
  const racine = mkdtempSync(join(tmpdir(), 'pwa-tc7-'));
  for (const [chemin, contenu] of Object.entries(fichiers)) {
    const abs = join(racine, chemin);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, contenu);
  }
  if (alias) {
    mkdirSync(join(racine, 'node_modules'), { recursive: true });
    symlinkSync(
      TS_LOCAL,
      join(racine, 'node_modules', 'typescript-7'),
      'junction'
    );
  }
  return {
    racine,
    nettoyer() {
      rmSync(racine, { recursive: true, force: true });
    },
  };
}

const OPTIONS = JSON.stringify({
  compilerOptions: {
    strict: true,
    noEmit: true,
    module: 'esnext',
    moduleResolution: 'bundler',
    target: 'es2022',
    skipLibCheck: true,
  },
});

test('l’alias absent : le message dit comment l’installer, et pourquoi en alias', t => {
  if (!existsSync(TS_LOCAL)) return t.skip('typescript non installé');
  const f = fixture(
    { 'tsconfig.json': OPTIONS, 'src/a.ts': 'export const a = 1;\n' },
    { alias: false }
  );
  try {
    const { code, sortie } = lancer(f.racine);
    assert.equal(code, 1);
    assert.match(sortie, /EN ALIAS, jamais en remplacement/);
    // Le POURQUOI est dans le message : sans lui, quelqu'un « corrigera » en
    // remplaçant `typescript`, ce qui éteint ESLint pour tout le dépôt.
    assert.match(sortie, /éteindrait ESLint/);
    assert.match(sortie, /typescript-7@npm:typescript/);
  } finally {
    f.nettoyer();
  }
});

test('GARDE 1 : un tsconfig SOLUTION est traversé jusqu’au code', t => {
  if (!existsSync(TS_LOCAL)) return t.skip('typescript non installé');
  // Exactement la forme de vingt apps du parc : racine vide + deux références.
  const f = fixture({
    'tsconfig.json': JSON.stringify({
      files: [],
      references: [
        { path: './tsconfig.app.json' },
        { path: './tsconfig.node.json' },
      ],
    }),
    'tsconfig.app.json': JSON.stringify({
      compilerOptions: JSON.parse(OPTIONS).compilerOptions,
      include: ['src'],
    }),
    'tsconfig.node.json': JSON.stringify({
      compilerOptions: JSON.parse(OPTIONS).compilerOptions,
      include: ['outils'],
    }),
    'src/a.ts': 'export const a: number = 1;\n',
    'outils/b.ts': 'export const b: string = "deux";\n',
  });
  try {
    const { code, sortie } = lancer(f.racine);
    assert.equal(code, 0, sortie);
    // Les DEUX projets référencés sont jugés, la solution n'apparaît pas.
    assert.match(sortie, /tsconfig\.app\.json\s+OK/);
    assert.match(sortie, /tsconfig\.node\.json\s+OK/);
    assert.equal(
      /^\s+tsconfig\.json\s/m.test(sortie),
      false,
      'la solution ne doit pas être jugée'
    );
    // Et le compte de fichiers est NON NUL : c'est ce qui rend l'avis crédible.
    assert.match(sortie, /2 fichier\(s\) lus/);
  } finally {
    f.nettoyer();
  }
});

test('GARDE 2 : zéro fichier lu ÉCHOUE, et dit la cause probable', t => {
  if (!existsSync(TS_LOCAL)) return t.skip('typescript non installé');
  // Une solution dont les références ne mènent à aucun code : le cas exact qui
  // rendait « OK » en 130 ms sans rien lire.
  const f = fixture({
    'tsconfig.json': JSON.stringify({
      files: [],
      references: [{ path: './tsconfig.app.json' }],
    }),
    'tsconfig.app.json': JSON.stringify({
      compilerOptions: JSON.parse(OPTIONS).compilerOptions,
      include: ['src'],
    }),
    // `src/` reste VIDE.
    'LISEZMOI.md': 'rien à compiler\n',
  });
  try {
    const { code, sortie } = lancer(f.racine);
    assert.equal(code, 1, 'un avis qui n’a rien lu ne doit pas sortir 0');
    assert.match(sortie, /AUCUN fichier du dépôt n'a été lu/);
    assert.match(sortie, /ne conclut donc RIEN/);
    // La cause probable est nommée : sinon le message envoie chercher au hasard.
    assert.match(sortie, /projet « solution »/);
  } finally {
    f.nettoyer();
  }
});

test('une erreur de types fait ÉCHOUER, et la ligne fautive est montrée', t => {
  if (!existsSync(TS_LOCAL)) return t.skip('typescript non installé');
  const f = fixture({
    'tsconfig.json': JSON.stringify({
      compilerOptions: JSON.parse(OPTIONS).compilerOptions,
      include: ['src'],
    }),
    'src/a.ts': 'export const a: number = "pas un nombre";\n',
  });
  try {
    const { code, sortie } = lancer(f.racine);
    assert.equal(code, 1);
    assert.match(sortie, /ÉCHEC/);
    assert.match(
      sortie,
      /error TS2322/,
      'le diagnostic est reporté, pas avalé'
    );
  } finally {
    f.nettoyer();
  }
});

test('des tsconfig passés en arguments l’emportent sur la découverte', t => {
  if (!existsSync(TS_LOCAL)) return t.skip('typescript non installé');
  const f = fixture({
    'tsconfig.json': JSON.stringify({
      files: [],
      references: [{ path: './tsconfig.app.json' }],
    }),
    'tsconfig.app.json': JSON.stringify({
      compilerOptions: JSON.parse(OPTIONS).compilerOptions,
      include: ['src'],
    }),
    'tsconfig.autre.json': JSON.stringify({
      compilerOptions: JSON.parse(OPTIONS).compilerOptions,
      include: ['autre'],
    }),
    'src/a.ts': 'export const a = 1;\n',
    'autre/c.ts': 'export const c = 3;\n',
  });
  try {
    const { code, sortie } = lancer(f.racine, ['tsconfig.autre.json']);
    assert.equal(code, 0, sortie);
    assert.match(sortie, /tsconfig\.autre\.json\s+OK/);
    assert.equal(
      /tsconfig\.app\.json/.test(sortie),
      false,
      'la découverte est écartée'
    );
  } finally {
    f.nettoyer();
  }
});
