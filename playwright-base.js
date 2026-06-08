/**
 * Options Playwright communes (à étendre dans playwright.config.ts du projet).
 *
 * Deux niveaux d'API :
 *
 * 1. `basePlaywrightOptions` — l'objet bas niveau historique (à spread).
 *    Conservé pour rétro-compat ; préférer la factory ci-dessous.
 *
 * 2. `definePwaPlaywrightConfig(...)` — la factory recommandée. Tous les
 *    projets de la famille réécrivaient les mêmes ~50 lignes (matrice 5
 *    navigateurs, reporters multi-format, snapshots par plateforme,
 *    reducedMotion, webServer). La factory centralise tout ça.
 *
 *    Le paquet n'importe PAS `@playwright/test` (peerDep optionnelle), donc
 *    le consommateur passe son propre `devices` à la factory :
 *
 *      import { defineConfig, devices } from '@playwright/test';
 *      import { definePwaPlaywrightConfig } from '@mister-guiiug/dev-wpa-config/playwright-base';
 *
 *      export default defineConfig(definePwaPlaywrightConfig({ devices }));
 *
 *    Personnalisation courante :
 *      definePwaPlaywrightConfig({
 *        devices,
 *        port: 5173,                 // dev server
 *        testMatch: /.*\.spec\.ts$/, // au lieu du défaut .test/.spec
 *        extraProjects: [...],       // navigateurs additionnels
 *      })
 */

/** Matrice 5 navigateurs famille (desktop + mobile). `devices` vient de `@playwright/test`. */
export function pwaProjects(devices) {
  return [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 5'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 12'] } },
  ];
}

/** Reporters multi-format : HTML + JSON + JUnit + list (+ github en CI). */
export function pwaReporters() {
  return [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
    ...(process.env.CI ? [['github']] : []),
  ];
}

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

/**
 * Construit une config Playwright PWA complète, prête à passer à `defineConfig`.
 *
 * @param {object} opts
 * @param {Record<string, any>} opts.devices  L'objet `devices` de `@playwright/test`.
 * @param {number}  [opts.port=5173]            Port du dev server.
 * @param {boolean} [opts.preview=false]        Tester un build de PROD (`build` +
 *   `preview`) plutôt que `dev` : service worker réel, minification, cache —
 *   le comportement PWA qu'on veut justement valider. Nécessite un script
 *   `preview` côté projet. Force `reuseExistingServer: false`.
 * @param {string}  [opts.command]              Commande du webServer (sinon
 *   déduite de `preview` : `npm run dev` ou build+preview).
 * @param {RegExp|string} [opts.testMatch]      Filtre de fichiers (défaut Playwright si omis).
 * @param {number}  [opts.expectTimeout=10000]  Timeout des assertions.
 * @param {number}  [opts.localWorkers=4]       Workers en local (toujours 1 en CI).
 * @param {number}  [opts.localRetries=1]       Retries en local (toujours 2 en CI).
 * @param {Array}   [opts.extraProjects=[]]     Projets navigateurs additionnels.
 * @param {boolean} [opts.reducedMotion=true]   Force `prefers-reduced-motion` (snapshots stables).
 * @param {object}  [opts.overrides={}]         Surcharge finale (mergée en dernier).
 */
export function definePwaPlaywrightConfig({
  devices,
  port = 5173,
  preview = false,
  command,
  testMatch,
  expectTimeout = 10_000,
  localWorkers = 4,
  localRetries = 1,
  extraProjects = [],
  reducedMotion = true,
  overrides = {},
} = {}) {
  if (!devices) {
    throw new Error(
      "definePwaPlaywrightConfig: passez `devices` depuis '@playwright/test' " +
        '(ex. `definePwaPlaywrightConfig({ devices })`).'
    );
  }
  const baseURL = `http://localhost:${port}`;
  // En mode preview : build de prod puis `vite preview` sur le même port (SW,
  // minification, cache réels). Sinon dev server (HMR, pas de SW).
  const webServerCommand =
    command ??
    (preview
      ? `npm run build && npm run preview -- --port ${port} --strictPort`
      : 'npm run dev');
  const config = {
    testDir: './e2e',
    ...(testMatch ? { testMatch } : {}),
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    workers: process.env.CI ? 1 : localWorkers,
    retries: process.env.CI ? 2 : localRetries,
    reporter: pwaReporters(),
    use: {
      baseURL,
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
      video: 'retain-on-failure',
      ...(reducedMotion ? { contextOptions: { reducedMotion: 'reduce' } } : {}),
    },
    expect: { timeout: expectTimeout },
    timeout: 30_000,
    projects: [...pwaProjects(devices), ...extraProjects],
    webServer: {
      command: webServerCommand,
      url: baseURL,
      // En preview, ne pas réutiliser un dev server déjà lancé (servirait du
      // non-buildé) : on veut un build frais.
      reuseExistingServer: !process.env.CI && !preview,
      timeout: 120_000,
    },
    snapshotDir: 'e2e/__snapshots__',
    // `{projectName}` est indispensable avec la matrice multi-navigateurs :
    // sans lui, chromium/firefox/webkit/mobile-* écrasent le même snapshot
    // (différencié par OS seulement) → diffs visuels faux.
    snapshotPathTemplate:
      '{snapshotDir}/{testFileDir}/{testFileName}-{projectName}-{platform}{ext}',
  };
  return { ...config, ...overrides };
}
