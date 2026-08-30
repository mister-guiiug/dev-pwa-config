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
const INTERNAL = new Set(['index', 'icons', 'i18n-core', 'use-dialog']);

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

/* ── Le barrel exporte-t-il ce qu'il DÉCLARE ? ─────────────────────────── */

/**
 * LE DÉFAUT, CONSTATÉ EN MIGRATION. `react/index.js` et `react/index.d.ts` sont
 * deux listes tenues À LA MAIN, et rien ne les comparait. Trois modules promus
 * (`VersionProvider`, `useAppVersion`, `AppVersion`) ont donc été ajoutés au
 * barrel d'exécution sans l'être à celui des types : l'import marchait, `tsc`
 * le refusait, et l'app consommatrice a dû passer par les sous-chemins.
 *
 * `npm run typecheck` ne pouvait pas le voir : il vérifie les fichiers du
 * paquet, pas la correspondance entre deux listes dont l'une n'est lue que par
 * les consommateurs.
 *
 * L'inverse n'est PAS vérifié : un type exporté (`ButtonProps`, `SyncStatus`…)
 * n'a légitimement aucune contrepartie à l'exécution.
 */
test('tout export du barrel react est aussi DÉCLARÉ dans ses types', async () => {
  const ts = (await import('typescript')).default;
  const entry = at('react/index.d.ts');

  const program = ts.createProgram([entry], {
    noEmit: true,
    skipLibCheck: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ESNext,
    jsx: ts.JsxEmit.ReactJSX,
  });
  const source = program.getSourceFile(entry);
  assert.ok(source, 'react/index.d.ts introuvable');
  const checker = program.getTypeChecker();
  const moduleSymbol = checker.getSymbolAtLocation(source);
  assert.ok(moduleSymbol, 'react/index.d.ts n’est pas vu comme un module');

  const declares = new Set(
    checker.getExportsOfModule(moduleSymbol).map(symbol => symbol.name)
  );
  const runtime = Object.keys(await import('../react/index.js'));
  assert.ok(runtime.length > 20, 'barrel suspicieusement court');

  const nonDeclares = runtime.filter(name => !declares.has(name)).sort();
  assert.deepEqual(
    nonDeclares,
    [],
    `ces exports existent à l'exécution mais pas dans react/index.d.ts : ${nonDeclares.join(', ')} — une app les importerait sans que tsc les connaisse`
  );
});

/**
 * MÊME FAMILLE DE DÉFAUT, UN CRAN PLUS BAS : une PROP lue par le composant
 * mais absente de ses types.
 *
 * `ErrorBoundary` rend la référence à citer au support (`reference`, et son
 * libellé) depuis toujours ; `ObservabilityBoundary` la renseigne seule. Ni
 * l'une ni l'autre n'était déclarée : `npm run typecheck` ne voit que les
 * fichiers du paquet, où le JSDoc suffit — c'est le CONSOMMATEUR qui bute.
 * miss-supaboss (#30) a donc dû passer la prop en spread commenté pour que
 * `tsc` la laisse passer, sur une frontière d'erreur, c'est-à-dire à l'endroit
 * où l'on ne peut justement pas se permettre de bricoler.
 */
test('l’écran de secours ne lit aucune prop absente de ses types', () => {
  const source = readFileSync(at('react/error-boundary.js'), 'utf8');
  const types = readFileSync(at('react/error-boundary.d.ts'), 'utf8');

  // Ce que la classe lit directement…
  const lues = new Set(
    [...source.matchAll(/this\.props\.(\w+)/g)].map(m => m[1])
  );
  // …et ce que la façade extrait de ses props avant de les retransmettre.
  const facades = [...source.matchAll(/const \{([^}]*)\} = props;/g)];
  assert.ok(facades.length, 'la façade a changé de forme : revoir ce test');
  for (const facade of facades) {
    for (const nom of facade[1].split(',')) {
      const propre = nom.trim().replace(/^\.{3}/, '');
      if (propre && propre !== 'rest') lues.add(propre);
    }
  }
  assert.ok(lues.has('reference'), 'motif de lecture des props non détecté');

  // Les membres des interfaces : deux espaces d'indentation, jamais une ligne
  // de commentaire (qui commence par `*`).
  const declarees = new Set(
    [...types.matchAll(/^ {2}(\w+)\??:/gm)].map(m => m[1])
  );
  const absentes = [...lues].filter(nom => !declarees.has(nom)).sort();
  assert.deepEqual(
    absentes,
    [],
    `ces props sont lues mais non déclarées : ${absentes.join(', ')} — une app qui les passe se ferait refuser par tsc`
  );
});
