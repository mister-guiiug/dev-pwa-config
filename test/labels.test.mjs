/**
 * Le dictionnaire des composants — trois niveaux de résolution, et la parité.
 *
 * Onze libellés étaient codés en dur en français dans six composants. Tous
 * étaient surchargeables par prop, mais aucun pont n'existait avec `createI18n`,
 * que huit apps utilisent : chacune recâblait les mêmes chaînes à la main.
 *
 * Ce qui est verrouillé ici :
 *   1. la PROP l'emporte, puis le CONTEXTE, puis le FRANÇAIS ;
 *   2. une app qui ne fait rien obtient exactement ce qu'elle avait avant ;
 *   3. `fr` et `en` ont rigoureusement les mêmes clés — une clé absente, c'est
 *      un bouton sans nom accessible.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { readFileSync } from 'node:fs';

import { setupDom, mount } from './helpers/dom.mjs';
import {
  LABELS,
  DEFAULT_LOCALE,
  LabelsProvider,
  mergeLabels,
  useLabels,
} from '../react/labels.js';
import { plural } from '../react/i18n-core.js';
import { ErrorBanner } from '../react/error-banner.js';
import { AppFooter } from '../react/app-footer.js';

/** Chemins « groupe.clé » d'un dictionnaire de locale. */
const paths = dictionary =>
  Object.entries(dictionary)
    .flatMap(([group, entries]) =>
      Object.keys(entries).map(key => `${group}.${key}`)
    )
    .sort();

test('français et anglais portent exactement les mêmes clés', () => {
  assert.deepEqual(paths(LABELS.en), paths(LABELS.fr));
  // Et aucune valeur vide : une chaîne vide passerait la comparaison de clés
  // tout en laissant un bouton muet.
  for (const [locale, dictionary] of Object.entries(LABELS)) {
    for (const [group, entries] of Object.entries(dictionary)) {
      for (const [key, value] of Object.entries(entries)) {
        assert.ok(
          typeof value === 'string' && value.trim().length > 0,
          `${locale}.${group}.${key} est vide`
        );
      }
    }
  }
});

test('le repli est le français, y compris pour une locale inconnue', async () => {
  const dom = setupDom();
  try {
    // Hors provider : c'est le cas des seize apps le jour de la publication.
    const nu = await mount(h(ErrorBanner, { message: 'Zut', onRetry() {} }));
    assert.match(nu.container.innerHTML, />Réessayer</);
    await nu.unmount();

    const inconnu = await mount(
      h(
        LabelsProvider,
        { locale: 'kl' },
        h(ErrorBanner, { message: 'Zut', onRetry() {} })
      )
    );
    assert.match(inconnu.container.innerHTML, />Réessayer</);
    await inconnu.unmount();
  } finally {
    dom.restore();
  }
  assert.equal(DEFAULT_LOCALE, 'fr');
});

test('les trois niveaux se classent : prop > contexte > défaut', async () => {
  const dom = setupDom();
  try {
    const anglais = await mount(
      h(
        LabelsProvider,
        { locale: 'en' },
        h(ErrorBanner, { message: 'Oops', onRetry() {} })
      )
    );
    assert.match(anglais.container.innerHTML, />Try again</);
    await anglais.unmount();

    const prop = await mount(
      h(
        LabelsProvider,
        { locale: 'en' },
        h(ErrorBanner, {
          message: 'Oops',
          onRetry() {},
          retryLabel: 'Encore',
        })
      )
    );
    assert.match(prop.container.innerHTML, />Encore</);
    await prop.unmount();
  } finally {
    dom.restore();
  }
});

test('les surcharges changent un mot sans changer de langue', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(
        LabelsProvider,
        { locale: 'fr', overrides: { error: { retry: 'Recommencer' } } },
        h(ErrorBanner, { message: 'Zut', onRetry() {}, onDismiss() {} })
      )
    );
    assert.match(view.container.innerHTML, />Recommencer</);
    // Le reste du groupe n'est pas emporté par la surcharge.
    assert.match(view.container.innerHTML, /aria-label="Fermer"/);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('mergeLabels fusionne groupe par groupe, sans écraser le reste', () => {
  const fusion = mergeLabels(LABELS.fr, {
    sheet: { close: 'Retour' },
    perso: { a: 'b' },
  });
  assert.equal(fusion.sheet.close, 'Retour');
  assert.equal(fusion.confirm.cancel, LABELS.fr.confirm.cancel);
  assert.equal(fusion.perso.a, 'b');
  // La source n'est pas modifiée : le dictionnaire est partagé par tout l'arbre.
  assert.equal(LABELS.fr.sheet.close, 'Fermer');
});

test('un composant à plusieurs libellés bascule en bloc', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(
        LabelsProvider,
        { locale: 'en' },
        h(AppFooter, {
          repoUrl: 'https://github.com/x/y',
          sponsorUrl: 'https://github.com/sponsors/x',
        })
      )
    );
    assert.match(view.container.innerHTML, />Source code</);
    assert.match(view.container.innerHTML, />Buy me a coffee</);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('useLabels rend un objet vide pour un groupe inconnu, jamais undefined', async () => {
  const dom = setupDom();
  try {
    let vu;
    function Sonde() {
      vu = useLabels('groupe-qui-n-existe-pas');
      return null;
    }
    const view = await mount(h(Sonde));
    assert.deepEqual(vu, {});
    await view.unmount();
  } finally {
    dom.restore();
  }
});

/* ── plural ─────────────────────────────────────────────────────────────── */

test('plural accorde selon la LANGUE, pas selon un ternaire', () => {
  const formes = { one: '{count} élément', other: '{count} éléments' };
  // Le ternaire `n > 1` des apps donne « 0 éléments » en français : faux.
  assert.equal(plural(0, formes, 'fr'), '0 élément');
  assert.equal(plural(1, formes, 'fr'), '1 élément');
  assert.equal(plural(2, formes, 'fr'), '2 éléments');

  const english = { one: '{count} item', other: '{count} items' };
  assert.equal(plural(0, english, 'en'), '0 items');
  assert.equal(plural(1, english, 'en'), '1 item');
});

test('plural honore une forme zero même là où la langue n’en a pas', () => {
  const formes = {
    zero: 'Aucun élément',
    one: '{count} élément',
    other: '{count} éléments',
  };
  assert.equal(plural(0, formes, 'fr'), 'Aucun élément');
  assert.equal(plural(1, formes, 'fr'), '1 élément');
});

test('plural interpole les autres paramètres et encaisse l’invalide', () => {
  assert.equal(
    plural(
      3,
      { one: '{count} sur {total}', other: '{count} sur {total}' },
      'fr',
      {
        total: 9,
      }
    ),
    '3 sur 9'
  );
  assert.equal(plural(Number.NaN, { other: 'x' }), '');
  // Locale inconnue : on retombe sur `other` au lieu de lever.
  assert.equal(plural(2, { one: 'a', other: 'b' }, 'zz-ZZ'), 'b');
});

test('le dictionnaire est exporté et publié', () => {
  const pkg = JSON.parse(
    readFileSync(new URL('../package.json', import.meta.url), 'utf8')
  );
  assert.deepEqual(pkg.exports['./react/labels'], {
    types: './react/labels.d.ts',
    default: './react/labels.js',
  });
});
