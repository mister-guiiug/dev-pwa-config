/**
 * LES BINS TOURNENT-ILS QUAND ON NE LES APPELLE PAS PAR LEUR VRAI CHEMIN ?
 *
 * POURQUOI CE FICHIER EXISTE. Le 06/09/2026, quatre bins publiés se sont
 * révélés MUETS partout où la famille les lance vraiment : en CI, sous Linux.
 * `npx pwa-doctor` durait 0,31 s sans rien imprimer (mister-miss-koh, run
 * 34045499498) alors que `format()` imprime toujours, inconditionnellement,
 * une ligne de résumé. Le garde d'entrée comparait `import.meta.url` — que
 * Node résout en realpath — à `process.argv[1]`, que Node laisse sur le
 * chemin tapé. Or `npm` installe `node_modules/.bin/pwa-doctor` en lien
 * symbolique : les deux diffèrent, le garde est faux, le bin sort en silence
 * avec le code 0. Vingt dépôts avaient une étape de CI verte qui ne
 * contrôlait rien, et le contrôle `issues-desactivees` — qui n'a de sens
 * qu'en CI, seul endroit où un jeton lui permet de lire l'état du dépôt — ne
 * s'exécutait nulle part.
 *
 * CE QUE CE TEST GARDE. Pas le prédicat tout seul : le fait qu'un bin lancé
 * PAR UN CHEMIN QUI N'EST PAS SON REALPATH imprime exactement ce qu'il
 * imprime par son vrai chemin. C'est le seul énoncé qui aurait échoué avant
 * le correctif, et le socle s'est déjà fait mordre deux fois par des gardes
 * que personne n'exécutait (`pwa-doctor` lui-même jusqu'au 05/09/2026, la
 * spec `@a11y` qu'aucun filtre ne jouait).
 *
 * Chaque bin reçoit des arguments qui le font parler tout de suite et sans
 * rien toucher : un dossier introuvable, ou `--help`. Aucun réseau, aucun
 * navigateur, aucun psql.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  rmdirSync,
  symlinkSync,
  unlinkSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { estPointDEntree } from '../scripts/entree.mjs';

const SCRIPTS = fileURLToPath(new URL('../scripts/', import.meta.url));

/** Un dossier qui n'existe pas : tous les bins s'en plaignent immédiatement. */
const ABSENT = join(tmpdir(), 'dwc-dossier-qui-n-existe-pas');

const BINS = [
  { fichier: 'pwa-doctor.mjs', args: ['--dir', ABSENT], dit: /pwa-doctor/ },
  {
    fichier: 'check-bundle-budget.mjs',
    args: ['--dir', ABSENT],
    dit: /budget/,
  },
  { fichier: 'pwa-pgtap.mjs', args: ['--dir', ABSENT], dit: /pwa-pgtap/ },
  { fichier: 'pwa-screenshots.mjs', args: ['--help'], dit: /pwa-screenshots/ },
];

/**
 * Un chemin d'invocation qui désigne le script sans être son realpath.
 *
 * POSIX : le lien symbolique de fichier, exactement ce que `npm` pose dans
 * `node_modules/.bin`. Windows : le lien de fichier y demande un privilège,
 * on retombe sur une jonction de dossier — qui produit la même divergence
 * realpath / `argv[1]`, et c'est sous cette forme que le parc avait déjà vu
 * le symptôme, sans en comprendre la cause.
 *
 * Rend aussi de quoi défaire le lien SANS jamais traverser sa cible : la
 * jonction pointe sur les sources du paquet, qu'une suppression récursive
 * distraite emporterait.
 */
function cheminDetourne(fichier, bac) {
  const cible = join(SCRIPTS, fichier);
  const lien = join(bac, `lien-${fichier}`);
  try {
    symlinkSync(cible, lien, 'file');
    return { chemin: lien, defaire: () => unlinkSync(lien) };
  } catch (error) {
    if (process.platform !== 'win32') throw error;
    const dossier = join(bac, 'bin');
    if (!existsSync(dossier)) symlinkSync(SCRIPTS, dossier, 'junction');
    return {
      chemin: join(dossier, fichier),
      defaire: () => rmdirSync(dossier),
    };
  }
}

/** Lance un script Node et rend ce qu'il a dit, les deux flux confondus. */
function lance(chemin, args) {
  const r = spawnSync(process.execPath, [chemin, ...args], {
    cwd: tmpdir(),
    encoding: 'utf8',
  });
  return `${r.stdout}${r.stderr}`;
}

for (const bin of BINS) {
  test(`${bin.fichier} parle aussi derrière un lien`, () => {
    const bac = mkdtempSync(join(tmpdir(), 'dwc-entree-'));
    const detour = cheminDetourne(bin.fichier, bac);
    try {
      const parLeLien = lance(detour.chemin, bin.args);

      // Ce qu'aucun garde comparant des chemins bruts ne passait : avant le
      // correctif, le bin sortait ici sans avoir imprimé un seul octet.
      assert.notEqual(
        parLeLien.trim(),
        '',
        `${bin.fichier} n'a rien imprimé : le garde d'entrée l'a fait sortir en silence.`
      );
      assert.match(parLeLien, bin.dit);

      // Et il dit la MÊME chose que par son vrai chemin : un lien sur la
      // route ne change rien à ce que le bin fait.
      const parLeVraiChemin = lance(join(SCRIPTS, bin.fichier), bin.args);
      assert.equal(parLeLien, parLeVraiChemin);
    } finally {
      detour.defaire();
      rmSync(bac, { recursive: true, force: true });
    }
  });
}

test('estPointDEntree : le realpath décide, pas la façon de l’écrire', () => {
  const script = join(SCRIPTS, 'pwa-doctor.mjs');
  const url = new URL('../scripts/pwa-doctor.mjs', import.meta.url).href;
  const bac = mkdtempSync(join(tmpdir(), 'dwc-entree-'));
  const detour = cheminDetourne('pwa-doctor.mjs', bac);
  const sauvegarde = process.argv[1];
  try {
    process.argv[1] = script;
    assert.equal(estPointDEntree(url), true, 'le chemin réel');

    process.argv[1] = detour.chemin;
    assert.equal(estPointDEntree(url), true, 'à travers un lien');

    process.argv[1] = join(dirname(script), '..', 'scripts', basename(script));
    assert.equal(estPointDEntree(url), true, 'avec des segments `..`');

    process.argv[1] = join(SCRIPTS, 'pwa-pgtap.mjs');
    assert.equal(estPointDEntree(url), false, 'un autre fichier du paquet');

    process.argv[1] = ABSENT;
    assert.equal(
      estPointDEntree(url),
      false,
      'un chemin qui ne mène nulle part'
    );

    process.argv[1] = undefined;
    assert.equal(estPointDEntree(url), false, 'pas de programme lancé du tout');
  } finally {
    process.argv[1] = sauvegarde;
    detour.defaire();
    rmSync(bac, { recursive: true, force: true });
  }
});

test('aucun bin publié ne compare des chemins bruts', () => {
  // Balayer la carte `bin` plutôt que la liste ci-dessus : un bin ajouté
  // demain hériterait du piège en copiant son voisin, et personne ne
  // relancerait ce raisonnement.
  const pkg = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  );
  const bins = Object.values(pkg.bin);
  assert.ok(bins.length >= 5, 'la carte `bin` du paquet');

  for (const rel of bins) {
    const source = readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
    assert.doesNotMatch(
      source,
      /pathToFileURL\(process\.argv\[1\]\)/,
      `${rel} compare des chemins bruts : muet derrière le lien de node_modules/.bin`
    );
  }
});

test('le module partagé voyage avec le paquet', () => {
  // `files` énumère les fichiers un par un : un module oublié ici, et les
  // bins publiés s'arrêtent sur ERR_MODULE_NOT_FOUND chez les vingt apps.
  const pkg = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  );
  assert.ok(
    pkg.files.includes('scripts/entree.mjs'),
    '`scripts/entree.mjs` doit figurer dans `files`'
  );
});
