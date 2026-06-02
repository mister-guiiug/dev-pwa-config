// Tests auto-portés du paquet : exécutés en local (`npm test`) et en CI.
// Ils valident la cohérence interne (table `exports`, `files`, parité .d.ts/.js)
// et le chargement effectif de chaque config. Le test « consommateur réel »
// (résolution des subpaths depuis le tarball installé) vit dans ci.yml.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const exportTargets = target =>
  typeof target === 'string'
    ? { default: target }
    : { default: target.default, types: target.types };

test('chaque subpath de "exports" pointe vers un fichier existant', () => {
  for (const [sub, target] of Object.entries(pkg.exports)) {
    const { default: file, types } = exportTargets(target);
    assert.ok(
      existsSync(join(root, file)),
      `export ${sub} → ${file} introuvable`
    );
    if (types) {
      assert.ok(
        existsSync(join(root, types)),
        `export ${sub} types ${types} introuvable`
      );
    }
  }
});

test('chaque entrée de "files" existe (sera publiée)', () => {
  for (const f of pkg.files) {
    assert.ok(existsSync(join(root, f)), `files: ${f} introuvable`);
  }
});

test('parité .d.ts ↔ .js pour chaque export typé', () => {
  for (const [sub, target] of Object.entries(pkg.exports)) {
    if (typeof target === 'object' && target.types) {
      assert.ok(existsSync(join(root, target.default)), `${sub}: .js manquant`);
      assert.ok(existsSync(join(root, target.types)), `${sub}: .d.ts manquant`);
    }
  }
});

test('toutes les configs JS se chargent et ont la bonne forme', async () => {
  const eslintBase = (await import('../eslint-base.js')).default;
  assert.ok(Array.isArray(eslintBase) && eslintBase.length > 0, 'eslint-base');
  const eslintReact = (await import('../eslint-react.js')).default;
  assert.ok(
    Array.isArray(eslintReact) && eslintReact.length > 0,
    'eslint-react'
  );
  const prettier = (await import('../prettier-base.js')).default;
  assert.equal(typeof prettier, 'object', 'prettier-base');

  const vitest = await import('../vitest-base.js');
  assert.ok(vitest.baseTestOptions, 'vitest-base.baseTestOptions');
  const vitestBrowser = await import('../vitest-browser-base.js');
  assert.ok(vitestBrowser.baseBrowserTestOptions, 'vitest-browser-base');

  // Chargement sans throw suffit pour les autres.
  await import('../commitlint-base.js');
  await import('../lint-staged-base.js');
  await import('../playwright-base.js');
  await import('../vite-pwa-base.js');
  await import('../tailwind-preset.js');
});

test('les tsconfig partagés sont du JSON valide et utilisables en extends', () => {
  for (const f of [
    'tsconfig-app.json',
    'tsconfig-app-react.json',
    'tsconfig-node.json',
  ]) {
    const json = JSON.parse(readFileSync(join(root, f), 'utf8'));
    assert.ok(
      json.compilerOptions || json.extends,
      `${f}: ni compilerOptions ni extends`
    );
  }
});
