#!/usr/bin/env node
/**
 * pwa-pgtap — joue les fichiers pgTAP de `supabase/tests/` contre la base
 * LIÉE, sans Docker.
 *
 *   npx pwa-pgtap                          # tous les supabase/tests/*.test.sql
 *   npx pwa-pgtap rls.test.sql             # un seul, par son nom
 *   npx pwa-pgtap --dir ../miss-x          # depuis une autre racine
 *
 * POURQUOI. `supabase test db` exige `pg_prove` dans un conteneur, et Docker
 * ne démarre pas sur tous les postes. `supabase db query --linked` exécute
 * bien un fichier, mais ne renvoie que le DERNIER jeu de lignes : les verdicts
 * intermédiaires de pgTAP se perdent. Ce bin réécrit donc chaque assertion
 * pour déposer son verdict dans une table temporaire, que la dernière requête
 * renvoie d'un bloc. Même fichier, même plan, même `rollback` final : rien ne
 * reste dans la base.
 *
 * PROMU DE `mister-miss-koh` (05/09/2026), avec les trois pièges que ce
 * dépôt avait payés un aller-retour chacun :
 *
 *   - la colonne de collecte s'appelle `(line)` : sans la nommer, l'insertion
 *     tombe dans `ord`, la séquence ;
 *   - la table appartient à `postgres` et les tests changent de rôle (`set
 *     local role anon`) : `grant select, insert` ET `grant usage` sur la
 *     séquence, sinon « permission denied for table tap » ;
 *   - un `plan(n)` faux masque TOUS les verdicts : `finish()` devient alors
 *     le dernier résultat, et rien ne remonte. Compter d'abord, planifier
 *     ensuite.
 *
 * CE QU'IL N'EST PAS. Il ne remplace pas `pwa-supabase-test.yml`, le
 * réutilisable qui joue les mêmes fichiers sur une pile JETABLE en CI, avec
 * les migrations depuis zéro. Ici, c'est le projet hébergé qui est interrogé
 * — ce qui est en ligne, tel quel.
 *
 * PRÉREQUIS : le CLI `supabase` sur le PATH, `supabase link` fait, et
 * `SUPABASE_ACCESS_TOKEN` dans l'environnement (ou une session `supabase
 * login`). Le jeton n'est jamais lu ni affiché par ce script.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { estPointDEntree } from './entree.mjs';

/** Les assertions pgTAP dont le verdict doit être collecté. */
const ASSERTIONS =
  /^select (is|isnt|ok|lives_ok|throws_ok|has_column|hasnt_column|has_table|hasnt_table|has_function|is_empty|isnt_empty|results_eq|plan)\(/gm;

/**
 * Le fichier pgTAP réécrit pour `db query`, qui ne rend que le dernier jeu de
 * lignes.
 *
 * Trois substitutions, dans l'ordre du fichier : la table de collecte juste
 * après `begin;`, chaque assertion transformée en insertion de son verdict,
 * et la requête qui renvoie tout d'un bloc AVANT `finish()`.
 *
 * @param {string} sql
 * @returns {string}
 */
export function rewrite(sql) {
  return sql
    .replace(
      /^begin;$/m,
      [
        'begin;',
        'create temp table tap (ord serial, line text);',
        '-- Les tests changent de rôle : la collecte doit leur rester ouverte.',
        'grant select, insert on tap to anon, authenticated;',
        'grant usage on sequence tap_ord_seq to anon, authenticated;',
      ].join('\n')
    )
    .replace(ASSERTIONS, 'insert into tap (line) select $1(')
    .replace(
      /^select \* from finish\(\);$/m,
      [
        "select string_agg(line, E'\\n' order by ord) as tap from tap;",
        'select * from finish();',
      ].join('\n')
    );
}

/**
 * Les lignes TAP extraites de la sortie de `supabase db query`, ou `null` si
 * aucun verdict n'est revenu (fichier sans `begin;`, erreur SQL, jeton
 * absent…). `db query` rend du JSON précédé de bruit — rôle de connexion,
 * avertissements Docker — et on ne lit que la valeur de la colonne `tap`.
 *
 * @param {string} output
 * @returns {{ lines: string[] } | { lines: null, reason: string }}
 */
export function parseTap(output) {
  const match = /"tap":\s*("(?:[^"\\]|\\.)*")/.exec(output);
  if (match) return { lines: JSON.parse(match[1]).split('\n') };
  const reason = /"message":\s*"((?:[^"\\]|\\.)*)"/.exec(output);
  return {
    lines: null,
    reason: reason
      ? JSON.parse(`"${reason[1]}"`)
      : output.trim().split('\n').slice(-5).join('\n'),
  };
}

/**
 * Le bilan d'une suite : ce qui a passé, échoué, et ce que le plan annonçait.
 * Une suite est verte quand rien n'a échoué ET que le compte égale le plan —
 * un plan faux masque des verdicts, il ne doit jamais passer pour un succès.
 *
 * @param {string[]} lines
 */
export function tally(lines) {
  const failed = lines.filter(l => l.startsWith('not ok')).length;
  const passed = lines.filter(l => /^ok \d/.test(l)).length;
  const planned = Number(/^1\.\.(\d+)$/.exec(lines[0] ?? '')?.[1] ?? 0);
  return { failed, passed, planned, ok: failed === 0 && passed === planned };
}

/** Les fichiers à jouer : ceux demandés, sinon tous les `*.test.sql`. */
function suites(root, asked) {
  const dir = join(root, 'supabase', 'tests');
  if (asked.length) {
    return asked.map(name =>
      name.includes('/') || name.includes('\\')
        ? resolve(root, name)
        : join(dir, name)
    );
  }
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries
    .filter(f => /\.test\.sql$/.test(f))
    .sort()
    .map(f => join(dir, f));
}

function play(file, root) {
  const name = basename(file);
  const rewritten = rewrite(readFileSync(file, 'utf8'));
  const tmp = join(mkdtempSync(join(tmpdir(), 'pwa-pgtap-')), 'remote.sql');
  writeFileSync(tmp, rewritten);

  const run = spawnSync(
    'supabase',
    ['db', 'query', '--linked', '--file', tmp],
    {
      cwd: root,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    }
  );
  const parsed = parseTap(`${run.stdout ?? ''}\n${run.stderr ?? ''}`);
  if (!parsed.lines) {
    console.error(`Aucun verdict renvoyé pour ${name}.`);
    console.error(parsed.reason);
    return { name, ok: false, none: true };
  }
  for (const line of parsed.lines) console.log(line);
  const t = tally(parsed.lines);
  console.log(
    `\n${name} — ${t.passed} ok, ${t.failed} not ok, ${t.planned} prévues${t.ok ? '' : ' ✖'}\n`
  );
  return { name, ...t };
}

export async function run(args = []) {
  if (args.includes('--help') || args.includes('-h')) {
    console.log(
      'pwa-pgtap [fichier.test.sql…] [--dir <racine>] — joue les tests pgTAP contre la base liée, sans Docker.'
    );
    return 0;
  }
  const at = flag =>
    args.includes(flag) ? args[args.indexOf(flag) + 1] : undefined;
  const root = resolve(at('--dir') ?? process.cwd());
  const asked = args.filter(
    (a, i) => !a.startsWith('--') && args[i - 1] !== '--dir'
  );
  const files = suites(root, asked);
  if (!files.length) {
    console.error(
      `pwa-pgtap : aucun fichier *.test.sql dans ${join(root, 'supabase', 'tests')}.`
    );
    return 2;
  }
  const results = files.map(f => play(f, root));
  if (results.some(r => r.none)) return 2;
  return results.every(r => r.ok) ? 0 : 1;
}

if (estPointDEntree(import.meta.url)) {
  process.exitCode = await run(process.argv.slice(2));
}
