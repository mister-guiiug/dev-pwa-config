/**
 * `virtual:pwa-register`, avec un corps — et pilotable.
 *
 * PROMU, PAS INVENTÉ, ET C'EST LE PLUS GROS DOUBLON DU PARC. Douze dépôts
 * portent ce fichier écrit à la main (`src/test/pwa-register-stub.ts`,
 * `stub-pwa-register.ts`, `pwa-mock.ts` — trois noms pour la même chose) et les
 * douze `resolve.alias` qui vont avec : bac-sable, miss-carbook, miss-dice,
 * miss-genius, miss-supaboss, miss-uwh, mister-doc, mister-family-map,
 * mister-footcoach, mister-molkky, mister-puzzle, mister-qowa.
 *
 * POURQUOI L'ALIAS, alors que `vitest-setup` pose déjà un
 * `vi.mock('virtual:pwa-register')`. Parce que le mock agit à L'EXÉCUTION,
 * quand Vite a déjà refusé de transformer le module importateur : le module
 * virtuel n'existe que dans un build servi par vite-plugin-pwa, et hors de là
 * il est irrésolvable. Le test échoue à la résolution, avant d'avoir rien
 * éprouvé. Il faut donc un FICHIER, désigné par `resolve.alias`.
 *
 * CE QUE LES DOUZE COPIES RATENT TOUTES : elles sont MUETTES. Un
 * `registerSW` qui n'appelle jamais `onNeedRefresh` prouve qu'un composant se
 * monte, jamais qu'un bandeau peut s'afficher — et c'est exactement le trou par
 * lequel une app de la famille a vécu des mois avec une bannière montée mais
 * structurellement incapable d'apparaître, faute de `registerSW` injecté. Les
 * huit tests de bannière écrits le 30/08/2026 ont donc tous dû REFABRIQUER un
 * double pilotable par-dessus le double muet, de quatre façons différentes
 * (`vi.doMock` + `resetModules`, `vi.hoisted` + accesseur, `let` de module +
 * accesseur, `vi.mock` capturant les options).
 *
 * Ici, le double est pilotable d'emblée : `swStub.needRefresh()` rejoue ce que
 * fait un vrai service worker quand une version attend.
 *
 * LE PIÈGE DU REPORT ENTRE DEUX TESTS. `useUpdatePrompt` mémorise sa connexion
 * PAR IDENTITÉ de la fonction `registerSW` (une `WeakMap`, pour ne pas doubler
 * les écouteurs sous `StrictMode`). Un double unique et partagé garde donc
 * `needRefresh` à vrai d'un test au suivant. `swStub.reset()` répond à ça en
 * remplaçant `registerSW` par une fonction NEUVE : l'export étant une liaison
 * vivante ESM, l'app qui a fait `import { registerSW } from
 * 'virtual:pwa-register'` voit la nouvelle. À appeler dans un `beforeEach`.
 *
 * Une app qui enrobe `registerSW` dans une constante de MODULE (pour ajouter
 * une journalisation ou un intervalle) garde, elle, une identité stable que
 * `reset()` ne peut pas renouveler : c'est le cas où il faut un
 * `vi.resetModules()`, ou un second fichier de test.
 *
 * Pose, côté app :
 *
 *   // vitest.config.ts
 *   resolve: {
 *     alias: {
 *       'virtual:pwa-register': fileURLToPath(
 *         import.meta.resolve('@mister-guiiug/dev-wpa-config/testing/pwa-register')
 *       ),
 *     },
 *   }
 *
 *   // le test
 *   import { swStub } from '@mister-guiiug/dev-wpa-config/testing/pwa-register';
 *   beforeEach(() => swStub.reset());
 *   act(() => swStub.needRefresh());
 */

/** Ce que le dernier appel à `registerSW` a reçu, et ce qu'il a rendu. */
const state = {
  calls: 0,
  /** @type {object|undefined} */
  options: undefined,
  /** @type {(boolean|undefined)[]} */
  reloads: [],
};

function makeRegisterSW() {
  return function registerSW(options = {}) {
    state.calls += 1;
    state.options = options;
    return reloadPage => {
      state.reloads.push(reloadPage);
      return Promise.resolve();
    };
  };
}

/**
 * Le `registerSW` du module virtuel.
 *
 * `let`, et non `const` : `swStub.reset()` le remplace par une fonction neuve,
 * et la liaison vivante d'ESM propage l'identité nouvelle aux importateurs.
 */
export let registerSW = makeRegisterSW();

/** Le rappel demandé, ou une erreur qui dit lequel des deux câblages manque. */
function callback(name) {
  if (state.calls === 0) {
    throw new Error(
      `swStub.${name}() : registerSW n'a jamais été appelé. Personne ne l'a ` +
        'injecté — prop `registerSW` de UpdatePromptBanner / AppUpdates, ou ' +
        'option de useUpdatePrompt. Sans elle, le bandeau ne peut pas ' +
        "s'afficher, quoi qu'il arrive."
    );
  }
  const fn = state.options?.[name];
  if (typeof fn !== 'function') {
    throw new Error(
      `swStub.${name}() : registerSW a été appelé sans \`${name}\`.`
    );
  }
  return fn;
}

/**
 * La télécommande du service worker, côté test.
 *
 * Les quatre déclencheurs LÈVENT quand le rappel correspondant n'a pas été
 * posé, au lieu de ne rien faire : le silence est précisément le symptôme
 * qu'on cherche à rendre impossible.
 */
export const swStub = {
  /** Nombre d'appels à `registerSW` depuis le dernier `reset()`. */
  get calls() {
    return state.calls;
  },
  /** Vrai dès que quelqu'un a injecté `registerSW`. */
  get registered() {
    return state.calls > 0;
  },
  /** Les options du dernier enregistrement (pour une assertion fine). */
  get options() {
    return state.options;
  },
  /** Les `reloadPage` passés à l'`updateSW` rendu par `registerSW`. */
  get reloads() {
    return state.reloads;
  },

  /** Une nouvelle version attend : c'est ce qui fait apparaître le bandeau. */
  needRefresh() {
    callback('onNeedRefresh')();
  },
  /** La coquille est en cache : l'app fonctionne hors ligne. */
  offlineReady() {
    callback('onOfflineReady')();
  },
  /** L'enregistrement a échoué (réseau, portée, MIME du `sw.js`…). */
  registerError(error = new Error('service worker injoignable')) {
    callback('onRegisterError')(error);
  },
  /** Le service worker est enregistré ; `registration` sert au réexamen. */
  registeredSW(swUrl = '/sw.js', registration = undefined) {
    callback('onRegisteredSW')(swUrl, registration);
  },

  /**
   * État vierge ET identité neuve pour `registerSW`. Sans le second, le report
   * du test précédent survivrait au suivant (`WeakMap` de `useUpdatePrompt`).
   */
  reset() {
    state.calls = 0;
    state.options = undefined;
    state.reloads.length = 0;
    registerSW = makeRegisterSW();
  },
};
