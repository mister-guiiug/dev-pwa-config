/**
 * LE BALAYAGE du relevé d'adoption, séparé de l'outil qui le lance.
 *
 * Troisième application de la même règle que `adoption-equivalents.mjs` et
 * `migrate-plan.mjs` : `measure-adoption.mjs` balaie dix-sept dépôts **dès
 * qu'on le charge**, donc rien de ce qu'il contient n'est testable en place.
 * Ce qui décide — quels dossiers on regarde, ce qui compte comme un doublon —
 * vit ici et se teste ; l'outil ne garde que l'exécution.
 *
 * La séparation n'est pas cosmétique : les deux défauts corrigés le 31/08/2026
 * — les worktrees d'agent comptés comme du code d'app, et `storage.ts` devenu
 * cent pour cent faux positifs — vivaient tous les deux dans du code que rien
 * ne pouvait exercer.
 *
 * Non publié (absent de `files`) : outillage de développement du dépôt.
 */
import { readdirSync } from 'node:fs';
import { basename, join } from 'node:path';

/** Le paquet dont ce dépôt est la source. */
export const PACKAGE = '@mister-guiiug/dev-wpa-config';

/**
 * Ce qu'on ne regarde pas. Rien ici n'est du code que l'app expédie.
 *
 * `.claude` PORTE LES WORKTREES D'AGENT, et le relevé les comptait comme du
 * code de l'app. Mesure du 31/08/2026 : 98 fichiers source sous
 * `miss-contraction/.claude`, 298 sous `mister-footcoach`, 116 sous
 * `mister-qowa` — du code de branches non fusionnées, parfois abandonnées.
 *
 * Le tort allait DANS LES DEUX SENS, et le second est le dangereux :
 *
 *   PESSIMISTE — miss-contraction était comptée en dette sur `useI18n` pour un
 *   `src/hooks/useI18n.ts` qui n'existe QUE dans un worktree vieux de cinq
 *   heures. Ce fichier n'est pas dans l'app ; la dette non plus.
 *
 *   FLATTEUR — un worktree qui importe le paquet ajoute ses symboles à ceux de
 *   l'app, donc ACQUITTE un besoin que `main` ne couvre pas. Une migration en
 *   cours d'écriture se compte alors comme faite.
 *
 * Le relevé mesure ce que l'app EXPÉDIE, pas ce qu'un agent essaie à côté.
 */
export const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  '.claude',
  'dist',
  'build',
  'coverage',
  'playwright-report',
  'test-results',
]);

/** Le CSS compte : `components.css` est le prérequis de la couche interface. */
export const SOURCE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|css)$/;

/** Un `Button.test.tsx` n'est pas une réimplémentation de `Button`. */
export const GENERATED = /\.(test|spec)\./;

/**
 * Imports du paquet, y compris multiligne — c'est la forme que produit Prettier
 * dès deux symboles, et une expression mono-ligne les rate tous.
 *
 * `[^{}]*` interdit de traverser une AUTRE paire d'accolades : sans cette
 * restriction, la recherche part d'un `import {` quelconque et avale les
 * imports voisins jusqu'à trouver le nom du paquet. Défaut constaté sur le
 * premier jet de ce relevé, qui rendait « 185 symboles » dont `useState`.
 */
export const IMPORT_RE =
  /import\s+(?:type\s+)?\{([^{}]*)\}\s*from\s*['"]@mister-guiiug\/dev-wpa-config([^'"]*)['"]/g;

/**
 * Une feuille de style n'apporte aucun symbole : seul son sous-chemin compte,
 * et c'est justement lui qui manquait au relevé.
 */
export const CSS_IMPORT_RE =
  /@import\s+['"]@mister-guiiug\/dev-wpa-config([^'"]*)['"]/g;

/**
 * Ce qu'un fichier DÉCLARE lui-même — le seul détecteur de doublon qui regarde
 * le code plutôt que l'étiquette.
 *
 * La table guettait jusqu'ici des NOMS DE FICHIER, et elle documente déjà trois
 * fois ce que ça coûte : `Navbar.tsx`, `theme.ts`, `storage.ts`. La conclusion
 * y est écrite noir sur blanc — « un nom de fichier ne dit pas ce qu'un fichier
 * fait ». `exports` est la règle qui en tient compte : une app double `backup`
 * quand elle écrit son propre `createBackup`, où qu'il soit.
 *
 * Une RÉEXPORTATION (`export { createBackup } from '@mister-guiiug/…'`) n'est
 * volontairement pas reconnue : ce n'est pas une réimplémentation, c'est une
 * façade — et la règle de la façade l'acquitte déjà.
 */
export const EXPORT_RE =
  /export\s+(?:async\s+)?(?:function\s*\*?|const|let|var|class)\s+([A-Za-z_$][\w$]*)/g;

/** Tous les fichiers source d'un dépôt, worktrees et artefacts exclus. */
export function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (SOURCE.test(entry.name)) out.push(full);
  }
  return out;
}

/**
 * L'index des noms de fichier, pour la détection par étiquette.
 *
 * `basename` et pas `slice(lastIndexOf('/'))` : `join` sépare avec `\` sous
 * Windows, où la découpe manuelle rendait le CHEMIN ENTIER. Aucun nom ne
 * correspondait alors à la table, et le relevé annonçait zéro doublon —
 * c'est-à-dire une dette éteinte, sur une machine qui ne l'avait pas payée.
 */
export function indexByName(files) {
  const sourceFile = new Map();
  for (const file of files) {
    if (GENERATED.test(file)) continue;
    const name = basename(file);
    if (!sourceFile.has(name)) sourceFile.set(name, file);
  }
  return sourceFile;
}

/**
 * Ce que l'app recopie au lieu de l'importer.
 *
 * TROIS RÈGLES, et l'ordre compte.
 *
 * 1. L'ACQUITTEMENT PASSE AVANT TOUT. Il testait autrefois
 *    `symbols.has(exported)`, c'est-à-dire exigeait que l'app importe un
 *    symbole portant le NOM DU BESOIN. Or neuf des vingt-six clés — `links`,
 *    `backup`, `format`, `Toast`, `share`, `geo`, `webVitals`, `security`,
 *    `useI18n` — ne sont le nom d'AUCUN export du paquet : elles étaient
 *    inacquittables par construction, et une app pouvait migrer parfaitement
 *    en restant comptée en dette pour toujours.
 * 2. LA DÉTECTION PAR LE CODE (`exports`), qui regarde ce que l'app déclare.
 * 3. LA DÉTECTION PAR L'ÉTIQUETTE (`files`), avec la règle de la FAÇADE : un
 *    fichier qui porte le nom guetté mais qui IMPORTE DÉJÀ LE PAQUET n'est pas
 *    un doublon, c'est une adoption. Trois des sept `storage.ts` du parc.
 *
 * @param {{ symbols: Set<string>, sourceFile: Map<string,string>,
 *   declares: Map<string,string>, read?: (path: string) => string,
 *   toPath?: (path: string) => string }} state
 * @param {Record<string, { files?: string[], exports?: string[],
 *   symbols?: string[] }>} equivalents
 */
export function findDuplicates(state, equivalents) {
  const {
    symbols,
    sourceFile,
    declares,
    read = () => '',
    toPath = p => p,
  } = state;
  const duplicates = [];

  for (const [exported, rule] of Object.entries(equivalents)) {
    const libres = rule.symbols ?? [exported];
    if (libres.some(name => symbols.has(name))) continue;

    // Le chemin relevé est celui du vrai coupable, pas le nom guetté : c'est
    // la seule forme de la détection qui indique où aller regarder.
    const declared = (rule.exports ?? []).find(name => declares.has(name));
    if (declared) {
      duplicates.push({
        exported,
        file: toPath(declares.get(declared)),
        declares: declared,
      });
      continue;
    }

    const hit = (rule.files ?? []).find(name => sourceFile.has(name));
    if (!hit) continue;

    let contenu = '';
    try {
      contenu = read(sourceFile.get(hit));
    } catch {
      /* illisible : on retombe sur le comptage par nom */
    }
    if (contenu.includes(PACKAGE)) continue;

    duplicates.push({ exported, file: hit });
  }

  return duplicates.sort((a, b) => a.exported.localeCompare(b.exported));
}
