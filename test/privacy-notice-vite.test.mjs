// Le panneau de confidentialité lit l'environnement Vite QUAND L'APP NE LE LUI PASSE PAS.
//
// Ce n'est pas un test de la logique (privacy-notice.test.mjs s'en charge), c'est la
// preuve du fait sur lequel repose le défaut : dans un bundle construit par Vite, le
// `import.meta.env` du socle est bien l'objet de l'app, `VITE_*` compris. Sans ce fait,
// le panneau ne trouverait ni la clé ni les mentions, et ne rendrait rien dans les
// apps qui le montent sans `env`.
//
// React et son moteur de rendu sont assemblés DANS le bundle : un React chargé à côté
// serait une seconde instance, et les hooks du panneau y échoueraient. Le rendu se fait
// dans un processus à part, qui sort de lui-même : le moteur de rendu serveur de React
// laisse derrière lui de quoi garder Node en vie, et le fichier de test ne finirait pas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'vite';

const ICI = dirname(fileURLToPath(import.meta.url));
const SOCLE = join(ICI, '..');
const MODULE = join(SOCLE, 'react', 'privacy-notice.js').replace(/\\/g, '/');

async function rendreDansUnBundle(env) {
  const racine = mkdtempSync(join(tmpdir(), 'socle-privacy-env-'));
  try {
    writeFileSync(
      join(racine, 'entree.js'),
      [
        "import { createElement as h } from 'react';",
        "import { renderToStaticMarkup } from 'react-dom/server.browser';",
        `import { PrivacyNotice } from ${JSON.stringify(MODULE)};`,
        'export const rendre = () => renderToStaticMarkup(h(PrivacyNotice));',
      ].join('\n')
    );
    writeFileSync(
      join(racine, '.env'),
      Object.entries(env)
        .map(([k, v]) => `${k}=${v}`)
        .join('\n') + '\n'
    );
    const sortie = await build({
      root: racine,
      envDir: racine,
      configFile: false,
      logLevel: 'silent',
      // Le dossier temporaire n'a pas de `node_modules` : React vient du socle.
      resolve: {
        alias: {
          react: join(SOCLE, 'node_modules', 'react'),
          'react-dom': join(SOCLE, 'node_modules', 'react-dom'),
        },
      },
      define: { 'process.env.NODE_ENV': JSON.stringify('production') },
      build: {
        write: false,
        minify: false,
        lib: {
          entry: join(racine, 'entree.js'),
          formats: ['es'],
          fileName: 'entree',
        },
      },
    });
    const fichier = join(racine, 'sortie.mjs');
    writeFileSync(
      fichier,
      (Array.isArray(sortie) ? sortie[0] : sortie).output[0].code
    );
    const enfant = spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `const m = await import(${JSON.stringify(pathToFileURL(fichier).href)});
         process.stdout.write(m.rendre());
         process.exit(0);`,
      ],
      { encoding: 'utf8', timeout: 30_000 }
    );
    assert.equal(enfant.status, 0, enfant.stderr);
    return enfant.stdout;
  } finally {
    rmSync(racine, { recursive: true, force: true });
  }
}

test('dans un bundle Vite, le panneau trouve seul la clé et les mentions', async () => {
  const html = await rendreDansUnBundle({
    VITE_POSTHOG_KEY: 'phc_abcdefghijklmnopqrstuvwxyz0123456789',
    VITE_PRIVACY_CONTROLLER: 'Exploitant de test',
    VITE_PRIVACY_CONTACT: 'droits@exemple.test',
    VITE_PRIVACY_RETENTION_MONTHS: '12',
  });
  assert.match(html, /data-dwc="privacy-notice"/);
  assert.match(html, /PostHog/);
  assert.match(html, /Exploitant de test/);
  assert.match(html, /droits@exemple\.test/);
  assert.match(html, /\b12\b/);
});

test('dans un bundle Vite sans clé ni DSN, le panneau ne rend rien', async () => {
  const html = await rendreDansUnBundle({
    VITE_PRIVACY_CONTROLLER: 'Exploitant de test',
  });
  assert.equal(html, '');
});
