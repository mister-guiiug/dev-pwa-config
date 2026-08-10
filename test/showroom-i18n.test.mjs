// Parité des traductions du showroom.
//
// Le français est le HTML lui-même ; `showroom/i18n.js` ne porte que les
// autres langues. Sans garde-fou, un bloc ajouté en français resterait
// silencieusement français en anglais, et une clé supprimée traînerait
// indéfiniment dans le dictionnaire.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name =>
  readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

const HTML = read('showroom/index.html');
const JS = read('showroom/showroom.js');

await import('../showroom/i18n.js');
const DICTS = globalThis.SHOWROOM_I18N;

const docKeys = [...HTML.matchAll(/data-i18n="([^"]+)"/g)].map(m => m[1]);
// Clés utilisées par le code généré : `t('clé', 'repli français')`.
const codeKeys = [...JS.matchAll(/\bt\(\s*'([\w.-]+)'/g)].map(m => m[1]);
// Clés construites dynamiquement (`t('ui.role.' + role[0], …)`) : on les
// reconstitue depuis les préfixes déclarés, sinon le test croirait à un orphelin.
const DYNAMIC_PREFIXES = [
  'ui.role.',
  'ui.maturity.',
  'ui.button.',
  'ui.tone.',
  'ui.contrast',
  'ui.a11y.group.',
  'theme.',
];

test('chaque langue déclare un dictionnaire non vide', () => {
  const langs = Object.keys(DICTS);
  assert.ok(langs.length > 0, 'aucune langue déclarée');
  for (const lang of langs) {
    assert.match(lang, /^[a-z]{2}$/, `code langue invalide : ${lang}`);
    assert.ok(
      Object.keys(DICTS[lang]).length > 50,
      `dictionnaire ${lang} suspicieusement court`
    );
  }
});

test('les clés du document sont uniques', () => {
  const seen = new Set();
  const dupes = docKeys.filter(k =>
    seen.has(k) ? true : (seen.add(k), false)
  );
  assert.deepEqual(dupes, [], 'clés data-i18n dupliquées');
});

test('chaque bloc du document est traduit dans toutes les langues', () => {
  for (const [lang, dict] of Object.entries(DICTS)) {
    const missing = docKeys.filter(key => dict[key] === undefined);
    assert.deepEqual(
      missing,
      [],
      `blocs non traduits en ${lang} — ils resteraient en français`
    );
  }
});

test('aucune clé orpheline dans les dictionnaires', () => {
  const known = new Set([...docKeys, ...codeKeys]);
  for (const [lang, dict] of Object.entries(DICTS)) {
    const orphans = Object.keys(dict).filter(
      key => !known.has(key) && !DYNAMIC_PREFIXES.some(p => key.startsWith(p))
    );
    assert.deepEqual(orphans, [], `clés sans emploi dans ${lang}`);
  }
});

test('les libellés générés ont tous une traduction', () => {
  // `t()` est appelé avec un repli français : un manque ne casse rien à
  // l'exécution, il laisse juste du français au milieu de l'anglais.
  const staticCodeKeys = codeKeys.filter(
    k => !DYNAMIC_PREFIXES.some(p => k === p || k.startsWith(p))
  );
  for (const [lang, dict] of Object.entries(DICTS)) {
    const missing = staticCodeKeys.filter(key => dict[key] === undefined);
    assert.deepEqual(missing, [], `libellés générés non traduits en ${lang}`);
  }
});

test('le sélecteur de langue propose exactement les langues connues', () => {
  const options = [
    ...HTML.matchAll(/<select id="lang">([\s\S]*?)<\/select>/g),
  ][0];
  assert.ok(options, 'sélecteur de langue absent de index.html');
  const values = [...options[1].matchAll(/value="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(
    values.sort(),
    ['fr', ...Object.keys(DICTS)].sort(),
    'le sélecteur et les dictionnaires ont divergé'
  );
});

test('index.html charge i18n.js avant showroom.js', () => {
  const i18n = HTML.indexOf('i18n.js');
  const main = HTML.indexOf('showroom.js"');
  assert.ok(i18n !== -1 && main !== -1);
  assert.ok(i18n < main, 'showroom.js lirait un dictionnaire non défini');
});
