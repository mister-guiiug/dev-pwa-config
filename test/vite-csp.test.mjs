import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { cspPlugin, ANALYTICS_HOSTS } from '../vite-csp.js';

const run = (opts, html) => cspPlugin(opts).transformIndexHtml.handler(html);

/** Contenu de la CSP produite pour un HTML donné. */
const render = (html, opts = {}) =>
  /content="([^"]+)"/.exec(run(opts, html))[1];

/**
 * Sources déclarées pour une directive, en LISTE.
 *
 * Chercher `https://www.googletagmanager.com` comme sous-chaîne de la politique
 * entière est un test faible — et CodeQL le signale à raison (« incomplete URL
 * substring sanitization ») : `https://www.googletagmanager.com.evil.test`
 * contient la même sous-chaîne. On compare donc des jetons entiers.
 */
const sourcesOf = (csp, directive) => {
  const found = csp
    .split(';')
    .map(part => part.trim().split(/\s+/))
    .find(([name]) => name === directive);
  return found ? found.slice(1) : [];
};

const SCRIPT =
  "(function(){document.documentElement.dataset.theme='dark';})();";
const HASH = `'sha256-${createHash('sha256').update(SCRIPT).digest('base64')}'`;
const HTML = `<!doctype html><html><head><meta charset="UTF-8" /><script>${SCRIPT}</script></head><body></body></html>`;

test('prod: hashes inline scripts, drops unsafe-inline', () => {
  const out = run({ dev: false }, HTML);
  assert.match(out, /http-equiv="Content-Security-Policy"/);
  assert.ok(
    out.includes(`script-src 'self' ${HASH}`),
    'script-src carries the hash'
  );
  assert.ok(
    !/script-src[^;"]*unsafe-inline/.test(out),
    'no unsafe-inline in script-src'
  );
});

test('dev: keeps unsafe-inline (Fast Refresh preamble not hashable)', () => {
  const out = run({ dev: true }, HTML);
  assert.match(out, /script-src 'self' 'unsafe-inline'/);
});

test('no inline script: script-src is just self', () => {
  const out = run({ dev: false }, '<head><meta charset="UTF-8" /></head>');
  assert.match(out, /script-src 'self'(;| ')/);
});

test('normalizes CRLF to LF before hashing (Windows-safe)', () => {
  const body = 'a();\nb();';
  const lfHash = `'sha256-${createHash('sha256').update(body).digest('base64')}'`;
  const crlf = `<head><meta charset="UTF-8" /><script>${body.replace(/\n/g, '\r\n')}</script></head>`;
  assert.ok(run({ dev: false }, crlf).includes(lfHash), 'CRLF hashed as if LF');
});

test('replaces a pre-existing static CSP meta (single source of truth)', () => {
  const withMeta =
    '<head><meta charset="UTF-8" /><meta http-equiv="Content-Security-Policy" content="default-src \'none\'" /></head>';
  const out = run({ dev: false }, withMeta);
  assert.ok(!out.includes("default-src 'none'"), 'old policy gone');
  assert.equal(
    (out.match(/http-equiv="Content-Security-Policy"/g) || []).length,
    1,
    'exactly one CSP meta'
  );
});

test('connectSrc + extraDirectives are honored', () => {
  // `frame-ancestors` servait ici d'exemple de directive supplémentaire — mais
  // un navigateur l'ignore dans un <meta>, et le plugin la refuse désormais.
  // `media-src`, elle, s'applique bien.
  const out = run(
    {
      dev: false,
      connectSrc: ["'self'", 'https://x.supabase.co'],
      extraDirectives: { 'media-src': "'self' blob:" },
    },
    HTML
  );
  assert.match(out, /connect-src 'self' https:\/\/x\.supabase\.co/);
  assert.match(out, /media-src 'self' blob:/);
});

test('ignores <script src> and typed scripts (only bare <script> hashed)', () => {
  const html =
    '<head><meta charset="UTF-8" /><script type="application/ld+json">{"@context":"x"}</script><script src="/main.js"></script></head>';
  const out = run({ dev: false }, html);
  assert.ok(
    out.includes("script-src 'self';"),
    'no hashes: nothing bare to hash'
  );
});

/* ── Le couple avec pwaSeoPlugin ────────────────────────────────────────── */

test('analytics: autorise exactement les hôtes de PostHog, et rien de plus', () => {
  // Les origines sont COMPARÉES ENTIÈREMENT à ce que le module déclare, jamais
  // cherchées comme sous-chaîne : `includes('https://eu.i.posthog.com')`
  // accepterait `https://eu.i.posthog.com.evil.test`, et CodeQL le signale à
  // raison. L'égalité de liste est aussi un test plus fort — un hôte en trop
  // échoue, au lieu de passer inaperçu.
  const csp = render('<head><meta charset="utf-8"></head>', {
    analytics: true,
  });

  const hashes = sourcesOf(csp, 'script-src').filter(source =>
    source.startsWith("'sha256-")
  );
  assert.deepEqual(sourcesOf(csp, 'script-src'), [
    "'self'",
    ...ANALYTICS_HOSTS.script,
    ...hashes,
  ]);
  assert.deepEqual(sourcesOf(csp, 'connect-src'), [
    "'self'",
    ...ANALYTICS_HOSTS.connect,
  ]);

  // NI IMAGE NI CADRE. Les deux n'existaient que pour Google — le pixel de
  // `google-analytics.com` et l'`iframe` `noscript` de GTM. Les garder
  // « au cas où » laisserait une permission que plus rien ne justifie.
  assert.deepEqual(ANALYTICS_HOSTS.img, []);
  assert.deepEqual(ANALYTICS_HOSTS.frame, []);

  // Une CSP trop étroite coupe la mesure SANS erreur de build : c'est
  // exactement ainsi que le parc a perdu la passerelle OMS de mister-cim10.
  assert.ok(
    ANALYTICS_HOSTS.connect.every(h => h.startsWith('https://eu')),
    'le nuage EUROPÉEN, seule raison d’avoir quitté GA4'
  );
});

test('sans analytics, rien de Google n’est autorisé', () => {
  // Comparaison à la valeur EXACTE de chaque directive : n'importe quel hôte
  // en trop échoue, sans avoir à chercher un nom de domaine dans la politique.
  const csp = render('<head><meta charset="utf-8"></head>');
  assert.deepEqual(sourcesOf(csp, 'script-src'), ["'self'"]);
  assert.deepEqual(sourcesOf(csp, 'frame-src'), ["'none'"]);
  assert.deepEqual(sourcesOf(csp, 'connect-src'), ["'self'"]);
  assert.deepEqual(sourcesOf(csp, 'img-src'), ["'self'", 'data:', 'blob:']);
  assert.deepEqual(sourcesOf(csp, 'font-src'), ["'self'", 'data:']);
});

/** Le plugin AVEC la configuration résolue : c'est là que Vite met le DSN. */
const rendreAvecEnv = (env, opts = {}) => {
  const plugin = cspPlugin(opts);
  plugin.configResolved({ env });
  const html = plugin.transformIndexHtml.handler(
    '<head><meta charset="utf-8"></head>'
  );
  return /content="([^"]+)"/.exec(html)[1];
};

test('le DSN Sentry ouvre connect-src — et lui seul', () => {
  // LA PANNE QUE CE TEST FIGE. Le 19/09/2026, les vingt sites du parc
  // embarquaient un DSN et AUCUN n'autorisait Sentry dans `connect-src` :
  // chaque enveloppe partait dans le vide, et la console du navigateur était
  // le seul endroit où ça se voyait. Personne ne regarde la console d'un site
  // qui marche.
  const csp = rendreAvecEnv({
    VITE_SENTRY_DSN:
      'https://66aba99b443779fb61a5e7c1663bb88c@o4511240922005504.ingest.de.sentry.io/4512097655652432',
  });
  assert.deepEqual(sourcesOf(csp, 'connect-src'), [
    "'self'",
    'https://o4511240922005504.ingest.de.sentry.io',
  ]);

  // L'ORIGINE, PAS UN JOKER : `https://*.ingest.de.sentry.io` ouvrirait la
  // politique aux projets de tous les autres comptes hébergés là.
  assert.ok(!csp.includes('*'), 'aucun joker dans la politique');
  // Ni la clé publique du DSN, ni le chemin du projet n'ont à s'y trouver.
  assert.ok(!csp.includes('66aba99b'), 'la clé du DSN ne fuit pas dans la CSP');
  assert.ok(!csp.includes('4512097655652432'), 'ni le numéro de projet');
});

test('sans DSN, ou avec un DSN illisible, la politique ne bouge pas', () => {
  // Un fork, un développement local, une app sans observabilité : rien à
  // ouvrir. Et un DSN mal recopié ne casse pas le build — Sentry ne
  // s'initialisera pas non plus, la politique reste simplement fermée.
  for (const env of [
    {},
    { VITE_SENTRY_DSN: '' },
    { VITE_SENTRY_DSN: 'pas-une-url' },
  ]) {
    assert.deepEqual(
      sourcesOf(rendreAvecEnv(env), 'connect-src'),
      ["'self'"],
      `env = ${JSON.stringify(env)}`
    );
  }
});

test('le DSN s’ajoute AUX hôtes de mesure, sans en déloger un', () => {
  const csp = rendreAvecEnv(
    { VITE_SENTRY_DSN: 'https://k@o1.ingest.de.sentry.io/2' },
    { analytics: true, connectSrc: ["'self'", 'https://x.supabase.co'] }
  );
  assert.deepEqual(sourcesOf(csp, 'connect-src'), [
    "'self'",
    'https://x.supabase.co',
    ...ANALYTICS_HOSTS.connect,
    'https://o1.ingest.de.sentry.io',
  ]);
});

test("frame-src 'none' ne se mélange jamais à des hôtes", () => {
  // `'none'` mêlé à une liste produit une directive malformée, interprétée
  // différemment selon les navigateurs.
  //
  // LA PRÉMISSE S'EST INVERSÉE LE 18/09/2026, et l'invariant, lui, tient. Ce
  // test gardait le cas « analytics ajoute l'hôte de l'iframe GTM à un
  // `frame-src` qui valait `'none'` ». PostHog n'a besoin d'aucun cadre :
  // `frame-src` reste donc `'none'`, ce qui est la bonne réponse et non un
  // défaut. On vérifie la règle — jamais les deux à la fois — plutôt que la
  // situation d'hier.
  const csp = render('<head><meta charset="utf-8"></head>', {
    analytics: true,
  });
  const frameSrc = /frame-src ([^;]+)/.exec(csp)[1].trim();
  const sources = frameSrc.split(/\s+/u);
  assert.ok(
    !sources.includes("'none'") || sources.length === 1,
    `directive malformée : ${frameSrc}`
  );
});

test('une directive inerte en <meta> est retirée, et signalée', () => {
  // `frame-ancestors` dans un <meta> est ignorée par le navigateur : la relayer
  // afficherait une protection anti-clickjacking inexistante. Huit apps de la
  // famille la passent pourtant — d'où un avertissement, et non une exception
  // qui casserait huit builds pour retirer quelque chose d'inerte.
  const warnings = [];
  const original = console.warn;
  console.warn = message => warnings.push(String(message));
  try {
    for (const name of ['frame-ancestors', 'report-uri', 'sandbox']) {
      const csp = render('<head><meta charset="utf-8"></head>', {
        extraDirectives: { [name]: "'none'" },
      });
      assert.doesNotMatch(
        csp,
        new RegExp(name),
        `${name} ne doit pas être posée`
      );
    }
  } finally {
    console.warn = original;
  }
  assert.equal(warnings.length, 3, 'chaque retrait doit être signalé');
  for (const name of ['frame-ancestors', 'report-uri', 'sandbox']) {
    assert.ok(
      warnings.some(w => w.includes(name)),
      `l'avertissement doit nommer ${name}`
    );
  }
  assert.ok(
    warnings.every(w => w.includes('en-tête')),
    'l’avertissement doit dire où poser la protection pour de vrai'
  );
});

test('le template ne porte plus de directive inerte', () => {
  const template = readFileSync(
    new URL('../templates/index.html', import.meta.url),
    'utf8'
  );
  const meta =
    /http-equiv="Content-Security-Policy"[\s\S]*?content="([^"]+)"/.exec(
      template
    );
  assert.ok(meta, 'CSP statique introuvable dans le template');
  assert.doesNotMatch(meta[1], /frame-ancestors/);
  assert.match(meta[1], /frame-src 'none'/);
});

test('le script anti-FOUC injecté par pwaSeoPlugin est haché par la CSP', async () => {
  // Les deux greffons sont documentés côte à côte ; `cspPlugin` hache en
  // `order: 'post'` à partir du HTML FINAL. Un script injecté par l'autre doit
  // donc être couvert sans réglage — sinon la CSP le bloquerait, et la page
  // s'afficherait en clair avant de basculer : le flash que ce script existe
  // pour supprimer, réintroduit par la protection censée le laisser passer.
  const { pwaSeoPlugin } = await import('../vite-pwa-base.js');
  const seo = pwaSeoPlugin({ themeBoot: true, sitemap: false, robots: false });
  const csp = cspPlugin({});

  const source =
    '<!doctype html><html><head><title>x</title></head><body></body></html>';
  const withBoot = seo.transformIndexHtml(source);
  const final = csp.transformIndexHtml.handler(withBoot);

  const meta = /content="([^"]+)"/.exec(final);
  assert.ok(meta, 'aucune CSP injectée');
  const inline = /<script\s*>([\s\S]*?)<\/script\s*>/i.exec(withBoot);
  assert.ok(inline, 'le script anti-FOUC est absent du HTML');

  const { createHash } = await import('node:crypto');
  const hash = `'sha256-${createHash('sha256').update(inline[1], 'utf8').digest('base64')}'`;
  assert.ok(
    meta[1].includes(hash),
    'le hash du script anti-FOUC ne figure pas dans script-src'
  );
});

test('un script inline en majuscules ou espacé est haché comme les autres', async () => {
  // LE DÉFAUT, signalé par CodeQL sur les tests de cette PR — mais il vit dans
  // le greffon, pas dans les tests. `/<script>/` sans `i` ne voit ni `<SCRIPT>`
  // ni `<script >`. Ces scripts ne sont donc PAS hachés, et la CSP les bloque :
  // l'app se casse en production alors que le développement fonctionnait.
  //
  // Le périmètre reste volontairement le même : seuls les `<script>` SANS
  // attribut sont hachés. `<script src>` est couvert par `'self'`, et
  // `<script type="application/ld+json">` n'est pas exécuté.
  const plugin = cspPlugin({});
  const html =
    '<!doctype html><html><head>' +
    '<SCRIPT>var a = 1;</SCRIPT>' +
    '<script >var b = 2;</script>' +
    '<script>var c = 3;</script>' +
    '<script type="application/ld+json">{"@type":"x"}</script>' +
    '<script src="/app.js"></script>' +
    '</head><body></body></html>';

  const out = plugin.transformIndexHtml.handler(html);
  const csp = /content="([^"]+)"/.exec(out)[1];
  const { createHash } = await import('node:crypto');
  const hash = body =>
    `'sha256-${createHash('sha256').update(body, 'utf8').digest('base64')}'`;

  for (const [label, body] of [
    ['majuscules', 'var a = 1;'],
    ['espacé', 'var b = 2;'],
    ['ordinaire', 'var c = 3;'],
  ]) {
    assert.ok(csp.includes(hash(body)), `script ${label} non haché`);
  }
  // Et rien de plus : le JSON-LD et le script externe restent hors du compte.
  assert.equal((csp.match(/'sha256-/g) ?? []).length, 3);
});

/*
 * LA SONDE `new Function` DE ZOD, QUE CETTE CSP FAIT ÉCHOUER.
 *
 * Mesuré le 19/09/2026 dans un vrai navigateur, sur deux builds de la même
 * page, même CSP, seul le bundle change :
 *
 *   sans le greffon : 1 violation `script-src` à la ligne de `allowsEval`
 *   avec le greffon : 0 violation — et le même schéma accepte et refuse
 *                     exactement les mêmes valeurs.
 *
 * Ce qui suit fige le mécanisme, pas la mesure : l'alias n'est posé qu'au
 * build, il ne vise que le spécificateur nu, et le module qu'il livre appelle
 * `config` APRÈS le corps de zod et AVANT celui de ses consommateurs.
 */
const ID_JITLESS = '\0dwc-zod-jitless';

test('zod : l’alias jitless n’est posé qu’au build', () => {
  const plugin = cspPlugin({});
  assert.equal(
    plugin.config({ root: process.cwd() }, { command: 'serve' }),
    undefined,
    'en développement, aliaser zod le sortirait du pré-bundling de Vite'
  );

  const bati = plugin.config({ root: process.cwd() }, { command: 'build' });
  assert.deepEqual(
    bati.resolve.alias.map(a => [String(a.find), a.replacement]),
    [['/^zod$/', ID_JITLESS]]
  );
});

test('zod : l’alias est ancré, il ne mange pas les sous-chemins', () => {
  // `{ find: 'zod' }` serait un PRÉFIXE pour Vite : `zod/v4/core`,
  // `zod/locales` et `zod/mini` seraient réécrits vers le module d'amorce,
  // qui ne les exporte pas. L'ancre `^…$` est ce qui rend l'alias sûr.
  const { find } = cspPlugin({}).config(
    { root: process.cwd() },
    { command: 'build' }
  ).resolve.alias[0];
  assert.ok(find.test('zod'));
  for (const autre of ['zod/v4/core', 'zod/locales', 'zod/mini', 'myzod']) {
    assert.ok(!find.test(autre), `${autre} ne doit pas être réécrit`);
  }
});

test('zod : sans zod installé, aucun alias — et le build ne casse pas', () => {
  // Fork, app sans validation : le greffon se tait. Une racine hors de tout
  // node_modules contenant zod suffit à le prouver.
  const plugin = cspPlugin({});
  const racineSansZod = path.parse(process.cwd()).root;
  assert.equal(
    plugin.config({ root: racineSansZod }, { command: 'build' }),
    undefined
  );
});

test('zod : le module d’amorce coupe la sonde sans rien retirer à zod', () => {
  const plugin = cspPlugin({});
  plugin.config({ root: process.cwd() }, { command: 'build' });

  assert.equal(plugin.resolveId('zod'), null, 'zod nu passe par l’alias');
  assert.equal(plugin.resolveId(ID_JITLESS), ID_JITLESS);
  assert.equal(plugin.load('autre-module'), null);

  const source = plugin.load(ID_JITLESS);
  const cible = /import \{ z \} from "([^"]+)"/.exec(source)[1];
  assert.ok(
    existsSync(cible) && cible.endsWith('.js'),
    `le module d’amorce doit viser le zod ES de l’app, pas ${cible}`
  );
  // La même forme que `zod/index.js` : l'étoile reprend tout le nommé, `z`
  // compris ; `default` ne voyage jamais par une étoile, donc il est réexporté
  // à la main. En oublier un casserait `import z from 'zod'` dans les apps.
  assert.match(source, /export \* from "/);
  assert.match(source, /export \{ z as default \};/);
  // Et l'appel vient APRÈS les imports : le corps de zod s'exécute d'abord,
  // celui de ses consommateurs — donc le premier `z.object()` — ensuite.
  assert.ok(
    source.indexOf('z.config({ jitless: true });') >
      source.lastIndexOf('export * from'),
    'l’appel doit suivre les réexports'
  );
});
