#!/usr/bin/env node
/**
 * Remplace un fichier RECOPIÉ par l'import du socle, app par app.
 *
 * CE QUI MANQUAIT. `migrate-consumers.mjs` relève la version du paquet et
 * aligne les peers — il ne touche pas une ligne de code. C'est la raison pour
 * laquelle quinze promotions sur seize n'ont jamais été suivies d'une
 * migration : promouvoir prend une heure, migrer seize apps à la main n'arrive
 * jamais. Le relevé le mesure : 130 fichiers recopiés, et pas un seul de ces
 * doublons ne manque au socle.
 *
 *   node scripts/adopt.mjs [--root ../mister-guiiug] [--app id] [--only Export]
 *                          [--write] [--allow-unstyled]
 *
 * SANS `--write`, RIEN N'EST ÉCRIT. C'est le mode par défaut, et il le reste :
 * un codemod qui modifie seize dépôts d'un coup sans qu'on ait lu son rapport
 * est plus dangereux que la dette qu'il efface.
 *
 * CE QU'IL NE FAIT PAS, ET C'EST VOULU :
 *
 *   - il ne SUPPRIME pas le fichier recopié. Le laisser orphelin est visible
 *     et réversible ; le supprimer emporterait les ajouts locaux que
 *     l'analyse n'a pas vus ;
 *   - il n'invente aucun chemin d'import : il relève ceux que le fichier
 *     écrit déjà ;
 *   - il refuse un fichier dont un symbole importé n'existe pas dans le
 *     sous-chemin — un helper maison collé à côté du composant. Réécrire là
 *     casserait la compilation ; le cas est signalé, pas tranché.
 *   - il refuse de migrer un COMPOSANT vers une app qui n'importe pas
 *     `components.css`. Les composants du paquet ne posent que des attributs
 *     `data-dwc` : sans cette feuille, la migration compile, passe les tests,
 *     et livre un composant NU. Quinze apps sur dix-sept sont dans ce cas.
 *     `--allow-unstyled` lève le refus pour qui a mesuré ce qu'il fait.
 *
 * CE QU'IL NE PEUT PAS VOIR, ET QUI RESTE À VOUS. Il compare des NOMS de
 * symboles, pas des API. Un composant local sans prop obligatoire qui puise
 * dans un store — `<BottomNav />` et ses cinq destinations, `<ThemeToggle />`
 * câblé au store de l'app — se réécrit sans erreur de type et rend autre
 * chose. Relire chaque site d'appel réécrit fait partie de la migration.
 *
 * Non publié (absent de `files`) : outil de développement du dépôt.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { planForApp, rewriteImports, findLocalImports } from './adopt-plan.mjs';

const args = process.argv.slice(2);
const flag = name => {
  const index = args.indexOf(`--${name}`);
  return index === -1 ? undefined : args[index + 1];
};
const WRITE = args.includes('--write');
const ALLOW_UNSTYLED = args.includes('--allow-unstyled');
const ONLY_APP = flag('app');
const ONLY_EXPORT = flag('only');
const ROOT = flag('root');

const here = fileURLToPath(new URL('..', import.meta.url));

/** Le relevé d'adoption, seul inventaire fiable de ce qui est recopié. */
function readAdoption() {
  const source = readFileSync(join(here, 'showroom', 'adoption.js'), 'utf8');
  const scope = {};
  new Function('globalThis', source)(scope);
  return scope.SHOWROOM_ADOPTION;
}

const SKIP = new Set(['node_modules', 'dist', 'build', '.git', 'coverage']);

function sourceFiles(dir, found = [], match = /\.[jt]sx?$/) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, found, match);
    else if (match.test(entry.name)) found.push(full);
  }
  return found;
}

/**
 * Les sous-chemins qui RENDENT du balisage. Les autres — les crochets — n'ont
 * pas d'habillage à perdre, et migrent sans que `components.css` entre en jeu.
 */
const HOOK_SUBPATHS = new Set([
  'react/i18n',
  'react/use-online',
  'react/use-theme',
]);

const rendersMarkup = subpath =>
  subpath.startsWith('react/') && !HOOK_SUBPATHS.has(subpath);

/**
 * L'app importe-t-elle l'habillage des composants du paquet ?
 *
 * Sans lui, les composants ne portent que leurs attributs `data-dwc` et
 * s'affichent nus. Le relevé du 29/08/2026 : deux apps sur dix-sept l'importent.
 */
function importsComponentsCss(appDir) {
  const files = sourceFiles(join(appDir, 'src'), [], /\.(css|scss|[jt]sx?)$/);
  return files.some(file => {
    try {
      return readFileSync(file, 'utf8').includes(
        '@mister-guiiug/dev-wpa-config/components.css'
      );
    } catch {
      return false;
    }
  });
}

function findRoot() {
  const candidate = ROOT ? ROOT : join(here, '..');
  try {
    return statSync(candidate).isDirectory() ? candidate : null;
  } catch {
    return null;
  }
}

const root = findRoot();
if (!root) {
  console.error(
    'Dossier introuvable. Cloner les apps à côté, ou passer --root.'
  );
  process.exit(1);
}

const adoption = readAdoption();
const report = [];

for (const [appId, measurement] of Object.entries(adoption.apps ?? {})) {
  if (ONLY_APP && appId !== ONLY_APP) continue;

  const appDir = join(root, appId);
  try {
    if (!statSync(appDir).isDirectory()) continue;
  } catch {
    // Dépôt non cloné : ce n'est pas une erreur, c'est le cas courant.
    report.push({ appId, status: 'absent' });
    continue;
  }

  const files = sourceFiles(join(appDir, 'src'));
  const styled = ALLOW_UNSTYLED || importsComponentsCss(appDir);
  const steps = planForApp(measurement).filter(
    step => !ONLY_EXPORT || step.exported === ONLY_EXPORT
  );

  for (const step of steps) {
    if (step.status === 'no-subpath') {
      report.push({ appId, ...step });
      continue;
    }

    // Migrer un composant vers une app qui n'habille pas le socle échange un
    // composant stylé contre un composant nu, sans qu'aucun test le dise.
    if (!styled && rendersMarkup(step.subpath)) {
      report.push({
        appId,
        exported: step.exported,
        status: 'unstyled',
        reason: `l'app n'importe pas components.css — ${step.subpath} rendrait un composant nu`,
      });
      continue;
    }

    const base = step.file.replace(/\.[jt]sx?$/, '');
    let touched = 0;
    let blocked = null;

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const localPath of findLocalImports(source, base)) {
        const result = rewriteImports(source, {
          localPath,
          subpath: step.subpath,
          expected: step.expected,
          expectedTypes: step.expectedTypes,
        });
        if (!result) continue;
        if (result.blocked) {
          blocked = result.blocked;
          continue;
        }
        touched += 1;
        if (WRITE) writeFileSync(file, result.source, 'utf8');
        report.push({
          appId,
          exported: step.exported,
          status: WRITE ? 'rewritten' : 'would-rewrite',
          file: relative(root, file),
          to: result.to,
          symbols: result.symbols,
        });
      }
    }

    if (blocked) {
      report.push({
        appId,
        exported: step.exported,
        status: 'blocked',
        reason: `symboles absents du sous-chemin : ${blocked.join(', ')}`,
      });
    } else if (touched === 0) {
      report.push({
        appId,
        exported: step.exported,
        status: 'no-import-found',
      });
    }
  }
}

/* ── Rapport ───────────────────────────────────────────────────────────── */

const byStatus = report.reduce((acc, row) => {
  (acc[row.status] ??= []).push(row);
  return acc;
}, {});

const order = [
  'would-rewrite',
  'rewritten',
  'blocked',
  'unstyled',
  'no-subpath',
  'no-import-found',
  'absent',
];
const LABEL = {
  'would-rewrite': 'À RÉÉCRIRE (essai à blanc)',
  rewritten: 'RÉÉCRITS',
  blocked: 'BLOQUÉS — décision humaine',
  unstyled: 'REFUSÉS — l’app n’importe pas components.css',
  'no-subpath': 'À PROMOUVOIR — aucun sous-chemin ne le publie',
  'no-import-found': 'aucun import trouvé (fichier orphelin ?)',
  absent: 'dépôt non cloné ici',
};

for (const status of order) {
  const rows = byStatus[status];
  if (!rows?.length) continue;
  console.log(`\n${LABEL[status]} — ${rows.length}`);
  for (const row of rows.slice(0, 40)) {
    const detail = row.file
      ? `${row.file} → ${row.to}`
      : (row.reason ?? row.exported ?? '');
    console.log(`  ${row.appId.padEnd(20)} ${row.exported ?? ''} ${detail}`);
  }
  if (rows.length > 40) console.log(`  … et ${rows.length - 40} de plus`);
}

const changeable = (byStatus['would-rewrite'] ?? byStatus.rewritten ?? [])
  .length;
console.log(
  `\n${changeable} import(s) ${WRITE ? 'réécrits' : 'réécriptibles'}.` +
    (WRITE ? '' : ' Relancer avec --write pour appliquer.')
);
console.log(
  'Les fichiers recopiés ne sont PAS supprimés : orphelins, ils restent visibles et réversibles.'
);
