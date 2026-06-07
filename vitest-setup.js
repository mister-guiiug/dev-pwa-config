/**
 * Setup Vitest partagé pour les PWA React de la famille.
 *
 * À importer depuis le `src/test/setup.ts` du projet (chargé par `setupFiles`) :
 *   import '@mister-guiiug/dev-wpa-config/vitest-setup';
 *   // puis, si besoin, des mocks spécifiques au projet…
 *
 * Fournit :
 *  - les matchers jest-dom,
 *  - un stub `window.matchMedia` (absent de jsdom — casse `useTheme`,
 *    `prefers-reduced-motion`, les media queries…),
 *  - des mocks des modules virtuels `virtual:pwa-register` de vite-plugin-pwa
 *    (sinon l'import échoue hors build Vite).
 */
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
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
