/**
 * `AnimationEvent` : le trou de jsdom 30 que `vitest-setup` bouche.
 *
 * LE DÉFAUT QUE CE TEST REND IMPOSSIBLE À REPRODUIRE. jsdom 30 n'expose plus
 * `window.AnimationEvent` — `TransitionEvent`, lui, est resté. React choisit le
 * nom de l'événement d'animation d'après la présence de ce constructeur : sans
 * lui, il écoute la variante préfixée et n'entend jamais `animationend`. Aucune
 * erreur n'est levée : `onAnimationEnd` cesse simplement de se déclencher.
 *
 * Constaté le 12/09/2026 en montant `mister-miss-koh` de jsdom 26 à 30. Son
 * bouton « favori » retire son attribut `data-pop` sur `onAnimationEnd` ; le
 * test échouait sur `expect(bouton).not.toHaveAttribute('data-pop')`, à trois
 * lignes de la vraie cause. Le listener natif, lui, recevait toujours
 * l'événement — ce qui achevait de brouiller la piste. Un seul dépôt du parc
 * tombait ce jour-là, parce qu'un seul teste une animation.
 *
 * Le fichier de mise en place est chargé POUR DE BON, avec `vitest` et jest-dom
 * remplacés par des doubles en mémoire (`registerHooks`) : le socle n'a pas
 * Vitest en dépendance, et une relecture du source à l'expression régulière ne
 * prouverait pas que le correctif s'exécute.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
import { createElement as h } from 'react';

import { setupDom, mount } from './helpers/dom.mjs';

/** Charge `vitest-setup.js` hors de Vitest, ses deux imports doublés. */
async function chargerVitestSetup() {
  const sources = new Map([
    ['vitest', 'export const vi = { mock: () => {} };'],
    ['@testing-library/jest-dom/vitest', 'export {};'],
  ]);
  const hooks = registerHooks({
    resolve: (spec, ctx, suite) =>
      sources.has(spec)
        ? { url: `dwc-double:${spec}`, shortCircuit: true }
        : suite(spec, ctx),
    load: (url, ctx, suite) =>
      url.startsWith('dwc-double:')
        ? {
            format: 'module',
            source: sources.get(url.slice('dwc-double:'.length)),
            shortCircuit: true,
          }
        : suite(url, ctx),
  });
  try {
    await import('../vitest-setup.js');
  } finally {
    hooks.deregister();
  }
}

test('jsdom 30 ne fournit pas AnimationEvent, vitest-setup le rétablit, et React réentend', async () => {
  const dom = setupDom();
  try {
    // 1. LA CAUSE, telle que jsdom la livre. Aucun rendu React avant ce point :
    //    React mémorise le nom d'événement qu'il choisit, et le mesurer après
    //    coup ne dirait plus rien.
    assert.equal(
      typeof dom.window.AnimationEvent,
      'undefined',
      'jsdom fournit AnimationEvent : ce test a perdu son objet, vérifier la version'
    );
    assert.equal(
      typeof dom.window.TransitionEvent,
      'function',
      'TransitionEvent devait rester — c’est ce qui rend la disparition surprenante'
    );

    // 2. LE CORRECTIF, exécuté depuis le fichier réellement publié.
    await chargerVitestSetup();
    assert.equal(typeof globalThis.AnimationEvent, 'function');
    assert.equal(typeof window.AnimationEvent, 'function');

    // Le constructeur porte les champs de l'interface, avec leurs défauts.
    const nu = new window.AnimationEvent('animationend');
    assert.equal(nu.animationName, '');
    assert.equal(nu.elapsedTime, 0);
    assert.equal(nu.pseudoElement, '');
    const garni = new window.AnimationEvent('animationend', {
      bubbles: true,
      animationName: 'pop',
      elapsedTime: 0.2,
    });
    assert.equal(garni.animationName, 'pop');
    assert.equal(garni.elapsedTime, 0.2);
    assert.equal(garni.bubbles, true);

    // 3. CE QUI COMPTE VRAIMENT : le gestionnaire React se déclenche à nouveau.
    const recus = [];
    const view = await mount(
      h('button', {
        onAnimationEnd: event => recus.push(event.animationName),
        children: 'b',
      })
    );
    const bouton = view.container.querySelector('button');
    await view.act(() =>
      bouton.dispatchEvent(
        new window.AnimationEvent('animationend', {
          bubbles: true,
          animationName: 'pop',
        })
      )
    );
    assert.deepEqual(
      recus,
      ['pop'],
      'onAnimationEnd ne s’est pas déclenché : React écoute la variante préfixée'
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});
