import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { cspPlugin } from '../vite-csp.js';

const run = (opts, html) => cspPlugin(opts).transformIndexHtml.handler(html);

/** Contenu de la CSP produite pour un HTML donné. */
const render = (html, opts = {}) =>
  /content="([^"]+)"/.exec(run(opts, html))[1];

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
  assert.ok(head.includes('www.googletagmanager.com'), 'fragment GTM attendu');
  assert.ok(body.includes('<iframe'), 'repli noscript attendu');

  // La page réelle : fragments analytics injectés, PUIS la CSP par-dessus.
  const html = `<head><meta charset="utf-8">${head}</head><body>${body}</body>`;
  const csp = render(html, { analytics: true });

  // Sans ces trois-là, activer les deux plugins du paquet coupe l'analytics
  // sans qu'aucun build n'échoue.
  assert.match(csp, /script-src[^;]*https:\/\/www\.googletagmanager\.com/);
  assert.match(csp, /frame-src[^;]*https:\/\/www\.googletagmanager\.com/);
  assert.match(csp, /connect-src[^;]*https:\/\/\*\.google-analytics\.com/);
});

test('sans analytics, rien de Google n’est autorisé', () => {
  const csp = render('<head><meta charset="utf-8"></head>');
  assert.doesNotMatch(csp, /googletagmanager/);
  assert.match(csp, /frame-src 'none'/);
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

test('une directive inerte en <meta> est refusée, pas relayée', () => {
  // `frame-ancestors` dans un <meta> est ignorée par le navigateur : l'accepter
  // reviendrait à afficher une protection anti-clickjacking inexistante.
  for (const name of ['frame-ancestors', 'report-uri', 'sandbox']) {
    assert.throws(
      () =>
        render('<head><meta charset="utf-8"></head>', {
          extraDirectives: { [name]: "'none'" },
        }),
      new RegExp(name),
      `${name} devrait être refusée`
    );
  }
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
