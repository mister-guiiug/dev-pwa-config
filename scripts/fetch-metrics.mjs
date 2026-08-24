#!/usr/bin/env node
/**
 * Relève l'état RÉEL de chaque dépôt de la famille via l'API GitHub, et écrit
 * `showroom/metrics.js`.
 *
 *   GITHUB_TOKEN=… node scripts/fetch-metrics.mjs
 *
 * POURQUOI. La vitrine affiche « stable » et « alpha » — des étiquettes
 * éditoriales que rien ne date. Une app marquée stable il y a dix-huit mois et
 * jamais retouchée depuis a la même pastille qu'une app touchée hier. Ces
 * mesures-là, personne ne peut les saisir à la main sans qu'elles pourrissent :
 * elles se relèvent, ou elles mentent.
 *
 * POURQUOI UN FICHIER COMMITÉ, ET NON UN APPEL DEPUIS LA PAGE. Le showroom ne
 * fait aucune requête réseau, et cette promesse n'est pas négociable : elle
 * garantit qu'il s'ouvre en `file://`, sans clé d'API et sans traceur. Le
 * relevé a donc lieu en CI (`.github/workflows/showroom-metrics.yml`, une fois
 * par nuit), et le résultat est posé sur `globalThis` par un `<script src>`
 * classique — comme `themes.js` et `apps.js`. Pas de `fetch`, donc pas de
 * requête : la page s'ouvre toujours en `file://`. Le fichier est daté, pour
 * que le lecteur sache de quand il parle.
 *
 * DÉGRADATION. Un dépôt injoignable, sans release ou en erreur n'interrompt
 * rien : son entrée est simplement absente, et la vitrine n'affiche alors
 * aucune mesure pour lui. Le fichier commité au dépôt part VIDE — la page doit
 * être correcte avant le premier passage du workflow.
 *
 * Non publié (absent de `files`) : outil de développement du dépôt.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { FAMILY_APPS, GITHUB_OWNER } from '../apps-catalog.js';

const API = 'https://api.github.com';
const token = process.env.GITHUB_TOKEN;

async function api(path) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      accept: 'application/vnd.github+json',
      'user-agent': 'dev-wpa-config-showroom',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
  // 404 sur une release absente est le cas NORMAL pour la plupart des apps de
  // la famille : ce n'est pas une erreur à signaler.
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
}

/** Mesures d'un dépôt, ou `null` s'il n'a rien donné d'exploitable. */
export async function repoMetrics(id) {
  const repo = await api(`/repos/${GITHUB_OWNER}/${id}`);
  if (!repo) return null;

  // La dernière release est facultative ; son absence n'invalide pas le reste.
  let release = null;
  try {
    release = await api(`/repos/${GITHUB_OWNER}/${id}/releases/latest`);
  } catch {
    release = null;
  }

  return {
    pushedAt: repo.pushed_at ?? null,
    // `archived` mérite d'être vu : une app archivée reste dans le catalogue,
    // mais le lecteur doit le savoir avant de cliquer.
    archived: Boolean(repo.archived),
    openIssues: repo.open_issues_count ?? 0,
    version: release?.tag_name ?? null,
    releasedAt: release?.published_at ?? null,
  };
}

/** Le fichier tel qu'il est écrit : un global, pas un module ni du JSON. */
export function renderMetrics(data) {
  return `/*
 * FICHIER GÉNÉRÉ — ne pas modifier à la main.
 *
 * Relevé de l'état des dépôts de la famille (API GitHub), écrit par
 * \`scripts/fetch-metrics.mjs\` et rafraîchi une fois par nuit par le workflow
 * \`showroom-metrics.yml\`.
 *
 * Chargé par un \`<script src>\` classique, comme \`themes.js\` : la page ne
 * fait toujours AUCUNE requête réseau et s'ouvre en \`file://\`.
 *
 * \`repos\` vide = le workflow n'est jamais passé, ou aucun dépôt n'a répondu.
 * La vitrine n'affiche alors simplement aucune mesure.
 */
globalThis.SHOWROOM_METRICS = ${JSON.stringify(data, null, 2)};
`;
}

async function main() {
  const repos = {};
  const failed = [];

  for (const app of FAMILY_APPS) {
    try {
      const metrics = await repoMetrics(app.id);
      if (metrics) repos[app.id] = metrics;
      else failed.push(app.id);
    } catch (error) {
      // Un dépôt en échec ne doit pas emporter les quinze autres.
      failed.push(`${app.id} (${error.message})`);
    }
  }

  const target = fileURLToPath(
    new URL('../showroom/metrics.js', import.meta.url)
  );
  writeFileSync(
    target,
    renderMetrics({ generatedAt: new Date().toISOString(), repos })
  );

  console.log(
    `metrics.js : ${Object.keys(repos).length}/${FAMILY_APPS.length} dépôts relevés` +
      (failed.length ? ` — sans réponse : ${failed.join(', ')}` : '')
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
