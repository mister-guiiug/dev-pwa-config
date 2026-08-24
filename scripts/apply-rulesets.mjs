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
 * `dev-wpa-config` a les siens. Exiger un check qui ne s'exécute jamais laisse
 * chaque PR éternellement « en attente » — ce qui était le cas ici.
 *
 * Prérequis : `gh auth login` avec scope `repo` + `admin:repo_hook`.
 *
 * Usage :
 *   node scripts/apply-rulesets.mjs                 # tous les repos
 *   node scripts/apply-rulesets.mjs miss-carbook    # repo unique
 *   node scripts/apply-rulesets.mjs --dry-run       # preview sans modif
 */
import { execSync } from 'node:child_process';
import { FAMILY_APPS, GITHUB_OWNER } from '../apps-catalog.js';

const OWNER = GITHUB_OWNER;
const SELF = 'dev-wpa-config';

/** Le socle, le dépôt d'organisation, puis les seize apps du catalogue. */
const REPOS = [SELF, '.github', ...FAMILY_APPS.map(app => app.id)];

/** Checks exigés, par dépôt. Un contexte qui ne s'exécute jamais bloque tout. */
const CHECKS = {
  [SELF]: ['In-repo config parse', 'Consumer subpath resolution'],
  '.github': [],
  default: ['Format · Lint · Type · Test · Build'],
};

function rulesetFor(repo) {
  const contexts = CHECKS[repo] ?? CHECKS.default;
  return {
    name: 'Protect main',
    target: 'branch',
    enforcement: 'active',
    conditions: {
      ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] },
    },
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
const targets = onlyRepo ? [onlyRepo] : REPOS;

function gh(path, method = 'GET', body = null) {
  const flags = ['-X', method];
  if (body) {
    flags.push('-H', 'Content-Type: application/json');
    flags.push('--input', '-');
  }
  const cmd = `gh api ${flags.join(' ')} ${path}`;
  if (DRY_RUN && method !== 'GET') {
    console.log(`[dry-run] ${cmd}`);
    if (body) console.log(`         body: ${JSON.stringify(body, null, 2)}`);
    return null;
  }
  return execSync(cmd, {
    input: body ? JSON.stringify(body) : undefined,
    encoding: 'utf8',
  });
}

for (const repo of targets) {
  const path = `repos/${OWNER}/${repo}/rulesets`;
  const ruleset = rulesetFor(repo);
  const contexts = CHECKS[repo] ?? CHECKS.default;
  console.log(`\n→ ${OWNER}/${repo}`);
  console.log(`  · checks exigés : ${contexts.join(', ') || 'aucun'}`);
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
