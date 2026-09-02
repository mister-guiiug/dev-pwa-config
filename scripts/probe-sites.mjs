#!/usr/bin/env node
/**
 * SONDER LES SITES PUBLIÉS : ce que chaque app promet vraiment à un
 * navigateur, mesuré sur `https://mister-guiiug.github.io/<app>/`.
 *
 *   node scripts/probe-sites.mjs [app…]            # défaut : le catalogue
 *   node scripts/probe-sites.mjs --json > relevé.json
 *
 * POURQUOI CET OUTIL EXISTE. Le 02/09/2026, une seule sonde — rafraîchir un
 * lien profond — a trouvé quatre apps qui servaient la page 404 de GitHub.
 * Rien dans les dépôts ne le disait : le défaut n'existe qu'en production, à
 * la rencontre d'un build et d'un hébergeur. La même journée, en élargissant
 * la sonde : un manifeste lié à la racine de l'origine (`/manifest.json`)
 * qui répond 404 — l'app ne s'installe pas —, des manifestes en `lang: en`
 * sur des apps françaises, deux sites sans CSP, quatre sans `sitemap`.
 *
 * TROIS LECTURES PAR SITE :
 *
 *   1. `index.html` — langue, titre, description, `theme-color` (et s'il
 *      suit le schéma), CSP, icône iOS, Open Graph, canonique, JSON-LD ;
 *   2. le manifeste — nom, icônes (512, maskable), `display`, `id`, `lang`,
 *      captures, raccourcis ;
 *   3. les annexes — `robots.txt`, `sitemap.xml`, `version.json`, `sw.js`,
 *      `404.html` — et le poids TRANSFÉRÉ du JS initial (scripts de module et
 *      `modulepreload` d'`index.html`), tel que l'hébergeur le sert.
 *
 * LE CODE HTTP NE SUFFIT PAS : GitHub sert un `404.html` personnalisé… en 404.
 * Pour le repli SPA, on lit le CORPS. Les balises `<meta>` s'étalent sur
 * plusieurs lignes dans le HTML de Vite : on aplatit avant de chercher — la
 * première version de cette sonde, écrite en shell, comptait zéro `viewport`
 * sur seize sites pour cette seule raison.
 *
 * Les lectures pures (`htmlMarkers`, `manifestSummary`, `initialScripts`)
 * sont exportées et testées ; le réseau ne l'est pas.
 *
 * Non publié (absent de `files`) : outillage de développement du dépôt.
 */
import { pathToFileURL } from 'node:url';
import { FAMILY_APPS, GITHUB_OWNER, pagesUrl } from '../apps-catalog.js';

const ORIGIN = `https://${GITHUB_OWNER}.github.io`;

/** Compte les occurrences d'un motif dans un HTML aplati. */
const count = (html, re) => (html.match(re) ?? []).length;

/** Ce qu'`index.html` déclare — sur un HTML APLATI (les balises s'étalent). */
export function htmlMarkers(source) {
  const html = String(source).replace(/\s+/g, ' ');
  const attr = (re, name) => {
    const tag = html.match(re)?.[0] ?? '';
    return tag.match(new RegExp(`${name}="([^"]*)"`))?.[1] ?? null;
  };
  return {
    lang: attr(/<html[^>]*>/i, 'lang'),
    title: html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() ?? null,
    viewport: count(html, /<meta[^>]*name="viewport"/gi) > 0,
    description: count(html, /<meta[^>]*name="description"/gi) > 0,
    themeColor: count(html, /<meta[^>]*name="theme-color"/gi),
    themeColorMedia: count(html, /<meta[^>]*name="theme-color"[^>]*media=/gi),
    colorScheme: count(html, /<meta[^>]*name="color-scheme"/gi) > 0,
    csp: count(html, /http-equiv="Content-Security-Policy"/gi) > 0,
    appleTouchIcon: count(html, /rel="apple-touch-icon"/gi) > 0,
    ogImage: count(html, /property="og:image"/gi) > 0,
    canonical: count(html, /rel="canonical"/gi) > 0,
    jsonLd: count(html, /application\/ld\+json/gi) > 0,
    noscript: count(html, /<noscript/gi) > 0,
    manifest: attr(/<link[^>]*rel="manifest"[^>]*>/i, 'href'),
    scripts: initialScripts(html),
  };
}

/** Les scripts chargés au démarrage : modules et `modulepreload`. */
export function initialScripts(source) {
  const html = String(source).replace(/\s+/g, ' ');
  const out = [];
  for (const m of html.matchAll(
    /<script[^>]*type="module"[^>]*src="([^"]+)"/gi
  ))
    out.push(m[1]);
  for (const m of html.matchAll(
    /<link[^>]*rel="modulepreload"[^>]*href="([^"]+)"/gi
  ))
    out.push(m[1]);
  return [...new Set(out)];
}

/** Ce qu'un manifeste promet. `null` si illisible. */
export function manifestSummary(json) {
  let m;
  try {
    m = typeof json === 'string' ? JSON.parse(json) : json;
  } catch {
    return null;
  }
  if (!m || typeof m !== 'object') return null;
  const icons = Array.isArray(m.icons) ? m.icons : [];
  return {
    name: m.name ?? null,
    lang: m.lang ?? null,
    display: m.display ?? null,
    startUrl: m.start_url ?? null,
    hasId: typeof m.id === 'string' && m.id.length > 0,
    icons: icons.length,
    has512: icons.some(i => String(i.sizes ?? '').includes('512')),
    // `any` (un SVG) n'est pas un 512 : Lighthouse veut un PNG de 192 et 512.
    hasPng: icons.some(i => /png/i.test(String(i.type ?? i.src ?? ''))),
    maskable: icons.some(i => String(i.purpose ?? '').includes('maskable')),
    screenshots: Array.isArray(m.screenshots) ? m.screenshots.length : 0,
    shortcuts: Array.isArray(m.shortcuts) ? m.shortcuts.length : 0,
  };
}

/** Résout un lien relatif à un site. */
export function resolveUrl(href, base) {
  if (!href) return null;
  if (/^https?:/i.test(href)) return href;
  if (href.startsWith('/')) return new URL(href, base).href;
  return new URL(href, base).href;
}

/** Le repli SPA : la coquille de l'app, ou la page 404 de GitHub ? */
export function isAppShell(body) {
  return /id="(root|app)"/.test(String(body));
}

async function status(url, fetchImpl) {
  try {
    const res = await fetchImpl(url, { redirect: 'follow' });
    return res.status;
  } catch {
    return 0;
  }
}

/** Le poids transféré d'un fichier, tel que l'hébergeur le sert (gzip). */
async function transferred(url, fetchImpl) {
  try {
    const res = await fetchImpl(url, { redirect: 'follow' });
    const header = Number(res.headers.get('content-length'));
    if (Number.isFinite(header) && header > 0) return header;
    return (await res.arrayBuffer()).byteLength;
  } catch {
    return 0;
  }
}

/** Sonde un site. `fetchImpl` est injectable pour les tests. */
export async function probe(app, fetchImpl = fetch) {
  const base = `${ORIGIN}/${app}/`;
  const res = await fetchImpl(base, { redirect: 'follow' });
  const html = await res.text();
  const markers = htmlMarkers(html);

  let manifest = null;
  let manifestStatus = null;
  if (markers.manifest) {
    const url = resolveUrl(markers.manifest, base);
    const mres = await fetchImpl(url, { redirect: 'follow' });
    manifestStatus = mres.status;
    manifest = mres.ok ? manifestSummary(await mres.text()) : null;
  }

  const annex = {};
  for (const name of ['robots.txt', 'sitemap.xml', 'version.json', 'sw.js']) {
    annex[name] = await status(base + name, fetchImpl);
  }
  let fallback = 'absent';
  try {
    const nf = await fetchImpl(base + 'quelque-chose-qui-n-existe-pas', {
      redirect: 'follow',
    });
    fallback = isAppShell(await nf.text()) ? 'coquille' : 'page GitHub';
  } catch {
    fallback = 'injoignable';
  }

  let initialJsBytes = 0;
  for (const src of markers.scripts) {
    initialJsBytes += await transferred(resolveUrl(src, base), fetchImpl);
  }

  return {
    app,
    status: res.status,
    markers,
    manifestStatus,
    manifest,
    annex,
    fallback,
    initialJsKb: Math.round(initialJsBytes / 1024),
  };
}

function line(r) {
  const m = r.markers;
  const mf = r.manifest;
  const flag = (ok, label) => (ok ? label : `¬${label}`);
  return [
    r.app.padEnd(18),
    `lang=${m.lang ?? '-'}`,
    flag(m.viewport, 'viewport'),
    flag(m.description, 'desc'),
    `theme=${m.themeColor}${m.themeColorMedia ? '/media' : ''}`,
    flag(m.csp, 'csp'),
    flag(m.appleTouchIcon, 'ios-icon'),
    flag(m.ogImage, 'og:image'),
    flag(m.canonical, 'canonical'),
    mf
      ? `manifest[icons=${mf.icons} ${mf.has512 ? '512' : '¬512'} ${mf.maskable ? 'maskable' : '¬maskable'} ${mf.hasId ? 'id' : '¬id'} lang=${mf.lang ?? '-'} shots=${mf.screenshots}]`
      : `manifest=${r.manifestStatus ?? 'absent'}`,
    `robots=${r.annex['robots.txt']}`,
    `sitemap=${r.annex['sitemap.xml']}`,
    `version=${r.annex['version.json']}`,
    `404→${r.fallback}`,
    `js=${r.initialJsKb}kB`,
  ].join('  ');
}

export async function run(args = []) {
  const json = args.includes('--json');
  const demandees = args.filter(a => !a.startsWith('--'));
  const apps = demandees.length
    ? demandees
    : // Une app sans site Pages (mister-quota, Electron) pointe ailleurs.
      FAMILY_APPS.filter(app => app.appUrl === pagesUrl(app.id)).map(
        app => app.id
      );
  const results = [];
  for (const app of apps) {
    try {
      const r = await probe(app);
      results.push(r);
      if (!json) console.log(line(r));
    } catch (error) {
      if (!json)
        console.log(`${app.padEnd(18)}  injoignable : ${error.message}`);
    }
  }
  if (json) console.log(JSON.stringify(results, null, 2));
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  await run(process.argv.slice(2));
}
