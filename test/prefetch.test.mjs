// Préchargement des routes découpées (`prefetch.js`).
//
// CE QUI SE JOUE ICI. Un préchargement mal fait est pire que pas de
// préchargement : il double le téléchargement, dépense le forfait de
// l'utilisateur, ou fait remonter des « erreurs » qui n'en sont pas. Les trois
// sont éprouvés.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const load = () => import('../prefetch.js');

test('un chargeur n’est déclenché qu’UNE fois', async () => {
  const { prefetch, isPrefetched } = await load();
  let appels = 0;
  const loader = async () => {
    appels += 1;
  };

  assert.equal(prefetch(loader), true);
  assert.equal(prefetch(loader), false, 'le deuxième appel ne repart pas');
  assert.equal(prefetch(loader), false);
  assert.equal(appels, 1, 'le morceau ne se télécharge qu’une fois');
  assert.equal(isPrefetched(loader), true);
});

test('un préchargement qui échoue ne remonte PAS comme une erreur', async () => {
  const { prefetch } = await load();
  const rejets = [];
  const onRejection = e => {
    rejets.push(e);
    e.preventDefault?.();
  };
  process.on('unhandledRejection', onRejection);
  try {
    // Le réseau tombe : l'utilisateur cliquera, et `lazy()` retentera pour de
    // vrai. Une promesse rejetée ici polluerait le rapport d'erreurs d'un
    // incident qui n'en est pas un.
    prefetch(() => Promise.reject(new Error('réseau coupé')));
    // Et un chargeur qui lève À L'APPEL, pas seulement en promesse.
    assert.doesNotThrow(() =>
      prefetch(() => {
        throw new Error('module introuvable');
      })
    );
    await new Promise(resolve => setTimeout(resolve, 10));
    assert.deepEqual(rejets, [], 'aucun rejet non traité ne doit s’échapper');
  } finally {
    process.off('unhandledRejection', onRejection);
  }
});

test('on ne dépense pas le forfait de qui a demandé d’économiser', async () => {
  const { shouldPrefetch } = await load();

  assert.equal(shouldPrefetch({ saveData: true, effectiveType: '4g' }), false);
  assert.equal(shouldPrefetch({ effectiveType: '2g' }), false);
  assert.equal(shouldPrefetch({ effectiveType: 'slow-2g' }), false);
  assert.equal(shouldPrefetch({ effectiveType: '3g' }), true);
  assert.equal(shouldPrefetch({ effectiveType: '4g' }), true);
  // Pas d'information : on précharge. Refuser par défaut désactiverait la
  // fonction sur Safari et Firefox, qui n'exposent pas `connection`.
  assert.equal(shouldPrefetch(undefined), true);
  assert.equal(shouldPrefetch({}), true);
});

test('l’intention se lit au pointeur ET au focus', async () => {
  const { prefetchOnIntent, INTENT_EVENTS } = await load();

  // La navigation au clavier mérite le même confort que la souris : c'est le
  // genre de détail qu'on oublie en ne testant qu'à la souris.
  assert.ok(INTENT_EVENTS.includes('focus'), 'le clavier doit compter');
  assert.ok(INTENT_EVENTS.includes('pointerenter'));
  assert.ok(INTENT_EVENTS.includes('touchstart'));

  const listeners = new Map();
  const element = {
    addEventListener: (name, fn, options) =>
      listeners.set(name, { fn, options }),
    removeEventListener: name => listeners.delete(name),
  };

  let appels = 0;
  const stop = prefetchOnIntent(element, async () => {
    appels += 1;
  });

  assert.equal(listeners.size, INTENT_EVENTS.length);
  // `touchstart` non passif bloque le défilement le temps du gestionnaire.
  assert.equal(listeners.get('touchstart').options.passive, true);

  listeners.get('focus').fn();
  assert.equal(appels, 1);
  // Déclenché : les écouteurs se retirent d'eux-mêmes, il n'y a plus rien à
  // guetter.
  assert.equal(listeners.size, 0);

  assert.doesNotThrow(stop, 'le désabonnement reste sûr après coup');
});

test('sans élément ni observateur, on ne fait rien plutôt que tout', async () => {
  const { prefetchOnIntent, prefetchWhenVisible } = await load();
  let appels = 0;
  const loader = async () => {
    appels += 1;
  };

  // Un repli « on précharge quand même » reviendrait à tout charger d'un coup
  // sur les navigateurs sans IntersectionObserver — l'inverse du découpage.
  assert.doesNotThrow(() => prefetchOnIntent(null, loader)());
  assert.doesNotThrow(() => prefetchWhenVisible(null, loader)());
  assert.equal(appels, 0);
});

test('le repos : `requestIdleCallback` s’il existe, un délai sinon', async () => {
  const { prefetchWhenIdle } = await load();
  const saved = globalThis.requestIdleCallback;

  try {
    // Safari n'a pas `requestIdleCallback` : le repli doit être un délai
    // généreux, pas un appel immédiat qui chargerait tout au démarrage.
    delete globalThis.requestIdleCallback;
    let appels = 0;
    const cancel = prefetchWhenIdle(
      async () => {
        appels += 1;
      },
      { timeout: 20 }
    );
    assert.equal(appels, 0, 'rien ne part tout de suite');
    await new Promise(resolve => setTimeout(resolve, 40));
    assert.equal(appels, 1);
    assert.doesNotThrow(cancel);

    // Et quand il existe, c'est lui qu'on utilise.
    let recu = null;
    globalThis.requestIdleCallback = (fn, options) => {
      recu = options;
      fn();
      return 42;
    };
    prefetchWhenIdle(async () => {}, { timeout: 1234 });
    assert.deepEqual(recu, { timeout: 1234 });
  } finally {
    if (saved) globalThis.requestIdleCallback = saved;
    else delete globalThis.requestIdleCallback;
  }
});
