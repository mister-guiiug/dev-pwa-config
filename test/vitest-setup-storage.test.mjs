/**
 * `vitest-setup` et le `Storage` : lequel des trois arrive jusqu'aux tests.
 *
 * LE DÉFAUT QUE CES TESTS RENDENT IMPOSSIBLE À REPRODUIRE. Node 26 pose
 * lui-même `localStorage` sur `globalThis` ; sans `--localstorage-file` il
 * avertit et rend `undefined`, mais la PROPRIÉTÉ existe. `populateGlobal` de
 * Vitest ne recopie une clé de la fenêtre jsdom que si elle n'est pas déjà sur
 * `globalThis` — le vrai `Storage` n'arrivait donc plus, et le secours en
 * mémoire prenait le relais sans qu'un mot soit dit. Il honore l'interface,
 * pas l'objet exotique : `Object.keys(localStorage)` rend les noms de ses
 * méthodes. Les vingt dépôts de la famille ont éprouvé une `Map` au lieu du
 * stockage du navigateur ; un seul test, dans `miss-badminton`, lisait ses
 * clés autrement que par `getItem`, et c'est lui qui est tombé — trois étages
 * sous la cause (PR miss-badminton#50, 13/09/2026).
 *
 * On charge donc `vitest-setup.js` POUR DE BON, dans un `globalThis` préparé
 * pour chaque cas, avec `vitest` et jest-dom remplacés par des doubles en
 * mémoire (`registerHooks`, synchrone et dans ce thread) — le socle n'a pas
 * Vitest. Et le `Storage` de référence est un VRAI, celui d'une fenêtre jsdom :
 * seul un vrai sait exposer ses clés comme propriétés nommées, ce que tout
 * l'enjeu consiste à préserver.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { JSDOM } from 'jsdom';

const NOMS = ['localStorage', 'sessionStorage'];

/**
 * Charge `vitest-setup.js` à neuf et rend la main.
 *
 * Le module a des effets de bord à l'import et les modules ESM sont mis en
 * cache par URL : la requête `?cas=` en donne une nouvelle à chaque appel, donc
 * une évaluation neuve.
 */
let cas = 0;
async function chargerVitestSetup() {
  const sources = new Map([
    ['vitest', 'export const vi = { mock: () => {} };'],
    ['@testing-library/jest-dom/vitest', 'export {};'],
  ]);
  const hooks = registerHooks({
    resolve: (spec, ctx, suite) =>
      sources.has(spec)
        ? { url: `dwc-double:${spec}`, shortCircuit: true }
        : suite(spec, ctx),
    load: (url, ctx, suite) =>
      url.startsWith('dwc-double:')
        ? {
            format: 'module',
            source: sources.get(url.slice('dwc-double:'.length)),
            shortCircuit: true,
          }
        : suite(url, ctx),
  });
  try {
    await import(`../vitest-setup.js?cas=${++cas}`);
  } finally {
    hooks.deregister();
  }
}

/** Une fenêtre jsdom jetable, dont on ne veut que le `Storage`. */
function fenetreJetable() {
  const dom = new JSDOM('', { url: 'http://localhost:3000/' });
  globalThis.jsdom = dom;
  return dom;
}

function oublierLesStockages() {
  delete globalThis.jsdom;
  for (const nom of NOMS) delete globalThis[nom];
}

test('Node 26 masque celui de jsdom : vitest-setup va le rechercher', async () => {
  // LE CAS DE LA CI. `globalThis.localStorage` ne rend rien d'utilisable, mais
  // l'environnement jsdom de Vitest a laissé son instance sur `globalThis.jsdom`.
  oublierLesStockages();
  const dom = fenetreJetable();
  try {
    await chargerVitestSetup();

    for (const nom of NOMS) {
      assert.equal(
        globalThis[nom],
        dom.window[nom],
        `${nom} n'est pas celui de la fenêtre jsdom`
      );
    }

    // Et donc, ce que le secours ne savait pas faire :
    globalThis.localStorage.setItem('mb_sonde', 'présente');
    assert.deepEqual(Object.keys(globalThis.localStorage), ['mb_sonde']);
    assert.equal(globalThis.localStorage.mb_sonde, 'présente');
    assert.deepEqual({ ...globalThis.localStorage }, { mb_sonde: 'présente' });
  } finally {
    dom.window.close();
    oublierLesStockages();
  }
});

test('un secours déjà en place ne tient pas contre le vrai', async () => {
  // LE SECOND PIÈGE. Un processus de travail sert plusieurs fichiers de test ;
  // le secours, posé en propriété de données, survit à la fermeture de la
  // fenêtre — avec les données du fichier précédent. Se contenter de le
  // trouver « fonctionnel » les ferait fuir d'un fichier au suivant.
  oublierLesStockages();
  const perime = {
    length: 1,
    key: () => 'du fichier précédent',
    getItem: () => 'du fichier précédent',
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
  };
  for (const nom of NOMS) globalThis[nom] = perime;
  const dom = fenetreJetable();
  try {
    await chargerVitestSetup();

    assert.equal(globalThis.localStorage, dom.window.localStorage);
    assert.equal(globalThis.localStorage.getItem('mb_sonde'), null);
    assert.equal(globalThis.localStorage.length, 0);
  } finally {
    dom.window.close();
    oublierLesStockages();
  }
});

test("le cas ordinaire ne pose rien : l'accesseur de Vitest reste en place", async () => {
  // Quand Vitest a fait son travail, `globalThis.localStorage` est un ACCESSEUR
  // qui rend celui de la fenêtre — et sa fermeture le retire. Le remplacer par
  // une propriété de données lui survivrait : on n'y touche donc pas.
  oublierLesStockages();
  const dom = fenetreJetable();
  for (const nom of NOMS) {
    Object.defineProperty(globalThis, nom, {
      get: () => dom.window[nom],
      configurable: true,
    });
  }
  try {
    await chargerVitestSetup();

    for (const nom of NOMS) {
      const descripteur = Object.getOwnPropertyDescriptor(globalThis, nom);
      assert.equal(
        typeof descripteur.get,
        'function',
        `l'accesseur de populateGlobal a été écrasé pour ${nom}`
      );
      assert.equal(globalThis[nom], dom.window[nom]);
    }
  } finally {
    dom.window.close();
    oublierLesStockages();
  }
});

test("sans jsdom sous la main, le secours prend le relais — et il n'est qu'une interface", async () => {
  // Le secours reste nécessaire (environnement `node`, jsdom absent) et il
  // rend le service pour lequel il a été écrit : `getItem`/`setItem` marchent.
  // Ce qu'il ne sait PAS faire est écrit ici, noir sur blanc : c'est la raison
  // pour laquelle il passe en dernier.
  oublierLesStockages();
  try {
    await chargerVitestSetup();

    const stockage = globalThis.localStorage;
    stockage.setItem('mb_sonde', 'présente');
    assert.equal(stockage.getItem('mb_sonde'), 'présente');
    assert.equal(stockage.length, 1);
    assert.equal(stockage.key(0), 'mb_sonde');
    stockage.removeItem('mb_sonde');
    assert.equal(stockage.getItem('mb_sonde'), null);

    stockage.setItem('mb_sonde', 'présente');
    assert.ok(
      !Object.keys(stockage).includes('mb_sonde'),
      'le secours serait devenu un vrai Storage — mettre à jour ce test'
    );
  } finally {
    oublierLesStockages();
  }
});
