/**
 * Options Vitest pour le **Browser Mode** (alternative à jsdom, plus fidèle).
 * Lance les tests dans un vrai navigateur via Playwright.
 *
 * Usage côté consumer :
 *   // vitest.config.ts
 *   import { defineConfig } from 'vitest/config';
 *   import react from '@vitejs/plugin-react';
 *   import { baseBrowserTestOptions } from '@mister-guiiug/dev-wpa-config/vitest-browser-base';
 *
 *   export default defineConfig({
 *     plugins: [react()],
 *     test: baseBrowserTestOptions,
 *   });
 *
 * Prérequis (dev deps consumer) :
 *   npm install -D @vitest/browser playwright
 *   npx playwright install chromium
 *
 * Convention : fichiers `*.browser.test.{ts,tsx}` pour les tests browser-mode,
 * fichiers `*.test.{ts,tsx}` pour les tests jsdom classiques (vitest-base).
 */
export const baseBrowserTestOptions = {
  globals: true,
  setupFiles: ['./src/test/setup.ts'],
  include: ['src/**/*.browser.{test,spec}.{ts,tsx}'],
  passWithNoTests: true,
  browser: {
    enabled: true,
    provider: 'playwright',
    headless: true,
    instances: [{ browser: 'chromium' }],
    screenshotFailures: false,
  },
};
