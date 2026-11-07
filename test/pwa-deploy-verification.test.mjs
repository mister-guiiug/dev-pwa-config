/**
 * La vérification APRÈS déploiement de `pwa-deploy.yml` (job `verifier`).
 *
 * POURQUOI ELLE EXISTE. Trois pannes de production en deux mois, aucune vue
 * par une machine : le jeu public de miss-arcade cassé trois jours (401 pour
 * tout visiteur anonyme), trois apps qui ne démarraient plus hors ligne, le
 * hub qui bloquait l'installation de vingt apps. Le job attend que
 * `version.json` porte le commit déployé, puis ouvre la page et exige que
 * React ait monté, sans violation CSP ni requête de même origine en échec.
 *
 * Comme pour IndexNow et le keep-alive, ces tests JOUENT les scripts du
 * workflow, extraits tels que le runner les reçoit :
 *
 *   - l'attente, contre un vrai serveur HTTP local ;
 *   - la visite, contre un FAUX `playwright` posé dans un dossier temporaire
 *     — la CI du socle n'installe aucun navigateur. Le faux rejoue ce que la
 *     page émettrait (réponses, violations, console) : c'est le verdict du
 *     script qui est éprouvé, pas Chromium. La visite elle-même a été jouée
 *     avec un vrai Chromium sur les vingt-trois apps publiées le 07/11/2026,
 *     toutes vertes, et sur des pages fabriquées pour chaque défaut.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const DEPLOY = readFileSync(
  new URL('../.github/workflows/pwa-deploy.yml', import.meta.url),
  'utf8'
);

/** Le bloc littéral `NOM: |` d'un texte de workflow, désindenté. */
function blocLitteral(source, nom) {
  const lignes = source.split('\n');
  const i = lignes.findIndex(l => l.trim() === `${nom}: |`);
  assert.ok(i >= 0, `${nom} introuvable`);
  const indentCle = lignes[i].length - lignes[i].trimStart().length;
  const corps = [];
  for (const l of lignes.slice(i + 1)) {
    if (l.trim() && l.length - l.trimStart().length <= indentCle) break;
    corps.push(l);
  }
  const indent = Math.min(
    ...corps.filter(l => l.trim()).map(l => l.length - l.trimStart().length)
  );
  return `${corps
    .map(l => l.slice(indent))
    .join('\n')
    .trimEnd()}\n`;
}

/** Le texte d'un job, de sa clé à la suivante. */
function job(source, nom) {
  const debut = source.indexOf(`\n  ${nom}:\n`);
  assert.ok(debut > 0, `job ${nom} absent`);
  const suite = source.slice(debut + 1).search(/\n {2}[a-z-]+:\n/);
  return source.slice(debut, suite > 0 ? debut + 1 + suite : undefined);
}

/** Le bloc d'une entrée de `workflow_call`, de sa clé à la suivante. */
function entree(nom) {
  const m = new RegExp(`\\n {6}${nom}:\\n((?: {8}.*\\n|\\s*\\n)*)`).exec(
    DEPLOY
  );
  assert.ok(m, `entrée ${nom} absente`);
  return m[1];
}

/** Lance un script du workflow, de façon ASYNCHRONE : le serveur local doit pouvoir répondre. */
function jouer(script, { env = {}, cwd } = {}) {
  return new Promise(ok => {
    const enfant = spawn(
      process.execPath,
      ['--input-type=module', '-e', script],
      { cwd, env: { ...process.env, GITHUB_STEP_SUMMARY: '', ...env } }
    );
    let sortie = '';
    enfant.stdout.on('data', d => (sortie += d));
    enfant.stderr.on('data', d => (sortie += d));
    const minuterie = setTimeout(() => enfant.kill(), 30_000);
    enfant.on('close', code => {
      clearTimeout(minuterie);
      ok({ code, sortie });
    });
  });
}

const VERIFIER = job(DEPLOY, 'verifier');
const ATTENTE = blocLitteral(VERIFIER, 'ATTENTE_JS');
const VISITE = blocLitteral(VERIFIER, 'VERIFIER_JS');

/* ── Le contrat du workflow ───────────────────────────────────────────── */

test('la vérification est ACTIVE par défaut, les e2e ne le sont pas', () => {
  assert.match(entree('verify'), /type: boolean\n[\s\S]*default: true\n/);
  assert.match(entree('verify-e2e'), /type: boolean\n[\s\S]*default: false\n/);
  assert.match(entree('verify-selector'), /default: ''\n/);
  assert.match(entree('verify-timeout'), /type: number\n[\s\S]*default: 10\n/);
  assert.match(entree('verify-e2e-grep'), /default: '@critical'\n/);
});

test('Playwright est épinglé, et Renovate lit l’épingle', () => {
  const bloc = entree('verify-playwright-version');
  const m =
    /# renovate: datasource=npm depName=playwright\n\s+default: '([^']+)'\n/.exec(
      bloc
    );
  assert.ok(m, 'épingle non annotée pour Renovate');
  assert.match(m[1], /^\d+\.\d+\.\d+$/);
  // Le customManagers de renovate.json, joué sur le fichier.
  const { customManagers } = JSON.parse(
    readFileSync(new URL('../renovate.json', import.meta.url), 'utf8')
  );
  const lues = customManagers
    .filter(c =>
      c.managerFilePatterns.some(p =>
        new RegExp(p.slice(1, -1)).test('.github/workflows/pwa-deploy.yml')
      )
    )
    .flatMap(c =>
      c.matchStrings.flatMap(s =>
        [...DEPLOY.matchAll(new RegExp(s, 'g'))]
          .filter(r => r.groups.depName === 'playwright')
          .map(r => r.groups.currentValue)
      )
    );
  assert.deepEqual(lues, [m[1]]);
});

test('le job verifier suit le déploiement, avec des droits de lecture seulement', () => {
  assert.match(
    job(DEPLOY, 'deploy'),
    /outputs:\n(?: {6}#.*\n)* {6}page_url: \$\{\{ steps\.deployment\.outputs\.page_url \}\}/
  );
  assert.match(VERIFIER, /\n {4}needs: deploy\n/);
  assert.match(VERIFIER, /\n {4}if: \$\{\{ inputs\.verify \}\}\n/);
  // Un sous-ensemble des droits que le réutilisable demande déjà : un droit
  // de plus, et GitHub refuserait le fichier chez chaque appelant.
  assert.match(
    VERIFIER,
    /\n {4}permissions:\n {6}contents: read\n {6}packages: read\n {4}env:/
  );
  // `runner` n'existe pas dans l'env d'un JOB : l'y lire rendrait le fichier
  // invalide, donc tous les déploiements du parc.
  const envJob = VERIFIER.slice(
    VERIFIER.indexOf('\n    env:\n'),
    VERIFIER.indexOf('\n    steps:\n')
  );
  assert.doesNotMatch(envJob, /\$\{\{\s*runner\./);
  assert.match(
    envJob,
    /URL_SITE: \$\{\{ needs\.deploy\.outputs\.page_url \}\}/
  );
  assert.match(envJob, /SHA: \$\{\{ github\.sha \}\}/);
});

test('aucune entrée n’entre dans un script : tout passe par env:', () => {
  for (const nom of ['ATTENTE_JS', 'VERIFIER_JS', 'CONFIG_PRODUCTION'])
    assert.doesNotMatch(blocLitteral(VERIFIER, nom), /\$\{\{/, nom);
  for (const corps of VERIFIER.matchAll(/ run: \|\n((?: {10}.*\n|\s*\n)*)/g))
    assert.doesNotMatch(corps[1], /\$\{\{/);
});

test('les étapes e2e ne partent que sur demande', () => {
  const e2e = VERIFIER.slice(VERIFIER.indexOf('- name: E2E — le dépôt'));
  const etapes = e2e.split('\n      - ').filter(Boolean);
  assert.ok(etapes.length >= 5);
  for (const etape of etapes)
    assert.match(etape, /if: \$\{\{ (failure\(\) && )?inputs\.verify-e2e \}\}/);
  // La configuration écrite retire le webServer et remplace baseURL, aussi
  // dans chaque projet ; le filtre qui ne trouve rien fait échouer.
  const config = blocLitteral(VERIFIER, 'CONFIG_PRODUCTION');
  assert.match(config, /import base from '__CONFIG__';/);
  assert.match(
    config,
    /const \{ webServer: _sansServeur, \.\.\.reste \} = base;/
  );
  assert.match(config, /projects: reste\.projects\.map/);
  assert.match(e2e, /aucun test ne correspond/);
});

test('IndexNow attend la vérification, et part quand elle est éteinte', () => {
  const indexnow = job(DEPLOY, 'indexnow');
  assert.match(indexnow, /needs: \[build, deploy, verifier\]/);
  // Sans fonction d'état, un besoin SAUTÉ (`verify: false`) ferait sauter
  // IndexNow ; un déploiement échoué, lui, ne signale rien.
  assert.match(
    indexnow,
    /if: \$\{\{ !cancelled\(\) && needs\.deploy\.result == 'success' && \(needs\.verifier\.result == 'success' \|\| needs\.verifier\.result == 'skipped'\) && inputs\.indexnow && /
  );
});

/* ── L'attente de version.json, contre un vrai serveur ────────────────── */

async function avecServeur(repondre, essai) {
  const vus = [];
  const serveur = createServer((req, res) => {
    vus.push(req.url);
    const [statut, corps] = repondre(req.url, vus.length);
    res.writeHead(statut, { 'content-type': 'application/json' });
    res.end(corps);
  });
  await new Promise(ok => serveur.listen(0, '127.0.0.1', ok));
  try {
    return await essai(`http://127.0.0.1:${serveur.address().port}/app/`, vus);
  } finally {
    serveur.close();
  }
}

const SHA = 'abcdef0123456789abcdef0123456789abcdef01';
const attendre = (url, env = {}) =>
  jouer(ATTENTE, {
    env: { URL_SITE: url, SHA, DELAI_MIN: '0.01', PAS_S: '0.05', ...env },
  });

test('attente : le commit déployé, lu dans version.json SOUS la base, cache contourné', async () => {
  await avecServeur(
    (_url, n) => [200, JSON.stringify({ commit: n < 3 ? 'ancien' : SHA })],
    async (url, vus) => {
      const r = await attendre(url, { DELAI_MIN: '0.1' });
      assert.equal(r.code, 0, r.sortie);
      assert.match(
        r.sortie,
        /::notice::version\.json porte le commit déployé \(abcdef0\), essai 3\./
      );
      assert.match(
        vus[0],
        /^\/app\/version\.json\?dwc-verification=abcdef012345-1$/
      );
    }
  );
});

test('attente : un autre commit jusqu’au bout du délai fait échouer, en le nommant', async () => {
  await avecServeur(
    () => [200, JSON.stringify({ commit: '1111111222' })],
    async url => {
      const r = await attendre(url);
      assert.equal(r.code, 1, r.sortie);
      assert.match(
        r.sortie,
        /::error title=Vérification après déploiement::Le site ne sert pas le commit déployé \(abcdef0\)/
      );
      assert.match(
        r.sortie,
        /dernière réponse de version\.json : commit 1111111\./
      );
    }
  );
});

test('attente : sans version.json (pas de versionPlugin), la visite a lieu quand même', async () => {
  await avecServeur(
    () => [404, 'non'],
    async (url, vus) => {
      const r = await attendre(url, { DELAI_MIN: '1' });
      assert.equal(r.code, 0, r.sortie);
      assert.match(
        r.sortie,
        /::warning::Pas de version\.json \(l'app n'utilise pas versionPlugin\)/
      );
      // Douze 404 de suite suffisent : inutile d'attendre la minute entière.
      assert.equal(vus.length, 12);
    }
  );
  await avecServeur(
    () => [200, JSON.stringify({ version: '1.0.0' })],
    async url => {
      const r = await attendre(url);
      assert.equal(r.code, 0, r.sortie);
      assert.match(r.sortie, /::warning::version\.json ne porte aucun commit/);
    }
  );
});

test('attente : un site qui répond 5xx jusqu’au bout fait échouer', async () => {
  await avecServeur(
    () => [503, 'indisponible'],
    async url => {
      const r = await attendre(url);
      assert.equal(r.code, 1, r.sortie);
      assert.match(r.sortie, /dernière réponse de version\.json : HTTP 503\./);
    }
  );
});

/* ── La visite, contre un faux Playwright ─────────────────────────────── */

/**
 * Un `playwright` de bac à sable : il rejoue le scénario (FAUX_SCENARIO) et
 * consigne ce que le script lui demande (FAUX_JOURNAL, une ligne JSON par
 * fait) — options du contexte, URL visitée, décision de chaque route.
 */
const FAUX_PLAYWRIGHT = `
import { appendFileSync } from 'node:fs';
const sc = JSON.parse(process.env.FAUX_SCENARIO);
const noter = fait => appendFileSync(process.env.FAUX_JOURNAL, JSON.stringify(fait) + '\\n');
const delai = () => { throw new Error('page.waitForFunction: Timeout 1ms exceeded.'); };
export const chromium = {
  async launch() {
    return {
      async close() {},
      async newContext(options) {
        noter({ contexte: options });
        let routeur;
        let lien;
        return {
          async route(_motif, fn) { routeur = fn; },
          async exposeBinding(_nom, fn) { lien = fn; },
          async addInitScript() {},
          async newPage() {
            const ecoutes = {};
            const emettre = (nom, arg) => (ecoutes[nom] ?? []).forEach(fn => fn(arg));
            return {
              on(nom, fn) { (ecoutes[nom] ??= []).push(fn); },
              async goto(url) {
                noter({ goto: url });
                if (sc.gotoErreur) throw new Error(sc.gotoErreur);
                for (const q of sc.requetes ?? [])
                  await routeur({
                    request: () => ({ url: () => q.url, method: () => q.method ?? 'GET' }),
                    continue: async () => noter({ route: q.url, methode: q.method ?? 'GET', decision: 'continue' }),
                    abort: async raison => noter({ route: q.url, methode: q.method ?? 'GET', decision: 'abort', raison }),
                  });
                for (const v of sc.violations ?? []) await lien({}, v);
                for (const r of sc.reponses ?? []) emettre('response', { url: () => r.url, status: () => r.status });
                for (const r of sc.echecsReseau ?? []) emettre('requestfailed', { url: () => r.url, failure: () => ({ errorText: r.erreur }) });
                for (const t of sc.consoles ?? []) emettre('console', { type: () => 'error', text: () => t });
                for (const m of sc.exceptions ?? []) emettre('pageerror', new Error(m));
                return { status: () => sc.statut ?? 200 };
              },
              locator(selecteur) {
                noter({ selecteur });
                return { first: () => ({ waitFor: async () => { if (!sc.monte) delai(); } }) };
              },
              async waitForFunction() { if (!sc.monte) delai(); },
              async waitForLoadState() {},
              async waitForTimeout() {},
              async evaluate() { return { servi: !!sc.servi, texte: sc.texte ?? '' }; },
              async screenshot() { noter({ capture: true }); },
            };
          },
        };
      },
    };
  },
};
`;

const SITE = 'https://mister-guiiug.github.io/miss-x/';

async function visiter(scenario, env = {}) {
  const dossier = mkdtempSync(join(tmpdir(), 'dwc-verif-'));
  try {
    const paquet = join(dossier, 'node_modules', 'playwright');
    mkdirSync(paquet, { recursive: true });
    writeFileSync(
      join(paquet, 'package.json'),
      JSON.stringify({ name: 'playwright', type: 'module', main: 'index.js' })
    );
    writeFileSync(join(paquet, 'index.js'), FAUX_PLAYWRIGHT);
    const journal = join(dossier, 'journal.ndjson');
    writeFileSync(journal, '');
    const r = await jouer(VISITE, {
      cwd: dossier,
      env: {
        URL_SITE: SITE,
        SHA,
        SORTIE: join(dossier, 'sortie'),
        FAUX_SCENARIO: JSON.stringify({ monte: true, ...scenario }),
        FAUX_JOURNAL: journal,
        ...env,
      },
    });
    const faits = readFileSync(journal, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map(l => JSON.parse(l));
    const rapport = JSON.parse(
      readFileSync(join(dossier, 'sortie', 'verification.json'), 'utf8')
    );
    return { ...r, faits, rapport };
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
}

test('visite : une app montée, sans écart, passe — sans service worker, cache contourné', async () => {
  const r = await visiter({
    reponses: [
      { url: `${SITE}assets/index.js`, status: 200 },
      // Un tiers en échec ne regarde pas ce contrôle.
      { url: 'https://abc.supabase.co/rest/v1/x', status: 401 },
    ],
  });
  assert.equal(r.code, 0, r.sortie);
  assert.match(
    r.sortie,
    /::notice title=Vérification après déploiement::https:\/\/mister-guiiug\.github\.io\/miss-x\/ : React a monté/
  );
  assert.deepEqual(r.faits[0], {
    contexte: { serviceWorkers: 'block', locale: 'fr-FR' },
  });
  assert.equal(
    r.faits.find(f => f.goto).goto,
    `${SITE}?dwc-verification=abcdef012345`
  );
  assert.deepEqual(r.rapport.erreurs, []);
});

test('visite : le contenu servi aux robots resté en place = l’app n’a pas monté', async () => {
  const r = await visiter({
    monte: false,
    servi: true,
    texte: 'Miss X Une app.',
    reponses: [{ url: `${SITE}assets/index-abc.js?v=1`, status: 404 }],
  });
  assert.equal(r.code, 1, r.sortie);
  assert.match(
    r.sortie,
    /::error title=Vérification après déploiement::l'app n'a pas monté en 30 s : le contenu servi aux robots est toujours là/
  );
  // La requête est retirée de l'adresse : rien d'un jeton dans un journal public.
  assert.match(
    r.sortie,
    /requête de même origine en échec : HTTP 404 \/miss-x\/assets\/index-abc\.js\n/
  );
  assert.match(
    r.sortie,
    /::warning title=Vérification après déploiement::texte de la page : « Miss X Une app\. »/
  );
  assert.ok(
    r.faits.some(f => f.capture),
    'aucune capture'
  );
});

test('visite : une racine React vide, ou un sélecteur absent, échoue en le disant', async () => {
  const vide = await visiter({ monte: false });
  assert.equal(vide.code, 1);
  assert.match(vide.sortie, /aucune racine React n’a rendu d’élément/);

  const selecteur = await visiter({ monte: false }, { SELECTEUR: ' main h1 ' });
  assert.equal(selecteur.code, 1);
  assert.match(selecteur.sortie, /le sélecteur « main h1 » n'est pas visible/);
  assert.ok(selecteur.faits.some(f => f.selecteur === 'main h1'));

  const present = await visiter({}, { SELECTEUR: 'main h1' });
  assert.equal(present.code, 0, present.sortie);
});

test('visite : une violation CSP appliquée échoue ; le mode report-only ne compte pas', async () => {
  const r = await visiter({
    violations: [
      {
        directive: 'connect-src',
        bloque: 'https://abc.supabase.co/rest/v1/t?apikey=secret',
      },
      {
        directive: 'connect-src',
        bloque: 'https://abc.supabase.co/rest/v1/t?apikey=secret',
      },
      { directive: 'script-src-elem', bloque: 'inline' },
    ],
  });
  assert.equal(r.code, 1, r.sortie);
  assert.match(
    r.sortie,
    /violation CSP \(connect-src\) : https:\/\/abc\.supabase\.co\/rest\/v1\/t\n/
  );
  assert.match(r.sortie, /violation CSP \(script-src-elem\) : inline/);
  assert.doesNotMatch(r.sortie, /apikey|secret/);
  assert.equal(r.rapport.erreurs.length, 2, 'les doublons comptent une fois');

  const rapport = await visiter({
    consoles: [
      "[Report Only] Refused to connect to 'https://x.test/' because it violates the following Content Security Policy directive: \"connect-src 'self'\".",
    ],
  });
  assert.equal(rapport.code, 0, rapport.sortie);
});

test('visite : la console sert de second filet (un worker n’émet pas l’événement)', async () => {
  const r = await visiter({
    consoles: [
      "Refused to load the script 'https://cdn.test/w.js?t=1' because it violates the following Content Security Policy directive: \"worker-src 'self'\".",
    ],
  });
  assert.equal(r.code, 1, r.sortie);
  assert.match(
    r.sortie,
    /violation CSP : Refused to load the script 'https:\/\/cdn\.test\/w\.js'/
  );
});

test('visite : les écarts mineurs avertissent sans rendre rouge', async () => {
  const r = await visiter({
    exceptions: ['Failed to register a ServiceWorker'],
    echecsReseau: [
      { url: `${SITE}assets/a.js`, erreur: 'net::ERR_ABORTED' },
      { url: `${SITE}assets/b.js`, erreur: 'net::ERR_CONNECTION_RESET' },
      {
        url: 'https://eu.i.posthog.com/e',
        erreur: 'net::ERR_BLOCKED_BY_CLIENT',
      },
    ],
  });
  assert.equal(r.code, 0, r.sortie);
  assert.match(
    r.sortie,
    /::warning title=Vérification après déploiement::exception non rattrapée : Failed to register a ServiceWorker/
  );
  assert.match(
    r.sortie,
    /requête de même origine interrompue : \/miss-x\/assets\/b\.js \(net::ERR_CONNECTION_RESET\)/
  );
  assert.doesNotMatch(r.sortie, /assets\/a\.js|posthog/);
});

test('visite : une page qui ne s’ouvre pas, ou répond 404, échoue', async () => {
  const dns = await visiter({
    gotoErreur: 'net::ERR_NAME_NOT_RESOLVED at https://x',
  });
  assert.equal(dns.code, 1);
  assert.match(
    dns.sortie,
    /la page ne s'ouvre pas : net::ERR_NAME_NOT_RESOLVED/
  );

  const absente = await visiter({ statut: 404 });
  assert.equal(absente.code, 1);
  assert.match(
    absente.sortie,
    /la page répond HTTP 404 : https:\/\/mister-guiiug\.github\.io\/miss-x\//
  );
});

test('visite : en lecture seule — analytique, session et écritures chez un tiers bloquées', async () => {
  const requetes = [
    { url: `${SITE}assets/index.js` },
    { url: `${SITE}api`, method: 'POST' },
    { url: 'https://abc.supabase.co/rest/v1/tenants?select=id' },
    { url: 'https://abc.supabase.co/rest/v1/rpc/f', method: 'POST' },
    { url: 'https://abc.supabase.co/auth/v1/token?grant_type=password' },
    { url: 'https://identitytoolkit.googleapis.com/v1/accounts:signUp' },
    { url: 'https://eu.i.posthog.com/decide' },
    { url: 'https://www.googletagmanager.com/gtag/js' },
    { url: 'https://o1.ingest.de.sentry.io/api/1/envelope/' },
  ];
  const r = await visiter({ requetes });
  assert.equal(r.code, 0, r.sortie);
  const decisions = Object.fromEntries(
    r.faits
      .filter(f => f.route)
      .map(f => [`${f.methode} ${f.route}`, f.decision])
  );
  assert.deepEqual(decisions, {
    [`GET ${SITE}assets/index.js`]: 'continue',
    [`POST ${SITE}api`]: 'continue',
    'GET https://abc.supabase.co/rest/v1/tenants?select=id': 'continue',
    'POST https://abc.supabase.co/rest/v1/rpc/f': 'abort',
    'GET https://abc.supabase.co/auth/v1/token?grant_type=password': 'abort',
    'GET https://identitytoolkit.googleapis.com/v1/accounts:signUp': 'abort',
    'GET https://eu.i.posthog.com/decide': 'abort',
    'GET https://www.googletagmanager.com/gtag/js': 'abort',
    'GET https://o1.ingest.de.sentry.io/api/1/envelope/': 'abort',
  });
});

test('visite : au-delà de neuf écarts, le compte, et le détail dans verification.json', async () => {
  const reponses = Array.from({ length: 12 }, (_, i) => ({
    url: `${SITE}assets/m${i}.js`,
    status: 404,
  }));
  const r = await visiter({ reponses });
  assert.equal(r.code, 1);
  assert.equal((r.sortie.match(/::error /g) ?? []).length, 10);
  assert.match(
    r.sortie,
    /… et 3 autre\(s\) écart\(s\), cf\. verification\.json\./
  );
  assert.equal(r.rapport.erreurs.length, 12);
});
