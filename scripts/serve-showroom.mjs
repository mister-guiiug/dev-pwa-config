#!/usr/bin/env node
/**
 * Sert `showroom/` en local, sans dépendance, dans les mêmes conditions que
 * GitHub Pages : en http:// (un module ES ne se charge pas en `file://`) et
 * SOUS `/dev-pwa-config/`, le chemin de publication.
 *
 *   npm run showroom            → http://127.0.0.1:5220/dev-pwa-config/
 *   npm run showroom -- 5300    → port explicite
 *
 * POURQUOI LE PRÉFIXE. Servie à la racine, la page ne voyait pas ce qui sort
 * de son dossier : `../command.js` y retombait sur `showroom/command.js`. Sur
 * Pages, le même chemin vise la racine de l'origine, que publie un autre
 * dépôt. Ici, tout ce qui n'est pas sous `/dev-pwa-config/` répond 404, comme
 * en production quand le hub n'a pas le fichier.
 *
 * Non publié (absent de `files`) : outil de développement du dépôt.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { politiquePour } from './showroom-csp.mjs';

const ROOT = fileURLToPath(new URL('../showroom/', import.meta.url));
const PORT = Number(process.argv[2]) || 5220;
const PREFIXE = '/dev-pwa-config/';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  if (url.pathname === '/' || url.pathname === PREFIXE.slice(0, -1)) {
    res.writeHead(302, { location: PREFIXE + url.search }).end();
    return;
  }
  if (!url.pathname.startsWith(PREFIXE)) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('404 : hors de /dev-pwa-config/, comme sur Pages');
    return;
  }
  const relatif = url.pathname.slice(PREFIXE.length) || 'index.html';

  // Confinement strict à `showroom/` : un `..` encodé ne doit pas remonter.
  const target = join(ROOT, normalize(decodeURIComponent(relatif)));
  if (!target.startsWith(ROOT.endsWith(sep) ? ROOT : ROOT + sep)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    let body = await readFile(target);
    // La CSP n'autorise que l'adresse publiée : servie d'ici, la page n'aurait
    // plus un seul script. On la tourne vers cette adresse-ci, chemin compris,
    // pour garder la même restriction au dossier qu'en production.
    if (extname(target) === '.html') {
      body = Buffer.from(
        politiquePour(String(body), `http://127.0.0.1:${PORT}${PREFIXE}`)
      );
    }
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
  console.log(`Showroom : http://127.0.0.1:${PORT}${PREFIXE}`);
});
