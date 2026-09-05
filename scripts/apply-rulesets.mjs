#!/usr/bin/env node
/**
 * Applique le ruleset standard "main protection" sur les repos de la famille
 * miss-* / mister-*. Idempotent : crée si absent, met à jour sinon.
 *
 * LA LISTE DES DÉPÔTS EST LUE SUR LE COMPTE, plus dans le catalogue. Elle a
 * été écrite à la main (elle en oubliait neuf, et nommait `miss-ticket` un
 * dépôt qui s'appelle `miss-ticket-pwa`), puis dérivée du catalogue — ce qui
 * corrigeait les fautes de frappe mais laissait un trou plus large : LE
 * CATALOGUE NE DÉCRIT QUE LES PWA DE LA FAMILLE. Au relevé du 05/09/2026, six
 * dépôts publics sur vingt-quatre n'avaient donc AUCUNE protection — dont deux
 * PWA nées après la dernière mise à jour du catalogue (`miss-supatool`,
 * `mister-miss-koh`) et quatre projets hors périmètre (Rust, C#, Python,
 * extension VS Code). Un dépôt neuf naissait sans protection et rien ne le
 * disait.
 *
 * PUBLICS ET NON ARCHIVÉS SEULEMENT. Un dépôt privé sur un compte personnel
 * sans GitHub Pro répond **403** à l'API des rulesets (vérifié sur
 * `miss-ticket`) : l'y inclure produirait une croix permanente. Un dépôt
 * archivé est en lecture seule.
 *
 * LE CONTEXTE DE CHECK DÉPEND DU DÉPÔT. Toutes les apps exposent le même job
 * (« Format · Lint · Type · Test · Build », via le workflow réutilisable), mais
 * `dev-pwa-config` a les siens. Exiger un check qui ne s'exécute jamais laisse
 * chaque PR éternellement « en attente » — ce qui était le cas ici.
 *
 * Prérequis : `gh auth login` avec scope `repo` + `admin:repo_hook`.
 *
 * Usage :
 *   node scripts/apply-rulesets.mjs                 # tous les repos
 *   node scripts/apply-rulesets.mjs miss-carbook    # repo unique
 *   node scripts/apply-rulesets.mjs --dry-run       # preview sans modif
 *   node scripts/apply-rulesets.mjs --force         # passe outre le garde-fou
 *                                                   # des checks (cf. plus bas)
 */
import { execFileSync } from 'node:child_process';
import { GITHUB_OWNER } from '../apps-catalog.js';

const OWNER = GITHUB_OWNER;
const SELF = 'dev-pwa-config';

/**
 * MIROIRS : `main` y arrive par `git push --force`, jamais par une PR.
 *
 * `mister-family-map` est publié depuis le dépôt privé `bac-sable` par
 * `npm run mirror`, qui fait littéralement
 * `git push --force <remote> refs/heads/main:refs/heads/main`. Le ruleset
 * standard le casserait DEUX FOIS : `non_fast_forward` refuse le forçage, et
 * la règle `pull_request` refuse tout push direct. On n'y protège donc que
 * contre la SUPPRESSION — la relecture, elle, a lieu sur la source.
 */
const MIRRORS = new Set(['mister-family-map']);

/**
 * CONTOURNEMENT : le rôle admin, et SEULEMENT à travers une pull request.
 *
 * `bypass_mode: 'pull_request'` et non `'always'`, parce que les deux ne
 * rendent pas la même chose :
 *
 *   `always`       — le porteur du rôle peut aussi POUSSER DIRECTEMENT sur
 *                    `main`. C'est précisément le trou que ce ruleset existe
 *                    pour fermer.
 *   `pull_request` — tout continue de passer par une PR ; le porteur peut en
 *                    revanche fusionner sans attendre qu'un check soit vert ou
 *                    qu'un fil de discussion soit résolu.
 *
 * Le commentaire de la règle `pull_request` ci-dessous dit ce que ce ruleset
 * garantit : « qu'aucun commit n'atterrit sur main sans passer par une PR ».
 * Le mode `pull_request` préserve exactement cette garantie-là, et lève la
 * seule gêne réelle — une PR bloquée par un check en attente ou un fil laissé
 * ouvert par un robot de relecture.
 *
 * `actor_id: 5` est le rôle ADMIN (1 lecture, 2 triage, 3 écriture,
 * 4 maintenance, 5 admin). Les dépôts appartiennent à un compte utilisateur,
 * pas à une organisation : `Team` et `OrganizationAdmin` n'y existent pas.
 *
 * LE MIROIR N'EN REÇOIT PAS. Sa seule règle est `deletion` ; un contournement
 * n'y servirait qu'à supprimer `main`, ce que personne ne veut faire par
 * accident.
 */
const BYPASS = [
  { actor_id: 5, actor_type: 'RepositoryRole', bypass_mode: 'pull_request' },
];

/**
 * Tous les dépôts PUBLICS et non archivés du compte, lus sur GitHub.
 *
 * Aucune liste à tenir : un dépôt créé demain est protégé au prochain passage,
 * sans que personne ait à penser à l'inscrire quelque part. C'est la seule
 * forme qui résiste au temps — les deux précédentes (liste à la main, puis
 * catalogue) ont chacune laissé des dépôts dehors sans le dire.
 *
 * Le fichier `.github` du compte, s'il existe un jour, entrera de lui-même :
 * son entrée avait dû être retirée le 01/09 parce qu'elle produisait un 404
 * avalé par le `try`, donc une croix au milieu d'une sortie verte.
 */
function reposDuCompte() {
  const out = execFileSync(
    'gh',
    [
      'repo',
      'list',
      OWNER,
      '--limit',
      '200',
      '--no-archived',
      '--visibility',
      'public',
      '--json',
      'name',
      '--jq',
      '.[].name',
    ],
    { encoding: 'utf8' }
  );
  return out.split('\n').filter(Boolean).sort();
}

const REPOS = reposDuCompte();

/**
 * Checks exigés, par dépôt. UN CONTEXTE QUI NE S'EXÉCUTE JAMAIS BLOQUE TOUT :
 * la PR reste éternellement « en attente », et personne ne peut la débloquer
 * sans toucher au ruleset. Chaque nom ci-dessous est relevé sur les
 * `check-runs` réels de `main`, pas deviné.
 *
 * LE PRÉFIXE `ci / ` EST INDISPENSABLE, ET IL MANQUAIT. Les seize apps
 * appellent le workflow réutilisable depuis un job nommé `ci` : GitHub
 * enregistre donc `ci / Format · Lint · Type · Test · Build`. Exiger
 * `Format · Lint · Type · Test · Build` tout court, comme ce fichier le
 * faisait, aurait gelé toutes leurs PR — exactement la panne que son propre
 * en-tête décrit. Le socle, lui, définit ses jobs en ligne : ses contextes
 * n'ont pas de préfixe, et c'était déjà juste.
 *
 * `mister-quota` a sa propre CI : une matrice Node, et un job `package
 * desktop` conditionné à `refs/tags/v*` — donc JAMAIS exécuté sur une PR. Il
 * est délibérément absent de la liste.
 */
const CHECKS = {
  // Le second job a été RENOMMÉ le 05/09/2026 : la fixture jetable
  // « Consumer subpath resolution » est remplacée par le squelette, qui est un
  // vrai consommateur. Un contexte exigé qui disparaît gèle toutes les PR du
  // dépôt — d'où l'ordre : fusionner d'abord (par le contournement admin, qui
  // existe pour ce cas), laisser la CI de `main` produire le nouveau contexte,
  // puis relancer ce script.
  [SELF]: ['In-repo config parse', 'Le squelette, construit sur ce paquet'],
  'mister-quota': [
    'typecheck · test · build (20.x)',
    'typecheck · test · build (22.x)',
  ],

  // Les quatre dépôts HORS PWA. Chaque nom est relevé sur une PR RÉELLE (ou,
  // à défaut de PR fusionnée, sur le job d'un `ci.yml` déclenché par
  // `pull_request` et sans `if:`), jamais sur les seuls check-runs de `main` :
  // `mister-commitia` y expose aussi « Bundle Windows (MSI/NSIS) », qui vient
  // de `release.yml` sur un tag et ne s'exécuterait JAMAIS en PR. L'exiger
  // gèlerait toutes ses PR — la panne exacte que l'en-tête décrit.
  'mister-commitia': [
    'Tests mc-core (ubuntu-latest)',
    'Tests mc-core (windows-latest)',
    // Apostrophe DROITE (U+0027), comme le nom du job. Écrite en typographique
    // (U+2019), la chaîne ne correspond à aucun check : GitHub attendrait un
    // contexte qui n'arrive jamais, et toutes les PR de ce dépôt gèleraient.
    "Qualité (fmt, clippy, chaîne d'appro)",
  ],
  'mister-gphotos': ['build-and-test'],
  'vscode-sops-diff': ['build'],
  'mister-claude-skills': ['validate'],

  // AUCUN check : ce dépôt ne porte que des fichiers communautaires, il n'a
  // pas de CI et n'en aura pas. Le ruleset y garde tout son sens — PR
  // obligatoire, pas de `push --force`, pas de suppression — mais exiger un
  // contexte y gèlerait chaque PR pour toujours.
  '.github': [],

  default: ['ci / Format · Lint · Type · Test · Build'],
};

/**
 * Les noms de check RÉELLEMENT observés sur la branche par défaut du dépôt.
 *
 * POURQUOI CE GARDE-FOU. Depuis que la liste des dépôts est lue sur le compte,
 * un dépôt neuf reçoit `CHECKS.default` — la convention des PWA — sans que
 * personne l'ait décidé. Sur un dépôt qui n'a pas cette CI, GitHub attendrait
 * un contexte qui n'arrive jamais et TOUTES ses PR gèleraient, sans message
 * lisible. C'est la panne que l'en-tête de ce fichier raconte depuis le
 * début ; l'énumération automatique en a fait un risque permanent, alors elle
 * doit venir avec sa vérification.
 *
 * Un check qui ne s'exécute QUE sur `pull_request` n'apparaît pas ici : le
 * garde refuse alors à tort, ce qui se lève par `--force`. Refuser d'appliquer
 * est réversible ; geler les PR d'un dépôt ne l'est qu'en touchant au ruleset.
 */
function checksObserves(repo) {
  try {
    const out = execFileSync(
      'gh',
      [
        'api',
        `repos/${OWNER}/${repo}/commits/HEAD/check-runs`,
        '--jq',
        '.check_runs[].name',
      ],
      { encoding: 'utf8' }
    );
    return new Set(out.split('\n').filter(Boolean));
  } catch {
    return new Set();
  }
}

function rulesetFor(repo) {
  const contexts = CHECKS[repo] ?? CHECKS.default;
  const base = {
    name: 'Protect main',
    target: 'branch',
    enforcement: 'active',
    conditions: {
      ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] },
    },
  };

  // Un miroir n'accueille pas de PR : il reçoit un `push --force` depuis sa
  // source. On garde la seule règle qui ne gêne pas la publication.
  if (MIRRORS.has(repo)) return { ...base, rules: [{ type: 'deletion' }] };

  return {
    ...base,
    bypass_actors: BYPASS,
    rules: [
      { type: 'deletion' },
      { type: 'non_fast_forward' },
      {
        type: 'pull_request',
        parameters: {
          // Zéro approbation exigée : le dépôt n'a qu'un mainteneur, en exiger
          // une le bloquerait complètement. Ce que la règle garantit ici, c'est
          // qu'aucun commit n'atterrit sur `main` sans passer par une PR — donc
          // sans CI, et sans trace de relecture. `require_code_owner_review`
          // deviendra utile le jour où il y aura un second mainteneur.
          required_approving_review_count: 0,
          dismiss_stale_reviews_on_push: true,
          require_code_owner_review: false,
          require_last_push_approval: false,
          required_review_thread_resolution: true,
        },
      },
      ...(contexts.length
        ? [
            {
              type: 'required_status_checks',
              parameters: {
                strict_required_status_checks_policy: false,
                required_status_checks: contexts.map(context => ({ context })),
              },
            },
          ]
        : []),
    ],
  };
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const onlyRepo = args.find(a => !a.startsWith('--'));

/**
 * UN NOM DE DÉPÔT SE CHOISIT DANS LE CATALOGUE, il ne s'invente pas.
 *
 * Deux raisons, et la seconde n'était pas la première trouvée. La visible :
 * une faute de frappe partait en requête et rendait un 404 attrapé par le
 * `try`, donc un `✗` au milieu d'une sortie par ailleurs verte — c'est
 * exactement la panne que l'en-tête raconte (`miss-ticket` pour
 * `miss-ticket-pwa`), et elle laissait croire un ruleset appliqué.
 *
 * La sérieuse : cet argument descendait jusqu'à une commande. Le `gh` du
 * dessous ne construit plus de chaîne — c'est là le vrai correctif — mais un
 * outil qui n'accepte que des valeurs connues ne dépend pas de cette
 * promesse-là.
 */
if (onlyRepo && !REPOS.includes(onlyRepo)) {
  console.error(
    `Dépôt inconnu : « ${onlyRepo} ».
Publics et non archivés sur ${OWNER} : ${REPOS.join(', ')}`
  );
  process.exit(1);
}

const targets = onlyRepo ? [onlyRepo] : REPOS;

/**
 * Appelle `gh` SANS PASSER PAR UN SHELL.
 *
 * `execSync` reçoit une ligne de commande, donc un interpréteur : tout ce qui
 * s'y retrouve — ici le nom de dépôt venu de `process.argv` — peut en sortir.
 * `node scripts/apply-rulesets.mjs 'x/../../y; commande'` exécutait ce qui
 * suivait le point-virgule. CodeQL l'a signalé
 * (`js/indirect-command-line-injection`, alerte 8), et il avait raison même
 * pour un outil qu'un seul mainteneur lance à la main : la ligne de commande
 * ne devrait jamais être le format de transport d'un argument.
 *
 * `execFileSync` prend un exécutable et un TABLEAU d'arguments, passés tels
 * quels au processus. Il n'y a plus de chaîne à découper, donc plus rien à
 * échapper — la classe entière de défaut disparaît, pas seulement ce cas-ci.
 */
function gh(path, method = 'GET', body = null) {
  const argv = ['api', '-X', method];
  if (body) argv.push('-H', 'Content-Type: application/json', '--input', '-');
  argv.push(path);

  if (DRY_RUN && method !== 'GET') {
    console.log(`[dry-run] gh ${argv.join(' ')}`);
    if (body) console.log(`         body: ${JSON.stringify(body, null, 2)}`);
    return null;
  }
  return execFileSync('gh', argv, {
    input: body ? JSON.stringify(body) : undefined,
    encoding: 'utf8',
  });
}

for (const repo of targets) {
  const path = `repos/${OWNER}/${repo}/rulesets`;
  const ruleset = rulesetFor(repo);
  // Le journal dit ce que le ruleset FAIT : annoncer des checks à un miroir
  // qui n'en reçoit aucun, c'est se mentir à soi-même dans une sortie verte.
  const miroir = MIRRORS.has(repo);
  const contexts = miroir ? [] : (CHECKS[repo] ?? CHECKS.default);
  console.log(`\n→ ${OWNER}/${repo}`);
  console.log(
    miroir
      ? '  · MIROIR : suppression bloquée seulement (le push --force doit passer)'
      : `  · checks exigés : ${contexts.join(', ') || 'aucun'}`
  );

  if (contexts.length && !FORCE) {
    const vus = checksObserves(repo);
    const absents = contexts.filter(c => !vus.has(c));
    if (absents.length) {
      console.error(
        `  ✗ REFUSÉ — ces contextes ne s'exécutent pas sur ce dépôt : ${absents.join(', ')}.
    Les exiger gèlerait toutes ses PR. Corriger CHECKS['${repo}'] (ou [] s'il n'a pas de CI),
    ou passer --force si le check ne tourne QUE sur pull_request.`
      );
      continue;
    }
  }

  try {
    const list = JSON.parse(gh(path) ?? '[]');
    const existing = list.find(r => r.name === ruleset.name);
    if (existing) {
      console.log(`  · update ruleset #${existing.id}`);
      gh(`${path}/${existing.id}`, 'PUT', ruleset);
    } else {
      console.log(`  · create new ruleset`);
      gh(path, 'POST', ruleset);
    }
    console.log(`  ✓ done`);
  } catch (e) {
    console.error(`  ✗ ${e.message.split('\n')[0]}`);
  }
}

console.log('\n✅ Terminé.');
