#!/usr/bin/env node
/**
 * Relève les `console.error` / `console.warn` orphelins des apps — la carte de
 * la campagne « journal partout ».
 *
 * POURQUOI UN AUDIT ET PAS UN CODEMOD. Remplacer `console.error('échec')` par
 * un appel au journal exige de CHOISIR un nom de logger — « échec » de quoi ?
 * C'est précisément l'information que la ligne d'origine n'a pas, et qu'une
 * réécriture automatique ne peut pas inventer sans mentir. L'audit fait donc
 * ce qui s'automatise : trouver chaque ligne, proposer un nom déduit du
 * chemin, et compter — le codemod s'arrête où le jugement commence.
 *
 *   node scripts/console-audit.mjs [--root ../mister-guiiug] [--app id]
 *
 * Le relevé du socle (en-tête de `logger.js`) comptait 59 occurrences dans
 * quatorze apps ; cet outil rend le chiffre re-mesurable à chaque campagne.
 *
 * Non publié (absent de `files`) : outil de développement du dépôt.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAMILY_APPS } from '../apps-catalog.js';

const SKIP = new Set(['node_modules', 'dist', 'build', '.git', 'coverage']);

/**
 * Les occurrences dans une source. Ignore celles qui passent DÉJÀ par un
 * journal (fichiers logger/observability : c'est leur transport, pas un
 * orphelin) — l'appelant filtre par chemin.
 */
export function findConsoleCalls(source) {
  const found = [];
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const match = lines[i].match(/console\.(error|warn)\s*\(/);
    if (!match) continue;
    // Une ligne commentée n'est pas un appel.
    const before = lines[i].slice(0, match.index);
    if (/^\s*(\/\/|\*)/.test(before) || before.includes('//')) continue;
    found.push({
      line: i + 1,
      level: match[1],
      text: lines[i].trim().slice(0, 120),
    });
  }
  return found;
}

/**
 * Un nom de journal déduit du chemin : `src/features/favoris/store.ts` →
 * `favoris`. Une PROPOSITION, pas une décision — c'est écrit dans le rapport.
 */
export function suggestLoggerName(filePath) {
  const parts = dirname(filePath).split('/').filter(Boolean);
  const featureIdx = parts.lastIndexOf('features');
  if (featureIdx !== -1 && parts[featureIdx + 1]) return parts[featureIdx + 1];
  const last = parts[parts.length - 1];
  if (last && !['src', 'lib', 'utils', 'shared', 'api'].includes(last))
    return last;
  return basename(filePath).replace(/\.[jt]sx?$/, '');
}

/** Le transport du journal lui-même n'est pas un orphelin. */
export function isLoggerTransport(filePath) {
  return /logger|observab|error-reporter|register-sw/i.test(filePath);
}

function sourceFiles(dir, found = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, found);
    else if (
      /\.[jt]sx?$/.test(entry.name) &&
      !/\.(test|spec)\./.test(entry.name)
    )
      found.push(full);
  }
  return found;
}

/* ── Exécution ─────────────────────────────────────────────────────────── */

// Seulement lancé DIRECTEMENT : importé (par les tests des fonctions pures),
// le module ne doit ni lire le disque ni écrire dans la console.
const invokedDirectly =
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1]}`).href;

if (invokedDirectly) {
  main();
}

function main() {
  const args = process.argv.slice(2);
  const flag = name => {
    const index = args.indexOf(`--${name}`);
    return index === -1 ? undefined : args[index + 1];
  };

  const here = fileURLToPath(new URL('..', import.meta.url));
  const root = flag('root') ?? join(here, '..');
  const onlyApp = flag('app');

  let total = 0;
  let appsVus = 0;

  for (const app of FAMILY_APPS) {
    if (onlyApp && app.id !== onlyApp) continue;
    const appDir = join(root, app.id);
    try {
      if (!statSync(appDir).isDirectory()) continue;
    } catch {
      continue;
    }
    appsVus += 1;

    const rows = [];
    for (const file of sourceFiles(join(appDir, 'src'))) {
      const rel = relative(appDir, file);
      if (isLoggerTransport(rel)) continue;
      for (const call of findConsoleCalls(readFileSync(file, 'utf8'))) {
        rows.push({ rel, ...call });
      }
    }
    if (rows.length === 0) continue;

    total += rows.length;
    console.log(`\n■ ${app.id} — ${rows.length} orphelin(s)`);
    for (const row of rows) {
      console.log(
        `  ${row.rel}:${row.line}  [${row.level}]  → createLogger('${suggestLoggerName(row.rel)}') ?`
      );
      console.log(`      ${row.text}`);
    }
  }

  console.log(
    `\n${total} console.error/warn orphelin(s) sur ${appsVus} app(s) présentes sous ${root}.`
  );
  if (total > 0) {
    console.log(
      'Le nom proposé est déduit du chemin : une proposition, pas une décision.'
    );
  }
}
