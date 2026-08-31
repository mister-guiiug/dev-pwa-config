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
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAMILY_APPS } from '../apps-catalog.js';
import { EQUIVALENTS } from './adoption-equivalents.mjs';
import {
  coverageVerdict,
  indexAdoption,
  mergeAdoption,
} from './adoption-merge.mjs';
import {
  CSS_IMPORT_RE,
  EXPORT_RE,
  GENERATED,
  IMPORT_RE,
  findDuplicates,
  indexByName,
  walk,
} from './adoption-scan.mjs';

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
  /** Ce que l'app déclare elle-même → le fichier qui le déclare. */
  const declares = new Map();

  for (const file of files) {
    let source;
    try {
      source = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    // Un test qui exporte un utilitaire n'est pas une réimplémentation, comme
    // pour la détection par nom de fichier plus bas.
    if (!GENERATED.test(file)) {
      for (const match of source.matchAll(EXPORT_RE)) {
        if (!declares.has(match[1])) declares.set(match[1], file);
      }
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

  // Les doublons se décident dans `adoption-scan.mjs`, avec leurs trois règles
  // et l'ordre qui les sépare. Ici, seul le passage des chemins : le relevé est
  // lu par un humain, et un chemin absolu de ma machine n'y apprend rien.
  const duplicates = findDuplicates(
    {
      symbols,
      sourceFile: indexByName(files),
      declares,
      read: file => readFileSync(file, 'utf8'),
      toPath: file => relative(appDir, file).split(sep).join('/'),
    },
    EQUIVALENTS
  );

  return {
    symbols: [...symbols].sort(),
    subpaths: [...subpaths].sort(),
    duplicates,
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
