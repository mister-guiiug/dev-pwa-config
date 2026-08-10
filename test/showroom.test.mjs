// Garde-fous du showroom (`showroom/`).
//
// Le showroom est une page STATIQUE : sans compilateur Tailwind, il doit
// rejouer `tailwind-preset.css` en CSS natif (`showroom/preset.css`). Ce
// doublon n'est acceptable que s'il est VÉRIFIÉ : ces tests comparent token
// par token, utilitaire par utilitaire, règle de base par règle de base. Toute
// modification du preset non répercutée casse ici, pas dans le navigateur.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name =>
  readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

const PRESET = stripComments(read('tailwind-preset.css'));
const MIRROR = stripComments(read('showroom/preset.css'));
const SHOWROOM_CSS = stripComments(read('showroom/showroom.css'));
const INDEX_HTML = read('showroom/index.html');
const SHOWROOM_JS = read('showroom/showroom.js');

/* ── Micro-analyseur CSS (suffisant pour ces deux fichiers) ─────────────── */

function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

// Corps d'un bloc à partir de l'index de son `{`, accolades équilibrées.
function blockAt(css, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}') {
      depth -= 1;
      if (depth === 0) return { body: css.slice(openIndex + 1, i), end: i };
    }
  }
  throw new Error('Accolade non fermée dans le CSS analysé');
}

// Découpe un corps en règles `{ selector, body }` de premier niveau.
function rulesOf(body) {
  const out = [];
  let i = 0;
  while (i < body.length) {
    const open = body.indexOf('{', i);
    if (open === -1) break;
    const selector = body.slice(i, open).trim().replace(/\s+/g, ' ');
    const { body: inner, end } = blockAt(body, open);
    out.push({ selector, body: inner });
    i = end + 1;
  }
  return out;
}

// Déclarations `prop: value` d'un corps sans règle imbriquée.
function declsOf(body) {
  const out = new Map();
  for (const part of body.split(';')) {
    const colon = part.indexOf(':');
    if (colon === -1) continue;
    const prop = part.slice(0, colon).trim();
    const value = part
      .slice(colon + 1)
      .trim()
      .replace(/\s+/g, ' ');
    if (prop) out.set(prop, value);
  }
  return out;
}

function findRule(css, predicate) {
  return rulesOf(css).find(rule => predicate(rule.selector));
}

/* ── Extraction des deux côtés ──────────────────────────────────────────── */

const presetTheme = findRule(PRESET, s => s === '@theme');
const presetBase = findRule(PRESET, s => s === '@layer base');
const mirrorRoot = findRule(MIRROR, s => s === ':root');
const mirrorBase = findRule(MIRROR, s => s === '@layer base');

const presetUtilities = new Map(
  rulesOf(PRESET)
    .filter(r => r.selector.startsWith('@utility '))
    .map(r => [r.selector.slice('@utility '.length), declsOf(r.body)])
);

const mirrorUtilities = new Map(
  rulesOf(MIRROR)
    .filter(r => r.selector.startsWith('.'))
    .map(r => [r.selector.slice(1), declsOf(r.body)])
);

/* ── Parité preset ↔ miroir ─────────────────────────────────────────────── */

test('le miroir rejoue tous les tokens de @theme, à l’identique', () => {
  assert.ok(presetTheme, '@theme introuvable dans tailwind-preset.css');
  assert.ok(mirrorRoot, ':root introuvable dans showroom/preset.css');

  const expected = declsOf(presetTheme.body);
  const actual = declsOf(mirrorRoot.body);

  assert.ok(expected.size > 0, '@theme vide');
  assert.deepEqual(
    [...actual.keys()].sort(),
    [...expected.keys()].sort(),
    'jeu de tokens différent entre le preset et le miroir'
  );
  for (const [token, value] of expected) {
    assert.equal(actual.get(token), value, `valeur divergente pour ${token}`);
  }
});

test('le miroir rejoue la couche base, à l’identique', () => {
  assert.ok(presetBase, '@layer base introuvable dans tailwind-preset.css');
  assert.ok(mirrorBase, '@layer base introuvable dans showroom/preset.css');

  const expected = rulesOf(presetBase.body);
  const actual = rulesOf(mirrorBase.body);

  assert.deepEqual(
    actual.map(r => r.selector),
    expected.map(r => r.selector),
    'sélecteurs de la couche base différents'
  );
  expected.forEach((rule, index) => {
    assert.deepEqual(
      [...declsOf(actual[index].body)],
      [...declsOf(rule.body)],
      `déclarations divergentes pour ${rule.selector}`
    );
  });
});

test('chaque @utility a une classe équivalente dans le miroir', () => {
  assert.ok(presetUtilities.size >= 12, 'utilitaires du preset non détectés');
  assert.deepEqual(
    [...mirrorUtilities.keys()].sort(),
    [...presetUtilities.keys()].sort(),
    'jeu d’utilitaires différent entre le preset et le miroir'
  );
  for (const [name, decls] of presetUtilities) {
    assert.deepEqual(
      [...mirrorUtilities.get(name)],
      [...decls],
      `déclarations divergentes pour l’utilitaire ${name}`
    );
  }
});

test('showroom.css consomme les tokens du preset sans les redéfinir', () => {
  const redefinitions = [
    ...SHOWROOM_CSS.matchAll(
      /^\s*(--(?:text-fluid|spacing-fluid|spacing-safe|breakpoint)-[\w-]+|--font-(?:sans|mono))\s*:/gm
    ),
  ].map(m => m[1]);
  assert.deepEqual(
    redefinitions,
    [],
    'showroom.css redéfinit des tokens du preset : la source de vérité doit rester tailwind-preset.css'
  );
});

/* ── Thème générique : défini en CSS, complet dans les deux schémas ─────── */

const DS_ROLES = [
  '--ds-bg',
  '--ds-surface',
  '--ds-surface-2',
  '--ds-text',
  '--ds-text-soft',
  '--ds-border',
  '--ds-primary',
  '--ds-primary-contrast',
  '--ds-primary-soft',
  '--ds-accent',
  '--ds-success',
  '--ds-warning',
  '--ds-danger',
  '--ds-info',
];

test('le thème générique définit tous les rôles en clair ET en sombre', () => {
  const light = findRule(SHOWROOM_CSS, s => s === ':root');
  const dark = findRule(SHOWROOM_CSS, s => s === ":root[data-theme='dark']");
  assert.ok(light, ':root introuvable dans showroom.css');
  assert.ok(dark, ":root[data-theme='dark'] introuvable dans showroom.css");

  const lightDecls = declsOf(light.body);
  const darkDecls = declsOf(dark.body);
  for (const role of DS_ROLES) {
    assert.ok(lightDecls.has(role), `${role} manquant en clair`);
    assert.ok(darkDecls.has(role), `${role} manquant en sombre`);
  }
});

/* ── Palettes des applications ──────────────────────────────────────────── */

// `--ds-text-soft` → `textSoft`, `--ds-surface-2` → `surface2` : même mapping
// que `showroom.js` entre rôle CSS et clé de palette.
const PALETTE_KEYS = DS_ROLES.map(role =>
  role.replace('--ds-', '').replace(/-(\w)/g, (_, c) => c.toUpperCase())
);

test('themes.js expose des palettes complètes et bien formées', async () => {
  await import('../showroom/themes.js');
  const themes = globalThis.SHOWROOM_THEMES;

  assert.ok(
    Array.isArray(themes) && themes.length > 1,
    'catalogue de thèmes vide'
  );
  assert.equal(
    themes[0].id,
    'generic',
    'le thème de référence doit être en tête'
  );

  const ids = new Set();
  for (const theme of themes) {
    assert.match(theme.id, /^[a-z0-9-]+$/, `id invalide : ${theme.id}`);
    assert.ok(!ids.has(theme.id), `id dupliqué : ${theme.id}`);
    ids.add(theme.id);

    assert.ok(theme.name && theme.tagline, `${theme.id} : name/tagline requis`);
    assert.ok(
      ['data-theme', 'class'].includes(theme.attribute),
      `${theme.id} : attribute doit valoir data-theme ou class`
    );
    assert.ok(
      Array.isArray(theme.schemes) && theme.schemes.length > 0,
      `${theme.id} : schemes requis`
    );
    for (const scheme of theme.schemes) {
      assert.ok(
        ['light', 'dark'].includes(scheme),
        `${theme.id} : schéma inconnu ${scheme}`
      );
    }

    // Le thème de référence n'a pas de couleurs propres : showroom.css fait foi.
    if (theme.usesCssDefaults) {
      assert.equal(
        theme.light,
        undefined,
        `${theme.id} : ne doit pas dupliquer la palette`
      );
      assert.equal(
        theme.dark,
        undefined,
        `${theme.id} : ne doit pas dupliquer la palette`
      );
      continue;
    }

    for (const scheme of theme.schemes) {
      const palette = theme[scheme];
      assert.ok(palette, `${theme.id} : palette ${scheme} manquante`);
      for (const key of PALETTE_KEYS) {
        assert.match(
          palette[key] ?? '',
          /^#[0-9a-f]{6}$/,
          `${theme.id}.${scheme}.${key} doit être un hex à 6 chiffres`
        );
      }
    }
    // Une app dark-only ne doit pas traîner une palette claire inutilisée.
    for (const scheme of ['light', 'dark']) {
      if (!theme.schemes.includes(scheme)) {
        assert.equal(
          theme[scheme],
          undefined,
          `${theme.id} : palette ${scheme} déclarée mais schéma non supporté`
        );
      }
    }
  }
});

/* ── Page ───────────────────────────────────────────────────────────────── */

test('chaque région de la page porte un nom accessible', () => {
  // Une page qui documente l'accessibilité ne peut pas laisser ses propres
  // landmarks anonymes : un lecteur d'écran annoncerait neuf « region » sans
  // libellé, ce qui rend la navigation par régions inutilisable.
  const sections = [...INDEX_HTML.matchAll(/<section\b([^>]*)>/g)].map(
    m => m[1]
  );
  const anonymes = sections.filter(
    attrs => !/aria-labelledby=|aria-label=/.test(attrs)
  );
  assert.equal(anonymes.length, 0, 'section(s) sans nom accessible');

  // Et le nom doit pointer sur un titre qui existe vraiment.
  for (const attrs of sections) {
    const ref = /aria-labelledby="([^"]+)"/.exec(attrs);
    if (!ref) continue;
    assert.match(
      INDEX_HTML,
      new RegExp(`id="${ref[1]}"`),
      `aria-labelledby="${ref[1]}" ne désigne aucun élément`
    );
  }
});

test('l’état du showroom est partageable par URL', () => {
  // Sans ça, impossible d'envoyer « regarde en Qowa sombre » — sur une page
  // dont le sujet est justement la comparaison de thèmes.
  for (const param of ['app', 'scheme', 'lang']) {
    assert.match(
      SHOWROOM_JS,
      new RegExp(`searchParams\\.set\\('${param}'`),
      `le paramètre ?${param}= n'est pas écrit dans l'URL`
    );
  }
  // `replaceState`, pas `pushState` : chaque bascule polluerait sinon le
  // bouton « précédent » du navigateur.
  assert.match(SHOWROOM_JS, /history\.replaceState/);
  assert.doesNotMatch(SHOWROOM_JS, /history\.pushState/);
});

test('index.html charge les ressources du showroom', () => {
  for (const asset of [
    'preset.css',
    'components.css',
    'showroom.css',
    'themes.js',
    'showroom.js',
  ]) {
    assert.ok(
      INDEX_HTML.includes(asset),
      `${asset} non référencé par index.html`
    );
  }
  // `env(safe-area-inset-*)` ne renvoie autre chose que 0 qu'avec viewport-fit.
  assert.match(INDEX_HTML, /viewport-fit=cover/);
  assert.match(INDEX_HTML, /<html lang="fr"/);
});

/* ── Bac à sable ─────────────────────────────────────────────────────────── */

// Chaque composant du bac à sable est décrit à trois endroits : ses props
// réglables, le DOM qu'il produit, l'appel React affiché. Une prop ajoutée aux
// commandes mais oubliée dans `code` donnerait un extrait qui ne correspond pas
// à l'aperçu — exactement le contraire de ce que la page promet.
const PG_SOURCE = SHOWROOM_JS.slice(
  SHOWROOM_JS.indexOf('var PG_COMPONENTS'),
  SHOWROOM_JS.indexOf('function plusIcon')
);

/** Découpe la source par composant, sur les marqueurs `id: 'Nom'`. */
function playgroundSpecs() {
  const marks = [...PG_SOURCE.matchAll(/\n {6}id: '(\w+)',/g)];
  return marks.map((mark, i) => ({
    id: mark[1],
    body: PG_SOURCE.slice(
      mark.index,
      i + 1 < marks.length ? marks[i + 1].index : PG_SOURCE.length
    ),
  }));
}

test('le bac à sable déclare plusieurs composants complets', () => {
  const specs = playgroundSpecs();
  assert.ok(specs.length >= 4, 'moins de quatre composants réglables');
  for (const spec of specs) {
    for (const part of ['props:', 'build:', 'code:']) {
      assert.ok(
        spec.body.includes(part),
        `${spec.id} ne déclare pas « ${part} »`
      );
    }
  }
});

test('chaque prop réglable agit sur l’aperçu ET sur l’extrait copié', () => {
  for (const spec of playgroundSpecs()) {
    const build = spec.body.slice(
      spec.body.indexOf('build:'),
      spec.body.indexOf('code:')
    );
    const code = spec.body.slice(spec.body.indexOf('code:'));
    const props = [...spec.body.matchAll(/\{\s*name: '(\w+)'/g)].map(m => m[1]);

    assert.ok(props.length, `${spec.id} n'expose aucune prop`);
    for (const prop of props) {
      assert.ok(
        build.includes(`p.${prop}`),
        `${spec.id}.${prop} ne change rien à l'aperçu`
      );
      assert.ok(
        code.includes(`p.${prop}`),
        `${spec.id}.${prop} est absent de l'extrait copié : le code ne dirait pas ce que l'aperçu montre`
      );
    }
  }
});

/* ── Émulation du contraste forcé ────────────────────────────────────────── */

test('l’émulation rejoue exactement les composants corrigés dans le paquet', () => {
  // On ne peut pas activer le contraste forcé depuis la page : le panneau
  // « avec les correctifs » recopie donc à la main le bloc @media de
  // `components.css`. Cette duplication est assumée, mais pas libre — si le
  // paquet corrige un composant de plus, l'émulation doit suivre, sinon elle
  // montre un « après » qui n'existe pas.
  const css = stripComments(read('components.css'));
  const start = css.indexOf('@media (forced-colors: active)');
  assert.notEqual(
    start,
    -1,
    'bloc de contraste forcé absent de components.css'
  );

  const open = css.indexOf('{', start);
  let depth = 0;
  let end = -1;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === '{') depth += 1;
    else if (css[i] === '}' && --depth === 0) {
      end = i;
      break;
    }
  }
  const block = css.slice(open, end);
  const fixed = new Set(
    [...block.matchAll(/\[data-dwc='([\w-]+)'\]/g)].map(m => m[1])
  );
  assert.ok(fixed.size >= 4, 'trop peu de composants relevés : motif changé ?');

  // Les sauts de ligne d'une liste de sélecteurs ne doivent pas fausser la
  // recherche.
  const flat = SHOWROOM_CSS.replace(/\s+/g, ' ');
  for (const name of fixed) {
    assert.ok(
      flat.includes(`[data-fix='on'] .sr-fc-demo [data-dwc='${name}']`),
      `${name} est corrigé dans components.css mais absent de l'émulation du showroom`
    );
  }
});

test('la page rend le bac à sable et l’audit de contraste forcé', () => {
  for (const id of [
    'pg-controls',
    'pg-stage',
    'pg-code',
    'fc-table',
    'fc-state',
  ])
    assert.match(INDEX_HTML, new RegExp(`id="${id}"`), `#${id} absent du HTML`);

  // Tout ce qui est engendré doit l'être à CHAQUE changement de langue.
  const generated = SHOWROOM_JS.slice(
    SHOWROOM_JS.indexOf('function renderGenerated'),
    SHOWROOM_JS.indexOf('setupSheet();')
  );
  for (const fn of ['renderPlayground()', 'renderForcedColors()'])
    assert.ok(
      generated.includes(fn),
      `${fn} hors de renderGenerated : le bloc resterait en français`
    );
});

test('la feuille d’impression rend le showroom lisible sur papier', () => {
  const print = SHOWROOM_CSS.slice(SHOWROOM_CSS.indexOf('@media print'));
  assert.ok(print, 'aucune feuille d’impression');

  // En thème sombre, les navigateurs retirent les fonds mais gardent la
  // couleur du texte : sans repassage des neutres, la page s'imprime vide.
  for (const token of ['--ds-text', '--ds-bg', '--ds-surface'])
    assert.match(
      print,
      new RegExp(`${token}:[^;]+!important`),
      `${token} non forcé : le thème sombre s'imprimerait illisible`
    );

  // `applyTheme` pose la palette en style inline sur <html> : sans
  // `!important`, aucun sélecteur ne peut la surclasser.
  assert.match(SHOWROOM_JS, /style\.setProperty\(role\[1\]/);

  // Le contenu d'un <details> replié est masqué d'une façon qu'aucune règle
  // CSS ne défait — d'où l'ouverture temporaire au moment d'imprimer.
  assert.match(SHOWROOM_JS, /addEventListener\('beforeprint'/);
  assert.match(SHOWROOM_JS, /addEventListener\('afterprint'/);
});
