/**
 * Helpers d'accessibilité Playwright + axe-core, partagés.
 *
 * Le paquet n'importe PAS `@axe-core/playwright` (peer optionnelle) : le
 * consommateur passe la classe `AxeBuilder` (et `expect`) aux helpers.
 *
 * Usage (e2e/a11y.spec.ts) :
 *   import { test, expect } from '@playwright/test';
 *   import AxeBuilder from '@axe-core/playwright';
 *   import { expectNoA11yViolations } from '@mister-guiiug/dev-pwa-config/playwright-a11y';
 *
 *   test('accueil sans violation WCAG A/AA', async ({ page }) => {
 *     await page.goto('/');
 *     await expectNoA11yViolations(page, AxeBuilder, expect);
 *   });
 */
const DEFAULT_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

/**
 * Lance un scan axe-core sur la page et renvoie les résultats bruts.
 *
 * @param {unknown} page                              Page Playwright.
 * @param {new (opts: { page: unknown }) => any} AxeBuilder  Classe `@axe-core/playwright`.
 * @param {{ include?: string|string[], exclude?: string|string[],
 *   disableRules?: string[], tags?: string[] }} [options]
 */
export async function analyzeA11y(page, AxeBuilder, options = {}) {
  const { include, exclude, disableRules = [], tags = DEFAULT_TAGS } = options;
  let builder = new AxeBuilder({ page }).withTags(tags);
  if (include) builder = builder.include(include);
  if (exclude) builder = builder.exclude(exclude);
  if (disableRules.length) builder = builder.disableRules(disableRules);
  return builder.analyze();
}

/** Message lisible (sélecteurs + lien d'aide) à partir des violations axe. */
export function formatViolations(violations) {
  if (!violations.length) return 'Aucune violation a11y.';
  return violations
    .map(v => {
      const nodes = v.nodes
        .map(n => `      - ${n.target.join(' ')}`)
        .join('\n');
      return `  [${v.impact ?? 'n/a'}] ${v.id} — ${v.help}\n${nodes}\n    ${v.helpUrl}`;
    })
    .join('\n\n');
}

/**
 * Assertion : aucune violation a11y. Échoue avec un rapport lisible sinon.
 *
 * @param {unknown} page
 * @param {new (opts: { page: unknown }) => any} AxeBuilder
 * @param {(actual: unknown, message?: string) => { toEqual(expected: unknown): void }} expect
 * @param {object} [options]  Voir `analyzeA11y`.
 */
export async function expectNoA11yViolations(
  page,
  AxeBuilder,
  expect,
  options = {}
) {
  const results = await analyzeA11y(page, AxeBuilder, options);
  expect(
    results.violations,
    `Violations a11y détectées :\n${formatViolations(results.violations)}`
  ).toEqual([]);
  return results;
}
