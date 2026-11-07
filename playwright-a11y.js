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
 *
 * Plusieurs écrans d'un coup — routes ou états : `expectNoA11yViolationsOn`,
 * plus bas.
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

/*
 * ── AU-DELÀ DE L'ACCUEIL ───────────────────────────────────────────────────
 *
 * Au relevé du 07/11/2026, la spec a11y de neuf apps du parc ne visitait que
 * `/` : le gabarit n'en montre pas plus, et c'est ce qui a été copié. Les
 * écrans qui portent les formulaires, les feuilles modales et les tableaux —
 * réglages, saisie, historique — n'étaient jamais passés à axe. `pwa-doctor`
 * le signale désormais (`a11y-accueil-seul`) ; ces deux fonctions sont la
 * réponse qu'il désigne.
 */

/** Une étape normalisée : son nom dans le rapport, et ce qu'il faut faire pour l'atteindre. */
function etapeDe(etape, i) {
  if (typeof etape === 'string') return { name: etape, path: etape };
  if (!etape || typeof etape !== 'object') {
    throw new TypeError(
      `playwright-a11y : étape ${i + 1} invalide — un chemin, ou { path, setup, name }`
    );
  }
  if (!etape.path && !etape.setup) {
    throw new TypeError(
      `playwright-a11y : étape ${i + 1} sans path ni setup — elle auditerait l’écran précédent une seconde fois`
    );
  }
  return { ...etape, name: etape.name ?? etape.path ?? `étape ${i + 1}` };
}

/** Une liste, quelle que soit la forme reçue par axe (`string | string[]`). */
const liste = valeur =>
  valeur === undefined ? [] : Array.isArray(valeur) ? valeur : [valeur];

/**
 * Lance axe sur une LISTE de routes ou d'états, dans l'ordre, sur la même
 * page, et rend les résultats étape par étape.
 *
 * Une étape est un chemin (`'/reglages'`, ouvert par `page.goto`) ou un objet :
 *   - `path` : le chemin à ouvrir ; absent, on reste où l'étape précédente a
 *     laissé la page ;
 *   - `setup(page)` : les gestes qui mènent à l'état à auditer — ouvrir une
 *     feuille, remplir un champ, passer en thème sombre ;
 *   - `name` : son nom dans le rapport (par défaut, le chemin) ;
 *   - `options` : les options d'axe propres à l'étape. `include` et `tags`
 *     remplacent ceux de la liste ; `exclude` et `disableRules` s'y AJOUTENT —
 *     une règle levée pour toute la liste le reste sur chaque écran.
 *
 * `options.ready(page, étape)` s'exécute après chaque navigation, avant
 * `setup` : c'est là qu'on attend l'écran réel (fin des animations, état
 * d'authentification connu), plutôt que de le répéter à chaque étape.
 *
 * Une liste vide est refusée : un audit de zéro écran serait vert, et ne
 * dirait rien.
 *
 * @param {any} page
 * @param {new (opts: { page: unknown }) => any} AxeBuilder
 * @param {Array<string | { path?: string, name?: string,
 *   setup?: (page: any) => unknown, options?: object }>} steps
 * @param {{ include?: string|string[], exclude?: string|string[],
 *   disableRules?: string[], tags?: string[],
 *   ready?: (page: any, step: { name: string, path?: string }) => unknown }} [options]
 * @returns {Promise<Array<{ name: string, path?: string, results: { violations: any[] } }>>}
 */
export async function analyzeA11yOn(page, AxeBuilder, steps, options = {}) {
  if (!Array.isArray(steps) || steps.length === 0) {
    throw new TypeError(
      'playwright-a11y : aucune étape à auditer — un audit de zéro écran serait vert sans rien dire'
    );
  }
  const { ready, ...communes } = options;
  const etapes = steps.map(etapeDe);
  const sortie = [];
  for (const etape of etapes) {
    if (etape.path) {
      await page.goto(etape.path);
      if (ready) await ready(page, etape);
    }
    if (etape.setup) await etape.setup(page);
    const propres = etape.options ?? {};
    const exclude = [...liste(communes.exclude), ...liste(propres.exclude)];
    const disableRules = [
      ...(communes.disableRules ?? []),
      ...(propres.disableRules ?? []),
    ];
    const results = await analyzeA11y(page, AxeBuilder, {
      ...communes,
      ...propres,
      ...(exclude.length ? { exclude } : {}),
      disableRules,
    });
    sortie.push({ name: etape.name, path: etape.path, results });
  }
  return sortie;
}

/**
 * Assertion : aucune violation sur AUCUNE des étapes. Toutes sont auditées
 * avant de conclure, et le rapport nomme chaque écran fautif : un échec au
 * premier écran cacherait ceux d'après, et la correction se ferait en autant
 * d'allers-retours avec la CI qu'il y a d'écrans.
 *
 *   await expectNoA11yViolationsOn(page, AxeBuilder, expect, [
 *     '/',
 *     '/reglages',
 *     { name: 'feuille « Ajouter »', path: '/', setup: p => p.getByRole('button', { name: 'Ajouter' }).click() },
 *   ]);
 *
 * @param {any} page
 * @param {new (opts: { page: unknown }) => any} AxeBuilder
 * @param {(actual: unknown, message?: string) => { toEqual(expected: unknown): void }} expect
 * @param {Parameters<typeof analyzeA11yOn>[2]} steps
 * @param {Parameters<typeof analyzeA11yOn>[3]} [options]
 */
export async function expectNoA11yViolationsOn(
  page,
  AxeBuilder,
  expect,
  steps,
  options = {}
) {
  const parEtape = await analyzeA11yOn(page, AxeBuilder, steps, options);
  const fautives = parEtape.filter(e => e.results.violations.length > 0);
  const rapport = fautives
    .map(e => `── ${e.name}\n${formatViolations(e.results.violations)}`)
    .join('\n\n');
  expect(
    fautives.map(e => ({ etape: e.name, violations: e.results.violations })),
    `Violations a11y détectées sur ${fautives.length} écran(s) sur ${parEtape.length} :\n\n${rapport}`
  ).toEqual([]);
  return parEtape;
}
