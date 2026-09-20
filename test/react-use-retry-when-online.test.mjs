/**
 * `useRetryWhenOnline` (`react/use-retry-when-online.js`) — le repli qui se
 * relit quand le réseau revient.
 *
 * Promu du `useReferentialRetry` de mister-miss-koh (20/09/2026). Chaque test
 * tient une des trois décisions : le répit, une tentative par retour du
 * réseau, et le repli choisi sur délai.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h, useState } from 'react';

import { setupDom, mount } from './helpers/dom.mjs';
import { useRetryWhenOnline } from '../react/use-retry-when-online.js';

/** Minuteurs contrôlés : `setTimeout` posé, tiré à la main. */
function minuteurs() {
  const timers = new Map();
  let id = 0;
  const original = {
    set: globalThis.setTimeout,
    clear: globalThis.clearTimeout,
  };
  globalThis.setTimeout = (fn, ms) => {
    id += 1;
    timers.set(id, { fn, ms });
    return id;
  };
  globalThis.clearTimeout = handle => {
    timers.delete(handle);
  };
  return {
    /** Les délais en attente, dans l'ordre. */
    attentes: () => [...timers.values()].map(t => t.ms),
    /** Tire tous les minuteurs posés. */
    tire() {
      const dus = [...timers.entries()];
      timers.clear();
      for (const [, t] of dus) t.fn();
    },
    restore() {
      globalThis.setTimeout = original.set;
      globalThis.clearTimeout = original.clear;
    },
  };
}

/** `navigator.onLine` pilotable, avec les évènements qui vont avec. */
function reseau(dom, initial = true) {
  let online = initial;
  Object.defineProperty(dom.window.navigator, 'onLine', {
    configurable: true,
    get: () => online,
  });
  return {
    bascule(valeur) {
      online = valeur;
      dom.window.dispatchEvent(
        new dom.window.Event(valeur ? 'online' : 'offline')
      );
    },
  };
}

/** Une app dont le repli se lève quand le rechargement réussit. */
function Sonde({ journal, graceMs, repliInitial = true }) {
  const [surUnRepli, setRepli] = useState(repliInitial);
  const retry = () => {
    journal.push('retry');
    setRepli(false);
  };
  const online = useRetryWhenOnline(surUnRepli, retry, { graceMs });
  return h(
    'p',
    null,
    `${online ? 'en ligne' : 'hors ligne'} · ${surUnRepli ? 'repli' : 'frais'}`
  );
}

test('le retour du réseau rejoue le chargement, après le répit', async () => {
  const dom = setupDom();
  const t = minuteurs();
  try {
    const net = reseau(dom, false);
    const journal = [];
    const view = await mount(h(Sonde, { journal, graceMs: 1500 }));
    assert.equal(view.container.textContent, 'hors ligne · repli');
    assert.deepEqual(t.attentes(), [], 'hors ligne : rien n’est armé');

    await view.act(() => net.bascule(true));
    assert.deepEqual(t.attentes(), [1500], 'le répit, pas un appel immédiat');
    assert.deepEqual(journal, []);

    await view.act(() => t.tire());
    assert.deepEqual(journal, ['retry']);
    assert.equal(view.container.textContent, 'en ligne · frais');
    await view.unmount();
  } finally {
    t.restore();
    dom.restore();
  }
});

test('une tentative par retour du réseau — un échec ne boucle pas', async () => {
  const dom = setupDom();
  const t = minuteurs();
  try {
    const net = reseau(dom, true);
    const journal = [];
    // Le rechargement ÉCHOUE : le repli reste posé.
    function Tetue({ repli = true }) {
      const retry = () => journal.push('retry');
      useRetryWhenOnline(repli, retry, { graceMs: 10 });
      return null;
    }
    const view = await mount(h(Tetue));
    // Démarrage en ligne sur un repli (le cas du délai dépassé) : une
    // tentative part quand même, après le répit.
    assert.deepEqual(t.attentes(), [10]);
    await view.act(() => t.tire());
    assert.deepEqual(journal, ['retry']);

    // Toujours en ligne, toujours sur un repli : rien de plus n'est armé.
    await view.rerender(h(Tetue));
    assert.deepEqual(t.attentes(), []);

    // Le repli se lève, puis retombe — toujours en ligne. La garde tient :
    // sans passage par hors ligne, pas de seconde tentative. C'est ce qui
    // distingue « une fois par retour du réseau » d'une boucle polie.
    await view.rerender(h(Tetue, { repli: false }));
    await view.rerender(h(Tetue, { repli: true }));
    assert.deepEqual(
      t.attentes(),
      [],
      'un repli retombé en ligne ne réarme rien'
    );

    // La garde ne se réarme qu'au passage par hors ligne.
    await view.act(() => net.bascule(false));
    await view.act(() => net.bascule(true));
    assert.deepEqual(t.attentes(), [10]);
    await view.act(() => t.tire());
    assert.deepEqual(journal, ['retry', 'retry']);
    await view.unmount();
  } finally {
    t.restore();
    dom.restore();
  }
});

test('sans repli, rien n’est armé ; un repli levé pendant le répit désarme', async () => {
  const dom = setupDom();
  const t = minuteurs();
  try {
    reseau(dom, true);
    const journal = [];
    const view = await mount(
      h(Sonde, { journal, graceMs: 1500, repliInitial: false })
    );
    assert.deepEqual(
      t.attentes(),
      [],
      'la donnée est fraîche : rien à rejouer'
    );
    await view.unmount();

    // Un repli posé, puis levé par un autre chemin avant la fin du répit.
    function Levee() {
      const [repli, setRepli] = useState(true);
      useRetryWhenOnline(repli, () => journal.push('retry'), { graceMs: 1500 });
      return h('button', { onClick: () => setRepli(false) }, 'frais');
    }
    const vue = await mount(h(Levee));
    assert.deepEqual(t.attentes(), [1500]);
    await vue.act(() => vue.container.querySelector('button').click());
    assert.deepEqual(t.attentes(), [], 'le minuteur est désarmé');
    await vue.act(() => t.tire());
    assert.deepEqual(journal, []);
    await vue.unmount();
  } finally {
    t.restore();
    dom.restore();
  }
});

test('`retry` est lu au moment de tirer : une fonction recréée ne désarme rien', async () => {
  const dom = setupDom();
  const t = minuteurs();
  try {
    reseau(dom, true);
    const journal = [];
    let rendus = 0;
    function Instable() {
      const [, force] = useState(0);
      rendus += 1;
      const numero = rendus;
      // Nouvelle identité à chaque rendu, comme une flèche écrite en ligne.
      useRetryWhenOnline(true, () => journal.push(`retry#${numero}`), {
        graceMs: 1500,
      });
      return h('button', { onClick: () => force(n => n + 1) }, 'rendre');
    }
    const view = await mount(h(Instable));
    await view.act(() => view.container.querySelector('button').click());
    await view.act(() => view.container.querySelector('button').click());
    assert.deepEqual(t.attentes(), [1500], 'un seul minuteur, jamais réarmé');
    await view.act(() => t.tire());
    assert.deepEqual(
      journal,
      ['retry#3'],
      'c’est la DERNIÈRE fonction qui tire'
    );
    await view.unmount();
  } finally {
    t.restore();
    dom.restore();
  }
});
