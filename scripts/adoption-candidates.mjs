#!/usr/bin/env node
/**
 * CE QUE LA TABLE DES ÉQUIVALENCES NE SAIT PAS ENCORE.
 *
 *   node scripts/adoption-candidates.mjs [--root ../mister-guiiug] [--all]
 *
 * POURQUOI CET OUTIL EXISTE. `EQUIVALENTS` est écrite à la main, entrée par
 * entrée, « constaté au relevé, pas supposé » — c'est sa force, et c'est aussi
 * son plafond : vingt-six besoins pour cent trente-huit sous-chemins publiés.
 * Ce qu'elle ignore, personne ne le voit.
 *
 * LE COÛT DE CE PLAFOND, mesuré le 01/09/2026. Le premier balayage a sorti en
 * tête `registerSW`, déclaré à la main dans NEUF apps — alors que l'en-tête de
 * `testing/pwa-register.js` annonce depuis sa promotion « LE PLUS GROS DOUBLON
 * DU PARC ». La plus grosse duplication connue du dépôt n'avait jamais figuré
 * dans le chiffre qu'on publie, faute d'une ligne dans une table.
 *
 * COMMENT. Pour chaque app : les noms qu'elle DÉCLARE (`export function X`)
 * et que le paquet exporte aussi, sans qu'elle les importe. Le même détecteur
 * que `findDuplicates`, mais tourné vers l'inconnu au lieu du déclaré.
 *
 * CE N'EST PAS UN RELEVÉ, ET IL NE FAUT PAS LE LIRE COMME TEL. Une homonymie
 * n'est pas une équivalence — ce dépôt en a payé quatre (`Navbar.tsx`,
 * `theme.ts`, `storage.ts`, et la clé `mc-theme`). Le balayage sort du BRUIT
 * par construction : `CATEGORIES` y apparaît pour le tableau de score du
 * yahtzee de miss-dice, qui n'a rien à voir avec le catalogue d'apps.
 *
 * La sortie est donc une LISTE DE CHOSES À ALLER LIRE. Ce qui se vérifie entre
 * dans `EQUIVALENTS` et devient une dette ; le reste ne compte pas.
 *
 * Non publié (absent de `files`) : outillage de développement du dépôt.
 */
import { readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAMILY_APPS } from '../apps-catalog.js';
import { EQUIVALENTS } from './adoption-equivalents.mjs';
import { scanFile, walk } from './adoption-scan.mjs';

/**
 * Des noms si communs qu'une collision n'apprend rien. `Icon` et `config`
 * existent dans toute base de code ; `default` n'est le nom de personne.
 */
const TROP_COMMUNS = new Set([
  'default',
  'Icon',
  'Provider',
  'Context',
  'config',
]);

const args = process.argv.slice(2);
const TOUT = args.includes('--all');
const rootArg = args.includes('--root')
  ? args[args.indexOf('--root') + 1]
  : undefined;

const ici = fileURLToPath(new URL('..', import.meta.url));
const candidatsRacine = rootArg
  ? [rootArg]
  : [join(ici, '..'), join(ici, '..', 'mister-guiiug')];

const racine = candidatsRacine.find(r =>
  FAMILY_APPS.some(app => {
    try {
      return statSync(join(r, app.id)).isDirectory();
    } catch {
      return false;
    }
  })
);

if (!racine) {
  console.error(
    "Aucun dépôt d'app trouvé. Cloner les apps à côté, ou --root <dossier>."
  );
  process.exit(1);
}

/** La surface publique : chaque nom, et le sous-chemin qui le publie. */
const paquet = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url))
);
const surface = new Map();
for (const [subpath, cible] of Object.entries(paquet.exports)) {
  if (subpath.includes('*')) continue;
  const fichier = typeof cible === 'string' ? cible : (cible.default ?? '');
  if (!fichier.endsWith('.js')) continue;
  try {
    for (const nom of Object.keys(await import(`../${fichier.slice(2)}`))) {
      if (!surface.has(nom))
        surface.set(nom, subpath.replace(/^\./, '') || '/');
    }
  } catch {
    /* module exigeant un DOM ou une peer absente : couvert ailleurs */
  }
}

/** Ce que la table couvre déjà : on cherche ce qu'elle IGNORE. */
const couverts = new Set();
for (const regle of Object.values(EQUIVALENTS)) {
  for (const nom of regle.symbols ?? []) couverts.add(nom);
  for (const nom of regle.exports ?? []) couverts.add(nom);
}

const parNom = new Map();
for (const app of FAMILY_APPS) {
  const dossier = join(racine, app.id);
  const fichiers = walk(dossier);
  if (fichiers.length === 0) continue;

  const importes = new Set();
  const declares = new Map();
  for (const fichier of fichiers) {
    let source;
    try {
      source = readFileSync(fichier, 'utf8');
    } catch {
      continue;
    }
    const lu = scanFile(fichier.slice(fichier.lastIndexOf(sep) + 1), source);
    for (const nom of lu.symbols) importes.add(nom);
    for (const nom of lu.declares)
      if (!declares.has(nom)) declares.set(nom, fichier);
  }

  for (const [nom, fichier] of declares) {
    if (!surface.has(nom)) continue;
    if (couverts.has(nom) || TROP_COMMUNS.has(nom)) continue;
    // Elle l'importe déjà : le fichier local est une façade, pas un doublon.
    if (importes.has(nom)) continue;
    if (!parNom.has(nom)) parNom.set(nom, []);
    parNom.get(nom).push({
      app: app.id,
      file: relative(dossier, fichier).split(sep).join('/'),
    });
  }
}

const lignes = [...parNom].sort(
  (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0])
);
const multiples = lignes.filter(([, apps]) => apps.length > 1);
const uniques = lignes.filter(([, apps]) => apps.length === 1);

console.log(
  `${lignes.length} nom(s) déclaré(s) localement que le paquet exporte déjà, ` +
    `hors table.\nÀ ALLER LIRE — une homonymie n'est pas une équivalence.\n`
);

for (const [nom, apps] of multiples) {
  console.log(
    `${String(apps.length).padStart(2)}×  ${nom.padEnd(24)} ${surface.get(nom)}`
  );
  for (const { app, file } of apps) console.log(`         ${app} · ${file}`);
}

if (uniques.length) {
  console.log(`\n── déclarés par UNE seule app (${uniques.length}) ──`);
  if (TOUT) {
    for (const [nom, [seul]] of uniques) {
      console.log(
        `     ${nom.padEnd(24)} ${surface.get(nom).padEnd(22)} ${seul.app}`
      );
    }
  } else {
    console.log(`     ${uniques.map(([n]) => n).join(', ')}`);
    console.log('     (--all pour le détail)');
  }
}
