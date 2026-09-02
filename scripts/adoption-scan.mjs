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

/**
 * Les fichiers que le balayage ouvre : les sources, plus les `tsconfig*.json`.
 *
 * Le JSON n'est PAS ouvert en bloc, et c'est délibéré : un `package-lock.json`
 * de PWA pèse plusieurs mégaoctets, cite le paquet des dizaines de fois, et
 * n'apprend rien que `package.json` ne dise mieux.
 */
export const SCANNED =
  /(\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|css)|^(ts|js)config[\w.-]*\.json)$/;

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
 * TOUTES LES AUTRES FORMES — et elles cachaient la couche la plus adoptée du
 * socle.
 *
 * Le relevé ne connaissait que l'import NOMMÉ et le `@import` CSS. Or la
 * couche outillage ne s'importe presque jamais comme ça : un `prettier.config`
 * réexporte, un `setup.ts` importe pour l'effet de bord, un `eslint.config`
 * prend un défaut. Mesure du 31/08/2026 sur les dix-sept dépôts — sept
 * sous-chemins comptés à ZÉRO consommateur, alors que :
 *
 *   `/prettier`           15 apps   `export { default } from …`
 *   `/vitest-setup`       15 apps   `import '…'` (effet de bord)
 *   `/tsconfig-app-react` 15 apps   `"extends"` en JSON
 *   `/tsconfig-node`      15 apps   `"extends"` en JSON
 *   `/lint-staged`        14 apps   réexportation
 *   `/eslint-react`       10 apps   réexportation
 *   `/commitlint`          3 apps   réexportation
 *
 * Le README affirmait « la couche outillage est adoptée » : c'était vrai, et
 * l'instrument affichait zéro. Un module qu'on ne sait pas mesurer passe pour
 * mort — et c'est le raisonnement qui décide quoi promouvoir ensuite.
 *
 * Ces formes n'apportent AUCUN SYMBOLE, seulement leur sous-chemin : il n'y a
 * pas de liste de noms à lire dans `import '…'` ni dans un `"extends"`. Une
 * réexportation nommée (`export { X } from …`) en apporte un, et c'est bien
 * une consommation de `X` — l'import nommé la couvre déjà.
 *
 * `[^'"()\n]*?` interdit de franchir une ligne ou une autre chaîne : sans
 * cette borne, la recherche part d'un `import` quelconque et avale le voisin.
 * Les imports nommés multilignes restent l'affaire d'`IMPORT_RE`.
 */
export const SPECIFIER_RE =
  /(?:import|export)\s*[^'"()\n]*?['"]@mister-guiiug\/dev-wpa-config([^'"]*)['"]/g;

/** Les seuls JSON qu'on ouvre : un `package-lock` ne dit rien et pèse lourd. */
export const TSCONFIG_FILE = /^(?:ts|js)config[\w.-]*\.json$/;

/**
 * Les configurations TypeScript dont un `tsconfig` HÉRITE VRAIMENT.
 *
 * L'ANCRAGE SUR `extends` N'EST PAS UNE PRÉCAUTION DE STYLE. `miss-dice` cite
 * `@mister-guiiug/dev-wpa-config/tsconfig-app` deux fois dans son
 * `tsconfig.app.json` — dans des COMMENTAIRES : « Inlined from … ». L'app a
 * recopié le contenu au lieu de l'étendre, en expliquant pourquoi (les
 * sous-chemins publiés étaient par moments irrésolvables en CI). Chercher le
 * nom du paquet n'importe où dans le fichier compterait cette app comme
 * adoptante alors qu'elle a fait exactement l'inverse.
 *
 * Un `tsconfig` accepte les commentaires : on ne peut pas `JSON.parse`. On lit
 * donc la VALEUR de `extends` — chaîne ou tableau — et rien d'autre.
 */
export function tsconfigSubpaths(source) {
  const trouves = [];
  const cle = /"extends"\s*:\s*(\[[^\]]*\]|"[^"]*")/g;
  for (const match of String(source).matchAll(cle)) {
    for (const ref of match[1].matchAll(
      /"@mister-guiiug\/dev-wpa-config([^"]*)"/g
    )) {
      trouves.push(ref[1] || '/');
    }
  }
  return trouves;
}

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

/**
 * Ce qu'UN fichier apprend au relevé.
 *
 * `symbols` — ce que l'app importe nommément ; `subpaths` — les modules
 * qu'elle consomme, quelle que soit la forme ; `declares` — ce qu'elle écrit
 * elle-même, donc ce qu'elle pourrait recopier.
 *
 * @param {string} name Le nom de fichier seul : il décide de la lecture.
 * @param {string} source
 */
export function scanFile(name, source) {
  // Un `tsconfig` n'est pas du JavaScript : il n'a ni import ni déclaration,
  // et son seul renseignement est ce dont il HÉRITE.
  if (TSCONFIG_FILE.test(name)) {
    return { symbols: [], subpaths: tsconfigSubpaths(source), declares: [] };
  }

  const symbols = [];
  const subpaths = [];
  const declares = [];

  for (const match of source.matchAll(IMPORT_RE)) {
    subpaths.push(match[2] || '/');
    for (const raw of match[1].split(',')) {
      const nom = raw
        .replace(/\btype\b/g, '')
        .split(' as ')[0]
        .trim();
      if (nom) symbols.push(nom);
    }
  }
  for (const match of source.matchAll(CSS_IMPORT_RE))
    subpaths.push(match[1] || '/');
  for (const match of source.matchAll(SPECIFIER_RE))
    subpaths.push(match[1] || '/');

  // Un test qui exporte un utilitaire n'est pas une réimplémentation — même
  // règle que pour la détection par nom de fichier.
  if (!GENERATED.test(name)) {
    for (const match of source.matchAll(EXPORT_RE)) declares.push(match[1]);
  }

  return { symbols, subpaths, declares };
}

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
    else if (SCANNED.test(entry.name)) out.push(full);
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
 *    fichier qui porte le nom guetté mais qui DÉLÈGUE CE BESOIN au paquet —
 *    importe un de ses symboles libérateurs, ou réexporte depuis le paquet —
 *    n'est pas un doublon, c'est une adoption. Trois des sept `storage.ts` du
 *    parc. Importer autre chose du paquet ne compte pas : sinon un en-tête
 *    écrit à la main qui prend `Button` au socle passerait pour adopté.
 *
 * Une GARDE — un besoin que l'app garde à elle, avec sa raison écrite — sort
 * du décompte. Le retour reste un TABLEAU NU de doublons : les gardes passent
 * par `onKept`, parce qu'accrocher une propriété au tableau casserait tous les
 * `deepEqual` qui le comparent.
 *
 * @param {{ appId?: string, garde?: (appId: string, exported: string) => string|undefined,
 *   onKept?: (garde: { exported: string, reason: string }) => void,
 *   symbols: Set<string>, sourceFile: Map<string,string>,
 *   declares: Map<string,string>, read?: (path: string) => string,
 *   toPath?: (path: string) => string }} state
 * @param {Record<string, { files?: string[], exports?: string[],
 *   symbols?: string[] }>} equivalents
 */
/** `export * from` / `export { … } from` le paquet : une réexportation. */
const REEXPORT_RE = new RegExp(
  String.raw`export\s+(?:\*|\{[^}]*\})\s+from\s+['"]` + PACKAGE
);

/**
 * Le fichier délègue CE besoin au paquet : il réexporte depuis le paquet, ou
 * importe nommément un des symboles qui acquittent le besoin.
 *
 * @param {string} name Nom du fichier (décide de la lecture).
 * @param {string} contenu
 * @param {string[]} libres Les symboles qui acquittent le besoin.
 */
export function estFacade(name, contenu, libres) {
  if (!contenu.includes(PACKAGE)) return false;
  if (REEXPORT_RE.test(contenu)) return true;
  const { symbols } = scanFile(name, contenu);
  return symbols.some(symbol => libres.includes(symbol));
}

export function findDuplicates(state, equivalents) {
  const {
    appId,
    garde = () => undefined,
    onKept = () => {},
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

    // GARDE : l'app garde ce besoin à elle, et la raison est écrite dans
    // `adoption-equivalents.mjs`. Ce n'est pas une dette, c'est une décision.
    const raison = appId ? garde(appId, exported) : undefined;
    if (raison) {
      onKept({ exported, reason: raison });
      continue;
    }

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
    // FAÇADE : le fichier délègue CE besoin au paquet — il importe l'un de ses
    // symboles libérateurs, ou réexporte depuis le paquet. Importer n'importe
    // quoi d'autre du socle n'acquitte rien : l'`AppHeader.tsx` de miss-uwh
    // importe `Button` du paquet et reste un en-tête écrit à la main. La règle
    // disait « importe le paquet » : le 02/09/2026, quatre en-têtes sur six et
    // trois formulaires de connexion sur quatre passaient pour adoptés.
    if (estFacade(hit, contenu, libres)) continue;

    duplicates.push({ exported, file: hit });
  }

  return duplicates.sort((a, b) => a.exported.localeCompare(b.exported));
}
