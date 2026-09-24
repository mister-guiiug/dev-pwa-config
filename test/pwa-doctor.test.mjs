// `pwa-doctor` — la checklist du parc, lue sur un dépôt factice.
//
// Trois dépôts : le vide (tout en dette, rien en défaut), le fautif (les
// défauts du 02/09/2026, un par un), le conforme (silence complet — c'est la
// définition exécutable de « conforme au parc »).
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
import { dirname, join, resolve } from 'node:path';

import {
  PRESET,
  depotGitHub,
  diagnose,
  faitsDepot,
  filtreE2e,
  format,
  issuesActivees,
  liensFamille,
  composantsAccueil,
  porteSignalement,
  run,
  specJouee,
} from '../scripts/pwa-doctor.mjs';

/**
 * Le majeur courant du socle, LU — jamais écrit en dur, ici pas plus qu'ailleurs.
 *
 * Les dépôts factices « conformes » référencent le réutilisable, et le docteur
 * compare cette référence au majeur du paquet qui l'exécute. Figée des deux
 * côtés, l'égalité serait tautologique ; figée d'un seul, elle tombait à chaque
 * majeur — c'est ce qui vient d'arriver à la 6.0.0, où le docteur exigeait
 * encore `@v4` et refusait donc les dépôts correctement montés.
 */
const MAJEUR = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
).version.split('.')[0];

/**
 * La version de Node que CE dépôt épingle — lue, pour la même raison.
 *
 * Le docteur conseille un numéro à l'app qui n'a pas de `.nvmrc`, et il est
 * OBLIGÉ de le figer : il s'exécute depuis le `node_modules` de l'app, où le
 * dépôt du socle n'est pas, et `.nvmrc` ne fait pas partie du paquet publié.
 * Une constante recopiée dérive — `v4` l'a fait à trois endroits à la fois —
 * alors le test l'amarre à la source : les deux montent ensemble, ou il rougit.
 */
const NODE_EPINGLE = readFileSync(
  new URL('../.nvmrc', import.meta.url),
  'utf8'
).trim();

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

test('la référence au socle se compare au majeur COURANT, qui est LU', async () => {
  // LE DÉFAUT QUE CE TEST FERME. La cible était écrite en dur (`v4`) : à la
  // 6.0.0, un dépôt correctement monté en `@v6` se voyait reprocher la bonne
  // valeur, et `--strict` refusait son build. Le contrôle accusait ce qu'il
  // était censé récompenser.
  const majeur = MAJEUR;

  await repo(
    {
      'package.json': { name: 'miss-a-jour' },
      '.github/workflows/deploy.yml': `uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-deploy.yml@v${majeur}`,
    },
    root => {
      assert.ok(
        !ids(diagnose(root)).includes('wf-v3'),
        `@v${majeur} est la bonne valeur pour un dépôt qui dépend du socle ${majeur}`
      );
    }
  );

  // Et le majeur PRÉCÉDENT reste une dette : le contrôle n'a pas été désarmé
  // en route, il a seulement appris à viser.
  await repo(
    {
      'package.json': { name: 'miss-en-retard' },
      '.github/workflows/deploy.yml': `uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-deploy.yml@v${Number(majeur) - 1}`,
    },
    root => {
      const report = diagnose(root);
      assert.ok(ids(report, 'dette').includes('wf-v3'));
      assert.match(
        format(report),
        new RegExp(`passer en @v${majeur}\\b`),
        'le geste nomme la cible courante, pas une figée'
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
      '.github/workflows/deploy.yml': `uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-deploy.yml@v${MAJEUR}
    secrets: inherit
    with:
      build-env: |
        VITE_SUPABASE_URL=\${{ secrets.VITE_SUPABASE_URL }}`,
    },
    root => {
      const report = diagnose(root);
      const dettes = ids(report, 'dette');

      // DÉFAUT, plus dette, depuis le 07/09/2026 : la dette n'a rien empêché
      // — dix-sept dépôts sur dix-sept portaient la ligne au relevé de la
      // veille, et aucune app ne lance `--strict`.
      assert.ok(
        ids(report, 'défaut').includes('secrets-inherit'),
        'inherit donne tout le trousseau, et le job doit échouer dessus'
      );
      assert.ok(
        !dettes.includes('secrets-inherit'),
        'plus en dette : une dette que rien ne force ne se paie jamais'
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
      '.github/workflows/ci.yml': `uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-ci.yml@v${MAJEUR}\nwith:\n  run-e2e: true`,
      '.github/workflows/lighthouse.yml': `uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-lighthouse.yml@v${MAJEUR}`,
      '.github/workflows/cleanup-runs.yml': `uses: mister-guiiug/dev-pwa-config/.github/workflows/cleanup-runs.yml@v${MAJEUR}`,
      '.github/workflows/keepalive.yml': `uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-supabase-keepalive.yml@v${MAJEUR}`,
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

/*
 * UN MORCEAU HORS PRÉCACHE QUI PORTE UNE EMPREINTE — le défaut qui a rendu
 * Sentry muet sur dix-neuf dépôts sans que personne le voie.
 *
 * Production de mister-qowa, 22/09/2026 : « Échec du chargement pour le module
 * dont la source est .../sentry-EYLFX1f0.js », HTTP 404. Le service worker sert
 * la coquille précachée jusqu'à la mise à jour acceptée ; elle demande l'ancienne
 * empreinte, que le déploiement suivant a supprimée. Ce qui est précaché survit :
 * seul ce qui en est EXCLU casse — et `initSentry` avale l'échec, donc l'app ne
 * casse pas, elle cesse juste de rapporter.
 */

/** Un build minimal : une page, un manifeste de précache, des morceaux. */
const buildAvecSw = (precachés, morceaux, { sw = true } = {}) => {
  const files = {
    'package.json': { name: 'miss-x' },
    'dist/index.html':
      '<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width"></head><body></body></html>',
  };
  for (const m of morceaux) files['dist/assets/' + m] = '/* morceau */';
  if (sw) {
    const manifeste = precachés
      .map(u => `{url:"assets/${u}",revision:null}`)
      .join(',');
    files['dist/sw.js'] = `s.precacheAndRoute([${manifeste}]);`;
  }
  return files;
};

const trouve = (root, id) => diagnose(root).findings.find(f => f.id === id);

test('un morceau hors précache qui porte une empreinte est un défaut', async () => {
  await repo(
    buildAvecSw(
      ['index-DhszbAbc.js'],
      ['index-DhszbAbc.js', 'sentry-EYLFX1f0.js']
    ),
    root => {
      const f = trouve(root, 'chunk-hors-precache');
      assert.ok(f, 'le morceau exclu du précache et empreinté est signalé');
      assert.equal(f.level, 'défaut');
      assert.match(
        f.message,
        /sentry-EYLFX1f0\.js/,
        'le message NOMME le fautif'
      );
      assert.match(f.message, /1 morceau/);
    }
  );
});

test('le même morceau à nom STABLE ne dit rien : c’est le remède, pas le précache', async () => {
  // Le remède n'est pas de précacher les 158 kB du SDK — c'est de lui donner
  // une URL qui survive au déploiement.
  await repo(
    buildAvecSw(['index-DhszbAbc.js'], ['index-DhszbAbc.js', 'sentry.js']),
    root => {
      assert.equal(trouve(root, 'chunk-hors-precache'), undefined);
    }
  );
});

test('un morceau PRÉCACHÉ garde son empreinte sans rien déclencher', async () => {
  // Le cas normal, et il est majoritaire : 41 morceaux sur 42 chez mister-qowa.
  await repo(
    buildAvecSw(
      ['index-DhszbAbc.js', 'store-WU2KOs_d.js'],
      ['index-DhszbAbc.js', 'store-WU2KOs_d.js']
    ),
    root => {
      assert.equal(trouve(root, 'chunk-hors-precache'), undefined);
    }
  );
});

test('sans service worker le contrôle se TAIT — et ce n’est pas un faux vert', async () => {
  // Sans précache, aucune coquille périmée ne peut demander un ancien nom :
  // l'invariant est VIDE, pas contourné. La contre-épreuve est dans le même
  // test — mêmes fichiers, un sw en plus, et le défaut apparaît.
  const morceaux = ['index-DhszbAbc.js', 'sentry-EYLFX1f0.js'];
  await repo(buildAvecSw([], morceaux, { sw: false }), root => {
    assert.equal(
      trouve(root, 'chunk-hors-precache'),
      undefined,
      'pas de sw : rien à conclure'
    );
  });
  await repo(buildAvecSw(['index-DhszbAbc.js'], morceaux), root => {
    assert.ok(
      trouve(root, 'chunk-hors-precache'),
      'le MÊME build avec un sw signale : le silence ci-dessus vient bien du sw absent'
    );
  });
});

test('un manifeste développé se lit comme un manifeste minifié', async () => {
  // `injectManifest` et `generateSW` n'écrivent pas la même forme, et un
  // contrôle qui n'en connaît qu'une se taira sur la moitié du parc.
  const files = {
    'package.json': { name: 'miss-x' },
    'dist/index.html':
      '<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width"></head><body></body></html>',
    'dist/assets/index-DhszbAbc.js': '/* entrée */',
    'dist/assets/sentry-EYLFX1f0.js': '/* sdk */',
    'dist/sw.js': `precacheAndRoute([\n  { "url": "assets/index-DhszbAbc.js", "revision": null }\n]);`,
  };
  await repo(files, root => {
    const f = trouve(root, 'chunk-hors-precache');
    assert.ok(f, 'la forme développée est lue elle aussi');
    assert.match(f.message, /sentry-EYLFX1f0\.js/);
  });
});

test('le code de Workbox ne compte pas comme un manifeste', async () => {
  // Le bundle du worker porte ses propres littéraux `url:`. S'ils passaient pour
  // des entrées de précache, la règle croirait tout précaché et se tairait —
  // exactement le faux vert qu'on cherche à éviter.
  const files = {
    'package.json': { name: 'miss-x' },
    'dist/index.html':
      '<!doctype html><html lang="fr"><head><meta name="viewport" content="width=device-width"></head><body></body></html>',
    'dist/assets/index-DhszbAbc.js': '/* entrée */',
    'dist/assets/sentry-EYLFX1f0.js': '/* sdk */',
    // Un `url:` qui ne DÉSIGNE PAS un fichier servi, plus un vrai manifeste.
    'dist/sw.js': `const r={url:t.href,mode:"navigate"};s.precacheAndRoute([{url:"assets/index-DhszbAbc.js",revision:null}]);`,
  };
  await repo(files, root => {
    assert.ok(
      trouve(root, 'chunk-hors-precache'),
      'le littéral interne de Workbox n’a pas fait passer le morceau pour précaché'
    );
  });
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
        `    uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-ci.yml@v${MAJEUR}`,
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

/* ── Le droit de réponse ──────────────────────────────────────────────────
 *
 * Promouvoir un contrôle en défaut sans lui, c'est transformer un désaccord en
 * CI rouge permanente. Le parc y a déjà buté : les e2e de mister-puzzle sont
 * VOLONTAIREMENT sans étiquette, décision assumée par le propriétaire, et le
 * docteur ne savait que la compter — faute de pouvoir l'entendre.
 */

const AVEC_INHERIT = [
  'jobs:',
  '  ci:',
  `    uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-ci.yml@v${MAJEUR}`,
  '    secrets: inherit',
].join('\n');

test('un refus motivé éteint le défaut, sans le cacher', async () => {
  await repo(
    {
      'package.json': {
        name: 'miss-miroir',
        pwaDoctor: {
          refus: {
            'secrets-inherit':
              'miroir : la source est bac-sable, tout est régénéré par npm run mirror',
          },
        },
      },
      '.github/workflows/ci.yml': AVEC_INHERIT,
    },
    async root => {
      const report = diagnose(root);
      assert.ok(!ids(report, 'défaut').includes('secrets-inherit'));
      assert.ok(!ids(report, 'dette').includes('secrets-inherit'));

      // Éteint, pas effacé : la ligne reste au rapport, avec sa raison.
      const refuse = report.findings.find(f => f.id === 'secrets-inherit');
      assert.equal(refuse.level, 'refus');
      assert.match(refuse.raison, /npm run mirror/);
      assert.match(format(report), /↳ refusé ici : miroir : la source/);
      assert.match(format(report), /1 refus/);

      // Et surtout : la CI cesse d'être rouge pour ça.
      assert.equal(await run(['--dir', root, '--no-github']), 0);
    }
  );
});

test('une raison vide n’est pas un refus', async () => {
  // On refuse en disant pourquoi, ou on ne refuse pas : sinon la liste
  // d'exceptions devient un interrupteur, et le pourquoi se perd.
  await repo(
    {
      'package.json': {
        name: 'miss-muette',
        pwaDoctor: { refus: { 'secrets-inherit': '   ' } },
      },
      '.github/workflows/ci.yml': AVEC_INHERIT,
    },
    async root => {
      const report = diagnose(root);
      assert.ok(ids(report, 'défaut').includes('secrets-inherit'));
      assert.equal(await run(['--dir', root, '--no-github']), 1);
    }
  );
});

test('un refus qui n’excuse plus rien se signale lui-même', async () => {
  // Sans ça, la liste d'exceptions grossit d'un cran à chaque décision et ne
  // redescend jamais — c'est la leçon du relevé d'adoption.
  await repo(
    {
      'package.json': {
        name: 'miss-propre',
        pwaDoctor: {
          refus: { 'secrets-inherit': 'plus vrai depuis la campagne du 07/09' },
        },
      },
      '.github/workflows/ci.yml': 'jobs:\n  ci:\n    uses: x/y/z.yml@v4',
    },
    async root => {
      const report = diagnose(root);
      const perime = report.findings.find(
        f => f.id === 'refus-perime-secrets-inherit'
      );
      assert.equal(perime.level, 'info');
      assert.match(perime.message, /n’excuse plus rien/);
      assert.equal(perime.fix, 'retirer la ligne de package.json');
      // Se signaler n'est pas accuser : le refus périmé sort en info, et rien
      // dans ce dépôt n'est un défaut — le code de sortie reste 0.
      assert.deepEqual(ids(report, 'défaut'), []);
      assert.equal(await run(['--dir', root, '--no-github']), 0);
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

test('l’accueil se reconnaît aussi à SA ROUTE, pas seulement à son nom de fichier', () => {
  // miss-supatool, le 24/09/2026 : les liens étaient sur l'accueil et les
  // Réglages, comme la règle le veut — mais l'accueil s'appelle
  // `ConnectionsScreen`, et le contrôle le prenait pour un écran étranger.
  const routes = fichier(
    'src/App.tsx',
    '<Routes><Route path="/" element={<ConnectionsScreen />} /><Route path="/reglages" element={<SettingsScreen />} /></Routes>'
  );
  const connexions = fichier(
    'src/features/connections/ConnectionsScreen.tsx',
    'export function ConnectionsScreen() { return <AppFooter repoUrl={REPO_URL} />; }'
  );
  const reglages = fichier(
    'src/features/settings/SettingsScreen.tsx',
    'export function SettingsScreen() { return <AppFooter repoUrl={REPO_URL} />; }'
  );
  assert.equal(liens([routes, connexions, reglages]), 'deux');
  // Sans la route qui le monte sur `/`, le même écran reste étranger.
  assert.equal(liens([connexions, reglages]), 'trop');
});

test('l’accueil d’un routeur OBJET est son enfant `index`, même chargé paresseusement', () => {
  // mister-family-map : `createBrowserRouter`, une mise en page sur `/`, et
  // l'accueil en `index`, derrière `lazy()` et un habillage `page(…)`.
  const routeur = fichier(
    'src/app/router/index.tsx',
    "const ExplorePage = lazy(chargeurs.ExplorePage); export const router = createBrowserRouter([{ path: '/', element: <RootLayout />, children: [{ index: true, element: page(<ExplorePage />) }, { path: 'reglages', element: page(<SettingsPage />) }] }]);"
  );
  const explore = fichier(
    'src/pages/ExplorePage.tsx',
    'export default function ExplorePage() { return <AppFooter repoUrl={REPO_URL} />; }'
  );
  const reglages = fichier(
    'src/pages/SettingsPage.tsx',
    'export default function SettingsPage() { return <AppFooter repoUrl={REPO_URL} />; }'
  );
  assert.equal(liens([routeur, explore, reglages]), 'deux');
});

test('une route `/` qui a des enfants est une mise en page, pas l’accueil', () => {
  // La balise se lit en comptant les accolades : `element={<X />}` contient
  // un `>`, et un `[^>]*` s'y arrêtait au milieu de l'attribut.
  assert.deepEqual(
    composantsAccueil(
      '<Route path="/" element={<Layout />}><Route index element={<Home />} /></Route>'
    ),
    ['Home']
  );
  assert.deepEqual(
    composantsAccueil('<Route path="/jeu" element={<Game />} />'),
    []
  );
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

test('un commentaire qui cite le pied de page n’en rend pas un', () => {
  // Le squelette explique dans `App.tsx` pourquoi `<AppFooter>` n'y est plus :
  // lu en texte plat, ce commentaire faisait de la coquille un porteur — donc
  // « partout », le verdict même que l'explication écarte. Comme les autres
  // lectures du docteur, celle-ci retire les commentaires d'abord.
  const coquille = fichier(
    'src/App.tsx',
    "/* Le pied de page n'est pas ici : `<AppFooter>` suivrait chaque écran. */\n<Routes>{routes}</Routes>{/* jadis <AppFooter /> ici */}"
  );
  assert.equal(liens([coquille]), 'absent');
  assert.equal(
    liens([
      coquille,
      fichier('src/pages/HomePage.tsx', '<AppFooter repoUrl={REPO_URL} />'),
      fichier('src/pages/AboutPage.tsx', '<AppFooter repoUrl={REPO_URL} />'),
    ]),
    'deux'
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

test('une SORTIE ANTICIPÉE aiguille elle aussi : les liens ne sont pas « partout »', () => {
  // L'ANGLE MORT DU 19/09/2026. `sansCondition` ne lisait que les 120
  // caractères collés devant la balise : `miss-dice` aiguille par
  // `if (mode !== 'roll') return <Jeu />;` vingt lignes plus haut, et le
  // contrôle lui reprochait « tous les écrans » alors que ses liens ne
  // touchent jamais un plateau de jeu. Mille quatre-vingt-dix caractères
  // séparaient le garde de la balise, commentaires retirés.
  const entree = fichier('src/main.tsx', "import App from './App';\n<App />");
  const aiguillage = fichier(
    'src/App.tsx',
    'export default function App() {\n' +
      '  if (mode !== "roll") {\n' +
      '    const Ecran = LAZY[mode];\n' +
      '    return (\n<Suspense><Ecran /></Suspense>\n);\n' +
      '  }\n' +
      '  return (<div><Plateau />' +
      ' '.repeat(600) +
      '<FamilyLinks /></div>);\n}'
  );
  const porteur = fichier(
    'src/components/FamilyLinks.tsx',
    'export function FamilyLinks() { return <a href="https://buymeacoffee.com/x">{repoUrl("miss-x")}</a>; }'
  );
  assert.notEqual(liens([entree, aiguillage, porteur]), 'partout');

  // LE MOTIF EST ÉTROIT, ET C'EST VOULU. Un garde qui ne rend RIEN ne désigne
  // aucun autre écran : le pied de page qui le suit est bien sur tous.
  const garde = fichier(
    'src/App.tsx',
    'export default function App() {\n' +
      '  if (!pret) return null;\n' +
      '  return (<div><Plateau /><FamilyLinks /></div>);\n}'
  );
  assert.equal(liens([entree, garde, porteur]), 'partout');

  // LA FENÊTRE EST BORNÉE À DEUX MILLE CARACTÈRES : au-delà, l'aiguillage
  // appartient sans doute à un AUTRE composant du même fichier, et le
  // dédouanement serait un cadeau. Le contrôle préfère se tromper du côté qui
  // se voit.
  const loin = fichier(
    'src/App.tsx',
    'export default function App() {\n' +
      '  if (mode !== "roll") { return (<Jeu />); }\n' +
      '  return (<div>' +
      ' '.repeat(2200) +
      '<FamilyLinks /></div>);\n}'
  );
  assert.equal(liens([entree, loin, porteur]), 'partout');
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
      '.github/workflows/deploy.yml': `uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-deploy.yml@v${MAJEUR}`,
    },
    root => {
      assert.ok(!ids(diagnose(root)).includes('wf-deploy-maison'));
    }
  );
});

test('spa-404 : ce que pwa-deploy.yml pose au déploiement n’est pas un défaut du build', async () => {
  const base = {
    'package.json': { name: 'miss-badminton' },
    'src/main.tsx': "import { BrowserRouter } from 'react-router';",
    'dist/index.html':
      '<html lang="fr"><head><link rel="manifest" href="/miss-badminton/m.webmanifest"><script type="module" src="/miss-badminton/assets/i.js"></script></head></html>',
  };
  await repo(
    {
      ...base,
      '.github/workflows/deploy.yml': `uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-deploy.yml@v${MAJEUR}`,
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
      '.github/workflows/ci.yml': `uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-ci.yml@v${MAJEUR}\nwith:\n  run-e2e: true\n  e2e-grep: '@critical'`,
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
      '.github/workflows/ci.yml': `uses: mister-guiiug/dev-pwa-config/.github/workflows/pwa-ci.yml@v${MAJEUR}\nwith:\n  run-e2e: true`,
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

test('une barre basse collée par le CSS de l’app, sans le dire, est un DÉFAUT', async () => {
  // Le cas mesuré : `position: fixed` dans la feuille de l'app, pas de
  // `placement` sur le composant, donc `data-placement` jamais émis et
  // `--_dwc-bottom-clearance` à zéro. Les surfaces flottantes passent sous la
  // barre. mister-cim10 et miss-contraction, 16/09/2026.
  await repo(
    {
      'package.json': { name: 'miss-x' },
      'src/App.tsx': '<BottomNav items={items} />',
      'src/styles.css':
        "@import '@mister-guiiug/dev-pwa-config/components.css';\n.bottom-nav { position: fixed; bottom: 0; }",
    },
    root => {
      assert.ok(ids(diagnose(root), 'défaut').includes('bottom-nav-muette'));
    }
  );

  // SANS FEUILLE DU SOCLE, LE CONSEIL NE S'APPLIQUE PAS. Il n'y a alors pas de
  // dégagement à zéro : il n'y en a pas du tout. L'app place sa barre et ses
  // bandeaux elle-même, de bout en bout — c'est miss-contraction, que la
  // première écriture de ce contrôle flaguait à tort le 16/09/2026. Un contrôle
  // dont le conseil ne s'applique pas fait écrire une prop pour éteindre un
  // voyant.
  await repo(
    {
      'package.json': { name: 'miss-x' },
      'src/App.tsx': '<BottomNav items={items} />',
      'src/styles.css': '.bottom-nav { position: fixed; bottom: 0; }',
    },
    root => {
      assert.ok(!ids(diagnose(root)).includes('bottom-nav-muette'));
    }
  );

  // Le morceau seul suffit : c'est lui qui porte `--_dwc-bottom-clearance`.
  await repo(
    {
      'package.json': { name: 'miss-x' },
      'src/App.tsx': '<BottomNav items={items} />',
      'src/styles.css':
        "@import '@mister-guiiug/dev-pwa-config/components/bottom-nav.css';\n.bottom-nav { position: fixed; }",
    },
    root => {
      assert.ok(ids(diagnose(root), 'défaut').includes('bottom-nav-muette'));
    }
  );

  // La MÊME feuille, avec la déclaration : le socle voit la barre, le
  // dégagement existe, il n'y a rien à dire. C'est aussi l'état de
  // mister-settle et du squelette, qui collent la barre ET le déclarent.
  await repo(
    {
      'package.json': { name: 'miss-x' },
      'src/App.tsx': '<BottomNav placement="fixed" items={items} />',
      'src/styles.css': `@import '@mister-guiiug/dev-pwa-config/components.css';
.bottom-nav { position: fixed; bottom: 0; }`,
    },
    root => {
      assert.ok(!ids(diagnose(root)).includes('bottom-nav-muette'));
    }
  );

  // Une barre DANS LE FLUX ne pose aucun problème de dégagement : quatre apps
  // du parc sont dans ce cas et n'ont rien à corriger.
  await repo(
    {
      'package.json': { name: 'miss-x' },
      'src/App.tsx': '<BottomNav items={items} />',
      'src/styles.css': `@import '@mister-guiiug/dev-pwa-config/components.css';
.bottom-nav { display: flex; }`,
    },
    root => {
      assert.ok(!ids(diagnose(root)).includes('bottom-nav-muette'));
    }
  );

  // `sticky` NON PLUS, et c'est la distinction qui compte : une barre collante
  // réserve sa hauteur dans le flux, là où une barre fixe la retire. Le
  // dégagement du socle la compterait deux fois. C'est miss-genius, relevé le
  // 16/09/2026 — la première écriture de ce contrôle le flaguait à tort.
  await repo(
    {
      'package.json': { name: 'miss-x' },
      'src/App.tsx': '<BottomNav items={items} />',
      'src/styles.css': `@import '@mister-guiiug/dev-pwa-config/components.css';
[data-dwc='bottom-nav'] { position: sticky; bottom: 0; z-index: 30; }`,
    },
    root => {
      assert.ok(!ids(diagnose(root)).includes('bottom-nav-muette'));
    }
  );

  // Un `position: fixed` VOISIN n'est pas celui de la barre : l'en-tête collé
  // est la composition la plus courante du parc, et l'attribuer à la barre
  // ferait sortir le défaut sur des apps saines.
  await repo(
    {
      'package.json': { name: 'miss-x' },
      'src/App.tsx': '<BottomNav items={items} />',
      'src/styles.css': `@import '@mister-guiiug/dev-pwa-config/components.css';
.bottom-nav { display: flex; }
.header { position: fixed; top: 0; }`,
    },
    root => {
      assert.ok(!ids(diagnose(root)).includes('bottom-nav-muette'));
    }
  );

  // Et un COMMENTAIRE qui raconte le défaut ne l'est pas — la règle du parc
  // depuis le 05/09/2026, ici des deux côtés : la source ET la feuille.
  await repo(
    {
      'package.json': { name: 'miss-x' },
      'src/App.tsx':
        '// <BottomNav /> sans placement collerait la barre en muet\nexport const rien = 1;',
      'src/styles.css': `@import '@mister-guiiug/dev-pwa-config/components.css';
/* ne jamais écrire .bottom-nav { position: fixed } ici */
.x { color: red; }`,
    },
    root => {
      assert.ok(!ids(diagnose(root)).includes('bottom-nav-muette'));
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

/* ── « Signaler un problème » mène-t-il quelque part ? ─────────────────────
 *
 * `miss-supatool` affichait le lien le 06/09/2026 et
 * `…/miss-supatool/issues/new?template=bug.yml` répondait 404 : ses issues
 * sont désactivées (`miss-ticket-pwa` aussi). Un canal de retour mort est pire
 * que pas de canal — l'utilisateur clique et se cogne.
 *
 * Les trois cas qui comptent : le cassé, le sain, et LE SILENCE quand
 * l'information n'est pas disponible.
 * ────────────────────────────────────────────────────────────────────────── */

/** Un dépôt qui affiche « Signaler un problème » depuis son écran d'accueil. */
const AVEC_SIGNALEMENT = {
  'package.json': { name: 'miss-x' },
  'src/screens/Home.tsx':
    "import { AppFooter } from '@mister-guiiug/dev-pwa-config/react';\n" +
    'export function Home() {\n' +
    '  return <AppFooter repoUrl={REPO_URL} issues />;\n' +
    '}',
};

test('le lien de signalement sur un dépôt aux issues fermées est un DÉFAUT', async () => {
  await repo(AVEC_SIGNALEMENT, root => {
    const report = diagnose(root, {
      hasIssues: false,
      repo: 'mister-guiiug/miss-supatool',
    });
    const trouve = report.findings.find(f => f.id === 'issues-desactivees');
    assert.ok(trouve, 'le lien mort passe inaperçu');
    assert.equal(
      trouve.level,
      'défaut',
      'quelqu’un clique et se cogne : ce n’est pas une dette'
    );
    assert.match(trouve.message, /miss-supatool/, 'le message dit quel dépôt');
    assert.match(trouve.fix, /Issues/);
  });
});

test('issues ouvertes : le lien mène quelque part, rien à dire', async () => {
  await repo(AVEC_SIGNALEMENT, root => {
    assert.ok(
      !ids(diagnose(root, { hasIssues: true, repo: 'o/r' })).includes(
        'issues-desactivees'
      )
    );
  });
});

test('sans réponse de GitHub, le contrôle se TAIT au lieu d’accuser', async () => {
  // Hors CI, sans jeton, sans réseau, sur un dépôt qu'on n'a pas su nommer :
  // `hasIssues` vaut `null`. L'absence de preuve n'est pas la preuve du
  // défaut — c'est la règle d'`escapesSite`, qui refuse d'accuser sur un
  // préfixe inconnu, et le contraire du repli `href.startsWith(null)` qui
  // faisait de tout asset absolu un défaut.
  await repo(AVEC_SIGNALEMENT, async root => {
    for (const faits of [
      undefined,
      {},
      { hasIssues: null },
      { hasIssues: undefined, repo: 'o/r' },
    ]) {
      assert.ok(
        !ids(diagnose(root, faits)).includes('issues-desactivees'),
        `verdict rendu sur ${JSON.stringify(faits)} : le contrôle a deviné`
      );
    }
    // Et par le bin : `--no-github` ne consulte rien et ne conclut rien.
    assert.equal(await run(['--dir', root, '--no-github', '--json']), 0);
  });
});

test('pas de lien de signalement : les issues fermées ne regardent personne', async () => {
  // Quinze apps sur vingt n'affichent pas encore le lien. Leur reprocher un
  // réglage de dépôt sans conséquence visible serait du bruit.
  await repo(
    {
      'package.json': { name: 'miss-x' },
      'src/screens/Home.tsx':
        "import { AppFooter } from '@mister-guiiug/dev-pwa-config/react';\n" +
        'export const Home = () => <AppFooter repoUrl={REPO_URL} />;',
    },
    root => {
      assert.ok(
        !ids(diagnose(root, { hasIssues: false, repo: 'o/r' })).includes(
          'issues-desactivees'
        )
      );
    }
  );
});

test('porteSignalement lit les deux formes, et jamais un commentaire', () => {
  // La prop du socle, l'appel direct d'un pied de page maison — et le geste
  // que le docteur lui-même recommande, recopié en commentaire : un
  // diagnostic qui punit celui qui documente pousse à ne rien documenter.
  const oui = [
    '<AppFooter repoUrl={R} issues />',
    '<AppFooter\n  repoUrl={R}\n  issues={{ template: "bug.yml" }}\n/>',
    // Un `>` dans une prop ne ferme pas la balise : sans lecture à
    // profondeur, `issues` tomberait hors de la fenêtre lue.
    '<AppFooter onClick={() => open()} repoUrl={R} issues />',
    'const url = currentIssueReportUrl({ repoUrl: REPO_URL });',
    'href={issueReportUrl({ repoUrl })}',
  ];
  for (const text of oui) {
    assert.ok(
      porteSignalement([{ rel: 'src/a.tsx', text }]),
      `non vu : ${text}`
    );
  }

  const non = [
    '<AppFooter repoUrl={R} />',
    '// À faire : <AppFooter repoUrl={REPO_URL} issues />',
    '/* Le geste : <AppFooter repoUrl={REPO_URL} issues /> */',
    '<AppFooter repoUrl={R} /> {/* pas de issues ici */}\n<Autre issues />',
  ];
  for (const text of non) {
    assert.ok(
      !porteSignalement([{ rel: 'src/a.tsx', text }]),
      `vu à tort : ${text}`
    );
  }

  // Les tests d'une app parlent de tout, y compris de ce qu'elle n'a pas.
  assert.ok(
    !porteSignalement([
      { rel: 'src/a.test.tsx', text: '<AppFooter repoUrl={R} issues />' },
    ])
  );
});

test('depotGitHub ne devine pas : catalogue, package.json, puis la copie de travail', () => {
  const ici = resolve('/tmp/une-app');

  // 1 — Le catalogue de la famille tient l'URL de chaque dépôt.
  assert.equal(
    depotGitHub(ici, { name: 'miss-dice' }, {}),
    'mister-guiiug/miss-dice'
  );

  // 2 — Sinon `repository`, sous ses deux formes, `.git` retiré.
  assert.equal(
    depotGitHub(ici, { name: 'hors-parc', repository: 'github:o/r' }, {}),
    'o/r'
  );
  assert.equal(
    depotGitHub(
      ici,
      {
        name: 'hors-parc',
        repository: { url: 'git+https://github.com/o/r.git' },
      },
      {}
    ),
    'o/r'
  );

  // 3 — `GITHUB_REPOSITORY` SEULEMENT si le dossier diagnostiqué est bien la
  //     copie de travail du run : sinon un `--dir /tmp/…` lancé depuis la CI
  //     d'un autre dépôt jugerait le mauvais dépôt, sans jamais le dire.
  const env = { GITHUB_WORKSPACE: ici, GITHUB_REPOSITORY: 'o/ci' };
  assert.equal(depotGitHub(ici, { name: 'hors-parc' }, env), 'o/ci');
  assert.equal(
    depotGitHub(resolve('/tmp/ailleurs'), { name: 'hors-parc' }, env),
    null,
    'le dépôt du run a été attribué à un autre dossier'
  );
  assert.equal(depotGitHub(ici, { name: 'hors-parc' }, {}), null);
});

test('issuesActivees rend null sur tout ce qui n’est pas une réponse claire', async () => {
  const reponse = (ok, body) => async () => ({
    ok,
    json: async () => body,
  });

  assert.equal(
    await issuesActivees('o/r', {
      token: 'jeton',
      fetch: reponse(true, { has_issues: false }),
    }),
    false
  );
  assert.equal(
    await issuesActivees('o/r', {
      token: 'jeton',
      fetch: reponse(true, { has_issues: true }),
    }),
    true
  );

  // Tout le reste vaut « je ne sais pas », JAMAIS « c'est faux ».
  const muets = [
    { token: undefined, fetch: reponse(true, { has_issues: false }) },
    { token: 'jeton', fetch: reponse(false, {}) },
    { token: 'jeton', fetch: reponse(true, {}) },
    { token: 'jeton', fetch: reponse(true, { has_issues: 'non' }) },
    {
      token: 'jeton',
      fetch: async () => {
        throw new Error('getaddrinfo ENOTFOUND api.github.com');
      },
    },
  ];
  for (const options of muets) {
    assert.equal(await issuesActivees('o/r', options), null);
  }
  assert.equal(await issuesActivees(null, { token: 'jeton' }), null);
  // Un slug qui n'en est pas un ne part pas dans une URL.
  assert.equal(
    await issuesActivees('o/r?x=1', {
      token: 'jeton',
      fetch: reponse(true, { has_issues: false }),
    }),
    null
  );
});

test('faitsDepot ne consulte rien hors ligne, et rend le dépôt qu’il a nommé', async () => {
  await repo(
    { 'package.json': { name: 'hors-parc', repository: 'github:o/r' } },
    async root => {
      const hors = await faitsDepot(resolve(root), { offline: true, env: {} });
      assert.deepEqual(hors, { repo: 'o/r', hasIssues: null });

      const sansJeton = await faitsDepot(resolve(root), {
        env: {},
        fetch: async () => {
          throw new Error('le réseau ne devait pas être appelé');
        },
      });
      assert.deepEqual(sansJeton, { repo: 'o/r', hasIssues: null });
    }
  );
});

/* ── Le registre : quatre familles, un catalogue, deux filtres ─────────── */

/**
 * `diagnose()` faisait 617 lignes d'un seul tenant. Les tests ci-dessus n'ont
 * pas changé d'une ligne au découpage — c'est eux qui prouvent que le
 * comportement est identique. Ceux qui suivent gardent ce que le découpage
 * APPORTE, et qui n'existait pas : des règles nommées, jouables famille par
 * famille, et un catalogue qui ne peut pas mentir.
 */
test('le catalogue nomme exactement ce que les familles émettent', async () => {
  const { CATALOGUE, FAMILLES } = await import('../scripts/pwa-doctor.mjs');
  const source = readFileSync(
    new URL('../scripts/pwa-doctor.mjs', import.meta.url),
    'utf8'
  );

  for (const { nom, regles } of FAMILLES) {
    const debut = source.indexOf(`export function ${regles.name}(ctx, api) {`);
    assert.ok(debut > 0, `famille ${nom} introuvable dans la source`);
    const suite = source.indexOf('\nexport function ', debut + 10);
    const corps = source.slice(debut, suite > 0 ? suite : undefined);

    const emis = [];
    for (const m of corps.matchAll(
      /\b(defaut|dette|info)\(\s*'([a-z0-9-]+)'/g
    )) {
      if (!emis.includes(m[2])) emis.push(m[2]);
    }
    const catalogues = CATALOGUE.filter(r => r.famille === nom).map(r => r.id);
    assert.deepEqual(
      catalogues,
      emis,
      `famille ${nom} : le catalogue a divergé de ce qu'elle émet`
    );
  }
});

test('chaque famille se joue seule, sur le contexte lu une fois', async () => {
  const { contexteDepot, journal, reglesDepot, reglesWorkflows } =
    await import('../scripts/pwa-doctor.mjs');
  await repo({ 'package.json': { name: 'vide' } }, async root => {
    const ctx = contexteDepot(root);
    const seul = journal(ctx.pkg);
    reglesDepot(ctx, seul.api);
    const ids = seul.findings.map(f => f.id);
    assert.ok(ids.includes('editorconfig'), 'la famille dépôt doit parler');
    assert.ok(
      !ids.includes('workflows'),
      'et ne rien dire de ce qui ne la regarde pas'
    );

    // La suivante, sur le MÊME contexte : rien n'est relu sur le disque.
    const autre = journal(ctx.pkg);
    reglesWorkflows(ctx, autre.api);
    assert.ok(autre.findings.map(f => f.id).includes('workflows'));
  });
});

test('--only restreint, --skip écarte, et ni l’un ni l’autre n’invente', async () => {
  await repo({ 'package.json': { name: 'vide' } }, async root => {
    const tout = diagnose(root).findings.map(f => f.id);
    assert.ok(tout.length > 5);

    const un = diagnose(root, {}, { only: ['nvmrc'] });
    assert.deepEqual(
      un.findings.map(f => f.id),
      ['nvmrc'],
      '`--only` doit tout écarter sauf ce qu’il nomme'
    );

    const sans = diagnose(root, {}, { skip: ['nvmrc', 'editorconfig'] });
    const ids = sans.findings.map(f => f.id);
    assert.ok(!ids.includes('nvmrc') && !ids.includes('editorconfig'));
    assert.equal(ids.length, tout.length - 2, 'rien d’autre ne doit bouger');

    // Le build reste rapporté même si toutes ses règles sont écartées : c'est
    // un fait sur le dépôt, pas un constat.
    assert.equal(diagnose(root, {}, { only: ['nvmrc'] }).build, false);
  });
});

test('un identifiant inconnu dans --only est une erreur, pas un rapport vide', async () => {
  await repo({ 'package.json': { name: 'vide' } }, async root => {
    const erreurs = [];
    const console_error = console.error;
    console.error = m => erreurs.push(String(m));
    try {
      const code = await run(['--dir', root, '--no-github', '--only', 'nvmcr']);
      assert.equal(code, 2, 'un filtre qui ne filtre rien doit se voir');
      assert.match(erreurs.join('\n'), /identifiant inconnu.*nvmcr/s);
    } finally {
      console.error = console_error;
    }
  });
});

test('--regles rend le catalogue sans lire aucun dépôt', async () => {
  const { CATALOGUE } = await import('../scripts/pwa-doctor.mjs');
  const sorties = [];
  const console_log = console.log;
  console.log = m => sorties.push(String(m));
  try {
    // `--dir` désigne exprès un dossier qui n'existe pas : s'il était lu, la
    // commande sortirait en 2.
    const code = await run(['--regles', '--dir', '/nulle-part-du-tout']);
    assert.equal(code, 0);
    const texte = sorties.join('\n');
    assert.match(texte, new RegExp(`${CATALOGUE.length} contrôles`));
    for (const famille of ['dépôt', 'workflows', 'source', 'build']) {
      assert.match(texte, new RegExp(`── ${famille}`));
    }
    assert.match(texte, /pwaDoctor/, 'le geste du refus doit être rappelé');
  } finally {
    console.log = console_log;
  }
});

test('le conseil « pas de .nvmrc » nomme la version que CE dépôt épingle', async () => {
  // LE PIÈGE QUE CE TEST FERME. Le numéro est figé dans `pwa-doctor.mjs` —
  // il le doit, le docteur tourne chez l'app et n'a pas ce dépôt sous la
  // main. Mais figé sans garde, il dérive : `v4` est resté écrit en dur dans
  // le docteur pendant toute la 5.0.0, à réclamer un majeur périmé, et
  // personne ne l'a vu avant qu'un dépôt passe au suivant. Ici la source est
  // le `.nvmrc` du dépôt : relever l'un sans l'autre fait rougir la CI.
  await repo({ 'package.json': { name: 'miss-sans-nvmrc' } }, async root => {
    const conseil = diagnose(root).findings.find(f => f.id === 'nvmrc');
    assert.ok(conseil, 'la dette nvmrc a disparu');
    assert.ok(
      conseil.fix.includes(NODE_EPINGLE),
      `le docteur conseille « ${conseil.fix} » alors que .nvmrc dit « ${NODE_EPINGLE} »`
    );
  });
});
