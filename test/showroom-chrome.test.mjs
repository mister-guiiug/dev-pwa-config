// Le chrome du showroom reste lisible dans chaque habillage.
//
// « Habiller » repeint la page avec la palette d'une app. Les démos doivent
// rester fidèles à l'app, défauts compris ; le chrome (barre, sommaire,
// notes, tableaux, étiquettes) est la page elle-même. Relevé du 05/10/2026,
// axe sur la page hors démos : 2 193 nœuds sous 4,5:1 en clair (19 thèmes sur
// 22) et 781 en sombre (22 sur 22).
//
// Ce test est DÉTERMINISTE : il applique `showroom/contraste.js`, le module
// même qu'exécute la page, à chaque palette de `themes.js` dans chacun de ses
// schémas, et vérifie chaque paire. Il vérifie aussi que `showroom.css` ne
// peint son texte qu'avec ces encres : sans cela, il prouverait un calcul que
// la page n'utilise pas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FAMILY_THEMES } from '../themes.js';
import { codeDuShowroom } from '../scripts/showroom-modules.mjs';
import {
  SEUIL_TEXTE,
  SEUIL_UI,
  VARIABLES_CHROME,
  encreSur,
  fondsDuChrome,
  paletteChrome,
  pireRatio,
  ratio,
} from '../showroom/contraste.js';

const CSS = readFileSync(
  new URL('../showroom/showroom.css', import.meta.url),
  'utf8'
);

/* ── Palettes : celles de themes.js, et la générique de showroom.css ────── */

const ROLES_CSS = {
  bg: '--ds-bg',
  surface: '--ds-surface',
  surface2: '--ds-surface-2',
  text: '--ds-text',
  textSoft: '--ds-text-soft',
  border: '--ds-border',
  primary: '--ds-primary',
  primaryContrast: '--ds-primary-contrast',
  primarySoft: '--ds-primary-soft',
  accent: '--ds-accent',
  success: '--ds-success',
  warning: '--ds-warning',
  danger: '--ds-danger',
  info: '--ds-info',
};

/** Les rôles déclarés en hexadécimal dans un bloc de showroom.css. */
function rolesDuBloc(selecteur) {
  const debut = CSS.indexOf(`${selecteur} {`);
  assert.notEqual(debut, -1, `bloc ${selecteur} introuvable dans showroom.css`);
  const corps = CSS.slice(debut, CSS.indexOf('}', debut));
  const palette = {};
  for (const [role, variable] of Object.entries(ROLES_CSS)) {
    const lu = new RegExp(`${variable}:\\s*(#[0-9a-fA-F]{3,6});`).exec(corps);
    if (lu) palette[role] = lu[1];
  }
  return palette;
}

// Le thème générique n'a pas de palette dans themes.js : la sienne EST le CSS
// de la page, le sombre ne surchargeant que ce qui change.
const GENERIQUE = { light: rolesDuBloc(':root') };
GENERIQUE.dark = {
  ...GENERIQUE.light,
  ...rolesDuBloc(":root[data-theme='dark']"),
};

const PALETTES = FAMILY_THEMES.flatMap(theme =>
  theme.schemes.map(scheme => [
    `${theme.id}/${scheme}`,
    theme.usesCssDefaults ? GENERIQUE[scheme] : theme[scheme],
  ])
);

test('toutes les palettes sont lues, et complètes', () => {
  // 22 thèmes, dont deux sombres seulement (qowa, quota).
  assert.equal(PALETTES.length, 42);
  for (const [nom, palette] of PALETTES) {
    for (const role of Object.keys(ROLES_CSS)) {
      assert.match(
        String(palette[role]),
        /^#[0-9a-f]{3,6}$/i,
        `${nom} : rôle ${role} absent ou non hexadécimal`
      );
    }
  }
});

/* ── Les paires du chrome ──────────────────────────────────────────────── */

test('chaque encre du chrome tient 4,5:1 sur chaque fond du chrome', () => {
  const ecarts = [];
  for (const [nom, p] of PALETTES) {
    const chrome = paletteChrome(p);
    const fonds = fondsDuChrome(p);
    for (const cle of ['attenue', 'lien', 'succes', 'alerte', 'danger']) {
      const pire = pireRatio(chrome[cle], fonds);
      if (pire < SEUIL_TEXTE) ecarts.push(`${nom} ${cle} ${pire.toFixed(2)}`);
    }
    // Le texte principal n'est pas ajusté : il doit tenir tel quel.
    const texte = pireRatio(p.text, fonds);
    if (texte < SEUIL_TEXTE) ecarts.push(`${nom} texte ${texte.toFixed(2)}`);
    const surPlein = ratio(chrome.surFill, chrome.fill);
    if (surPlein < SEUIL_TEXTE) {
      ecarts.push(`${nom} texte sur plein ${surPlein.toFixed(2)}`);
    }
  }
  assert.deepEqual(ecarts, []);
});

test('contours de champ, focus et remplissage tiennent 3:1', () => {
  const ecarts = [];
  for (const [nom, p] of PALETTES) {
    const chrome = paletteChrome(p);
    const surfaces = [p.bg, p.surface, p.surface2];
    for (const cle of ['contour', 'focus']) {
      const pire = pireRatio(chrome[cle], surfaces);
      if (pire < SEUIL_UI) ecarts.push(`${nom} ${cle} ${pire.toFixed(2)}`);
    }
    const plein = ratio(chrome.fill, p.surface);
    if (plein < SEUIL_UI) ecarts.push(`${nom} remplissage ${plein.toFixed(2)}`);
  }
  assert.deepEqual(ecarts, []);
});

test('le monogramme de chaque app a une encre à 4,5:1 sur sa primaire', () => {
  const ecarts = [];
  for (const [nom, p] of PALETTES) {
    const r = ratio(encreSur(p.primary), p.primary);
    if (r < SEUIL_TEXTE) ecarts.push(`${nom} ${r.toFixed(2)}`);
  }
  assert.deepEqual(ecarts, []);
  // Le cas qui l'a révélé : le blanc plafonnait à 4,45:1 sur ce violet.
  assert.ok(ratio(encreSur('#7c5cf6'), '#7c5cf6') >= SEUIL_TEXTE);
});

test('une encre qui tenait déjà ne bouge pas', () => {
  for (const [nom, p] of PALETTES) {
    const chrome = paletteChrome(p);
    const fonds = fondsDuChrome(p);
    for (const [cle, role] of [
      ['attenue', 'textSoft'],
      ['lien', 'primary'],
      ['succes', 'success'],
      ['alerte', 'warning'],
      ['danger', 'danger'],
    ]) {
      if (pireRatio(p[role], fonds) >= SEUIL_TEXTE) {
        assert.equal(
          chrome[cle],
          p[role],
          `${nom} : ${cle} déplacé sans raison`
        );
      }
    }
  }
});

/* ── Le CSS consomme bien ces encres ───────────────────────────────────── */

// Aperçus peints avec la palette d'une app (tuiles de la galerie, téléphone
// de la démo) : fidèles à l'app, défauts compris. Ce ne sont pas du chrome.
const FIDELES_A_L_APP = new Set([
  '.sr-gallery-flag',
  '.sr-gallery-ink-soft',
  '.sr-phone-input',
]);

/** Les déclarations `color:` de showroom.css, avec leur sélecteur. */
function declarationsDeCouleur() {
  const sansCommentaires = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  const pile = [];
  const out = [];
  for (const ligne of sansCommentaires.split('\n')) {
    const t = ligne.trim();
    const lu = /^color:\s*(.+);$/.exec(t);
    if (lu) out.push({ selecteur: pile[pile.length - 1] ?? '', valeur: lu[1] });
    if (t.endsWith('{')) pile.push(t.slice(0, -1).trim());
    else if (t.startsWith('}')) pile.pop();
  }
  return out;
}

test('le chrome ne peint son texte qu’avec les encres sûres', () => {
  const brutes = declarationsDeCouleur().filter(
    d =>
      /var\(--ds-(text-soft|primary|success|warning|danger|info|accent)\)/.test(
        d.valeur
      ) && !FIDELES_A_L_APP.has(d.selecteur)
  );
  assert.deepEqual(
    brutes.map(d => `${d.selecteur} → ${d.valeur}`),
    [],
    'texte du chrome peint avec un rôle de marque brut : utiliser --sr-ink-*'
  );
});

test('chaque encre du chrome a un repli CSS et une valeur posée par la page', () => {
  const posees = new Set(VARIABLES_CHROME.map(([, variable]) => variable));
  const consommees = new Set(
    [
      ...CSS.matchAll(
        /var\((--sr-(?:ink-[a-z]+|fill|on-fill|ui-border|focus))\)/g
      ),
    ].map(m => m[1])
  );
  const racine = CSS.slice(
    CSS.indexOf(':root {'),
    CSS.indexOf('}', CSS.indexOf(':root {'))
  );
  for (const variable of consommees) {
    assert.ok(
      posees.has(variable),
      `${variable} n'est jamais posée par showroom.js`
    );
    assert.match(
      racine,
      new RegExp(`${variable}:`),
      `${variable} sans repli dans :root`
    );
  }
  assert.match(codeDuShowroom(), /paletteChrome\(paletteOf\(theme, scheme\)\)/);
});
