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
import { join } from 'node:path';

import {
  applyFix,
  permissionsManquantes,
  parsePermissionsTopLevel,
} from '../scripts/doctor-fix.mjs';
import { diagnose, run } from '../scripts/pwa-doctor.mjs';

test('permissionsManquantes détecte pull-requests manquant', () => {
  const yaml = `
name: Lighthouse
permissions:
  contents: read
  packages: read
jobs:
  lighthouse:
    uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-lighthouse.yml@v6
`;
  const gaps = permissionsManquantes(yaml);
  assert.equal(gaps.length, 1);
  assert.ok(gaps[0].missing.some(m => m.includes('pull-requests')));
});

test('permissionsManquantes se tait quand l’appelant est complet', () => {
  const yaml = `
permissions:
  contents: read
  packages: read
  pull-requests: write
jobs:
  lighthouse:
    uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-lighthouse.yml@v6
`;
  assert.deepEqual(permissionsManquantes(yaml), []);
});

test('parsePermissionsTopLevel lit le bloc racine', () => {
  const map = parsePermissionsTopLevel(`
permissions:
  contents: read
  pages: write
jobs:
  x:
    permissions:
      contents: write
`);
  assert.equal(map.contents, 'read');
  assert.equal(map.pages, 'write');
});

test('applyFix pose .editorconfig et .nvmrc', () => {
  const root = mkdtempSync(join(tmpdir(), 'dwc-fix-'));
  try {
    assert.equal(applyFix(root, 'editorconfig'), '.editorconfig');
    assert.equal(applyFix(root, 'nvmrc', { nodeVersion: '26.10.0' }), '.nvmrc');
    assert.match(readFileSync(join(root, '.nvmrc'), 'utf8'), /26\.10\.0/);
    assert.match(
      readFileSync(join(root, '.editorconfig'), 'utf8'),
      /root = true/
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('pwa-doctor --fix réduit les dettes figées', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dwc-fixrun-'));
  try {
    mkdirSync(join(root, 'src'), { recursive: true });
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ name: 'fix-demo', private: true })
    );
    writeFileSync(join(root, 'src/main.ts'), 'export {};\n');
    const before = diagnose(root);
    assert.ok(before.findings.some(f => f.id === 'editorconfig'));

    const code = await run(['--dir', root, '--fix', '--no-github']);
    assert.ok(typeof code === 'number');
    assert.ok(readFileSync(join(root, '.editorconfig'), 'utf8').length > 0);
    assert.ok(readFileSync(join(root, '.nvmrc'), 'utf8').includes('26.10'));
    const after = diagnose(root);
    assert.ok(!after.findings.some(f => f.id === 'editorconfig'));
    assert.ok(!after.findings.some(f => f.id === 'nvmrc'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
