#!/usr/bin/env node
/**
 * Met à jour les projets consommateurs vers une version cible de
 * `@mister-guiiug/dev-wpa-config`, en **alignant aussi les peerDependencies**
 * que le consommateur déclare déjà (ex. `lucide-react` 0.x → 1.x, `vitest`).
 *
 * Auto-découverte : tout dossier frère (`../*`) dont le `package.json` dépend de
 * `@mister-guiiug/dev-wpa-config`. Plus de liste codée en dur.
 *
 * Usage :
 *   node scripts/migrate-consumers.mjs [version] [--write] [--install]
 *     version    défaut : version de CE paquet (package.json local) → `^x.y.z`
 *     --write    applique les changements (sinon dry-run, rien n'est écrit)
 *     --install  lance `npm install` dans chaque projet modifié (implique --write)
 *
 * Exemples :
 *   node scripts/migrate-consumers.mjs              # dry-run vers la version locale
 *   node scripts/migrate-consumers.mjs 1.5.0 --write
 *   node scripts/migrate-consumers.mjs --install
 */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SELF_ROOT = join(__dirname, '..');
const PARENT_DIR = join(SELF_ROOT, '..');
const PKG_NAME = '@mister-guiiug/dev-wpa-config';

const selfPkg = JSON.parse(
  readFileSync(join(SELF_ROOT, 'package.json'), 'utf8')
);
const peers = selfPkg.peerDependencies ?? {};

const args = process.argv.slice(2);
const WRITE = args.includes('--write') || args.includes('--install');
const INSTALL = args.includes('--install');
const versionArg = args.find(a => !a.startsWith('--'));
const TARGET = `^${(versionArg ?? selfPkg.version).replace(/^[\^~]/, '')}`;

const readJson = p => JSON.parse(readFileSync(p, 'utf8'));

/** Le consommateur déclare-t-il ce paquet ? Renvoie [section, range] ou null. */
function findDep(pkg, name) {
  for (const section of ['dependencies', 'devDependencies']) {
    if (pkg[section]?.[name] != null) return [section, pkg[section][name]];
  }
  return null;
}

/** Borne basse majeure d'un range semver simple (`^1.2.3` → 1, `0.469.0` → 0). */
function majorOf(range) {
  const m = String(range).match(/(\d+)\./);
  return m ? Number(m[1]) : null;
}

/** Découvre les dossiers consommateurs (frères) qui dépendent du paquet. */
function discoverConsumers() {
  return readdirSync(PARENT_DIR)
    .filter(d => {
      const p = join(PARENT_DIR, d, 'package.json');
      if (d === 'dev-wpa-config' || !existsSync(p)) return false;
      try {
        return findDep(readJson(p), PKG_NAME) != null;
      } catch {
        return false;
      }
    })
    .sort();
}

function planUpdates(pkg) {
  const updates = [];

  // 1. Le paquet lui-même → version cible.
  const own = findDep(pkg, PKG_NAME);
  if (own && own[1] !== TARGET) {
    updates.push({ section: own[0], name: PKG_NAME, from: own[1], to: TARGET });
  }

  // 2. Peers déclarés dont la majeure ne correspond pas à celle exigée.
  for (const [name, peerRange] of Object.entries(peers)) {
    const dep = findDep(pkg, name);
    if (!dep) continue;
    const want = majorOf(peerRange);
    const have = majorOf(dep[1]);
    if (want != null && have != null && have < want) {
      updates.push({ section: dep[0], name, from: dep[1], to: peerRange });
    }
  }
  return updates;
}

const consumers = discoverConsumers();
console.log(
  `Cible : ${PKG_NAME}@${TARGET}  ·  ${consumers.length} consommateur(s)  ·  ` +
    `${WRITE ? 'ÉCRITURE' : 'DRY-RUN'}\n`
);

let touched = 0;
for (const name of consumers) {
  const root = join(PARENT_DIR, name);
  const pkgPath = join(root, 'package.json');
  const pkg = readJson(pkgPath);
  const updates = planUpdates(pkg);

  if (updates.length === 0) {
    console.log(`✓  ${name} : déjà à jour`);
    continue;
  }

  for (const u of updates) {
    console.log(`   ${name} · ${u.section}.${u.name} : ${u.from} → ${u.to}`);
    if (WRITE) pkg[u.section][u.name] = u.to;
  }

  if (WRITE) {
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    if (INSTALL) {
      console.log(`   ↳ npm install (${name})…`);
      execSync('npm install', { cwd: root, stdio: 'inherit' });
    }
  }
  touched++;
}

console.log(
  `\n${WRITE ? 'Modifiés' : 'À modifier'} : ${touched}/${consumers.length}.` +
    (WRITE
      ? ''
      : '  Relancer avec --write pour appliquer, --install pour installer.')
);
