/**
 * Les workflows RÉUTILISABLES : ce qu'un appelant est en droit d'attendre.
 *
 * Sans parseur YAML dans les dépendances, on lit le texte — et c'est suffisant
 * pour les trois promesses qui ont coûté cher :
 *
 *   1. un `pwa-*.yml` (et `cleanup-runs.yml`) DOIT déclarer `workflow_call`,
 *      sinon chaque app le recopie entier (douze copies de cleanup-runs) ;
 *   2. les actions du dépôt s'y référencent par `@v4`, jamais par `./` — un
 *      chemin relatif désigne le checkout de l'APPELANT, où l'action n'est pas ;
 *   3. aucun `secrets: inherit` : le workflow déclare ce qu'il consomme.
 *
 * Et la promesse du 02/09/2026 : `pwa-deploy.yml` écrit `404.html`.
 *
 * S'y ajoute, le 04/09/2026, ce que le GABARIT doit porter. La règle secrets /
 * variables était au README depuis deux jours et appliquée nulle part : le
 * fichier qu'on copie disait l'inverse. Les tests de fin de ce module figent
 * l'artefact, pas la phrase.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const dir = new URL('../.github/workflows/', import.meta.url);
const read = name => readFileSync(new URL(name, dir), 'utf8');

const GABARIT = readFileSync(
  new URL('../templates/github-workflows/deploy.yml', import.meta.url),
  'utf8'
);

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

test('les actions du dépôt sont référencées par @v4, jamais par un chemin relatif', () => {
  for (const name of REUTILISABLES) {
    const source = read(name);
    assert.doesNotMatch(
      source,
      /uses:\s*\.\/\.github\/actions/,
      `${name} : un chemin relatif vise le checkout de l'appelant`
    );
    for (const match of source.matchAll(
      /uses:\s*mister-guiiug\/dev-pwa-config\/\.github\/actions\/[\w-]+@(\S+)/g
    )) {
      assert.equal(match[1], 'v4', `${name} : ${match[0]}`);
    }
  }
});

test('aucun réutilisable ne demande secrets: inherit', () => {
  for (const name of REUTILISABLES) {
    // Ancré en début de ligne : c'est la DIRECTIVE YAML qui est interdite, pas
    // le fait de la nommer. Sans l'ancre, le workflow ne pouvait pas expliquer
    // en commentaire pourquoi il ne l'emploie pas — un test qui interdit
    // d'écrire la règle interdit surtout de la transmettre.
    assert.doesNotMatch(read(name), /^\s*secrets:\s*inherit/m, name);
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

test('le déploiement refuse une variable requise vide, AVANT de construire', () => {
  const deploy = read('pwa-deploy.yml');
  assert.match(deploy, /^\s+required-env:/m, 'entrée required-env absente');

  // L'ordre fait tout : le garde doit tomber avant le pre-build (migrations !)
  // et avant le build. Placé après, il constaterait le dégât au lieu de
  // l'empêcher.
  const garde = deploy.indexOf('Vérifier les variables requises');
  assert.ok(garde > 0, 'étape de vérification absente');
  assert.ok(
    garde > deploy.indexOf('Inject build env'),
    'garde avant build-env'
  );
  assert.ok(
    garde < deploy.indexOf('name: Pre-build'),
    'garde après le pre-build'
  );
  assert.ok(garde < deploy.indexOf('npm run build'), 'garde après le build');

  // Le nom part dans une expansion indirecte : il doit être filtré.
  assert.match(deploy, /\*\[!A-Za-z0-9_\]\*/, 'nom de variable non filtré');
});

test('le gabarit range les VITE_* en vars, et nomme ses secrets', () => {
  // Ce que le gabarit disait avant le 04/09 : « Ajouter ici les VITE_*
  // spécifiques au projet via ${{ secrets.* }} ». Trois dépôts l'ont appliqué.
  assert.doesNotMatch(
    GABARIT,
    /secrets\.VITE_/,
    'une VITE_* lue dans secrets : Vite la copie dans le bundle'
  );
  assert.doesNotMatch(
    GABARIT,
    /^\s*secrets:\s*inherit/m,
    'le gabarit doit nommer les secrets, pas hériter du trousseau'
  );
  assert.match(GABARIT, /vars\.VITE_/, 'aucune VITE_* lue dans vars');
  assert.match(
    GABARIT,
    /required-env:/,
    'aucun garde sur les variables requises'
  );

  // Et il doit appeler le réutilisable : les quatre dépôts qui nommaient
  // correctement leurs secrets étaient exactement les quatre qui s'en étaient
  // écartés, chacun avec sa copie du job à maintenir.
  assert.match(
    GABARIT,
    /uses:\s*mister-guiiug\/dev-pwa-config\/\.github\/workflows\/pwa-deploy\.yml@v4/
  );
});

test('le gabarit ne redouble pas la concurrence du réutilisable', () => {
  // Le 05/09/2026, le premier dépôt à copier le gabarit a vu son Deploy
  // refusé avant le premier job — « workflow file issue », sans message.
  // Seule différence avec les apps qui déploient : un `concurrency` de haut
  // niveau dans l'appelant, alors que `pwa-deploy.yml` déclare déjà le sien.
  // Retirer ce seul bloc a suffi. Ancré en début de ligne : nommer la clé en
  // commentaire pour expliquer son absence reste permis.
  assert.doesNotMatch(
    GABARIT,
    /^concurrency:/m,
    'un `concurrency` dans l’appelant fait refuser le fichier par GitHub'
  );
  // Et le réutilisable, lui, doit continuer de le porter : c'est lui qui
  // sérialise les déploiements Pages.
  assert.match(read('pwa-deploy.yml'), /^concurrency:/m);
});

test('cleanup-runs ne fait jamais entrer une entrée dans le script', () => {
  // `${{ inputs.keep }}` interpolé DANS le JavaScript exécuterait ce qu'un
  // appelant y met. Les entrées passent par `env:`.
  const source = read('cleanup-runs.yml');
  const script = source.slice(source.indexOf('script: |'));
  assert.doesNotMatch(script, /\$\{\{\s*inputs\./);
  assert.match(source, /KEEP:\s*\$\{\{ inputs\.keep \}\}/);
});

test('le docteur reçoit un jeton en CI, sinon son contrôle GitHub est muet', () => {
  // `issues-desactivees` se tait sans jeton — c'est la règle, et c'est ce qui
  // le rend inoffensif hors ligne. Mais la CI est le SEUL endroit où il peut
  // parler : sans cette ligne, le contrôle existerait sans jamais s'exécuter,
  // exactement comme `pwa-doctor` lui-même jusqu'au 05/09/2026 (une app sur
  // vingt l'appelait) et comme la spec `@a11y` qu'aucun filtre ne jouait.
  const source = read('pwa-ci.yml');
  const etape = source.slice(source.indexOf('- name: Doctor'));
  const doctor = etape.slice(0, etape.indexOf('- name: ', 10));
  assert.match(
    doctor,
    /GITHUB_TOKEN:\s*\$\{\{ github\.token \}\}/,
    'sans jeton, le contrôle des issues se tait partout — donc n’existe pas'
  );
  // Le jeton AUTOMATIQUE du run, pas un secret déclaré : un appelant n'a rien
  // à passer, et `metadata: read` suffit à lire `has_issues`.
  assert.doesNotMatch(doctor, /secrets\.GITHUB_TOKEN|secrets\.GH_TOKEN/);
});
