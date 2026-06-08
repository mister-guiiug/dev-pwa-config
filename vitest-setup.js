/**
 * Setup Vitest partagé pour les PWA React de la famille.
 *
 * À importer depuis le `src/test/setup.ts` du projet (chargé par `setupFiles`) :
 *   import '@mister-guiiug/dev-wpa-config/vitest-setup';
 *   // puis, si besoin, des mocks spécifiques au projet…
 *
 * Fournit :
 *  - les matchers jest-dom,
 *  - un `localStorage`/`sessionStorage` en mémoire si l'environnement n'en
 *    fournit pas de fonctionnel (sous Vitest 4 + jsdom, `localStorage` peut
 *    exister sans `getItem`/`setItem` opérationnels → tests de persistance KO),
 *  - un stub `window.matchMedia` (absent de jsdom — casse `useTheme`,
 *    `prefers-reduced-motion`, les media queries…),
 *  - des mocks des modules virtuels `virtual:pwa-register` de vite-plugin-pwa
 *    (sinon l'import échoue hors build Vite).
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

vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({
    needRefresh: [false, () => {}],
    offlineReady: [false, () => {}],
    updateServiceWorker: () => Promise.resolve(),
  }),
}));

vi.mock('virtual:pwa-register', () => ({
  registerSW: () => () => {},
}));
