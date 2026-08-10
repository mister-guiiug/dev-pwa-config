#!/usr/bin/env node
/**
 * Sert `showroom/` en local, sans dépendance, dans les mêmes conditions que
 * GitHub Pages (http:// plutôt que file://, où `localStorage` et le cache se
 * comportent différemment).
 *
 *   npm run showroom            → http://127.0.0.1:5220
 *   npm run showroom -- 5300    → port explicite
 *
 * Non publié (absent de `files`) : outil de développement du dépôt.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('../showroom/', import.meta.url));
const PORT = Number(process.argv[2]) || 5220;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;

  // Confinement strict à `showroom/` : un `..` encodé ne doit pas remonter.
  const target = join(ROOT, normalize(decodeURIComponent(requested)));
  if (!target.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const body = await readFile(target);
    res.writeHead(200, {
      'content-type': TYPES[extname(target)] ?? 'application/octet-stream',
      // Page de doc éditée en continu : jamais de cache.
      'cache-control': 'no-store',
    });
    res.end(body);
  } catch {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404');
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Showroom : http://127.0.0.1:${PORT}`);
});
