/**
 * L'audit SCA de `pwa-ci.yml` : ce qu'il lit, et SURTOUT où.
 *
 * Le défaut qu'ils figent, mesuré le 14/09/2026, au lendemain de l'activation
 * des alertes Dependabot sur les vingt-huit dépôts. Le lot facile vidé, les
 * vingt-cinq alertes restantes du parc étaient TOUTES dans un second manifeste,
 * aucune à la racine : `mister-puzzle/server` (neuf, toutes en portée
 * `runtime` — socket.io, engine.io, ws, qs, body-parser), `miss-genius/worker`
 * (quinze) et `miss-supatool/proxy` (une). `npm audit --omit=dev` à la racine
 * répondait « 0 vulnérabilité » dans les trois cas, et c'était EXACT : l'étape
 * ne s'exécutait qu'à la racine, alors que `mister-puzzle` déclare pourtant
 * `server-dir: server` — le socle savait où était le backend, il l'y
 * type-vérifiait, il ne l'y auditait pas.
 *
 * Comme pour la matrice E2E, ces tests n'assertent pas sur du texte de YAML
 * quand c'est le script qui répond : ils EXTRAIENT le corps de l'étape et le
 * passent à `bash`, avec le `-e` du runner. `npm` y est une fonction de shell
 * qui trace ses arguments — le test dit donc ce que l'étape LANCE, sans réseau
 * et sans registre.
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

const SCRIPT = corpsDeLEtape(WORKFLOW, 'Audit dependencies (SCA —');

/**
 * Joue le script dans un bac à sable qui ressemble à un `server-dir` fraîchement
 * cloné : un `package.json`, et le lockfile qu'on veut bien lui donner. `npm` y
 * est remplacé par une fonction qui écrit sa ligne de commande dans un fichier
 * et rend le code demandé — on mesure l'INTENTION de l'étape, pas la sortie du
 * registre.
 */
function jouer({ lockfile = 'package-lock.json', niveau = 'high', npm = 0 }) {
  const bac = mkdtempSync(join(tmpdir(), 'dwc-audit-serveur-'));
  const trace = join(bac, 'trace');
  writeFileSync(trace, '');
  writeFileSync(join(bac, 'package.json'), '{"name":"backend"}');
  if (lockfile) writeFileSync(join(bac, lockfile), '{"lockfileVersion":3}');

  const preambule = [
    'npm() {',
    '  echo "npm $*" >> "$TRACE"',
    '  return "$FAUX_NPM_CODE"',
    '}',
  ].join('\n');

  const resultat = spawnSync(
    'bash',
    ['--noprofile', '--norc', '-e', '-c', `${preambule}\n${SCRIPT}`],
    {
      cwd: bac,
      encoding: 'utf8',
      env: {
        ...process.env,
        AUDIT_LEVEL: niveau,
        SERVER_DIR: 'server',
        TRACE: trace,
        FAUX_NPM_CODE: String(npm),
      },
    }
  );
  assert.equal(resultat.error, undefined, String(resultat.error));

  return {
    code: resultat.status,
    sortie: `${resultat.stdout}${resultat.stderr}`,
    lance: readFileSync(trace, 'utf8').trim(),
  };
}

test('un lockfile suffit : l’audit du backend ne demande aucun npm ci', () => {
  // `npm audit` lit le lockfile. Il n'a donc pas besoin que le backend soit
  // installé, et l'étape peut tomber AVANT « Server — install & type-check ».
  const r = jouer({});
  assert.equal(r.code, 0, r.sortie);
  assert.equal(r.lance, 'npm audit --omit=dev --audit-level=high');
});

test('un npm-shrinkwrap.json vaut lockfile', () => {
  const r = jouer({ lockfile: 'npm-shrinkwrap.json' });
  assert.equal(r.code, 0, r.sortie);
  assert.equal(r.lance, 'npm audit --omit=dev --audit-level=high');
});

test('sans lockfile, l’étape échoue en le disant — et n’audite rien', () => {
  // `npm audit` répondrait `ENOLOCK` : « This command requires an existing
  // lockfile ». Un rouge sans explication, au milieu d'un job. La garde le dit
  // en clair, et ne fabrique SURTOUT pas un lockfile à la volée : auditer des
  // versions résolues du jour rendrait un vert qui ne parle pas de ce que le
  // dépôt livre.
  const r = jouer({ lockfile: null });
  assert.notEqual(r.code, 0, r.sortie);
  assert.match(r.sortie, /::error::/);
  assert.match(r.sortie, /lockfile/i);
  assert.equal(r.lance, '', 'npm a été appelé malgré l’absence de lockfile');
});

test('une vulnérabilité au seuil fait échouer le job', () => {
  // Une étape qui avale le code de retour de `npm audit` serait exactement la
  // panne qu'on répare : une vérification qui ne vérifie rien.
  const r = jouer({ npm: 1 });
  assert.equal(r.code, 1, r.sortie);
});

test('le seuil vient de l’environnement, pas d’une interpolation', () => {
  const r = jouer({ niveau: 'critical' });
  assert.equal(r.code, 0, r.sortie);
  assert.equal(r.lance, 'npm audit --omit=dev --audit-level=critical');

  // Du texte d'appelant n'entre pas dans une ligne de commande : c'est la règle
  // du dépôt (cf. `build-env`, `e2e-*`), et les deux audits s'y tiennent.
  for (const nom of ['Audit dependencies (SCA)', 'Audit dependencies (SCA —']) {
    const debut = WORKFLOW.indexOf(`- name: ${nom}`);
    assert.ok(debut > 0, `étape « ${nom} » introuvable`);
    const etape = WORKFLOW.slice(
      debut,
      WORKFLOW.indexOf('- name: ', debut + 10)
    );
    const script = etape.slice(etape.indexOf('run:'));
    assert.doesNotMatch(
      script,
      /\$\{\{\s*inputs\./,
      `${nom} : une entrée interpolée dans la commande`
    );
  }
});

test('l’audit suit server-dir, et le journal dit lequel des deux a parlé', () => {
  // Deux étapes plutôt qu'une boucle, comme le couple `Test` / `Test
  // (couverture et seuils)` : le nom de l'étape distingue les régimes, sans
  // qu'il faille les déduire d'un `if` caché.
  assert.match(
    WORKFLOW,
    /- name: Audit dependencies \(SCA — \$\{\{ inputs\.server-dir \}\}\)/,
    'le nom de l’étape ne nomme pas le manifeste audité'
  );

  const debut = WORKFLOW.indexOf('- name: Audit dependencies (SCA —');
  const etape = WORKFLOW.slice(debut, WORKFLOW.indexOf('run: |', debut));

  // Les trois conditions. Le `./` du motif compte autant que les trois : sans
  // lui, un `server-dir` vide donnerait `/package.json` — un chemin ABSOLU,
  // que `hashFiles` refuse hors du workspace, et c'est l'ÉVALUATION de la
  // condition qui échouerait, chez les dix-huit consommateurs qui ne
  // renseignent pas l'entrée. Le court-circuit du `&&` l'évite déjà ; une
  // condition ne doit pas en dépendre pour être sûre.
  assert.match(etape, /inputs\.run-npm-audit/);
  assert.match(etape, /inputs\.server-dir != ''/);
  assert.match(
    etape,
    /hashFiles\(format\('\.\/\{0\}\/package\.json', inputs\.server-dir\)\) != ''/,
    'un server-dir sans manifeste doit être sauté, pas planté'
  );
  assert.match(etape, /working-directory: \$\{\{ inputs\.server-dir \}\}/);
});

test('les deux audits encadrent l’installation du backend, dans cet ordre', () => {
  const racine = WORKFLOW.indexOf('- name: Audit dependencies (SCA)');
  const serveur = WORKFLOW.indexOf('- name: Audit dependencies (SCA —');
  const install = WORKFLOW.indexOf('- name: Server — install & type-check');
  assert.ok(racine > 0 && serveur > 0 && install > 0);
  assert.ok(racine < serveur, 'les deux audits se suivent dans le journal');
  assert.ok(
    serveur < install,
    'un lockfile manquant doit être dit par l’audit, avant le npm ci qui le refuse'
  );
});
