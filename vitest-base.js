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
