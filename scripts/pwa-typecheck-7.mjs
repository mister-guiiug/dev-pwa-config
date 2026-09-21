#!/usr/bin/env node
/**
 * TypeScript 7 en SECOND AVIS, à côté de la 6 qui reste la référence.
 *
 *   "devDependencies": { "typescript-7": "npm:typescript@~7.0.2" },
 *   "scripts": { "type-check:7": "pwa-typecheck-7" }
 *
 * POURQUOI DEUX COMPILATEURS, ET PAS UNE MONTÉE. `typescript-eslint` REFUSE la
 * 7.0 : son garde lève à l'import dès que `require('typescript').versionMajorMinor`
 * atteint 7, et ESLint meurt alors pour TOUS les fichiers, pas seulement pour
 * les règles typées. Sa plage de pairs le dit aussi — `>=4.8.4 <6.1.0`, canary
 * comprise — et le support amont est suivi pour TS >= 7.1, jamais 7.0
 * (typescript-eslint#10940, ouverte). Remplacer `typescript` par la 7 éteint
 * donc le lint du dépôt entier.
 *
 * La seule disposition qui laisse vivre les deux est celle que Microsoft
 * documente sous « running side-by-side with TypeScript 6.0 » :
 *
 *   typescript      ~6.0.3                 ce que `typescript-eslint` résout
 *   typescript-7    npm:typescript@~7.0.2  le compilateur natif, ici
 *
 * PROMU, PAS INVENTÉ. `miss-ticket` porte cette disposition depuis le
 * 19/09/2026 (`scripts/typecheck-7.mjs`, 80 l.), seul du parc à l'avoir
 * demandée. Ce bin la généralise, avec deux gardes que la copie locale n'avait
 * pas — et qui viennent chacune d'une erreur mesurée.
 *
 * ── GARDE 1 : UN TSCONFIG « SOLUTION » NE COMPILE RIEN ───────────────────────
 *
 * Vingt apps du parc type-vérifient par `tsc -b`, et leur `tsconfig.json`
 * racine porte `files: []` + des `references` vers `tsconfig.app.json` et
 * `tsconfig.node.json`. Un `tsc --noEmit -p tsconfig.json` y lit **zéro
 * fichier**, sort 0, et met 130 ms : le second avis dirait « OK » sans avoir
 * rien lu. Mesuré en le faisant. On suit donc les `references` jusqu'aux
 * projets qui portent du code.
 *
 * On ne se contente pas de `tsc -b` non plus : `-b` ÉCRIT (`.d.ts`,
 * `.tsbuildinfo`). Un second avis n'a pas à salir la copie de travail, ni à
 * faire croire à un build. `--noEmit -p` par projet, et rien d'autre.
 *
 * ── GARDE 2 : ZÉRO FICHIER LU N'EST PAS UN SUCCÈS ────────────────────────────
 *
 * La conséquence de la garde 1, énoncée : ce bin COMPTE les fichiers du dépôt
 * réellement lus (`--listFilesOnly`, hors `node_modules`) et ÉCHOUE si le
 * compte est nul. Un contrôle qui ne lit rien et se déclare vert est pire que
 * pas de contrôle — c'est la famille de pannes la plus coûteuse du parc.
 *
 * ── CE QU'IL NE FAIT PAS ─────────────────────────────────────────────────────
 *
 * Il ne décide pas. `type-check` (TypeScript 6) reste le contrôle de référence,
 * parce que c'est la version que voit l'information de types du lint. Celui-ci
 * est un second avis : plus rapide, parfois plus strict, qu'on lit sans lui
 * laisser le dernier mot. C'est à l'appelant — la CI — de le garder non
 * bloquant.
 *
 * ON N'APPELLE JAMAIS LE BINAIRE PAR SON NOM. Le paquet aliasé déclare lui
 * aussi `bin: { tsc }` : `node_modules/.bin/tsc` désigne alors l'un OU l'autre
 * selon l'ordre d'installation, sans que rien ne le dise. Le chemin explicite
 * ci-dessous supprime la question.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const RACINE = process.cwd();
const ALIAS = 'typescript-7';

/** Le `tsc` de l'alias, par chemin explicite. `null` s'il n'est pas installé. */
function trouverTsc7() {
  for (const candidat of [
    join(RACINE, 'node_modules', ALIAS, 'bin', 'tsc'),
    // Espaces de travail : l'alias vit à la racine, le script peut être appelé
    // depuis un paquet.
    join(RACINE, '..', 'node_modules', ALIAS, 'bin', 'tsc'),
    join(RACINE, '..', '..', 'node_modules', ALIAS, 'bin', 'tsc'),
  ]) {
    if (existsSync(candidat)) return candidat;
  }
  return null;
}

/** Lit un tsconfig en tolérant commentaires et virgules traînantes. */
function lireTsconfig(chemin) {
  return JSON.parse(
    readFileSync(chemin, 'utf8')
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/,(\s*[}\]])/g, '$1')
  );
}

/**
 * Les projets qui portent VRAIMENT du code, en suivant les `references`.
 *
 * Un projet est « solution » quand il déclare `files: []` sans `include` : il
 * n'existe que pour orchestrer ses références. Le prendre pour cible, c'est
 * compiler le vide (cf. GARDE 1).
 */
function projetsReels(chemin, vus = new Set()) {
  const abs = resolve(chemin);
  if (vus.has(abs) || !existsSync(abs)) return [];
  vus.add(abs);
  let cfg;
  try {
    cfg = lireTsconfig(abs);
  } catch {
    // Illisible ici ne veut pas dire illisible pour `tsc`, qui accepte des
    // formes que ce lecteur simplifié refuse : on le laisse juger.
    return [abs];
  }
  const refs = cfg.references ?? [];
  const solution =
    Array.isArray(cfg.files) && cfg.files.length === 0 && !cfg.include;
  if (refs.length && solution) {
    return refs.flatMap(r => {
      const p = resolve(dirname(abs), r.path);
      return projetsReels(
        p.endsWith('.json') ? p : join(p, 'tsconfig.json'),
        vus
      );
    });
  }
  return [abs];
}

const TSC7 = trouverTsc7();
if (!TSC7) {
  console.error(
    `TypeScript 7 est absent. Il s'installe EN ALIAS, jamais en remplacement —\n` +
      `remplacer \`typescript\` par la 7 éteindrait ESLint pour tout le dépôt :\n\n` +
      `  npm i -D "${ALIAS}@npm:typescript@~7.0.2"\n`
  );
  process.exit(1);
}

const lancer = (args, options = {}) =>
  execFileSync(process.execPath, [TSC7, ...args], {
    cwd: RACINE,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1 << 26,
    ...options,
  });

const version = lancer(['--version']).trim();

// Les projets à juger : ceux passés en argument, sinon ceux déduits du
// `tsconfig.json` racine.
const demandes = process.argv.slice(2).filter(a => !a.startsWith('-'));
const projets = demandes.length
  ? demandes.map(p => resolve(RACINE, p))
  : projetsReels(join(RACINE, 'tsconfig.json'));

if (projets.length === 0) {
  console.error(
    'Aucun projet TypeScript trouvé. Attendu un `tsconfig.json` à la racine,\n' +
      'ou des chemins de tsconfig en arguments.'
  );
  process.exit(1);
}

console.log(`${version} — contrôle de types, en second avis\n`);

let fichiersLus = 0;
let echecs = 0;

for (const projet of projets) {
  const rel = relative(RACINE, projet).replace(/\\/g, '/') || 'tsconfig.json';

  // Combien de fichiers DU DÉPÔT ce projet fait-il lire ? (cf. GARDE 2)
  let fichiers = 0;
  try {
    fichiers = lancer(['--noEmit', '-p', rel, '--listFilesOnly'])
      .split('\n')
      .filter(l => l.trim() && !l.includes('node_modules')).length;
  } catch {
    // `--listFilesOnly` peut échouer là où le contrôle réussit : le compte
    // reste nul, et c'est le bilan global qui tranchera.
  }
  fichiersLus += fichiers;

  // `strict` et compagnie viennent du tsconfig : on ne repasse que `--noEmit`,
  // pour que les deux compilateurs jugent la MÊME configuration.
  try {
    lancer(['--noEmit', '-p', rel]);
    console.log(`  ${rel.padEnd(26)} OK      ${fichiers} fichier(s)`);
  } catch (e) {
    echecs++;
    const sortie = `${e.stdout ?? ''}${e.stderr ?? ''}`.trim();
    console.log(`  ${rel.padEnd(26)} ÉCHEC   ${fichiers} fichier(s)`);
    for (const ligne of sortie.split('\n').filter(Boolean).slice(0, 10)) {
      console.log(`      ${ligne}`);
    }
  }
}

console.log('');

// GARDE 2, appliquée : rien lu ne vaut pas « accepté ».
if (fichiersLus === 0) {
  console.error(
    `AUCUN fichier du dépôt n'a été lu. Ce second avis ne conclut donc RIEN,\n` +
      `et se déclarer vert ici serait un mensonge.\n\n` +
      `Cause la plus fréquente : le tsconfig visé est un projet « solution »\n` +
      `(\`files: []\` + \`references\`) dont les références ne mènent à aucun code.\n` +
      `Passer les tsconfig porteurs en arguments : pwa-typecheck-7 tsconfig.app.json\n`
  );
  process.exit(1);
}

const juges = projets.length;
console.log(
  `${juges - echecs}/${juges} projet(s) accepté(s) par TypeScript ${version.replace('Version ', '')} — ` +
    `${fichiersLus} fichier(s) lus.`
);
console.log('`type-check` (TypeScript 6) reste le contrôle de référence.');
process.exit(echecs ? 1 : 0);
