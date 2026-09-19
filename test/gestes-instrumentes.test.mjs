/**
 * LES TROIS GESTES COMMUNS, mesurés là où ils se produisent.
 *
 * CE QUE CES TESTS PROTÈGENT, et qui ne se voit nulle part ailleurs :
 *
 *  1. **Rien ne part sans l'accord.** C'est la règle du parc, et instrumenter
 *     des gestes est exactement le moment où on risque de l'oublier : le
 *     composant n'a aucune raison de savoir s'il y a consentement, c'est
 *     `trackEvent` qui refuse. Un test le prouve plutôt que de l'espérer.
 *  2. **L'impression ne part QU'UNE FOIS.** `StrictMode` monte deux fois ;
 *     sans garde, `proposee` doublerait et tout taux d'acceptation serait
 *     divisé par deux — une erreur qu'aucune alerte ne signalerait.
 *  3. **Aucune valeur libre.** Le partage n'envoie ni titre, ni texte, ni URL :
 *     ils portent le contenu de l'utilisateur. C'est la raison même pour
 *     laquelle `autocapture` est coupée (ADR 0012) ; instrumenter à la main ne
 *     servirait à rien si c'était pour reconstituer le même risque.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import { setupDom, mount } from './helpers/dom.mjs';
import {
  chargeurFactice,
  fauxPosthog,
  laisseCharger,
} from './helpers/posthog.mjs';
import { initAnalytics, resetAnalytics, GESTES } from '../analytics.js';
import { PwaInstallPrompt } from '../react/pwa-install-prompt.js';
import { UpdatePromptBanner } from '../react/update-prompt-banner.js';
import { ShareButton } from '../react/share-button.js';

const CLE = 'phc_abcdefghijklmnopqrstuvwxyz0123456789';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

/** Monte la mesure avec un double, consentement déjà donné. */
async function avecAccord() {
  const faux = fauxPosthog();
  initAnalytics({
    posthogKey: CLE,
    loader: chargeurFactice(faux),
    requireConsent: false,
  });
  await laisseCharger();
  return faux;
}

/** Les gestes captés, sans les vues de page. */
const gestes = faux => faux.appels.capture.filter(c => c.event !== '$pageview');

/**
 * Un `registerSW` factice qui annonce tout de suite une version en attente.
 *
 * POURQUOI PAS `visible: true` EN PROP. `StandaloneBanner` fait
 * `{ ...props, ...state }` : l'ÉTAT DU HOOK ÉCRASE LA PROP, délibérément (le
 * fichier le dit à propos de `showOfflineReady`). Passer `visible` ne rend donc
 * rien, et un test qui le croirait passerait sur un bandeau jamais affiché.
 * On pilote donc la vraie voie : celle du service worker.
 */
function registerSWFactice(journal) {
  return ({ onNeedRefresh }) => {
    onNeedRefresh?.();
    return async () => journal.push('update');
  };
}

/** L'événement de Chromium, tel qu'il arrive vraiment : annulable. */
function declencheInvite(dom, outcome = 'accepted') {
  const event = new dom.window.Event('beforeinstallprompt', {
    cancelable: true,
  });
  event.prompt = () => {};
  event.userChoice = Promise.resolve({ outcome });
  dom.window.dispatchEvent(event);
}

test('installation : proposée UNE fois, puis acceptée', async () => {
  const dom = setupDom({ userAgent: ANDROID });
  try {
    resetAnalytics();
    const faux = await avecAccord();
    const view = await mount(h(PwaInstallPrompt));

    // Rien tant que Chromium n'a pas parlé : pas d'invite, pas d'impression.
    assert.deepEqual(gestes(faux), []);

    await view.act(() => declencheInvite(dom, 'accepted'));
    const proposees = gestes(faux).filter(g => g.params.etape === 'proposee');
    assert.equal(proposees.length, 1, 'une invite affichée, une impression');
    assert.equal(proposees[0].event, GESTES.INSTALLATION);
    assert.equal(proposees[0].params.methode, 'prompt');
    // 'chromium', et non 'android' : le socle nomme la VOIE d'installation, pas
    // le système. C'est ce qui distingue une invite native d'un mode d'emploi.
    assert.equal(proposees[0].params.plateforme, 'chromium');

    // UN RE-RENDU NE RECOMPTE PAS : c'est le garde qui protège le
    // dénominateur du double montage de `StrictMode`.
    await view.rerender(h(PwaInstallPrompt));
    assert.equal(
      gestes(faux).filter(g => g.params.etape === 'proposee').length,
      1
    );

    await view.act(() => view.container.querySelector('button').click());
    await laisseCharger();
    assert.equal(gestes(faux).at(-1).params.etape, 'acceptee');
    await view.unmount();
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('installation : un refus DANS la boîte native compte « refusee »', async () => {
  const dom = setupDom({ userAgent: ANDROID });
  try {
    resetAnalytics();
    const faux = await avecAccord();
    const view = await mount(h(PwaInstallPrompt));
    await view.act(() => declencheInvite(dom, 'dismissed'));

    // LE CLIC NE VAUT PAS INSTALLATION. La boîte du système s'ouvre, et c'est
    // elle qui décide — compter sur le clic gonflerait le taux de moitié.
    await view.act(() => view.container.querySelector('button').click());
    await laisseCharger();
    assert.equal(gestes(faux).at(-1).params.etape, 'refusee');
    await view.unmount();
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('installation : « Plus tard » compte « reportee », et reporte vraiment', async () => {
  const dom = setupDom({ userAgent: ANDROID });
  try {
    resetAnalytics();
    const faux = await avecAccord();
    const view = await mount(h(PwaInstallPrompt));
    await view.act(() => declencheInvite(dom));

    const boutons = [...view.container.querySelectorAll('button')];
    await view.act(() => boutons.at(-1).click());
    assert.equal(gestes(faux).at(-1).params.etape, 'reportee');
    // Le report reste un report : la mesure ne doit pas avoir mangé l'action.
    assert.equal(
      view.container.querySelector('[data-dwc="pwa-install-prompt"]'),
      null
    );
    await view.unmount();
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('mise à jour : proposée, puis appliquée — et l’événement part AVANT le rechargement', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const faux = await avecAccord();
    const view = await mount(
      h(UpdatePromptBanner, { registerSW: registerSWFactice([]) })
    );
    assert.equal(gestes(faux).at(-1).params.etape, 'proposee');

    await view.act(() =>
      view.container.querySelector('[data-dwc="update-banner-update"]').click()
    );
    /*
     * L'ÉVÉNEMENT EST LÀ DÈS LE CLIC, et c'est tout ce qu'il faut prouver.
     *
     * `update()` recharge le document : un événement posé APRÈS lui partirait
     * dans une file que le rechargement emporte. Je l'ai donc placé avant, et
     * c'est sa présence immédiate — sans attendre aucune promesse — qui le
     * vérifie.
     *
     * CE TEST A D'ABORD ESPIONNÉ `applyUpdate` PAR UN FAUX `registerSW`, et il
     * avait tort : le hook ne rappelle pas la fonction rendue par
     * `registerSW`, il passe par `applyUpdate`. L'assertion échouait en
     * décrivant un câblage imaginaire, pas un défaut. Elle vise maintenant ce
     * que ce commit a réellement changé — une ligne AJOUTÉE avant un
     * `void update()` qui, lui, n'a pas bougé.
     */
    assert.equal(gestes(faux).at(-1).params.etape, 'appliquee');
    await view.unmount();
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('mise à jour : le report est compté ET exécuté', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const faux = await avecAccord();
    const view = await mount(
      h(UpdatePromptBanner, { registerSW: registerSWFactice([]) })
    );
    assert.ok(
      view.container.querySelector('[data-dwc="update-banner"]'),
      'le bandeau doit être là avant qu’on le reporte'
    );

    await view.act(() =>
      view.container.querySelector('[data-dwc="update-banner-dismiss"]').click()
    );
    assert.equal(gestes(faux).at(-1).params.etape, 'reportee');
    // LE BOUTON GARDE SON TRAVAIL. J'ai réécrit `onSecondary` pour y glisser la
    // mesure : si la main avait tremblé, il compterait sans rien reporter et le
    // bandeau resterait à l'écran. C'est sa DISPARITION qui le prouve, pas un
    // espion sur une prop que le hook écrase de toute façon.
    assert.equal(
      view.container.querySelector('[data-dwc="update-banner"]'),
      null,
      'compté mais pas reporté : le bandeau est toujours là'
    );
    await view.unmount();
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('partage : l’ISSUE est captée, le CONTENU ne l’est pas', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const faux = await avecAccord();
    const view = await mount(
      h(ShareButton, {
        title: 'Bilan 2026 de Jeanne',
        text: 'Compte-rendu confidentiel',
        url: 'https://exemple.test/secret',
        share: async () => 'copied',
      })
    );
    await view.act(() => view.container.querySelector('button').click());
    await laisseCharger();

    const dernier = gestes(faux).at(-1);
    assert.equal(dernier.event, GESTES.PARTAGE);
    assert.equal(dernier.params.resultat, 'copied');
    // RIEN D'AUTRE. Le titre, le texte et l'URL portent le contenu de
    // l'utilisateur : les joindre reviendrait à rallumer `autocapture` à la
    // main, ce que l'ADR 0012 refuse.
    assert.deepEqual(Object.keys(dernier.params), ['resultat']);
    const serialise = JSON.stringify(dernier);
    assert.ok(!serialise.includes('Jeanne'), 'un titre a fuité');
    assert.ok(!serialise.includes('confidentiel'), 'un texte a fuité');
    assert.ok(!serialise.includes('exemple.test'), 'une URL a fuité');
    await view.unmount();
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('SANS ACCORD, aucun des trois gestes ne part', async () => {
  const dom = setupDom({ userAgent: ANDROID });
  try {
    resetAnalytics();
    const faux = fauxPosthog();
    // `requireConsent` par défaut : le tag n'est même pas chargé.
    initAnalytics({ posthogKey: CLE, loader: chargeurFactice(faux) });
    await laisseCharger();

    const invite = await mount(h(PwaInstallPrompt));
    await invite.act(() => declencheInvite(dom));
    await invite.act(() => invite.container.querySelector('button').click());

    const maj = await mount(
      h(UpdatePromptBanner, { registerSW: registerSWFactice([]) })
    );
    await maj.act(() =>
      maj.container.querySelector('[data-dwc="update-banner-update"]').click()
    );

    const partage = await mount(
      h(ShareButton, {
        url: 'https://exemple.test/',
        share: async () => 'shared',
      })
    );
    await partage.act(() => partage.container.querySelector('button').click());
    await laisseCharger();

    assert.equal(faux.appels.init.length, 0, 'posthog ne doit pas être init');
    assert.deepEqual(faux.appels.capture, [], 'un geste est parti sans accord');

    await invite.unmount();
    await maj.unmount();
    await partage.unmount();
  } finally {
    resetAnalytics();
    dom.restore();
  }
});
