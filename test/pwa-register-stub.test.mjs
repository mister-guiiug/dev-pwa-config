/**
 * `testing/pwa-register` — le double de `virtual:pwa-register`, pilotable.
 *
 * Douze dépôts écrivaient ce fichier à la main, et les douze étaient MUETS :
 * un `registerSW` qui n'appelle jamais `onNeedRefresh` prouve qu'un composant
 * se monte, jamais qu'un bandeau peut s'afficher. C'est par ce trou qu'une app
 * a vécu des mois avec une bannière montée sans `registerSW`, donc
 * structurellement incapable d'apparaître.
 *
 * Les tests ci-dessous éprouvent les trois choses que le double publié ajoute :
 * il pilote, il LÈVE quand personne n'a injecté `registerSW`, et il se
 * réinitialise assez profondément pour que le report d'un test ne fuie pas dans
 * le suivant.
 *
 * Le dernier éprouve autre chose : que `vitest-setup` LAISSE VIVRE ce double.
 * Deux fonctionnalités publiées du socle se sont neutralisées pendant des
 * semaines — voir son en-tête.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { createElement as h } from 'react';

import { setupDom, mount, renderHook } from './helpers/dom.mjs';
import { registerSW, swStub } from '../testing/pwa-register.js';
import { pwaRegisterAlias } from '../vitest-base.js';
import { UpdatePromptBanner } from '../react/update-prompt-banner.js';
import {
  SNOOZE_KEY,
  snoozeKeyFor,
  useUpdatePrompt,
} from '../react/use-update-prompt.js';

test('le double fait apparaître le bandeau, ce que les douze copies muettes ne pouvaient pas', async () => {
  const dom = setupDom();
  swStub.reset();
  try {
    const view = await mount(h(UpdatePromptBanner, { registerSW }));
    assert.equal(swStub.registered, true, 'registerSW n’a pas été injecté');
    assert.equal(
      view.container.querySelector('[data-dwc="update-banner"]'),
      null
    );

    await view.act(() => swStub.needRefresh());

    assert.ok(
      view.container.querySelector('[data-dwc="update-banner"]'),
      'le bandeau devait apparaître'
    );
    await view.unmount();
  } finally {
    swStub.reset();
    dom.restore();
  }
});

test('placement="fixed" : le bandeau DEMANDE sa place, sans dépendre d’une barre basse', async () => {
  // LE DÉFAUT QUE CETTE PROP REFERME. Le socle ne plaçait ce bandeau que sous
  // `:root:has([data-dwc='bottom-nav'][data-placement='fixed'])` — cinq apps
  // sur vingt au relevé du 16/09/2026. Les autres recevaient une boîte habillée
  // POSÉE DANS LE FLUX, en fin de document, et six ont réécrit le placement à
  // la main avec des `z-index` de 25 à 9999.
  const dom = setupDom();
  swStub.reset();
  try {
    const vue = await mount(
      h(UpdatePromptBanner, { registerSW, placement: 'fixed' })
    );
    await vue.act(() => swStub.needRefresh());

    const bandeau = vue.container.querySelector('[data-dwc="update-banner"]');
    assert.equal(
      bandeau.dataset.placement,
      'fixed',
      'c’est cet attribut, et lui seul, que la règle CSS vise'
    );
    await vue.unmount();
  } finally {
    swStub.reset();
    dom.restore();
  }
});

test('LE REPORT EST CLOISONNÉ : celui d’une app ne fait plus taire les autres', async () => {
  // LE DÉFAUT MESURÉ. `snoozeKey` valait `dwc_sw_update_snoozed_until`, une clé
  // NUE, et les vingt sites partagent l'origine `<compte>.github.io` : reporter
  // sur mister-puzzle — 24 h — silenciait aussi miss-supaboss, miss-supatool et
  // mister-family-map. Relevé du 16/09/2026 : aucune des quatre apps à report
  // ne passe de `snoozeKey`, elles lisaient toutes celle-là.
  assert.equal(snoozeKeyFor('/'), SNOOZE_KEY, 'à la racine, la clé reste nue');
  assert.equal(
    snoozeKeyFor('/mister-puzzle/'),
    `${SNOOZE_KEY}:/mister-puzzle/`
  );
  assert.notEqual(
    snoozeKeyFor('/mister-puzzle/'),
    snoozeKeyFor('/miss-supaboss/')
  );

  // Et la contre-épreuve en situation : un report posé sous la clé d'une app
  // laisse le bandeau de sa voisine apparaître.
  const dom = setupDom();
  swStub.reset();
  try {
    window.localStorage.setItem(
      snoozeKeyFor('/mister-puzzle/'),
      String(Date.now() + 86_400_000)
    );
    const voisine = await mount(
      h(UpdatePromptBanner, {
        registerSW,
        snoozeHours: 24,
        snoozeKey: snoozeKeyFor('/miss-supaboss/'),
      })
    );
    await voisine.act(() => swStub.needRefresh());

    assert.ok(
      voisine.container.querySelector('[data-dwc="update-banner"]'),
      'le report du voisin ne doit rien faire taire ici'
    );
    await voisine.unmount();
  } finally {
    swStub.reset();
    dom.restore();
  }
});

test('le message « prêt hors ligne » suit la même règle', async () => {
  // Il occupe le même bas d'écran : le laisser dans le flux pendant que son
  // voisin flotte donnerait deux endroits différents à deux messages du même
  // composant.
  //
  // UN TEST À PART, et pas la suite du précédent : `needRefresh` reste vrai
  // dans le double une fois déclenché, et la précédence du bandeau fait alors
  // TAIRE le message hors ligne. Les enchaîner dans le même `swStub` rendait
  // ce test faux pour une raison qui n'est pas la sienne.
  const dom = setupDom();
  swStub.reset();
  try {
    const vue = await mount(
      h(UpdatePromptBanner, {
        registerSW,
        placement: 'fixed',
        showOfflineReady: true,
      })
    );
    await vue.act(() => swStub.offlineReady());

    assert.equal(
      vue.container.querySelector('[data-dwc="offline-ready"]').dataset
        .placement,
      'fixed'
    );
    await vue.unmount();
  } finally {
    swStub.reset();
    dom.restore();
  }
});

test('sans la prop, RIEN ne bouge : l’attribut est absent', async () => {
  // Les treize apps qui placent le bandeau elles-mêmes ne doivent pas voir un
  // attribut apparaître sous leurs règles. La prop est opt-in, et ce test est
  // ce qui le garantit.
  const dom = setupDom();
  swStub.reset();
  try {
    const vue = await mount(h(UpdatePromptBanner, { registerSW }));
    await vue.act(() => swStub.needRefresh());

    const bandeau = vue.container.querySelector('[data-dwc="update-banner"]');
    assert.equal(bandeau.hasAttribute('data-placement'), false);
    await vue.unmount();
  } finally {
    swStub.reset();
    dom.restore();
  }
});

test('le double LÈVE quand personne n’a injecté registerSW', async () => {
  // LE DÉFAUT QUE CE DOUBLE REND IMPOSSIBLE À MANQUER. Oublier la prop
  // `registerSW` ne casse ni la compilation, ni le typage, ni le rendu : le
  // bandeau reste muet, pour toujours. Un double inerte ne dit rien non plus.
  const dom = setupDom();
  swStub.reset();
  try {
    const view = await mount(h(UpdatePromptBanner, {}));
    assert.equal(swStub.registered, false);
    assert.throws(
      () => swStub.needRefresh(),
      /registerSW n'a jamais été appelé/
    );
    await view.unmount();
  } finally {
    swStub.reset();
    dom.restore();
  }
});

test('un rappel non posé lève, plutôt que de ne rien faire en silence', async () => {
  const dom = setupDom();
  swStub.reset();
  try {
    // Le socle pose les cinq rappels ; ici on enregistre à la main, avec un
    // seul, pour éprouver la garde elle-même.
    registerSW({ onNeedRefresh() {} });
    assert.doesNotThrow(() => swStub.needRefresh());
    assert.throws(() => swStub.registerError(), /sans `onRegisterError`/);
  } finally {
    swStub.reset();
    dom.restore();
  }
});

test('reset() renouvelle l’IDENTITÉ : le signal ne fuit pas d’un test au suivant', async () => {
  // LE PIÈGE, RENCONTRÉ PAR HUIT MIGRATIONS. `useUpdatePrompt` mémorise sa
  // connexion par identité de fonction (WeakMap, pour ne pas doubler les
  // écouteurs sous StrictMode). Un double unique et partagé garderait donc
  // `needRefresh` à vrai pour tous les tests suivants du fichier.
  const dom = setupDom();
  swStub.reset();
  try {
    const premier = await mount(h(UpdatePromptBanner, { registerSW }));
    await premier.act(() => swStub.needRefresh());
    assert.ok(premier.container.querySelector('[data-dwc="update-banner"]'));
    await premier.unmount();

    swStub.reset();

    const second = await mount(h(UpdatePromptBanner, { registerSW }));
    assert.equal(
      second.container.querySelector('[data-dwc="update-banner"]'),
      null,
      'la mise à jour du test précédent a fui dans celui-ci'
    );
    await second.unmount();
  } finally {
    swStub.reset();
    dom.restore();
  }
});

test('les quatre déclencheurs atteignent les quatre rappels du socle', async () => {
  const dom = setupDom();
  swStub.reset();
  try {
    const vus = [];
    const view = await renderHook(() =>
      useUpdatePrompt({
        registerSW,
        onRegisterError: error => vus.push(['erreur', error.message]),
        onRegisteredSW: url => vus.push(['enregistré', url]),
      })
    );

    await view.act(() => swStub.offlineReady());
    assert.equal(view.result.current.offlineReady, true);

    await view.act(() => swStub.needRefresh());
    assert.equal(view.result.current.visible, true);

    swStub.registerError(new Error('sw injoignable'));
    swStub.registeredSW('/sw.js');
    assert.deepEqual(vus, [
      ['erreur', 'sw injoignable'],
      ['enregistré', '/sw.js'],
    ]);

    await view.unmount();
  } finally {
    swStub.reset();
    dom.restore();
  }
});

test('l’updateSW rendu note ses appels, comme celui de vite-plugin-pwa', async () => {
  const dom = setupDom();
  swStub.reset();
  try {
    const updateSW = registerSW({ immediate: true });
    assert.equal(swStub.calls, 1);
    assert.equal(swStub.options.immediate, true);

    await updateSW(true);
    assert.deepEqual(swStub.reloads, [true]);

    swStub.reset();
    assert.equal(swStub.calls, 0);
    assert.deepEqual(swStub.reloads, []);
  } finally {
    swStub.reset();
    dom.restore();
  }
});

/**
 * Les spécificateurs que `vitest-setup` passe à `vi.mock`, RÉELLEMENT relevés.
 *
 * On charge le fichier pour de bon, avec `vitest` et jest-dom remplacés par des
 * doubles en mémoire (`registerHooks`, synchrone et dans ce thread). Une
 * relecture du source à l'expression régulière raterait un mock déplacé dans un
 * helper ou construit dynamiquement ; ici, seul compte ce qui est enregistré.
 */
async function mocksDeVitestSetup() {
  const releve = [];
  globalThis.__dwcMocks = releve;
  const sources = new Map([
    [
      'vitest',
      'export const vi = { mock: (chemin) => globalThis.__dwcMocks.push(chemin) };',
    ],
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
    delete globalThis.__dwcMocks;
  }
  return releve;
}

/**
 * Ce qu'un spécificateur devient une fois l'alias de test posé.
 *
 * Les alias Vite en forme de CHAÎNE remplacent un PRÉFIXE, pas un nom complet :
 * `virtual:pwa-register/react` passe donc aussi par l'entrée, et devient un
 * chemin qui n'existe pas. C'est toute la différence entre les deux mocks.
 */
function cibleParAlias(spec) {
  for (const [cle, fichier] of Object.entries(pwaRegisterAlias)) {
    if (spec.startsWith(cle)) return fichier + spec.slice(cle.length);
  }
  return null;
}

/** Les mocks qui, à travers l'alias, tombent sur un VRAI fichier — et l'écrasent. */
function ombresSurUnFichierReel(specs) {
  return specs.filter(spec => {
    const cible = cibleParAlias(spec);
    return cible !== null && existsSync(cible);
  });
}

test('vitest-setup ne mocke rien que l’alias de test fasse tomber sur un fichier réel', async () => {
  // LE DÉFAUT QUE CE TEST REND IMPOSSIBLE À REPRODUIRE. Deux fonctionnalités
  // publiées se neutralisaient : la doc de `testing/pwa-register` prescrit un
  // `resolve.alias`, et `vitest-setup` posait un `vi.mock` sur le spécificateur
  // que cet alias capte. Même module, donc — et le mock muet écrasait le double
  // pilotable (« No "swStub" export is defined on the "virtual:pwa-register"
  // mock »). Suivre la documentation rendait la fonctionnalité inutilisable.
  //
  // La règle n'est pas « pas de mock » : `virtual:pwa-register/react` en garde
  // un, sans dommage, parce que l'alias le mène à un chemin inexistant. Ce qui
  // est interdit, c'est de mocker un spécificateur qui, une fois l'alias
  // appliqué, désigne un fichier QUI EXISTE.
  const mocks = await mocksDeVitestSetup();

  assert.deepEqual(
    ombresSurUnFichierReel(mocks),
    [],
    'un mock de vitest-setup écrase un fichier réel désigné par pwaRegisterAlias'
  );

  // La garde a des dents : le spécificateur d'hier serait bien rattrapé.
  assert.deepEqual(ombresSurUnFichierReel(['virtual:pwa-register']), [
    'virtual:pwa-register',
  ]);

  // …et elle n'est pas vide de sens : l'alias mène bien au double pilotable.
  const cible = cibleParAlias('virtual:pwa-register');
  assert.ok(existsSync(cible), 'pwaRegisterAlias ne désigne aucun fichier');
  const { swStub: pilote } = await import(`file://${cible}`);
  assert.equal(typeof pilote?.needRefresh, 'function');
});
