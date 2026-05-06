#!/usr/bin/env node
/**
 * Applique le ruleset standard "main protection" sur les repos de la famille
 * miss-* / mister-*. Idempotent : crée si absent, met à jour sinon.
 *
 * Prérequis : `gh auth login` avec scope `repo` + `admin:repo_hook`.
 *
 * Usage :
 *   node scripts/apply-rulesets.mjs                 # tous les repos
 *   node scripts/apply-rulesets.mjs miss-carbook    # repo unique
 *   node scripts/apply-rulesets.mjs --dry-run       # preview sans modif
 */
import { execSync } from 'node:child_process';

const OWNER = 'mister-guiiug';
const REPOS = [
  'miss-carbook',
  'miss-contraction',
  'miss-ticket',
  'mister-cim10',
  'mister-footcoach',
  'mister-puzzle',
  'dev-wpa-config',
  '.github',
];

const RULESET = {
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
        required_approving_review_count: 0,
        dismiss_stale_reviews_on_push: true,
        require_code_owner_review: false,
        require_last_push_approval: false,
        required_review_thread_resolution: false,
      },
    },
    {
      type: 'required_status_checks',
      parameters: {
        strict_required_status_checks_policy: false,
        required_status_checks: [
          { context: 'Format · Lint · Type · Test · Build' },
        ],
      },
    },
  ],
};

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
  console.log(`\n→ ${OWNER}/${repo}`);
  try {
    const list = JSON.parse(gh(path) ?? '[]');
    const existing = list.find(r => r.name === RULESET.name);
    if (existing) {
      console.log(`  · update ruleset #${existing.id}`);
      gh(`${path}/${existing.id}`, 'PUT', RULESET);
    } else {
      console.log(`  · create new ruleset`);
      gh(path, 'POST', RULESET);
    }
    console.log(`  ✓ done`);
  } catch (e) {
    console.error(`  ✗ ${e.message.split('\n')[0]}`);
  }
}

console.log('\n✅ Terminé.');
