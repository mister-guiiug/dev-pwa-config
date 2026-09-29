/**
 * Les workflows RÉUTILISABLES : ce qu'un appelant est en droit d'attendre.
 *
 * Sans parseur YAML dans les dépendances, on lit le texte — et c'est suffisant
 * pour les trois promesses qui ont coûté cher :
 *
 *   1. un `pwa-*.yml` (et `cleanup-runs.yml`) DOIT déclarer `workflow_call`,
 *      sinon chaque app le recopie entier (douze copies de cleanup-runs) ;
 *   2. les actions du dépôt s'y référencent par le tag majeur MOBILE, jamais
 *      par `./` — un chemin relatif désigne le checkout de l'APPELANT, où
 *      l'action n'est pas. Le majeur se LIT dans `package.json` : écrit en dur,
 *      ce test tombait au premier majeur suivant, et faisait passer pour une
 *      régression ce qui n'était que sa propre péremption ;
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
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const dir = new URL('../.github/workflows/', import.meta.url);

/** Le tag majeur mobile courant, LU et non figé — cf. `workflow-refs.test.mjs`. */
const MAJEUR = `v${JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version.split('.')[0]}`;
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

test(`les actions du dépôt sont référencées par @${MAJEUR}, jamais par un chemin relatif`, () => {
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
      assert.equal(match[1], MAJEUR, `${name} : ${match[0]}`);
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
  // Comparaison LITTÉRALE et non par expression régulière : construire une
  // regex dans un littéral de gabarit y fait fondre les `\s` et les `\.`, et
  // le motif obtenu ne veut plus rien dire — mesuré ici même.
  assert.ok(
    GABARIT.includes(
      `uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-deploy.yml@${MAJEUR}`
    ),
    `le gabarit n'appelle pas pwa-deploy.yml@${MAJEUR}`
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

/* ── Le déploiement signale ce qu'il change (socle 6.19.0) ─────────────── */

/** Le bloc littéral `NOM: |` d'un workflow, désindenté. */
function blocLitteral(source, nom) {
  const lignes = source.split('\n');
  const i = lignes.findIndex(l => l.trim() === `${nom}: |`);
  assert.ok(i >= 0, `${nom} introuvable`);
  const indentCle = lignes[i].length - lignes[i].trimStart().length;
  const corps = [];
  for (const l of lignes.slice(i + 1)) {
    if (l.trim() && l.length - l.trimStart().length <= indentCle) break;
    corps.push(l);
  }
  const indent = Math.min(
    ...corps.filter(l => l.trim()).map(l => l.length - l.trimStart().length)
  );
  return `${corps
    .map(l => l.slice(indent))
    .join('\n')
    .trimEnd()}\n`;
}

/** Le texte d'un job, de sa clé à la suivante. */
function job(source, nom) {
  const debut = source.indexOf(`\n  ${nom}:\n`);
  assert.ok(debut > 0, `job ${nom} absent`);
  const suite = source.slice(debut + 1).search(/\n {2}[a-z-]+:\n/);
  return source.slice(debut, suite > 0 ? debut + 1 + suite : undefined);
}

test('l’état SEO précédent est récupéré AVANT le build, sans jamais le bloquer', () => {
  const deploy = read('pwa-deploy.yml');
  const etape = deploy.indexOf('name: État SEO précédent');
  assert.ok(etape > 0, 'étape absente');
  assert.ok(etape < deploy.indexOf('npm run build'), 'après le build');
  const bloc = deploy.slice(etape, deploy.indexOf('- name: Build'));
  assert.match(bloc, /seo-state\.json/);
  assert.match(bloc, /PWA_SEO_PREVIOUS_STATE=/);
  // Tolérant : un `curl` qui échoue ne fait pas échouer l'étape.
  assert.match(bloc, /if curl -fsSL[^\n]*; then/);
  // Le build écrit la liste des URL changées HORS du site publié.
  const build = deploy.slice(deploy.indexOf('- name: Build'));
  assert.match(
    build.slice(0, build.indexOf('npm run build')),
    /PWA_SEO_CHANGED_FILE: \$\{\{ runner\.temp \}\}\/seo-changed\.json/
  );
  // La liste sort du job, avant l'envoi de l'artefact.
  assert.match(
    deploy,
    /seo-changed: \$\{\{ steps\.seo-changed\.outputs\.urls \}\}/
  );
  assert.ok(
    deploy.indexOf('id: seo-changed') < deploy.indexOf('upload-pages-artifact')
  );
});

test('le job indexnow : après le déploiement, jamais bloquant, la clé du catalogue', async () => {
  const { INDEXNOW_KEY } = await import('../apps-catalog.js');
  const deploy = read('pwa-deploy.yml');
  assert.match(deploy, /^ {6}indexnow:\n(?: {8}.*\n)*? {8}default: true/m);
  const indexnow = job(deploy, 'indexnow');
  assert.match(indexnow, /needs: \[build, deploy\]/);
  assert.match(indexnow, /continue-on-error: true/);
  assert.match(indexnow, /permissions: \{\}/);
  assert.match(indexnow, /if: \$\{\{ inputs\.indexnow && /);
  assert.match(indexnow, /github\.repository_owner == 'mister-guiiug'/);
  assert.match(indexnow, /seo-changed != '\[\]'/);
  // La copie de la clé PUBLIQUE est celle du catalogue.
  assert.match(indexnow, new RegExp(`CLE: ${INDEXNOW_KEY}\\n`));
  assert.match(indexnow, /HOTE: mister-guiiug\.github\.io\n/);
  const script = blocLitteral(indexnow, 'INDEXNOW_JS');
  assert.ok(script.includes('https://api.indexnow.org/indexnow'));
  assert.match(script, /keyLocation/);
  // Une entrée n'entre jamais dans le script : elle passe par env:.
  assert.doesNotMatch(script, /\$\{\{/);
});

/** Lance un script du workflow comme la CI le fait. */
function lancer(script, args = [], env = {}) {
  return spawnSync(
    process.execPath,
    ['--input-type=module', '-e', script, ...args],
    { encoding: 'utf8', env: { ...process.env, ...env }, timeout: 20_000 }
  );
}

test('le script IndexNow ne signale rien pour une liste vide ou un autre hôte', () => {
  const script = blocLitteral(
    job(read('pwa-deploy.yml'), 'indexnow'),
    'INDEXNOW_JS'
  );
  const env = { HOTE: 'mister-guiiug.github.io', CLE: 'cle' };
  for (const URLS of [
    '[]',
    'pas du json',
    JSON.stringify(['https://exemple.org/app/', 'pas une url']),
  ]) {
    const r = lancer(script, [], { ...env, URLS });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Rien à signaler sur mister-guiiug\.github\.io\./);
  }
});

test('le 404.html du déploiement reçoit noindex, sans canonique ni robots contraires', () => {
  const deploy = read('pwa-deploy.yml');
  const script = blocLitteral(deploy, 'NOINDEX_JS');
  const dossier = mkdtempSync(join(tmpdir(), 'dwc-404-'));
  try {
    const fichier = join(dossier, '404.html');
    writeFileSync(
      fichier,
      '<!doctype html>\n<html>\n  <head>\n    <meta name="robots" content="index, follow" />\n    <link rel="canonical" href="https://o/app/" />\n    <title>App</title>\n  </head>\n  <body><div id="root"></div></body>\n</html>\n'
    );
    const r = lancer(script, [fichier]);
    assert.equal(r.status, 0, r.stderr);
    const html = readFileSync(fichier, 'utf8');
    assert.equal(html.match(/name="robots"/g).length, 1);
    assert.match(html, /<head>\n {4}<meta name="robots" content="noindex" \/>/);
    assert.doesNotMatch(html, /index, follow|canonical/);
    // Une seconde passe ne touche plus à rien.
    lancer(script, [fichier]);
    assert.equal(readFileSync(fichier, 'utf8'), html);
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
  // L'étape s'applique aussi au 404.html qu'un build a déjà écrit.
  const etape = deploy.slice(deploy.indexOf('- name: SPA fallback'));
  assert.match(
    etape.slice(0, etape.indexOf('- name: URL modifiées')),
    /if \[ -f "\$BUILD_DIR\/404\.html" \]; then\n\s+node --input-type=module -e "\$NOINDEX_JS"/
  );
});
