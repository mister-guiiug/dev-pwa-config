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

import {
  PRESET,
  diagnose,
  filtreE2e,
  format,
  liensFamille,
  run,
  specJouee,
} from '../scripts/pwa-doctor.mjs';

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
        bundleBudget: { totalGzipKb: 200, mainChunkKb: 120 },
        dependencies: { '@supabase/supabase-js': '2' },
        devDependencies: { '@playwright/test': '1' },
      },
      '.editorconfig': 'root = true',
      '.nvmrc': '22',
      '.gitattributes': '* text=auto eol=lf',
      '.gitignore': 'dist\n.claude/worktrees/\n',
      'renovate.json': { extends: [PRESET] },
      '.lighthouserc.json': {},
      // Un titre que le filtre par défaut de la CI (`@critical|@a11y`) joue.
      'e2e/a11y.spec.ts': "test.describe('@a11y accessibilité', () => {});",
      '.github/workflows/ci.yml':
        'uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-ci.yml@v4\nwith:\n  run-e2e: true',
      '.github/workflows/lighthouse.yml':
        'uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-lighthouse.yml@v4',
      '.github/workflows/cleanup-runs.yml':
        'uses: mister-guiiug/dev-pwa-config/.github/workflows/cleanup-runs.yml@v4',
      '.github/workflows/keepalive.yml':
        'uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-supabase-keepalive.yml@v4',
      'vite.config.ts': `versionPlugin({ manifest: true }); pwaSeoPlugin({ themeColor: { light: '#fff', dark: '#000' } }); cspPlugin(); VitePWA({ registerType: 'prompt' })`,
      // Les trois liens de la famille sont sur DEUX écrans — l'accueil et À
      // propos — et nulle part ailleurs : la coquille ne les rend pas. C'est
      // la règle du 06/09/2026 ; la veille, c'est la coquille qui les portait.
      'src/main.tsx': `import { HashRouter } from 'react-router'; import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';
export function Shell() {
  return (<Routes><Route path="/" element={<HomeScreen />} /><Route path="/a-propos" element={<AboutScreen />} /></Routes>);
}`,
      'src/features/home/HomeScreen.tsx': `import { AppFooter } from '@mister-guiiug/dev-pwa-config/react/app-footer';
export function HomeScreen() { return <AppFooter repoUrl={REPO_URL} issues />; }`,
      'src/features/about/AboutScreen.tsx': `export function AboutScreen() { return <AppFooter repoUrl={REPO_URL} issues />; }`,
      'dist/index.html': html,
      'dist/version.json': { version: '1.0.0' },
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

test('les assets qui SORTENT du site sont un défaut, même quand le préfixe déduit ment', async () => {
  // `miss-ticket-pwa` a servi une PAGE BLANCHE du 03/06 au 06/09/2026 : sa base
  // valait `/`, le site vit sous `/miss-ticket-pwa/`, et Vite écrivait donc
  // `<script src="/assets/…">` — 404 depuis la racine de l'origine. Build vert,
  // CI verte, docteur muet.
  //
  // MUET POUR UNE RAISON PRÉCISE, et c'est elle que ce test fige : `sitePrefix`
  // déduit le chemin du site DES SCRIPTS. Quand les scripts sont faux, il se
  // replie sur `/`, et tout contrôle bâti dessus se désarme au moment où il
  // servirait. La canonique, écrite depuis l'URL publique déclarée, ne dépend
  // pas des assets : c'est elle qui juge.
  const html = `<!doctype html><html lang="fr"><head>
    <link rel="canonical" href="https://o.github.io/miss-x/">
    <script type="module" src="/assets/index-abc.js"></script>
    <link rel="stylesheet" href="/assets/index-abc.css">
    </head><body><div id="root"></div></body></html>`;
  await repo(
    { 'package.json': { name: 'miss-x' }, 'dist/index.html': html },
    root => {
      const trouve = diagnose(root).findings.find(
        f => f.id === 'assets-hors-site'
      );
      assert.ok(trouve, 'un site sans JS ni CSS est un défaut, pas une dette');
      assert.equal(trouve.level, 'défaut');
      assert.match(trouve.message, /2 asset/);
      assert.match(trouve.message, /miss-x/, 'le message dit où vit le site');
    }
  );
});

test('les mêmes assets SOUS le site ne disent rien', async () => {
  const html = `<!doctype html><html lang="fr"><head>
    <link rel="canonical" href="https://o.github.io/miss-x/">
    <script type="module" src="/miss-x/assets/index-abc.js"></script>
    <link rel="stylesheet" href="/miss-x/assets/index-abc.css">
    </head><body></body></html>`;
  await repo(
    { 'package.json': { name: 'miss-x' }, 'dist/index.html': html },
    root => {
      assert.ok(
        !ids(diagnose(root)).includes('assets-hors-site'),
        'sous le site : rien à signaler'
      );
    }
  );
});

test('sans canonique, le contrôle des assets se TAIT au lieu de deviner', async () => {
  // Un site à la racine d'un domaine propre n'a pas de préfixe, et une app sans
  // `pwaSeoPlugin` n'a pas de canonique du tout. Inventer un chemin là serait
  // pire que se taire — et l'absence de canonique est déjà signalée.
  const html = `<!doctype html><html lang="fr"><head>
    <script type="module" src="/assets/index-abc.js"></script>
    </head><body></body></html>`;
  await repo(
    { 'package.json': { name: 'miss-x' }, 'dist/index.html': html },
    root => {
      const report = diagnose(root);
      assert.ok(!ids(report).includes('assets-hors-site'));
      assert.ok(ids(report, 'dette').includes('canonical'));
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

/* ── Les trois liens de la famille ───────────────────────────────────────── */

const liens = source => liensFamille(source).verdict;
const fichier = (rel, text) => ({ rel, text });

test('la coquille rend les liens sur TOUS les écrans : « partout » — un écran de trop depuis le 06/09/2026', () => {
  // La veille, c'était la réponse du socle. Le verdict garde son nom : c'est
  // le diagnostic qui a changé de camp (voir plus bas, « la coquille est un
  // écran de trop »).
  assert.equal(
    liens([
      fichier(
        'src/App.tsx',
        '<Routes><Route path="/" element={<Home />} /></Routes><AppFooter repoUrl={REPO_URL} />'
      ),
    ]),
    'partout'
  );
  // Une indirection : le pied de page vit ailleurs, la coquille le rend. C'est
  // la forme de `miss-carbook` (SiteFooter) et de `miss-lookhouse` (Footer).
  assert.equal(
    liens([
      fichier(
        'src/components/SiteFooter.tsx',
        'export function SiteFooter() { return <a href="https://buymeacoffee.com/x">café</a> + REPO_URL; }'
      ),
      fichier('src/App.tsx', '<Routes>{routes}</Routes><SiteFooter />'),
    ]),
    'partout'
  );
});

test('un écran MONTÉ PAR UNE ROUTE n’est pas « partout »', () => {
  // LE CŒUR DU CONTRÔLE. Sans le dépouillement des routes, `<SettingsScreen/>`
  // écrit dans `element={…}` se lit comme un rendu de coquille — et douze apps
  // sur dix-neuf passaient à tort le 05/09/2026.
  assert.equal(
    liens([
      fichier(
        'src/features/settings/SettingsScreen.tsx',
        'export function SettingsScreen() { return <FamilyApps />; }'
      ),
      fichier(
        'src/App.tsx',
        '<Routes><Route path="/reglages" element={<SettingsScreen />} /></Routes>'
      ),
    ]),
    'partiel'
  );
});

test('deux écrans — l’accueil ET À propos / Réglages — et seulement eux', () => {
  const accueil = fichier(
    'src/pages/HomePage.tsx',
    'export function HomePage() { return <AppFooter />; }'
  );
  const reglages = fichier(
    'src/pages/SettingsPage.tsx',
    'export function SettingsPage() { return <AppFooter />; }'
  );
  assert.equal(liens([accueil, reglages]), 'deux');
  // L'un sans l'autre ne suffit pas : c'est le cas de douze apps du parc, dans
  // les deux sens — dix sur les réglages seuls, deux sur l'accueil seul.
  assert.equal(liens([accueil]), 'partiel');
  assert.equal(liens([reglages]), 'partiel');

  // UN TROISIÈME ÉCRAN EST UN ÉCRAN DE TROP, qu'il soit étranger à la règle
  // (`miss-contraction` rend le pied de page sur sa liste de contrôle) ou
  // qu'il soit un second « À propos / Réglages » (`mister-cim10` : l'aide ET
  // les réglages, en plus de l'accueil). Le verdict nomme les écrans : c'est
  // ce que la dette affiche.
  const autre = fichier(
    'src/pages/ChecklistPage.tsx',
    'export function ChecklistPage() { return <AppFooter />; }'
  );
  const aide = fichier(
    'src/pages/HelpPage.tsx',
    'export function HelpPage() { return <AppFooter />; }'
  );
  assert.deepEqual(liensFamille([accueil, reglages, autre]), {
    verdict: 'trop',
    ecrans: [
      'src/pages/HomePage.tsx',
      'src/pages/SettingsPage.tsx',
      'src/pages/ChecklistPage.tsx',
    ],
  });
  assert.equal(liens([accueil, reglages, aide]), 'trop');
  // Deux écrans, mais pas les bons : l'accueil et un écran étranger.
  assert.equal(liens([accueil, autre]), 'trop');
});

test('une indirection côté écrans : ce sont les écrans qui rendent le pied de page qui comptent', () => {
  // `Footer.tsx` définit le porteur ; il ne s'affiche nulle part par lui-même.
  // Deux écrans le rendent : c'est la forme attendue. Trois : un de trop.
  const footer = fichier(
    'src/components/Footer.tsx',
    'export function Footer() { return <AppFooter repoUrl={REPO_URL} issues />; }'
  );
  const home = fichier('src/pages/HomePage.tsx', '<Footer />');
  const about = fichier('src/pages/AboutPage.tsx', '<Footer />');
  const game = fichier('src/pages/GamePage.tsx', '<Footer />');
  assert.equal(liens([footer, home, about]), 'deux');
  assert.deepEqual(liensFamille([footer, home, about, game]), {
    verdict: 'trop',
    ecrans: [
      'src/pages/HomePage.tsx',
      'src/pages/AboutPage.tsx',
      'src/pages/GamePage.tsx',
    ],
  });
  // Un porteur que personne ne rend et qui n'est pas un écran nommé : le
  // contrôle ne sait pas où il s'affiche, et le dit plutôt que de deviner.
  assert.deepEqual(liensFamille([footer]), {
    verdict: 'trop',
    ecrans: ['src/components/Footer.tsx'],
  });
});

test('aucun porteur : la dette le dit sans deviner', () => {
  assert.equal(
    liens([fichier('src/App.tsx', '<Routes>{routes}</Routes>')]),
    'absent'
  );
  // Un fichier de test ne compte pas : il ne rend rien à personne.
  assert.equal(
    liens([fichier('src/App.test.tsx', '<AppFooter repoUrl={REPO_URL} />')]),
    'absent'
  );
});

test('une app SANS ROUTEUR a quand même une coquille : celle que l’entrée monte', () => {
  // Trois apps du parc basculent d'écran sur un état, sans `<Routes>` ni
  // `<Outlet>` : `miss-dice`, `miss-ticket-pwa`, `mister-puzzle`. Cherchée à
  // ces marqueurs seuls, leur coquille n'existe pas — et le contrôle leur
  // reprochait éternellement une place qu'elles tiennent.
  //
  // ON SUIT L'IMPORT, PAS L'EXPORT : `export default App` ne porte pas de nom
  // exportable, et c'est la forme de deux des trois. Le nom vivant est celui
  // que l'entrée s'est donné en important.
  assert.equal(
    liens([
      fichier(
        'src/main.tsx',
        "import App from './App.tsx';\ncreateRoot(el).render(<App />);"
      ),
      fichier(
        'src/App.tsx',
        'function App() { return (<><Screen /><AppFooter repoUrl={REPO_URL} /></>); }\nexport default App;'
      ),
    ]),
    'partout'
  );

  // Une indirection au-delà de l'entrée : `main` monte `App`, `App` rend le
  // porteur défini ailleurs. C'est la forme de `miss-dice`.
  assert.equal(
    liens([
      fichier('src/main.tsx', "import { App } from './react/App';\n<App />"),
      fichier('src/react/App.tsx', '<DiceScreen /><FamilyLinks />'),
      fichier(
        'src/react/components/FamilyLinks.tsx',
        "export function FamilyLinks() { return <a href={SPONSOR_URL}>café</a> + repoUrl('x'); }"
      ),
    ]),
    'partout'
  );

  // Le composant que l'entrée monte n'est PAS un blanc-seing : sans porteur,
  // le verdict reste « absent ».
  assert.equal(
    liens([
      fichier('src/main.tsx', "import App from './App';\n<App />"),
      fichier('src/App.tsx', 'export default function App() { return null; }'),
    ]),
    'absent'
  );

  // SANS ROUTEUR, LA CONDITION EST L'ÉCRAN. Ce que la coquille rend derrière
  // un `&&`, dans un ternaire ou un `switch` n'est pas « partout » : c'est
  // ainsi qu'elle bascule d'écran. `mister-puzzle` rend `<Home />` dans un
  // ternaire, `miss-ticket-pwa` `<Settings />` derrière un `&&` — un écran
  // chacune, et le contrôle leur reprochait tous les écrans.
  const entree = fichier('src/main.tsx', "import App from './App';\n<App />");
  assert.equal(
    liens([
      entree,
      fichier(
        'src/App.tsx',
        "export default function App() { return screen === 'home' ? (\n<Home />\n) : (\n<Game />\n); }"
      ),
      fichier(
        'src/components/Home.tsx',
        'export function Home() { return <AppFooter repoUrl={REPO_URL} />; }'
      ),
    ]),
    'partiel'
  );
  assert.equal(
    liens([
      entree,
      fichier(
        'src/App.tsx',
        'export default function App() { return (<>{showSettings && (\n<Settings onClose={close} />\n)}<Board /></>); }'
      ),
      fichier(
        'src/components/Settings.tsx',
        'export function Settings() { return <AppFooter repoUrl={REPO_URL} />; }'
      ),
    ]),
    'partiel'
  );
  assert.equal(
    liens([
      entree,
      fichier(
        'src/App.tsx',
        "export default function App() { switch (screen) { case 'settings': return <Settings />; default: return <Board />; } }"
      ),
      fichier(
        'src/components/Settings.tsx',
        'export function Settings() { return <AppFooter repoUrl={REPO_URL} />; }'
      ),
    ]),
    'partiel'
  );
  // Rendu SANS condition par la même coquille : partout, comme avant.
  assert.equal(
    liens([
      entree,
      fichier(
        'src/App.tsx',
        'export default function App() { return (<><Board /><Settings /></>); }'
      ),
      fichier(
        'src/components/Settings.tsx',
        'export function Settings() { return <AppFooter repoUrl={REPO_URL} />; }'
      ),
    ]),
    'partout'
  );
  // Le pied de page du socle DANS la coquille sans routeur, sous condition :
  // le contrôle ne sait pas nommer l'écran, et le dit (un écran de trop, cité).
  assert.deepEqual(
    liensFamille([
      entree,
      fichier(
        'src/App.tsx',
        "export default function App() { return (<>{screen === 'home' && <AppFooter repoUrl={REPO_URL} />}</>); }"
      ),
    ]),
    { verdict: 'trop', ecrans: ['src/App.tsx'] }
  );
});

test('la coquille est un écran de trop : les liens sur deux écrans, pas sur tous', async () => {
  // Depuis le 06/09/2026, la règle plafonne : l'accueil ET À propos / Réglages,
  // nulle part ailleurs. Un pied de page rendu hors des routes est sur TOUS
  // les écrans — la forme que le contrôle acceptait la veille, et que quatre
  // apps et le squelette tenaient. Trois liens sortants sous un plateau de jeu
  // ou un formulaire, ce n'est pas un pied de page, c'est du bruit.
  await repo(
    {
      'package.json': { name: 'miss-x' },
      'src/App.tsx':
        '<Routes><Route path="/" element={<Home />} /></Routes><AppFooter repoUrl={REPO_URL} issues />',
    },
    root => {
      const f = diagnose(root).findings.find(x => x.id === 'liens-famille');
      assert.equal(f?.level, 'dette', 'la coquille est une dette');
      assert.match(f.message, /tous les écrans/);
      assert.match(f.fix, /l’accueil ET À propos \/ Réglages/);
    }
  );

  // Un troisième écran, ou un écran étranger à la règle : la dette compte et
  // nomme — c'est le geste, retirer le pied de page de l'écran cité.
  await repo(
    {
      'package.json': { name: 'miss-x' },
      'src/pages/HomePage.tsx': '<AppFooter repoUrl={REPO_URL} />',
      'src/pages/SettingsPage.tsx': '<AppFooter repoUrl={REPO_URL} />',
      'src/pages/GamePage.tsx': '<AppFooter repoUrl={REPO_URL} />',
    },
    root => {
      const f = diagnose(root).findings.find(x => x.id === 'liens-famille');
      assert.equal(f?.level, 'dette', 'trois écrans : une dette');
      assert.match(f.message, /3 écrans/);
      assert.match(f.message, /GamePage/);
    }
  );

  // La forme attendue ne dit rien.
  await repo(
    {
      'package.json': { name: 'miss-x' },
      'src/pages/HomePage.tsx': '<AppFooter repoUrl={REPO_URL} issues />',
      'src/pages/AboutPage.tsx': '<AppFooter repoUrl={REPO_URL} issues />',
    },
    root => {
      assert.equal(
        diagnose(root).findings.find(x => x.id === 'liens-famille'),
        undefined
      );
    }
  );
});

/* ── Les gardes du 05/09/2026 ─────────────────────────────────────────────── */

test('un déploiement Pages écrit à la main est une dette ; par le réutilisable, non', async () => {
  // mister-puzzle et mister-doc servaient la page 404 de GitHub sur un lien
  // profond : leur deploy.yml n'appelle pas le réutilisable, qui seul pose le
  // repli SPA, `required-env` et le base path.
  const maison = {
    'package.json': { name: 'mister-puzzle' },
    '.github/workflows/deploy.yml':
      'steps:\n  - uses: actions/upload-pages-artifact@v3\n  - uses: actions/deploy-pages@v4',
  };
  await repo(maison, root => {
    assert.ok(ids(diagnose(root), 'dette').includes('wf-deploy-maison'));
  });
  await repo(
    {
      ...maison,
      '.github/workflows/deploy.yml':
        'uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-deploy.yml@v4',
    },
    root => {
      assert.ok(!ids(diagnose(root)).includes('wf-deploy-maison'));
    }
  );
});

test('spa-404 : ce que pwa-deploy.yml@v4 pose au déploiement n’est pas un défaut du build', async () => {
  const base = {
    'package.json': { name: 'miss-badminton' },
    'src/main.tsx': "import { BrowserRouter } from 'react-router';",
    'dist/index.html':
      '<html lang="fr"><head><link rel="manifest" href="/miss-badminton/m.webmanifest"><script type="module" src="/miss-badminton/assets/i.js"></script></head></html>',
  };
  await repo(
    {
      ...base,
      '.github/workflows/deploy.yml':
        'uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-deploy.yml@v4',
    },
    root => {
      assert.ok(
        !ids(diagnose(root), 'défaut').includes('spa-404'),
        'le réutilisable copie index.html en 404.html'
      );
    }
  );
  await repo(
    {
      ...base,
      '.github/workflows/deploy.yml':
        'uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-deploy.yml@v2',
    },
    root => {
      assert.ok(
        ids(diagnose(root), 'défaut').includes('spa-404'),
        'un v2 ne le fait pas'
      );
    }
  );
});

test('une spec que le filtre e2e ne joue jamais est une dette ; le défaut du réutilisable joue @a11y', async () => {
  const fichiers = {
    'package.json': {
      name: 'miss-x',
      devDependencies: { '@playwright/test': '1' },
    },
    'e2e/a11y.spec.ts':
      "test.describe('@a11y accessibilité', () => { test('accueil', async () => {}); });",
    'e2e/smoke.spec.ts': "test.describe('@critical le cadre', () => {});",
  };
  await repo(
    {
      ...fichiers,
      '.github/workflows/ci.yml':
        "uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-ci.yml@v4\nwith:\n  run-e2e: true\n  e2e-grep: '@critical'",
    },
    root => {
      const d = diagnose(root).findings.find(f => f.id === 'e2e-hors-filtre');
      assert.ok(d, 'la spec a11y est hors filtre');
      assert.match(d.message, /e2e\/a11y\.spec\.ts/);
      assert.doesNotMatch(d.message, /smoke/);
      assert.match(d.message, /@critical/);
    }
  );
  await repo(
    {
      ...fichiers,
      '.github/workflows/ci.yml':
        'uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-ci.yml@v4\nwith:\n  run-e2e: true',
    },
    root => {
      assert.ok(
        !ids(diagnose(root)).includes('e2e-hors-filtre'),
        'le défaut @critical|@a11y couvre les deux specs'
      );
    }
  );
});

test('filtreE2e lit ci.yml, ignore les commentaires, tolère un filtre mal formé', () => {
  assert.equal(
    filtreE2e("with:\n  e2e-grep: '@smoke|@a11y'").source,
    '@smoke|@a11y'
  );
  assert.equal(filtreE2e('with:\n  run-e2e: true').source, '@critical|@a11y');
  assert.equal(
    filtreE2e('# e2e-grep: \'@jamais\'\nwith:\n  e2e-grep: "@critical"').source,
    '@critical'
  );
  assert.ok(
    filtreE2e('e2e-grep: (').test('('),
    'un filtre invalide devient littéral'
  );
  assert.ok(
    specJouee("test.describe.serial('@critical x', () => {})", filtreE2e(''))
  );
  assert.ok(!specJouee("test('sans tag', async () => {})", filtreE2e('')));
});

test('un port de développement qui n’est pas celui du catalogue est une information', async () => {
  // miss-carbook a 5201 au catalogue ; un launch.json sur 5173 la mettrait en
  // collision avec toute app restée sur le port par défaut de Vite.
  await repo(
    {
      'package.json': { name: 'miss-carbook' },
      '.claude/launch.json': { configurations: [{ port: 5173 }] },
      'vite.config.ts': 'export default { server: { port: 5173 }, base: "/" }',
    },
    root => {
      const info = diagnose(root).findings.find(f => f.id === 'dev-port');
      assert.ok(info && info.level === 'info');
      assert.match(info.message, /5173 \(\.claude\/launch\.json\)/);
      assert.match(info.message, /5173 \(vite\.config\)/);
      assert.match(info.message, /5201/);
    }
  );
  await repo(
    {
      'package.json': { name: 'miss-carbook' },
      'vite.config.ts': 'export default { server: { port: 5201 } }',
    },
    root => {
      assert.ok(
        !ids(diagnose(root)).includes('dev-port'),
        'le bon port : rien à dire'
      );
    }
  );
  await repo({ 'package.json': { name: 'app-hors-catalogue' } }, root => {
    assert.ok(
      !ids(diagnose(root)).includes('dev-port'),
      'hors catalogue : rien à comparer'
    );
  });
});

test('version.json : sans versionPlugin, l’app ne sait pas ce qui est en ligne', async () => {
  // Dix-sept sites sur dix-huit le 05/09/2026 : `AppUpdates` propose une
  // version sans pouvoir dire laquelle, ni laquelle tourne.
  await repo(
    { 'package.json': { name: 'miss-x' }, 'vite.config.ts': 'VitePWA({})' },
    root => {
      assert.ok(ids(diagnose(root), 'dette').includes('version-manifest'));
    }
  );
  await repo(
    {
      'package.json': { name: 'miss-x' },
      'vite.config.ts': 'versionPlugin({ manifest: true }); VitePWA({})',
    },
    root => {
      assert.ok(!ids(diagnose(root)).includes('version-manifest'));
    }
  );
});

test('deux informations : un budget sans plafond initial, localStorage sans magasin versionné', async () => {
  await repo(
    {
      'package.json': { name: 'miss-x', bundleBudget: { totalGzipKb: 300 } },
      'src/store.ts': [
        "localStorage.setItem('a', '1'); localStorage.getItem('a');",
        "// localStorage.removeItem('c') — un commentaire n'est pas un accès",
      ].join('\n'),
    },
    root => {
      const infos = diagnose(root).findings.filter(f => f.level === 'info');
      assert.ok(infos.some(f => f.id === 'main-chunk-budget'));
      const ls = infos.find(f => f.id === 'local-storage-direct');
      assert.ok(ls);
      assert.match(ls.message, /^2 accès/, 'le commentaire ne compte pas');
    }
  );
  await repo(
    {
      'package.json': {
        name: 'miss-x',
        bundleBudget: { totalGzipKb: 300, mainChunkKb: 120 },
      },
      'src/store.ts':
        "import { createVersionedStore } from '@mister-guiiug/dev-pwa-config/versioned-store'; localStorage.getItem('legacy');",
    },
    root => {
      const trouves = ids(diagnose(root));
      assert.ok(!trouves.includes('main-chunk-budget'));
      assert.ok(
        !trouves.includes('local-storage-direct'),
        'le magasin versionné est là : la lecture héritée est un choix'
      );
    }
  );
});
