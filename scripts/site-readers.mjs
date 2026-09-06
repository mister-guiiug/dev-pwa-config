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
 *
 * PAS DE REGEX SUR LE DOCUMENT ENTIER. Un motif comme `<meta[^>]*name=` sur un
 * HTML fourni de l'extérieur est polynomial (CodeQL `js/polynomial-redos`) :
 * les balises sont découpées par un balayage linéaire (`tags`), et chaque
 * test porte sur UNE balise, courte, par `includes`.
 */

/** Les balises d'un HTML, dans l'ordre — balayage linéaire, sans regex. */
export function tags(source) {
  const html = String(source);
  const out = [];
  let i = 0;
  for (;;) {
    const start = html.indexOf('<', i);
    if (start === -1) break;
    const end = html.indexOf('>', start);
    if (end === -1) break;
    out.push(html.slice(start, end + 1));
    i = end + 1;
  }
  return out;
}

/** Une balise aplatie, en minuscules pour les tests, telle quelle pour lire. */
const flatten = tag => tag.replace(/\s+/g, ' ');

/** La valeur d'un attribut `name="…"` d'une balise (déjà aplatie). */
function attr(tag, name) {
  const key = `${name}="`;
  const at = tag.indexOf(key);
  if (at === -1) return null;
  const from = at + key.length;
  const to = tag.indexOf('"', from);
  return to === -1 ? null : tag.slice(from, to);
}

const is = (tag, name) => tag.toLowerCase().startsWith(`<${name} `);
const has = (tag, needle) => tag.toLowerCase().includes(needle.toLowerCase());

/** Ce qu'`index.html` déclare. */
export function htmlMarkers(source) {
  const all = tags(source).map(flatten);
  const metas = all.filter(t => is(t, 'meta'));
  const links = all.filter(t => is(t, 'link'));
  const named = name => metas.filter(t => has(t, `name="${name}"`));
  const html = all.find(t => is(t, 'html')) ?? '';
  const theme = named('theme-color');
  const text = String(source).replace(/\s+/g, ' ');
  const titleAt = text.toLowerCase().indexOf('<title>');
  const titleEnd = titleAt === -1 ? -1 : text.indexOf('<', titleAt + 7);
  return {
    lang: attr(html, 'lang'),
    title:
      titleAt === -1 || titleEnd === -1
        ? null
        : text.slice(titleAt + 7, titleEnd).trim(),
    viewport: named('viewport').length > 0,
    description: named('description').length > 0,
    themeColor: theme.length,
    themeColorMedia: theme.filter(t => has(t, ' media=')).length,
    colorScheme: named('color-scheme').length > 0,
    csp: metas.some(t => has(t, 'http-equiv="Content-Security-Policy"')),
    appleTouchIcon: links.some(t => has(t, 'rel="apple-touch-icon"')),
    ogImage: metas.some(t => has(t, 'property="og:image"')),
    canonical: links.some(t => has(t, 'rel="canonical"')),
    // L'URL PUBLIQUE DÉCLARÉE, pas seulement sa présence. C'est la seule
    // source du chemin du site qui ne dépende pas des assets — donc la seule
    // utilisable pour juger les assets eux-mêmes. Voir `siteScope`.
    canonicalHref: attr(
      links.find(t => has(t, 'rel="canonical"')) ?? '',
      'href'
    ),
    styles: initialStyles(source),
    jsonLd: all.some(t => is(t, 'script') && has(t, 'application/ld+json')),
    noscript: all.some(t => t.toLowerCase().startsWith('<noscript')),
    manifest: attr(links.find(t => has(t, 'rel="manifest"')) ?? '', 'href'),
    scripts: initialScripts(source),
  };
}

/** Les scripts chargés au démarrage : modules et `modulepreload`. */
export function initialScripts(source) {
  const out = [];
  for (const tag of tags(source).map(flatten)) {
    if (is(tag, 'script') && has(tag, 'type="module"')) {
      const src = attr(tag, 'src');
      if (src) out.push(src);
    } else if (is(tag, 'link') && has(tag, 'rel="modulepreload"')) {
      const href = attr(tag, 'href');
      if (href) out.push(href);
    }
  }
  return [...new Set(out)];
}

/** Les feuilles de style liées dans le document. */
export function initialStyles(source) {
  const out = [];
  for (const tag of tags(source).map(flatten)) {
    if (is(tag, 'link') && has(tag, 'rel="stylesheet"')) {
      const href = attr(tag, 'href');
      if (href) out.push(href);
    }
  }
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
  const text = String(body);
  return text.includes('id="root"') || text.includes('id="app"');
}

/**
 * Le préfixe de site sous lequel vivent les assets d'`index.html` — `/` pour
 * un site à la racine, `/miss-x/` pour un site GitHub Pages de projet. Lu sur
 * les scripts initiaux : c'est Vite qui les a préfixés avec `base`.
 */
export function sitePrefix(markers) {
  for (const s of markers.scripts ?? []) {
    if (!s.startsWith('/')) continue;
    const second = s.indexOf('/', 1);
    if (second === -1) continue;
    const prefix = s.slice(0, second + 1);
    if (s.startsWith(`${prefix}assets/`)) return prefix;
  }
  return '/';
}

/**
 * Un lien absolu qui n'est pas sous le préfixe du site pointe la racine de
 * l'ORIGINE — sur GitHub Pages, un autre site, ou rien. miss-ticket-pwa liait
 * `/manifest.json` sous `/miss-ticket-pwa/` : 404, l'app ne s'installait pas.
 */
export function escapesSite(href, prefix) {
  // UN PRÉFIXE INCONNU N'ACCUSE PAS. `siteScope` rend `null` quand la page n'a
  // pas de canonique — une app sans `pwaSeoPlugin`, ou servie à la racine d'un
  // domaine propre. Sans cette garde, `href.startsWith(null)` compare à la
  // chaîne « null », donc échoue toujours, et tout asset absolu devenait un
  // défaut. Un contrôle qui ne sait pas se tait.
  if (!href || !prefix || prefix === '/' || !href.startsWith('/')) return false;
  return !href.startsWith(prefix);
}

/**
 * Le chemin du site D'APRÈS SON URL CANONIQUE — `/miss-x/`, ou `/` à la racine.
 *
 * POURQUOI PAS `sitePrefix`. Celui-là déduit le préfixe DES SCRIPTS eux-mêmes.
 * C'est juste tant que les scripts sont bons, et aveugle dès qu'ils ne le sont
 * plus : sur un build à `base: '/'` servi sous `/miss-ticket-pwa/`, le script
 * est `/assets/index-x.js`, le préfixe déduit vaut `/`, et tout contrôle qui
 * s'appuie dessus se désarme — exactement quand le défaut est là. Le site a
 * servi une page blanche du 03/06 au 06/09/2026 sans que rien ne le dise.
 *
 * La canonique, elle, est écrite par `pwaSeoPlugin` depuis l'URL publique
 * déclarée : elle ne dépend pas de la base des assets, et c'est ce qui permet
 * de les juger.
 */
export function siteScope(canonicalHref) {
  if (!canonicalHref) return null;
  try {
    const { pathname } = new URL(canonicalHref);
    return pathname.endsWith('/') ? pathname : `${pathname}/`;
  } catch {
    return null;
  }
}
