import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
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

test('analytics: autorise les hôtes que pwaSeoPlugin injecte réellement', async () => {
  const { buildAnalyticsHtmlFragments } = await import('../vite-pwa-base.js');
  const { head, body } = buildAnalyticsHtmlFragments({
    gtmContainerId: 'GTM-ABC123',
  });

  // Les origines sont COMPARÉES ENTIÈREMENT à ce que le module déclare, jamais
  // cherchées comme sous-chaîne : `includes('https://www.googletagmanager.com')`
  // accepterait `https://www.googletagmanager.com.evil.test`, et CodeQL le
  // signale à raison. L'égalité de liste est aussi un test plus fort — un hôte
  // en trop échoue, au lieu de passer inaperçu.
  const origins = [
    ...new Set(
      [...head.matchAll(/https:\/\/[^'"\s)]+/g)].map(
        ([url]) => new URL(url).origin
      )
    ),
  ];
  assert.deepEqual(origins, ANALYTICS_HOSTS.script, 'fragment GTM attendu');

  const iframe = /<iframe[^>]+src="([^"]+)"/.exec(body);
  assert.ok(iframe, 'repli noscript attendu');
  assert.deepEqual([new URL(iframe[1]).origin], ANALYTICS_HOSTS.frame);

  // La page réelle : fragments analytics injectés, PUIS la CSP par-dessus.
  const html = `<head><meta charset="utf-8">${head}</head><body>${body}</body>`;
  const csp = render(html, { analytics: true });

  // Sans ces hôtes, activer les deux plugins du paquet coupe l'analytics sans
  // qu'aucun build n'échoue.
  const hashes = sourcesOf(csp, 'script-src').filter(source =>
    source.startsWith("'sha256-")
  );
  assert.deepEqual(sourcesOf(csp, 'script-src'), [
    "'self'",
    ...ANALYTICS_HOSTS.script,
    ...hashes,
  ]);
  assert.deepEqual(sourcesOf(csp, 'frame-src'), ANALYTICS_HOSTS.frame);
  assert.deepEqual(sourcesOf(csp, 'connect-src'), [
    "'self'",
    ...ANALYTICS_HOSTS.connect,
  ]);
  assert.deepEqual(sourcesOf(csp, 'img-src'), [
    "'self'",
    'data:',
    'blob:',
    ...ANALYTICS_HOSTS.img,
  ]);
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

test("frame-src 'none' ne se mélange jamais à des hôtes", () => {
  // `'none'` mêlé à une liste produit une directive malformée, interprétée
  // différemment selon les navigateurs.
  const csp = render('<head><meta charset="utf-8"></head>', {
    analytics: true,
  });
  const frameSrc = /frame-src ([^;]+)/.exec(csp)[1];
  assert.ok(!frameSrc.includes("'none'"), `directive malformée : ${frameSrc}`);
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
