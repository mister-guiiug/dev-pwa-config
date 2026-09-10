/**
 * `usePrefetch` / `useVisiblePrefetch` / `useIdlePrefetch`
 * (`react/use-prefetch.js`) — sous-chemin sans test.
 *
 * La décision vit dans `prefetch.js`, qui est éprouvé ailleurs. Ce qui se joue
 * ici est le BRANCHEMENT, et il porte le piège que le module documente : un
 * `() => import(…)` écrit en ligne change d'identité à chaque rendu, et la
 * déduplication repose sur cette identité. Un chargeur non figé, et la route
 * est rechargée à chaque survol.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import { setupDom, mount, renderHook } from './helpers/dom.mjs';
import {
  useIdlePrefetch,
  usePrefetch,
  useVisiblePrefetch,
} from '../react/use-prefetch.js';

test('les trois évènements d’intention sont posés sur le lien', async () => {
  const dom = setupDom();
  try {
    let appels = 0;
    const loader = () => {
      appels += 1;
      return Promise.resolve();
    };
    const vue = await renderHook(() => usePrefetch(loader));
    assert.deepEqual(Object.keys(vue.result.current.linkProps), [
      'onPointerEnter',
      'onFocus',
      'onTouchStart',
    ]);

    vue.result.current.linkProps.onPointerEnter();
    assert.equal(appels, 1);
    // Deuxième survol : `prefetch` dédoublonne, le morceau est déjà demandé.
    vue.result.current.linkProps.onFocus();
    assert.equal(appels, 1);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('le chargeur est FIGÉ au premier rendu — sinon plus rien ne dédoublonne', async () => {
  const dom = setupDom();
  try {
    const appels = [];
    function Lien({ nom }) {
      // Écrit en ligne, comme dans une app : identité neuve à chaque rendu.
      const { prefetch } = usePrefetch(() => {
        appels.push(nom);
        return Promise.resolve();
      });
      return h('button', { type: 'button', onClick: prefetch }, nom);
    }
    const vue = await mount(h(Lien, { nom: 'premier' }));
    await vue.rerender(h(Lien, { nom: 'second' }));
    await vue.act(() => vue.container.querySelector('button').click());
    await vue.act(() => vue.container.querySelector('button').click());

    // Un seul appel, et c'est le chargeur du PREMIER rendu : c'est ce qui rend
    // la déduplication possible.
    assert.deepEqual(appels, ['premier']);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('au repos : le chargeur part, et l’annulation est rendue au démontage', async () => {
  const dom = setupDom();
  const rappels = [];
  globalThis.requestIdleCallback = (fn, opts) => {
    rappels.push({ fn, opts });
    return rappels.length;
  };
  const annules = [];
  globalThis.cancelIdleCallback = handle => annules.push(handle);
  try {
    let appels = 0;
    const loader = () => {
      appels += 1;
      return Promise.resolve();
    };
    const vue = await renderHook(() =>
      useIdlePrefetch(loader, { timeout: 50 })
    );
    assert.equal(rappels.length, 1);
    assert.deepEqual(rappels[0].opts, { timeout: 50 });

    rappels[0].fn();
    assert.equal(appels, 1);

    await vue.unmount();
    assert.deepEqual(annules, [1], 'le démontage doit annuler la demande');
  } finally {
    delete globalThis.requestIdleCallback;
    delete globalThis.cancelIdleCallback;
    dom.restore();
  }
});

test('`enabled: false` ne pose rien du tout', async () => {
  const dom = setupDom();
  const rappels = [];
  globalThis.requestIdleCallback = fn => rappels.push(fn);
  const observes = [];
  globalThis.IntersectionObserver = class {
    constructor(cb) {
      this.cb = cb;
    }
    observe(el) {
      observes.push(el);
    }
    disconnect() {}
  };
  try {
    const element = document.createElement('div');
    const vue = await renderHook(() => {
      useIdlePrefetch(() => Promise.resolve(), { enabled: false });
      useVisiblePrefetch({ current: element }, () => Promise.resolve(), {
        enabled: false,
      });
    });
    assert.deepEqual(rappels, []);
    assert.deepEqual(observes, []);
    await vue.unmount();
  } finally {
    delete globalThis.requestIdleCallback;
    delete globalThis.IntersectionObserver;
    dom.restore();
  }
});

test('à l’approche de l’écran : observé, chargé une fois, puis débranché', async () => {
  const dom = setupDom();
  let instance = null;
  const deconnexions = [];
  globalThis.IntersectionObserver = class {
    constructor(cb, opts) {
      this.cb = cb;
      this.opts = opts;
      instance = this;
    }
    observe(el) {
      this.observed = el;
    }
    disconnect() {
      deconnexions.push(this);
    }
  };
  try {
    let appels = 0;
    const loader = () => {
      appels += 1;
      return Promise.resolve();
    };
    const element = document.createElement('div');
    const vue = await renderHook(() =>
      useVisiblePrefetch({ current: element }, loader, { rootMargin: '10px' })
    );
    assert.equal(instance.observed, element);
    assert.deepEqual(instance.opts, { rootMargin: '10px' });

    instance.cb([{ isIntersecting: false }]);
    assert.equal(appels, 0, 'hors champ : rien ne part');
    instance.cb([{ isIntersecting: true }]);
    assert.equal(appels, 1);
    assert.equal(deconnexions.length, 1, 'l’observateur se débranche après');

    await vue.unmount();
  } finally {
    delete globalThis.IntersectionObserver;
    dom.restore();
  }
});
