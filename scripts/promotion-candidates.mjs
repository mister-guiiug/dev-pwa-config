#!/usr/bin/env node
/**
 * CE QUE PLUSIEURS APPS ÉCRIVENT ET QUE LE PAQUET N'A PAS.
 *
 *   node scripts/promotion-candidates.mjs [--root <dossier>] [--min 2] [--all]
 *
 * POURQUOI CET OUTIL EXISTE. `adoption-candidates` regarde dans un seul sens :
 * ce que les apps déclarent ET que le paquet exporte déjà — une dette
 * d'adoption. Celui-ci regarde dans l'autre : ce que les apps déclarent EN
 * PLUSIEURS EXEMPLAIRES et que le paquet n'exporte PAS — un gisement de
 * promotion. Le relevé « mesure la migration de ce qu'on sait partagé ; il ne
 * découvre rien » (CAMPAGNE.md, 30/08). Cet outil est la moitié qui découvre.
 *
 * DEUX LEÇONS DU TRI DU 02/09, CÂBLÉES ICI plutôt que laissées au lecteur :
 *
 *   - Un nom partagé peut être un CADAVRE. `useAccessibility.tsx` sortait comme
 *     doublon dans deux apps : 414 lignes, zéro importateur. Chaque exemplaire
 *     porte donc son nombre d'IMPORTATEURS dans son app — zéro se lit d'un
 *     coup d'œil, et se supprime au lieu de se promouvoir. Les tests comptent
 *     comme importateurs (un utilitaire de test n'est pas mort), mais ne
 *     déclarent rien. Hors de `src/`, le compte n'a pas de sens — un script
 *     ou une config n'est importé par personne et vit très bien — et il
 *     n'est pas fait.
 *   - Un nom partagé peut être un HOMONYME. `addDays` prend une chaîne ici et
 *     une `Date` là. Chaque groupe porte donc la SIMILARITÉ de ses fichiers
 *     (Jaccard sur les lignes normalisées) : 1,00 est une copie littérale,
 *     0,05 un simple homonyme. Ni l'une ni l'autre ne dispense de lire — mais
 *     elles disent par où commencer.
 *
 * DEUX GROUPEMENTS, parce que `EXPORT_RE` ne voit pas `export default`. Les
 * composants React sont souvent exportés par défaut : on regroupe aussi par
 * NOM DE FICHIER (`AppHeader.tsx` dans quatre apps), ce qui rattrape ce que la
 * déclaration nommée manque.
 *
 * CE N'EST PAS UNE LISTE DE CHOSES À PROMOUVOIR. C'est une liste de choses à
 * ALLER LIRE, triée pour que la lecture commence par le plus probable. Le tri
 * du 02/09/2026 est écrit dans `GISEMENTS.md`.
 *
 * Non publié (absent de `files`) : outillage de développement du dépôt.
 */
import { readFileSync, statSync } from 'node:fs';
import { basename, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAMILY_APPS } from '../apps-catalog.js';
import { EQUIVALENTS } from './adoption-equivalents.mjs';
import { GENERATED, scanFile, walk } from './adoption-scan.mjs';
import { estPointDEntree } from './entree.mjs';

/**
 * Des noms qu'on trouve dans toute base de code, et dont la collision
 * n'apprend rien sur un gisement.
 */
export const TROP_COMMUNS = new Set([
  'default',
  'App',
  'main',
  'Icon',
  'Provider',
  'Context',
  'config',
  'routes',
  'types',
  'messages',
  'setup',
  'schema',
  'schemas',
  'seed',
  'env',
]);

/**
 * `bac-sable` est la source de `mister-family-map` : les compter tous les deux
 * ferait passer chaque copie pour un doublon inter-apps.
 */
const MIROIRS = new Map([['mister-family-map', 'bac-sable']]);

/**
 * Normalise une source pour la comparer : lignes non vides, sans espaces, sans
 * commentaires. Le test a attrapé la première version : `/** … *\/` sur une
 * ligne commence par `/`, pas par `*`, et comptait comme du code — deux copies
 * ne différant que par leur en-tête ne valaient plus 1.
 */
export function lignesNormalisees(source) {
  return new Set(
    String(source)
      .split('\n')
      .map(l => l.replace(/\s+/g, ''))
      .filter(l => l.length > 3 && !/^(\/\/|\/\*|\*)/.test(l))
  );
}

/**
 * Le motif « ce nom, entier » pour compter ses importateurs.
 *
 * TOUT métacaractère est échappé, pas seulement `$`. CodeQL a refusé la
 * première version (`js/incomplete-sanitization`), et il avait raison au-delà
 * de la sécurité : la clé par NOM DE FICHIER contient des points —
 * `vite.config`, `tsconfig.app` — et un point non échappé matche n'importe
 * quoi. Un nom avec une parenthèse aurait fait lever `new RegExp`.
 */
export function motifNom(nom) {
  return new RegExp(`\\b${nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
}

/** Jaccard sur les ensembles de lignes : 1 = copie littérale, 0 = rien. */
export function similarite(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let commun = 0;
  for (const l of a) if (b.has(l)) commun++;
  return commun / (a.size + b.size - commun);
}

const existe = chemin => {
  try {
    return statSync(chemin).isDirectory();
  } catch {
    return false;
  }
};

export async function run(args = []) {
  const TOUT = args.includes('--all');
  const MIN = args.includes('--min')
    ? Number(args[args.indexOf('--min') + 1])
    : 2;
  const rootArg = args.includes('--root')
    ? args[args.indexOf('--root') + 1]
    : undefined;

  const ici = fileURLToPath(new URL('..', import.meta.url));
  const candidatsRacine = rootArg
    ? [rootArg]
    : [join(ici, '..'), join(ici, '..', 'mister-guiiug')];

  const racine = candidatsRacine.find(r =>
    FAMILY_APPS.some(app => existe(join(r, app.id)))
  );
  if (!racine) {
    console.error(
      "Aucun dépôt d'app trouvé. Cloner les apps à côté, ou --root <dossier>."
    );
    process.exit(1);
  }

  /** La surface publique du paquet : tout nom exporté par un sous-chemin. */
  const paquet = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url))
  );
  const surface = new Set();
  for (const [subpath, cible] of Object.entries(paquet.exports)) {
    if (subpath.includes('*')) continue;
    const fichier = typeof cible === 'string' ? cible : (cible.default ?? '');
    if (!fichier.endsWith('.js')) continue;
    try {
      for (const nom of Object.keys(await import(`../${fichier.slice(2)}`)))
        surface.add(nom);
    } catch {
      /* module exigeant un DOM ou une peer absente : couvert ailleurs */
    }
  }
  for (const regle of Object.values(EQUIVALENTS)) {
    for (const nom of regle.symbols ?? []) surface.add(nom);
    for (const nom of regle.exports ?? []) surface.add(nom);
  }

  /**
   * Les apps à lire : le catalogue, moins les miroirs dont la source est là.
   * `bac-sable` n'est pas au catalogue (dépôt privé) mais c'est lui la
   * source : on l'ajoute s'il est cloné à côté.
   */
  const apps = [];
  for (const app of FAMILY_APPS) {
    const source = MIROIRS.get(app.id);
    if (source && existe(join(racine, source))) continue;
    apps.push(app.id);
  }
  for (const source of MIROIRS.values()) {
    if (existe(join(racine, source)) && !apps.includes(source))
      apps.push(source);
  }

  /**
   * Par app : chaque fichier lu, ses déclarations, et le texte pour compter
   * les importateurs et mesurer la similarité.
   */
  const parApp = new Map();
  for (const app of apps) {
    const dossier = join(racine, app);
    const fichiers = walk(dossier);
    if (fichiers.length === 0) continue;
    const lus = [];
    for (const fichier of fichiers) {
      let source;
      try {
        source = readFileSync(fichier, 'utf8');
      } catch {
        continue;
      }
      const nom = basename(fichier);
      // Un test ne DÉCLARE rien qu'on promouvrait, mais il IMPORTE : un
      // utilitaire que seuls les tests appellent n'est pas un cadavre.
      const test = GENERATED.test(nom);
      lus.push({
        chemin: relative(dossier, fichier).split(sep).join('/'),
        nom: test ? null : nom.replace(/\.(tsx?|jsx?|mjs|cjs|css)$/, ''),
        source,
        lignes: source.split('\n').length,
        declares: test ? [] : scanFile(nom, source).declares,
      });
    }
    parApp.set(app, lus);
  }

  /**
   * Combien de fichiers de l'app citent ce nom, hors celui qui le déclare.
   * `null` hors de `src/` : un script, une config ou un workflow n'est importé
   * par personne, et ce n'est pas un cadavre pour autant.
   */
  function importateurs(app, nom, chemin) {
    if (!chemin.startsWith('src/')) return null;
    const motif = motifNom(nom);
    let n = 0;
    for (const f of parApp.get(app)) {
      if (f.chemin === chemin) continue;
      if (motif.test(f.source)) n++;
    }
    return n;
  }

  /**
   * Regroupe par clé (nom déclaré, ou nom de fichier) : pour chaque clé, un
   * exemplaire par app au plus — le premier fichier qui la porte.
   */
  function grouper(cle) {
    const groupes = new Map();
    for (const [app, lus] of parApp) {
      const vus = new Set();
      for (const f of lus) {
        if (f.nom === null) continue;
        for (const k of cle(f)) {
          if (vus.has(k) || TROP_COMMUNS.has(k) || surface.has(k)) continue;
          vus.add(k);
          if (!groupes.has(k)) groupes.set(k, []);
          groupes.get(k).push({ app, ...f });
        }
      }
    }
    const lignes = [];
    for (const [k, exemplaires] of groupes) {
      if (exemplaires.length < MIN) continue;
      const ensembles = exemplaires.map(e => lignesNormalisees(e.source));
      let simMax = 0;
      for (let i = 0; i < ensembles.length; i++)
        for (let j = i + 1; j < ensembles.length; j++)
          simMax = Math.max(simMax, similarite(ensembles[i], ensembles[j]));
      const detail = exemplaires.map(e => ({
        app: e.app,
        chemin: e.chemin,
        lignes: e.lignes,
        importateurs: importateurs(e.app, k, e.chemin),
      }));
      lignes.push({ cle: k, exemplaires: detail, simMax });
    }
    return lignes.sort(
      (a, b) =>
        b.exemplaires.length - a.exemplaires.length ||
        b.simMax - a.simMax ||
        a.cle.localeCompare(b.cle)
    );
  }

  function afficher(titre, lignes) {
    console.log(`\n══ ${titre} : ${lignes.length} groupe(s) ══`);
    for (const { cle, exemplaires, simMax } of lignes) {
      const comptes = exemplaires.filter(e => e.importateurs !== null);
      const morts = comptes.filter(e => e.importateurs === 0).length;
      const etiquette =
        comptes.length && morts === comptes.length
          ? '  ← MORT PARTOUT'
          : morts
            ? `  ← mort dans ${morts}`
            : '';
      console.log(
        `${String(exemplaires.length).padStart(2)}×  ${cle.padEnd(28)} sim ${simMax.toFixed(2)}${etiquette}`
      );
      if (!TOUT && exemplaires.length < 3 && simMax < 0.3) continue;
      for (const e of exemplaires) {
        const imp =
          e.importateurs === null ? ' –' : String(e.importateurs).padStart(2);
        console.log(
          `         ${e.app.padEnd(18)} ${String(e.lignes).padStart(4)} l.  ` +
            `${imp} imp.  ${e.chemin}`
        );
      }
    }
  }

  console.log(
    `${apps.length} app(s) lues sous ${racine} ; surface du paquet : ${surface.size} noms.\n` +
      'À ALLER LIRE — un nom partagé peut être un homonyme, ou un cadavre.'
  );
  afficher(
    'Par déclaration nommée (export function/const/class)',
    grouper(f => f.declares)
  );
  afficher(
    'Par nom de fichier (rattrape les export default)',
    grouper(f => [f.nom])
  );
}

// Lancé en ligne de commande seulement : importé par un test, le module ne
// balaie rien.
if (estPointDEntree(import.meta.url)) {
  await run(process.argv.slice(2));
}
