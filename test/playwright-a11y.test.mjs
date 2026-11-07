/**
 * `playwright-a11y` — axe au-delà de l'accueil.
 *
 * Au relevé du 07/11/2026, la spec d'accessibilité de neuf apps ne visitait
 * que `/` : le gabarit n'en montrait pas plus. `expectNoA11yViolationsOn`
 * passe axe sur une liste de routes ou d'états. Ce qui est verrouillé ici, sur
 * une page et un `AxeBuilder` factices — le module n'importe ni Playwright ni
 * axe, il les reçoit :
 *   1. chaque étape est ouverte, préparée, puis auditée, DANS L'ORDRE ;
 *   2. toutes les étapes sont auditées avant de conclure, et le rapport nomme
 *      chaque écran fautif ;
 *   3. une liste vide, ou une étape qui ne mène nulle part, est refusée : un
 *      audit de zéro écran serait vert sans rien dire.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  analyzeA11yOn,
  expectNoA11yViolations,
  expectNoA11yViolationsOn,
} from '../playwright-a11y.js';

/**
 * Une page qui note ce qu'on lui fait, et un `AxeBuilder` qui rend, pour
 * l'écran courant, les violations prévues par `fautes` (chemin → ids).
 */
function banc(fautes = {}) {
  const journal = [];
  const page = {
    courant: '',
    async goto(chemin) {
      journal.push(`goto ${chemin}`);
      this.courant = chemin;
    },
  };
  class AxeBuilder {
    constructor({ page: p }) {
      this.page = p;
      this.options = {};
    }
    withTags(tags) {
      this.options.tags = tags;
      return this;
    }
    include(v) {
      this.options.include = v;
      return this;
    }
    exclude(v) {
      this.options.exclude = v;
      return this;
    }
    disableRules(v) {
      this.options.disableRules = v;
      return this;
    }
    async analyze() {
      journal.push({ axe: this.page.courant, ...this.options });
      const ids = fautes[this.page.courant] ?? [];
      return {
        violations: ids.map(id => ({
          id,
          impact: 'serious',
          help: `aide ${id}`,
          helpUrl: `https://dequeuniversity.com/rules/axe/${id}`,
          nodes: [{ target: ['#x'] }],
        })),
      };
    }
  }
  return { page, AxeBuilder, journal };
}

/** Un `expect` de Playwright réduit à ce que le module appelle. */
function expectFactice() {
  const appels = [];
  const expect = (actual, message) => ({
    toEqual(expected) {
      appels.push({ actual, message });
      assert.deepEqual(actual, expected, message);
    },
  });
  return { expect, appels };
}

test('chaque étape est ouverte, préparée puis auditée, dans l’ordre', async () => {
  const { page, AxeBuilder, journal } = banc();
  const parEtape = await analyzeA11yOn(page, AxeBuilder, [
    '/',
    '/reglages',
    {
      name: 'feuille « Ajouter »',
      path: '/',
      setup: async p => {
        journal.push('setup');
        p.courant = '/#feuille';
      },
    },
    // Sans `path` : l'état laissé par l'étape précédente, un geste de plus.
    {
      name: 'thème sombre',
      setup: () => journal.push('sombre'),
    },
  ]);
  assert.deepEqual(
    journal.map(e => (typeof e === 'string' ? e : `axe ${e.axe}`)),
    [
      'goto /',
      'axe /',
      'goto /reglages',
      'axe /reglages',
      'goto /',
      'setup',
      'axe /#feuille',
      'sombre',
      'axe /#feuille',
    ]
  );
  assert.deepEqual(
    parEtape.map(e => e.name),
    ['/', '/reglages', 'feuille « Ajouter »', 'thème sombre']
  );
});

test('`ready` attend l’écran réel après chaque navigation, avant `setup`', async () => {
  const { page, AxeBuilder, journal } = banc();
  await analyzeA11yOn(
    page,
    AxeBuilder,
    ['/', { path: '/compte', setup: () => journal.push('setup') }],
    { ready: (_p, etape) => journal.push(`prêt ${etape.name}`) }
  );
  assert.deepEqual(
    journal.filter(e => typeof e === 'string'),
    ['goto /', 'prêt /', 'goto /compte', 'prêt /compte', 'setup']
  );
});

test('les options d’une étape : include et tags remplacent, exclude et disableRules s’ajoutent', async () => {
  const { page, AxeBuilder, journal } = banc();
  await analyzeA11yOn(
    page,
    AxeBuilder,
    [
      '/',
      {
        path: '/carte',
        options: {
          include: 'main',
          exclude: '.leaflet-pane',
          disableRules: ['region'],
        },
      },
    ],
    { exclude: ['#bandeau'], disableRules: ['color-contrast'] }
  );
  const [accueil, carte] = journal.filter(e => typeof e === 'object');
  assert.deepEqual(accueil.exclude, ['#bandeau']);
  assert.deepEqual(accueil.disableRules, ['color-contrast']);
  assert.equal(accueil.include, undefined);
  assert.equal(carte.include, 'main');
  assert.deepEqual(carte.exclude, ['#bandeau', '.leaflet-pane']);
  assert.deepEqual(carte.disableRules, ['color-contrast', 'region']);
  // Les étiquettes par défaut — WCAG 2.0/2.1 A et AA — partout.
  assert.ok(carte.tags.includes('wcag21aa'));
});

test('toutes les étapes sont auditées avant de conclure, et le rapport nomme chaque écran fautif', async () => {
  const { page, AxeBuilder, journal } = banc({
    '/reglages': ['label'],
    '/historique': ['color-contrast', 'button-name'],
  });
  const { expect } = expectFactice();
  await assert.rejects(
    expectNoA11yViolationsOn(page, AxeBuilder, expect, [
      '/',
      '/reglages',
      '/historique',
    ]),
    erreur => {
      assert.match(erreur.message, /sur 2 écran\(s\) sur 3/);
      assert.match(erreur.message, /── \/reglages\n {2}\[serious\] label/);
      assert.match(erreur.message, /── \/historique\n/);
      assert.match(erreur.message, /button-name/);
      // L'accueil est propre : il n'est pas nommé.
      assert.doesNotMatch(erreur.message, /── \/\n/);
      return true;
    }
  );
  // Un échec au premier écran fautif aurait caché le troisième.
  assert.equal(journal.filter(e => typeof e === 'object').length, 3);
});

test('sans violation, l’assertion passe et rend les résultats par étape', async () => {
  const { page, AxeBuilder } = banc();
  const { expect, appels } = expectFactice();
  const parEtape = await expectNoA11yViolationsOn(page, AxeBuilder, expect, [
    '/',
    '/a-propos',
  ]);
  assert.equal(parEtape.length, 2);
  assert.deepEqual(appels[0].actual, []);
  // L'aide d'un écran reste celle d'avant, inchangée.
  const seul = await expectNoA11yViolations(page, AxeBuilder, expect);
  assert.deepEqual(seul.violations, []);
});

test('une liste vide, ou une étape qui ne mène nulle part, est refusée', async () => {
  const { page, AxeBuilder } = banc();
  await assert.rejects(analyzeA11yOn(page, AxeBuilder, []), /aucune étape/);
  await assert.rejects(
    analyzeA11yOn(page, AxeBuilder, undefined),
    /aucune étape/
  );
  await assert.rejects(
    analyzeA11yOn(page, AxeBuilder, [{ name: 'rien' }]),
    /sans path ni setup/
  );
  await assert.rejects(analyzeA11yOn(page, AxeBuilder, [42]), /invalide/);
});
