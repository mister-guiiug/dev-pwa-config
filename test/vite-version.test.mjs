/**
 * Le plugin qui porte la version jusqu'au navigateur.
 *
 * TROIS SORTIES, TROIS FAÇONS DE LES CASSER :
 *   1. `define` sans `JSON.stringify` produirait un identifiant nu — le défaut
 *      classique de cette option, qui casse le build au lieu d'injecter ;
 *   2. le script inline injecté APRÈS `cspPlugin` serait bloqué en production
 *      faute de hachage : il doit donc sortir du `transformIndexHtml` de CE
 *      plugin, avant l'autre ;
 *   3. `version.json` écrit pendant `vite dev` polluerait `dist/` d'un build
 *      qui n'a pas eu lieu.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  readPackageVersion,
  resolveBuildInfo,
  versionPlugin,
} from '../vite-version.js';
import { BUILD_INFO_GLOBAL, VERSION_MANIFEST } from '../version.js';

/**
 * `await` obligatoire : une première version rendait `run(root)` sans
 * l'attendre, et le `finally` effaçait le dossier AVANT que le corps asynchrone
 * n'ait relu son fichier. Le test échouait sur un ENOENT qui n'accusait pas le
 * bon coupable.
 */
async function withTempRoot(run) {
  const root = mkdtempSync(join(tmpdir(), 'dwc-version-'));
  try {
    return await run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('readPackageVersion lit le package.json de l’app, ou rend ""', async () => {
  await withTempRoot(root => {
    assert.equal(
      readPackageVersion(root),
      '',
      'pas de package.json : pas d’échec'
    );
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ version: '1.2.3' })
    );
    assert.equal(readPackageVersion(root), '1.2.3');
    writeFileSync(join(root, 'package.json'), '{ pas du json');
    assert.equal(
      readPackageVersion(root),
      '',
      'un JSON cassé ne doit pas faire échouer un build'
    );
  });
});

test('resolveBuildInfo : option, puis environnement, puis package.json', async () => {
  await withTempRoot(root => {
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ version: '1.2.3' })
    );

    assert.equal(resolveBuildInfo({ root, env: {} }).version, '1.2.3');
    assert.equal(
      resolveBuildInfo({ root, env: { VITE_APP_VERSION: '9.9.9' } }).version,
      '9.9.9'
    );
    assert.equal(
      resolveBuildInfo({
        root,
        version: '7.7.7',
        env: { VITE_APP_VERSION: '9.9.9' },
      }).version,
      '7.7.7'
    );

    // Le SHA : `VITE_COMMIT_SHA` d'abord, `GITHUB_SHA` ensuite, jamais inventé.
    assert.equal(resolveBuildInfo({ root, env: {} }).commit, '');
    assert.equal(
      resolveBuildInfo({ root, env: { GITHUB_SHA: 'abc' } }).commit,
      'abc'
    );
    assert.equal(
      resolveBuildInfo({
        root,
        env: { GITHUB_SHA: 'abc', VITE_COMMIT_SHA: 'def' },
      }).commit,
      'def'
    );

    // `buildTime` forcé : un build reproductible n'a pas de « maintenant ».
    const fixed = resolveBuildInfo({
      root,
      buildTime: '2026-08-26T00:00:00.000Z',
    });
    assert.equal(fixed.buildTime, '2026-08-26T00:00:00.000Z');
    assert.match(
      resolveBuildInfo({ root, env: {} }).buildTime,
      /^\d{4}-\d{2}-\d{2}T/
    );
  });
});

test('define pose des littéraux, pas des identifiants nus', () => {
  const plugin = versionPlugin({
    version: '3.13.0',
    commit: 'abc',
    buildTime: '2026-08-26T00:00:00.000Z',
  });
  const { define } = plugin.config();
  assert.equal(define.__APP_VERSION__, '"3.13.0"');
  assert.equal(define.__APP_BUILD_TIME__, '"2026-08-26T00:00:00.000Z"');
  assert.equal(define.__APP_COMMIT__, '"abc"');

  assert.deepEqual(
    versionPlugin({ version: '1.0.0', define: false }).config(),
    {}
  );
});

test('le HTML reçoit le global, dans le head', () => {
  const plugin = versionPlugin({
    version: '3.13.0',
    commit: 'abc',
    buildTime: 'hier',
  });
  const html = plugin.transformIndexHtml(
    '<html><head><title>x</title></head><body></body></html>'
  );
  assert.match(html, new RegExp(`<script>globalThis\\.${BUILD_INFO_GLOBAL}=`));
  assert.ok(
    html.indexOf(BUILD_INFO_GLOBAL) < html.indexOf('</head>'),
    'le script doit être DANS le head'
  );

  // Une page sans `</head>` reste servie : mieux vaut un script en tête de
  // document qu'un build qui échoue.
  assert.match(
    versionPlugin({ version: '1.0.0' }).transformIndexHtml('<div/>'),
    /^<script>/
  );

  assert.equal(
    versionPlugin({ version: '1.0.0', inject: false }).transformIndexHtml(
      '<html></html>'
    ),
    '<html></html>'
  );
});

test('version.json n’est écrit qu’au build, et pas en dev', async () => {
  await withTempRoot(async root => {
    const outDir = join(root, 'dist');

    const dev = versionPlugin({ version: '3.13.0', outDir });
    dev.configResolved({ command: 'serve', build: { outDir } });
    await dev.closeBundle();
    assert.throws(() => readFileSync(join(outDir, VERSION_MANIFEST)), /ENOENT/);

    const build = versionPlugin({
      version: '3.13.0',
      commit: 'abc',
      buildTime: '2026-08-26T00:00:00.000Z',
      outDir,
    });
    build.configResolved({ command: 'build', build: { outDir } });
    await build.closeBundle();

    const written = JSON.parse(
      readFileSync(join(outDir, VERSION_MANIFEST), 'utf8')
    );
    assert.deepEqual(written, {
      version: '3.13.0',
      buildTime: '2026-08-26T00:00:00.000Z',
      commit: 'abc',
    });
  });
});

test('sans commit, le manifeste n’invente pas de champ', async () => {
  await withTempRoot(async root => {
    const outDir = join(root, 'dist');
    mkdirSync(outDir, { recursive: true });
    const plugin = versionPlugin({
      version: '1.0.0',
      commit: '',
      buildTime: '2026-08-26T00:00:00.000Z',
      outDir,
    });
    plugin.configResolved({ command: 'build', build: { outDir } });
    await plugin.closeBundle();
    const written = JSON.parse(
      readFileSync(join(outDir, VERSION_MANIFEST), 'utf8')
    );
    assert.deepEqual(Object.keys(written).sort(), ['buildTime', 'version']);
  });
});

test('le serveur de dev répond au manifeste, sans cache', () => {
  const plugin = versionPlugin({ version: '3.13.0', buildTime: 'hier' });
  let handler = null;
  plugin.configureServer({ middlewares: { use: fn => (handler = fn) } });
  assert.equal(typeof handler, 'function');

  const call = url => {
    const headers = {};
    let body = null;
    let nexted = false;
    handler(
      { url },
      { setHeader: (k, v) => (headers[k] = v), end: value => (body = value) },
      () => (nexted = true)
    );
    return { headers, body, nexted };
  };

  const hit = call(`/${VERSION_MANIFEST}`);
  assert.equal(hit.nexted, false);
  assert.equal(hit.headers['cache-control'], 'no-store');
  assert.equal(JSON.parse(hit.body).version, '3.13.0');
  // Base path et query : les deux formes réelles d'un sondage.
  assert.equal(
    JSON.parse(call(`/mister-family-map/${VERSION_MANIFEST}`).body).version,
    '3.13.0'
  );
  assert.equal(call(`/${VERSION_MANIFEST}?t=1`).nexted, false);

  assert.equal(
    call('/index.html').nexted,
    true,
    'le reste passe au middleware suivant'
  );
});

test('le précache workbox laisse version.json tranquille', async () => {
  const { pwaWorkbox } = await import('../vite-pwa.js');
  const workbox = pwaWorkbox({ id: 'mister-family-map' });
  assert.ok(
    workbox.globIgnores.includes(`**/${VERSION_MANIFEST}`),
    'précaché, le manifeste rendrait éternellement la version du build qui l’a figé'
  );
  // La valeur par défaut de workbox est reconduite, pas remplacée.
  assert.ok(workbox.globIgnores.includes('**/node_modules/**/*'));
});
