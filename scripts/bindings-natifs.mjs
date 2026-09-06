#!/usr/bin/env node
/**
 * Les binaires natifs de CE poste, AUX VERSIONS DU LOCKFILE.
 *
 *   npx pwa-bindings            # les pose
 *   npx pwa-bindings --dry-run  # dit seulement ce qu'il poserait
 *
 * D'OÙ ÇA VIENT. Une application dont le `.npmrc` épingle `os=linux` (pour que
 * le lockfile reste celui de la CI) n'installe aucun binaire natif Windows :
 * `tsc`, les tests et le build s'arrêtent sur « Cannot find native binding ».
 * La parade circulait de main en main, à l'écrit dans nos notes et jamais dans
 * un dépôt :
 *
 *   npm i --no-save @rolldown/binding-win32-x64-msvc lightningcss-win32-x64-msvc …
 *
 * SANS NUMÉRO DE VERSION. Or `npm i <nom>` installe la DERNIÈRE version
 * publiée, pas celle que le lockfile a résolue — et le poste se met à faire
 * tourner un compilateur que la CI n'a jamais vu.
 *
 * CE QUE ÇA A COÛTÉ, une fois mesuré (mister-footcoach, 06/09/2026). Le poste
 * avait `@rolldown/binding-win32-x64-msvc` **1.2.7** là où le lockfile disait
 * **1.1.5**. Le transformeur de 1.2.7 conserve davantage de commentaires à
 * travers la transformation JSX : des `/* istanbul ignore next *\/` qui ne
 * survivaient pas survivaient, et `ast-v8-to-istanbul` RETIRE du rapport le
 * sous-arbre annoté. Deux fichiers y perdaient une région entière, entièrement
 * couverte. Le poste mesurait 75.67 / 74.83 / 71.18 / 76.13 quand la CI
 * mesurait 75.72 / 75.22 / 71.26 / 76.18 — et comme les seuils avaient été
 * calés sur le poste, la CI restait verte en gardant la mauvaise référence.
 * L'écart se lit « Windows ≠ Linux » alors que les deux systèmes rendent le
 * même chiffre au bit près dès que la chaîne d'outils est la même.
 *
 * POURQUOI UN OUTIL ET PAS UNE LIGNE DE PLUS DANS LA DOC. Les versions ne sont
 * pas les mêmes d'une app à l'autre — le 06/09/2026, `@rolldown/binding` valait
 * 1.0.3 sur miss-uwh et mister-qowa, 1.1.5 sur mister-footcoach, 1.2.5 ici.
 * Une commande épinglée à la main serait juste pour un dépôt et fausse pour les
 * dix-neuf autres, et fausse pour tous à la première montée. La seule forme qui
 * reste vraie est celle qui LIT le lockfile.
 *
 * LA LISTE N'EST PAS ÉCRITE. On ne nomme pas quatre paquets : on retient du
 * lockfile toute entrée dont les contraintes `os` / `cpu` / `libc` désignent ce
 * poste. C'est exactement ce que npm aurait installé sans le `.npmrc`, ni plus
 * ni moins — et un binaire natif de plus dans une dépendance future y entre
 * sans qu'on ait à toucher à quoi que ce soit. (Le 06/09/2026 la règle rendait
 * sept paquets sur mister-footcoach, là où la note manuscrite en nommait
 * quatre : `@esbuild/win32-x64`, `@img/sharp-win32-x64` et
 * `@rollup/rollup-win32-x64-gnu` manquaient.)
 */
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { estPointDEntree } from './entree.mjs';

/**
 * Un nom de paquet npm, et rien d'autre. Ces noms viennent d'un fichier
 * (`package-lock.json`) et repartent vers `spawn` : on les valide avant, plutôt
 * que de faire confiance à leur provenance.
 */
const NOM_VALIDE = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;
const VERSION_VALIDE = /^[0-9A-Za-z.+-]+$/;

/**
 * La cible que désigne le poste courant.
 *
 * `libc` ne concerne que Linux, où le même `os`/`cpu` porte deux binaires
 * (`-gnu` et `-musl`). Node dit lequel : un binaire glibc expose sa version
 * dans l'en-tête de son rapport, un binaire musl non.
 *
 * @returns {{ os: string, cpu: string, libc: string | null }}
 */
export function cibleCourante() {
  const libc =
    process.platform === 'linux'
      ? process.report?.getReport?.()?.header?.glibcVersionRuntime
        ? 'glibc'
        : 'musl'
      : null;
  return { os: process.platform, cpu: process.arch, libc };
}

/** Le nom du paquet, tel qu'on l'installerait, depuis sa clé de lockfile. */
function nomDepuisLaCle(cle) {
  const dernier = cle.lastIndexOf('node_modules/');
  return dernier === -1 ? cle : cle.slice(dernier + 'node_modules/'.length);
}

/**
 * Les paquets du lockfile que CETTE cible réclame, épinglés à la version que
 * le lockfile a résolue.
 *
 * Une entrée est retenue quand elle contraint À LA FOIS `os` et `cpu` — c'est
 * la signature d'un binaire natif — et que les deux contraintes désignent la
 * cible. `libc`, quand l'entrée le déclare, doit correspondre aussi : sans ce
 * troisième filtre, un poste glibc se verrait proposer les deux variantes
 * Linux, dont une qu'il ne peut pas charger.
 *
 * Quand un même nom apparaît plusieurs fois (une copie imbriquée sous une
 * dépendance), l'entrée de premier niveau gagne : c'est celle que `npm i`
 * poserait. Sans entrée de premier niveau, la première rencontrée fait foi.
 *
 * @param {{ packages?: Record<string, any> }} lock contenu de package-lock.json
 * @param {{ os: string, cpu: string, libc?: string | null }} cible
 * @returns {Array<{ nom: string, version: string }>} triés par nom
 */
export function bindingsDuLockfile(lock, cible) {
  /** @type {Map<string, { version: string, premierNiveau: boolean }>} */
  const retenus = new Map();

  for (const [cle, entree] of Object.entries(lock?.packages ?? {})) {
    if (!Array.isArray(entree?.os) || !Array.isArray(entree?.cpu)) continue;
    if (!entree.os.includes(cible.os) || !entree.cpu.includes(cible.cpu))
      continue;
    // `libc` n'est filtrant que si l'entrée le déclare ET que la cible en a un.
    if (
      Array.isArray(entree.libc) &&
      cible.libc &&
      !entree.libc.includes(cible.libc)
    )
      continue;

    const nom = nomDepuisLaCle(cle);
    const version = entree.version;
    if (
      !NOM_VALIDE.test(nom) ||
      !version ||
      !VERSION_VALIDE.test(String(version))
    )
      continue;

    const premierNiveau = cle === `node_modules/${nom}`;
    const deja = retenus.get(nom);
    if (!deja || (premierNiveau && !deja.premierNiveau))
      retenus.set(nom, { version: String(version), premierNiveau });
  }

  return [...retenus.entries()]
    .map(([nom, { version }]) => ({ nom, version }))
    .sort((a, b) => a.nom.localeCompare(b.nom));
}

/** `nom@version`, la forme qu'attend npm — le `@` d'une portée n'y change rien. */
export const specDe = ({ nom, version }) => `${nom}@${version}`;

/**
 * Lit le lockfile d'un dossier.
 *
 * @param {string} dossier
 * @returns {object}
 */
export function lireLockfile(dossier) {
  const chemin = resolve(dossier, 'package-lock.json');
  try {
    return JSON.parse(readFileSync(chemin, 'utf8'));
  } catch {
    throw new Error(
      `[bindings] « ${chemin} » illisible — cet outil épingle sur le lockfile, il lui en faut un.`
    );
  }
}

/**
 * @param {string[]} argv
 * @param {string} cwd
 * @returns {number} code de sortie
 */
export function run(argv = [], cwd = process.cwd()) {
  const iDir = argv.indexOf('--dir');
  const dossier = iDir === -1 ? cwd : (argv[iDir + 1] ?? cwd);
  const cible = cibleCourante();
  const bindings = bindingsDuLockfile(lireLockfile(dossier), cible);

  const ou = `${cible.os}/${cible.cpu}${cible.libc ? `/${cible.libc}` : ''}`;
  if (!bindings.length) {
    console.log(
      `[bindings] rien à poser pour ${ou} : aucune entrée du lockfile ne contraint cette cible.`
    );
    return 0;
  }

  const specs = bindings.map(specDe);
  console.log(`[bindings] ${bindings.length} binaire(s) natif(s) pour ${ou} :`);
  for (const spec of specs) console.log(`  ${spec}`);
  console.log(`[bindings] npm i --no-save ${specs.join(' ')}`);

  if (argv.includes('--dry-run')) {
    console.log('[bindings] --dry-run : rien n’a été installé.');
    return 0;
  }

  // `npm.cmd` nommé explicitement plutôt qu'un `shell: true` : aucun
  // interpréteur ne voit ces noms, donc aucune façon de les faire lire de
  // travers.
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const { status, error } = spawnSync(npm, ['i', '--no-save', ...specs], {
    cwd: dossier,
    stdio: 'inherit',
  });
  if (error) {
    console.error(`[bindings] ❌ ${error.message}`);
    return 1;
  }
  if (status !== 0) {
    console.error(`[bindings] ❌ npm a rendu ${status}.`);
    return status ?? 1;
  }
  console.log('[bindings] ✅ posés aux versions du lockfile.');
  return 0;
}

// Lancé en ligne de commande seulement : importé par un test, rien ne tourne.
if (estPointDEntree(import.meta.url)) {
  try {
    process.exit(run(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
