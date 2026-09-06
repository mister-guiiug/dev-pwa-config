/**
 * Les seize palettes de la famille : forme, miroir du showroom, contraste.
 *
 * Ce fichier a longtemps vécu DANS le showroom, qui n'est pas publié : le
 * paquet ignorait les palettes que sa propre vitrine connaissait. Maintenant
 * qu'elles sont livrées, elles méritent les mêmes garde-fous que le catalogue.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { FAMILY_THEMES, themeById, brandColor } from '../themes.js';
import { FAMILY_APPS } from '../apps-catalog.js';
import { showroomThemesFile } from '../scripts/sync-generated.mjs';

const read = name =>
  readFileSync(fileURLToPath(new URL(`../${name}`, import.meta.url)), 'utf8');

const HEX = /^#[0-9a-f]{6}$/i;
const ROLES = [
  'bg',
  'surface',
  'surface2',
  'text',
  'textSoft',
  'border',
  'primary',
  'primaryContrast',
  'primarySoft',
  'accent',
  'success',
  'warning',
  'danger',
  'info',
];

/* ── Forme ──────────────────────────────────────────────────────────────── */

test('une palette par app du catalogue, plus le thème générique', () => {
  const ids = FAMILY_THEMES.map(theme => theme.id);
  assert.equal(new Set(ids).size, ids.length, 'identifiants en double');
  assert.ok(ids.includes('generic'));
  const missing = FAMILY_APPS.map(app => app.id).filter(
    id => !ids.includes(id)
  );
  assert.deepEqual(missing, [], `apps sans palette : ${missing.join(', ')}`);
  assert.equal(FAMILY_THEMES.length, FAMILY_APPS.length + 1);
});

test('aucun trou dans le tableau', () => {
  // Une virgule en trop produit un tableau creux : `themes[0]` devient
  // `undefined` et la page entière échoue au premier accès. C'est arrivé.
  assert.equal(
    FAMILY_THEMES.filter(theme => theme == null).length,
    0,
    'tableau creux — vérifier les virgules'
  );
});

test('chaque palette porte tous les rôles, en hexadécimal', () => {
  for (const theme of FAMILY_THEMES) {
    if (theme.usesCssDefaults) continue;
    for (const scheme of theme.schemes) {
      const palette = theme[scheme];
      assert.ok(palette, `${theme.id} annonce « ${scheme} » sans palette`);
      for (const role of ROLES) {
        assert.ok(
          role in palette,
          `${theme.id}/${scheme} : rôle « ${role} » manquant`
        );
        assert.match(
          palette[role],
          HEX,
          `${theme.id}/${scheme}.${role} doit être un hexadécimal complet`
        );
      }
    }
  }
});

test('les identifiants correspondent à de vrais dépôts', () => {
  for (const theme of FAMILY_THEMES) {
    if (theme.id === 'generic') continue;
    assert.ok(themeById(theme.id), `${theme.id} introuvable via themeById`);
    assert.ok(
      FAMILY_APPS.some(app => app.id === theme.id),
      `${theme.id} n'est pas une app du catalogue`
    );
  }
});

test('brandColor renvoie la primaire du schéma demandé', () => {
  assert.equal(brandColor('miss-uwh'), themeById('miss-uwh').light.primary);
  assert.equal(
    brandColor('miss-uwh', 'dark'),
    themeById('miss-uwh').dark.primary
  );
  assert.equal(brandColor('inconnue'), undefined);
});

/* ── Miroir du showroom ─────────────────────────────────────────────────── */

test('le miroir du showroom décrit exactement les mêmes palettes', async () => {
  await import('../showroom/themes.js');
  assert.deepEqual(
    globalThis.SHOWROOM_THEMES,
    JSON.parse(JSON.stringify(FAMILY_THEMES)),
    'miroir périmé : lancer `npm run sync`'
  );
});

test('le miroir porte bien l’en-tête « fichier généré »', () => {
  // Comparer les octets serait fragile (Prettier reformate) : on vérifie la
  // donnée ci-dessus, et ici que personne ne s'est mis à éditer le miroir à la
  // main sans voir l'avertissement.
  const mirror = read('showroom/themes.js');
  assert.match(mirror, /FICHIER GÉNÉRÉ/);
  assert.match(mirror, /npm run sync/);
  assert.match(showroomThemesFile(), /globalThis\.SHOWROOM_THEMES = /);
});

test('le module est exporté et livré', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.deepEqual(pkg.exports['./themes'], {
    types: './themes.d.ts',
    default: './themes.js',
  });
  assert.ok(pkg.files.includes('themes.js'));
  assert.ok(pkg.files.includes('themes.d.ts'));
});

/* ── Contraste ──────────────────────────────────────────────────────────── */

const srgb = c => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = hex => {
  const i = parseInt(hex.slice(1), 16);
  return (
    0.2126 * srgb((i >> 16) & 255) +
    0.7152 * srgb((i >> 8) & 255) +
    0.0722 * srgb(i & 255)
  );
};
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

const AA_PAIRS = [
  ['text', 'surface'],
  ['text', 'surface2'],
  ['text', 'bg'],
  ['textSoft', 'surface'],
  ['textSoft', 'surface2'],
];

/**
 * Dette connue, relevée le 23/08/2026. Ces couleurs sont celles des apps, pas
 * des choix du paquet : on ne les « corrige » pas ici, ce serait inventer une
 * marque. On les nomme, pour que toute NOUVELLE régression échoue, et pour
 * qu'une correction côté app force le retrait de sa ligne.
 */
const KNOWN_BELOW_AA = new Set([
  'miss-badminton/light/textSoft-surface2',
  'miss-carbook/light/textSoft-surface2',
  'miss-carbook/dark/textSoft-surface2',
  'mister-doc/light/textSoft-surface2',
  'mister-molkky/light/textSoft-surface2',
]);

test('le texte tient AA partout, sauf la dette explicitement listée', () => {
  const found = new Set();
  for (const theme of FAMILY_THEMES) {
    if (theme.usesCssDefaults) continue;
    for (const scheme of theme.schemes) {
      for (const [fg, bg] of AA_PAIRS) {
        const key = `${theme.id}/${scheme}/${fg}-${bg}`;
        const ratio = contrast(theme[scheme][fg], theme[scheme][bg]);
        if (ratio >= 4.5) continue;
        found.add(key);
        assert.ok(
          KNOWN_BELOW_AA.has(key),
          `${key} : ${ratio.toFixed(2)}:1 — nouvelle régression de contraste`
        );
      }
    }
  }
  const fixed = [...KNOWN_BELOW_AA].filter(key => !found.has(key));
  assert.deepEqual(
    fixed,
    [],
    `corrigé côté app : retirer ${fixed.join(', ')} de KNOWN_BELOW_AA`
  );
});

test('la couleur de marque reste distinguable de son fond (3:1)', () => {
  for (const theme of FAMILY_THEMES) {
    if (theme.usesCssDefaults) continue;
    for (const scheme of theme.schemes) {
      const palette = theme[scheme];
      for (const [fg, bg] of [
        ['primary', 'surface'],
        ['primaryContrast', 'primary'],
      ]) {
        const ratio = contrast(palette[fg], palette[bg]);
        assert.ok(
          ratio >= 3,
          `${theme.id}/${scheme} ${fg} sur ${bg} : ${ratio.toFixed(2)}:1`
        );
      }
    }
  }
});

/* ── Contraste des couleurs COMPOSÉES par components.css ─────────────────
 *
 * `AA_PAIRS` ci-dessus compare des JETONS entre eux. Il ne voyait donc pas les
 * couleurs que la feuille fabrique à partir d'eux — et c'est là que le parc
 * a échoué, le 06/09/2026, à la première exécution réelle d'une suite a11y
 * (celle de mister-family-map, jamais jouée en CI parce que son `e2e-grep`
 * valait `@critical`) :
 *
 *  - `[data-dwc='app-version-details']` posait `opacity: .85` SUR du
 *    `--dwc-text-soft` : la couleur rendue est le mélange à 85 % sur le fond,
 *    une teinte plus pâle que le rôle « soft » que la palette avait choisi ;
 *  - `[data-dwc='maturity']` emploie `--dwc-success` / `--dwc-warning` comme
 *    couleur de TEXTE à 0.68rem — du petit texte, donc le seuil 4,5:1.
 *
 * Ces deux tests lisent les VALEURS DE LA FEUILLE, pas des constantes
 * recopiées : remonter le pourcentage de `color-mix` ou remettre une opacité
 * fait échouer ici, sur les palettes concernées et nommément.
 */

/** Mélange sRGB de deux hex — ce que fait `color-mix(in srgb, a P%, b)`. */
const mix = (a, b, part) => {
  const [ia, ib] = [a, b].map(h => parseInt(h.slice(1), 16));
  const canal = d =>
    Math.round((((ia >> d) & 255) * part + ((ib >> d) & 255) * (1 - part)) * 1);
  return `#${[16, 8, 0].map(d => canal(d).toString(16).padStart(2, '0')).join('')}`;
};

test("le bloc version n'est plus voilé par une opacité", () => {
  const css = read('components.css');
  const bloc =
    /\[data-dwc='app-version-details'\]\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.ok(
    !/opacity/.test(bloc),
    "`app-version-details` reprend une opacité : elle compose une couleur sur laquelle aucune palette ne s'est prononcée, et retombe sous AA dans 14 palettes sur 36"
  );
});

test('la pastille de maturité tient AA dans toutes les palettes', () => {
  const css = read('components.css');
  // Le pourcentage EST celui de la feuille : le test suit le CSS, pas l'inverse.
  const parts = [
    ...css.matchAll(
      /\[data-maturity='(stable|beta)'\]\s*\{\s*color:\s*color-mix\(\s*in srgb,\s*var\(--dwc-(success|warning)[^)]*\)[^)]*\)\s*(\d+)%,\s*var\(--dwc-text/g
    ),
  ].map(m => [m[1], m[2], Number(m[3]) / 100]);
  assert.equal(
    parts.length,
    2,
    'stable et beta doivent mélanger leur couleur de signal vers --dwc-text (cf. le commentaire de components.css)'
  );

  for (const theme of FAMILY_THEMES) {
    if (theme.usesCssDefaults) continue;
    for (const scheme of theme.schemes) {
      const p = theme[scheme];
      for (const [maturite, role, part] of parts) {
        const rendu = mix(p[role], p.text, part);
        const ratio = contrast(rendu, p.surface);
        assert.ok(
          ratio >= 4.5,
          `${theme.id}/${scheme} maturité ${maturite} : ${ratio.toFixed(2)}:1 — ` +
            `${role} mélangé à ${Math.round(part * 100)}% ne tient pas AA en petit texte`
        );
      }
    }
  }
});
