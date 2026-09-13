/**
 * Setup Vitest partagé pour les PWA React de la famille.
 *
 * À importer depuis le `src/test/setup.ts` du projet (chargé par `setupFiles`) :
 *   import '@mister-guiiug/dev-pwa-config/vitest-setup';
 *   // puis, si besoin, des mocks spécifiques au projet…
 *
 * Fournit :
 *  - les matchers jest-dom,
 *  - le `localStorage`/`sessionStorage` de jsdom même quand Vitest ne l'a pas
 *    recopié sur `globalThis` (Node 26 l'y masque), et un secours en mémoire
 *    quand il n'y a aucun jsdom sous la main — voir `ensureStorage`,
 *  - un stub `window.matchMedia` (absent de jsdom — casse `useTheme`,
 *    `prefers-reduced-motion`, les media queries…),
 *  - un mock de `virtual:pwa-register/react` (`useRegisterSW`), le seul des deux
 *    modules virtuels de vite-plugin-pwa qui se mocke utilement ici.
 *
 * IL N'Y A PAS DE MOCK DE `virtual:pwa-register`, ET C'EST DÉLIBÉRÉ. Il y en a
 * eu un, muet, pendant longtemps ; il ne pouvait pas rendre le service qu'on
 * lui prêtait, et il en détruisait un autre.
 *
 * Il ne pouvait pas aider, parce que `vi.mock` agit à l'EXÉCUTION : un module
 * source qui écrit `import { registerSW } from 'virtual:pwa-register'` est
 * refusé bien avant, à la TRANSFORMATION (« Failed to resolve import
 * "virtual:pwa-register" »), ce module virtuel n'existant que dans un build
 * servi par vite-plugin-pwa. Un mock ne rattrape jamais ça — il faut un
 * FICHIER, désigné par `resolve.alias` dans `vitest.config.ts` :
 *
 *   import { pwaRegisterAlias } from '@mister-guiiug/dev-pwa-config/vitest-base';
 *   resolve: { alias: { ...pwaRegisterAlias } }
 *
 * Et il détruisait, parce qu'une fois cet alias posé le spécificateur
 * `virtual:pwa-register` désigne le FICHIER `testing/pwa-register` : le mock se
 * résolvait à travers l'alias, tombait sur le double pilotable et l'écrasait
 * (« No "swStub" export is defined on the "virtual:pwa-register" mock »).
 * Suivre la documentation rendait donc le double inutilisable, et l'app
 * retombait sur le faux témoin muet que ce double existe pour supprimer.
 *
 * `test/pwa-register-stub.test.mjs` verrouille cette absence : aucun mock d'ici
 * ne doit porter sur un spécificateur capté par `pwaRegisterAlias`.
 */
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

/** Pose `storage` sous ce nom, sur `globalThis` et sur `window` s'il existe. */
function installStorage(name, storage) {
  Object.defineProperty(globalThis, name, {
    value: storage,
    writable: true,
    configurable: true,
  });
  if (typeof window !== 'undefined') {
    try {
      Object.defineProperty(window, name, {
        value: storage,
        writable: true,
        configurable: true,
      });
    } catch {
      /* window[name] non redéfinissable : globalThis suffit */
    }
  }
}

/**
 * Le secours : l'INTERFACE `Storage`, adossée à une `Map`.
 *
 * Ce n'est pas un `Storage` — un vrai expose aussi ses clés comme propriétés
 * nommées (`storage.maClé`, `Object.keys(storage)`, `{ ...storage }`). Il ne
 * sert que là où aucun vrai n'est à portée, et `ensureStorage` le garde en
 * dernier recours pour cette raison.
 */
function createMemoryStorage() {
  const store = new Map();
  return {
    get length() {
      return store.size;
    },
    key: i => Array.from(store.keys())[i] ?? null,
    getItem: k => (store.has(String(k)) ? store.get(String(k)) : null),
    setItem: (k, v) => {
      store.set(String(k), String(v));
    },
    removeItem: k => {
      store.delete(String(k));
    },
    clear: () => {
      store.clear();
    },
  };
}

/*
 * `localStorage` / `sessionStorage` — CELUI DE JSDOM D'ABORD, le secours ensuite.
 *
 * L'ordre compte, et il a coûté une CI rouge pendant trois commits.
 *
 * **Node 26 pose lui-même ces deux noms sur `globalThis`.** Sans
 * `--localstorage-file`, `localStorage` se contente d'avertir
 * (« ExperimentalWarning: localStorage is not available because
 * --localstorage-file was not provided. », visible dans le journal de CI, une
 * fois par processus de travail) et rend `undefined` — mais la PROPRIÉTÉ
 * existe. Or `populateGlobal` de Vitest ne recopie une clé de la fenêtre jsdom
 * que si elle n'est pas déjà sur `globalThis` (`if (k in global) return
 * keysArray.includes(k)`), et ni `localStorage` ni `sessionStorage` ne
 * figurent dans sa liste d'exceptions. **Depuis Node 26, le vrai `Storage` de
 * jsdom n'arrive donc plus jusqu'aux tests.**
 *
 * Le secours en mémoire prenait le relais, et c'est là que ça fait mal : il
 * honore l'interface, pas l'objet exotique. `Object.keys(localStorage)` rend
 * `['length','key','getItem','setItem','removeItem','clear']` au lieu des clés
 * stockées. Rien ne lève, rien ne prévient : toute la suite se met à éprouver
 * une `Map` au lieu du stockage du navigateur. Mesuré le 13/09/2026 sur
 * `miss-badminton`, seul dépôt dont un test lisait ses clés autrement que par
 * `getItem` — il est tombé trois étages sous la cause, et les vingt autres
 * n'ont rien vu.
 *
 * Le vrai n'est pourtant jamais loin : l'environnement jsdom de Vitest laisse
 * son instance sur `globalThis.jsdom` (et la retire à la fermeture). On la
 * préfère à tout le reste — **y compris à un secours déjà en place**, qui,
 * dans un processus de travail réutilisé d'un fichier de test au suivant,
 * traînerait les données du fichier précédent.
 */
function ensureStorage(name) {
  const real = globalThis.jsdom?.window?.[name];
  if (real && typeof real.getItem === 'function') {
    // Cas ordinaire (jsdom recopié par Vitest) : c'est déjà lui, on ne pose
    // rien — l'accesseur de `populateGlobal` reste en place et sa fermeture
    // le retirera.
    if (globalThis[name] !== real) installStorage(name, real);
    return;
  }
  const existing = globalThis[name];
  if (existing && typeof existing.getItem === 'function') return;
  installStorage(name, createMemoryStorage());
}

ensureStorage('localStorage');
ensureStorage('sessionStorage');

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = query => ({
    matches: false,
    media: query,
    onchange: null,
    // `addListener`/`removeListener` (dépréciés) conservés : certaines libs les
    // appellent encore. Le code famille utilise `addEventListener`.
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// Stubs des API jsdom manquantes les plus fréquentes côté PWA (animations,
// listes paresseuses, Rive). Installés seulement si absents.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = NoopObserver;
}

/*
 * `AnimationEvent` — RETIRÉ par jsdom 30, et sa disparition est SILENCIEUSE.
 *
 * jsdom 30 n'expose plus ce constructeur (`TransitionEvent`, lui, est resté).
 * React choisit le nom de l'événement d'animation d'après sa présence : sans
 * lui, il écoute la variante préfixée (`webkitAnimationEnd`) et n'entend jamais
 * `animationend`. Conséquence mesurée le 12/09/2026 en montant `mister-miss-koh`
 * de jsdom 26 à 30 : `fireEvent.animationEnd(bouton)` continue d'atteindre un
 * `addEventListener` natif — ce qui brouille la piste — mais `onAnimationEnd`
 * ne se déclenche plus. Rien ne lève ; le test échoue sur l'assertion suivante,
 * très loin de la cause.
 *
 * Un seul dépôt en dépendait ce jour-là, parce qu'un seul teste une animation.
 * Le trou attendait tous les autres.
 */
if (typeof globalThis.AnimationEvent === 'undefined') {
  class AnimationEvent extends Event {
    constructor(type, init = {}) {
      super(type, init);
      this.animationName = init.animationName ?? '';
      this.elapsedTime = init.elapsedTime ?? 0;
      this.pseudoElement = init.pseudoElement ?? '';
    }
  }
  globalThis.AnimationEvent = AnimationEvent;
  if (typeof window !== 'undefined') window.AnimationEvent = AnimationEvent;
}
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = NoopObserver;
}
if (typeof window !== 'undefined' && typeof window.scrollTo !== 'function') {
  window.scrollTo = () => {};
}
if (
  typeof globalThis.crypto === 'undefined' ||
  typeof globalThis.crypto.randomUUID !== 'function'
) {
  const base = globalThis.crypto ?? {};
  let seed = 0;
  base.randomUUID = () =>
    `00000000-0000-4000-8000-${String(++seed).padStart(12, '0')}`;
  Object.defineProperty(globalThis, 'crypto', {
    value: base,
    writable: true,
    configurable: true,
  });
}

/*
 * `virtual:pwa-register/react`, lui, se mocke sans dommage. `pwaRegisterAlias`
 * le capte pourtant aussi — les alias Vite en forme de chaîne remplacent un
 * PRÉFIXE — mais le mène à un sous-chemin du double qui n'existe pas : il
 * n'écrase donc rien. C'est là toute la différence entre les deux, et c'est la
 * règle que verrouille `test/pwa-register-stub.test.mjs`.
 *
 * Aucune app du parc n'importe `useRegisterSW` ; toutes passent `registerSW` à
 * `useUpdatePrompt`. Celle qui voudrait le piloter devra fournir son propre
 * double, sous une entrée d'alias plus spécifique placée AVANT celle-ci.
 */
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: () => Promise.resolve(),
  }),
}));
