// Garde-fou : le CLI Supabase est ÉPINGLÉ, et à la MÊME version partout.
//
// Avec `supabase/setup-cli` v1, `latest` faisait résoudre la version par l'API
// GitHub, SANS jeton. Le 30/09/2026, la limite de débit a fait échouer le job
// `migrate` de miss-carbook (« Failed to resolve latest Supabase CLI release:
// rate limit exceeded ») : rien d'appliqué, déploiement sauté. Depuis la v3,
// le CLI s'installe depuis npm (le paquet `supabase`), sans l'API. L'épingle
// reste : les migrations appliquées par la CI doivent être reproductibles.
//
// Trois défauts portent la version : l'action `supabase-migrate` et les
// réutilisables `pwa-supabase-migrate` et `pwa-supabase-test`. Renovate les
// tient à jour depuis npm, par l'annotation qui précède chaque `default:`. Les
// deux derniers tests vérifient que le `customManagers` de renovate.json les
// lit bel et bien, et qu'il garde les versions telles que npm les publie (sans
// « v ») : sans eux, l'épingle vieillirait en silence, et ce fichier resterait
// vert.
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

// Ceux qui appellent `supabase/setup-cli` eux-mêmes ; `pwa-supabase-migrate`
// passe par l'action `supabase-migrate`.
const SETUP_CLI = [
  '.github/actions/supabase-migrate/action.yml',
  '.github/workflows/pwa-supabase-test.yml',
];

const ANNOTATION = '# renovate: datasource=npm depName=supabase';

const lire = f => readFileSync(join(root, f), 'utf8');

/**
 * Le `default:` du champ `cli-version`, s'il suit l'annotation Renovate.
 *
 * Lu LIGNE À LIGNE, et non par une seule expression : la première version,
 * `(?:[ \t]+[^\n]*\n)*?`, imbriquait deux quantificateurs qui se recouvrent,
 * et CodeQL l'a relevée (retours arrière exponentiels, sévérité haute).
 */
function epingle(f) {
  const lignes = lire(f).split(/\r?\n/);
  const debut = lignes.findIndex(l => /^\s+cli-version:\s*$/.test(l));
  if (debut === -1) return undefined;
  const retrait = lignes[debut].search(/\S/);
  for (let i = debut + 1; i < lignes.length; i++) {
    // Une ligne moins retirée que la clé : on est sorti de son bloc.
    if (lignes[i].trim() && lignes[i].search(/\S/) <= retrait) return undefined;
    const valeur = /^\s+default: '([^']+)'$/.exec(lignes[i]);
    if (valeur)
      return lignes[i - 1].trim() === ANNOTATION ? valeur[1] : undefined;
  }
  return undefined;
}

/** Les managers « regex » de renovate.json qui visent le fichier `f`. */
function managers(f) {
  const { customManagers = [] } = JSON.parse(lire('renovate.json'));
  return customManagers.filter(
    m =>
      m.customType === 'regex' &&
      // `managerFilePatterns` : une expression entre barres obliques.
      (m.managerFilePatterns ?? []).some(p =>
        new RegExp(p.slice(1, -1)).test(f)
      )
  );
}

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

test('setup-cli épinglée au même SHA dans ses deux appels', () => {
  const refs = SETUP_CLI.map(f => {
    const trouvees = [...lire(f).matchAll(/uses: supabase\/setup-cli@(\S+)/g)];
    assert.equal(trouvees.length, 1, `${f} : ${trouvees.length} appel(s)`);
    const ref = trouvees[0][1];
    assert.match(ref, /^[0-9a-f]{40}$/, `${f} : « ${ref} » n'est pas un SHA`);
    return ref;
  });
  assert.equal(new Set(refs).size, 1, `SHA : ${refs.join(', ')}`);
});

test('le customManagers de renovate.json lit les trois épingles', () => {
  for (const f of FICHIERS) {
    const lues = [];
    for (const m of managers(f))
      for (const s of m.matchStrings)
        for (const r of lire(f).matchAll(new RegExp(s, 'g')))
          if (r.groups.depName === 'supabase') lues.push(r.groups.currentValue);
    assert.deepEqual(
      lues,
      [epingle(f)],
      `${f} : Renovate ne lit pas l'épingle`
    );
  }
});

test('extractVersionTemplate garde les versions npm, publiées sans « v »', () => {
  // Renovate passe chaque version publiée par la source dans cette expression
  // et ÉCARTE celles qu'elle ne reconnaît pas. Avec `^v(?<version>.+)$`, écrit
  // pour les tags GitHub, il ne resterait aucune version npm : plus une
  // proposition, et pas un message.
  for (const f of FICHIERS) {
    const version = epingle(f);
    for (const m of managers(f)) {
      if (!m.extractVersionTemplate) continue;
      const extraite = new RegExp(m.extractVersionTemplate).exec(version)
        ?.groups?.version;
      assert.equal(extraite, version, `${f} : « ${m.extractVersionTemplate} »`);
    }
  }
});
