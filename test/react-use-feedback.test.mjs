/**
 * `useFeedback` — le retour sensoriel unifié (`react/use-feedback.js`).
 *
 * Le sous-chemin n'avait aucun test. Ce qui s'y joue n'est pas la table
 * d'évènements — elle appartient à l'app — mais TROIS promesses de branchement,
 * dont deux ne se voient qu'à l'exécution :
 *
 *   1. la fonction rendue est STABLE : elle se passe en prop sans rerendre le
 *      sous-arbre à chaque frappe ;
 *   2. elle lit pourtant la table À JOUR — une table figée au montage jouerait
 *      le son d'hier après un changement de préférences ;
 *   3. un son qui lève (Web Audio absent, contexte refusé) ne doit pas empêcher
 *      la vibration, ni remonter dans le rendu.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setupDom, renderHook } from './helpers/dom.mjs';
import { useFeedback } from '../react/use-feedback.js';

/** Pose une API de vibration observable, et rend de quoi la retirer. */
function espionnerVibration() {
  const appels = [];
  Object.defineProperty(globalThis.navigator, 'vibrate', {
    value: pattern => {
      appels.push(pattern);
      return true;
    },
    configurable: true,
  });
  return appels;
}

test('un évènement inconnu ne fait rien', async () => {
  const dom = setupDom();
  const vibrations = espionnerVibration();
  try {
    const vue = await renderHook(() =>
      useFeedback({ roll: { vibration: 20 } })
    );
    await vue.act(() => vue.result.current('inconnu'));
    assert.deepEqual(vibrations, []);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('la fonction rendue est stable, et lit pourtant la table à jour', async () => {
  const dom = setupDom();
  const vibrations = espionnerVibration();
  try {
    const rendus = [];
    function Sonde({ table }) {
      const feedback = useFeedback(table);
      rendus.push(feedback);
      return null;
    }
    const { createElement: h } = await import('react');
    const { mount } = await import('./helpers/dom.mjs');
    const vue = await mount(h(Sonde, { table: { roll: { vibration: 20 } } }));

    await vue.rerender(h(Sonde, { table: { roll: { vibration: [10, 5] } } }));
    // Stable : le sous-arbre qui la reçoit en prop ne rerendra pas pour elle.
    assert.equal(rendus[0], rendus[1], 'la fonction a changé d’identité');

    await vue.act(() => rendus[0]('roll'));
    // …et pourtant c'est la NOUVELLE table qui joue.
    assert.deepEqual(vibrations, [[10, 5]]);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('les deux interrupteurs coupent chacun leur canal', async () => {
  const dom = setupDom();
  const vibrations = espionnerVibration();
  try {
    const table = { roll: { vibration: 20, sound: 'tap' } };
    const muet = await renderHook(() =>
      useFeedback(table, { sound: false, haptic: true })
    );
    await muet.act(() => muet.result.current('roll'));
    assert.deepEqual(vibrations, [20], 'la vibration doit rester');
    await muet.unmount();

    vibrations.length = 0;
    const immobile = await renderHook(() =>
      useFeedback(table, { sound: true, haptic: false })
    );
    await immobile.act(() => immobile.result.current('roll'));
    assert.deepEqual(vibrations, [], 'la vibration doit être coupée');
    await immobile.unmount();
  } finally {
    dom.restore();
  }
});

test('un son qui lève n’empêche pas la vibration', async () => {
  const dom = setupDom();
  const vibrations = espionnerVibration();
  // Web Audio présent mais refusant de démarrer : le cas d'un onglet sans
  // geste utilisateur, ou d'un navigateur qui restreint l'audio.
  globalThis.window.AudioContext = class {
    constructor() {
      throw new Error('audio refusé');
    }
  };
  try {
    const vue = await renderHook(() =>
      useFeedback({ roll: { vibration: 30, sound: 'error' } })
    );
    await vue.act(() => vue.result.current('roll'));
    assert.deepEqual(vibrations, [30]);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});
