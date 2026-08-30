/**
 * Helpers Vitest partagés. Les projets utilisent leur propre `vitest.config.ts`
 * mais peuvent réutiliser cette base de `test` options.
 */
import { fileURLToPath } from 'node:url';

/**
 * Chemin du double de `virtual:pwa-register`, résolu DANS le paquet installé.
 *
 * `new URL(…, import.meta.url)` plutôt que `import.meta.resolve` : la forme
 * documentée jusqu'ici demandait à l'app de résoudre un sous-chemin d'export
 * depuis SON `vitest.config.ts`, ce qui échoue sous un gestionnaire de paquets
 * qui n'aplatit pas `node_modules`, et sous les runtimes où
 * `import.meta.resolve` est asynchrone. Ici le chemin est relatif à CE
 * fichier : il est correct partout où le paquet est installé.
 */
export const PWA_REGISTER_STUB = fileURLToPath(
  new URL('./testing/pwa-register.js', import.meta.url)
);

/**
 * L'alias à poser pour que les tests puissent monter un bandeau de mise à jour.
 *
 * `virtual:pwa-register` n'existe QUE dans un build servi par vite-plugin-pwa.
 * Le `vi.mock` de `vitest-setup` ne suffit pas : il agit à l'exécution, quand
 * Vite a déjà refusé de transformer le module importateur (« Failed to resolve
 * import "virtual:pwa-register" »). Il faut un FICHIER, désigné par
 * `resolve.alias` — et dix dépôts de la famille se l'écrivaient à la main.
 *
 *   import { defineConfig } from 'vitest/config';
 *   import {
 *     baseTestOptions,
 *     pwaRegisterAlias,
 *   } from '@mister-guiiug/dev-wpa-config/vitest-base';
 *
 *   export default defineConfig({
 *     resolve: { alias: { ...pwaRegisterAlias } },
 *     test: baseTestOptions,
 *   });
 *
 * À poser dans `vitest.config.ts`, PAS dans `vite.config.ts` : un alias vu par
 * le build ferait servir le double aux navigateurs, et l'app n'enregistrerait
 * plus aucun service worker.
 *
 * `virtual:pwa-register/react` n'y est pas, et ce n'est pas un oubli. Les
 * alias Vite s'appliquent par PRÉFIXE : cette entrée capte déjà le
 * sous-chemin et le ferait pointer vers un fichier qui n'existe pas. Aucune app
 * du parc ne l'importe — toutes passent `registerSW` à `useUpdatePrompt`, la
 * forme impérative. Celle qui voudrait `useRegisterSW` devra fournir son propre
 * double, sous une entrée d'alias plus spécifique placée AVANT celle-ci.
 */
export const pwaRegisterAlias = {
  'virtual:pwa-register': PWA_REGISTER_STUB,
};

/**
 * Chemin du fichier de setup par défaut. Exporté pour permettre d'AJOUTER un
 * setup projet sans écraser celui de la base (les tableaux ne se mergent pas
 * lors d'un spread) :
 *
 *   import { baseTestOptions, DEFAULT_SETUP_FILE } from '.../vitest-base';
 *   test: {
 *     ...baseTestOptions,
 *     setupFiles: [DEFAULT_SETUP_FILE, './src/test/extra-setup.ts'],
 *   }
 */
export const DEFAULT_SETUP_FILE = './src/test/setup.ts';

export const baseTestOptions = {
  environment: 'jsdom',
  globals: true,
  setupFiles: [DEFAULT_SETUP_FILE],
  include: ['src/**/*.{test,spec}.{ts,tsx}'],
  passWithNoTests: true,
};

/**
 * Preset de couverture (provider v8 + reporters). Les *thresholds* restent au
 * projet : ce sont des planchers anti-régression à monter au fil des tests,
 * jamais à baisser pour faire passer le rouge au vert.
 *
 * Usage :
 *   import { baseTestOptions, coveragePreset } from '@mister-guiiug/dev-wpa-config/vitest-base';
 *   test: {
 *     ...baseTestOptions,
 *     coverage: {
 *       ...coveragePreset,
 *       include: ['src/domain/**'],     // scope au domaine critique
 *       thresholds: { statements: 65, branches: 80, functions: 70, lines: 65 },
 *     },
 *   }
 */
export const coveragePreset = {
  provider: 'v8',
  // `lcov` + `json-summary` permettent l'upload Codecov / le badge de couverture
  // en CI sans config supplémentaire côté projet.
  reporter: ['text', 'html', 'lcov', 'json-summary'],
  exclude: [
    '**/node_modules/**',
    '**/e2e/**',
    '**/*.config.{ts,js}',
    '**/src/test/**',
    '**/*.d.ts',
  ],
};

/**
 * Planchers de couverture **recommandés** pour le domaine critique. Ce ne sont
 * pas des valeurs imposées : à monter au fil des tests, jamais à baisser pour
 * faire passer le rouge au vert. Les apps les surchargent selon leur maturité.
 *
 *   coverage: { ...coveragePreset, thresholds: recommendedThresholds }
 */
export const recommendedThresholds = {
  statements: 60,
  branches: 75,
  functions: 65,
  lines: 60,
};
