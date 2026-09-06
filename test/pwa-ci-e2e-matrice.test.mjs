/**
 * La matrice E2E de `pwa-ci.yml` : ce que l'étape `matrice` calcule vraiment.
 *
 * Le défaut qu'ils figent, mesuré le 06/09/2026 : `e2e-project` partait à la
 * fois dans `--project=` et dans `playwright install`, qui ne connaît que des
 * NAVIGATEURS. `playwright install mobile-chrome` répond « Invalid
 * installation targets » — les deux projets mobiles de la matrice famille
 * étaient donc inexprimables, et deux tests de miss-badminton échouaient sur
 * eux depuis toujours, sans que personne les joue.
 *
 * Ces tests n'assertent pas sur du texte de YAML : ils EXTRAIENT le corps de
 * l'étape et le passent à `bash`, avec un `GITHUB_ENV` et un `GITHUB_OUTPUT`
 * de bac à sable. C'est le script réel qui répond — un test qui relirait la
 * regex à côté ne dirait rien de ce que le runner exécute.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const WORKFLOW = readFileSync(
  new URL('../.github/workflows/pwa-ci.yml', import.meta.url),
  'utf8'
);

/** Le corps d'un `run: |`, désindenté, tel que le runner l'exécutera. */
function corpsDeLEtape(source, nom) {
  const lignes = source.split('\n');
  const etape = lignes.findIndex(ligne => ligne.includes(`- name: ${nom}`));
  assert.ok(etape > 0, `étape « ${nom} » introuvable`);
  const run = lignes.findIndex(
    (ligne, i) => i > etape && /^\s+run: \|\s*$/.test(ligne)
  );
  assert.ok(run > etape, `« ${nom} » n'a pas de bloc run: |`);
  const indentRun = lignes[run].length - lignes[run].trimStart().length;
  const corps = [];
  for (let i = run + 1; i < lignes.length; i++) {
    const ligne = lignes[i];
    if (ligne.trim() === '') {
      corps.push('');
      continue;
    }
    if (ligne.length - ligne.trimStart().length <= indentRun) break;
    corps.push(ligne);
  }
  const marge = Math.min(
    ...corps
      .filter(ligne => ligne !== '')
      .map(ligne => ligne.length - ligne.trimStart().length)
  );
  return corps.map(ligne => ligne.slice(marge)).join('\n');
}

const SCRIPT = corpsDeLEtape(
  WORKFLOW,
  'Projets Playwright et navigateurs à installer'
);

/**
 * Joue le script comme le runner : `bash --noprofile --norc -e -o pipefail`.
 * Le bac à sable contient deux fichiers nommés comme des navigateurs — si
 * jamais le `set -f` disparaissait, un `e2e-project: '*'` s'expanserait en
 * leurs noms au lieu d'être refusé, et le test le verrait.
 */
function jouer({ projets, install = '' }) {
  const bac = mkdtempSync(join(tmpdir(), 'dwc-e2e-matrice-'));
  const fichierEnv = join(bac, 'github_env');
  const fichierOut = join(bac, 'github_output');
  writeFileSync(fichierEnv, '');
  writeFileSync(fichierOut, '');
  writeFileSync(join(bac, 'chromium'), '');
  writeFileSync(join(bac, 'firefox'), '');

  const resultat = spawnSync(
    'bash',
    ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', SCRIPT],
    {
      cwd: bac,
      encoding: 'utf8',
      env: {
        ...process.env,
        E2E_PROJECT: projets,
        E2E_INSTALL: install,
        GITHUB_ENV: fichierEnv,
        GITHUB_OUTPUT: fichierOut,
      },
    }
  );
  assert.equal(resultat.error, undefined, String(resultat.error));

  const lire = fichier =>
    Object.fromEntries(
      readFileSync(fichier, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map(ligne => [
          ligne.slice(0, ligne.indexOf('=')),
          ligne.slice(ligne.indexOf('=') + 1),
        ])
    );

  const env = lire(fichierEnv);
  return {
    code: resultat.status,
    sortie: `${resultat.stdout}${resultat.stderr}`,
    args: env.E2E_PROJECT_ARGS,
    cibles: env.E2E_INSTALL_TARGETS,
    slug: lire(fichierOut).slug,
  };
}

test('un projet unique se comporte comme avant (rétro-compatibilité)', () => {
  // Dix dépôts écrivent `e2e-project: chromium` : la liste ne doit rien
  // changer pour eux.
  const r = jouer({ projets: 'chromium' });
  assert.equal(r.code, 0, r.sortie);
  assert.equal(r.args, '--project=chromium');
  assert.equal(r.cibles, 'chromium');
  assert.equal(r.slug, 'chromium');
});

test('bureau + téléphone : deux projets, un seul navigateur à installer', () => {
  // Le cœur de la correction. Pixel 5 tourne sur le chromium déjà installé :
  // ajouter `mobile-chrome` ne télécharge rien de plus.
  const r = jouer({ projets: 'chromium mobile-chrome' });
  assert.equal(r.code, 0, r.sortie);
  assert.equal(r.args, '--project=chromium --project=mobile-chrome');
  assert.equal(r.cibles, 'chromium');
  assert.equal(r.slug, 'chromium-mobile-chrome');
});

test('un projet mobile s’installe par son moteur, pas par son nom', () => {
  // `playwright install mobile-safari` : « Invalid installation targets ».
  const safari = jouer({ projets: 'mobile-safari' });
  assert.equal(safari.code, 0, safari.sortie);
  assert.equal(safari.args, '--project=mobile-safari');
  assert.equal(safari.cibles, 'webkit');

  const tout = jouer({ projets: 'chromium mobile-chrome mobile-safari' });
  assert.equal(tout.code, 0, tout.sortie);
  assert.equal(tout.cibles, 'chromium webkit');
  assert.equal(tout.slug, 'chromium-mobile-chrome-mobile-safari');
});

test('les navigateurs de bureau restent leur propre cible', () => {
  const r = jouer({ projets: 'firefox webkit' });
  assert.equal(r.code, 0, r.sortie);
  assert.equal(r.args, '--project=firefox --project=webkit');
  assert.equal(r.cibles, 'firefox webkit');
});

test('e2e-install remplace la déduction pour un projet maison', () => {
  // `extraProjects` autorise n'importe quel nom ; la déduction ne peut pas
  // deviner sur quel moteur il tourne.
  const r = jouer({ projets: 'chromium tablette-maison', install: 'chromium' });
  assert.equal(r.code, 0, r.sortie);
  assert.equal(r.args, '--project=chromium --project=tablette-maison');
  assert.equal(r.cibles, 'chromium');
});

test('un nom qui n’en est pas un fait échouer le job, sans rien lancer', () => {
  for (const projets of [
    'chromium; rm -rf /',
    'chromium|firefox',
    '$(id)',
    '',
    '   ',
  ]) {
    const r = jouer({ projets });
    assert.notEqual(r.code, 0, `« ${projets} » aurait dû être refusé`);
    assert.match(r.sortie, /::error::/);
  }
  const install = jouer({ projets: 'chromium', install: 'chromium && id' });
  assert.notEqual(install.code, 0, install.sortie);
  assert.match(install.sortie, /e2e-install/);
});

test('un motif n’est pas expansé en noms de fichiers', () => {
  // Sans `set -f`, `*` s'expanserait ici en « chromium firefox » (le bac à
  // sable porte ces deux fichiers) et le job partirait sur une matrice que
  // personne n'a demandée.
  const r = jouer({ projets: '*' });
  assert.notEqual(r.code, 0, r.sortie);
  assert.doesNotMatch(r.sortie, /--project=chromium --project=firefox/);
});

test('les étapes Playwright consomment les listes, pas l’entrée brute', () => {
  // L'entrée ne doit plus arriver telle quelle dans une ligne de commande :
  // c'est ce qui envoyait un nom de projet à `playwright install`.
  const job = WORKFLOW.slice(WORKFLOW.indexOf('  e2e:'));
  assert.match(job, /playwright install \$E2E_INSTALL_TARGETS --with-deps/);
  assert.match(job, /playwright test --grep "\$E2E_GREP" \$E2E_PROJECT_ARGS$/m);
  assert.match(
    job,
    /playwright test --list --grep "\$E2E_GREP" \$E2E_PROJECT_ARGS/
  );
  assert.doesNotMatch(job, /--project="\$E2E_PROJECT"/);
  // Les entrées n'entrent dans le job QUE par le bloc `env:` de tête : plus
  // bas, une interpolation serait du texte de l'appelant dans une commande.
  const etapes = job.slice(job.indexOf('    steps:'));
  assert.doesNotMatch(
    etapes,
    /\$\{\{\s*inputs\.e2e-(project|install|grep)\s*\}\}/,
    'une entrée e2e interpolée dans une étape'
  );
});

test('le nom de l’artefact ne peut pas porter d’espace', () => {
  // `e2e-results-chromium mobile-chrome` ferait échouer l'envoi du rapport,
  // au moment précis où on en a besoin.
  assert.match(
    WORKFLOW,
    /name: e2e-results-\$\{\{ steps\.matrice\.outputs\.slug \}\}/
  );
});

test('le défaut reste un seul navigateur de bureau', () => {
  // Un socle qui passerait tout le parc en `chromium mobile-chrome` rendrait
  // rouges les CI qu'il sert — c'est précisément ce que miss-badminton a
  // découvert en jouant enfin ses mobiles. L'ouverture est opt-in.
  const entree = WORKFLOW.slice(WORKFLOW.indexOf('      e2e-project:'));
  assert.match(entree.slice(0, entree.indexOf('e2e-install:')), /'chromium'/);
});
