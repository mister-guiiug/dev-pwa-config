#!/usr/bin/env node
/**
 * Migre les 4 projets consommateurs depuis l'ancien link `file:../dev-config`
 * (paquet @misterguiiug/dev-config) vers le paquet GitHub Packages
 * @misterguiiug/dev-wpa-config en semver.
 *
 * Modifications appliquées par projet :
 *  - package.json : remplace la dep + renomme la clé
 *  - eslint.config.js, prettier.config.js : remplace l'import
 *  - tsconfig.app.json, tsconfig.node.json : remplace `extends`
 *  - vitest.config.ts : remplace l'import
 *  - .npmrc (créé s'il n'existe pas) : ajoute la mapping registry
 *
 * Usage : node scripts/migrate-consumers.mjs [version] [old-name]
 *   version   défaut: ^1.0.0
 *   old-name  défaut: @misterguiiug/dev-config
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PARENT_DIR = join(__dirname, '..', '..');

const VERSION = process.argv[2] ?? '^1.0.0';
const OLD_NAME = process.argv[3] ?? '@misterguiiug/dev-config';
const NEW_NAME = '@misterguiiug/dev-wpa-config';
const REGISTRY_LINE = '@misterguiiug:registry=https://npm.pkg.github.com';

const PROJECTS = ['miss-carbook', 'miss-contraction', 'mister-cim10', 'mister-puzzle'];

function patchFile(path, transform) {
  if (!existsSync(path)) return false;
  const before = readFileSync(path, 'utf8');
  const after = transform(before);
  if (before === after) return false;
  writeFileSync(path, after);
  return true;
}

function patchPackageJson(path) {
  return patchFile(path, content => {
    const json = JSON.parse(content);
    let touched = false;
    for (const section of ['dependencies', 'devDependencies']) {
      if (json[section] && OLD_NAME in json[section]) {
        delete json[section][OLD_NAME];
        json[section][NEW_NAME] = VERSION;
        // Re-trier alphabétiquement
        json[section] = Object.fromEntries(
          Object.entries(json[section]).sort(([a], [b]) => a.localeCompare(b))
        );
        touched = true;
      }
    }
    return touched ? JSON.stringify(json, null, 2) + '\n' : content;
  });
}

function patchTextFile(path) {
  return patchFile(path, content =>
    content.split(OLD_NAME).join(NEW_NAME)
  );
}

function ensureNpmrc(projectRoot) {
  const path = join(projectRoot, '.npmrc');
  const existing = existsSync(path) ? readFileSync(path, 'utf8') : '';
  if (existing.includes('@misterguiiug:registry')) return false;
  const next = existing
    ? existing.replace(/\s*$/, '\n') + REGISTRY_LINE + '\n'
    : REGISTRY_LINE + '\n';
  writeFileSync(path, next);
  return true;
}

function walkConfigs(projectRoot) {
  const candidates = [
    'eslint.config.js',
    'prettier.config.js',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
    'vitest.config.ts',
    'vitest.config.js',
    'README.md',
  ];
  const changed = [];
  for (const c of candidates) {
    if (patchTextFile(join(projectRoot, c))) changed.push(c);
  }
  return changed;
}

let totalChanged = 0;
for (const project of PROJECTS) {
  const root = join(PARENT_DIR, project);
  if (!existsSync(root)) {
    console.log(`⚠️  ${project} introuvable, skip`);
    continue;
  }
  const changes = [];
  if (patchPackageJson(join(root, 'package.json'))) changes.push('package.json');
  changes.push(...walkConfigs(root));
  if (ensureNpmrc(root)) changes.push('.npmrc');
  if (changes.length === 0) {
    console.log(`✓  ${project} : déjà migré`);
  } else {
    console.log(`✅  ${project} : ${changes.join(', ')}`);
    totalChanged += changes.length;
  }
}

console.log(`\nDone. ${totalChanged} fichier(s) modifiés au total.\n`);
console.log('Étapes suivantes :');
console.log('  1. Pousser dev-wpa-config (cf. README) avec un tag v1.0.0');
console.log('  2. Attendre que le workflow publish.yml termine sur GitHub');
console.log('  3. Authentifier npm localement (cf. README, section Étape 3)');
console.log("  4. Dans chaque consumer : rm -rf node_modules package-lock.json && npm install");
