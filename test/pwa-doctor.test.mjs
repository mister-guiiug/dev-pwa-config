// `pwa-doctor` — la checklist du parc, lue sur un dépôt factice.
//
// Trois dépôts : le vide (tout en dette, rien en défaut), le fautif (les
// défauts du 02/09/2026, un par un), le conforme (silence complet — c'est la
// définition exécutable de « conforme au parc »).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { PRESET, diagnose, format, run } from '../scripts/pwa-doctor.mjs';

/** Un dépôt factice à partir d'une carte chemin → contenu. */
async function repo(files, fn) {
  const root = mkdtempSync(join(tmpdir(), 'dwc-doctor-'));
  for (const [rel, content] of Object.entries(files)) {
    const path = join(root, rel);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      typeof content === 'string' ? content : JSON.stringify(content)
    );
  }
  try {
    return await fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const ids = (report, level) =>
  report.findings.filter(f => !level || f.level === level).map(f => f.id);

test('un dépôt vide : des dettes, aucun défaut — et --strict le refuse', async () => {
  await repo({ 'package.json': { name: 'miss-vide' } }, async root => {
    const report = diagnose(root);
    assert.deepEqual(ids(report, 'défaut'), []);
    for (const id of [
      'editorconfig',
      'nvmrc',
      'gitattributes',
      'gitignore-worktrees',
      'renovate',
      'lighthouserc',
      'bundle-budget',
      'workflows',
    ]) {
      assert.ok(ids(report, 'dette').includes(id), `dette ${id}`);
    }
    assert.ok(
      ids(report, 'info').includes('no-build'),
      'le build est sauté, et dit'
    );
    assert.equal(await run(['--dir', root]), 0, 'pas de défaut : exit 0');
    assert.equal(
      await run(['--dir', root, '--strict']),
      1,
      '--strict : une dette suffit'
    );
  });
});

test('le fautif : les défauts du 02/09/2026, un par un', async () => {
  const html = `<!doctype html><html><head>
    <meta charset="utf-8">
    <link rel="manifest" href="/manifest.json">
    <script type="module" src="/miss-ticket-pwa/assets/index-abc.js"></script>
    </head><body><div id="root"></div></body></html>`;
  await repo(
    {
      'package.json': {
        name: 'miss-ticket-pwa',
        devDependencies: { '@playwright/test': '1' },
      },
      'renovate.json': {
        extends: ['github>mister-guiiug/.github//renovate/default.json'],
      },
      'src/main.tsx': `import { BrowserRouter } from 'react-router'; console.error('x'); const d = new Date().toLocaleDateString('fr-FR');`,
      'vite.config.ts': `VitePWA({ registerType: 'autoUpdate' })`,
      'dist/index.html': html,
      'dist/manifest.json': {
        lang: 'en',
        icons: [{ src: 'i.svg', sizes: 'any', type: 'image/svg+xml' }],
      },
      '.github/workflows/deploy.yml':
        'uses: mister-guiiug/dev-wpa-config/.github/workflows/pwa-deploy.yml@v2',
    },
    root => {
      const report = diagnose(root);
      const defauts = ids(report, 'défaut');
      assert.ok(
        defauts.includes('renovate-preset'),
        'préréglage dans un dépôt inexistant'
      );
      assert.ok(
        defauts.includes('manifest-href'),
        'manifeste lié hors du site'
      );
      assert.ok(
        ids(report, 'dette').includes('manifest-png'),
        'un SVG seul : pas d’icône PNG pour iOS'
      );
      assert.ok(defauts.includes('html-lang'));
      assert.ok(defauts.includes('ios-icon'));
      assert.ok(defauts.includes('spa-404'), 'BrowserRouter sans 404.html');
      const dettes = ids(report, 'dette');
      assert.ok(dettes.includes('auto-update'));
      assert.ok(dettes.includes('a11y-spec'));
      assert.ok(dettes.includes('wf-e2e'));
      assert.ok(dettes.includes('wf-v3'), 'référence au socle en @v2');
      assert.ok(dettes.includes('seo-plugin'));
      const infos = report.findings.filter(f => f.level === 'info');
      assert.ok(
        infos.some(f => f.id === 'locale-figee' && f.message.startsWith('1 '))
      );
      assert.ok(
        infos.some(f => f.id === 'console' && f.message.startsWith('1 '))
      );
      const texte = format(report);
      assert.match(
        texte,
        /✖ défaut\s+le manifeste est lié hors du site : \/manifest\.json \(le site vit sous \/miss-ticket-pwa\/\)/
      );
      assert.match(
        texte,
        /→ href="\/miss-ticket-pwa\/manifest\.json"/,
        'le geste, pas un score'
      );
    }
  );
});

test('le manifeste en anglais sur une page en français est un défaut', async () => {
  await repo(
    {
      'package.json': { name: 'mister-cim10' },
      'dist/index.html': `<html lang="fr"><head><link rel="manifest" href="/mister-cim10/manifest.webmanifest"><script type="module" src="/mister-cim10/assets/index.js"></script></head></html>`,
      'dist/manifest.webmanifest': {
        lang: 'en',
        icons: [{ src: 'i-512.png', sizes: '512x512', type: 'image/png' }],
      },
    },
    root => {
      const report = diagnose(root);
      assert.ok(ids(report, 'défaut').includes('manifest-lang'));
      assert.ok(
        !ids(report, 'défaut').includes('manifest-href'),
        'sous le site : correct'
      );
      assert.ok(ids(report, 'dette').includes('manifest-id'));
      assert.ok(ids(report, 'dette').includes('manifest-maskable'));
    }
  );
});

test('le conforme : silence complet — la définition exécutable de « conforme au parc »', async () => {
  const html = `<!doctype html><html lang="fr"><head>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="description" content="Une app">
    <meta name="theme-color" content="#fff" media="(prefers-color-scheme: light)">
    <meta http-equiv="Content-Security-Policy" content="default-src 'self'">
    <link rel="apple-touch-icon" href="/miss-x/apple-touch-icon.png">
    <link rel="manifest" href="/miss-x/manifest.webmanifest">
    <link rel="canonical" href="https://o/miss-x/">
    <meta property="og:image" content="https://o/miss-x/og.png">
    <script type="module" src="/miss-x/assets/index-abc.js"></script>
    </head><body><div id="root"></div></body></html>`;
  await repo(
    {
      'package.json': {
        name: 'miss-x',
        engines: { node: '>=22' },
        bundleBudget: { totalGzipKb: 200 },
        dependencies: { '@supabase/supabase-js': '2' },
        devDependencies: { '@playwright/test': '1' },
      },
      '.editorconfig': 'root = true',
      '.nvmrc': '22',
      '.gitattributes': '* text=auto eol=lf',
      '.gitignore': 'dist\n.claude/worktrees/\n',
      'renovate.json': { extends: [PRESET] },
      '.lighthouserc.json': {},
      'e2e/a11y.spec.ts': 'test',
      '.github/workflows/ci.yml':
        'uses: mister-guiiug/dev-wpa-config/.github/workflows/pwa-ci.yml@v3\nwith:\n  run-e2e: true',
      '.github/workflows/lighthouse.yml':
        'uses: mister-guiiug/dev-wpa-config/.github/workflows/pwa-lighthouse.yml@v3',
      '.github/workflows/cleanup-runs.yml':
        'uses: mister-guiiug/dev-wpa-config/.github/workflows/cleanup-runs.yml@v3',
      '.github/workflows/keepalive.yml':
        'uses: mister-guiiug/dev-wpa-config/.github/workflows/pwa-supabase-keepalive.yml@v3',
      'vite.config.ts': `pwaSeoPlugin({ themeColor: { light: '#fff', dark: '#000' } }); cspPlugin(); VitePWA({ registerType: 'prompt' })`,
      'src/main.tsx': `import { HashRouter } from 'react-router'; import { createLogger } from '@mister-guiiug/dev-wpa-config/logger';`,
      'dist/index.html': html,
      'dist/manifest.webmanifest': {
        id: '/miss-x/',
        lang: 'fr',
        icons: [
          { src: 'i-192.png', sizes: '192x192', type: 'image/png' },
          {
            src: 'i-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        screenshots: [{ src: 's.png' }],
      },
    },
    async root => {
      const report = diagnose(root);
      assert.deepEqual(report.findings, [], format(report));
      assert.equal(report.build, true);
      assert.equal(await run(['--dir', root, '--strict', '--json']), 0);
    }
  );
});

test('un dossier introuvable : code 2, pas une exception', async () => {
  assert.equal(await run(['--dir', '/nulle/part/du/tout']), 2);
});
