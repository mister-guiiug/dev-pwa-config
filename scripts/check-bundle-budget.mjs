#!/usr/bin/env node
/**
 * Budget de bundle : refuser un build qui grossit sans qu'on l'ait décidé.
 *
 *   "scripts": { "build": "tsc -b && vite build && pwa-bundle-budget" },
 *   "bundleBudget": { "totalGzipKb": 255, "mainChunkKb": 300 }
 *
 * PROMU, PAS INVENTÉ. `miss-uwh` (`check-bundle-budget.mjs`, 60 l.) additionne
 * le poids GZIP de tout le JS émis et échoue au-delà d'un total ;
 * `mister-qowa` (`check-bundle.mjs`, 25 l.) borne le poids BRUT du chunk
 * principal. Deux mesures différentes pour la même intention — et le
 * commentaire d'uwh raconte trois montées de version où la mesure a changé
 * une décision. Deux apps sur seize l'avaient ; les quatorze autres
 * grossissent sans le savoir.
 *
 * LES DEUX MESURES SONT GARDÉES, parce qu'elles ne disent pas la même chose :
 * le total gzip est ce que l'utilisateur télécharge, le chunk principal est
 * ce qu'il attend avant le premier rendu. Chacune est facultative ; un
 * budget sans aucune borne n'échoue jamais et le dit.
 *
 * LE BUDGET SE LIT DANS `package.json` (`bundleBudget`), pas en ligne de
 * commande : il doit être relu et discuté dans une PR, pas dans un script
 * `npm` que personne n'ouvre. Les options en ligne de commande servent à
 * l'essai (`--dir`, `--total-gzip-kb`, `--main-chunk-kb`, `--main-chunk`).
 *
 *   bundleBudget.dir           dossier des assets (défaut `dist/assets`)
 *   bundleBudget.totalGzipKb   plafond du total gzip de tout le JS
 *   bundleBudget.mainChunkKb   plafond du chunk principal (brut, comme qowa)
 *   bundleBudget.mainChunk     préfixe du chunk principal (ex. `app-` ; défaut : index-, app-, main-)
 *
 * Publié comme bin `pwa-bundle-budget` — la mécanique de `pwa-icons`.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { gzipSync } from 'node:zlib';

const DEFAULT_DIR = 'dist/assets';
/**
 * Le chunk principal se reconnaît par un PRÉFIXE, pas une expression
 * régulière : CodeQL a signalé (`js/regex-injection`) qu'un motif venu de la
 * ligne de commande construisait un `RegExp` — et un préfixe dit tout ce
 * qu'il y a à dire d'un nom de fichier Vite (`index-Ab12Cd34.js`).
 */
const DEFAULT_MAIN_PREFIXES = ['index', 'app', 'main'];
const isMainChunk = prefix =>
  prefix
    ? file => file.name.startsWith(prefix)
    : file =>
        DEFAULT_MAIN_PREFIXES.some(
          p => file.name.startsWith(`${p}-`) || file.name.startsWith(`${p}.`)
        );

/**
 * Mesure les fichiers JS d'un dossier : poids brut et gzip, du plus lourd au
 * plus léger. Pure lecture — rien n'est décidé ici.
 *
 * @param {string} dir
 * @returns {{ files: Array<{ name: string, rawKb: number, gzipKb: number }>,
 *   totalGzipKb: number }}
 */
export function measureBundle(dir) {
  let names;
  try {
    names = readdirSync(dir).filter(name => name.endsWith('.js'));
  } catch {
    throw new Error(`[budget] « ${dir} » introuvable — lancez le build avant.`);
  }
  const files = names
    .map(name => {
      const path = join(dir, name);
      const raw = readFileSync(path);
      return {
        name,
        rawKb: statSync(path).size / 1024,
        gzipKb: gzipSync(raw).length / 1024,
      };
    })
    .sort((a, b) => b.gzipKb - a.gzipKb);
  const totalGzipKb = files.reduce((sum, file) => sum + file.gzipKb, 0);
  return { files, totalGzipKb };
}

/**
 * Confronte une mesure au budget. Rend les problèmes — TOUS, pas le premier —
 * pour qu'une PR qui dépasse deux bornes le sache d'un coup.
 *
 * @param {ReturnType<typeof measureBundle>} measure
 * @param {{ totalGzipKb?: number, mainChunkKb?: number, mainChunk?: string }} budget
 *   `mainChunk` est un PRÉFIXE de nom de fichier (`app-`).
 * @returns {{ ok: boolean, problems: string[], main: { name: string, rawKb: number } | null }}
 */
export function checkBudget(measure, budget = {}) {
  const problems = [];
  const { totalGzipKb, mainChunkKb, mainChunk } = budget;

  if (Number.isFinite(totalGzipKb) && measure.totalGzipKb > totalGzipKb) {
    problems.push(
      `total gzip ${measure.totalGzipKb.toFixed(1)} kB > budget ${totalGzipKb} kB`
    );
  }

  let main = null;
  if (Number.isFinite(mainChunkKb)) {
    main = measure.files.find(isMainChunk(mainChunk)) ?? null;
    if (!main) {
      problems.push(
        `chunk principal introuvable (préfixe ${mainChunk ?? DEFAULT_MAIN_PREFIXES.join('|')}) — préciser bundleBudget.mainChunk`
      );
    } else if (main.rawKb > mainChunkKb) {
      problems.push(
        `${main.name} : ${main.rawKb.toFixed(0)} kB > budget ${mainChunkKb} kB`
      );
    }
  }

  if (!Number.isFinite(totalGzipKb) && !Number.isFinite(mainChunkKb)) {
    problems.push(
      'aucune borne : renseigner bundleBudget.totalGzipKb et/ou bundleBudget.mainChunkKb dans package.json'
    );
  }

  return { ok: problems.length === 0, problems, main };
}

/**
 * Le cliquet : quand le build a MAIGRI, proposer un budget plus serré.
 *
 * Un budget se pose à « poids courant + marge » et n'en bouge plus : le
 * 05/09/2026, bac-sable était à 675 kB de budget, carbook à 505, qowa à 435 —
 * des plafonds posés un jour de surpoids, qui laissent depuis toute la place
 * de regrossir sans qu'on le décide. Le cliquet ne fait que proposer : la
 * mesure plus dix pour cent, quand c'est plus bas que le budget écrit. Avec
 * `--write`, il l'écrit dans `package.json` — à relire dans la PR, comme le
 * budget lui-même.
 *
 * @param {ReturnType<typeof measureBundle>} measure
 * @param {{ totalGzipKb?: number, mainChunkKb?: number }} budget
 * @param {{ name: string, rawKb: number } | null} main
 * @param {{ marge?: number }} [options]
 * @returns {Array<{ key: string, measured: number, current: number, proposed: number }>}
 */
export function proposeBudget(measure, budget = {}, main = null, options = {}) {
  const marge = options.marge ?? 0.1;
  // Arrondi à six décimales AVANT le plafond : `100 * 1.1` vaut
  // 110.00000000000001 en flottant, et `Math.ceil` en ferait 111.
  const serre = kb => Math.ceil(Number((kb * (1 + marge)).toFixed(6)));
  const proposals = [];
  if (Number.isFinite(budget.totalGzipKb)) {
    const proposed = serre(measure.totalGzipKb);
    if (proposed < budget.totalGzipKb) {
      proposals.push({
        key: 'totalGzipKb',
        measured: measure.totalGzipKb,
        current: budget.totalGzipKb,
        proposed,
      });
    }
  }
  if (Number.isFinite(budget.mainChunkKb) && main) {
    const proposed = serre(main.rawKb);
    if (proposed < budget.mainChunkKb) {
      proposals.push({
        key: 'mainChunkKb',
        measured: main.rawKb,
        current: budget.mainChunkKb,
        proposed,
      });
    }
  }
  return proposals;
}

/** Écrit les budgets proposés dans `package.json`, et rien d'autre. */
export function writeBudget(cwd, proposals) {
  const path = join(cwd, 'package.json');
  const pkg = JSON.parse(readFileSync(path, 'utf8'));
  pkg.bundleBudget = { ...(pkg.bundleBudget ?? {}) };
  for (const p of proposals) pkg.bundleBudget[p.key] = p.proposed;
  writeFileSync(path, `${JSON.stringify(pkg, null, 2)}\n`);
}

/** Le budget : `package.json`, puis les options de ligne de commande. */
export function readBudget(cwd, argv = []) {
  let fromPackage = {};
  try {
    const pkg = JSON.parse(readFileSync(join(cwd, 'package.json'), 'utf8'));
    fromPackage = pkg.bundleBudget ?? {};
  } catch {
    /* pas de package.json : tout vient de la ligne de commande */
  }
  const flag = name => {
    const i = argv.indexOf(name);
    return i === -1 ? undefined : argv[i + 1];
  };
  const number = value => (value === undefined ? undefined : Number(value));
  return {
    dir: flag('--dir') ?? fromPackage.dir ?? DEFAULT_DIR,
    totalGzipKb: number(flag('--total-gzip-kb')) ?? fromPackage.totalGzipKb,
    mainChunkKb: number(flag('--main-chunk-kb')) ?? fromPackage.mainChunkKb,
    mainChunk: flag('--main-chunk') ?? fromPackage.mainChunk,
  };
}

export function run(argv = [], cwd = process.cwd()) {
  const budget = readBudget(cwd, argv);
  const measure = measureBundle(resolve(cwd, budget.dir));

  console.log('Bundle JS (gzip / brut) :');
  for (const file of measure.files) {
    console.log(
      `  ${file.gzipKb.toFixed(1).padStart(7)} kB  ${file.rawKb.toFixed(0).padStart(5)} kB  ${file.name}`
    );
  }
  console.log(`  ${'─'.repeat(10)}`);
  console.log(`  ${measure.totalGzipKb.toFixed(1).padStart(7)} kB  TOTAL gzip`);

  const verdict = checkBudget(measure, budget);
  if (!verdict.ok) {
    for (const problem of verdict.problems)
      console.error(`[budget] ❌ ${problem}`);
    return 1;
  }
  const bornes = [
    Number.isFinite(budget.totalGzipKb) &&
      `total gzip ≤ ${budget.totalGzipKb} kB`,
    Number.isFinite(budget.mainChunkKb) &&
      `${verdict.main?.name ?? 'chunk principal'} ≤ ${budget.mainChunkKb} kB`,
  ].filter(Boolean);
  console.log(`[budget] ✅ sous le budget (${bornes.join(', ')}).`);

  if (argv.includes('--ratchet')) {
    const proposals = proposeBudget(measure, budget, verdict.main);
    if (!proposals.length) {
      console.log(
        '[budget] ↔ rien à resserrer : le build est à moins de dix pour cent du budget.'
      );
    }
    for (const p of proposals) {
      console.log(
        `[budget] ↓ ${p.key} : ${p.measured.toFixed(1)} kB mesurés — budget ${p.current} → ${p.proposed} kB proposé`
      );
    }
    if (proposals.length && argv.includes('--write')) {
      writeBudget(cwd, proposals);
      console.log('[budget] ✍ package.json mis à jour — à relire dans la PR.');
    } else if (proposals.length) {
      console.log('[budget]   `--ratchet --write` pour l’écrire.');
    }
  }
  return 0;
}

// Lancé en ligne de commande seulement : importé par un test, rien ne tourne.
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  try {
    process.exit(run(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
