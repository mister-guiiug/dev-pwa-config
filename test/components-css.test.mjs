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
  '--dwc-border-strong',
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

/**
 * LE REPLI EST UNE VALEUR, PAS UNE FORMALITÉ. Une app qui ne prend pas le
 * preset — `mister-quota`, en Electron, l'a fait le 30/08/2026 — ne voit QUE
 * les replis. Si le même jeton en porte deux différents, elle obtient deux
 * tailles pour une seule intention, et personne ne le remarque puisque les
 * seize autres apps définissent la variable.
 *
 * Constaté ce jour-là : `--text-fluid-xs` retombait sur `0.8rem` à huit
 * endroits et sur `0.75rem` sur les onglets de `BottomNav`.
 */
test('un même jeton porte le même repli partout', () => {
  // PÉRIMÈTRE ASSUMÉ : les replis SCALAIRES, ceux dont la valeur ne contient
  // aucune parenthèse (tailles, rayons). Les replis de couleur imbriquent
  // `light-dark()`, `color-mix()` ou un second `var()` — les comparer demande
  // un vrai analyseur, pas une expression rationnelle, et une expression
  // rationnelle qui les tronque comparerait des valeurs fausses. Mieux vaut un
  // garde-fou étroit et exact qu'un large et menteur.
  const replis = new Map();
  for (const [, nom, repli] of CSS.matchAll(
    /var\(\s*(--[\w-]+)\s*,\s*([^;()]+?)\s*\)/g
  )) {
    if (!replis.has(nom)) replis.set(nom, new Set());
    replis.get(nom).add(repli.trim());
  }
  const divergents = [...replis]
    .filter(([, valeurs]) => valeurs.size > 1)
    .map(([nom, valeurs]) => `${nom} → ${[...valeurs].sort().join(' | ')}`)
    .sort();

  assert.deepEqual(
    divergents,
    [],
    `replis divergents : ${divergents.join(', ')} — une app sans le preset verrait deux valeurs pour un seul jeton`
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

test('un `display` d’auteur ne neutralise pas l’attribut hidden', () => {
  // L'attribut `hidden` n'agit que via la feuille de style du navigateur : dès
  // qu'une règle d'auteur pose un `display`, l'élément réapparaît. La feuille
  // modale du showroom s'affichait ainsi par-dessus la page au chargement,
  // alors qu'elle portait bien `hidden`.
  const rule = /\[data-dwc\]\[hidden\]\s*\{\s*display:\s*none;?\s*\}/;
  assert.match(CSS, rule, 'règle de neutralisation de [hidden] absente');

  // Elle doit rester la DERNIÈRE : à spécificité égale, c'est l'ordre qui
  // tranche, et plusieurs sélecteurs du fichier pèsent (0,2,0) comme elle.
  const after = CSS.slice(CSS.search(rule) + CSS.match(rule)[0].length);
  assert.equal(
    after.replace(/[\s}]/g, ''),
    '',
    'des règles suivent [data-dwc][hidden] : elles pourraient la neutraliser'
  );
});

/** Corps d'un bloc `@media <query>` de premier niveau, accolades équilibrées. */
function mediaBody(query) {
  const start = CSS.indexOf(`@media ${query}`);
  if (start === -1) return null;
  const open = CSS.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < CSS.length; i += 1) {
    if (CSS[i] === '{') depth += 1;
    else if (CSS[i] === '}') {
      depth -= 1;
      if (depth === 0) return CSS.slice(open + 1, i);
    }
  }
  return null;
}

// Ces deux tests ne vérifient pas que les blocs EXISTENT — ça ne prouverait
// rien. Ils vérifient que chaque règle qui crée le défaut porte son antidote,
// pour qu'un composant ajouté demain ne rouvre pas la brèche en silence.

test('tout contour transparent est rattrapé en contraste forcé', () => {
  // `transparent` n'est pas remplacé par le navigateur en contraste forcé :
  // un aplat perdu + un contour transparent = un composant invisible.
  const body = mediaBody('(forced-colors: active)');
  assert.ok(body, 'bloc @media (forced-colors: active) absent');

  const rules = CSS.slice(0, CSS.indexOf('@media (forced-colors: active)'));
  // `border` ET ses raccourcis directionnels : `BottomNav` réserve son trait
  // actif par un `border-block-start` transparent, que la version précédente de
  // cette garde ne voyait pas.
  const transparents = [
    ...rules.matchAll(
      /([^{}]+)\{[^{}]*border(?:-block|-inline)?(?:-start|-end|-top|-bottom|-left|-right)?:[^;}]*\btransparent\b/g
    ),
  ].map(m =>
    m[1]
      .trim()
      .split(/\s*,\s*/)
      .pop()
  );

  const orphans = transparents.filter(sel => !body.includes(sel));
  assert.deepEqual(
    orphans,
    [],
    'ces sélecteurs posent une bordure transparente sans contrepartie en contraste forcé'
  );
});

test('aucun texte posé sur un aplat ne s’imprime en blanc sur blanc', () => {
  // Les navigateurs suppriment les fonds à l'impression mais gardent la
  // couleur du texte : un libellé en `--dwc-primary-contrast` disparaît.
  const body = mediaBody('print');
  assert.ok(body, 'bloc @media print absent');

  const rules = CSS.slice(0, CSS.indexOf('@media print'));
  const onFill = [
    ...rules.matchAll(/([^{}]+)\{[^{}]*color:\s*var\(--dwc-primary-contrast/g),
  ].map(m =>
    m[1]
      .trim()
      .split(/\s*,\s*/)
      .pop()
  );

  assert.ok(onFill.length, 'aucun sélecteur détecté : le motif a changé');
  const orphans = onFill.filter(sel => !body.includes(sel));
  assert.deepEqual(
    orphans,
    [],
    'ces sélecteurs impriment du texte clair sur un fond que l’imprimante retire'
  );
});

test('aucune animation ne retient sa valeur d’arrivée', () => {
  // `both` et `forwards` gardent la valeur du dernier keyframe APRÈS la fin.
  // Une transformation retenue — même l'identité — fait de l'élément le bloc
  // conteneur de ses descendants `position: fixed` et lui ouvre un contexte
  // d'empilement. Trois composants du fichier sont `position: fixed` (`sheet`,
  // `confirm`, `toast-viewport`) et s'imbriquent : `ConfirmDialog` s'ouvre
  // depuis une feuille, donc DANS `sheet-panel`. Avec `both`, son voile se
  // repliait sur la feuille et son `z-index` y restait prisonnier.
  const retenus = [...CSS.matchAll(/([^{}]+)\{[^{}]*animation:[^;}]*/g)]
    .filter(m => /\b(both|forwards)\b/.test(m[0]))
    .map(m =>
      m[1]
        .trim()
        .split(/\s*,\s*/)
        .pop()
    );

  assert.deepEqual(
    retenus,
    [],
    'ces sélecteurs retiennent leur état final : utiliser `backwards` (voir @keyframes dwc-rise)'
  );

  // Le motif doit rester détectable : si les animations changent de forme, la
  // garde ci-dessus passerait au vert sans plus rien vérifier.
  const fills = [...CSS.matchAll(/animation:[^;}]*\bbackwards\b/g)];
  assert.equal(
    fills.length,
    3,
    'les trois entrées de panneau devraient porter `backwards` — le motif a changé'
  );
});

test('le contraste forcé n’est jamais désactivé', () => {
  // `forced-color-adjust: none` fige NOS teintes et passe outre le réglage de
  // l'utilisateur. Légitime pour un nuancier (la couleur EST l'information),
  // jamais pour un composant d'interface.
  assert.doesNotMatch(
    CSS,
    /forced-color-adjust:\s*none/,
    'un composant impose ses couleurs malgré le réglage de contraste forcé'
  );
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
