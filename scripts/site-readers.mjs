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
  const prop = name => metas.filter(t => has(t, `property="${name}"`));
  const html = all.find(t => is(t, 'html')) ?? '';
  const theme = named('theme-color');
  const text = String(source).replace(/\s+/g, ' ');
  const titleAt = text.toLowerCase().indexOf('<title>');
  const titleEnd = titleAt === -1 ? -1 : text.indexOf('<', titleAt + 7);
  const descriptionTag = named('description')[0] ?? '';
  return {
    lang: attr(html, 'lang'),
    title:
      titleAt === -1 || titleEnd === -1
        ? null
        : text.slice(titleAt + 7, titleEnd).trim(),
    viewport: named('viewport').length > 0,
    description: named('description').length > 0,
    /** Texte de la meta description, ou `null`. */
    descriptionContent: attr(descriptionTag, 'content'),
    themeColor: theme.length,
    themeColorMedia: theme.filter(t => has(t, ' media=')).length,
    colorScheme: named('color-scheme').length > 0,
    csp: metas.some(t => has(t, 'http-equiv="Content-Security-Policy"')),
    appleTouchIcon: links.some(t => has(t, 'rel="apple-touch-icon"')),
    ogImage: metas.some(t => has(t, 'property="og:image"')),
    ogTitle: attr(prop('og:title')[0] ?? '', 'content'),
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
    // Contenu servi aux robots sans JS (pwaSeoPlugin / injectServedContent).
    servedContent: text.includes('data-dwc="served-content"'),
    noscript: all.some(t => t.toLowerCase().startsWith('<noscript')),
    manifest: attr(links.find(t => has(t, 'rel="manifest"')) ?? '', 'href'),
    scripts: initialScripts(source),
  };
}

/** Les entités HTML courantes. `&nbsp;` devient une espace ordinaire. */
const ENTITES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Un texte HTML, ses entités décodées (nommées courantes et numériques). */
export function decodeEntities(texte) {
  return String(texte).replace(
    /&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,8});/gi,
    (tout, code) => {
      if (code[0] === '#') {
        const n =
          code[1].toLowerCase() === 'x'
            ? parseInt(code.slice(2), 16)
            : parseInt(code.slice(1), 10);
        try {
          return String.fromCodePoint(n);
        } catch {
          return tout;
        }
      }
      return ENTITES[code.toLowerCase()] ?? tout;
    }
  );
}

/** Les éléments dont le contenu n'est pas du texte lu. */
const SANS_TEXTE = new Set(['script', 'style', 'template']);

/**
 * LE TEXTE QU'UN ROBOT SANS JAVASCRIPT LIT : balises retirées, `script`,
 * `style`, `template` et commentaires écartés, entités décodées, blancs
 * réduits. Le contenu d'un `noscript` compte : c'est précisément ce qu'un tel
 * robot affiche. Balayage linéaire, sans regex sur le document.
 */
export function visibleText(source) {
  const html = String(source);
  const bas = html.toLowerCase();
  const morceaux = [];
  let i = 0;
  while (i < html.length) {
    const debut = html.indexOf('<', i);
    if (debut === -1) {
      morceaux.push(html.slice(i));
      break;
    }
    morceaux.push(html.slice(i, debut));
    if (bas.startsWith('<!--', debut)) {
      const fin = bas.indexOf('-->', debut + 4);
      i = fin === -1 ? html.length : fin + 3;
      continue;
    }
    const fin = html.indexOf('>', debut);
    if (fin === -1) break;
    morceaux.push(' ');
    const nom = /^<([a-z][a-z0-9-]*)/.exec(
      bas.slice(debut, Math.min(fin, debut + 32))
    )?.[1];
    if (nom && SANS_TEXTE.has(nom)) {
      const ferme = bas.indexOf(`</${nom}`, fin);
      if (ferme === -1) break;
      const apres = bas.indexOf('>', ferme);
      i = apres === -1 ? html.length : apres + 1;
      continue;
    }
    i = fin + 1;
  }
  return decodeEntities(morceaux.join('')).replace(/\s+/g, ' ').trim();
}

/**
 * Les blocs `<script type="application/ld+json">` d'un HTML, LUS. Un bloc
 * illisible est ignoré. Balayage linéaire (`indexOf`).
 */
export function jsonLdBlocks(source) {
  const html = String(source);
  const bas = html.toLowerCase();
  const blocs = [];
  let i = 0;
  for (;;) {
    const debut = bas.indexOf('<script', i);
    if (debut === -1) break;
    const ouverture = bas.indexOf('>', debut);
    if (ouverture === -1) break;
    const fermeture = bas.indexOf('</script', ouverture);
    if (fermeture === -1) break;
    if (bas.slice(debut, ouverture).includes('application/ld+json')) {
      try {
        blocs.push(JSON.parse(html.slice(ouverture + 1, fermeture)));
      } catch {
        /* illisible : un autre contrôle le dira, pas celui-ci */
      }
    }
    i = fermeture + 8;
  }
  return blocs;
}

/** Les nœuds typés d'un JSON-LD : ceux de tête, et ceux de leurs `@graph`. */
export function jsonLdNodes(blocs) {
  const noeuds = [];
  const visiter = valeur => {
    if (Array.isArray(valeur)) {
      valeur.forEach(visiter);
      return;
    }
    if (!valeur || typeof valeur !== 'object') return;
    if (Array.isArray(valeur['@graph'])) valeur['@graph'].forEach(visiter);
    if (valeur['@type']) noeuds.push(valeur);
  };
  visiter(blocs);
  return noeuds;
}

/** Les types JSON-LD d'un HTML, dans l'ordre, sans doublon. */
export function jsonLdTypes(source) {
  const types = [];
  for (const noeud of jsonLdNodes(jsonLdBlocks(source))) {
    for (const type of [].concat(noeud['@type'])) {
      if (typeof type === 'string' && !types.includes(type)) types.push(type);
    }
  }
  return types;
}

/** Les `<link rel="alternate" hreflang="…" href="…">` d'un HTML. */
export function hreflangLinks(source) {
  return tags(source)
    .map(flatten)
    .filter(
      t => is(t, 'link') && has(t, 'rel="alternate"') && has(t, 'hreflang="')
    )
    .map(t => ({ lang: attr(t, 'hreflang'), href: attr(t, 'href') }))
    .filter(lien => lien.lang && lien.href);
}

/**
 * Deux langues qui désignent la MÊME URL : un `hreflang` qui ne distingue
 * rien. `x-default` est à part — il désigne, par construction, l'URL d'une
 * des langues. Rend les paires en cause (`fr = en → URL`).
 */
export function hreflangCollisions(liens) {
  const parUrl = new Map();
  for (const { lang, href } of liens) {
    if (lang.toLowerCase() === 'x-default') continue;
    parUrl.set(href, [...(parUrl.get(href) ?? []), lang]);
  }
  return [...parUrl]
    .filter(([, langues]) => new Set(langues).size > 1)
    .map(([href, langues]) => `${[...new Set(langues)].join(' = ')} → ${href}`);
}

/**
 * Les mots du CONTENU SERVI d'un accueil (`data-dwc="served-content"`),
 * `noscript` exclu ; 0 sans contenu servi. Seuls les jetons qui portent une
 * lettre ou un chiffre comptent.
 */
export function servedContentWords(source) {
  const html = String(source);
  const repere = html.indexOf('data-dwc="served-content"');
  if (repere === -1) return 0;
  const debut = html.lastIndexOf('<', repere);
  const noscript = html.indexOf('<noscript', repere);
  const fin = noscript === -1 ? html.indexOf('</div>', repere) : noscript;
  return visibleText(html.slice(debut, fin === -1 ? undefined : fin))
    .split(' ')
    .filter(mot => /[\p{L}\p{N}]/u.test(mot)).length;
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
  const id = typeof m.id === 'string' && m.id.length > 0 ? m.id : null;
  return {
    name: m.name ?? null,
    lang: m.lang ?? null,
    display: m.display ?? null,
    startUrl: m.start_url ?? null,
    scope: typeof m.scope === 'string' ? m.scope : null,
    id,
    hasId: id != null,
    /** `id` déjà résolu en URL absolue (forme du hub et de `pwaManifest`). */
    idAbsolu: id != null && /^https?:\/\//i.test(id),
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

/**
 * Une URL est dans la portée d'un manifeste (même origine, préfixe de chemin).
 * C'est le critère d'Android / Chrome pour « déjà installée ».
 */
export function dansPorteeManifeste(url, scope, baseOrigin) {
  try {
    const u = new URL(url, baseOrigin);
    const p = new URL(scope, baseOrigin || u.origin);
    return u.origin === p.origin && u.pathname.startsWith(p.pathname);
  } catch {
    return false;
  }
}

/**
 * Le manifeste du HUB ne doit ni valoir « / », ni préfixer une app du catalogue.
 * Sinon, sur Android, aucune app n'est plus installable dès que le hub l'est.
 *
 * @param {{ scope?: string|null }} manifeste  résumé ou objet brut
 * @param {{ origin: string, appIds: string[] }} opts
 * @returns {null | { code: string, detail: string, apps?: string[] }}
 */
export function problemePorteeHubPublie(manifeste, { origin, appIds }) {
  const scope = manifeste?.scope;
  if (typeof scope !== 'string' || !scope) {
    return { code: 'scope-absent', detail: 'manifeste du hub sans scope' };
  }
  let chemin;
  try {
    chemin = new URL(scope, origin).pathname;
  } catch {
    return { code: 'scope-invalide', detail: `scope illisible : ${scope}` };
  }
  if (chemin === '/' || chemin === '') {
    return {
      code: 'scope-racine',
      detail: `scope « ${scope} » couvre toute l'origine`,
    };
  }
  const base = origin.replace(/\/$/, '');
  const couvertes = appIds.filter(id =>
    dansPorteeManifeste(`${base}/${id}/`, scope, origin)
  );
  if (couvertes.length) {
    return {
      code: 'scope-apps',
      detail: `scope « ${scope} » couvre ${couvertes.length} app(s)`,
      apps: couvertes,
    };
  }
  return null;
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
