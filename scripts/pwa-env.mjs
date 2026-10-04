#!/usr/bin/env node
/**
 * Manifeste d'environnement — une vérité, le reste dérivé.
 *
 * CONFIG.md phase 2 : `config/env.manifest.json` déclare chaque valeur
 * (store, phase, required). `check` valide hors ligne ; `sync` engendre
 * `.env.example` et les blocs `build-env` / `secrets:` / `required-env` du
 * `deploy.yml` ; `audit` compare au réel GitHub via `gh`.
 *
 *   pwa-env check [--dir .]
 *   pwa-env sync [--dir .] [--write]
 *   pwa-env audit [--dir .]
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { estPointDEntree } from './entree.mjs';

const MANIFEST_REL = 'config/env.manifest.json';
const STORES = new Set(['vars', 'secrets', 'local', 'committed']);
const PHASES = new Set(['build', 'deploy', 'server']);
const REQUIRED = new Set(['always', 'prod', 'optional']);

/** @typedef {{ name: string, store: string, phase: string, required?: string, purpose?: string, fallback?: string, provider?: string, exception?: string, rotation?: string, lastRotated?: string }} EnvEntry */
/** @typedef {{ app?: string, entries: EnvEntry[] }} EnvManifest */

export function loadManifest(root) {
  const path = join(root, MANIFEST_REL);
  if (!existsSync(path)) return null;
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  if (!raw || typeof raw !== 'object') {
    throw new Error(`${MANIFEST_REL} : JSON objet attendu`);
  }
  if (!Array.isArray(raw.entries)) {
    throw new Error(`${MANIFEST_REL} : « entries » (tableau) obligatoire`);
  }
  return /** @type {EnvManifest} */ (raw);
}

/**
 * Invariants mécaniques (CONFIG.md) : VITE_* ≠ secrets, secrets ≠ VITE_*,
 * exception ≥ 30 caractères, champs connus.
 *
 * @param {EnvManifest} manifest
 * @returns {{ errors: string[], warnings: string[] }}
 */
export function validateManifest(manifest) {
  const errors = [];
  const warnings = [];
  const seen = new Set();

  for (const [i, entry] of manifest.entries.entries()) {
    const where = `entries[${i}]`;
    if (!entry || typeof entry !== 'object') {
      errors.push(`${where} : objet attendu`);
      continue;
    }
    const name = entry.name;
    if (!name || typeof name !== 'string' || !/^[A-Z][A-Z0-9_]*$/.test(name)) {
      errors.push(`${where}.name : identifiant SCREAMING_SNAKE attendu`);
      continue;
    }
    if (seen.has(name)) errors.push(`${name} : déclaré deux fois`);
    seen.add(name);

    if (!STORES.has(entry.store)) {
      errors.push(
        `${name}.store : « ${entry.store} » — attendu vars|secrets|local|committed`
      );
    }
    if (!PHASES.has(entry.phase)) {
      errors.push(
        `${name}.phase : « ${entry.phase} » — attendu build|deploy|server`
      );
    }
    if (entry.required !== undefined && !REQUIRED.has(entry.required)) {
      errors.push(
        `${name}.required : « ${entry.required} » — always|prod|optional`
      );
    }

    const vite = name.startsWith('VITE_');
    const exception =
      typeof entry.exception === 'string' &&
      entry.exception.trim().length >= 30;

    if (vite && entry.store === 'secrets' && !exception) {
      errors.push(
        `${name} : VITE_* ne peut pas être store « secrets » (Vite la copie dans le bundle) — exception ≥ 30 caractères pour déroger`
      );
    }
    if (
      !vite &&
      entry.store === 'vars' &&
      entry.phase === 'build' &&
      !exception
    ) {
      warnings.push(
        `${name} : store « vars » sans préfixe VITE_ — le navigateur ne la verra pas au build Vite`
      );
    }
    if (entry.store === 'secrets' && vite && !exception) {
      /* déjà couvert */
    }
    if (
      typeof entry.exception === 'string' &&
      entry.exception.trim().length > 0 &&
      entry.exception.trim().length < 30
    ) {
      errors.push(
        `${name}.exception : ${entry.exception.trim().length} caractères — minimum 30`
      );
    }
  }

  return { errors, warnings };
}

/** Noms déclarés dans `.env.example` (lignes KEY=…). */
export function parseEnvExample(text) {
  const names = new Set();
  for (const line of String(text).split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const m = trimmed.match(/^([A-Z][A-Z0-9_]*)=/);
    if (m) names.add(m[1]);
  }
  return names;
}

/**
 * Compare manifeste ↔ `.env.example` (entrées build/local/committed visibles
 * localement). Les secrets de deploy n'y figurent pas.
 *
 * @param {EnvManifest} manifest
 * @param {string | null} envExampleText
 */
export function compareEnvExample(manifest, envExampleText) {
  const errors = [];
  const expected = new Set(
    manifest.entries
      .filter(
        e =>
          e.phase === 'build' &&
          (e.store === 'vars' || e.store === 'local' || e.store === 'committed')
      )
      .map(e => e.name)
  );
  if (envExampleText === null) {
    if (expected.size) {
      errors.push(
        `.env.example absent alors que ${expected.size} entrée(s) build sont déclarées — pwa-env sync --write`
      );
    }
    return { errors, expected, actual: new Set() };
  }
  const actual = parseEnvExample(envExampleText);
  for (const name of expected) {
    if (!actual.has(name)) {
      errors.push(`${name} dans le manifeste, absent de .env.example`);
    }
  }
  for (const name of actual) {
    if (!expected.has(name) && !manifest.entries.some(e => e.name === name)) {
      errors.push(`${name} dans .env.example, absent du manifeste`);
    }
  }
  return { errors, expected, actual };
}

/** engendre le corps de `.env.example`. */
export function renderEnvExample(manifest) {
  const lines = [
    `# Engendré par \`pwa-env sync\` depuis ${MANIFEST_REL}.`,
    `# Ne pas éditer à la main : modifier le manifeste, puis relancer sync --write.`,
    '',
  ];
  if (manifest.app) lines.splice(1, 0, `# App : ${manifest.app}`);

  const build = manifest.entries.filter(
    e =>
      e.phase === 'build' &&
      (e.store === 'vars' || e.store === 'local' || e.store === 'committed')
  );
  for (const e of build) {
    if (e.purpose) lines.push(`# ${e.purpose}`);
    if (e.fallback) lines.push(`# Repli : ${e.fallback}`);
    lines.push(`${e.name}=`);
    lines.push('');
  }
  return lines.join('\n').replace(/\n+$/, '\n');
}

/**
 * Blocs YAML pour un caller `pwa-deploy`.
 * @param {EnvManifest} manifest
 */
export function renderDeployBlocks(manifest) {
  const buildVars = manifest.entries.filter(
    e => e.phase === 'build' && e.store === 'vars'
  );
  const deploySecrets = manifest.entries.filter(
    e => e.store === 'secrets' && (e.phase === 'deploy' || e.phase === 'build')
  );
  const required = manifest.entries.filter(
    e =>
      e.phase === 'build' &&
      e.store === 'vars' &&
      (e.required === 'prod' || e.required === 'always')
  );

  const buildEnv = buildVars
    .map(e => `        ${e.name}=\${{ vars.${e.name} }}`)
    .join('\n');
  const requiredEnv = required.map(e => `        ${e.name}`).join('\n');
  const secrets = deploySecrets
    .map(e => `      ${e.name}: \${{ secrets.${e.name} }}`)
    .join('\n');

  return { buildEnv, requiredEnv, secrets, buildVars, deploySecrets, required };
}

/**
 * Bloc littéral YAML `key: |` ancré en début de ligne.
 * Ne consomme que les lignes **strictement plus indentées** que la clé —
 * sinon `firebase-project:` (même niveau que `build-env:`) disparaît, et un
 * commentaire contenant `` `build-env: |` `` est pris pour le vrai bloc.
 * @param {string} text
 * @param {string} key
 * @returns {{ index: number, length: number, indent: string, body: string } | null}
 */
export function matchYamlLiteralBlock(text, key) {
  const re = new RegExp(`^([ \\t]*)${key}:\\s*\\|[^\\n]*\\n`, 'm');
  const m = re.exec(text);
  if (!m) return null;
  const indent = m[1];
  let length = m[0].length;
  const bodyLines = [];
  for (const raw of text.slice(m.index + m[0].length).split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) {
      // Ligne vide : encore dans le bloc si le suivant reste plus indenté.
      bodyLines.push(line);
      length += raw.length + 1;
      continue;
    }
    const deeper =
      line.startsWith(indent) &&
      (line.startsWith(`${indent} `) || line.startsWith(`${indent}\t`));
    if (!deeper) break;
    bodyLines.push(line);
    length += raw.length + 1;
  }
  // Retirer les lignes vides traînantes comptées trop tôt.
  while (bodyLines.length && !bodyLines[bodyLines.length - 1].trim()) {
    const dropped = bodyLines.pop();
    length -= (dropped?.length ?? 0) + 1;
  }
  return {
    index: m.index,
    length,
    indent,
    body: bodyLines.join('\n'),
  };
}

/**
 * Lignes `build-env` hors manifeste à conserver (expressions GitHub, etc.).
 * @param {string} text
 * @param {Set<string>} knownNames
 */
export function preserveBuildEnvExtras(text, knownNames) {
  const hit = matchYamlLiteralBlock(text, 'build-env');
  if (!hit) return [];
  const extras = [];
  for (const raw of hit.body.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    if (!line.trim()) continue;
    const trimmed = line.trim();
    const name = /^([A-Z][A-Z0-9_]*)=/.exec(trimmed)?.[1];
    if (!name || knownNames.has(name)) continue;
    // Une ligne `vars.X` absente du manifeste est un orphelin : on la retire.
    // On ne garde que les expressions hors vars (github.*, secrets littéraux…).
    if (/\$\{\{\s*vars\./.test(trimmed)) continue;
    extras.push(line);
  }
  return extras;
}

/**
 * @param {string} text
 * @param {{ index: number, length: number }} hit
 * @param {string} replacement
 */
function replaceSpan(text, hit, replacement) {
  return (
    text.slice(0, hit.index) + replacement + text.slice(hit.index + hit.length)
  );
}

/**
 * Remplace ou injecte les blocs engendrés dans un deploy.yml existant.
 * @returns {{ text: string, changed: boolean, reason?: string }}
 */
export function patchDeployYml(text, blocks) {
  if (!/pwa-deploy\.yml@/.test(text)) {
    return {
      text,
      changed: false,
      reason: 'deploy.yml n’appelle pas pwa-deploy.yml',
    };
  }

  let next = text;
  let changed = false;

  if (blocks.buildVars.length) {
    const hit = matchYamlLiteralBlock(next, 'build-env');
    const ind = hit?.indent ?? '      ';
    const known = new Set(blocks.buildVars.map(e => e.name));
    const extras = preserveBuildEnvExtras(next, known);
    const body = [...extras, ...blocks.buildEnv.split('\n').filter(Boolean)]
      .map(l => (l.startsWith(' ') ? l : `${ind}  ${l.trim()}`))
      .join('\n');
    const block = `${ind}build-env: |\n${body}\n`;
    if (hit) {
      const updated = replaceSpan(next, hit, block);
      if (updated !== next) {
        next = updated;
        changed = true;
      }
    } else {
      next = next.replace(/(with:\s*\n)/, `$1${block}`);
      changed = true;
    }
  }

  if (blocks.required.length) {
    const hit = matchYamlLiteralBlock(next, 'required-env');
    const ind =
      hit?.indent ?? matchYamlLiteralBlock(next, 'build-env')?.indent ?? '      ';
    const block = `${ind}required-env: |\n${blocks.requiredEnv}\n`;
    if (hit) {
      const updated = replaceSpan(next, hit, block);
      if (updated !== next) {
        next = updated;
        changed = true;
      }
    } else {
      const buildHit = matchYamlLiteralBlock(next, 'build-env');
      if (buildHit) {
        next = replaceSpan(next, buildHit, `${next.slice(buildHit.index, buildHit.index + buildHit.length)}${block}`);
        changed = true;
      }
    }
  }

  if (blocks.deploySecrets.length) {
    const block = `    secrets:\n${blocks.secrets}\n`;
    const secretsRe =
      /^([ \t]*)secrets:\s*\n(?:[ \t]+[A-Z0-9_]+:\s*\$\{\{\s*secrets\.[A-Z0-9_]+\s*\}\}[^\n]*\n)*/m;
    if (secretsRe.test(next)) {
      const updated = next.replace(secretsRe, block);
      if (updated !== next) {
        next = updated;
        changed = true;
      }
    } else {
      next = next.replace(
        /(uses:\s*[^\n]*pwa-deploy\.yml@[^\n]+\n(?:[ \t]+with:[\s\S]*?)(?=\n\S|\n*$))/,
        m => `${m.trimEnd()}\n${block}`
      );
      changed = next !== text || changed;
    }
  }

  return { text: next, changed };
}

/**
 * @param {string} root
 * @returns {{ ok: boolean, errors: string[], warnings: string[] }}
 */
export function check(root) {
  const errors = [];
  const warnings = [];
  let manifest;
  try {
    manifest = loadManifest(root);
  } catch (e) {
    return { ok: false, errors: [String(e.message || e)], warnings };
  }
  if (!manifest) {
    return {
      ok: true,
      errors: [],
      warnings: [
        `${MANIFEST_REL} absent — opt-in ; créer le fichier pour activer pwa-env`,
      ],
    };
  }
  const v = validateManifest(manifest);
  errors.push(...v.errors);
  warnings.push(...v.warnings);

  const envText = existsSync(join(root, '.env.example'))
    ? readFileSync(join(root, '.env.example'), 'utf8')
    : null;
  const cmp = compareEnvExample(manifest, envText);
  errors.push(...cmp.errors);

  return { ok: errors.length === 0, errors, warnings };
}

/**
 * @param {string} root
 * @param {{ write?: boolean }} [options]
 */
export function sync(root, options = {}) {
  const manifest = loadManifest(root);
  if (!manifest) {
    return {
      ok: false,
      errors: [`${MANIFEST_REL} absent`],
      planned: [],
      written: [],
    };
  }
  const v = validateManifest(manifest);
  if (v.errors.length) {
    return { ok: false, errors: v.errors, planned: [], written: [] };
  }

  const planned = [];
  const written = [];
  const envPath = join(root, '.env.example');
  const envNext = renderEnvExample(manifest);
  const envPrev = existsSync(envPath) ? readFileSync(envPath, 'utf8') : null;
  if (envPrev !== envNext) {
    planned.push('.env.example');
    if (options.write) {
      writeFileSync(envPath, envNext);
      written.push('.env.example');
    }
  }

  const deployRel = existsSync(join(root, '.github/workflows/deploy.yml'))
    ? '.github/workflows/deploy.yml'
    : existsSync(join(root, '.github/workflows/pages.yml'))
      ? '.github/workflows/pages.yml'
      : null;

  if (deployRel) {
    const blocks = renderDeployBlocks(manifest);
    const prev = readFileSync(join(root, deployRel), 'utf8');
    const { text, changed, reason } = patchDeployYml(prev, blocks);
    if (reason && !changed) {
      /* rien */
    } else if (changed) {
      planned.push(deployRel);
      if (options.write) {
        writeFileSync(join(root, deployRel), text);
        written.push(deployRel);
      }
    }
  }

  return { ok: true, errors: [], planned, written, dryRun: !options.write };
}

function ghJson(args) {
  const out = execFileSync('gh', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return out.trim() ? JSON.parse(out) : null;
}

/**
 * Audit GitHub (vars / secrets) vs manifeste. Exige `gh` authentifié.
 * @param {string} root
 * @param {{ repo?: string, exec?: typeof ghJson }} [options]
 */
export function audit(root, options = {}) {
  const manifest = loadManifest(root);
  if (!manifest) {
    return { ok: false, errors: [`${MANIFEST_REL} absent`], gaps: [] };
  }
  const v = validateManifest(manifest);
  if (v.errors.length) {
    return { ok: false, errors: v.errors, gaps: [] };
  }

  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const fromPkg =
    typeof pkg.repository === 'string'
      ? pkg.repository.replace(/^git\+/, '').replace(/\.git$/, '')
      : pkg.repository?.url
        ? String(pkg.repository.url)
            .replace(/^git\+/, '')
            .replace(/\.git$/, '')
            .replace(/^https:\/\/github\.com\//, '')
        : null;
  let fromGit = null;
  try {
    fromGit = execFileSync('git', ['-C', root, 'remote', 'get-url', 'origin'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    /* pas un clone git, ou pas de remote */
  }
  const repo = options.repo || fromPkg || fromGit;
  const slug = (() => {
    if (!repo) return null;
    const s = String(repo)
      .replace(/^git\+/, '')
      .replace(/\.git$/, '')
      .replace(/^https:\/\/github\.com\//, '')
      .replace(/^git@github\.com:/, '');
    return s.includes('github.com/')
      ? s.split('github.com/')[1].replace(/\/$/, '')
      : s;
  })();
  if (!slug || !slug.includes('/')) {
    return {
      ok: false,
      errors: [
        'dépôt GitHub introuvable (package.json repository ou git remote origin)',
      ],
      gaps: [],
    };
  }

  const run = options.exec ?? ghJson;
  /** @type {string[]} */
  let varNames;
  /** @type {string[]} */
  let secretNames;
  try {
    const vData = run([
      'api',
      `repos/${slug}/actions/variables`,
      '--jq',
      '.variables',
    ]);
    varNames = Array.isArray(vData) ? vData.map(x => x.name) : [];
    const sData = run([
      'api',
      `repos/${slug}/actions/secrets`,
      '--jq',
      '.secrets',
    ]);
    secretNames = Array.isArray(sData) ? sData.map(x => x.name) : [];
  } catch (e) {
    return {
      ok: false,
      errors: [`gh api a échoué : ${e.stderr || e.message || e}`],
      gaps: [],
    };
  }

  const onGh = {
    vars: new Set(varNames),
    secrets: new Set(secretNames),
  };
  /** @type {Array<{ kind: string, name: string, detail: string }>} */
  const gaps = [];

  for (const e of manifest.entries) {
    if (e.store === 'local' || e.store === 'committed') continue;
    if (e.required === 'optional') continue;
    const bag = e.store === 'secrets' ? onGh.secrets : onGh.vars;
    const other = e.store === 'secrets' ? onGh.vars : onGh.secrets;
    if (!bag.has(e.name)) {
      if (other.has(e.name)) {
        gaps.push({
          kind: 'mal rangé',
          name: e.name,
          detail: `attendu en ${e.store}, trouvé ailleurs`,
        });
      } else {
        gaps.push({
          kind: 'manquant',
          name: e.name,
          detail: `requis (${e.required ?? 'prod'}) en ${e.store}`,
        });
      }
    }
  }

  const declared = new Set(manifest.entries.map(e => e.name));
  for (const name of onGh.vars) {
    if (!declared.has(name) && name.startsWith('VITE_')) {
      gaps.push({
        kind: 'orphelin',
        name,
        detail: 'var GitHub absente du manifeste',
      });
    }
  }
  for (const name of onGh.secrets) {
    if (!declared.has(name) && !['GITHUB_TOKEN'].includes(name)) {
      gaps.push({
        kind: 'orphelin',
        name,
        detail: 'secret GitHub absent du manifeste',
      });
    }
  }

  return { ok: gaps.length === 0, errors: [], gaps, repo: slug };
}

export function formatCheck(result) {
  const lines = [];
  for (const e of result.errors) lines.push(`✖ ${e}`);
  for (const w of result.warnings) lines.push(`i ${w}`);
  if (!lines.length) lines.push('pwa-env check : ok');
  else {
    lines.push(
      `\n${result.errors.length} erreur(s), ${result.warnings.length} avertissement(s)`
    );
  }
  return lines.join('\n');
}

export async function run(args = []) {
  const at = flag =>
    args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
  const dir = resolve(at('--dir') ?? process.cwd());
  const cmd = args.find(a => !a.startsWith('-')) ?? 'check';

  if (!existsSync(dir)) {
    console.error(`pwa-env : dossier introuvable : ${dir}`);
    return 2;
  }

  if (cmd === 'check') {
    const result = check(dir);
    console.log(formatCheck(result));
    return result.ok ? 0 : 1;
  }

  if (cmd === 'sync') {
    const result = sync(dir, { write: args.includes('--write') });
    if (!result.ok) {
      for (const e of result.errors) console.error(`✖ ${e}`);
      return 1;
    }
    if (!result.planned.length) {
      console.log('pwa-env sync : rien à faire');
      return 0;
    }
    const verb = result.dryRun ? 'à écrire' : 'écrit';
    for (const f of result.planned) {
      console.log(`• ${verb} ${f}`);
    }
    if (result.dryRun) {
      console.log('\nRelancer avec --write pour appliquer.');
    }
    return 0;
  }

  if (cmd === 'audit') {
    const result = audit(dir);
    if (result.errors.length) {
      for (const e of result.errors) console.error(`✖ ${e}`);
      return 1;
    }
    if (!result.gaps.length) {
      console.log(`pwa-env audit : ok (${result.repo})`);
      return 0;
    }
    for (const g of result.gaps) {
      console.log(`✖ ${g.kind.padEnd(10)} ${g.name} — ${g.detail}`);
    }
    console.log(`\n${result.gaps.length} écart(s) sur ${result.repo}`);
    return 1;
  }

  console.error(`pwa-env : commande inconnue « ${cmd} » (check|sync|audit)`);
  return 2;
}

if (estPointDEntree(import.meta.url)) {
  process.exitCode = await run(process.argv.slice(2));
}
