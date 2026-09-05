#!/usr/bin/env node
/**
 * Met à jour les projets consommateurs vers une version cible de
 * `@mister-guiiug/dev-pwa-config`, en **alignant aussi les peerDependencies**
 * que le consommateur déclare déjà (ex. `lucide-react` 0.x → 1.x, `vitest`).
 *
 * Auto-découverte : tout dossier frère (`../*`) dont le `package.json` dépend de
 * `@mister-guiiug/dev-pwa-config`. Plus de liste codée en dur.
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
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { PKG_NAME, isConsumerDir, planUpdates } from './migrate-plan.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SELF_ROOT = join(__dirname, '..');
const PARENT_DIR = join(SELF_ROOT, '..');

const selfPkg = JSON.parse(
  readFileSync(join(SELF_ROOT, 'package.json'), 'utf8')
);
const peers = selfPkg.peerDependencies ?? {};

const args = process.argv.slice(2);
const WRITE = args.includes('--write') || args.includes('--install');
const INSTALL = args.includes('--install');

/**
 * LES PEERS NE SUIVENT PLUS PAR DÉFAUT — c'est désormais `--peers` qui les
 * demande.
 *
 * Aligner les peers paraît anodin tant que le parc est homogène. Il ne l'est
 * pas : `mister-quota`, seule app Electron, est restée sur React 18, Vite 5,
 * TypeScript 5, Vitest 2 et ESLint 8. Un simple « aligne le plancher du
 * socle » y proposait donc **cinq montées majeures** — une migration de cadre
 * complète, dans le même geste et sans la nommer.
 *
 * Deux intentions distinctes méritent deux drapeaux : monter le paquet est
 * mécanique et sûr, monter les peers est un chantier qui se décide.
 */
const PEERS = args.includes('--peers');
const versionArg = args.find(a => !a.startsWith('--'));
const TARGET = `^${(versionArg ?? selfPkg.version).replace(/^[\^~]/, '')}`;

const readJson = p => JSON.parse(readFileSync(p, 'utf8'));

/** Découvre les dossiers consommateurs (frères) qui dépendent du paquet. */
function discoverConsumers() {
  return readdirSync(PARENT_DIR)
    .filter(d => {
      const p = join(PARENT_DIR, d, 'package.json');
      if (!existsSync(p)) return false;
      try {
        return isConsumerDir(d, readJson(p));
      } catch {
        return false;
      }
    })
    .sort();
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
  const updates = planUpdates(pkg, { target: TARGET, peers, withPeers: PEERS });

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
