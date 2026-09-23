// Garde-fou : UN SEUL numéro de Node dans toute la CI — celui du `.nvmrc`.
//
// Le 22/09/2026, `.nvmrc` est passé à 26.10.0, et avec lui le conseil `nvmrc`
// du docteur, qu'un test amarre déjà (`pwa-doctor.test.mjs`). Pas les dix-huit
// épingles qui décident de ce que la CI INSTALLE : l'action `setup-pwa`, les
// cinq réutilisables dont les apps héritent sans rien écrire, les workflows
// propres à ce dépôt et le gabarit. Le parc développait en 26.10.0 et
// s'éprouvait en 26.9.0 — pendant que CONTRIBUTING affirmait que la CI
// installait le `.nvmrc`. Rien ne le disait : une épingle en retard reste verte.
//
// Seul le plancher `'22'` de la matrice échappe à la règle, et il n'a pas la
// forme x.y.z : il éprouve la promesse `engines: >=22`, pas l'épingle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const NODE = readFileSync(join(root, '.nvmrc'), 'utf8').trim();
const MAJEUR = NODE.split('.')[0];

// Toute version COMPLÈTE du majeur épinglé : `26.9.0` dans un `default:`, un
// `node-version:`, une matrice, une description ou un commentaire.
const EPINGLE_RE = new RegExp(`\\b${MAJEUR}\\.\\d+\\.\\d+\\b`, 'g');

const fichiers = () => {
  const out = [];
  for (const dir of ['.github/workflows', 'templates/github-workflows'])
    for (const nom of readdirSync(join(root, dir)))
      if (/\.ya?ml$/.test(nom)) out.push(`${dir}/${nom}`);
  for (const action of readdirSync(join(root, '.github/actions'))) {
    const f = `.github/actions/${action}/action.yml`;
    if (existsSync(join(root, f))) out.push(f);
  }
  return out;
};

test('.nvmrc épingle une version complète', () => {
  assert.match(NODE, /^\d+\.\d+\.\d+$/);
});

test('chaque épingle de Node dans la CI vaut le .nvmrc', () => {
  const ecarts = [];
  for (const f of fichiers())
    for (const [v] of readFileSync(join(root, f), 'utf8').matchAll(EPINGLE_RE))
      if (v !== NODE) ecarts.push(`${f} : ${v}`);
  assert.deepEqual(ecarts, [], `le .nvmrc dit ${NODE}`);
});

// Sans ce second test, le premier pourrait passer À VIDE : qu'une épingle
// change de forme (`26.10` au lieu de `26.10.0`), et plus rien ne la verrait.
test('setup-pwa et les cinq réutilisables portent bien l’épingle', () => {
  for (const f of [
    '.github/actions/setup-pwa/action.yml',
    '.github/workflows/pwa-ci.yml',
    '.github/workflows/pwa-deploy.yml',
    '.github/workflows/pwa-lighthouse.yml',
    '.github/workflows/pwa-worker-deploy.yml',
    '.github/workflows/npm-publish.yml',
  ])
    assert.ok(
      readFileSync(join(root, f), 'utf8').includes(`default: '${NODE}'`),
      `${f} : pas de « default: '${NODE}' »`
    );
});
