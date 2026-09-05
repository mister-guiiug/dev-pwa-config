/**
 * Setup Vitest partagé pour les PWA React de la famille.
 *
 * À importer depuis le `src/test/setup.ts` du projet (chargé par `setupFiles`) :
 *   import '@mister-guiiug/dev-pwa-config/vitest-setup';
 *   // puis, si besoin, des mocks spécifiques au projet…
 *
 * Fournit :
 *  - les matchers jest-dom,
 *  - un `localStorage`/`sessionStorage` en mémoire si l'environnement n'en
 *    fournit pas de fonctionnel (sous Vitest 4 + jsdom, `localStorage` peut
 *    exister sans `getItem`/`setItem` opérationnels → tests de persistance KO),
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

// Storage en mémoire — installé UNIQUEMENT si l'env n'expose pas de Storage
// fonctionnel (no-op quand jsdom en fournit déjà un correct).
function ensureStorage(name) {
  const existing = globalThis[name];
  if (existing && typeof existing.getItem === 'function') return;
  const store = new Map();
  const storage = {
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
