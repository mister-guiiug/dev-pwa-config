#!/usr/bin/env node
/**
 * LES EXPORTS MORTS D'UNE APP : déclarés, jamais cités ailleurs.
 *
 *   node scripts/dead-exports.mjs [--root <dossier>] [--all] [app…]
 *
 * POURQUOI CET OUTIL EXISTE. Le tri du 02/09/2026 a trouvé, en instruisant des
 * candidats à la promotion, trois cadavres que le balayage prenait pour des
 * doublons : `useLongPress` (molkky), `useAccessibility.tsx` (puzzle, carbook —
 * 414 lignes, vingt exports, zéro importateur). Personne ne les cherchait ; on
 * les a trouvés par accident. Cet outil les cherche.
 *
 * DEUX VERDICTS, parce qu'ils ne se traitent pas pareil :
 *
 *   - MORT : le nom n'apparaît nulle part ailleurs dans l'app, et pas même
 *     une seconde fois dans son fichier. Le code peut partir.
 *   - EXPORT SUPERFLU : le nom sert dans son fichier, mais aucun autre fichier
 *     ne l'importe. Le code reste ; le mot `export` peut partir — il trompe le
 *     lecteur sur la portée, et empêche l'outillage de le voir comme privé.
 *
 * CE QUI COMPTE COMME UNE CITATION : n'importe quelle occurrence du mot entier
 * dans un autre fichier de `src/`, tests compris — un utilitaire que seuls
 * les tests appellent n'est pas mort, c'est un utilitaire de test. Les points
 * d'entrée (`main.tsx`, `App.tsx`, le service worker) ne déclarent rien qu'on
 * puisse juger : personne ne les importe, c'est leur rôle.
 *
 * CE QUE L'OUTIL NE VOIT PAS. Un symbole nommé dans une chaîne (`lazy(() =>
 * import('./x'))` importe un fichier, pas un nom) ou consommé par un outil
 * externe (un `manifest`, un script de build) passera pour mort. Le verdict
 * se lit, il ne s'exécute pas.
 *
 * Non publié (absent de `files`) : outillage de développement du dépôt.
 */
import { readFileSync, statSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { FAMILY_APPS } from '../apps-catalog.js';
import { GENERATED, scanFile, walk } from './adoption-scan.mjs';

/** Personne ne les importe : c'est leur rôle. */
export const ENTRY_POINTS =
  /^src\/(main\.[jt]sx?|App\.[jt]sx|vite-env\.d\.ts|sw\.[jt]s|service-worker\.[jt]s)$/;

const escape = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Le verdict, à partir de fichiers déjà lus.
 *
 * @param {Array<{ rel: string, source: string }>} files Chemins relatifs à
 *   l'app (`src/…`), séparateur `/`.
 * @returns {{ total: number, dead: Array<{ file: string, name: string }>,
 *   unused: Array<{ file: string, name: string }> }}
 */
export function findDeadExports(files) {
  const corpus = files.map(f => ({
    ...f,
    test: GENERATED.test(basename(f.rel)),
  }));
  let total = 0;
  const dead = [];
  const unused = [];
  for (const file of corpus) {
    if (file.test || ENTRY_POINTS.test(file.rel)) continue;
    for (const name of scanFile(basename(file.rel), file.source).declares) {
      if (name === 'default' || name.length < 3) continue;
      total++;
      const word = new RegExp(`\\b${escape(name)}\\b`);
      if (corpus.some(other => other !== file && word.test(other.source))) {
        continue;
      }
      const own =
        (file.source.match(new RegExp(`\\b${escape(name)}\\b`, 'g')) ?? [])
          .length - 1;
      (own > 0 ? unused : dead).push({ file: file.rel, name });
    }
  }
  return { total, dead, unused };
}

/** Lit `src/` d'une app et rend son verdict. */
export function scanApp(dir) {
  const files = walk(dir)
    .map(path => ({ path, rel: relative(dir, path).split(sep).join('/') }))
    .filter(f => f.rel.startsWith('src/'))
    .map(f => ({ rel: f.rel, source: readFileSync(f.path, 'utf8') }));
  return findDeadExports(files);
}

export async function run(args = []) {
  const TOUT = args.includes('--all');
  const rootArg = args.includes('--root')
    ? args[args.indexOf('--root') + 1]
    : undefined;
  const ici = fileURLToPath(new URL('..', import.meta.url));
  const racine = rootArg ?? join(ici, '..');
  const demandees = args.filter(a => !a.startsWith('--') && a !== rootArg);
  const apps = demandees.length ? demandees : FAMILY_APPS.map(app => app.id);

  const total = { exports: 0, dead: 0, unused: 0 };
  for (const app of apps) {
    const dir = join(racine, app);
    try {
      statSync(dir);
    } catch {
      continue;
    }
    const verdict = scanApp(dir);
    total.exports += verdict.total;
    total.dead += verdict.dead.length;
    total.unused += verdict.unused.length;
    console.log(
      `\n${app}  exports=${verdict.total}  MORTS=${verdict.dead.length}  superflus=${verdict.unused.length}`
    );
    const montre = TOUT ? verdict.dead : verdict.dead.slice(0, 8);
    for (const d of montre) console.log(`   †  ${d.file}:${d.name}`);
    if (!TOUT && verdict.dead.length > 8) {
      console.log(`   … +${verdict.dead.length - 8} (--all)`);
    }
    if (TOUT) {
      for (const u of verdict.unused) console.log(`   ~  ${u.file}:${u.name}`);
    }
  }
  console.log(
    `\nTOTAL exports=${total.exports}  morts=${total.dead}  superflus=${total.unused}`
  );
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await run(process.argv.slice(2));
}
