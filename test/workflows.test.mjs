/**
 * Les workflows RÉUTILISABLES : ce qu'un appelant est en droit d'attendre.
 *
 * Sans parseur YAML dans les dépendances, on lit le texte — et c'est suffisant
 * pour les trois promesses qui ont coûté cher :
 *
 *   1. un `pwa-*.yml` (et `cleanup-runs.yml`) DOIT déclarer `workflow_call`,
 *      sinon chaque app le recopie entier (douze copies de cleanup-runs) ;
 *   2. les actions du dépôt s'y référencent par `@v3`, jamais par `./` — un
 *      chemin relatif désigne le checkout de l'APPELANT, où l'action n'est pas ;
 *   3. aucun `secrets: inherit` : le workflow déclare ce qu'il consomme.
 *
 * Et la promesse du 02/09/2026 : `pwa-deploy.yml` écrit `404.html`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const dir = new URL('../.github/workflows/', import.meta.url);
const read = name => readFileSync(new URL(name, dir), 'utf8');

const REUTILISABLES = readdirSync(dir).filter(
  name => name.startsWith('pwa-') || name === 'cleanup-runs.yml'
);

test('chaque workflow réutilisable déclare workflow_call', () => {
  assert.ok(REUTILISABLES.length >= 6, `trouvés : ${REUTILISABLES.join(', ')}`);
  for (const name of REUTILISABLES) {
    assert.match(
      read(name),
      /^\s+workflow_call:/m,
      `${name} n'est pas appelable`
    );
  }
});

test('les actions du dépôt sont référencées par @v3, jamais par un chemin relatif', () => {
  for (const name of REUTILISABLES) {
    const source = read(name);
    assert.doesNotMatch(
      source,
      /uses:\s*\.\/\.github\/actions/,
      `${name} : un chemin relatif vise le checkout de l'appelant`
    );
    for (const match of source.matchAll(
      /uses:\s*mister-guiiug\/dev-wpa-config\/\.github\/actions\/[\w-]+@(\S+)/g
    )) {
      assert.equal(match[1], 'v3', `${name} : ${match[0]}`);
    }
  }
});

test('aucun réutilisable ne demande secrets: inherit', () => {
  for (const name of REUTILISABLES) {
    assert.doesNotMatch(read(name), /secrets:\s*inherit/, name);
  }
});

test('le déploiement Pages écrit le repli SPA 404.html', () => {
  const deploy = read('pwa-deploy.yml');
  assert.match(deploy, /404\.html/);
  // Après le build, avant l'envoi de l'artefact : sinon il n'est pas publié.
  assert.ok(
    deploy.indexOf('404.html') > deploy.indexOf('npm run build') &&
      deploy.indexOf('404.html') < deploy.indexOf('upload-pages-artifact')
  );
});

test('cleanup-runs ne fait jamais entrer une entrée dans le script', () => {
  // `${{ inputs.keep }}` interpolé DANS le JavaScript exécuterait ce qu'un
  // appelant y met. Les entrées passent par `env:`.
  const source = read('cleanup-runs.yml');
  const script = source.slice(source.indexOf('script: |'));
  assert.doesNotMatch(script, /\$\{\{\s*inputs\./);
  assert.match(source, /KEEP:\s*\$\{\{ inputs\.keep \}\}/);
});
