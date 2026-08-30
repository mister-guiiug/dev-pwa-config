#!/usr/bin/env node
/**
 * Relève CE QUE LES SEIZE APPS IMPORTENT VRAIMENT du paquet — et ce qu'elles
 * continuent de recopier à côté. Écrit `showroom/adoption.js`.
 *
 *   node scripts/measure-adoption.mjs [--root ../mister-guiiug] [--write]
 *                                      [--replace] [--force]
 *
 * LE RELEVÉ SE CUMULE, IL NE SE REMPLACE PAS. Personne n'a les dix-sept dépôts
 * clonés en permanence : on relève ce qu'on a sous la main. `--write` FUSIONNE
 * donc — les apps mesurées à cette exécution écrasent leur propre entrée, les
 * autres gardent la leur, et chaque entrée porte son `measuredAt`.
 *
 * CE QUE ÇA CORRIGE. Lancé sans les dépôts à côté, l'outil écrivait `measured:
 * 1` et EFFAÇAIT le relevé des seize autres apps — 1187 lignes perdues en une
 * commande, sans un mot. Un relevé partiel n'est pas un relevé plus récent :
 * c'est une vue partielle du même objet. `--replace` reste possible pour une
 * campagne complète, et refuse de réduire la couverture sans `--force`.
 *
 * POURQUOI. Le catalogue porte déjà un champ `configs` : les sous-chemins qu'une
 * app importe. Il ne dit pas l'inverse — ce qu'elle N'IMPORTE PAS alors que le
 * paquet le fournit. Or c'est le seul chiffre qui mesure l'utilité réelle de ce
 * dépôt, et le relevé du 24/08/2026 est sans appel : la couche outillage est
 * adoptée (`vitest-base` 14/16, `observability` 13, `playwright-base` 12), la
 * couche interface ne l'est pas. Sur tout `/react`, seuls `FamilyApps` (13) et
 * `ErrorBoundary` (9) sont importés ; `Button`, `Sheet`, `EmptyState`, `Badge`,
 * `Stat`, `Skeleton`, `AppFooter` sont à ZÉRO — publiés le 10 août, recopiés
 * dans quatre à sept apps.
 *
 * Un paquet qui promeut plus vite qu'il n'est adopté fabrique une étagère, pas
 * un socle. Ce relevé donne le chiffre qui doit baisser.
 *
 * COMMENT LES DOUBLONS SONT DÉTECTÉS. Par nom de fichier, contre la table
 * `EQUIVALENTS` ci-dessous — une correspondance DÉCLARÉE, pas devinée. Chaque
 * ligne dit « ce fichier local fait le travail de cet export ». Ajouter une
 * ligne est une décision ; c'est ce qui distingue un doublon d'une homonymie.
 * La table ne prétend pas être exhaustive : elle ne compte que ce qui a été
 * constaté.
 *
 * ET COMMENT ILS SONT ACQUITTÉS — deux règles, toutes deux nées d'un défaut
 * mesuré le 30/08/2026, qui faisaient pencher le relevé du côté PESSIMISTE :
 *
 *   1. **Les symboles libérateurs.** Un besoin est acquitté quand l'app importe
 *      l'un des `symbols` déclarés. Ils valaient auparavant le NOM DU BESOIN, or
 *      neuf des vingt-six clés ne sont le nom d'aucun export du paquet
 *      (`links`, `backup`, `format`, `Toast`, `share`, `geo`, `webVitals`,
 *      `security`, `useI18n`) : ces besoins-là étaient INACQUITTABLES par
 *      construction. Une app pouvait migrer parfaitement et rester comptée en
 *      dette pour l'éternité. `test/adoption-equivalents.test.mjs` interdit
 *      désormais qu'une clé retombe dans ce cas.
 *   2. **La façade.** Un fichier qui porte le nom guetté mais qui importe déjà
 *      le paquet n'est pas un doublon, c'est une adoption en cours. Trois des
 *      sept `storage.ts` du parc étaient exactement cela.
 *
 * Un relevé faux dans le sens flatteur ferait croire une dette éteinte ; faux
 * dans le sens pessimiste, il fait migrer ce qui n'a pas à l'être, et décourage
 * en annonçant que rien ne bouge. Les deux coûtent.
 *
 * FICHIER COMMITÉ, PAS DE REQUÊTE. Même forme que `showroom/metrics.js` : le
 * résultat est posé sur `globalThis` par un `<script src>`, la page ne fait
 * aucun appel réseau. Un fichier VIDE est un état valide — le relevé exige les
 * dépôts des apps à côté, ce que la CI n'a pas.
 *
 * Non publié (absent de `files`) : outil de développement du dépôt.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAMILY_APPS } from '../apps-catalog.js';
import { EQUIVALENTS } from './adoption-equivalents.mjs';
import {
  coverageVerdict,
  indexAdoption,
  mergeAdoption,
} from './adoption-merge.mjs';

const IGNORED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  'playwright-report',
  'test-results',
]);

const SOURCE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|css)$/;
const GENERATED = /\.(test|spec)\./;

/**
 * LE CSS COMPTE, et il ne comptait pas. Le balayage s'arrêtait aux fichiers
 * JavaScript, si bien que `components.css` — LE PRÉREQUIS de toute la couche
 * interface, celui sans lequel un composant migré s'affiche NU — n'était visible
 * dans aucun relevé. La campagne citait « quatorze apps sur dix-sept » sans
 * qu'aucune donnée du dépôt ne l'étaye ; deux migrations l'ont relevé le même
 * jour, en constatant que la table `CONSUMED` du catalogue n'en portait pas
 * trace pour des apps qui l'importent depuis longtemps.
 *
 * Un prérequis qu'on ne mesure pas est un prérequis qu'on croit acquis.
 */
const CSS_IMPORT_RE =
  /@import\s+['"]@mister-guiiug\/dev-wpa-config([^'"]*)['"]/g;

const PACKAGE = '@mister-guiiug/dev-wpa-config';

/**
 * Imports du paquet, y compris multiligne — c'est la forme que produit Prettier
 * dès deux symboles, et une expression mono-ligne les rate tous.
 *
 * `[^{}]*` interdit de traverser une AUTRE paire d'accolades : sans cette
 * restriction, la recherche part d'un `import {` quelconque et avale les
 * imports voisins jusqu'à trouver le nom du paquet. Défaut constaté sur le
 * premier jet de ce relevé, qui rendait « 185 symboles » dont `useState`.
 */
const IMPORT_RE =
  /import\s+(?:type\s+)?\{([^{}]*)\}\s*from\s*['"]@mister-guiiug\/dev-wpa-config([^'"]*)['"]/g;

function walk(dir, out = []) {
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

/** Racine où trouver les dépôts des apps, ou `null` si aucune ne s'y trouve. */
function findRoot(explicit) {
  const here = fileURLToPath(new URL('..', import.meta.url));
  const candidates = explicit
    ? [explicit]
    : [join(here, '..'), join(here, '..', 'mister-guiiug')];
  for (const root of candidates) {
    const found = FAMILY_APPS.filter(app => {
      try {
        return statSync(join(root, app.id)).isDirectory();
      } catch {
        return false;
      }
    });
    if (found.length > 0) return { root, found: found.length };
  }
  return null;
}

/** Relève une app : ce qu'elle importe, ce qu'elle recopie. */
function measureApp(appDir) {
  const files = walk(appDir);
  const symbols = new Set();
  const subpaths = new Set();

  for (const file of files) {
    let source;
    try {
      source = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const match of source.matchAll(IMPORT_RE)) {
      subpaths.add(match[2] || '/');
      for (const raw of match[1].split(',')) {
        const name = raw
          .replace(/\btype\b/g, '')
          .split(' as ')[0]
          .trim();
        if (name) symbols.add(name);
      }
    }
    // Une feuille de style n'apporte aucun symbole : seul son sous-chemin
    // compte, et c'est justement lui qui manquait au relevé.
    for (const match of source.matchAll(CSS_IMPORT_RE)) {
      subpaths.add(match[1] || '/');
    }
  }

  // Doublons : un fichier local porte le nom déclaré équivalent, et l'app
  // n'importe pas le symbole correspondant. Les tests sont écartés — un
  // `Button.test.tsx` n'est pas une réimplémentation.
  //
  // `basename` et pas `slice(lastIndexOf('/'))` : `join` sépare avec `\` sous
  // Windows, où la découpe manuelle rendait le CHEMIN ENTIER. Aucun nom ne
  // correspondait alors à la table, et le relevé annonçait zéro doublon —
  // c'est-à-dire une dette éteinte, sur une machine qui ne l'avait pas payée.
  //
  // DEUX DÉFAUTS SYMÉTRIQUES, mesurés le 30/08/2026 — et celui-ci penchait dans
  // l'autre sens, le PESSIMISTE : il faisait migrer ce qui n'avait pas à l'être.
  //
  // 1. L'acquittement testait `symbols.has(exported)`, c'est-à-dire exigeait que
  //    l'app importe un symbole portant le NOM DU BESOIN. Or neuf des vingt-six
  //    clés — `links`, `backup`, `format`, `Toast`, `share`, `geo`, `webVitals`,
  //    `security`, `useI18n` — ne sont le nom d'AUCUN export du paquet : elles
  //    étaient donc inacquittables par construction. Une app pouvait migrer
  //    parfaitement et rester comptée en dette pour toujours. Chaque besoin
  //    déclare maintenant ses `symbols` libérateurs.
  // 2. Un fichier qui porte le nom guetté mais qui IMPORTE DÉJÀ LE PAQUET n'est
  //    pas un doublon : c'est une façade, donc une adoption. Trois des sept
  //    `storage.ts` du parc étaient dans ce cas.
  const sourceFile = new Map();
  for (const file of files) {
    if (GENERATED.test(file)) continue;
    const name = basename(file);
    if (!sourceFile.has(name)) sourceFile.set(name, file);
  }
  const duplicates = [];
  for (const [exported, rule] of Object.entries(EQUIVALENTS)) {
    const libres = rule.symbols ?? [exported];
    if (libres.some(name => symbols.has(name))) continue;
    const hit = rule.files.find(name => sourceFile.has(name));
    if (!hit) continue;
    // La façade : le fichier existe encore, mais il délègue au paquet.
    let contenu = '';
    try {
      contenu = readFileSync(sourceFile.get(hit), 'utf8');
    } catch {
      /* illisible : on retombe sur le comptage par nom */
    }
    if (contenu.includes(PACKAGE)) continue;
    duplicates.push({ exported, file: hit });
  }

  return {
    symbols: [...symbols].sort(),
    subpaths: [...subpaths].sort(),
    duplicates: duplicates.sort((a, b) => a.exported.localeCompare(b.exported)),
  };
}

const args = process.argv.slice(2);
const rootArg = args.includes('--root')
  ? args[args.indexOf('--root') + 1]
  : undefined;
const write = args.includes('--write');
const replace = args.includes('--replace');
const force = args.includes('--force');

const located = findRoot(rootArg);
if (!located) {
  console.error(
    "Aucun dépôt d'app trouvé. Cloner les apps à côté, ou passer --root <dossier>."
  );
  process.exit(1);
}

const apps = {};
for (const app of FAMILY_APPS) {
  let dir;
  try {
    dir = join(located.root, app.id);
    if (!statSync(dir).isDirectory()) continue;
  } catch {
    continue;
  }
  apps[app.id] = measureApp(dir);
}

const out = fileURLToPath(new URL('../showroom/adoption.js', import.meta.url));

/**
 * Le relevé déjà en place, ou `null`. Le fichier est du JavaScript (il se
 * charge par `<script src>`), pas du JSON : on l'exécute dans un objet à nous
 * plutôt que d'inventer un analyseur.
 */
function previousRecord() {
  try {
    const source = readFileSync(out, 'utf8');
    const scope = {};
    new Function('globalThis', source)(scope);
    const record = scope.SHOWROOM_ADOPTION;
    return record && typeof record.apps === 'object' ? record : null;
  } catch {
    return null;
  }
}

const previous = previousRecord();
const stampedAt = new Date().toISOString();

const {
  apps: merged,
  measured,
  measuredNow,
} = mergeAdoption(previous, apps, {
  replace,
  stampedAt,
});

const verdict = coverageVerdict(previous, measured, { replace, force });
if (write && verdict.refuse) {
  console.error(
    `Refus d'écrire : --replace ferait passer le relevé de ${verdict.before} à ${verdict.after} apps.\n` +
      "Sans --replace, l'écriture FUSIONNE et ne perd rien. Pour réduire volontairement, ajouter --force."
  );
  process.exit(1);
}
if (write && verdict.warn) {
  console.warn(
    `⚠ --force : le relevé passe de ${verdict.before} à ${verdict.after} apps.`
  );
}

const { bySymbol, byDuplicate } = indexAdoption(merged);

const payload = {
  generatedAt: stampedAt,
  measured,
  total: FAMILY_APPS.length,
  apps: merged,
  bySymbol,
  byDuplicate,
};

const banner = `/*
 * FICHIER GÉNÉRÉ — ne pas modifier à la main.
 *
 * Ce que chaque app importe RÉELLEMENT du paquet, et ce qu'elle recopie encore
 * à côté. Écrit par \`scripts/measure-adoption.mjs\`, qui exige les dépôts des
 * apps clonés à côté de celui-ci — ce que la CI n'a pas.
 *
 * Chargé par un \`<script src>\` classique, comme \`metrics.js\` : la page ne fait
 * AUCUNE requête réseau et s'ouvre en \`file://\`.
 *
 * \`measured: 0\` = le relevé n'a jamais tourné. La vitrine n'affiche alors
 * simplement aucun taux d'adoption.
 *
 * RELEVÉ CUMULÉ. \`measured\` compte les apps que cet enregistrement CONNAÎT,
 * pas celles vues à la dernière exécution : chaque entrée porte son propre
 * \`measuredAt\`. Personne n'ayant les dix-sept dépôts clonés en permanence,
 * l'écriture fusionne au lieu de remplacer — sans quoi un relevé partiel
 * effacerait le travail des autres.
 */
globalThis.SHOWROOM_ADOPTION = `;

/**
 * Le fichier engendré passe par Prettier avant d'être posé.
 *
 * `JSON.stringify` cite toutes les clés et double toutes les apostrophes ; la
 * config du dépôt fait l'inverse, et `npm run validate` — donc la CI — le
 * refuse. Sans ce passage, chaque relevé exigeait un `npm run format` derrière,
 * qu'on oublie exactement les fois où l'on relève à la hâte. Même repli que
 * `sync-generated.mjs` : sans Prettier installé, le fichier reste valide.
 */
async function formatted(source, filepath) {
  try {
    const prettier = await import('prettier');
    const config = (await prettier.resolveConfig(filepath)) ?? {};
    return await prettier.format(source, { ...config, filepath });
  } catch {
    return source;
  }
}

if (write) {
  writeFileSync(
    out,
    await formatted(`${banner}${JSON.stringify(payload, null, 2)};\n`, out),
    'utf8'
  );
  console.log(
    `✅ showroom/adoption.js — ${measured}/${FAMILY_APPS.length} apps ` +
      `(${measuredNow} relevée${measuredNow > 1 ? 's' : ''} à l'instant, ${measured - measuredNow} conservée${measured - measuredNow > 1 ? 's' : ''})`
  );
}

// Résumé lisible, toujours affiché : c'est le chiffre qui doit bouger.
const rows = Object.entries(bySymbol)
  .map(([s, list]) => [s, list.length])
  .sort((a, b) => b[1] - a[1]);
console.log(
  `\nRelevé : ${measuredNow} app(s) sous ${located.root} ; ` +
    `enregistrement cumulé ${measured}/${FAMILY_APPS.length}`
);
console.log('\nIMPORTÉ :');
for (const [symbol, count] of rows) {
  console.log(`  ${String(count).padStart(3)}  ${symbol}`);
}
const dups = Object.entries(byDuplicate)
  .map(([s, list]) => [s, list.length])
  .sort((a, b) => b[1] - a[1]);
console.log('\nRECOPIÉ PLUTÔT QU’IMPORTÉ :');
for (const [symbol, count] of dups) {
  console.log(`  ${String(count).padStart(3)}  ${symbol}`);
}
