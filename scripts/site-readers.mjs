/**
 * LECTURES PURES D'UN SITE : ce qu'un `index.html` et un manifeste promettent.
 *
 * Partagées par la sonde des sites publiés (`probe-sites.mjs`, outil de dépôt)
 * et par `pwa-doctor` (bin publié, qui lit le `dist/` d'un build). Aucun
 * accès réseau ni disque ici : on reçoit du texte, on rend un verdict.
 *
 * Les balises `<meta>` s'étalent sur plusieurs lignes dans le HTML de Vite :
 * on APLATIT avant de chercher — la première version de la sonde, écrite en
 * shell ligne à ligne, comptait zéro `viewport` sur seize sites pour cette
 * seule raison.
 */

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
    // `sizes: any` : un vectoriel qui couvre toutes les tailles pour Chrome.
    hasAny: icons.some(i => String(i.sizes ?? '') === 'any'),
    // iOS et les lanceurs Android n'utilisent pas le SVG : il faut un PNG.
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
  return new URL(href, base).href;
}

/** Le repli SPA : la coquille de l'app, ou la page 404 de GitHub ? */
export function isAppShell(body) {
  return /id="(root|app)"/.test(String(body));
}

/**
 * Le préfixe de site sous lequel vivent les assets d'`index.html` — `/` pour
 * un site à la racine, `/miss-x/` pour un site GitHub Pages de projet. Lu sur
 * les scripts initiaux : c'est Vite qui les a préfixés avec `base`.
 */
export function sitePrefix(markers) {
  const absolus = (markers.scripts ?? []).filter(s => s.startsWith('/'));
  for (const s of absolus) {
    const m = s.match(/^(\/[^/]+\/)assets\//);
    if (m) return m[1];
  }
  return '/';
}

/**
 * Un lien absolu qui n'est pas sous le préfixe du site pointe la racine de
 * l'ORIGINE — sur GitHub Pages, un autre site, ou rien. miss-ticket-pwa liait
 * `/manifest.json` sous `/miss-ticket-pwa/` : 404, l'app ne s'installait pas.
 */
export function escapesSite(href, prefix) {
  if (!href || prefix === '/' || !href.startsWith('/')) return false;
  return !href.startsWith(prefix);
}
