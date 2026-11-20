/**
 * `react/i18n-lite` : la même `createI18n`, sans les sept langues de libellés.
 *
 * CE QUE CE FICHIER GARDE. Le 20/11/2026, le morceau `i18n` de l'accueil de
 * `mister-uwh-tactic` pesait 83 kB bruts, dont environ 48 de libellés en
 * sept langues, pour une app fr et en : `react/i18n` importe `./labels.js`
 * statiquement, et `labels: false` n'y changeait rien. Le gain de
 * `react/i18n-lite` tient à UNE propriété — aucune langue autre que le
 * français n'est atteignable depuis lui par un import statique — et aucun
 * test de comportement ne la verrait se perdre : un `import` de trop, et les
 * sept langues reviennent dans vingt apps, écrans identiques. Le premier test
 * la vérifie donc sur le GRAPHE des imports, pas sur une seule ligne.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createElement as h } from 'react';

import { mount, setupDom } from './helpers/dom.mjs';
import * as lite from '../react/i18n-lite.js';
import * as complet from '../react/i18n.js';
import { useLabels } from '../react/labels-core.js';
import fr from '../react/labels-fr.js';
import en from '../react/labels-en.js';
import es from '../react/labels-es.js';
import de from '../react/labels-de.js';
import pt from '../react/labels-pt.js';

const racine = fileURLToPath(new URL('../', import.meta.url));

/** Les modules du paquet atteints depuis `depart` par des imports relatifs. */
function graphe(depart) {
  const vus = new Set();
  const pile = [resolve(racine, depart)];
  while (pile.length) {
    const fichier = pile.pop();
    if (vus.has(fichier)) continue;
    vus.add(fichier);
    const source = readFileSync(fichier, 'utf8');
    // Imports et réexports STATIQUES : un `import()` ne lie rien au chargement.
    for (const [, cible] of source.matchAll(
      /^\s*(?:import|export)\s[^;]*?from\s+'(\.{1,2}\/[^']+)'/gms
    )) {
      pile.push(resolve(dirname(fichier), cible));
    }
  }
  return [...vus].map(f => f.slice(racine.length).replaceAll('\\', '/'));
}

test('LE GARDE : depuis i18n-lite, aucune langue autre que le français n’est atteignable', () => {
  const atteints = graphe('react/i18n-lite.js');
  // Le garde ne vaut que s'il lit vraiment le graphe : le noyau des libellés
  // et le français DOIVENT y être.
  assert.ok(atteints.includes('react/labels-core.js'), atteints.join(', '));
  assert.ok(atteints.includes('react/labels-fr.js'), atteints.join(', '));
  const fautifs = atteints.filter(
    f => f === 'react/labels.js' || /react\/labels-(?!core|fr)/.test(f)
  );
  assert.deepEqual(
    fautifs,
    [],
    `i18n-lite atteint ${fautifs.join(', ')} : les sept langues reviennent dans le bundle de chaque app qui l'importe`
  );
});

test('react/i18n, lui, atteint les sept — c’est son contrat, et l’autre ne diverge pas', () => {
  const atteints = graphe('react/i18n.js');
  assert.ok(atteints.includes('react/labels.js'));
  // Une seule implémentation : `react/i18n` s'appuie sur `react/i18n-lite`
  // au lieu d'en garder une copie, qui finirait par diverger.
  assert.ok(atteints.includes('react/i18n-lite.js'));
});

test('les deux entrées exportent les mêmes noms', () => {
  assert.deepEqual(Object.keys(lite).sort(), Object.keys(complet).sort());
  assert.equal(lite.directionOf, complet.directionOf);
  assert.equal(lite.plural, complet.plural);
});

const MESSAGES = {
  fr: { titre: 'Bonjour' },
  en: { titre: 'Hello' },
  es: { titre: 'Hola' },
  de: { titre: 'Hallo' },
  pt: { titre: 'Olá' },
};

/**
 * Monte une instance et rend une sonde qui lit le libellé de fermeture
 * de `Sheet` et l'API de l'instance.
 */
async function monter(createI18n, config) {
  const { I18nProvider, useI18n } = createI18n(config);
  const vu = { current: null };
  function Sonde() {
    const api = useI18n();
    vu.current = { close: useLabels('sheet').close, api };
    return h('p', null, api.t('titre'));
  }
  const vue = await mount(h(I18nProvider, null, h(Sonde)));
  return { vue, vu };
}

/** Relève les `console.warn` émis pendant `fn`. */
async function avertissementsDe(fn) {
  const relevés = [];
  const origine = console.warn;
  console.warn = (...args) => relevés.push(args.join(' '));
  try {
    await fn();
  } finally {
    console.warn = origine;
  }
  return relevés;
}

test('les libellés suivent la langue passée, sans rien charger', async () => {
  const dom = setupDom();
  try {
    localStorage.setItem('lite_1', 'fr');
    let ouvert;
    const avertis = await avertissementsDe(async () => {
      ouvert = await monter(lite.createI18n, {
        messages: MESSAGES,
        locales: ['fr', 'en'],
        fallbackLocale: 'fr',
        storageKey: 'lite_1',
        labels: { en },
      });
    });
    const { vue, vu } = ouvert;
    assert.deepEqual(avertis, [], 'toutes les locales ont leurs libellés');
    assert.equal(vu.current.close, fr.sheet.close);
    // SYNCHRONE : la bascule et ses libellés arrivent dans le même rendu. Un
    // chargement à la demande montrerait ici le français une fois de plus.
    await vue.act(() => vu.current.api.setLocale('en'));
    assert.equal(vu.current.close, en.sheet.close);
    assert.match(vue.container.textContent, /Hello/u);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('le premier rendu est déjà dans la bonne langue — jsdom se dit en-US', async () => {
  // Aucune préférence stockée : la détection suit `navigator.language`, que
  // jsdom annonce `en-US`. C'est la situation de chaque test d'app.
  const dom = setupDom();
  try {
    const { vue, vu } = await monter(lite.createI18n, {
      messages: MESSAGES,
      locales: ['fr', 'en'],
      fallbackLocale: 'fr',
      storageKey: 'lite_vierge',
      labels: { en },
    });
    assert.equal(vu.current.api.locale, 'en');
    assert.equal(vu.current.close, en.sheet.close);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('une locale déclarée sans libellés rend le français, et LE DIT', async () => {
  const dom = setupDom();
  try {
    localStorage.setItem('lite_2', 'es');
    let ouvert;
    const avertis = await avertissementsDe(async () => {
      ouvert = await monter(lite.createI18n, {
        messages: MESSAGES,
        locales: ['fr', 'en', 'es'],
        fallbackLocale: 'fr',
        storageKey: 'lite_2',
        labels: { en },
      });
    });
    const { vue, vu } = ouvert;
    assert.equal(vu.current.close, fr.sheet.close);
    // L'application, elle, parle bien espagnol : seul le paquet se replie.
    assert.match(vue.container.textContent, /Hola/u);
    assert.equal(avertis.length, 1, avertis.join('\n'));
    assert.match(avertis[0], /« es »/u);
    assert.doesNotMatch(avertis[0], /« en »/u);
    // L'avertissement dit le geste, pas seulement le défaut.
    assert.match(avertis[0], /labels: \{ es \}/u);
    assert.match(avertis[0], /react\/labels-es/u);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('sans `labels`, le français seul — dit pour chaque autre locale', async () => {
  const dom = setupDom();
  try {
    localStorage.setItem('lite_3', 'en');
    let ouvert;
    const avertis = await avertissementsDe(async () => {
      ouvert = await monter(lite.createI18n, {
        messages: MESSAGES,
        locales: ['fr', 'en', 'de'],
        fallbackLocale: 'fr',
        storageKey: 'lite_3',
      });
    });
    const { vue, vu } = ouvert;
    assert.equal(vu.current.close, fr.sheet.close);
    assert.equal(avertis.length, 1);
    assert.match(avertis[0], /« en », « de »/u);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('une app monolingue ne déclare rien et n’entend rien', async () => {
  const dom = setupDom();
  try {
    let ouvert;
    const avertis = await avertissementsDe(async () => {
      ouvert = await monter(lite.createI18n, {
        messages: { fr: MESSAGES.fr },
        locales: ['fr'],
        fallbackLocale: 'fr',
        storageKey: 'lite_4',
      });
    });
    assert.deepEqual(avertis, []);
    assert.equal(ouvert.vu.current.close, fr.sheet.close);
    await ouvert.vue.unmount();
  } finally {
    dom.restore();
  }
});

test('une étiquette régionale retombe sur sa langue, comme labelsFor', async () => {
  const dom = setupDom();
  try {
    localStorage.setItem('lite_5', 'pt-BR');
    let ouvert;
    const avertis = await avertissementsDe(async () => {
      ouvert = await monter(lite.createI18n, {
        messages: { fr: MESSAGES.fr, 'pt-BR': MESSAGES.pt },
        locales: ['fr', 'pt-BR'],
        fallbackLocale: 'fr',
        storageKey: 'lite_5',
        labels: { pt },
      });
    });
    assert.deepEqual(avertis, []);
    assert.equal(ouvert.vu.current.close, pt.sheet.close);
    await ouvert.vue.unmount();
  } finally {
    dom.restore();
  }
});

test('une app dont la langue de repli n’est pas le français', async () => {
  const dom = setupDom();
  try {
    localStorage.setItem('lite_6', 'de');
    const { vue, vu } = await monter(lite.createI18n, {
      messages: { en: MESSAGES.en, de: MESSAGES.de },
      locales: ['en', 'de'],
      fallbackLocale: 'en',
      storageKey: 'lite_6',
      labels: { en, de },
    });
    assert.equal(vu.current.close, de.sheet.close);
    await vue.act(() => vu.current.api.setLocale('en'));
    assert.equal(vu.current.close, en.sheet.close);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('labels: false ne monte aucun provider', async () => {
  const dom = setupDom();
  try {
    localStorage.setItem('lite_7', 'en');
    let ouvert;
    const avertis = await avertissementsDe(async () => {
      ouvert = await monter(lite.createI18n, {
        messages: MESSAGES,
        locales: ['fr', 'en'],
        fallbackLocale: 'fr',
        storageKey: 'lite_7',
        labels: false,
      });
    });
    // Hors provider, `useLabels` rend le français en dur ; rien à signaler,
    // c'est ce que l'app a demandé.
    assert.deepEqual(avertis, []);
    assert.equal(ouvert.vu.current.close, fr.sheet.close);
    await ouvert.vue.unmount();
  } finally {
    dom.restore();
  }
});

test('COMPATIBILITÉ : react/i18n sans `labels` résout toujours les sept langues', async () => {
  const dom = setupDom();
  try {
    localStorage.setItem('complet_1', 'es');
    let ouvert;
    const avertis = await avertissementsDe(async () => {
      ouvert = await monter(complet.createI18n, {
        messages: MESSAGES,
        locales: ['fr', 'en', 'es', 'de', 'pt'],
        fallbackLocale: 'fr',
        storageKey: 'complet_1',
      });
    });
    const { vue, vu } = ouvert;
    assert.deepEqual(avertis, []);
    assert.equal(vu.current.close, es.sheet.close);
    await vue.act(() => vu.current.api.setLocale('de'));
    assert.equal(vu.current.close, de.sheet.close);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('react/i18n accepte aussi des dictionnaires, et s’y tient', async () => {
  const dom = setupDom();
  try {
    localStorage.setItem('complet_2', 'es');
    let ouvert;
    const avertis = await avertissementsDe(async () => {
      ouvert = await monter(complet.createI18n, {
        messages: MESSAGES,
        locales: ['fr', 'en', 'es'],
        fallbackLocale: 'fr',
        storageKey: 'complet_2',
        labels: { en },
      });
    });
    // Mêmes règles que `react/i18n-lite` : ce qui n'est pas passé n'est pas
    // résolu, même si ce module, lui, embarque l'espagnol.
    assert.equal(ouvert.vu.current.close, fr.sheet.close);
    assert.equal(avertis.length, 1);
    await ouvert.vue.unmount();
  } finally {
    dom.restore();
  }
});
