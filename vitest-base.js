/**
 * Helpers Vitest partagés. Les projets utilisent leur propre `vitest.config.ts`
 * mais peuvent réutiliser cette base de `test` options.
 */
export const baseTestOptions = {
  environment: 'jsdom',
  globals: true,
  setupFiles: ['./src/test/setup.ts'],
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
