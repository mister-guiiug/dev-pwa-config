#!/usr/bin/env node
/**
 * Campagne CONFIG phase 3 : pose `config/env.manifest.json` dans chaque app
 * du parc à partir du code, de `.env.example` et du `deploy.yml`.
 *
 *   node scripts/scaffold-env-manifests.mjs [--root ..] [--write] [--sync]
 *
 * Sans `--write` : rapport seulement. Avec `--sync` : enchaîne `pwa-env sync
 * --write` (exige `--write`).
 */
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAMILY_APPS } from '../apps-catalog.js';
import { sync as syncEnv, check as checkEnv } from './pwa-env.mjs';

const here = fileURLToPath(new URL('..', import.meta.url));
const args = process.argv.slice(2);
const WRITE = args.includes('--write');
const DO_SYNC = args.includes('--sync');
const rootFlag = args.indexOf('--root');
const ROOT = resolve(rootFlag >= 0 ? args[rootFlag + 1] : join(here, '..'));

const PURPOSES = {
  VITE_SUPABASE_URL: {
    purpose: 'URL du projet Supabase',
    provider: 'supabase',
  },
  VITE_SUPABASE_ANON_KEY: {
    purpose: 'Clé anon publique (RLS)',
    provider: 'supabase',
  },
  VITE_VAPID_PUBLIC_KEY: {
    purpose: 'Clé publique VAPID (Web Push)',
    provider: 'web-push',
  },
  VITE_POSTHOG_KEY: {
    purpose: 'Clé projet PostHog (nuage EU)',
    fallback: 'absent : pas de mesure ni bandeau',
    provider: 'posthog',
    required: 'optional',
  },
  VITE_SENTRY_DSN: {
    purpose: 'DSN Sentry',
    fallback: 'absent : no-op',
    provider: 'sentry',
    required: 'optional',
  },
  VITE_SENTRY_ENVIRONMENT: {
    purpose: 'Environnement Sentry',
    required: 'optional',
    provider: 'sentry',
  },
  VITE_BACKEND: {
    purpose: 'Choix de backend (local / supabase / …)',
    required: 'optional',
  },
  VITE_BASE_PATH: {
    purpose: 'Base path Vite (souvent injecté en CI)',
    required: 'optional',
    store: 'local',
  },
  VITE_PUBLIC_SITE_ORIGIN: {
    purpose: 'Origine publique du site',
    required: 'optional',
    fallback: 'souvent une expression GitHub dans deploy.yml',
  },
  VITE_SUPABASE_PROXY: {
    purpose: 'URL du proxy Supabase',
    required: 'optional',
  },
  VITE_GEOCODER_URL: {
    purpose: 'Service de géocodage',
    required: 'optional',
  },
  VITE_PRONOTE_PROXY_URL: {
    purpose: 'Proxy Pronote',
    required: 'optional',
  },
  VITE_WHO_PROXY_URL: { purpose: 'Proxy API WHO', required: 'optional' },
  VITE_WHO_RELEASE_ID: { purpose: 'Release WHO', required: 'optional' },
  VITE_WHO_LANG: { purpose: 'Langue WHO', required: 'optional' },
  VITE_ERROR_INGEST_URL: {
    purpose: 'Endpoint d’ingestion d’erreurs',
    required: 'optional',
  },
  VITE_ERROR_ENDPOINT: {
    purpose: 'Endpoint d’erreurs',
    required: 'optional',
  },
  VITE_MOCK: { purpose: 'Mode mock', required: 'optional', store: 'local' },
  VITE_PWA_ICON_QS: {
    purpose: 'Cache-bust icônes PWA',
    required: 'optional',
  },
  VITE_USE_EMULATOR: {
    purpose: 'Émulateur Firebase',
    required: 'optional',
    store: 'local',
  },
  VITE_REQUIRE_APPCHECK: {
    purpose: 'Exiger App Check',
    required: 'optional',
  },
  VITE_FIREBASE_API_KEY: { purpose: 'Firebase API key', provider: 'firebase' },
  VITE_FIREBASE_AUTH_DOMAIN: {
    purpose: 'Firebase auth domain',
    provider: 'firebase',
  },
  VITE_FIREBASE_PROJECT_ID: {
    purpose: 'Firebase project id',
    provider: 'firebase',
  },
  VITE_FIREBASE_STORAGE_BUCKET: {
    purpose: 'Firebase storage bucket',
    provider: 'firebase',
  },
  VITE_FIREBASE_MESSAGING_SENDER_ID: {
    purpose: 'Firebase messaging sender',
    provider: 'firebase',
  },
  VITE_FIREBASE_APP_ID: { purpose: 'Firebase app id', provider: 'firebase' },
  VITE_FIREBASE_MEASUREMENT_ID: {
    purpose: 'Firebase measurement id',
    required: 'optional',
    provider: 'firebase',
  },
  VITE_FIREBASE_DATABASE_URL: {
    purpose: 'Firebase Realtime Database URL',
    provider: 'firebase',
  },
  VITE_FIREBASE_APPCHECK_KEY: {
    purpose: 'Firebase App Check key',
    required: 'optional',
    provider: 'firebase',
  },
};

const SKIP = new Set([
  'node_modules',
  'dist',
  'dev-dist',
  '.git',
  'coverage',
  'build',
]);

function walk(dir, re, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const full = join(dir, e.name);
    if (e.isDirectory()) walk(full, re, out);
    else if (re.test(e.name)) out.push(full);
  }
  return out;
}

function readText(path) {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

function viteFromCode(appDir) {
  const names = new Set();
  for (const file of walk(join(appDir, 'src'), /\.[cm]?[jt]sx?$/)) {
    const text = readText(file) ?? '';
    for (const m of text.matchAll(/import\.meta\.env\.(VITE_[A-Z0-9_]+)/g)) {
      names.add(m[1]);
    }
    // Tableaux de clés (`'VITE_FOO' as const`) — ex. firebaseEnv.ts.
    for (const m of text.matchAll(/['"](VITE_[A-Z0-9_]+)['"]/g)) {
      names.add(m[1]);
    }
  }
  return names;
}

function viteFromEnvFile(appDir, rel) {
  const text = readText(join(appDir, rel));
  if (!text) return new Set();
  const names = new Set();
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*([A-Z][A-Z0-9_]*)=/.exec(line);
    if (m && m[1].startsWith('VITE_')) names.add(m[1]);
  }
  return names;
}

/** Clés présentes dans un `.env.production` suivi par git (store `committed`). */
function viteFromCommittedProduction(appDir) {
  const rel = '.env.production';
  try {
    // ls-files --error-unmatch : suivi → exit 0.
    execFileSync('git', ['-C', appDir, 'ls-files', '--error-unmatch', rel], {
      stdio: 'ignore',
    });
  } catch {
    return new Set();
  }
  return viteFromEnvFile(appDir, rel);
}

function requiredFromDeploy(appDir) {
  const deploy =
    readText(join(appDir, '.github/workflows/deploy.yml')) ??
    readText(join(appDir, '.github/workflows/pages.yml'));
  if (!deploy) return new Set();
  const names = new Set();
  let inBlock = false;
  for (const raw of deploy.split('\n')) {
    if (/^\s*required-env:\s*\|/.test(raw)) {
      inBlock = true;
      continue;
    }
    if (!inBlock) continue;
    if (raw.trim() && !/^\s/.test(raw)) break;
    const name = raw.trim();
    if (!name) continue;
    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) break;
    if (name.startsWith('VITE_')) names.add(name);
  }
  return names;
}

/**
 * Secrets passés au job `pwa-deploy` (aujourd'hui : FIREBASE_SERVICE_ACCOUNT_KEY
 * seulement). Les secrets migrate/keepalive vont en phase `server` — les
 * injecter dans deploy.yml fait échouer GitHub (« Unexpected input »).
 */
function secretsForDeploy(appDir) {
  const deploy =
    readText(join(appDir, '.github/workflows/deploy.yml')) ??
    readText(join(appDir, '.github/workflows/pages.yml')) ??
    '';
  const names = new Set();
  for (const m of deploy.matchAll(
    /^\s+([A-Z][A-Z0-9_]+):\s*\$\{\{\s*secrets\./gm
  )) {
    if (!m[1].startsWith('VITE_')) names.add(m[1]);
  }
  // Si firebase-project est déclaré, le secret est requis même absent du YAML.
  if (/^\s*firebase-project:/m.test(deploy)) {
    names.add('FIREBASE_SERVICE_ACCOUNT_KEY');
  }
  return names;
}

function secretsForServer(appDir) {
  const names = new Set();
  for (const rel of [
    '.github/workflows/supabase-migrate.yml',
    '.github/workflows/supabase-migrations.yml',
    '.github/workflows/migrate.yml',
    '.github/workflows/keepalive.yml',
    '.github/workflows/supabase-keepalive.yml',
  ]) {
    const text = readText(join(appDir, rel));
    if (!text) continue;
    for (const m of text.matchAll(
      /^\s+([A-Z][A-Z0-9_]+):\s*\$\{\{\s*secrets\./gm
    )) {
      if (!m[1].startsWith('VITE_')) names.add(m[1]);
    }
  }
  return names;
}

function buildManifest(appId, appDir) {
  const fromCode = viteFromCode(appDir);
  const fromExample = viteFromEnvFile(appDir, '.env.example');
  const committed = viteFromCommittedProduction(appDir);
  const required = requiredFromDeploy(appDir);
  const names = new Set([...fromCode, ...fromExample, ...committed]);
  // VITE_BASE_PATH / NODE_ENV souvent documentés mais injectés en CI : garder
  // si présents dans l'example, sinon ignorer s'ils ne sont pas dans le code.
  for (const n of [...names]) {
    if (n === 'VITE_BASE_PATH' && !fromCode.has(n)) names.delete(n);
  }

  const entries = [];
  for (const name of [...names].sort()) {
    const meta = PURPOSES[name] ?? {
      purpose: name,
      required: 'optional',
    };
    // `.env.production` suivi : Vite le charge au build Pages. L'injecter
    // aussi via `vars.X` vide écrase la valeur commitée — store committed.
    let store = committed.has(name) ? 'committed' : (meta.store ?? 'vars');
    const phase = 'build';
    let req = meta.required ?? 'optional';
    if (required.has(name) && store === 'vars') req = 'prod';
    // Clés Firebase en vars (pas committed) : prod dès qu'elles sont lues.
    if (
      store === 'vars' &&
      name.startsWith('VITE_FIREBASE_') &&
      name !== 'VITE_FIREBASE_MEASUREMENT_ID' &&
      name !== 'VITE_FIREBASE_APPCHECK_KEY' &&
      fromCode.has(name)
    ) {
      req = 'prod';
    }
    if (store === 'committed') {
      req = 'optional';
    }
    /** @type {Record<string, string>} */
    const entry = { name, store, phase, required: req };
    if (meta.purpose) entry.purpose = meta.purpose;
    if (meta.fallback) entry.fallback = meta.fallback;
    if (meta.provider) entry.provider = meta.provider;
    if (store === 'committed') {
      entry.purpose =
        (meta.purpose ? `${meta.purpose} — ` : '') +
        'versionnée dans .env.production';
    }
    entries.push(entry);
  }

  for (const name of [...secretsForDeploy(appDir)].sort()) {
    entries.push({
      name,
      store: 'secrets',
      phase: 'deploy',
      required: 'prod',
      purpose: `Secret de déploiement Pages (${name})`,
    });
  }
  for (const name of [...secretsForServer(appDir)].sort()) {
    if (entries.some(e => e.name === name)) continue;
    entries.push({
      name,
      store: 'secrets',
      phase: 'server',
      required: 'optional',
      purpose: `Secret serveur / migrations (${name})`,
    });
  }

  return {
    app: appId,
    entries,
  };
}

const targets = [
  ...FAMILY_APPS.filter(a => a.platform !== 'desktop').map(a => a.id),
  'pwa-starter-kit',
];

const report = [];
for (const id of targets) {
  const appDir = join(ROOT, id);
  if (!existsSync(join(appDir, 'package.json'))) {
    report.push({ id, status: 'absent' });
    continue;
  }
  const manifestPath = join(appDir, 'config/env.manifest.json');
  const next = buildManifest(id, appDir);
  if (!next.entries.length) {
    report.push({ id, status: 'vide', count: 0 });
    continue;
  }

  let prev = null;
  try {
    prev = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    prev = null;
  }
  const prevNames = new Set((prev?.entries ?? []).map(e => e.name));
  const nextNames = new Set(next.entries.map(e => e.name));
  const added = [...nextNames].filter(n => !prevNames.has(n));
  const same =
    prev &&
    prevNames.size === nextNames.size &&
    [...prevNames].every(n => nextNames.has(n));

  if (WRITE) {
    // Fusion : garder les purpose/exception déjà écrits, ajouter les manquants.
    let merged = next;
    if (prev?.entries?.length) {
      const byName = new Map(prev.entries.map(e => [e.name, e]));
      merged = {
        app: id,
        entries: next.entries.map(e => {
          const old = byName.get(e.name);
          if (!old) return e;
          return {
            ...e,
            purpose: old.purpose || e.purpose,
            fallback: old.fallback || e.fallback,
            exception: old.exception,
            provider: old.provider || e.provider,
            required: old.required === 'always' ? 'always' : e.required,
          };
        }),
      };
      // Conserver les entrées secrets/local du précédent absentes du scan
      for (const old of prev.entries) {
        if (!nextNames.has(old.name) && old.store !== 'vars') {
          merged.entries.push(old);
        }
      }
      merged.entries.sort((a, b) => a.name.localeCompare(b.name));
    }
    mkdirSync(dirname(manifestPath), { recursive: true });
    writeFileSync(manifestPath, `${JSON.stringify(merged, null, 2)}\n`);
    let syncResult = null;
    if (DO_SYNC) {
      syncResult = syncEnv(appDir, { write: true });
    }
    const chk = checkEnv(appDir);
    report.push({
      id,
      status: same ? 'à jour' : prev ? 'enrichi' : 'créé',
      count: merged.entries.length,
      added,
      sync: syncResult?.written ?? [],
      checkOk: chk.ok,
      checkErrors: chk.errors,
    });
  } else {
    report.push({
      id,
      status: same ? 'à jour' : prev ? 'à enrichir' : 'à créer',
      count: next.entries.length,
      added,
    });
  }
}

for (const r of report) {
  const extra = r.added?.length ? ` +${r.added.join(',')}` : '';
  const sync =
    r.sync?.length != null
      ? ` sync=[${r.sync.join(',')}] check=${r.checkOk ? 'ok' : 'KO'}`
      : '';
  console.log(
    `${r.status.padEnd(12)} ${r.id.padEnd(22)} n=${r.count ?? '-'}${extra}${sync}`
  );
  if (r.checkErrors?.length) {
    for (const e of r.checkErrors) console.log(`             ✖ ${e}`);
  }
}

const todo = report.filter(
  r => r.status === 'à créer' || r.status === 'à enrichir'
);
console.log(
  `\n${report.length} apps, ${todo.length} à écrire` +
    (WRITE ? ' — écrit.' : ' — relancer avec --write [--sync]')
);
