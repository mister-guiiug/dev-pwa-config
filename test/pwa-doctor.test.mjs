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
        'uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-deploy.yml@v2',
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

test('secrets et variables : ce que Vite copie dans le bundle n’est pas un secret', async () => {
  await repo(
    {
      'package.json': { name: 'miss-x' },
      'src/main.tsx': `const u = import.meta.env.VITE_SUPABASE_URL;
const k = import.meta.env.VITE_SUPABASE_ANON_KEY;
const d = import.meta.env.VITE_SENTRY_DSN;`,
      '.env.example': 'VITE_SUPABASE_URL=\n# VITE_SENTRY_DSN= (facultatif)\n',
      '.github/workflows/deploy.yml': `uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-deploy.yml@v4
    secrets: inherit
    with:
      build-env: |
        VITE_SUPABASE_URL=\${{ secrets.VITE_SUPABASE_URL }}`,
    },
    root => {
      const report = diagnose(root);
      const dettes = ids(report, 'dette');

      assert.ok(
        dettes.includes('secrets-inherit'),
        'inherit donne tout le trousseau'
      );
      assert.ok(
        dettes.includes('vite-en-secret'),
        'une VITE_* en secret n’est pas protégée : Vite la copie dans le bundle'
      );

      // `.env.example` existe et documente URL et DSN (même en commentaire),
      // mais pas ANON_KEY : c'est elle, et elle seule, qui doit être signalée.
      const manque = report.findings.find(
        f => f.id === 'env-example-incomplet'
      );
      assert.ok(manque, '.env.example incomplet');
      assert.match(manque.message, /VITE_SUPABASE_ANON_KEY/);
      assert.doesNotMatch(
        manque.message,
        /VITE_SENTRY_DSN/,
        'documentée en commentaire'
      );
      assert.doesNotMatch(manque.message, /VITE_SUPABASE_URL/);
    }
  );
});

test('sans .env.example du tout, la dette dit lesquelles documenter', async () => {
  await repo(
    {
      'package.json': { name: 'miss-y' },
      'src/main.tsx': 'const u = import.meta.env.VITE_BACKEND;',
    },
    root => {
      const manque = diagnose(root).findings.find(f => f.id === 'env-example');
      assert.ok(manque);
      assert.match(manque.fix, /VITE_BACKEND/);
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
        'uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-ci.yml@v4\nwith:\n  run-e2e: true',
      '.github/workflows/lighthouse.yml':
        'uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-lighthouse.yml@v4',
      '.github/workflows/cleanup-runs.yml':
        'uses: mister-guiiug/dev-pwa-config/.github/workflows/cleanup-runs.yml@v4',
      '.github/workflows/keepalive.yml':
        'uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-supabase-keepalive.yml@v4',
      'vite.config.ts': `pwaSeoPlugin({ themeColor: { light: '#fff', dark: '#000' } }); cspPlugin(); VitePWA({ registerType: 'prompt' })`,
      'src/main.tsx': `import { HashRouter } from 'react-router'; import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';`,
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

test('un commentaire qui MET EN GARDE contre un défaut n’est pas ce défaut', async () => {
  // Les deux cas sont sortis du squelette `pwa-starter-kit` le 05/09/2026 : il
  // documente pourquoi il n'écrit pas `secrets: inherit`, et pourquoi le parc
  // ne doit plus coder `'fr-FR'` en dur. Les deux étaient comptés comme le
  // défaut dont ils préviennent. Un contrôle qu'on ne peut pas expliquer sans
  // le déclencher pousse à ne rien expliquer.
  await repo(
    {
      'package.json': { name: 'miss-commentee' },
      '.github/workflows/ci.yml': [
        '# Pas de `secrets: inherit` : le réutilisable déclare ce qu’il consomme.',
        'jobs:',
        '  ci:',
        '    uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-ci.yml@v4',
      ].join('\n'),
      'src/i18n.ts': [
        '/**',
        " * Le parc portait 88 locales `'fr-FR'` codées en dur.",
        ' */',
        "// Ne jamais écrire 'fr-FR' ici : la locale vient du contexte.",
        'export const locale = getDefaultLocale();',
      ].join('\n'),
    },
    async root => {
      const report = diagnose(root);
      assert.ok(
        !ids(report).includes('secrets-inherit'),
        'un commentaire YAML n’est pas une clause'
      );
      assert.ok(
        !ids(report).includes('locale-figee'),
        'un commentaire de bloc ou de ligne n’est pas du code'
      );
    }
  );
});

test('le défaut réel est toujours vu, commentaire ou pas', async () => {
  await repo(
    {
      'package.json': { name: 'miss-fautive' },
      '.github/workflows/deploy.yml': [
        '# Ce commentaire parle de secrets: inherit sans en être un.',
        'jobs:',
        '  deploy:',
        '    uses: x/y/.github/workflows/z.yml@v4',
        '    secrets: inherit',
      ].join('\n'),
      'src/date.ts': "export const f = new Intl.DateTimeFormat('fr-FR');",
    },
    async root => {
      const report = diagnose(root);
      assert.ok(ids(report).includes('secrets-inherit'));
      assert.ok(ids(report).includes('locale-figee'));
    }
  );
});
