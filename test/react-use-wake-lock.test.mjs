/**
 * `useWakeLock` — les deux copies, et ce que chacune ratait.
 *
 * Le hook a été promu de miss-contraction et de mister-molkky. Chaque test
 * ci-dessous verrouille un point sur lequel AU MOINS une des deux copies se
 * trompait : la réacquisition au retour de visibilité manquait à la première,
 * la libération de la BONNE sentinelle à la seconde.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createElement as h } from 'react';

import { setupDom, mount, renderHook } from './helpers/dom.mjs';
import { useWakeLock } from '../react/use-wake-lock.js';

/**
 * Une `navigator.wakeLock` pilotable : chaque demande produit une sentinelle
 * traçable, et `relacheParLeNavigateur()` rejoue ce que fait Chrome quand
 * l'onglet passe en arrière-plan.
 */
function installWakeLock(dom, { refuse = false } = {}) {
  const sentinelles = [];
  const api = {
    request(type) {
      if (refuse) return Promise.reject(new Error('NotAllowedError'));
      const abonnes = new Set();
      const sentinelle = {
        type,
        released: false,
        liberations: 0,
        addEventListener: (_type, fn) => abonnes.add(fn),
        removeEventListener: (_type, fn) => abonnes.delete(fn),
        release() {
          sentinelle.liberations += 1;
          sentinelle.released = true;
          for (const fn of [...abonnes]) fn();
          return Promise.resolve();
        },
      };
      sentinelles.push(sentinelle);
      return Promise.resolve(sentinelle);
    },
  };
  Object.defineProperty(dom.window.navigator, 'wakeLock', {
    value: api,
    configurable: true,
  });
  return sentinelles;
}

/** Bascule `document.visibilityState` et notifie la page. */
function setVisibility(dom, state) {
  Object.defineProperty(dom.window.document, 'visibilityState', {
    value: state,
    configurable: true,
  });
  dom.window.document.dispatchEvent(
    new dom.window.Event('visibilitychange', { bubbles: true })
  );
}

test('actif : le verrou est demandé une fois, et l’état le dit', async () => {
  const dom = setupDom();
  try {
    const sentinelles = installWakeLock(dom);
    const view = await renderHook(() => useWakeLock(true));

    assert.equal(sentinelles.length, 1, 'une seule demande au montage');
    assert.equal(sentinelles[0].type, 'screen');
    assert.deepEqual(view.result.current, { supported: true, held: true });

    // Un rendu de plus ne rouvre pas une seconde sentinelle : le verrou n'est
    // pas empilable, et deux sentinelles vivantes en fuiteraient une.
    await view.act(() => setVisibility(dom, 'visible'));
    assert.equal(sentinelles.length, 1);

    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('retour de visibilité : le verrou relâché par le navigateur est repris', async () => {
  // LE PIÈGE que miss-contraction ne couvrait pas. Le navigateur relâche
  // d'autorité en arrière-plan ; sans réacquisition, l'écran s'éteint au
  // retour alors que le chronomètre tourne toujours.
  const dom = setupDom();
  try {
    const sentinelles = installWakeLock(dom);
    const view = await renderHook(() => useWakeLock(true));
    assert.equal(view.result.current.held, true);

    // L'onglet passe en arrière-plan : le navigateur relâche de lui-même.
    await view.act(() => {
      setVisibility(dom, 'hidden');
      return sentinelles[0].release();
    });
    assert.equal(
      view.result.current.held,
      false,
      'l’état doit suivre la libération faite par le navigateur'
    );

    await view.act(() => setVisibility(dom, 'visible'));
    assert.equal(sentinelles.length, 2, 'aucune réacquisition au retour');
    assert.equal(view.result.current.held, true);

    // Et c'est la NOUVELLE sentinelle qu'on libère — le défaut de
    // mister-molkky, qui gardait l'ancienne en fermeture.
    await view.unmount();
    assert.equal(sentinelles[1].released, true);
    assert.equal(
      sentinelles[0].liberations,
      1,
      'ancienne sentinelle relibérée'
    );
  } finally {
    dom.restore();
  }
});

test('démontage et retombée d’`active` libèrent le verrou', async () => {
  const dom = setupDom();
  try {
    const sentinelles = installWakeLock(dom);
    const view = await renderHook(() => useWakeLock(true));
    await view.unmount();
    assert.equal(sentinelles[0].released, true, 'verrou laissé au démontage');

    // Même chose quand l'app repasse `active` à faux (fin de la partie, du
    // chronomètre…) : c'est le cas d'usage des deux copies.
    const etat = { current: null };
    const Sonde = ({ active }) => {
      etat.current = useWakeLock(active);
      return null;
    };
    const suivi = await mount(h(Sonde, { active: true }));
    assert.equal(sentinelles.length, 2);
    assert.equal(etat.current.held, true);

    await suivi.rerender(h(Sonde, { active: false }));
    assert.equal(sentinelles[1].released, true, 'verrou gardé après l’arrêt');
    assert.equal(etat.current.held, false);
    assert.equal(sentinelles.length, 2, 'aucune demande une fois inactif');

    await suivi.unmount();
  } finally {
    dom.restore();
  }
});

test('inactif : rien n’est demandé', async () => {
  const dom = setupDom();
  try {
    const sentinelles = installWakeLock(dom);
    const view = await renderHook(() => useWakeLock(false));
    assert.equal(sentinelles.length, 0);
    assert.deepEqual(view.result.current, { supported: true, held: false });
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('API absente : le hook ne lève pas et l’annonce', async () => {
  // Firefox, iOS avant 16.4 : `navigator.wakeLock` n'existe pas. Un réglage
  // « garder l'écran allumé » n'a alors rien à afficher — d'où `supported`.
  const dom = setupDom();
  try {
    assert.equal(dom.window.navigator.wakeLock, undefined);
    const view = await renderHook(() => useWakeLock(true));
    assert.deepEqual(view.result.current, { supported: false, held: false });
    await view.act(() => setVisibility(dom, 'visible'));
    assert.equal(view.result.current.held, false);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('permission refusée : la promesse rejetée ne remonte pas', async () => {
  // `request()` rejette hors geste utilisateur ou onglet caché. Un verrou
  // d'écran est un confort : il ne doit jamais casser la page qui l'a demandé.
  const dom = setupDom();
  try {
    installWakeLock(dom, { refuse: true });
    const view = await renderHook(() => useWakeLock(true));
    assert.deepEqual(view.result.current, { supported: true, held: false });
    await view.unmount();
  } finally {
    dom.restore();
  }
});
