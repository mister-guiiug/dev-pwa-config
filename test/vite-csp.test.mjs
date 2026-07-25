import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { cspPlugin } from '../vite-csp.js';

const run = (opts, html) => cspPlugin(opts).transformIndexHtml.handler(html);

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
  const out = run(
    {
      dev: false,
      connectSrc: ["'self'", 'https://x.supabase.co'],
      extraDirectives: { 'frame-ancestors': "'none'" },
    },
    HTML
  );
  assert.match(out, /connect-src 'self' https:\/\/x\.supabase\.co/);
  assert.match(out, /frame-ancestors 'none'/);
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
