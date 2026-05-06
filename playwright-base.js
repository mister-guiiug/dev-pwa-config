/**
 * Options Playwright communes (à étendre dans playwright.config.ts du projet).
 *
 * Usage :
 *   import { defineConfig, devices } from '@playwright/test';
 *   import { basePlaywrightOptions } from '@mister-guiiug/dev-wpa-config/playwright-base';
 *
 *   export default defineConfig({
 *     ...basePlaywrightOptions,
 *     webServer: { command: 'npm run dev', url: 'http://localhost:5173' },
 *     projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
 *   });
 */
export const basePlaywrightOptions = {
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'on-failure' }], ['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  expect: {
    timeout: 5_000,
  },
  timeout: 30_000,
};
