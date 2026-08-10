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

test('index.html charge les quatre ressources du showroom', () => {
  for (const asset of [
    'preset.css',
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
