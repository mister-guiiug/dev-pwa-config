/**
 * Correctifs mécaniques pour `pwa-doctor --fix`.
 *
 * Contenu embarqué : le docteur s'exécute depuis `node_modules` et n'a pas
 * `templates/` du dépôt socle. Chaque fixer correspond à un id du catalogue.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const EDITORCONFIG = `# Convention partagée famille miss-* / mister-*.
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
indent_style = space
indent_size = 2
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false

[Makefile]
indent_style = tab
`;

const GITATTRIBUTES = `# Normalise les fins de ligne en LF dans le dépôt (CRLF → LF au commit)
* text=auto eol=lf
`;

const LIGHTHOUSERC = `{
  "ci": {
    "collect": {
      "staticDistDir": "./dist",
      "url": ["http://localhost/index.html"],
      "numberOfRuns": 1,
      "settings": {
        "preset": "desktop",
        "throttlingMethod": "simulate",
        "skipAudits": ["uses-http2", "valid-source-maps"]
      }
    },
    "assert": {
      "assertions": {
        "categories:performance": ["warn", { "minScore": 0.85 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "categories:best-practices": ["warn", { "minScore": 0.85 }],
        "categories:seo": ["warn", { "minScore": 0.8 }]
      }
    },
    "upload": {
      "target": "filesystem",
      "outputDir": "./.lighthouseci"
    }
  }
}
`;

const CLEANUP_RUNS = `# Élague l'historique Actions de ce dépôt. Appelable à la main.
name: Cleanup workflow runs

on:
  workflow_dispatch:
    inputs:
      keep:
        description: 'Runs à conserver par workflow'
        type: string
        default: '3'
      dry-run:
        description: 'Lister sans supprimer'
        type: boolean
        default: false

permissions:
  actions: write
  contents: read

jobs:
  cleanup:
    uses: mister-guiiug/dev-pwa-config/.github/workflows/cleanup-runs.yml@v6
    with:
      keep: \${{ inputs.keep }}
      dry-run: \${{ inputs.dry-run }}
`;

/** Permissions minimales exigées de l'appelant, par workflow réutilisable. */
export const PERMISSIONS_REQUISES = {
  'pwa-lighthouse.yml': {
    contents: 'read',
    packages: 'read',
    'pull-requests': 'write',
  },
  'pwa-ci.yml': {
    contents: 'read',
    packages: 'read',
  },
  'pwa-deploy.yml': {
    contents: 'read',
    pages: 'write',
    'id-token': 'write',
    packages: 'read',
  },
  'pwa-vice.yml': {
    contents: 'read',
    'security-events': 'write',
  },
};

const LIGHTHOUSE_CALLER = `# Lighthouse sur chaque PR. Seuils dans \`.lighthouserc.json\`.
name: Lighthouse

on:
  pull_request:
  workflow_dispatch:

permissions:
  contents: read
  packages: read
  pull-requests: write

jobs:
  lighthouse:
    uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-lighthouse.yml@v6
`;

function write(root, rel, content) {
  const path = join(root, rel);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
  return rel;
}

/**
 * @param {string} root
 * @param {string} id
 * @param {{ nodeVersion?: string, preset?: string }} [ctx]
 * @returns {string | null} chemin écrit, ou null si non corrigeable
 */
export function applyFix(root, id, ctx = {}) {
  const node = ctx.nodeVersion ?? '26.10.0';
  const preset =
    ctx.preset ?? 'github>mister-guiiug/dev-pwa-config//renovate/default';

  switch (id) {
    case 'editorconfig':
      return write(root, '.editorconfig', EDITORCONFIG);
    case 'nvmrc':
      return write(root, '.nvmrc', `${node}\n`);
    case 'gitattributes':
      return write(root, '.gitattributes', GITATTRIBUTES);
    case 'gitignore-worktrees': {
      const path = join(root, '.gitignore');
      let text;
      try {
        text = readFileSync(path, 'utf8');
      } catch {
        text = '';
      }
      if (!text.includes('.claude/worktrees')) {
        const next =
          text && !text.endsWith('\n')
            ? `${text}\n.claude/worktrees/\n`
            : `${text}.claude/worktrees/\n`;
        writeFileSync(path, next);
      }
      return '.gitignore';
    }
    case 'renovate':
    case 'renovate-preset':
      return write(
        root,
        'renovate.json',
        `${JSON.stringify({ $schema: 'https://docs.renovatebot.com/renovate-schema.json', extends: [preset] }, null, 2)}\n`
      );
    case 'lighthouserc':
      return write(root, '.lighthouserc.json', LIGHTHOUSERC);
    case 'wf-cleanup':
      return write(root, '.github/workflows/cleanup-runs.yml', CLEANUP_RUNS);
    case 'wf-lighthouse':
    case 'wf-permissions':
      return write(root, '.github/workflows/lighthouse.yml', LIGHTHOUSE_CALLER);
    default:
      return null;
  }
}

/** Ids pour lesquels `--fix` sait écrire un fichier. */
export const FIXABLE = new Set([
  'editorconfig',
  'nvmrc',
  'gitattributes',
  'gitignore-worktrees',
  'renovate',
  'renovate-preset',
  'lighthouserc',
  'wf-cleanup',
  'wf-lighthouse',
  'wf-permissions',
]);

/**
 * Applique les correctifs pour les findings donnés.
 * @returns {{ written: string[], skipped: string[] }}
 */
export function applyFixes(root, findings, ctx = {}) {
  const written = [];
  const skipped = [];
  const seen = new Set();
  for (const f of findings) {
    if (!FIXABLE.has(f.id) || seen.has(f.id)) continue;
    seen.add(f.id);
    const rel = applyFix(root, f.id, ctx);
    if (rel) written.push(`${f.id} → ${rel}`);
    else skipped.push(f.id);
  }
  return { written, skipped };
}

/**
 * Permissions top-level d'un workflow YAML (carte clé → valeur).
 * Ignore les `permissions:` imbriqués dans un job.
 */
export function parsePermissionsTopLevel(text) {
  const sans = String(text).replace(/^[ \t]*#.*$/gm, '');
  const m =
    /^permissions:\s*\n((?:[ \t]+[a-z0-9_-]+:[ \t]*[a-z]+[ \t]*\n)+)/m.exec(
      sans
    );
  if (!m) {
    const star = /^permissions:\s*(read-all|write-all)\s*$/m.exec(sans);
    if (star) return { '*': star[1] };
    return null;
  }
  /** @type {Record<string, string>} */
  const map = {};
  for (const line of m[1].split('\n')) {
    const pm = /^\s+([a-z0-9_-]+):\s*([a-z]+)\s*$/.exec(line);
    if (pm) map[pm[1]] = pm[2];
  }
  return map;
}

/**
 * @param {string} wfText texte d'un fichier workflow appelant
 * @param {typeof PERMISSIONS_REQUISES} [table]
 * @returns {Array<{ workflow: string, missing: string[] }>}
 */
export function permissionsManquantes(wfText, table = PERMISSIONS_REQUISES) {
  const sans = String(wfText).replace(/^[ \t]*#.*$/gm, '');
  const uses = [
    ...sans.matchAll(
      /mister-guiiug\/dev-pwa-config\/\.github\/workflows\/([a-z0-9_-]+\.yml)@[^\s]+/g
    ),
  ].map(m => m[1]);
  if (!uses.length) return [];

  const granted = parsePermissionsTopLevel(wfText);
  // Sans bloc permissions, GitHub donne le défaut restrictif — on signale.
  const gaps = [];
  for (const name of new Set(uses)) {
    const need = table[name];
    if (!need) continue;
    const missing = [];
    for (const [perm, level] of Object.entries(need)) {
      if (!granted) {
        missing.push(`${perm}: ${level}`);
        continue;
      }
      if (granted['*'] === 'write-all' || granted['*'] === 'read-all') continue;
      const have = granted[perm];
      if (!have) missing.push(`${perm}: ${level}`);
      else if (level === 'write' && have !== 'write') {
        missing.push(`${perm}: write (a ${have})`);
      }
    }
    if (missing.length) gaps.push({ workflow: name, missing });
  }
  return gaps;
}
