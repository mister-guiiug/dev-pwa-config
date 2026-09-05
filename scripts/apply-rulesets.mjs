#!/usr/bin/env node
/**
 * Applique le ruleset standard "main protection" sur les repos de la famille
 * miss-* / mister-*. Idempotent : crée si absent, met à jour sinon.
 *
 * LA LISTE DES DÉPÔTS EST LUE DANS LE CATALOGUE. Elle était écrite à la main :
 * elle en oubliait neuf, et nommait `miss-ticket` un dépôt qui s'appelle
 * `miss-ticket-pwa`. Un ruleset qu'on croit appliqué et qui ne l'est pas est
 * pire que pas de ruleset.
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
 */
import { execFileSync } from 'node:child_process';
import { FAMILY_APPS, GITHUB_OWNER } from '../apps-catalog.js';

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
 * Le socle, puis les dix-sept dépôts du catalogue.
 *
 * `.github` A ÉTÉ RETIRÉ : le dépôt n'existe pas (404). Son entrée produisait
 * une croix au milieu d'une sortie verte, avalée par le `try` — le même défaut
 * que celui corrigé le 01/09 sur les noms de dépôt.
 */
const REPOS = [SELF, ...FAMILY_APPS.map(app => app.id)];

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
  [SELF]: ['In-repo config parse', 'Consumer subpath resolution'],
  'mister-quota': [
    'typecheck · test · build (20.x)',
    'typecheck · test · build (22.x)',
  ],
  default: ['ci / Format · Lint · Type · Test · Build'],
};

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
Ceux du catalogue : ${REPOS.join(', ')}`
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
