/**
 * `useWakeLock` — la garantie qui n'était prouvée nulle part, et qui a coûté.
 *
 * CE HOOK N'AVAIT AUCUN TEST, dans le paquet comme dans les trois apps qui en
 * portaient une copie. Le 30/08/2026, la migration de `miss-contraction` (#20)
 * a montré ce que ça vaut : **sa copie n'écoutait pas `visibilitychange`**.
 * L'écran s'éteignait donc en pleine contraction dès que l'utilisatrice avait
 * consulté une autre app entre deux — exactement le moment où le hook existe.
 * `mister-molkky` (#16) portait une fuite voisine : sa demande en vol n'était
 * pas relâchée si l'on quittait la partie pendant l'attente.
 *
 * Ces deux défauts sont ABSENTS du hook du paquet. Ce fichier existe pour
 * qu'ils le restent : chaque test ci-dessous tombe si l'on retire la ligne
 * correspondante de `react/use-wake-lock.js` — vérifié par mutation.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setupDom, renderHook } from './helpers/dom.mjs';
import { useWakeLock } from '../react/use-wake-lock.js';

/** Promesse dont le test décide du moment de résolution. */
function deferred() {
  let resolve;
  const promise = new Promise(res => {
    resolve = res;
  });
  return { promise, resolve };
}

/**
 * Une API Wake Lock pilotable : compte les demandes et les relâchements, et
 * peut retenir une demande en vol (`hold`) ou la refuser (`reject`).
 */
function fakeWakeLock({ hold = false, reject = false } = {}) {
  const api = { requests: 0, released: 0, sentinels: [], pending: null };
  api.wakeLock = {
    request: () => {
      api.requests += 1;
      if (reject) return Promise.reject(new Error('NotAllowedError'));
      const sentinel = {
        released: false,
        release() {
          this.released = true;
          api.released += 1;
          return Promise.resolve();
        },
      };
      api.sentinels.push(sentinel);
      if (!hold) return Promise.resolve(sentinel);
      api.pending = deferred();
      return api.pending.promise.then(() => sentinel);
    },
  };
  return api;
}

/** Installe le DOM, y branche l'API simulée, et rend la visibilité pilotable. */
function setup(options) {
  const dom = setupDom();
  const api = fakeWakeLock(options);
  if (api.wakeLock)
    Object.defineProperty(dom.window.navigator, 'wakeLock', {
      value: api.wakeLock,
      configurable: true,
    });
  let visibility = 'visible';
  Object.defineProperty(dom.window.document, 'visibilityState', {
    get: () => visibility,
    configurable: true,
  });
  // Le banc est rendu TEL QUEL, jamais étalé : `{ ...api }` figerait `requests`
  // et `released` à leur valeur du moment, et chaque compteur resterait à zéro.
  api.dom = dom;
  /** Bascule l'onglet et émet l'évènement, comme le ferait le navigateur. */
  api.setVisibility = next => {
    visibility = next;
    dom.window.document.dispatchEvent(new dom.window.Event('visibilitychange'));
  };
  return api;
}

test('le verrou est demandé au montage quand le hook est actif', async () => {
  const env = setup();
  try {
    const view = await renderHook(() => useWakeLock(true));
    assert.equal(env.requests, 1);
    await view.unmount();
  } finally {
    env.dom.restore();
  }
});

test('inactif, le hook ne demande rien — c’est ce qui porte le réglage de l’app', async () => {
  // `mister-molkky` passe `Boolean(partie) && réglageUtilisateur` : si un hook
  // inconditionnel demandait quand même, le réglage « garder l'écran allumé »
  // n'aurait plus d'effet.
  const env = setup();
  try {
    const view = await renderHook(() => useWakeLock(false));
    assert.equal(env.requests, 0);
    await view.unmount();
  } finally {
    env.dom.restore();
  }
});

test('LE BUG DE miss-contraction : le verrou est RE-ACQUIS au retour au premier plan', async () => {
  // Le navigateur relâche le verrou quand l'onglet passe en arrière-plan, sans
  // rien dire. Sans cette ré-acquisition, l'écran s'éteint après un simple
  // aller-retour dans une autre app.
  const env = setup();
  try {
    const view = await renderHook(() => useWakeLock(true));
    assert.equal(env.requests, 1);

    env.sentinels[0].released = true; // ce que fait le navigateur en arrière-plan
    await view.act(() => env.setVisibility('hidden'));
    await view.act(() => env.setVisibility('visible'));

    assert.equal(env.requests, 2, 'le retour au premier plan doit redemander');
    await view.unmount();
  } finally {
    env.dom.restore();
  }
});

test('un verrou encore vivant n’est pas redemandé en double', async () => {
  const env = setup();
  try {
    const view = await renderHook(() => useWakeLock(true));
    await view.act(() => env.setVisibility('visible')); // sentinel non relâché
    assert.equal(env.requests, 1);
    await view.unmount();
  } finally {
    env.dom.restore();
  }
});

test('le verrou est relâché au démontage', async () => {
  const env = setup();
  try {
    const view = await renderHook(() => useWakeLock(true));
    await view.unmount();
    assert.equal(env.released, 1);
  } finally {
    env.dom.restore();
  }
});

test('LA FUITE DE molkky : une demande EN VOL au démontage est relâchée à son arrivée', async () => {
  // Quitter la partie pendant que la demande est en vol laissait le verrou
  // acquis pour toujours dans la copie de molkky : l'écran de l'utilisateur
  // restait allumé après la fin du match.
  const env = setup({ hold: true });
  try {
    const view = await renderHook(() => useWakeLock(true));
    assert.equal(env.requests, 1);
    assert.equal(env.released, 0, 'la demande est encore en vol');

    await view.unmount();
    await view.act(() => {
      env.pending.resolve();
      return env.pending.promise;
    });

    assert.equal(
      env.released,
      1,
      'la demande arrivée après coup doit être relâchée'
    );
  } finally {
    env.dom.restore();
  }
});

test('un refus de l’API ne remonte pas jusqu’à l’app', async () => {
  // Sans geste utilisateur, `request` rejette. Une PWA ne doit pas planter
  // pour un écran qui reste allumé une minute de moins.
  const env = setup({ reject: true });
  try {
    const view = await renderHook(() => useWakeLock(true));
    assert.equal(env.requests, 1);
    await view.unmount();
  } finally {
    env.dom.restore();
  }
});

test('sans l’API (Firefox, anciens Safari), le hook est inerte', async () => {
  const dom = setupDom();
  try {
    // `navigator.wakeLock` absent : le hook ne doit ni lever ni s'abonner.
    const view = await renderHook(() => useWakeLock(true));
    await view.unmount();
  } finally {
    dom.restore();
  }
});
