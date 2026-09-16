// Le budget de bundle : deux mesures (total gzip, chunk principal brut), un
// budget lu dans package.json, tous les dépassements d'un coup.
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
  checkBudget,
  measureBundle,
  measurePreload,
  proposeBudget,
  readBudget,
  writeBudget,
} from '../scripts/check-bundle-budget.mjs';

test('proposeBudget : la mesure plus dix pour cent, seulement quand c’est plus bas', () => {
  // Un budget posé un jour de surpoids (bac-sable 675, carbook 505) laisse
  // toute la place de regrossir : le cliquet le ramène vers la mesure.
  const measure = { totalGzipKb: 100, files: [] };
  assert.deepEqual(proposeBudget(measure, { totalGzipKb: 200 }), [
    { key: 'totalGzipKb', measured: 100, current: 200, proposed: 110 },
  ]);
  // À dix pour cent près, rien à dire : 110 n'est pas plus bas que 105.
  assert.deepEqual(proposeBudget(measure, { totalGzipKb: 105 }), []);
  // Le chunk principal suit la même règle, sur son poids brut.
  const main = { name: 'index-abc.js', rawKb: 300 };
  assert.deepEqual(
    proposeBudget(measure, { totalGzipKb: 100, mainChunkKb: 420 }, main),
    [{ key: 'mainChunkKb', measured: 300, current: 420, proposed: 330 }]
  );
  // Sans borne écrite, pas de proposition : le cliquet resserre, il ne pose pas.
  assert.deepEqual(proposeBudget(measure, {}, main), []);
});

test('writeBudget n’écrit que les clés proposées, en gardant le reste', async () => {
  const root = mkdtempSync(join(tmpdir(), 'dwc-ratchet-'));
  try {
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify(
        {
          name: 'miss-x',
          bundleBudget: { totalGzipKb: 200, mainChunk: 'app-' },
        },
        null,
        2
      )
    );
    writeBudget(root, [
      { key: 'totalGzipKb', measured: 100, current: 200, proposed: 110 },
    ]);
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    assert.deepEqual(pkg.bundleBudget, { totalGzipKb: 110, mainChunk: 'app-' });
    assert.equal(pkg.name, 'miss-x');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/** Un dist/assets factice : un chunk principal et un vendor, aux poids voulus. */
async function withDist(run) {
  const root = mkdtempSync(join(tmpdir(), 'dwc-budget-'));
  const dir = join(root, 'dist', 'assets');
  mkdirSync(dir, { recursive: true });
  // Du texte peu compressible (aléatoire) pour que gzip garde un poids lisible.
  const noise = size =>
    Array.from({ length: size }, () =>
      String.fromCharCode(33 + Math.floor(Math.random() * 90))
    ).join('');
  writeFileSync(join(dir, 'index-Ab12Cd34.js'), noise(40 * 1024));
  writeFileSync(join(dir, 'vendor-Ef56Gh78.js'), noise(20 * 1024));
  writeFileSync(join(dir, 'styles-Ij90.css'), 'body{}');
  try {
    await run(root, dir);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('measureBundle : le JS seul, du plus lourd au plus léger, gzip et brut', async () => {
  await withDist(async (_root, dir) => {
    const m = measureBundle(dir);
    assert.deepEqual(
      m.files.map(f => f.name),
      ['index-Ab12Cd34.js', 'vendor-Ef56Gh78.js'],
      'le CSS ne compte pas, le plus lourd d’abord'
    );
    assert.ok(m.files[0].rawKb > 39 && m.files[0].rawKb < 41);
    assert.ok(m.files[0].gzipKb > 0 && m.files[0].gzipKb <= m.files[0].rawKb);
    assert.ok(
      Math.abs(m.totalGzipKb - (m.files[0].gzipKb + m.files[1].gzipKb)) < 1e-9
    );
  });
});

test('measureBundle : sans dossier, une erreur qui dit de builder', () => {
  assert.throws(
    () => measureBundle('/nulle/part/dist/assets'),
    /lancez le build/
  );
});

test('checkBudget : les deux bornes, tous les dépassements d’un coup', async () => {
  await withDist(async (_root, dir) => {
    const m = measureBundle(dir);
    // Sous le budget : rien.
    assert.deepEqual(
      checkBudget(m, { totalGzipKb: 1000, mainChunkKb: 100 }).problems,
      []
    );
    // Au-dessus des deux : deux problèmes, pas un.
    const both = checkBudget(m, { totalGzipKb: 1, mainChunkKb: 1 });
    assert.equal(both.ok, false);
    assert.equal(both.problems.length, 2);
    assert.match(both.problems[0], /total gzip .* > budget 1 kB/);
    assert.match(both.problems[1], /index-Ab12Cd34\.js : 40 kB > budget 1 kB/);
    // Le chunk principal se reconnaît par son préfixe, redéfinissable.
    assert.equal(
      checkBudget(m, { mainChunkKb: 100, mainChunk: 'vendor-' }).main.name,
      'vendor-Ef56Gh78.js'
    );
    assert.match(
      checkBudget(m, { mainChunkKb: 100, mainChunk: 'app-' }).problems[0],
      /chunk principal introuvable/
    );
    // Aucune borne : ce n'est pas un succès silencieux.
    assert.match(checkBudget(m, {}).problems[0], /aucune borne/);
  });
});

test('readBudget : package.json d’abord, la ligne de commande par-dessus', async () => {
  await withDist(async root => {
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({ bundleBudget: { totalGzipKb: 255, mainChunk: 'app-' } })
    );
    assert.deepEqual(readBudget(root), {
      dir: 'dist/assets',
      totalGzipKb: 255,
      mainChunkKb: undefined,
      mainChunk: 'app-',
      preloadGzipKb: undefined,
      // Le document se déduit du dossier des assets : `dist/assets` est dans
      // `dist`, où Vite écrit `index.html`.
      html: join('dist', 'assets', '..', 'index.html'),
    });
    const cli = readBudget(root, [
      '--main-chunk-kb',
      '300',
      '--dir',
      'build/js',
    ]);
    assert.equal(cli.mainChunkKb, 300);
    assert.equal(cli.dir, 'build/js');
    assert.equal(cli.totalGzipKb, 255, 'le package.json reste pour le reste');
    // `--dir` déplace le document avec lui : sans ça, un dossier d'assets
    // ailleurs ferait lire un `index.html` qui n'est pas le sien.
    assert.equal(cli.html, join('build', 'js', '..', 'index.html'));
  });
});

// ── preloadGzipKb : ce que le document va réellement chercher ────────────────

/** Un `dist` jetable : des chunks, et un index.html qui n'en référence qu'une
 *  partie — la situation exacte que les deux premières bornes ne voyaient pas. */
function distJetable({
  base = '',
  referencer = ['app.js', 'app.css'],
  chunks,
} = {}) {
  const root = mkdtempSync(join(tmpdir(), 'dwc-preload-'));
  mkdirSync(join(root, 'assets'));
  for (const [nom, taille] of Object.entries(chunks)) {
    writeFileSync(join(root, 'assets', nom), 'x'.repeat(taille));
  }
  const liens = referencer
    .map(n =>
      n.endsWith('.css')
        ? `<link rel="stylesheet" href="${base}assets/${n}">`
        : `<script type="module" src="${base}assets/${n}"></script>`
    )
    .join('');
  writeFileSync(
    join(root, 'index.html'),
    `<!doctype html><html><head>${liens}</head></html>`
  );
  return root;
}

test('measurePreload ne compte QUE ce qu’index.html référence', () => {
  // LE DÉFAUT QUE CETTE BORNE REND VISIBLE : `sentry.js` pèse plus que tout le
  // reste, mais n'est tiré que par un `import()`. Le total gzip le compte, la
  // borne du chunk principal l'ignore — aucune des deux ne dit s'il est sur le
  // chemin critique. Celle-ci le dit.
  const root = distJetable({
    chunks: { 'app.js': 20_000, 'app.css': 4_000, 'sentry.js': 400_000 },
  });
  try {
    const preload = measurePreload(join(root, 'index.html'));
    assert.deepEqual(preload.files.map(f => f.name).sort(), [
      'app.css',
      'app.js',
    ]);
    assert.deepEqual(preload.manquants, []);

    // Et la contre-épreuve : le total, lui, embarque bien les 400 ko.
    const total = measureBundle(join(root, 'assets'));
    assert.ok(
      total.totalGzipKb > preload.gzipKb * 5,
      'le total doit être très au-dessus du préchargé'
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('une référence préfixée du chemin de base se résout quand même', () => {
  // GitHub Pages sert sous `/<dépôt>/` : `index.html` porte alors
  // `/miss-uwh/assets/app.js`, qui n'existe pas tel quel sur le disque.
  const root = distJetable({
    base: '/miss-uwh/',
    chunks: { 'app.js': 20_000, 'app.css': 4_000 },
  });
  try {
    const preload = measurePreload(join(root, 'index.html'));
    assert.deepEqual(preload.manquants, []);
    assert.equal(preload.files.length, 2);
    assert.ok(preload.gzipKb > 0);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('un fichier référencé mais introuvable FAIT ÉCHOUER, il ne vaut pas zéro', () => {
  // Sans ce refus, un changement de chemin de base ferait tomber la mesure à
  // presque rien et la borne passerait au vert en annonçant l'inverse du vrai.
  const root = distJetable({
    referencer: ['app.js', 'disparu.js'],
    chunks: { 'app.js': 20_000 },
  });
  try {
    const preload = measurePreload(join(root, 'index.html'));
    assert.deepEqual(preload.manquants, ['assets/disparu.js']);

    const verdict = checkBudget(
      { totalGzipKb: 0, files: [] },
      { preloadGzipKb: 999 },
      preload
    );
    assert.equal(verdict.ok, false);
    assert.match(verdict.problems.join(' '), /introuvables/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('checkBudget : la borne du préchargé tranche, et le dit séparément', () => {
  const preload = { files: [], manquants: [], gzipKb: 230 };
  const measure = { totalGzipKb: 444, files: [] };

  // Le total passe, le préchargé aussi : rien à signaler.
  assert.equal(
    checkBudget(measure, { totalGzipKb: 450, preloadGzipKb: 240 }, preload).ok,
    true
  );

  // Le préchargé dépasse SEUL : c'est bien lui qui est nommé.
  const verdict = checkBudget(
    measure,
    { totalGzipKb: 450, preloadGzipKb: 220 },
    preload
  );
  assert.equal(verdict.ok, false);
  assert.equal(verdict.problems.length, 1);
  assert.match(verdict.problems[0], /préchargé 230\.0 kB > budget 220 kB/);

  // Bornée sans mesure : on refuse plutôt que de laisser passer en silence.
  assert.match(
    checkBudget(measure, { preloadGzipKb: 220 }, null).problems.join(' '),
    /n’a pas été lu/
  );
});

test('le cliquet resserre aussi le préchargé', () => {
  const measure = { totalGzipKb: 100, files: [] };
  const preload = { files: [], manquants: [], gzipKb: 200 };
  assert.deepEqual(
    proposeBudget(measure, { preloadGzipKb: 300 }, null, { preload }),
    [{ key: 'preloadGzipKb', measured: 200, current: 300, proposed: 220 }]
  );
  // Sans mesure du préchargé, rien à proposer pour lui.
  assert.deepEqual(proposeBudget(measure, { preloadGzipKb: 300 }), []);
});
