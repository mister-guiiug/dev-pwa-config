import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import {
  check,
  compareEnvExample,
  renderEnvExample,
  sync,
  validateManifest,
  patchDeployYml,
  renderDeployBlocks,
} from '../scripts/pwa-env.mjs';

function withDir(files, fn) {
  const root = mkdtempSync(join(tmpdir(), 'dwc-env-'));
  for (const [rel, content] of Object.entries(files)) {
    const path = join(root, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      typeof content === 'string' ? content : JSON.stringify(content, null, 2)
    );
  }
  try {
    return fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('VITE_* en secrets est refusé sans exception', () => {
  const { errors } = validateManifest({
    entries: [
      {
        name: 'VITE_SUPABASE_URL',
        store: 'secrets',
        phase: 'build',
        required: 'prod',
      },
    ],
  });
  assert.ok(errors.some(e => e.includes('VITE_')));
});

test('exception ≥ 30 caractères autorise la dérogation', () => {
  const { errors } = validateManifest({
    entries: [
      {
        name: 'VITE_LEGACY',
        store: 'secrets',
        phase: 'build',
        exception:
          'héritage temporaire documenté : migration vars prévue pour Q4',
      },
    ],
  });
  assert.equal(errors.length, 0);
});

test('renderEnvExample n’émet que les entrées build visibles', () => {
  const text = renderEnvExample({
    app: 'demo',
    entries: [
      {
        name: 'VITE_A',
        store: 'vars',
        phase: 'build',
        purpose: 'URL API',
      },
      {
        name: 'SUPABASE_DB_PASSWORD',
        store: 'secrets',
        phase: 'deploy',
        required: 'prod',
      },
    ],
  });
  assert.match(text, /^VITE_A=$/m);
  assert.doesNotMatch(text, /SUPABASE_DB_PASSWORD/);
});

test('compareEnvExample signale un trou', () => {
  const { errors } = compareEnvExample(
    {
      entries: [
        { name: 'VITE_A', store: 'vars', phase: 'build' },
        { name: 'VITE_B', store: 'vars', phase: 'build' },
      ],
    },
    'VITE_A=\n'
  );
  assert.ok(errors.some(e => e.includes('VITE_B')));
});

test('check sans manifeste : ok avec avertissement', () => {
  withDir({ 'package.json': { name: 'x' } }, root => {
    const r = check(root);
    assert.equal(r.ok, true);
    assert.ok(r.warnings.length);
  });
});

test('sync --write engendre .env.example', () => {
  withDir(
    {
      'package.json': { name: 'demo' },
      'config/env.manifest.json': {
        app: 'demo',
        entries: [
          {
            name: 'VITE_SUPABASE_URL',
            store: 'vars',
            phase: 'build',
            required: 'prod',
            purpose: 'URL Supabase',
          },
        ],
      },
    },
    root => {
      const r = sync(root, { write: true });
      assert.equal(r.ok, true);
      assert.ok(r.written.includes('.env.example'));
      const text = readFileSync(join(root, '.env.example'), 'utf8');
      assert.match(text, /VITE_SUPABASE_URL=/);
    }
  );
});

test('patchDeployYml remplace build-env', () => {
  const prev = `name: Deploy
jobs:
  deploy:
    uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-deploy.yml@v6
    with:
      use-base-path: true
      build-env: |
        VITE_OLD=\${{ vars.VITE_OLD }}
`;
  const blocks = renderDeployBlocks({
    entries: [
      {
        name: 'VITE_SUPABASE_URL',
        store: 'vars',
        phase: 'build',
        required: 'prod',
      },
    ],
  });
  const { text, changed } = patchDeployYml(prev, blocks);
  assert.equal(changed, true);
  assert.match(text, /VITE_SUPABASE_URL=/);
  assert.doesNotMatch(text, /VITE_OLD=/);
});

test('patchDeployYml conserve une expression hors vars', () => {
  const prev = `name: Deploy
jobs:
  deploy:
    uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-deploy.yml@v6
    with:
      build-env: |
        VITE_PUBLIC_SITE_ORIGIN=https://\${{ github.repository_owner }}.github.io
        VITE_OLD=\${{ vars.VITE_OLD }}
`;
  const blocks = renderDeployBlocks({
    entries: [
      {
        name: 'VITE_SUPABASE_URL',
        store: 'vars',
        phase: 'build',
        required: 'prod',
      },
    ],
  });
  const { text } = patchDeployYml(prev, blocks);
  assert.match(text, /VITE_PUBLIC_SITE_ORIGIN=.*github\.repository_owner/);
  assert.match(text, /VITE_SUPABASE_URL=/);
  assert.doesNotMatch(text, /VITE_OLD=/);
});

test('renderDeployBlocks ignore les secrets phase server', () => {
  const blocks = renderDeployBlocks({
    entries: [
      {
        name: 'VITE_SUPABASE_URL',
        store: 'vars',
        phase: 'build',
        required: 'optional',
      },
      {
        name: 'SUPABASE_DB_PASSWORD',
        store: 'secrets',
        phase: 'server',
        required: 'optional',
      },
      {
        name: 'FIREBASE_SERVICE_ACCOUNT_KEY',
        store: 'secrets',
        phase: 'deploy',
        required: 'prod',
      },
    ],
  });
  assert.equal(blocks.deploySecrets.length, 1);
  assert.equal(blocks.deploySecrets[0].name, 'FIREBASE_SERVICE_ACCOUNT_KEY');
  assert.doesNotMatch(blocks.secrets, /SUPABASE_DB_PASSWORD/);
});

test('patchDeployYml ignore `build-env: |` dans un commentaire', () => {
  const prev = `name: Deploy
jobs:
  deploy:
    uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-deploy.yml@v6
    with:
      # CE COMMENTAIRE EST ICI, PAS DANS LE BLOC : \`build-env: |\` est un bloc
      # littéral — ne pas matcher cette ligne.
      build-env: |
        VITE_OLD=\${{ vars.VITE_OLD }}
      firebase-project: miss-ticket
      firebase-only: firestore:rules
`;
  const blocks = renderDeployBlocks({
    entries: [
      {
        name: 'VITE_FIREBASE_API_KEY',
        store: 'vars',
        phase: 'build',
        required: 'prod',
      },
      {
        name: 'VITE_POSTHOG_KEY',
        store: 'vars',
        phase: 'build',
        required: 'optional',
      },
    ],
  });
  const { text, changed } = patchDeployYml(prev, blocks);
  assert.equal(changed, true);
  assert.match(text, /VITE_FIREBASE_API_KEY=/);
  assert.match(text, /VITE_POSTHOG_KEY=/);
  assert.match(text, /firebase-project: miss-ticket/);
  assert.match(text, /firebase-only: firestore:rules/);
  assert.match(
    text,
    /CE COMMENTAIRE EST ICI, PAS DANS LE BLOC : `build-env: \|`/
  );
  assert.doesNotMatch(text, /VITE_OLD=/);
});
