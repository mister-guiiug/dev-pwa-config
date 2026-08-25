/**
 * Le pont entre la langue choisie et le formatage.
 *
 * CE QUE CES TESTS PROTÈGENT. Mesure sur les seize apps : 78 sites de
 * formatage à locale figée (27 `Intl.*('xx-XX', …)`, 51 `toLocale*('fr-FR')`).
 * La cause n'était pas la négligence : le contexte de `createI18n` ne rendait
 * aucun formateur, donc chaque écran devait nommer une locale lui-même. Ce
 * fichier vérifie que `fmt` suit `setLocale`, sans qu'aucun appel ne la nomme.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import {
  createFormatters,
  formatList,
  formatNumber,
  getDefaultLocale,
  setDefaultLocale,
} from '../format.js';
import { createI18n, directionOf } from '../react/i18n.js';
import { mount, setupDom } from './helpers/dom.mjs';

test('la locale par défaut est déplaçable, et le formatage suit', () => {
  const initial = getDefaultLocale();
  try {
    assert.equal(initial, 'fr-FR');
    setDefaultLocale('en-US');
    assert.equal(formatNumber(1234.5), '1,234.5');
    // Une valeur vide ne doit pas remplacer la locale par `undefined`.
    setDefaultLocale('');
    assert.equal(getDefaultLocale(), 'en-US');
  } finally {
    setDefaultLocale(initial);
  }
});

test('createFormatters capture la locale une fois', () => {
  const fmt = createFormatters('de-DE', { currency: 'CHF' });
  assert.match(fmt.currency(12.5), /12,50/u);
  assert.match(fmt.currency(12.5), /CHF/u);
  assert.equal(fmt.list(['a', 'b', 'c']), 'a, b und c');
  assert.equal(fmt.locale, 'de-DE');
});

test('formatList retombe sur la virgule et ignore les trous', () => {
  assert.equal(formatList(['a', null, '', 'b'], 'fr-FR'), 'a et b');
  assert.equal(formatList([], 'fr-FR'), '');
  assert.equal(formatList('pas un tableau'), '');
});

test('directionOf reconnaît les langues de droite à gauche', () => {
  assert.equal(directionOf('fr'), 'ltr');
  assert.equal(directionOf('ar'), 'rtl');
  assert.equal(directionOf('he-IL'), 'rtl');
  // Étiquette invalide : on ne jette pas, on retombe sur `ltr`.
  assert.equal(directionOf('!!!'), 'ltr');
});

const MESSAGES = {
  fr: { titre: 'Bonjour', achat: 'Payé {prix}' },
  en: { titre: 'Hello', achat: 'Paid {prix}' },
};

test('fmt suit setLocale, sans qu’un seul appel nomme la locale', async () => {
  const dom = setupDom();
  const initial = getDefaultLocale();
  try {
    // jsdom annonce `navigator.language === 'en-US'` : sans préférence
    // stockée, la détection choisirait l'anglais et le test ne dirait rien.
    localStorage.setItem('test_locale', 'fr');
    const { I18nProvider, useI18n } = createI18n({
      messages: MESSAGES,
      locales: ['fr', 'en'],
      fallbackLocale: 'fr',
      storageKey: 'test_locale',
      localeTags: { en: 'en-GB' },
    });

    /** @type {{ current: any }} */
    const api = { current: null };
    function Probe() {
      api.current = useI18n();
      return h(
        'p',
        null,
        `${api.current.t('titre')} ${api.current.fmt.number(1234.5)}`
      );
    }

    const view = await mount(h(I18nProvider, null, h(Probe)));
    assert.match(view.container.textContent, /Bonjour 1/u);
    assert.equal(document.documentElement.lang, 'fr');
    assert.equal(document.documentElement.dir, 'ltr');
    // Le défaut du module a suivi : `format.js` formate désormais en français
    // même appelé sans locale, depuis n'importe quel écran.
    assert.equal(getDefaultLocale(), 'fr');

    await view.act(() => api.current.setLocale('en'));
    assert.match(view.container.textContent, /Hello 1,234\.5/u);
    assert.equal(api.current.localeTag, 'en-GB');
    assert.equal(getDefaultLocale(), 'en-GB');

    await view.unmount();
  } finally {
    setDefaultLocale(initial);
    dom.restore();
  }
});

test('fmt.plural passe par Intl.PluralRules, pas par « > 1 »', async () => {
  const dom = setupDom();
  try {
    localStorage.setItem('test_locale_2', 'fr');
    const { I18nProvider, useI18n } = createI18n({
      messages: MESSAGES,
      locales: ['fr', 'en'],
      fallbackLocale: 'fr',
      storageKey: 'test_locale_2',
    });
    const api = { current: null };
    function Probe() {
      api.current = useI18n();
      return null;
    }
    const view = await mount(h(I18nProvider, null, h(Probe)));
    const forms = { one: '{count} but', other: '{count} buts' };
    // Le français compte 0 comme un singulier — c'est exactement ce qu'un
    // ternaire `n > 1` obtient par accident, et `n === 1` rate.
    assert.equal(api.current.fmt.plural(0, forms), '0 but');
    assert.equal(api.current.fmt.plural(1, forms), '1 but');
    assert.equal(api.current.fmt.plural(3, forms), '3 buts');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('le provider pose LabelsProvider, sauf refus explicite', async () => {
  const dom = setupDom();
  try {
    localStorage.setItem('test_locale_3', 'fr');
    localStorage.setItem('test_locale_4', 'fr');
    const config = {
      messages: MESSAGES,
      locales: ['fr', 'en'],
      fallbackLocale: 'fr',
      storageKey: 'test_locale_3',
    };
    const { I18nProvider, useI18n } = createI18n(config);
    const { useLabels } = await import('../react/labels.js');

    const seen = { current: null };
    // Chaque `createI18n` fabrique un contexte ISOLÉ : la sonde doit utiliser
    // le hook de l'instance qu'elle monte, pas celui d'une autre.
    const probeFor = hook =>
      function Probe() {
        const { setLocale } = hook();
        seen.current = { close: useLabels('sheet').close, setLocale };
        return null;
      };

    const view = await mount(h(I18nProvider, null, h(probeFor(useI18n))));
    assert.equal(seen.current.close, 'Fermer');
    await view.act(() => seen.current.setLocale('en'));
    // Le libellé du paquet a suivi la langue de l'app — sans câblage manuel.
    assert.equal(seen.current.close, 'Close');
    await view.unmount();

    const sans = createI18n({
      ...config,
      storageKey: 'test_locale_4',
      labels: false,
    });
    const view2 = await mount(
      h(sans.I18nProvider, null, h(probeFor(sans.useI18n)))
    );
    // Hors `LabelsProvider`, `useLabels` rend le français en dur : c'est le
    // comportement d'avant, et `labels: false` doit le rendre à l'identique.
    assert.equal(seen.current.close, 'Fermer');
    await view2.unmount();
  } finally {
    dom.restore();
  }
});
