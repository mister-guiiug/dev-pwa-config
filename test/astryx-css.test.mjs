/**
 * `astryx.css` et `astryx-fluid.css` : la grammaire d'Astryx, promue de
 * mister-uwh-tactic et mister-cim10 (11/2026).
 *
 * Quatre promesses faites aux apps, chacune vérifiée ici plutôt qu'écrite en
 * commentaire :
 *   1. « importer ne change rien » → seulement des custom properties sur
 *      `:root`, et aucun nom que lisent ou déclarent les autres feuilles ;
 *   2. « une seule source »        → chaque couleur est un `var(--dwc-…)`,
 *      aucune valeur de couleur écrite en dur ;
 *   3. « la grammaire est stable » → les noms déclarés sont ceux de la liste ;
 *   4. « les écarts tiennent »     → 44 px, le contour à 3:1, 16 px au doigt.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { transform } from 'lightningcss';

const at = chemin => fileURLToPath(new URL(`../${chemin}`, import.meta.url));
const read = chemin => readFileSync(at(chemin), 'utf8');
const sansCommentaires = css => css.replace(/\/\*[\s\S]*?\*\//g, '');

const ASTRYX = read('astryx.css');
const FLUIDE = read('astryx-fluid.css');
const PKG = JSON.parse(read('package.json'));

/* ── Lecture ────────────────────────────────────────────────────────────── */

/** Une valeur sur une ligne, sans les blancs que Prettier ajoute autour. */
const aplatir = valeur =>
  valeur
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')')
    .trim();

/** Les déclarations d'un corps de règle, découpé sur `;` hors parenthèses. */
function declarations(corps) {
  /** @type {Array<[string, string]>} */
  const sortie = [];
  const garder = texte => {
    const brut = texte.trim();
    if (!brut) return;
    const deuxPoints = brut.indexOf(':');
    sortie.push([
      brut.slice(0, deuxPoints).trim(),
      aplatir(brut.slice(deuxPoints + 1)),
    ]);
  };
  let profondeur = 0;
  let debut = 0;
  for (let i = 0; i < corps.length; i += 1) {
    if (corps[i] === '(') profondeur += 1;
    else if (corps[i] === ')') profondeur -= 1;
    else if (corps[i] === ';' && profondeur === 0) {
      garder(corps.slice(debut, i));
      debut = i + 1;
    }
  }
  garder(corps.slice(debut));
  return sortie;
}

/**
 * Les règles d'une feuille plate — des sélecteurs, et des `@media` qui en
 * contiennent — avec leurs déclarations dans l'ordre. Assez pour ces deux
 * fichiers ; ce n'est pas un analyseur CSS (lightningcss vérifie, plus bas,
 * que la feuille se parse).
 *
 * @returns {Array<{ media: string | null, selecteur: string, declarations: Array<[string, string]> }>}
 */
function regles(css) {
  const sortie = [];
  const lire = (texte, media) => {
    let i = 0;
    for (;;) {
      const ouvre = texte.indexOf('{', i);
      if (ouvre === -1) return;
      const tete = aplatir(texte.slice(i, ouvre));
      let profondeur = 0;
      let ferme = ouvre;
      for (; ferme < texte.length; ferme += 1) {
        if (texte[ferme] === '{') profondeur += 1;
        else if (texte[ferme] === '}' && --profondeur === 0) break;
      }
      const corps = texte.slice(ouvre + 1, ferme);
      if (tete.startsWith('@media')) lire(corps, tete);
      else {
        sortie.push({
          media,
          selecteur: tete,
          declarations: declarations(corps),
        });
      }
      i = ferme + 1;
    }
  };
  lire(sansCommentaires(css), null);
  return sortie;
}

const REGLES = regles(ASTRYX);
const regle = (media, selecteur) => {
  const trouvee = REGLES.find(
    r => r.media === media && r.selecteur === selecteur
  );
  assert.ok(
    trouvee,
    `règle « ${selecteur} » (${media ?? 'hors média'}) introuvable`
  );
  return trouvee;
};
const RACINE = regle(null, ':root');
const VALEURS = new Map(RACINE.declarations);
const SOMBRE_SYSTEME = regle(
  '@media (prefers-color-scheme: dark)',
  ":root:not([data-theme='light']):not(.light)"
);
const SOMBRE_CHOISI = regle(null, ":root[data-theme='dark'], :root.dark");
const AU_DOIGT = regle('@media (pointer: coarse)', ':root');
const MOUVEMENT_REDUIT = regle(
  '@media (prefers-reduced-motion: reduce)',
  ':root'
);

/** Une valeur en rem, en suivant les `var()` de la grammaire. */
function enRem(valeur, table = VALEURS) {
  const alias = /^var\((--[a-z0-9-]+)\)$/.exec(valeur);
  if (alias) {
    assert.ok(table.has(alias[1]), `${alias[1]} n'est pas déclaré`);
    return enRem(table.get(alias[1]), table);
  }
  const rem = /^([\d.]+)rem$/.exec(valeur);
  assert.ok(rem, `taille en rem attendue, reçu « ${valeur} »`);
  return Number(rem[1]);
}

/* ── La grammaire : les noms ────────────────────────────────────────────── */

const STYLES_DE_TEXTE = [
  'heading-1',
  'heading-2',
  'heading-3',
  'heading-4',
  'body',
  'label',
  'code',
  'supporting',
];

/**
 * Les noms d'Astryx que le socle déclare. En ajouter un est une extension ;
 * en retirer un casse les apps qui le lisent.
 */
const GRAMMAIRE = [
  ...[
    'accent',
    'accent-muted',
    'on-accent',
    'background-body',
    'background-surface',
    'background-card',
    'background-popover',
    'background-muted',
    'text-primary',
    'text-secondary',
    'text-accent',
    'icon-primary',
    'icon-secondary',
    'border',
    'border-emphasized',
    'overlay-hover',
    'overlay-pressed',
    'success',
    'warning',
    'warning-muted',
    'error',
    'error-muted',
  ].map(role => `--color-${role}`),
  ...['sm', 'base', 'lg', 'xl', '2xl', '3xl'].map(
    cran => `--font-size-${cran}`
  ),
  ...['normal', 'medium', 'semibold', 'bold'].map(g => `--font-weight-${g}`),
  ...STYLES_DE_TEXTE.flatMap(style =>
    ['size', 'weight', 'leading'].map(p => `--text-${style}-${p}`)
  ),
  ...['0', '0-5', '1', '1-5', '2', '3', '4', '5', '6', '8', '10', '12'].map(
    cran => `--spacing-${cran}`
  ),
  ...['inner', 'element', 'container', 'full'].map(r => `--radius-${r}`),
  ...['low', 'med', 'high'].map(niveau => `--shadow-${niveau}`),
  ...['fast-min', 'fast', 'fast-max', 'medium', 'exit'].map(
    d => `--duration-${d}`
  ),
  '--ease-standard',
  '--ease-exit',
  ...['sm', 'md', 'lg'].map(t => `--size-element-${t}`),
  ...['width', 'style', 'color', 'offset'].map(p => `--focus-outline-${p}`),
].sort();

test('astryx.css déclare exactement la grammaire attendue', () => {
  const declares = RACINE.declarations.map(([nom]) => nom);
  const doublons = declares.filter((nom, i) => declares.indexOf(nom) !== i);
  assert.deepEqual(doublons, [], 'un nom est déclaré deux fois');
  assert.deepEqual(
    [...declares].sort(),
    GRAMMAIRE,
    'la grammaire a dérivé : mettre à jour astryx.css, docs/INTERFACE.md et ce test'
  );
});

test('les blocs de thème, du doigt et du mouvement ne déclarent rien de neuf', () => {
  // Un nom qui n'existerait que sous un média vaudrait « rien » partout
  // ailleurs : il n'appartient pas à la grammaire.
  for (const r of REGLES) {
    for (const [nom] of r.declarations) {
      assert.ok(VALEURS.has(nom), `${nom} (${r.selecteur}) absent de :root`);
    }
  }
});

/* ── 1. Importer ne change rien ─────────────────────────────────────────── */

test('astryx.css ne pose que des custom properties, et seulement sur :root', () => {
  // Pas un `body`, pas un `h1`, pas une classe : la feuille ne peut styler
  // aucun élément, elle ne fait que nommer.
  for (const r of REGLES) {
    for (const selecteur of r.selecteur.split(',')) {
      assert.match(selecteur.trim(), /^:root\b/, `sélecteur « ${selecteur} »`);
    }
    for (const [nom] of r.declarations) {
      assert.match(nom, /^--/, `« ${nom} » n'est pas une custom property`);
    }
  }
  assert.doesNotMatch(
    sansCommentaires(ASTRYX),
    /@(?:theme|apply|tailwind|layer|import)\b/,
    'la feuille doit rester importable sans Tailwind, et hors couche'
  );
});

test('aucun nom de la grammaire n’est lu ni déclaré par les autres feuilles du socle', () => {
  const feuilles = [
    'components.css',
    'tokens.css',
    'tailwind-preset.css',
    ...readdirSync(at('components'))
      .filter(nom => nom.endsWith('.css'))
      .map(nom => `components/${nom}`),
  ];
  const connus = new Set(
    feuilles.flatMap(feuille =>
      [...sansCommentaires(read(feuille)).matchAll(/--[a-z0-9_-]+/gi)].map(
        m => m[0]
      )
    )
  );
  assert.ok(
    connus.has('--dwc-surface'),
    'le relevé des autres feuilles a échoué'
  );
  // Les noms réellement déclarés, dans tous les blocs — pas la liste attendue.
  const declares = new Set(
    REGLES.flatMap(r => r.declarations.map(([nom]) => nom))
  );
  const communs = [...declares].filter(nom => connus.has(nom));
  assert.deepEqual(
    communs,
    [],
    `ces noms changeraient le rendu d'une app qui importe la grammaire sans s'en servir : ${communs.join(', ')}`
  );
});

test('les graisses retombent sur celles du thème par défaut de Tailwind 4', () => {
  // Seule rencontre avec Tailwind : `--font-weight-*`. Aux mêmes valeurs,
  // les classes `font-medium`, `font-semibold`… ne bougent pas.
  assert.equal(VALEURS.get('--font-weight-normal'), '400');
  assert.equal(VALEURS.get('--font-weight-medium'), '500');
  assert.equal(VALEURS.get('--font-weight-semibold'), '600');
  assert.equal(VALEURS.get('--font-weight-bold'), '700');
});

/* ── 2. Une seule source pour les couleurs ──────────────────────────────── */

const DWC = String.raw`var\(--dwc-[a-z0-9-]+\)`;
const MELANGE = String.raw`color-mix\(in srgb, ${DWC} \d{1,2}%, transparent\)`;
/** Un rôle du contrat, avec au plus un repli lui-même tiré du contrat. */
const ALIAS = new RegExp(
  `^(?:${DWC}|${MELANGE}|var\\(--dwc-[a-z0-9-]+, (?:${DWC}|${MELANGE})\\))$`
);
const estCouleur = nom => nom.startsWith('--color-') || nom.endsWith('-color');
const estOmbre = nom => nom.startsWith('--shadow-');

test('chaque couleur est un alias du contrat --dwc-*', () => {
  const couleurs = RACINE.declarations.filter(([nom]) => estCouleur(nom));
  assert.ok(couleurs.length >= 20, 'relevé des couleurs suspicieusement court');
  for (const [nom, valeur] of couleurs) {
    // Le focus peut lire une couleur de la grammaire, qui lit le contrat.
    const relais = /^var\((--color-[a-z-]+)\)$/.exec(valeur);
    if (relais) {
      assert.match(
        VALEURS.get(relais[1]) ?? '',
        ALIAS,
        `${nom} → ${relais[1]}`
      );
      continue;
    }
    assert.match(valeur, ALIAS, `${nom} : « ${valeur} » n'est pas un alias`);
  }
});

test('les --dwc-* lus sont des rôles que ThemeProvider sait peindre', () => {
  // La palette → contrat de `react/theme-provider.js` : une faute de frappe
  // (`--dwc-surface2`) donnerait une couleur vide, sans erreur nulle part.
  const roles = new Set(
    [...read('react/theme-provider.js').matchAll(/'(--dwc-[a-z0-9-]+)'/g)].map(
      m => m[1]
    )
  );
  assert.ok(roles.size >= 14, 'relevé des rôles de ThemeProvider échoué');
  const lus = [...new Set(ASTRYX.match(/--dwc-[a-z0-9-]+/g))];
  const inconnus = lus.filter(nom => !roles.has(nom));
  assert.deepEqual(inconnus, [], `rôles inconnus : ${inconnus.join(', ')}`);
});

test('aucune couleur écrite en dur : seule une ombre porte du noir translucide', () => {
  const NOIR = String.raw`rgb\(0 0 0 / 0\.\d+\)`;
  const COUCHE = String.raw`0 \d+px \d+px ${NOIR}`;
  const OMBRE = new RegExp(`^${COUCHE}(?:, ${COUCHE})*$`);
  const LITTERAL =
    /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|light-dark)\(/i;
  for (const r of REGLES) {
    for (const [nom, valeur] of r.declarations) {
      if (estOmbre(nom)) {
        assert.match(valeur, OMBRE, `${nom} (${r.selecteur}) : « ${valeur} »`);
      } else {
        assert.doesNotMatch(valeur, LITTERAL, `${nom} : couleur en dur`);
      }
    }
  }
});

test('les échelles ne portent que des longueurs, des durées et des courbes', () => {
  // Une liste blanche plutôt qu'une liste noire : un mot-clé de couleur
  // (`black`, `rebeccapurple`) ne passerait pas non plus.
  const ECHELLE =
    /^(?:\d*\.?\d+(?:rem|px|ms)?|var\(--[a-z0-9-]+\)|cubic-bezier\([\d., ]+\)|solid)$/;
  for (const r of REGLES) {
    for (const [nom, valeur] of r.declarations) {
      if (estCouleur(nom) || estOmbre(nom)) continue;
      assert.match(valeur, ECHELLE, `${nom} : « ${valeur} »`);
    }
  }
});

test('les ombres suivent les trois états de thème, et les deux blocs sombres sont jumeaux', () => {
  assert.deepEqual(SOMBRE_SYSTEME.declarations, SOMBRE_CHOISI.declarations);
  const ombres = GRAMMAIRE.filter(estOmbre);
  assert.deepEqual(
    SOMBRE_CHOISI.declarations.map(([nom]) => nom).sort(),
    ombres,
    'le thème sombre doit redéfinir chaque ombre, et rien d’autre'
  );
});

/* ── 4. Les écarts assumés ──────────────────────────────────────────────── */

test('écart 1 : la grande taille de contrôle tient la cible tactile de 44 px', () => {
  assert.ok(
    enRem(VALEURS.get('--size-element-lg')) >= 2.75,
    'Astryx s’arrête à 36 px ; le parc exige 2,75 rem au doigt'
  );
});

test('écart 2 : le contour d’un contrôle est --dwc-border-strong, à 3:1', () => {
  // `tokens.test.mjs` garantit 3:1 à `--dwc-border-strong`, pas au filet
  // discret ; le #CCD3DB d'Astryx tient 1,5:1 sur blanc.
  assert.equal(
    VALEURS.get('--color-border-emphasized'),
    'var(--dwc-border-strong)'
  );
});

test('écart 3 : la marque garde son accent et sa police', () => {
  assert.equal(VALEURS.get('--color-accent'), 'var(--dwc-primary)');
  const polices = [...VALEURS.keys()].filter(nom =>
    nom.startsWith('--font-family')
  );
  assert.deepEqual(polices, [], 'la police reste à l’app');
});

test('au doigt, le texte courant passe à 16 px — et rien ne descend sous 12', () => {
  const auDoigt = new Map(AU_DOIGT.declarations);
  for (const style of ['body', 'label', 'code', 'heading-4']) {
    assert.equal(auDoigt.get(`--text-${style}-size`), '1rem', style);
  }
  for (const style of STYLES_DE_TEXTE) {
    const taille = enRem(VALEURS.get(`--text-${style}-size`));
    assert.ok(taille >= 0.75, `${style} : ${taille * 16} px, sous le plancher`);
  }
});

test('mouvement réduit : chaque durée tombe à 0,01 ms, jamais à 0', () => {
  // Une transition de durée nulle n'émet pas `transitionend`.
  const reduit = new Map(MOUVEMENT_REDUIT.declarations);
  for (const [nom, valeur] of RACINE.declarations) {
    if (!nom.startsWith('--duration-')) continue;
    if (valeur.startsWith('var(')) {
      assert.ok(!reduit.has(nom), `${nom} suit déjà une durée réduite`);
      continue;
    }
    assert.equal(reduit.get(nom), '0.01ms', nom);
  }
});

/* ── astryx-fluid.css ───────────────────────────────────────────────────── */

const FLUIDE_REGLES = regles(FLUIDE);
const FLUIDE_RACINE = new Map(
  FLUIDE_REGLES.find(r => r.selecteur === ':root')?.declarations ?? []
);

test('astryx-fluid.css couvre chaque --text-fluid-* du socle, et rien d’autre', () => {
  // Ceux que lisent les composants, et ceux que déclare le preset : une
  // taille oubliée resterait fluide au milieu des crans.
  const attendus = new Set([
    ...[
      ...read('components.css').matchAll(/var\(\s*(--text-fluid-[a-z0-9]+)/g),
    ].map(m => m[1]),
    ...[
      ...read('tailwind-preset.css').matchAll(/(--text-fluid-[a-z0-9]+):/g),
    ].map(m => m[1]),
  ]);
  assert.ok(attendus.size >= 7, 'relevé de l’échelle fluide échoué');
  assert.equal(FLUIDE_REGLES.length, 1, 'une seule règle, sur :root');
  assert.deepEqual([...FLUIDE_RACINE.keys()].sort(), [...attendus].sort());
});

test('chaque taille fluide devient un style nommé de la grammaire', () => {
  for (const [nom, valeur] of FLUIDE_RACINE) {
    const style = /^var\((--text-[a-z0-9-]+-size)\)$/.exec(valeur);
    assert.ok(style, `${nom} : « ${valeur} » n'est pas un style nommé`);
    assert.ok(
      GRAMMAIRE.includes(style[1]),
      `${nom} → ${style[1]}, hors grammaire`
    );
  }
});

test('la hiérarchie des tailles du socle est conservée, au bureau comme au doigt', () => {
  const ordre = ['2xs', 'xs', 'sm', 'base', 'lg', 'xl', '2xl'];
  const auDoigt = new Map([...VALEURS, ...AU_DOIGT.declarations]);
  for (const table of [VALEURS, auDoigt]) {
    const tailles = ordre.map(cran =>
      enRem(FLUIDE_RACINE.get(`--text-fluid-${cran}`), table)
    );
    const triees = [...tailles].sort((a, b) => a - b);
    assert.deepEqual(tailles, triees, `ordre rompu : ${tailles.join(' · ')}`);
  }
});

/* ── Les deux feuilles ──────────────────────────────────────────────────── */

for (const [nom, css] of [
  ['astryx.css', ASTRYX],
  ['astryx-fluid.css', FLUIDE],
]) {
  test(`${nom} se parse sans erreur ni avertissement`, () => {
    const { warnings } = transform({
      filename: nom,
      code: Buffer.from(css),
      errorRecovery: false,
    });
    assert.deepEqual(warnings, []);
  });

  test(`${nom} est exporté et livré`, () => {
    assert.equal(PKG.exports[`./${nom}`], `./${nom}`);
    assert.ok(PKG.files.includes(nom), `${nom} absent de "files"`);
  });
}
