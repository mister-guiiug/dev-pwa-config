/**
 * `tokens.css` : couverture du contrat et contraste WCAG.
 *
 * Livrer des couleurs par défaut n'a d'intérêt que si elles sont lisibles. Le
 * calcul de contraste tient en vingt lignes et ne coûte aucune dépendance :
 * autant l'exécuter à chaque commit plutôt que de faire confiance à l'œil.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = name =>
  readFileSync(fileURLToPath(new URL(`../${name}`, import.meta.url)), 'utf8');

const TOKENS = read('tokens.css');
const COMPONENTS = read('components.css');

/* ── Outillage couleur ──────────────────────────────────────────────────── */

function srgbToLinear(channel) {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Luminance relative WCAG 2.x d'une couleur `#rrggbb`. */
function luminance(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex.trim());
  assert.ok(m, `couleur hexadécimale attendue, reçu « ${hex} »`);
  const int = parseInt(m[1], 16);
  const [r, g, b] = [(int >> 16) & 255, (int >> 8) & 255, int & 255];
  return (
    0.2126 * srgbToLinear(r) +
    0.7152 * srgbToLinear(g) +
    0.0722 * srgbToLinear(b)
  );
}

/** Rapport de contraste WCAG entre deux couleurs (1 à 21). */
function contrast(a, b) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/**
 * Valeurs déclarées dans un bloc, repéré par son sélecteur. Les blocs sombres
 * sont dupliqués (média système + sélecteur explicite) : on lit le premier,
 * un test vérifie par ailleurs qu'ils sont identiques.
 */
function block(css, selector) {
  const start = css.indexOf(selector);
  assert.notEqual(start, -1, `bloc « ${selector} » introuvable`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close);
  /** @type {Record<string, string>} */
  const out = {};
  for (const m of body.matchAll(/(--dwc-[a-z0-9-]+):\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

const LIGHT = block(TOKENS, '\n:root {');
const DARK = block(TOKENS, ":root:not([data-theme='light']):not(.light)");
const DARK_EXPLICIT = block(TOKENS, ":root[data-theme='dark'],");

/* ── Couverture du contrat ──────────────────────────────────────────────── */

test('tokens.css définit chaque --dwc-* consommé par components.css', () => {
  const consumed = new Set(
    [...COMPONENTS.matchAll(/var\(\s*(--dwc-[a-z0-9-]+)/g)].map(m => m[1])
  );
  assert.ok(consumed.size >= 14, 'le relevé des variables consommées a échoué');
  const missing = [...consumed].filter(name => !(name in LIGHT));
  assert.deepEqual(
    missing,
    [],
    `variables consommées mais non livrées : ${missing.join(', ')}`
  );
});

test('les deux écritures du thème sombre déclarent exactement la même chose', () => {
  // Le média système et le sélecteur explicite doivent rester jumeaux : une
  // valeur qui ne dérive que dans l'un des deux donne une page bicolore selon
  // que l'utilisateur a choisi, ou laissé son système choisir.
  assert.deepEqual(DARK, DARK_EXPLICIT);
});

test('le thème sombre redéfinit toutes les couleurs du thème clair', () => {
  const colorish = Object.keys(LIGHT).filter(
    name => name !== '--dwc-radius' && name !== '--dwc-shadow'
  );
  const missing = colorish.filter(name => !(name in DARK));
  assert.deepEqual(
    missing,
    [],
    `couleurs sans équivalent sombre : ${missing.join(', ')}`
  );
});

/* ── Contraste ──────────────────────────────────────────────────────────── */

/** Paires qui doivent tenir le niveau AA du texte courant (4,5:1). */
const TEXT_PAIRS = [
  ['--dwc-text', '--dwc-surface'],
  ['--dwc-text', '--dwc-surface-2'],
  ['--dwc-text-soft', '--dwc-surface'],
  ['--dwc-text-soft', '--dwc-surface-2'],
  ['--dwc-primary', '--dwc-surface'],
  ['--dwc-primary', '--dwc-surface-2'],
  ['--dwc-primary', '--dwc-primary-soft'],
  ['--dwc-primary-contrast', '--dwc-primary'],
  ['--dwc-success', '--dwc-surface'],
  ['--dwc-warning', '--dwc-surface'],
  ['--dwc-danger', '--dwc-surface'],
  ['--dwc-info', '--dwc-surface'],
  ['--dwc-text', '--dwc-primary-soft'],
];

/**
 * Éléments non textuels : 3:1 (WCAG 1.4.11). `--dwc-border` n'y figure PAS —
 * c'est un filet de séparation, il n'identifie aucun contrôle ; le contour qui
 * en identifie un, c'est `--dwc-border-strong`.
 */
const NON_TEXT_PAIRS = [
  ['--dwc-border-strong', '--dwc-surface'],
  ['--dwc-border-strong', '--dwc-surface-2'],
  ['--dwc-success', '--dwc-surface-2'],
  ['--dwc-warning', '--dwc-surface-2'],
  ['--dwc-danger', '--dwc-surface-2'],
  ['--dwc-info', '--dwc-surface-2'],
];

for (const [scheme, tokens] of [
  ['clair', LIGHT],
  ['sombre', DARK],
]) {
  test(`thème ${scheme} : le texte tient le niveau AA (4,5:1)`, () => {
    for (const [fg, bg] of TEXT_PAIRS) {
      const ratio = contrast(tokens[fg], tokens[bg]);
      assert.ok(
        ratio >= 4.5,
        `${fg} sur ${bg} : ${ratio.toFixed(2)}:1 (minimum 4,5)`
      );
    }
  });

  test(`thème ${scheme} : filets et pastilles tiennent 3:1`, () => {
    for (const [fg, bg] of NON_TEXT_PAIRS) {
      const ratio = contrast(tokens[fg], tokens[bg]);
      assert.ok(
        ratio >= 3,
        `${fg} sur ${bg} : ${ratio.toFixed(2)}:1 (minimum 3)`
      );
    }
  });
}

test('les contours de contrôle lisent border-strong, pas le filet discret', () => {
  // Si un jour un champ ou un bouton bordé repasse sur `--dwc-border`, son
  // pourtour retombe sous 3:1 sans que rien ne le signale.
  for (const selector of [
    "[data-dwc='field-control'] {",
    "[data-dwc='button'][data-variant='secondary'] {",
  ]) {
    const start = COMPONENTS.indexOf(selector);
    assert.notEqual(start, -1, `règle « ${selector} » introuvable`);
    const rule = COMPONENTS.slice(start, COMPONENTS.indexOf('\n  }', start));
    assert.match(
      rule,
      /--dwc-border-strong/,
      `${selector} doit border avec --dwc-border-strong`
    );
  }
});

test('le filet de séparation reste discret', () => {
  // L'inverse du test précédent : remonter `--dwc-border` à 3:1 « pour être
  // conforme » cerclerait chaque carte de gris foncé. Ce n'est pas le correctif.
  for (const tokens of [LIGHT, DARK]) {
    const ratio = contrast(tokens['--dwc-border'], tokens['--dwc-surface']);
    assert.ok(ratio < 2.5, `filet trop appuyé : ${ratio.toFixed(2)}:1`);
  }
});

test('le contrat de couleur est exporté et livré', async () => {
  const pkg = JSON.parse(read('package.json'));
  assert.equal(pkg.exports['./tokens.css'], './tokens.css');
  assert.ok(pkg.files.includes('tokens.css'));
});
