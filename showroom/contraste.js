/*
 * Encres du CHROME du showroom, dérivées de la palette de l'application.
 *
 * « Habiller » repeint toute la page avec la palette d'une app. Les démos
 * doivent rester fidèles à l'app, défauts compris : c'est leur rôle. Mais le
 * chrome (barre, sommaire, notes, tableaux, étiquettes) est la page elle-même,
 * et il doit rester lisible dans chaque habillage. Relevé du 05/10/2026, axe
 * sur la page entière hors démos : 2 193 nœuds sous 4,5:1 en clair, dans
 * 19 thèmes sur 22, et 781 en sombre.
 *
 * Le principe existait déjà pour `.sr-branch-use` : MÉLANGER la couleur de
 * marque à la couleur de texte. La teinte survit, le contraste devient
 * tenable. Ici, le mélange est mesuré : on avance par pas de 2 % jusqu'à tenir
 * le seuil sur TOUS les fonds du chrome, puis on s'arrête. Une encre qui
 * passait déjà ne bouge pas.
 *
 * Module PUR : aucun accès au DOM. `test/showroom-chrome.test.mjs` l'applique
 * à chaque palette de `themes.js`, dans les deux schémas, et vérifie chaque
 * paire. La page et le test calculent donc exactement la même chose.
 */

/** Texte (WCAG 1.4.3, niveau AA). */
export const SEUIL_TEXTE = 4.5;
/** Composants d'interface et états de focus (WCAG 1.4.11). */
export const SEUIL_UI = 3;

/**
 * `#rgb` ou `#rrggbb` → composantes 0-255.
 *
 * @param {string} hex
 * @returns {number[]}
 */
export function hexEnRgb(hex) {
  const brut = String(hex).trim().replace(/^#/, '');
  const plein =
    brut.length === 3
      ? brut
          .split('')
          .map(c => c + c)
          .join('')
      : brut;
  if (!/^[0-9a-f]{6}$/i.test(plein)) {
    throw new Error(`couleur hexadécimale attendue, reçu « ${hex} »`);
  }
  return [0, 2, 4].map(i => parseInt(plein.slice(i, i + 2), 16));
}

/** @param {number[]} rgb */
export function rgbEnHex(rgb) {
  return (
    '#' +
    rgb
      .map(c =>
        Math.max(0, Math.min(255, Math.round(c)))
          .toString(16)
          .padStart(2, '0')
      )
      .join('')
  );
}

/** Luminance relative WCAG d'une couleur (hex ou composantes). */
export function luminance(couleur) {
  const rgb = typeof couleur === 'string' ? hexEnRgb(couleur) : couleur;
  const [r, g, b] = rgb.map(c => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Rapport de contraste WCAG entre deux couleurs. */
export function ratio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * `color-mix(in srgb, a part, b)` : mélange dans l'espace sRGB, composante par
 * composante. C'est aussi l'effet d'un calque `a` d'opacité `part` sur `b`.
 *
 * @param {string} a
 * @param {string} b
 * @param {number} part de `a`, entre 0 et 1
 */
export function melanger(a, b, part) {
  const ca = hexEnRgb(a);
  const cb = hexEnRgb(b);
  return rgbEnHex(ca.map((v, i) => v * part + cb[i] * (1 - part)));
}

/** Le plus petit rapport d'une encre sur une liste de fonds. */
export function pireRatio(encre, fonds) {
  return Math.min(...fonds.map(f => ratio(encre, f)));
}

/**
 * Une encre qui tient `seuil` sur tous les `fonds` : l'encre d'origine si elle
 * y parvient, sinon le premier mélange vers `pole` qui y parvient. Si même le
 * pôle échoue, on poursuit vers le noir ou le blanc, selon les fonds.
 *
 * @param {string} encre
 * @param {string[]} fonds
 * @param {number} seuil
 * @param {string} pole couleur vers laquelle on mélange (le texte, en général)
 */
export function encreSure(encre, fonds, seuil, pole) {
  for (let pas = 0; pas <= 50; pas += 1) {
    const essai = pas === 0 ? encre : melanger(pole, encre, pas / 50);
    if (pireRatio(essai, fonds) >= seuil) return essai;
  }
  const fondsClairs =
    fonds.reduce((somme, f) => somme + luminance(f), 0) / fonds.length > 0.18;
  const extreme = fondsClairs ? '#000000' : '#ffffff';
  for (let pas = 1; pas <= 50; pas += 1) {
    const essai = melanger(extreme, pole, pas / 50);
    if (pireRatio(essai, fonds) >= seuil) return essai;
  }
  return extreme;
}

/**
 * L'encre d'un texte posé SUR une couleur pleine (monogramme d'une app) : la
 * meilleure de blanc et d'encre sombre, puis le noir si aucune ne tient.
 *
 * @param {string} fond
 */
export function encreSur(fond) {
  const candidates = ['#ffffff', '#14181f', '#000000'];
  const tenues = candidates.filter(c => ratio(c, fond) >= SEUIL_TEXTE);
  const pool = tenues.length ? tenues : candidates;
  return pool.reduce((meilleure, c) =>
    ratio(c, fond) > ratio(meilleure, fond) ? c : meilleure
  );
}

/**
 * Les fonds sur lesquels le chrome pose du texte, pour une palette. Les
 * calques (`color-mix(…, transparent)` du CSS) y sont résolus sur chacun des
 * fonds qu'ils peuvent recouvrir.
 *
 * @param {Record<string, string>} p palette (rôles de `themes.js`)
 * @returns {string[]}
 */
export function fondsDuChrome(p) {
  const sombre = luminance(p.surface) < 0.2;
  // `--sr-code-bg` : texte à 6 % (clair) ou 10 % (sombre) en calque.
  const code = sombre ? 0.1 : 0.06;
  const bases = [p.bg, p.surface, p.surface2];
  return [
    ...bases,
    p.primarySoft,
    ...bases.map(base => melanger(p.text, base, code)),
    // Bandeaux et cellules teintés : danger, avertissement, information.
    melanger(p.danger, p.surface, 0.1),
    melanger(p.warning, p.surface, 0.1),
    melanger(p.info, p.surface, 0.1),
    // Puces actives et survols teintés par la primaire.
    melanger(p.primary, p.surface, 0.12),
    melanger(p.primary, p.surface, 0.18),
  ];
}

/**
 * La palette du chrome : des encres qui tiennent 4,5:1 sur chaque fond du
 * chrome, un remplissage dont le texte tient 4,5:1, et des contours et un
 * focus qui tiennent 3:1.
 *
 * @param {Record<string, string>} p palette (rôles de `themes.js`)
 */
export function paletteChrome(p) {
  const fonds = fondsDuChrome(p);
  const surfaces = [p.bg, p.surface, p.surface2];
  const sure = encre => encreSure(encre, fonds, SEUIL_TEXTE, p.text);

  // Le remplissage garde sa primaire si l'encre posée dessus tient ; sinon on
  // l'éloigne de cette encre (plus sombre sous une encre claire, et
  // inversement).
  const surFill = p.primaryContrast;
  const fill =
    ratio(surFill, p.primary) >= SEUIL_TEXTE
      ? p.primary
      : encreSure(
          p.primary,
          [surFill],
          SEUIL_TEXTE,
          luminance(surFill) > 0.5 ? '#000000' : '#ffffff'
        );

  // Le texte principal n'est PAS ajusté : il tient déjà sur chaque fond du
  // chrome, dans chaque palette, et le test le vérifie. S'il cessait de
  // tenir, c'est la palette de l'app qu'il faudrait revoir.
  return {
    attenue: sure(p.textSoft),
    lien: sure(p.primary),
    succes: sure(p.success),
    alerte: sure(p.warning),
    danger: sure(p.danger),
    fill,
    surFill,
    contour: encreSure(p.border, surfaces, SEUIL_UI, p.text),
    focus: encreSure(p.info || p.primary, surfaces, SEUIL_UI, p.text),
  };
}

/** Correspondance clé → variable CSS posée sur `<html>`. */
export const VARIABLES_CHROME = [
  ['attenue', '--sr-ink-soft'],
  ['lien', '--sr-ink-link'],
  ['succes', '--sr-ink-success'],
  ['alerte', '--sr-ink-warning'],
  ['danger', '--sr-ink-danger'],
  ['fill', '--sr-fill'],
  ['surFill', '--sr-on-fill'],
  ['contour', '--sr-ui-border'],
  ['focus', '--sr-focus'],
];
