// Garde-fou : le CLI Supabase est ÉPINGLÉ, et à la MÊME version partout.
//
// `latest` fait résoudre la version par `supabase/setup-cli`, qui interroge
// l'API GitHub SANS jeton. Le 30/09/2026, la limite de débit a fait échouer le
// job `migrate` de miss-carbook (« Failed to resolve latest Supabase CLI
// release: rate limit exceeded ») : rien d'appliqué, déploiement sauté. Une
// version fixe se télécharge sans passer par l'API.
//
// Trois défauts portent la version : l'action `supabase-migrate` et les
// réutilisables `pwa-supabase-migrate` et `pwa-supabase-test`. Renovate les
// tient à jour par l'annotation qui précède chaque `default:`. Le dernier test
// vérifie que le `customManagers` de renovate.json les lit bel et bien : sans
// lui, l'épingle vieillirait en silence, et ce test resterait vert.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const FICHIERS = [
  '.github/actions/supabase-migrate/action.yml',
  '.github/workflows/pwa-supabase-migrate.yml',
  '.github/workflows/pwa-supabase-test.yml',
];

/** Le `default:` du champ `cli-version`, annotation Renovate comprise. */
const CLI_VERSION_RE =
  /\n[ \t]+cli-version:\r?\n(?:[ \t]+[^\n]*\n)*?[ \t]+# renovate: datasource=github-releases depName=supabase\/cli\r?\n[ \t]+default: '([^']+)'\r?\n/;

const lire = f => readFileSync(join(root, f), 'utf8');
const epingle = f => lire(f).match(CLI_VERSION_RE)?.[1];

test('chaque cli-version est épinglée à une version complète, annotée pour Renovate', () => {
  for (const f of FICHIERS) {
    const version = epingle(f);
    assert.ok(version, `${f} : pas de « default: » annoté sous cli-version`);
    assert.match(version, /^\d+\.\d+\.\d+$/, `${f} : « ${version} »`);
  }
});

test('la même version dans les trois fichiers', () => {
  const versions = new Set(FICHIERS.map(epingle));
  assert.equal(versions.size, 1, `versions : ${[...versions].join(', ')}`);
});

test('plus aucun « latest » pour le CLI', () => {
  for (const f of FICHIERS)
    assert.doesNotMatch(lire(f), /default: 'latest'/, f);
});

test('le customManagers de renovate.json lit les trois épingles', () => {
  const { customManagers = [] } = JSON.parse(lire('renovate.json'));
  const regex = customManagers.filter(m => m.customType === 'regex');
  assert.ok(regex.length, 'aucun customManagers « regex » dans renovate.json');

  for (const f of FICHIERS) {
    const lues = [];
    for (const m of regex) {
      // `managerFilePatterns` : une expression entre barres obliques.
      const vise = (m.managerFilePatterns ?? []).some(p =>
        new RegExp(p.slice(1, -1)).test(f)
      );
      if (!vise) continue;
      for (const s of m.matchStrings)
        for (const r of lire(f).matchAll(new RegExp(s, 'g')))
          if (r.groups.depName === 'supabase/cli')
            lues.push(r.groups.currentValue);
    }
    assert.deepEqual(
      lues,
      [epingle(f)],
      `${f} : Renovate ne lit pas l'épingle`
    );
  }
});
