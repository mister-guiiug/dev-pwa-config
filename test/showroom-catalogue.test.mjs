// Garde-fous du catalogue du showroom.
//
// La leçon vient d'un design system voisin : il déclarait « chaque composant
// partagé figure dans ce catalogue » et en avait laissé filer dix-huit, faute
// de test. Un catalogue tenu à la main devient faux le jour où quelqu'un est
// pressé — et il ne le dit jamais.
//
// Les quatre promesses vérifiées ici :
//   1. « rien n'échappe »   → tout export du barrel est couvert, ou exclu ;
//   2. « rien n'est vide »  → chaque composant a ses pièges ET sa note a11y ;
//   3. « FR = EN »          → parité stricte, y compris le nombre de pièges ;
//   4. « les arbres tiennent » → 2 à 4 branches, pointant vers du réel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name =>
  readFileSync(new URL(`../${name}`, import.meta.url), 'utf8');

await import('../showroom/catalogue.js');
const CATALOGUE = globalThis.SHOWROOM_CATALOGUE;

const INDEX_HTML = read('showroom/index.html');
const SHOWROOM_JS = read('showroom/showroom.js');

// Exports que le catalogue ne documente PAS, et pourquoi. Une liste vide est
// l'état sain ; y ajouter une ligne est une décision, pas un oubli.
const EXCLUS = {};

test('tout export du barrel est catalogué, ou nommément exclu', async () => {
  const barrel = await import('../react/index.js');
  const exports = Object.keys(barrel).sort();
  assert.ok(exports.length > 20, 'barrel suspicieusement court');

  const couverts = new Set([
    ...CATALOGUE.components.flatMap(c => c.covers ?? []),
    ...CATALOGUE.hooks.flatMap(h => h.covers ?? []),
    ...Object.keys(EXCLUS),
  ]);

  const orphelins = exports.filter(name => !couverts.has(name));
  assert.deepEqual(
    orphelins,
    [],
    'ces exports ne sont documentés nulle part dans le showroom — les ajouter au catalogue, ou les inscrire dans EXCLUS avec leur raison'
  );

  // L'inverse : une entrée qui prétend couvrir un export disparu.
  const connus = new Set(exports);
  const fantomes = [...couverts].filter(
    name => !connus.has(name) && !(name in EXCLUS)
  );
  assert.deepEqual(
    fantomes,
    [],
    'le catalogue documente des exports qui n’existent plus'
  );
});

test('chaque composant catalogué porte ses pièges et sa note a11y', () => {
  // Le champ obligatoire force la question au moment où on ajoute le
  // composant — c'est-à-dire au seul moment où on connaît encore la réponse.
  for (const entry of CATALOGUE.components) {
    assert.ok(
      (entry.donts?.fr ?? []).length > 0,
      `${entry.id} n’expose aucun piège`
    );
    assert.ok(entry.a11y?.fr, `${entry.id} n’a pas de note d’accessibilité`);
    assert.ok(
      ['primitive', 'feedback', 'pwa', 'shell'].includes(entry.category),
      `${entry.id} : catégorie inconnue « ${entry.category} »`
    );
  }
  for (const hook of CATALOGUE.hooks) {
    assert.ok(hook.signature, `${hook.id} n’a pas de signature`);
    assert.ok(hook.dont?.fr, `${hook.id} n’a pas de piège`);
  }
});

test('français et anglais restent à parité, piège par piège', () => {
  // Un piège traduit à moitié laisserait une liste plus courte en anglais :
  // la comparaison porte donc sur la LONGUEUR, pas sur la seule présence.
  const paires = [];
  for (const entry of CATALOGUE.components) {
    paires.push([`${entry.id}.donts`, entry.donts]);
    paires.push([`${entry.id}.a11y`, entry.a11y]);
  }
  for (const hook of CATALOGUE.hooks) {
    paires.push([`${hook.id}.summary`, hook.summary]);
    paires.push([`${hook.id}.dont`, hook.dont]);
  }
  for (const tree of CATALOGUE.decisions) {
    paires.push([`${tree.id}.question`, tree.question]);
    tree.branches.forEach((b, i) => {
      paires.push([`${tree.id}.${i}.when`, b.when]);
      paires.push([`${tree.id}.${i}.why`, b.why]);
    });
  }

  for (const [nom, champ] of paires) {
    assert.ok(champ?.fr !== undefined, `${nom} : français manquant`);
    assert.ok(champ?.en !== undefined, `${nom} : anglais manquant`);
    if (Array.isArray(champ.fr)) {
      assert.equal(
        champ.en.length,
        champ.fr.length,
        `${nom} : ${champ.fr.length} entrées en français, ${champ.en.length} en anglais`
      );
    }
  }
});

test('les arbres de décision restent des arbres', () => {
  const cibles = new Set(CATALOGUE.components.map(c => c.id));
  assert.ok(CATALOGUE.decisions.length >= 3, 'trop peu d’arbres');

  for (const tree of CATALOGUE.decisions) {
    // La règle annoncée dans la page : au-delà de quatre branches, ce n'est
    // pas l'arbre qui manque de place, c'est l'API qui est sous-spécifiée.
    assert.ok(
      tree.branches.length >= 2 && tree.branches.length <= 4,
      `${tree.id} : ${tree.branches.length} branches, hors de la fourchette 2–4 annoncée`
    );
    for (const branch of tree.branches) {
      assert.ok(branch.use, `${tree.id} : une branche ne recommande rien`);
      assert.ok(
        cibles.has(branch.target),
        `${tree.id} : la branche pointe vers « ${branch.target} », qui n’est pas un composant catalogué`
      );
      // `use` n'est pas traduit : c'est du CODE. Une qualification glissée
      // dedans (« à deux actions ») resterait en français dans la version
      // anglaise — ce qui est arrivé, d'où cette forme imposée : une balise,
      // ou deux séparées par ` + `.
      for (const part of branch.use.split(' + ')) {
        assert.match(
          part,
          /^<[A-Z]\w*(\s[^<>]*?)?\s*\/?>$/,
          `${tree.id} : « ${branch.use} » n’est pas un fragment de code — déplacer la qualification dans when/why`
        );
      }
    }
  }
});

test('chaque fiche du catalogue a son emplacement dans la page', () => {
  // Le lien d'une branche vise `#doc-<id>` ; sans emplacement correspondant,
  // il ne mène nulle part et l'échec est silencieux.
  const slots = [...INDEX_HTML.matchAll(/data-snippet="([\w-]+)"/g)].map(
    m => m[1]
  );
  const ids = CATALOGUE.components.map(c => c.id);

  assert.deepEqual(
    ids.filter(id => !slots.includes(id)),
    [],
    'ces fiches n’ont pas d’emplacement `data-snippet` : leurs pièges ne s’afficheraient pas'
  );
  assert.deepEqual(
    slots.filter(id => !ids.includes(id)),
    [],
    'ces emplacements n’ont pas de fiche : la section reste sans pièges ni note a11y'
  );
});

test('le catalogue est chargé avant le script qui le lit', () => {
  const cat = INDEX_HTML.indexOf('catalogue.js');
  const main = INDEX_HTML.indexOf('showroom.js"');
  assert.ok(cat !== -1, 'catalogue.js non référencé par index.html');
  assert.ok(cat < main, 'showroom.js lirait un catalogue non défini');

  // Tout ce qui est engendré doit l'être à CHAQUE changement de langue.
  const generated = SHOWROOM_JS.slice(
    SHOWROOM_JS.indexOf('function renderGenerated'),
    SHOWROOM_JS.indexOf('setupSheet();')
  );
  for (const fn of [
    'renderComponentDocs()',
    'renderDecisions()',
    'renderHooks()',
    'renderCatalogueFilters()',
    'renderCatalogueIndex()',
  ]) {
    assert.ok(
      generated.includes(fn),
      `${fn} hors de renderGenerated : le bloc resterait en français`
    );
  }
});

test('une custom property se copie sous sa forme utilisable', () => {
  // Coller `--x` dans une déclaration REDÉFINIT la variable au lieu de la
  // lire. Ce qu'on copie doit marcher sans retouche.
  assert.match(
    SHOWROOM_JS,
    /indexOf\('--'\) === 0 \? 'var\(' \+ raw \+ '\)' : raw/,
    'les tokens ne sont plus copiés en var(--x)'
  );
});
