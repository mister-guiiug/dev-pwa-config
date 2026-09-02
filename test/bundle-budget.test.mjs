// Le budget de bundle : deux mesures (total gzip, chunk principal brut), un
// budget lu dans package.json, tous les dépassements d'un coup.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  checkBudget,
  measureBundle,
  readBudget,
} from '../scripts/check-bundle-budget.mjs';

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
  });
});
