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

test('chaque peer marqué optionnel existe bien dans peerDependencies', () => {
  // `npm uninstall <pkg>` retire l'entrée de peerDependencies mais LAISSE
  // celle de peerDependenciesMeta : l'optionalité survit sans la dépendance.
  for (const name of Object.keys(pkg.peerDependenciesMeta ?? {})) {
    assert.ok(
      pkg.peerDependencies?.[name],
      `peerDependenciesMeta.${name} sans peerDependencies.${name}`
    );
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
  const a11y = await import('../playwright-a11y.js');
  assert.equal(
    typeof a11y.expectNoA11yViolations,
    'function',
    'playwright-a11y.expectNoA11yViolations'
  );
  await import('../vite-pwa-base.js');
  await import('../tailwind-preset.js');
});

test('chaque cible de "exports" est embarquée par "files" (présente au tarball)', () => {
  // Une cible est « shippée » si elle est listée dans files, OU sous un dossier
  // listé dans files (ex. react/*.js couverts par l'entrée "react").
  const dirs = pkg.files.filter(f => !f.includes('.'));
  const isShipped = file => {
    const f = file.replace(/^\.\//, '');
    if (pkg.files.includes(f) || pkg.files.includes(`./${f}`)) return true;
    return dirs.some(d => f === d || f.startsWith(`${d}/`));
  };
  for (const [sub, target] of Object.entries(pkg.exports)) {
    const { default: file, types } = exportTargets(target);
    assert.ok(isShipped(file), `export ${sub} → ${file} absent de "files"`);
    if (types) {
      assert.ok(
        isShipped(types),
        `export ${sub} types ${types} absent de "files"`
      );
    }
  }
});

test('definePwaPlaywrightConfig échoue sans `devices`', async () => {
  const { definePwaPlaywrightConfig } = await import('../playwright-base.js');
  assert.throws(() => definePwaPlaywrightConfig({}), /devices/);
  const cfg = definePwaPlaywrightConfig({ devices: {} });
  assert.ok(Array.isArray(cfg.projects), 'projects');
  assert.match(
    cfg.snapshotPathTemplate,
    /\{projectName\}/,
    'snapshotPathTemplate doit inclure {projectName}'
  );
});

test('pwaSeoPlugin.transformIndexHtml remplace les placeholders', async () => {
  const { pwaSeoPlugin } = await import('../vite-pwa-base.js');
  const plugin = pwaSeoPlugin({ basePath: '/app/' });
  const out = plugin.transformIndexHtml(
    '<link href="__SEO_HOME_URL__"><body>__ANALYTICS_BODY__</body>'
  );
  assert.ok(!out.includes('__SEO_HOME_URL__'), 'home url remplacé');
  assert.ok(!out.includes('__ANALYTICS_BODY__'), 'analytics body remplacé');
  assert.match(out, /\/app\//, 'basePath injecté');
});

test('les tsconfig partagés sont du JSON valide et utilisables en extends', () => {
  for (const f of [
    'tsconfig-app.json',
    'tsconfig-app-react.json',
    'tsconfig-node.json',
    'tsconfig-strict-plus.json',
  ]) {
    const json = JSON.parse(readFileSync(join(root, f), 'utf8'));
    assert.ok(
      json.compilerOptions || json.extends,
      `${f}: ni compilerOptions ni extends`
    );
  }
});
