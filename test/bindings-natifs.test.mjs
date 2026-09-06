// Les binaires natifs du poste, aux versions du lockfile — et surtout : AVEC
// leur numéro de version, qui est tout l'objet de cet outil.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  appelNpm,
  bindingsDuLockfile,
  cibleCourante,
  lireLockfile,
  run,
  specDe,
} from '../scripts/bindings-natifs.mjs';

const WIN = { os: 'win32', cpu: 'x64', libc: null };

const lockDe = packages => ({ lockfileVersion: 3, packages });

test('le défaut qui a coûté 0,39 pt : la version est ÉPINGLÉE, jamais laissée à npm', () => {
  // `npm i @rolldown/binding-win32-x64-msvc` (sans numéro) installait la
  // DERNIÈRE publiée — 1.2.7 le 06/09/2026 — là où le lockfile disait 1.1.5.
  const lock = lockDe({
    'node_modules/@rolldown/binding-win32-x64-msvc': {
      version: '1.1.5',
      os: ['win32'],
      cpu: ['x64'],
      optional: true,
    },
  });
  const bindings = bindingsDuLockfile(lock, WIN);
  assert.deepEqual(bindings, [
    { nom: '@rolldown/binding-win32-x64-msvc', version: '1.1.5' },
  ]);
  assert.equal(
    specDe(bindings[0]),
    '@rolldown/binding-win32-x64-msvc@1.1.5',
    'sans le @version, npm reprend la dernière et le poste cesse de mesurer ce que la CI mesure'
  );
});

test('la liste n’est pas écrite : elle se déduit des contraintes os/cpu', () => {
  const lock = lockDe({
    // Un paquet ordinaire : aucune contrainte, donc pas un binaire natif.
    'node_modules/react': { version: '19.0.0' },
    // Le bon système, la bonne architecture.
    'node_modules/lightningcss-win32-x64-msvc': {
      version: '1.32.0',
      os: ['win32'],
      cpu: ['x64'],
    },
    // Le bon système, la mauvaise architecture.
    'node_modules/lightningcss-win32-arm64-msvc': {
      version: '1.32.0',
      os: ['win32'],
      cpu: ['arm64'],
    },
    // L'autre système.
    'node_modules/lightningcss-linux-x64-gnu': {
      version: '1.32.0',
      os: ['linux'],
      cpu: ['x64'],
    },
  });
  assert.deepEqual(
    bindingsDuLockfile(lock, WIN).map(b => b.nom),
    ['lightningcss-win32-x64-msvc']
  );
});

test('sur Linux, `libc` départage glibc et musl', () => {
  const lock = lockDe({
    'node_modules/@rolldown/binding-linux-x64-gnu': {
      version: '1.1.5',
      os: ['linux'],
      cpu: ['x64'],
      libc: ['glibc'],
    },
    'node_modules/@rolldown/binding-linux-x64-musl': {
      version: '1.1.5',
      os: ['linux'],
      cpu: ['x64'],
      libc: ['musl'],
    },
  });
  assert.deepEqual(
    bindingsDuLockfile(lock, { os: 'linux', cpu: 'x64', libc: 'glibc' }).map(
      b => b.nom
    ),
    ['@rolldown/binding-linux-x64-gnu']
  );
  // Une cible sans libc (Windows, macOS) ne se laisse pas filtrer par un champ
  // qui ne la concerne pas.
  const lockWin = lockDe({
    'node_modules/lightningcss-win32-x64-msvc': {
      version: '1.32.0',
      os: ['win32'],
      cpu: ['x64'],
      libc: ['glibc'],
    },
  });
  assert.equal(bindingsDuLockfile(lockWin, WIN).length, 1);
});

test('une copie imbriquée ne masque pas l’entrée de premier niveau', () => {
  const lock = lockDe({
    'node_modules/vite/node_modules/lightningcss-win32-x64-msvc': {
      version: '1.30.0',
      os: ['win32'],
      cpu: ['x64'],
    },
    'node_modules/lightningcss-win32-x64-msvc': {
      version: '1.32.0',
      os: ['win32'],
      cpu: ['x64'],
    },
  });
  // C'est la version de premier niveau que `npm i` poserait : c'est elle qu'on
  // épingle, quel que soit l'ordre des clés.
  assert.deepEqual(bindingsDuLockfile(lock, WIN), [
    { nom: 'lightningcss-win32-x64-msvc', version: '1.32.0' },
  ]);
});

test('un nom ou une version que npm n’accepterait pas ne part pas vers npm', () => {
  const lock = lockDe({
    'node_modules/../evil': { version: '1.0.0', os: ['win32'], cpu: ['x64'] },
    'node_modules/bon-paquet': {
      version: '1.0.0 && rm -rf /',
      os: ['win32'],
      cpu: ['x64'],
    },
    'node_modules/vraiment-bon': {
      version: '1.0.0',
      os: ['win32'],
      cpu: ['x64'],
    },
  });
  assert.deepEqual(
    bindingsDuLockfile(lock, WIN).map(b => b.nom),
    ['vraiment-bon']
  );
});

test('un lockfile vide, ou sans binaire pour cette cible, ne fait rien de faux', () => {
  assert.deepEqual(bindingsDuLockfile(lockDe({}), WIN), []);
  assert.deepEqual(bindingsDuLockfile({}, WIN), []);
});

test('sans lockfile, le message dit ce qui manque et pourquoi', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bindings-'));
  try {
    assert.throws(() => lireLockfile(dir), /package-lock\.json.*illisible/s);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('la façon d’appeler npm marche VRAIMENT sur ce poste', () => {
  // Le test qui échouait. La 4.6.0 lançait `npm.cmd` sans interpréteur : depuis
  // le correctif de CVE-2024-27980, Node rend `EINVAL` sur un fichier de
  // commandes, donc `npx pwa-bindings` ne posait RIEN sur Windows — la seule
  // plateforme pour laquelle l'outil existe. On ne vérifie pas la forme de
  // l'appel, on l'exécute : c'est le seul contrôle qui aurait vu le défaut.
  const { fichier, args, shell } = appelNpm(['--version']);
  // `i --no-save --version` : npm imprime sa version et ne pose rien.
  const { status, error } = spawnSync(fichier, args, {
    shell,
    encoding: 'utf8',
  });
  assert.equal(error, undefined, `npm injoignable : ${error?.message}`);
  assert.equal(status, 0);
});

test('l’interpréteur n’est demandé que là où il est nécessaire', () => {
  // Windows : une LIGNE unique, sinon Node avertit (DEP0190) à chaque appel.
  assert.deepEqual(appelNpm(['a@1'], 'win32'), {
    fichier: 'npm i --no-save a@1',
    args: [],
    shell: true,
  });
  // Ailleurs, pas d'interpréteur du tout.
  for (const plateforme of ['linux', 'darwin']) {
    assert.deepEqual(appelNpm(['a@1'], plateforme), {
      fichier: 'npm',
      args: ['i', '--no-save', 'a@1'],
      shell: false,
    });
  }
});

test('`--dry-run` imprime la commande épinglée et n’installe rien', () => {
  const dir = mkdtempSync(join(tmpdir(), 'bindings-'));
  const cible = cibleCourante();
  try {
    writeFileSync(
      join(dir, 'package-lock.json'),
      JSON.stringify(
        lockDe({
          'node_modules/faux-binding': {
            version: '9.9.9',
            os: [cible.os],
            cpu: [cible.cpu],
          },
        })
      )
    );
    const lignes = [];
    const vrai = console.log;
    console.log = (...args) => lignes.push(args.join(' '));
    let code;
    try {
      code = run(['--dir', dir, '--dry-run'], dir);
    } finally {
      console.log = vrai;
    }
    assert.equal(code, 0);
    const sortie = lignes.join('\n');
    assert.match(sortie, /npm i --no-save faux-binding@9\.9\.9/);
    assert.match(sortie, /rien n’a été installé/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
