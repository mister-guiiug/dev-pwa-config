#!/usr/bin/env node
/**
 * Synchronise les copies que le showroom embarque.
 *
 *   npm run showroom:sync
 *
 * Le showroom est une page STATIQUE, chargeable en `file://` : pas de bundler,
 * pas de modules ES (bloqués par CORS sur `file://`). Il ne peut donc ni
 * importer `components.css` depuis la racine, ni `import` le catalogue. Deux
 * copies vivent par conséquent dans `showroom/` — et une copie n'est acceptable
 * que si elle est ENGENDRÉE et VÉRIFIÉE :
 *
 *   components.css  → copie octet pour octet (le showroom montre littéralement
 *                     ce que reçoit une app consommatrice) ;
 *   apps.js         → `globalThis.SHOWROOM_APPS`, projection du catalogue.
 *
 * `test/apps-catalog.test.mjs` compare le miroir au catalogue : oublier ce
 * script casse `npm test`, pas la page en production.
 *
 * Non publié (absent de `files`) : outil de développement du dépôt.
 */
import { copyFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  FAMILY_APPS,
  GITHUB_OWNER,
  SPONSOR_URL,
  MATURITIES,
  CATEGORIES,
  BACKENDS,
  PLATFORMS,
} from '../apps-catalog.js';

const root = new URL('../', import.meta.url);
const at = path => fileURLToPath(new URL(path, root));

/** Projection sérialisable du catalogue, telle que la lit `showroom.js`. */
export function showroomAppsData() {
  return {
    owner: GITHUB_OWNER,
    sponsorUrl: SPONSOR_URL,
    maturities: MATURITIES,
    categories: CATEGORIES,
    backends: BACKENDS,
    platforms: PLATFORMS,
    // `JSON.parse(JSON.stringify(…))` laisse tomber les champs `undefined`
    // exactement comme le fera le fichier généré : le miroir et la source
    // comparés par le test décrivent alors la même chose.
    apps: JSON.parse(JSON.stringify(FAMILY_APPS)),
  };
}

const HEADER = `/*
 * FICHIER GÉNÉRÉ — ne pas modifier à la main.
 *
 * Source : \`apps-catalog.js\` à la racine du paquet.
 * Régénérer : \`npm run showroom:sync\`.
 *
 * Le showroom ne peut pas \`import\` le catalogue (page statique, \`file://\`) :
 * il en lit ce miroir, posé sur \`globalThis\` comme \`themes.js\` et
 * \`screenshots.js\`. \`test/apps-catalog.test.mjs\` vérifie qu'il ne dérive pas.
 */
globalThis.SHOWROOM_APPS = `;

async function format(source, filepath) {
  try {
    const prettier = await import('prettier');
    const config = (await prettier.resolveConfig(filepath)) ?? {};
    return await prettier.format(source, { ...config, filepath });
  } catch {
    // Prettier absent (installation sans devDependencies) : le fichier reste
    // valide, `npm run format` le remettra d'aplomb.
    return source;
  }
}

async function main() {
  copyFileSync(at('components.css'), at('showroom/components.css'));

  const target = at('showroom/apps.js');
  const body = `${HEADER}${JSON.stringify(showroomAppsData(), null, 2)};\n`;
  writeFileSync(target, await format(body, target));

  console.log(
    `showroom/components.css et showroom/apps.js régénérés (${FAMILY_APPS.length} apps).`
  );
}

// Importable par les tests sans rien réécrire sur le disque.
if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
