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
 * vivent dans `site-readers.mjs`, publié avec `pwa-doctor`, et testées là ;
 * le réseau ne l'est pas.
 *
 * Non publié (absent de `files`) : outillage de développement du dépôt.
 */
import { pathToFileURL } from 'node:url';
import { FAMILY_APPS, GITHUB_OWNER, pagesUrl } from '../apps-catalog.js';
import {
  htmlMarkers,
  isAppShell,
  manifestSummary,
  resolveUrl,
} from './site-readers.mjs';

const ORIGIN = `https://${GITHUB_OWNER}.github.io`;

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
    // LE CORPS D'INDEX.HTML EST LA COQUILLE, quel que soit le nom de l'élément
    // racine. `isAppShell` ne reconnaît que `root` et `app` ; mister-cim10
    // monte sur `react-root`, et la sonde le classait « page GitHub » alors
    // que Pages lui servait exactement son index (6 216 octets, relevé du
    // 05/09/2026). L'identité avec la page d'accueil est le critère sûr ;
    // l'heuristique reste pour un index qui varierait d'une réponse à l'autre.
    const corps = await nf.text();
    fallback = corps === html || isAppShell(corps) ? 'coquille' : 'page GitHub';
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
