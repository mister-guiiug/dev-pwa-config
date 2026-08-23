/**
 * Surface publique du paquet : ce qui est atteignable, et ce qui est élaguable.
 *
 * Vingt-trois modules de `react/` n'avaient AUCUN sous-chemin : ils n'étaient
 * atteignables que par le barrel, et `sideEffects` n'étant pas déclaré, un
 * bundler ne pouvait pas élaguer sûrement ceux qu'une app n'utilise pas. Neuf
 * apps important un seul symbole tiraient donc les vingt-deux autres modules
 * dans leur graphe.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const at = path => fileURLToPath(new URL(`../${path}`, import.meta.url));
const PKG = JSON.parse(readFileSync(at('package.json'), 'utf8'));

/**
 * Modules internes : importés en relatif par le paquet, jamais par une app.
 * Les lister ici est une DÉCISION, pas un oubli — c'est ce qui distingue « pas
 * encore exporté » de « délibérément privé ».
 */
const INTERNAL = new Set(['index', 'icons', 'i18n-core']);

const reactModules = readdirSync(at('react'))
  .filter(name => name.endsWith('.js'))
  .map(name => name.slice(0, -3));

test('chaque module react est exporté, ou explicitement interne', () => {
  const missing = reactModules.filter(
    name => !INTERNAL.has(name) && !(`./react/${name}` in PKG.exports)
  );
  assert.deepEqual(
    missing,
    [],
    `modules sans sous-chemin : ${missing.join(', ')} — ajouter à exports, ou à INTERNAL si c'est voulu`
  );
});

test('aucun sous-chemin ne pointe vers un fichier absent', () => {
  for (const [subpath, target] of Object.entries(PKG.exports)) {
    const files = typeof target === 'string' ? [target] : Object.values(target);
    for (const file of files) {
      assert.ok(
        existsSync(at(file)),
        `${subpath} pointe vers ${file}, qui n'existe pas`
      );
    }
  }
});

test('un sous-chemin typé annonce un .d.ts qui existe vraiment', () => {
  for (const [subpath, target] of Object.entries(PKG.exports)) {
    if (typeof target === 'string') continue;
    if (!('types' in target)) continue;
    assert.match(target.types, /\.d\.ts$/, `${subpath} : types douteux`);
    assert.ok(
      existsSync(at(target.types)),
      `${subpath} : ${target.types} absent`
    );
  }
});

test('tout module react avec des types déclare ses types dans exports', () => {
  for (const name of reactModules) {
    if (INTERNAL.has(name)) continue;
    if (!existsSync(at(`react/${name}.d.ts`))) continue;
    const entry = PKG.exports[`./react/${name}`];
    assert.equal(
      typeof entry === 'string' ? undefined : entry.types,
      `./react/${name}.d.ts`,
      `./react/${name} livre des types mais ne les annonce pas`
    );
  }
});

test('sideEffects ne réclame que les CSS', () => {
  // Le JS du paquet n'a aucun effet à l'import : le déclarer autorise le
  // bundler à élaguer ce qu'une app n'utilise pas. Les CSS, eux, EN ONT un —
  // leur import est le but.
  assert.deepEqual(PKG.sideEffects, ['*.css']);
});

test('tout ce qui est exporté est aussi livré dans le tarball', () => {
  const shipped = new Set(PKG.files);
  for (const [subpath, target] of Object.entries(PKG.exports)) {
    const files = typeof target === 'string' ? [target] : Object.values(target);
    for (const file of files) {
      const relative = file.replace(/^\.\//, '');
      const covered =
        shipped.has(relative) ||
        [...shipped].some(entry => relative.startsWith(`${entry}/`));
      assert.ok(covered, `${subpath} → ${relative} n'est pas dans "files"`);
    }
  }
});

test('ESLint et ses greffons ne sont plus des dépendances de production', () => {
  // Sept paquets étaient déclarés À LA FOIS en dependencies et en
  // peerDependencies : toute app installait ESLint 9 et son écosystème, même
  // celle qui n'importe que du CSS, avec le risque de deux ESLint dans l'arbre.
  assert.equal(
    PKG.dependencies,
    undefined,
    'le paquet ne doit plus avoir de dépendances de production'
  );
});

test('une peer importée sans garde n’est pas déclarée optionnelle', () => {
  // `eslint-react.js` importe ces trois greffons au niveau module : les
  // annoncer optionnels promettait une dégradation gracieuse qui n'existe pas —
  // sans eux, l'import plante.
  const optional = PKG.peerDependenciesMeta ?? {};
  for (const name of [
    'eslint-plugin-jsx-a11y',
    'eslint-plugin-react-hooks',
    'eslint-plugin-react-refresh',
  ]) {
    const source = readFileSync(at('eslint-react.js'), 'utf8');
    assert.match(source, new RegExp(`from '${name}'`));
    assert.ok(
      !optional[name]?.optional,
      `${name} est importé sans garde : il ne peut pas être optionnel`
    );
  }
});
