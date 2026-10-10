#!/usr/bin/env node
/**
 * SONDER LES SITES PUBLIÉS : ce que chaque app promet vraiment à un
 * navigateur, mesuré sur `https://mister-guiiug.github.io/<app>/`.
 *
 *   node scripts/probe-sites.mjs [app…]            # défaut : hub + catalogue
 *   node scripts/probe-sites.mjs --hub             # manifeste du hub seulement
 *   node scripts/probe-sites.mjs --hub --strict    # exit 1 si portée mauvaise
 *   node scripts/probe-sites.mjs --json > relevé.json
 *   node scripts/probe-sites.mjs --seo [app…]      # ce qu'un moteur en lit
 *
 * LE MODE `--seo` (29/09/2026). La sortie texte n'affichait ni le JSON-LD, ni
 * le contenu servi, ni la longueur du titre et de la description, et la sonde
 * ne lisait aucune page de contenu : l'audit SEO du parc a dû écrire ses
 * propres scripts. Par app, il affiche les longueurs du titre et de la
 * description, les types JSON-LD de l'accueil, les mots du contenu servi, le
 * statut des pages de contenu du plan de site (françaises et anglaises, `en/`)
 * et la présence des `hreflang`. `--json` porte le détail sous `seo`.
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
import { FAMILY_APPS, GITHUB_OWNER, pagesUrl } from '../apps-catalog.js';
import { estPointDEntree } from './entree.mjs';
import {
  decodeEntities,
  hreflangLinks,
  htmlMarkers,
  isAppShell,
  jsonLdTypes,
  manifestSummary,
  problemePorteeHubPublie,
  resolveUrl,
  servedContentWords,
} from './site-readers.mjs';

const ORIGIN = `https://${GITHUB_OWNER}.github.io`;

/**
 * Sonde le MANIFESTE DU HUB : sa portée ne doit couvrir aucune app Pages.
 * C'est la garde live du bug Android « déjà installée » (hub scope « / »).
 */
export async function probeHub(fetchImpl = fetch) {
  const url = `${ORIGIN}/manifest.webmanifest`;
  let httpStatus = 0;
  let manifest = null;
  try {
    const res = await fetchImpl(url, { redirect: 'follow' });
    httpStatus = res.status;
    if (res.ok) manifest = manifestSummary(await res.text());
  } catch {
    httpStatus = 0;
  }
  const appIds = FAMILY_APPS.filter(a => a.appUrl === pagesUrl(a.id)).map(
    a => a.id
  );
  const probleme = problemePorteeHubPublie(manifest ?? {}, {
    origin: ORIGIN,
    appIds,
  });
  return { url, status: httpStatus, manifest, probleme, appIds };
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

/** Les `<loc>` d'un plan de site, entités décodées. */
export function sitemapLocs(xml) {
  return [...String(xml).matchAll(/<loc>([^<]{1,2048})<\/loc>/g)].map(m =>
    decodeEntities(m[1].trim())
  );
}

/** Une longueur en caractères (glyphes), entités décodées ; `null` sans texte. */
const longueur = texte =>
  texte == null ? null : [...decodeEntities(texte)].length;

/**
 * CE QU'UN MOTEUR LIT D'UN SITE (`--seo`) : l'accueil, puis chaque page de
 * contenu que déclare son plan de site — tout `<loc>` en `.html`, les pages
 * anglaises sous `en/`. Pour chacune : le statut, les types JSON-LD, le nombre
 * de `hreflang`.
 *
 * @param {string} app
 * @param {string} html L'accueil, déjà lu.
 * @param {typeof fetch} fetchImpl
 */
export async function probeSeo(app, html, fetchImpl = fetch) {
  const base = `${ORIGIN}/${app}/`;
  const m = htmlMarkers(html);
  let locs = [];
  try {
    const plan = await fetchImpl(`${base}sitemap.xml`, { redirect: 'follow' });
    if (plan.ok) locs = sitemapLocs(await plan.text());
  } catch {
    /* pas de plan de site : aucune page à sonder */
  }
  const pages = [];
  for (const url of locs.filter(u => u.endsWith('.html'))) {
    let status = 0;
    let corps = '';
    try {
      const res = await fetchImpl(url, { redirect: 'follow' });
      status = res.status;
      if (res.ok) corps = await res.text();
    } catch {
      /* injoignable : statut 0 */
    }
    pages.push({
      url,
      en: new URL(url).pathname.startsWith(`/${app}/en/`),
      status,
      hreflang: hreflangLinks(corps).length,
      jsonLdTypes: jsonLdTypes(corps),
    });
  }
  return {
    titleLength: longueur(m.title),
    descriptionLength: longueur(m.descriptionContent),
    jsonLdTypes: jsonLdTypes(html),
    servedWords: servedContentWords(html),
    hreflang: hreflangLinks(html).length,
    pages,
  };
}

/** Sonde un site. `fetchImpl` est injectable pour les tests. */
export async function probe(app, fetchImpl = fetch, options = {}) {
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
  let fallback;
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
    ...(options.seo ? { seo: await probeSeo(app, html, fetchImpl) } : {}),
  };
}

/** La ligne `--seo` d'un site. */
export function seoLine(r) {
  const s = r.seo;
  const fr = s.pages.filter(p => !p.en);
  const en = s.pages.filter(p => p.en);
  const servies = liste =>
    `${liste.filter(p => p.status === 200).length}/${liste.length}`;
  const avecHreflang = s.pages.filter(p => p.hreflang > 0).length;
  return [
    r.app.padEnd(18),
    `titre=${s.titleLength ?? '-'}c`,
    `desc=${s.descriptionLength ?? '-'}c`,
    `ld=${s.jsonLdTypes.join('+') || '-'}`,
    `servi=${s.servedWords} mots`,
    `pages=${servies(fr)}`,
    `en=${servies(en)}`,
    `hreflang=accueil:${s.hreflang} pages:${avecHreflang}/${s.pages.length}`,
  ].join('  ');
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
  const seo = args.includes('--seo');
  const strict = args.includes('--strict');
  const hubSeul = args.includes('--hub');
  const demandees = args.filter(a => !a.startsWith('--'));
  const apps = hubSeul
    ? []
    : demandees.length
      ? demandees
      : // Une app sans site Pages (mister-quota, Electron) pointe ailleurs.
        FAMILY_APPS.filter(app => app.appUrl === pagesUrl(app.id)).map(
          app => app.id
        );
  const results = [];
  let echec = false;

  // Par défaut (et avec `--hub`), on sonde le manifeste du catalogue : une
  // portée « / » en production est une régression silencieuse pour Android.
  if (hubSeul || (!demandees.length && !seo)) {
    try {
      const hub = await probeHub(fetch);
      results.push({ app: '(hub)', ...hub });
      if (!json) {
        if (hub.probleme) {
          console.log(
            `(hub)`.padEnd(18),
            `FAIL ${hub.probleme.code} : ${hub.probleme.detail}` +
              (hub.probleme.apps ? ` [${hub.probleme.apps.join(', ')}]` : '')
          );
          echec = true;
        } else if (hub.status !== 200 || !hub.manifest) {
          console.log(`(hub)`.padEnd(18), `FAIL manifeste HTTP ${hub.status}`);
          echec = true;
        } else {
          console.log(
            `(hub)`.padEnd(18),
            `ok scope=${hub.manifest.scope} id=${hub.manifest.id ?? '-'}`
          );
        }
      } else if (hub.probleme || hub.status !== 200) {
        echec = true;
      }
    } catch (error) {
      echec = true;
      if (!json)
        console.log(`(hub)`.padEnd(18), `injoignable : ${error.message}`);
    }
  }

  for (const app of apps) {
    try {
      const r = await probe(app, fetch, { seo });
      results.push(r);
      if (!json) console.log(seo ? seoLine(r) : line(r));
    } catch (error) {
      if (!json)
        console.log(`${app.padEnd(18)}  injoignable : ${error.message}`);
    }
  }
  if (json) console.log(JSON.stringify(results, null, 2));
  if (strict && echec) process.exit(1);
}

if (estPointDEntree(import.meta.url)) {
  await run(process.argv.slice(2));
}
