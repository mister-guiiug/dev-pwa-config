// Garde-fous de `components.css` — l'habillage OPT-IN des composants `/react`.
//
// Trois promesses sont faites aux apps consommatrices, et cassées en silence si
// personne ne les vérifie :
//   1. « n'impose rien »   → tout est dans `@layer components` ;
//   2. « marche sans rien » → chaque `var(--dwc-*)` porte un repli ;
//   3. « contrat stable »   → la liste des variables lues ne dérive pas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name =>
  readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

const RAW = read('components.css');
const CSS = RAW.replace(/\/\*[\s\S]*?\*\//g, '');
const PKG = JSON.parse(read('package.json'));

// Contrat public, documenté en tête de `components.css` et dans le README.
// Ajouter une variable ici est une extension ; en retirer une est un breaking
// change pour les apps qui l'ont câblée.
const CONTRACT = [
  '--dwc-border',
  '--dwc-danger',
  '--dwc-info',
  '--dwc-primary',
  '--dwc-primary-contrast',
  '--dwc-primary-soft',
  '--dwc-radius',
  '--dwc-shadow',
  '--dwc-success',
  '--dwc-surface',
  '--dwc-surface-2',
  '--dwc-text',
  '--dwc-text-soft',
  '--dwc-warning',
];

test('tout est confiné dans @layer components', () => {
  const open = CSS.indexOf('{', CSS.indexOf('@layer components'));
  assert.notEqual(open, -1, '@layer components introuvable');

  let depth = 0;
  let end = -1;
  for (let i = open; i < CSS.length; i += 1) {
    if (CSS[i] === '{') depth += 1;
    else if (CSS[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  assert.notEqual(end, -1, 'accolade de @layer non fermée');

  const outside =
    CSS.slice(0, CSS.indexOf('@layer components')) + CSS.slice(end + 1);
  assert.equal(
    outside.trim(),
    '',
    'une règle échappe à @layer components : elle prendrait le pas sur le CSS de l’app'
  );
});

test('chaque var(--dwc-*) porte un repli', () => {
  const sansRepli = [...CSS.matchAll(/var\(\s*(--dwc-[\w-]+)\s*([,)])/g)]
    .filter(m => m[2] === ')')
    .map(m => m[1]);
  assert.deepEqual(
    [...new Set(sansRepli)],
    [],
    'sans repli, une app qui n’a pas défini la variable obtient une valeur vide'
  );
});

test('les variables lues correspondent exactement au contrat documenté', () => {
  const used = [
    ...new Set([...CSS.matchAll(/var\(\s*(--dwc-[\w-]+)/g)].map(m => m[1])),
  ].sort();
  assert.deepEqual(
    used,
    CONTRACT,
    'le contrat --dwc-* a dérivé : mettre à jour l’en-tête de components.css, le README et ce test'
  );
});

test('aucune couleur de marque codée en dur hors repli', () => {
  // Les seuls littéraux tolérés sont les replis des quatre tons d'état, qui
  // n'ont pas d'équivalent en couleur système CSS (`light-dark(#…, #…)`).
  const hexHorsLightDark = [...CSS.matchAll(/#[0-9a-f]{3,8}\b/gi)].filter(m => {
    const before = CSS.slice(Math.max(0, m.index - 60), m.index);
    return !/light-dark\([^)]*$/.test(before);
  });
  assert.deepEqual(
    hexHorsLightDark.map(m => m[0]),
    [],
    'les neutres doivent passer par les couleurs système (Canvas/CanvasText/GrayText)'
  );
});

test('la cible tactile de 2,75 rem est imposée aux commandes', () => {
  assert.match(CSS, /min-height:\s*2\.75rem/);
});

test('components.css est exporté et publié', () => {
  assert.equal(PKG.exports['./components.css'], './components.css');
  assert.ok(
    PKG.files.includes('components.css'),
    'components.css absent de "files" : il ne serait pas publié sur npm'
  );
});

test('la copie du showroom est identique à l’octet', () => {
  assert.equal(
    read('showroom/components.css'),
    RAW,
    'showroom/components.css a dérivé — relancer `npm run showroom:sync`'
  );
});

test('le showroom câble le contrat au lieu de recopier l’habillage', () => {
  const showroomCss = read('showroom/showroom.css');
  for (const token of CONTRACT) {
    assert.match(
      showroomCss,
      new RegExp(`${token}:\\s*var\\(--ds-`),
      `${token} non câblé sur le thème du showroom`
    );
  }
});
