/**
 * `sw-update.js` — appliquer une mise à jour, pour de vrai.
 *
 * Six apps portent un bouton « Forcer la mise à jour », avec six mécaniques
 * différentes. Les tests ci-dessous reproduisent d'abord les trois défauts
 * constatés dans ces copies, puis vérifient que la version promue ne les a pas.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createElement as h } from 'react';

import { setupDom, mount, renderHook } from './helpers/dom.mjs';
import {
  applyUpdate,
  hardNavigate,
  unregisterServiceWorkers,
} from '../sw-update.js';
import { useUpdatePrompt } from '../react/use-update-prompt.js';
import { UpdatePromptBanner } from '../react/update-prompt-banner.js';
import { AppUpdates } from '../react/app-updates.js';
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
  const state = {
    calls: 0,
    needRefresh: null,
    offlineReady: null,
    /** Tout ce que le socle a confié à `registerSW`, rappels compris. */
    options: null,
  };
  const registerSW = options => {
    state.calls += 1;
    state.options = options;
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

/* ── unregisterServiceWorkers ────────────────────────────────────────────── */

/**
 * Les cinq copies (`miss-badminton`, `miss-contraction`, `miss-dice`,
 * `miss-ticket-pwa`, `mister-molkky`) écrivent toutes la même chose dans leur
 * `register-sw.ts`, et toutes de la même façon :
 *
 *   navigator.serviceWorker.getRegistrations()
 *     .then(regs => regs.forEach(r => r.unregister()))
 *     .catch(() => {})
 *
 * Les tests ci-dessous éprouvent les trois points où la version promue s'en
 * écarte : le rejet de chaque désinscription est capté, l'API est plafonnée, et
 * le compte revient à l'appelant.
 */
function fakeRegistrations(results) {
  const journal = [];
  return {
    journal,
    sw: {
      getRegistrations: () =>
        Promise.resolve(
          results.map((issue, index) => ({
            unregister() {
              journal.push(`unregister:${index}`);
              return issue === 'boom'
                ? Promise.reject(new Error('désinscription refusée'))
                : Promise.resolve(issue);
            },
          }))
        ),
    },
  };
}

function withServiceWorker(sw) {
  const dom = setupDom();
  Object.defineProperty(globalThis.navigator, 'serviceWorker', {
    value: sw,
    configurable: true,
  });
  return dom;
}

test('désinscrit tout, et dit combien de workers sont tombés', async () => {
  const { journal, sw } = fakeRegistrations([true, true]);
  const dom = withServiceWorker(sw);
  try {
    assert.equal(await unregisterServiceWorkers(), 2);
    assert.deepEqual(journal, ['unregister:0', 'unregister:1']);
  } finally {
    dom.restore();
  }
});

test('une désinscription qui échoue n’emporte pas les autres', async () => {
  // LE DÉFAUT REPRODUIT. Le `.catch()` des cinq copies ne couvre QUE
  // `getRegistrations()` : chaque `unregister()` crée sa propre promesse, hors
  // de la chaîne captée. Une seule qui rejette, et c'est un
  // `unhandledrejection` — pendant le démarrage de l'app, qui plus est.
  const { journal, sw } = fakeRegistrations([true, 'boom', true]);
  const dom = withServiceWorker(sw);
  try {
    assert.equal(await unregisterServiceWorkers(), 2);
    assert.equal(journal.length, 3, 'les trois ont bien été tentées');
  } finally {
    dom.restore();
  }
});

test('une API qui pend ne bloque pas le démarrage de l’app', async () => {
  // Même `getRegistrations()` que le bouton « Forcer », donc même risque de
  // blocage sur iOS en mode autonome. Aucune des cinq copies ne le plafonne :
  // sur le chemin du démarrage, l'attente est simplement invisible.
  const dom = withServiceWorker({
    getRegistrations: () => new Promise(() => {}),
  });
  try {
    const debut = Date.now();
    assert.equal(await unregisterServiceWorkers({ timeoutMs: 30 }), 0);
    assert.ok(Date.now() - debut < 1000, 'la promesse a suivi l’API qui pend');
  } finally {
    dom.restore();
  }
});

test('sans API service worker, c’est zéro — pas une exception', async () => {
  const dom = setupDom();
  try {
    assert.equal(await unregisterServiceWorkers(), 0);
  } finally {
    dom.restore();
  }
});

test('la désinscription de dev ne touche NI les caches NI les données', async () => {
  // C'est ce qui la distingue d'`applyUpdate` : elle ne purge pas, ne recharge
  // pas. Un développeur qui la déclenche à chaque démarrage ne doit pas perdre
  // l'état de son app à chaque rechargement.
  const env = setupSw({ waiting: false });
  try {
    globalThis.localStorage.setItem('parties', '[1,2,3]');
    assert.equal(await unregisterServiceWorkers(), 1);
    assert.equal(env.caches.remaining.size, 2, 'un cache a été vidé');
    assert.equal(globalThis.localStorage.getItem('parties'), '[1,2,3]');
  } finally {
    env.restore();
  }
});

/* ── Les rappels d'enregistrement ne sont plus avalés ────────────────────── */

test('onRegisterError remonte à l’app : une panne muette redevient visible', async () => {
  // LE DÉFAUT REPRODUIT. `connect()` ne passait que `immediate`,
  // `onNeedRefresh` et `onOfflineReady`. `mister-doc` a dû enrober `registerSW`
  // dans une constante de module pour garder sa journalisation — sans quoi un
  // enregistrement raté est indiscernable d'une app à jour.
  const env = setupSw();
  try {
    const premiers = [];
    const seconds = [];
    const { state, registerSW } = fakeRegisterSW();
    const view = await mount(
      h(UpdatePromptBanner, {
        registerSW,
        onRegisterError: error => premiers.push(error),
      })
    );

    assert.equal(typeof state.options.onRegisterError, 'function');
    await view.act(() =>
      state.options.onRegisterError(new Error('injoignable'))
    );
    assert.equal(premiers.length, 1);

    // Le rappel est lu au moment où le worker parle, pas à l'enregistrement :
    // une fonction écrite en ligne peut donc changer sans ré-enregistrer.
    await view.rerender(
      h(UpdatePromptBanner, {
        registerSW,
        onRegisterError: error => seconds.push(error),
      })
    );
    await view.act(() => state.options.onRegisterError(new Error('encore')));
    assert.equal(seconds.length, 1, 'le rappel du dernier rendu doit servir');
    assert.equal(premiers.length, 1);
    assert.equal(state.calls, 1, 'un rappel changé a ré-enregistré le worker');

    await view.unmount();
  } finally {
    env.restore();
  }
});

test('onRegisteredSW remonte aussi : c’est ce qui arme une revérification', async () => {
  // `mister-qowa` enrobe `registerSW` pour ce seul rappel, dont il tire un
  // `setInterval(() => registration.update(), 1h)`.
  const env = setupSw();
  try {
    const vus = [];
    const { state, registerSW } = fakeRegisterSW();
    const view = await mount(
      h(UpdatePromptBanner, {
        registerSW,
        onRegisteredSW: (url, registration) => vus.push([url, registration]),
      })
    );
    await view.act(() => state.options.onRegisteredSW('/sw.js', { id: 1 }));
    assert.deepEqual(vus, [['/sw.js', { id: 1 }]]);
    await view.unmount();
  } finally {
    env.restore();
  }
});

/* ── snoozeKey : le report d'une bannière écrite à la main ───────────────── */

test('le bandeau reporte sous la clé de l’app, pas sous celle du socle', async () => {
  const env = setupSw();
  try {
    const { state, registerSW } = fakeRegisterSW();
    const view = await mount(
      h(UpdatePromptBanner, {
        registerSW,
        snoozeHours: 24,
        snoozeKey: 'puzzle_snooze_until_ms',
      })
    );
    await view.act(() => state.needRefresh());
    await view.act(() =>
      view.container.querySelector('[data-dwc="update-banner-dismiss"]').click()
    );

    const until = Number(
      globalThis.localStorage.getItem('puzzle_snooze_until_ms')
    );
    assert.ok(until > Date.now() + 23 * 3_600_000);
    assert.equal(
      globalThis.localStorage.getItem('dwc_sw_update_snoozed_until'),
      null,
      'la clé du socle a servi malgré snoozeKey'
    );
    await view.unmount();
  } finally {
    env.restore();
  }
});

test('un report déjà en cours sous la clé de l’app est respecté', async () => {
  // LE DÉFAUT REPRODUIT. `mister-puzzle` a dû verser son report en cours dans
  // la clé du socle au chargement de son module : sans `snoozeKey`, la
  // migration oubliait tout report actif et le bandeau revenait aussitôt —
  // chez ceux qui avaient justement demandé le silence.
  const env = setupSw();
  try {
    globalThis.localStorage.setItem(
      'puzzle_snooze_until_ms',
      String(Date.now() + 3_600_000)
    );
    const { state, registerSW } = fakeRegisterSW();
    const view = await mount(
      h(UpdatePromptBanner, {
        registerSW,
        snoozeHours: 24,
        snoozeKey: 'puzzle_snooze_until_ms',
      })
    );
    await view.act(() => state.needRefresh());
    assert.equal(
      view.container.querySelector('[data-dwc="update-banner"]'),
      null,
      'le report en cours a été ignoré'
    );
    await view.unmount();
  } finally {
    env.restore();
  }
});

test('AppUpdates : le report qu’il tient est atteignable au clic', async () => {
  // LE DÉFAUT TROUVÉ EN CHEMIN. Le fournisseur lisait `snoozeHours` pour
  // calculer l'état, mais ne le passait PAS au bandeau : celui-ci retombait sur
  // `0`, donc sur « écarter pour la session ». Le report existait dans l'état
  // et n'était atteignable par aucun clic.
  const env = setupSw();
  try {
    const { state, registerSW } = fakeRegisterSW();
    const view = await mount(
      h(AppUpdates, {
        registerSW,
        snoozeHours: 24,
        snoozeKey: 'fournisseur_snooze',
      })
    );
    await view.act(() => state.needRefresh());
    await view.act(() =>
      view.container.querySelector('[data-dwc="update-banner-dismiss"]').click()
    );

    const until = Number(globalThis.localStorage.getItem('fournisseur_snooze'));
    assert.ok(
      until > Date.now() + 23 * 3_600_000,
      'le clic a écarté pour la session au lieu de reporter'
    );
    await view.unmount();
  } finally {
    env.restore();
  }
});

/* ── Deux sorties, et le message « prêt hors ligne » ─────────────────────── */

/** Les libellés des boutons du bandeau, dans l'ordre du DOM. */
function boutons(container) {
  return [...container.querySelectorAll('button')].map(b => b.textContent);
}

test('secondaryActions « both » rend le report ET l’écartement de session', async () => {
  // LE DÉFAUT REPRODUIT. `mister-puzzle` offrait DEUX sorties — « Plus tard
  // (24 h) », persistée, et « Ignorer », le temps de la session. Le socle n'en
  // rendait qu'une : la migration a fait disparaître la seconde.
  const env = setupSw();
  try {
    const { state, registerSW } = fakeRegisterSW();
    const view = await mount(
      h(UpdatePromptBanner, {
        registerSW,
        snoozeHours: 24,
        snoozeKey: 'puzzle_deux_sorties',
        secondaryActions: 'both',
      })
    );
    await view.act(() => state.needRefresh());

    const ignorer = view.container.querySelector(
      '[data-dwc="update-banner-ignore"]'
    );
    assert.ok(ignorer, 'la seconde sortie n’a pas été rendue');

    // La seconde écarte pour la SESSION : rien ne doit être écrit.
    await view.act(() => ignorer.click());
    assert.equal(
      view.container.querySelector('[data-dwc="update-banner"]'),
      null,
      'le bandeau devait disparaître'
    );
    assert.equal(
      globalThis.localStorage.getItem('puzzle_deux_sorties'),
      null,
      'l’écartement de session a persisté un report'
    );
    await view.unmount();
  } finally {
    env.restore();
  }
});

test('la première sortie reporte toujours, et garde son sélecteur', async () => {
  // `'both'` AJOUTE un bouton, il n'en déplace aucun : `update-banner-dismiss`
  // désigne le même bouton, avec la même action. Deux apps l'habillent dans
  // leur CSS (miss-carbook, miss-genius) ; opter pour deux sorties ne doit rien
  // leur décoiffer.
  const env = setupSw();
  try {
    const { state, registerSW } = fakeRegisterSW();
    const view = await mount(
      h(UpdatePromptBanner, {
        registerSW,
        snoozeHours: 24,
        snoozeKey: 'puzzle_premiere_sortie',
        secondaryActions: 'both',
      })
    );
    await view.act(() => state.needRefresh());
    await view.act(() =>
      view.container.querySelector('[data-dwc="update-banner-dismiss"]').click()
    );

    const until = Number(
      globalThis.localStorage.getItem('puzzle_premiere_sortie')
    );
    assert.ok(
      until > Date.now() + 23 * 3_600_000,
      'le bouton historique a cessé de reporter'
    );
    await view.unmount();
  } finally {
    env.restore();
  }
});

test('les deux sorties ne disent pas la même chose', async () => {
  // `labels.update.snooze` et `labels.update.dismiss` valent TOUS DEUX « Plus
  // tard » : chacun est seul à l'écran dans le mode `'auto'`, et c'est juste.
  // Côte à côte, ils ne diraient plus lequel persiste — d'où `update.ignore`.
  const env = setupSw();
  try {
    const { state, registerSW } = fakeRegisterSW();
    const view = await mount(
      h(
        LabelsProvider,
        { locale: 'en' },
        h(UpdatePromptBanner, {
          registerSW,
          snoozeHours: 24,
          secondaryActions: 'both',
        })
      )
    );
    await view.act(() => state.needRefresh());

    const labels = boutons(view.container);
    assert.deepEqual(labels, ['Reload', 'Later', 'Dismiss']);
    assert.equal(
      new Set(labels).size,
      labels.length,
      'deux boutons portent le même libellé'
    );
    await view.unmount();
  } finally {
    env.restore();
  }
});

test('sans report à offrir, « both » ne double pas l’écartement', async () => {
  // `snoozeHours` à 0 : il n'y a rien à reporter. Deux boutons qui écartent
  // tous deux pour la session ne diraient rien de plus que le seul d'« auto ».
  const env = setupSw();
  try {
    const { state, registerSW } = fakeRegisterSW();
    const view = await mount(
      h(UpdatePromptBanner, { registerSW, secondaryActions: 'both' })
    );
    await view.act(() => state.needRefresh());

    assert.equal(boutons(view.container).length, 2);
    assert.equal(
      view.container.querySelector('[data-dwc="update-banner-ignore"]'),
      null
    );
    await view.unmount();
  } finally {
    env.restore();
  }
});

test('par défaut, le bandeau garde son unique sortie', async () => {
  const env = setupSw();
  try {
    const { state, registerSW } = fakeRegisterSW();
    const view = await mount(
      h(UpdatePromptBanner, { registerSW, snoozeHours: 24 })
    );
    await view.act(() => state.needRefresh());

    assert.deepEqual(boutons(view.container), ['Recharger', 'Plus tard']);
    await view.unmount();
  } finally {
    env.restore();
  }
});

test('le message « prêt hors ligne » n’apparaît que si on le demande', async () => {
  // LE RESTE LOCAL REPRODUIT. `useUpdatePrompt` exposait `offlineReady` depuis
  // toujours, et rien ne l'affichait : `miss-genius` gardait pour ça un
  // `OfflineReadyNotice` à elle.
  const env = setupSw();
  try {
    const { state, registerSW } = fakeRegisterSW();
    const muet = await mount(h(UpdatePromptBanner, { registerSW }));
    await muet.act(() => state.offlineReady());
    assert.equal(
      muet.container.querySelector('[data-dwc="offline-ready"]'),
      null,
      'le défaut a changé : le message s’affiche sans qu’on le demande'
    );
    await muet.unmount();

    const view = await mount(
      h(UpdatePromptBanner, { registerSW, showOfflineReady: true })
    );
    await view.act(() => state.offlineReady());
    assert.equal(
      view.container.querySelector('[data-dwc="offline-ready-title"]')
        ?.textContent,
      'L’application fonctionne maintenant hors ligne.'
    );
    await view.unmount();
  } finally {
    env.restore();
  }
});

test('une mise à jour qui attend fait taire le message hors ligne', async () => {
  // LA PRÉCÉDENCE DE miss-genius, promue telle quelle : les deux messages ne se
  // chevauchent jamais, et c'est la mise à jour qui l'emporte — y compris une
  // fois son bandeau écarté, sans quoi l'écartement ferait surgir l'autre.
  const env = setupSw();
  try {
    const { state, registerSW } = fakeRegisterSW();
    const view = await mount(
      h(UpdatePromptBanner, { registerSW, showOfflineReady: true })
    );
    await view.act(() => state.offlineReady());
    await view.act(() => state.needRefresh());

    assert.ok(view.container.querySelector('[data-dwc="update-banner"]'));
    assert.equal(
      view.container.querySelector('[data-dwc="offline-ready"]'),
      null,
      'les deux messages se sont chevauchés'
    );

    await view.act(() =>
      view.container.querySelector('[data-dwc="update-banner-dismiss"]').click()
    );
    assert.equal(
      view.container.querySelector('[data-dwc="offline-ready"]'),
      null,
      'écarter la mise à jour a fait surgir le message hors ligne'
    );
    await view.unmount();
  } finally {
    env.restore();
  }
});

test('le message hors ligne se referme, et ne revient pas', async () => {
  const env = setupSw();
  try {
    const { state, registerSW } = fakeRegisterSW();
    const view = await mount(
      h(UpdatePromptBanner, {
        registerSW,
        showOfflineReady: true,
        offlineReadyTitle: 'Prête hors ligne',
        offlineReadyLabel: 'Compris',
      })
    );
    await view.act(() => state.offlineReady());
    assert.deepEqual(boutons(view.container), ['Compris']);

    await view.act(() =>
      view.container.querySelector('[data-dwc="offline-ready-dismiss"]').click()
    );
    assert.equal(
      view.container.querySelector('[data-dwc="offline-ready"]'),
      null
    );

    // Le service worker peut resignaler : le message reste fermé.
    await view.act(() => state.offlineReady());
    assert.equal(
      view.container.querySelector('[data-dwc="offline-ready"]'),
      null,
      'le message refermé est revenu'
    );
    await view.unmount();
  } finally {
    env.restore();
  }
});

test('AppUpdates transmet les deux sorties par bannerProps', async () => {
  const env = setupSw();
  try {
    const { state, registerSW } = fakeRegisterSW();
    const view = await mount(
      h(AppUpdates, {
        registerSW,
        snoozeHours: 24,
        snoozeKey: 'fournisseur_deux_sorties',
        bannerProps: { secondaryActions: 'both' },
      })
    );
    await view.act(() => state.needRefresh());

    assert.ok(
      view.container.querySelector('[data-dwc="update-banner-ignore"]'),
      'le fournisseur a avalé secondaryActions'
    );
    await view.unmount();
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

/**
 * LE MODE `autoUpdate` N'AVAIT AUCUNE HISTOIRE — trois apps sur dix-sept y sont.
 *
 * `vite-plugin-pwa` se coupe en deux sur `registerType` : la branche `prompt`
 * est le SEUL appelant d'`onNeedRefresh`, la branche `auto` n'appelle
 * qu'`onNeedReload`. `connect()` ne passait pas ce dernier, si bien qu'en
 * `autoUpdate` le bandeau du paquet ne pouvait **jamais** s'allumer — et qu'une
 * app adoptant `UpdatePromptBanner` y posait un composant invisible.
 *
 * Le fournir change en outre ce que fait le plugin : sa documentation dit
 * « called when the service worker has taken control and the page would
 * normally reload — useful to fully control the reload flow ». Sans rappel, il
 * recharge seul ; avec, il rend la main. C'est le seul moyen de différer un
 * rechargement qui tomberait au mauvais moment — `miss-contraction`, qu'on
 * utilise pendant un accouchement, est précisément dans ce cas.
 *
 * Constaté en migrant `miss-contraction` (#23).
 */
test('onNeedReload est transmis : le mode autoUpdate cesse d’être muet', async () => {
  const env = setupSw();
  try {
    const rechargements = [];
    const { state, registerSW } = fakeRegisterSW();
    const view = await mount(
      h(UpdatePromptBanner, {
        registerSW,
        onNeedReload: () => rechargements.push('appelé'),
      })
    );

    assert.equal(
      typeof state.options.onNeedReload,
      'function',
      'sans ce rappel, vite-plugin-pwa recharge seul et l’app ne sait rien'
    );
    await view.act(() => state.options.onNeedReload());
    assert.deepEqual(rechargements, ['appelé']);

    await view.unmount();
  } finally {
    env.restore();
  }
});

test('sans rappel de l’app, onNeedReload ne fait rien — le plugin garde la main', () => {
  // Le relais ne DOIT PAS poser un rappel vide : le fournir suffit à
  // désactiver le rechargement automatique du plugin. Une app qui n'en veut
  // pas garderait alors une page qui ne se recharge plus, sans rien demander.
  const source = readFileSync(
    new URL('../react/use-update-prompt.js', import.meta.url),
    'utf8'
  );
  assert.match(
    source,
    /onNeedReload\(\)\s*\{\s*relay\('onNeedReload'\)\?\.\(\);\s*\}/,
    'le relais doit rester optionnel (`?.`), sinon le comportement du plugin change pour tout le monde'
  );
});

/**
 * `onRegistered` ÉTAIT MORT, et silencieusement.
 *
 * `vite-plugin-pwa` écrit `if (onRegisteredSW) onRegisteredSW(…); else
 * onRegistered?.(…)` (`dist/client/build/register.js`) — or `connect()` lui
 * passait TOUJOURS un `onRegisteredSW`. Le rappel déprécié n'avait donc aucune
 * chance d'être appelé : une app qui migrait son `onRegistered` vers ce hook
 * perdait sa journalisation d'enregistrement **sans un mot**, et le relais
 * ajouté pour elle ne servait à rien.
 *
 * Relevé en migrant `mister-cim10` (#28), qui posait exactement ce rappel.
 */
test('onRegistered est appelé quand l’app n’a pas d’onRegisteredSW', async () => {
  const env = setupSw();
  try {
    const vus = [];
    const { state, registerSW } = fakeRegisterSW();
    const view = await mount(
      h(UpdatePromptBanner, {
        registerSW,
        onRegistered: registration => vus.push(registration),
      })
    );
    await view.act(() => state.options.onRegisteredSW('/sw.js', { id: 1 }));
    assert.deepEqual(
      vus,
      [{ id: 1 }],
      'le rappel déprécié doit rester joignable'
    );
    await view.unmount();
  } finally {
    env.restore();
  }
});

test('le rappel moderne l’emporte, et l’ancien ne double pas', async () => {
  // C'est la règle du plugin, reproduite un cran plus haut : l'un OU l'autre,
  // jamais les deux — sans quoi une app qui passe les deux verrait sa
  // journalisation dupliquée en adoptant le paquet.
  const env = setupSw();
  try {
    const modernes = [];
    const anciens = [];
    const { state, registerSW } = fakeRegisterSW();
    const view = await mount(
      h(UpdatePromptBanner, {
        registerSW,
        onRegisteredSW: (url, reg) => modernes.push([url, reg]),
        onRegistered: reg => anciens.push(reg),
      })
    );
    await view.act(() => state.options.onRegisteredSW('/sw.js', { id: 2 }));
    assert.equal(modernes.length, 1);
    assert.deepEqual(anciens, [], 'l’ancien ne doit pas doubler le moderne');
    await view.unmount();
  } finally {
    env.restore();
  }
});
