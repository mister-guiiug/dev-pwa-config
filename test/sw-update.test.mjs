/**
 * `sw-update.js` — appliquer une mise à jour, pour de vrai.
 *
 * Six apps portent un bouton « Forcer la mise à jour », avec six mécaniques
 * différentes. Les tests ci-dessous reproduisent d'abord les trois défauts
 * constatés dans ces copies, puis vérifient que la version promue ne les a pas.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import { setupDom, mount, renderHook } from './helpers/dom.mjs';
import { applyUpdate, hardNavigate } from '../sw-update.js';
import { useUpdatePrompt } from '../react/use-update-prompt.js';
import { UpdateButton } from '../react/update-button.js';
import { ShareButton } from '../react/share-button.js';
import { LabelsProvider } from '../react/labels.js';

/**
 * Faux service worker pilotable. `waiting` décide du chemin ; `activateAfter`
 * dit au bout de combien de temps `controllerchange` est émis (`null` = jamais,
 * ce qui est le cas quand le worker refuse d'activer).
 */
function fakeServiceWorker(options = {}) {
  const {
    waiting = false,
    activateAfter = 10,
    hangs = false,
    // Un vrai `ServiceWorkerRegistration` porte toujours une portée ; c'est
    // elle qui dit quelle URL le SERVEUR sait servir.
    scope = 'https://exemple.test/',
  } = options;
  const listeners = new Set();
  const journal = [];
  const registration = {
    scope,
    waiting: waiting
      ? {
          postMessage(message) {
            journal.push(`postMessage:${message.type}`);
            if (activateAfter === null) return;
            setTimeout(() => {
              for (const fn of [...listeners]) fn();
            }, activateAfter);
          },
        }
      : null,
    update() {
      journal.push('update');
      return Promise.resolve();
    },
    unregister() {
      journal.push('unregister');
      return Promise.resolve(true);
    },
  };
  return {
    journal,
    sw: {
      addEventListener: (_type, fn) => listeners.add(fn),
      removeEventListener: (_type, fn) => listeners.delete(fn),
      getRegistration: () =>
        hangs ? new Promise(() => {}) : Promise.resolve(registration),
      getRegistrations: () =>
        hangs ? new Promise(() => {}) : Promise.resolve([registration]),
    },
  };
}

function fakeCaches(names = ['workbox-precache', 'donnees-app']) {
  const remaining = new Set(names);
  return {
    remaining,
    caches: {
      keys: () => Promise.resolve([...remaining]),
      delete: name => {
        remaining.delete(name);
        return Promise.resolve(true);
      },
    },
  };
}

/** Installe un DOM plus un faux service worker, et rend de quoi tout retirer. */
function setupSw(options = {}) {
  // `url` traverse jusqu'à jsdom : c'est elle qui décide si la page courante
  // est une route profonde ou la racine de l'app.
  const dom = setupDom(options.url ? { url: options.url } : {});
  const { journal, sw } = fakeServiceWorker(options);
  const store = fakeCaches(options.cacheNames);
  Object.defineProperty(globalThis.navigator, 'serviceWorker', {
    value: sw,
    configurable: true,
  });
  globalThis.caches = store.caches;
  return {
    journal,
    caches: store,
    restore() {
      delete globalThis.caches;
      dom.restore();
    },
  };
}

test('un worker en attente : on n’active pas ET on ne recharge pas trop tôt', async () => {
  // LE DÉFAUT REPRODUIT : miss-genius et miss-uwh postent `SKIP_WAITING` puis
  // rechargent dans un `finally`, c'est-à-dire dans la foulée. L'activation
  // étant asynchrone, la page rechargée peut encore être servie par l'ANCIEN
  // worker. On vérifie donc que la navigation survient APRÈS `controllerchange`.
  const env = setupSw({ waiting: true, activateAfter: 20 });
  try {
    let active = false;
    globalThis.navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        active = true;
      }
    );
    let activeAuMomentDeNaviguer = null;
    const result = await applyUpdate({
      navigate: () => {
        activeAuMomentDeNaviguer = active;
        return true;
      },
    });
    assert.equal(result, 'activated');
    assert.equal(
      activeAuMomentDeNaviguer,
      true,
      'rechargement avant activation'
    );
    assert.deepEqual(env.journal, ['update', 'postMessage:SKIP_WAITING']);
    // Chemin propre : le cache est intact, l'app reste utilisable hors ligne.
    assert.equal(env.caches.remaining.size, 2);
  } finally {
    env.restore();
  }
});

test('aucun worker en attente : on purge au lieu de ne rien faire', async () => {
  // LE DÉFAUT REPRODUIT : `updateSW(true)` de vite-plugin-pwa ne fait
  // strictement rien sans worker en attente — le symptôme rapporté sur mobile,
  // documenté dans `mister-molkky/src/register-sw.ts`.
  const env = setupSw({ waiting: false });
  try {
    const cibles = [];
    const result = await applyUpdate({ navigate: cible => cibles.push(cible) });
    assert.equal(result, 'purged');
    assert.ok(env.journal.includes('unregister'));
    assert.equal(env.caches.remaining.size, 0, 'le cache devait être vidé');
    assert.equal(cibles.length, 1, 'une seule navigation');
    assert.match(
      cibles[0],
      /[?&]_t=/,
      'la destination doit contourner le cache HTTP'
    );
  } finally {
    env.restore();
  }
});

test('un worker qui n’active jamais bascule aussi sur la purge', async () => {
  const env = setupSw({ waiting: true, activateAfter: null });
  try {
    const result = await applyUpdate({
      activationTimeoutMs: 30,
      navigate: () => true,
    });
    assert.equal(result, 'purged');
    assert.ok(env.journal.includes('postMessage:SKIP_WAITING'));
    assert.ok(env.journal.includes('unregister'));
  } finally {
    env.restore();
  }
});

test('hard: true saute le chemin propre', async () => {
  const env = setupSw({ waiting: true });
  try {
    const result = await applyUpdate({ hard: true, navigate: () => true });
    assert.equal(result, 'purged');
    assert.ok(
      !env.journal.some(entry => entry.startsWith('postMessage')),
      'le chemin propre a été tenté malgré hard: true'
    );
  } finally {
    env.restore();
  }
});

test('keepCache épargne les caches de données', async () => {
  const env = setupSw({ waiting: false });
  try {
    await applyUpdate({
      navigate: () => true,
      keepCache: name => name === 'donnees-app',
    });
    assert.deepEqual([...env.caches.remaining], ['donnees-app']);
  } finally {
    env.restore();
  }
});

test('les données de l’utilisateur ne sont jamais touchées', async () => {
  // Les six copies tiennent cette ligne ; c'est la seule qui garde les parties,
  // l'historique et les réglages. Elle mérite un test, pas un commentaire.
  const env = setupSw({ waiting: false });
  try {
    globalThis.localStorage.setItem('parties', '[1,2,3]');
    await applyUpdate({ hard: true, navigate: () => true });
    assert.equal(globalThis.localStorage.getItem('parties'), '[1,2,3]');
  } finally {
    env.restore();
  }
});

test('une API qui pend ne laisse pas le bouton mort', async () => {
  // LE DÉFAUT REPRODUIT : sur iOS en mode autonome, `getRegistrations()` peut
  // bloquer plusieurs secondes. Sans plafond, le bouton ne rend jamais la main.
  const env = setupSw({ waiting: false, hangs: true });
  try {
    const debut = Date.now();
    const result = await applyUpdate({
      timeoutMs: 40,
      safetyMs: 5000,
      navigate: () => true,
    });
    assert.equal(result, 'purged');
    assert.ok(Date.now() - debut < 1000, 'la promesse a suivi l’API qui pend');
  } finally {
    env.restore();
  }
});

test('hardNavigate descend l’échelle quand une forme lève', () => {
  const dom = setupDom();
  try {
    const appels = [];
    const faux = {
      assign() {
        appels.push('assign');
        throw new Error('bloqué');
      },
      set href(value) {
        appels.push(`href:${value}`);
        throw new Error('bloqué');
      },
      replace() {
        appels.push('replace');
        return undefined;
      },
      reload() {
        appels.push('reload');
      },
    };
    const sauve = Object.getOwnPropertyDescriptor(globalThis, 'location');
    Object.defineProperty(globalThis, 'location', {
      value: faux,
      configurable: true,
    });
    try {
      assert.equal(hardNavigate('https://exemple.test/?_t=1'), true);
      assert.deepEqual(appels, [
        'assign',
        'href:https://exemple.test/?_t=1',
        'replace',
      ]);
    } finally {
      if (sauve) Object.defineProperty(globalThis, 'location', sauve);
      else delete globalThis.location;
    }
  } finally {
    dom.restore();
  }
});

/* ── useUpdatePrompt ─────────────────────────────────────────────────────── */

/** Faux `registerSW`, avec de quoi déclencher `onNeedRefresh` depuis le test. */
function fakeRegisterSW() {
  const state = { calls: 0, needRefresh: null, offlineReady: null };
  const registerSW = options => {
    state.calls += 1;
    state.needRefresh = options?.onNeedRefresh;
    state.offlineReady = options?.onOfflineReady;
    return () => Promise.resolve();
  };
  return { state, registerSW };
}

test('le bandeau apparaît quand le worker signale une version, pas avant', async () => {
  const env = setupSw({ waiting: true });
  try {
    const { state, registerSW } = fakeRegisterSW();
    const view = await renderHook(() => useUpdatePrompt({ registerSW }));
    assert.equal(view.result.current.visible, false);
    await view.act(() => state.needRefresh());
    assert.equal(view.result.current.visible, true);
    await view.act(() => view.result.current.dismiss());
    assert.equal(view.result.current.visible, false);
    await view.unmount();
  } finally {
    env.restore();
  }
});

test('registerSW n’est appelé qu’une fois, quel que soit le nombre de montages', async () => {
  // `registerSW` pose des écouteurs : deux appels les doublent. Le double effet
  // de `StrictMode` suffit à provoquer le cas.
  const env = setupSw();
  try {
    const { state, registerSW } = fakeRegisterSW();
    const a = await renderHook(() => useUpdatePrompt({ registerSW }));
    const b = await renderHook(() => useUpdatePrompt({ registerSW }));
    assert.equal(state.calls, 1);
    // Et les deux montages voient bien le même signal.
    await a.act(() => state.needRefresh());
    assert.equal(a.result.current.visible, true);
    assert.equal(b.result.current.visible, true);
    await a.unmount();
    await b.unmount();
  } finally {
    env.restore();
  }
});

test('le report survit au rechargement, l’écart se lit dans localStorage', async () => {
  const env = setupSw();
  try {
    const { state, registerSW } = fakeRegisterSW();
    const view = await renderHook(() =>
      useUpdatePrompt({ registerSW, snoozeHours: 24, snoozeKey: 'essai' })
    );
    await view.act(() => state.needRefresh());
    assert.equal(view.result.current.visible, true);
    await view.act(() => view.result.current.snooze());
    assert.equal(view.result.current.visible, false);
    const until = Number(globalThis.localStorage.getItem('essai'));
    assert.ok(until > Date.now() + 23 * 3_600_000);
    await view.unmount();
  } finally {
    env.restore();
  }
});

test('sans registerSW, le bouton « Forcer » fonctionne quand même', async () => {
  // C'est tout l'intérêt de l'injection : six apps ont ce bouton dans leurs
  // réglages, où `needRefresh` est faux et le bandeau n'existe pas.
  const env = setupSw({ waiting: false });
  try {
    const view = await renderHook(() => useUpdatePrompt());
    assert.equal(view.result.current.needRefresh, false);
    await view.act(async () => {
      await view.result.current.forceUpdate();
    });
    assert.ok(env.journal.includes('unregister'));
    await view.unmount();
  } finally {
    env.restore();
  }
});

test('UpdateButton dit ce qu’il fait, dans la langue du provider', async () => {
  const env = setupSw({ waiting: false });
  try {
    const view = await mount(
      h(LabelsProvider, { locale: 'en' }, h(UpdateButton, { showHint: true }))
    );
    assert.match(view.container.innerHTML, />Force update</);
    assert.match(view.container.innerHTML, /Clears the app cache/);
    await view.unmount();

    const fr = await mount(h(UpdateButton, {}));
    assert.match(fr.container.innerHTML, />Forcer la mise à jour</);
    // Sans `showHint`, aucun paragraphe parasite.
    assert.doesNotMatch(fr.container.innerHTML, /<p/);
    await fr.unmount();
  } finally {
    env.restore();
  }
});

/*
 * LE DÉFAUT, CONSTATÉ EN LIGNE. Une app monopage sur hébergement statique n'a
 * de fichier qu'à sa racine : `/mister-family-map/profil` n'existe pas côté
 * serveur, et ne répond que parce que le service worker la rattrape. Purger le
 * worker détruit donc ce qui rendait l'URL courante joignable — et recharger
 * cette même URL juste après renvoie le 404 de l'hébergeur.
 *
 * Reproduit sur un serveur statique sans repli : « Forcer la mise à jour »
 * depuis `/profil` menait à `/profil?_t=…` et à « 404 — File not found ».
 * Invisible en développement, où `vite preview` sert `index.html` pour
 * n'importe quel chemin.
 */
test('après une purge, on ne renvoie pas vers une route que le serveur ignore', async () => {
  const env = setupSw({
    url: 'https://exemple.test/mister-family-map/profil',
    scope: 'https://exemple.test/mister-family-map/',
  });
  try {
    const cibles = [];
    const chemin = await applyUpdate({
      hard: true,
      navigate: cible => {
        cibles.push(cible);
        return true;
      },
    });

    assert.equal(chemin, 'purged');
    assert.equal(cibles.length, 1);
    assert.match(
      cibles[0],
      /^https:\/\/exemple\.test\/mister-family-map\/\?_t=/,
      'la purge doit ramener à la portée du worker, seule URL que le serveur sert'
    );
    assert.ok(
      !cibles[0].includes('/profil'),
      'renvoyer sur la route courante après avoir désinscrit le worker donne un 404'
    );
  } finally {
    env.restore();
  }
});

test('le chemin PROPRE, lui, reste sur la page courante', async () => {
  // Le worker n'est pas désinscrit : la route continue d'être rattrapée, et
  // l'utilisateur n'a aucune raison de perdre l'écran où il se trouvait.
  const env = setupSw({
    waiting: true,
    url: 'https://exemple.test/mister-family-map/profil',
    scope: 'https://exemple.test/mister-family-map/',
  });
  try {
    const cibles = [];
    const chemin = await applyUpdate({
      navigate: cible => {
        cibles.push(cible);
        return true;
      },
    });
    assert.equal(chemin, 'activated');
    assert.match(cibles[0], /\/mister-family-map\/profil\?_t=/);
  } finally {
    env.restore();
  }
});

test('reloadTo garde le dernier mot sur la portée', async () => {
  const env = setupSw({
    url: 'https://exemple.test/mister-family-map/profil',
    scope: 'https://exemple.test/mister-family-map/',
  });
  try {
    const cibles = [];
    await applyUpdate({
      hard: true,
      reloadTo: 'https://exemple.test/mister-family-map/bienvenue',
      navigate: cible => {
        cibles.push(cible);
        return true;
      },
    });
    assert.equal(cibles[0], 'https://exemple.test/mister-family-map/bienvenue');
  } finally {
    env.restore();
  }
});

/* ── Le bouton « Partager » ────────────────────────────────────────────── */

/**
 * `share.js` a été promu ; les boutons, non. Le relevé donne trois façons de
 * répondre à la même question — que montrer quand on a copié faute de partage
 * natif — dont aucune ne distingue l'annulation d'un échec.
 */
test('une copie s’annonce, une annulation ne dit rien', async () => {
  const dom = setupDom();
  try {
    const resultats = [];
    let issue = 'copied';
    const view = await mount(
      h(ShareButton, {
        url: 'https://exemple.test/',
        share: async () => issue,
        onResult: r => resultats.push(r),
        resetAfterMs: 0,
      })
    );
    const bouton = view.container.querySelector('[data-dwc="share-button"]');
    const statut = view.container.querySelector(
      '[data-dwc="share-button-status"]'
    );

    // La région vivante existe AVANT d'avoir quelque chose à dire : insérée en
    // même temps que son texte, elle ne serait pas lue de façon fiable.
    assert.equal(statut.getAttribute('role'), 'status');
    assert.equal(statut.textContent, '');

    await view.act(() => bouton.click());
    assert.equal(statut.textContent, 'Lien copié');
    assert.deepEqual(resultats, ['copied']);

    // Une annulation n'est pas un échec : rien ne s'affiche.
    issue = 'cancelled';
    await view.act(() => bouton.click());
    assert.deepEqual(resultats, ['copied', 'cancelled']);

    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('un partage natif abouti n’affiche rien : le système l’a déjà dit', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(ShareButton, { share: async () => 'shared', resetAfterMs: 0 })
    );
    const bouton = view.container.querySelector('[data-dwc="share-button"]');
    await view.act(() => bouton.click());
    assert.equal(
      view.container.querySelector('[data-dwc="share-button-status"]')
        .textContent,
      ''
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('un échec le dit, et le message finit par s’effacer', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(ShareButton, { share: async () => 'failed', resetAfterMs: 20 })
    );
    const bouton = view.container.querySelector('[data-dwc="share-button"]');
    const statut = view.container.querySelector(
      '[data-dwc="share-button-status"]'
    );

    await view.act(() => bouton.click());
    assert.equal(statut.textContent, 'Partage impossible');

    // Sans retour à l'état initial, « Lien copié » mentirait au prochain regard.
    await view.act(async () => {
      await new Promise(resolve => setTimeout(resolve, 40));
    });
    assert.equal(statut.textContent, '');

    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('les libellés du bouton de partage suivent la locale', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(
        LabelsProvider,
        { locale: 'en' },
        h(ShareButton, { share: async () => 'copied', resetAfterMs: 0 })
      )
    );
    const bouton = view.container.querySelector('[data-dwc="share-button"]');
    assert.equal(bouton.textContent, 'Share');
    await view.act(() => bouton.click());
    assert.equal(
      view.container.querySelector('[data-dwc="share-button-status"]')
        .textContent,
      'Link copied'
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});
