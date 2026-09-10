/**
 * `useShake` et `requestMotionPermission` (`react/use-shake.js`) — sous-chemin
 * sans test.
 *
 * Trois choses ne se voient qu'à l'exécution, et chacune a un coût visible pour
 * qui secoue son téléphone : le seuil se mesure sur la VARIATION d'accélération
 * (sans quoi la gravité seule déclencherait en permanence), l'anti-rebond évite
 * le double lancer, et le callback doit rester à jour sans que l'écouteur soit
 * reposé à chaque rendu.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setupDom, renderHook } from './helpers/dom.mjs';
import { requestMotionPermission, useShake } from '../react/use-shake.js';

/** Pose un `DeviceMotionEvent` minimal, et rend l'émetteur d'évènements. */
function poserMotion(dom) {
  globalThis.window.DeviceMotionEvent = class {};
  return (x, y, z) => {
    const evenement = new globalThis.window.Event('devicemotion');
    Object.defineProperty(evenement, 'accelerationIncludingGravity', {
      value: { x, y, z },
    });
    dom.window.dispatchEvent(evenement);
  };
}

test('sans DeviceMotion, le hook se tait au lieu de lever', async () => {
  const dom = setupDom();
  try {
    let secousses = 0;
    const vue = await renderHook(() => useShake(() => (secousses += 1)));
    dom.window.dispatchEvent(new dom.window.Event('devicemotion'));
    assert.equal(secousses, 0);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('c’est la VARIATION qui déclenche, pas l’accélération absolue', async () => {
  const dom = setupDom();
  const secouer = poserMotion(dom);
  try {
    let secousses = 0;
    const vue = await renderHook(() =>
      useShake(() => (secousses += 1), { cooldownMs: 0 })
    );

    // Un téléphone posé : 9,81 m/s² en permanence, très au-dessus du seuil de
    // 14 si on lisait la magnitude. La variation, elle, est nulle.
    for (let i = 0; i < 5; i += 1) await vue.act(() => secouer(0, 9.81, 0));
    assert.equal(secousses, 0, 'un téléphone immobile ne se secoue pas');

    // Une vraie secousse : la magnitude bondit d'un coup.
    await vue.act(() => secouer(0, 40, 0));
    assert.equal(secousses, 1);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('l’anti-rebond empêche le double lancer', async () => {
  const dom = setupDom();
  const secouer = poserMotion(dom);
  try {
    let secousses = 0;
    const vue = await renderHook(() =>
      useShake(() => (secousses += 1), { cooldownMs: 10_000 })
    );
    await vue.act(() => secouer(0, 0, 0));
    await vue.act(() => secouer(0, 40, 0));
    await vue.act(() => secouer(0, 0, 0));
    await vue.act(() => secouer(0, 40, 0));
    assert.equal(secousses, 1, 'la seconde secousse est dans le délai');
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('le callback reste à jour sans reposer l’écouteur', async () => {
  const dom = setupDom();
  const secouer = poserMotion(dom);
  const poses = [];
  const ajouter = dom.window.addEventListener.bind(dom.window);
  dom.window.addEventListener = (type, fn, opts) => {
    if (type === 'devicemotion') poses.push(fn);
    ajouter(type, fn, opts);
  };
  try {
    const vus = [];
    const { createElement: h } = await import('react');
    const { mount } = await import('./helpers/dom.mjs');
    function Sonde({ nom }) {
      useShake(() => vus.push(nom), { cooldownMs: 0 });
      return null;
    }
    const vue = await mount(h(Sonde, { nom: 'premier' }));
    await vue.rerender(h(Sonde, { nom: 'second' }));
    assert.equal(poses.length, 1, 'l’écouteur ne doit être posé qu’une fois');

    await vue.act(() => secouer(0, 0, 0));
    await vue.act(() => secouer(0, 40, 0));
    assert.deepEqual(vus, ['second'], 'c’est le dernier callback qui joue');
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('`enabled: false` ne pose aucun écouteur', async () => {
  const dom = setupDom();
  const secouer = poserMotion(dom);
  try {
    let secousses = 0;
    const vue = await renderHook(() =>
      useShake(() => (secousses += 1), { enabled: false, cooldownMs: 0 })
    );
    await vue.act(() => secouer(0, 0, 0));
    await vue.act(() => secouer(0, 40, 0));
    assert.equal(secousses, 0);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('requestMotionPermission : iOS demande, les autres accordent', async () => {
  const dom = setupDom();
  try {
    // Ailleurs qu'iOS : l'API existe, aucune permission à demander.
    globalThis.DeviceMotionEvent = class {};
    assert.equal(await requestMotionPermission(), true);

    // iOS 13+ : la réponse de l'utilisateur fait foi, dans les deux sens.
    const iOS = accord =>
      Object.assign(class {}, { requestPermission: async () => accord });
    globalThis.DeviceMotionEvent = iOS('granted');
    assert.equal(await requestMotionPermission(), true);
    globalThis.DeviceMotionEvent = iOS('denied');
    assert.equal(await requestMotionPermission(), false);

    // Un refus qui LÈVE (appel hors geste utilisateur) n'est pas un accord.
    globalThis.DeviceMotionEvent = Object.assign(class {}, {
      requestPermission: async () => {
        throw new Error('hors geste utilisateur');
      },
    });
    assert.equal(await requestMotionPermission(), false);

    delete globalThis.DeviceMotionEvent;
    assert.equal(await requestMotionPermission(), false);
  } finally {
    dom.restore();
  }
});
