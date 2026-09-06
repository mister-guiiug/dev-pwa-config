// `definePwaPlaywrightConfig` — la fabrique de configuration Playwright.
//
// Le seul comportement qui a coûté quelque chose : `overrides` remplaçait la
// clé `use` entière au lieu de la compléter. Le squelette fixait sa locale par
// là, perdait `baseURL`, et `page.goto('/')` échouait sur « Cannot navigate to
// invalid URL » — un message qui parle du symptôme, jamais de la cause.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { definePwaPlaywrightConfig } from '../playwright-base.js';

/** Un `devices` de fantaisie : la fabrique n'en lit que cinq entrées. */
const devices = Object.fromEntries(
  [
    'Desktop Chrome',
    'Desktop Firefox',
    'Desktop Safari',
    'Pixel 5',
    'iPhone 12',
  ].map(name => [name, { browserName: name }])
);

test('overrides.use COMPLÈTE le use calculé, sans effacer baseURL', () => {
  const config = definePwaPlaywrightConfig({
    devices,
    port: 4173,
    overrides: { use: { locale: 'fr-FR' } },
  });
  assert.equal(config.use.baseURL, 'http://localhost:4173');
  assert.equal(config.use.locale, 'fr-FR');
});

test('les autres clés de overrides remplacent, comme une surcharge finale', () => {
  const config = definePwaPlaywrightConfig({
    devices,
    overrides: { retries: 7, snapshotDir: 'ailleurs' },
  });
  assert.equal(config.retries, 7);
  assert.equal(config.snapshotDir, 'ailleurs');
  assert.ok(config.use.baseURL, 'le use par défaut est intact');
});

test('sans devices, une erreur qui dit quoi passer', () => {
  assert.throws(() => definePwaPlaywrightConfig(), /passez `devices`/);
});
