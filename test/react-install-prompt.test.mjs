/**
 * Le bandeau d'installation, dans un vrai DOM et sur de vrais navigateurs.
 *
 * Les deux premiers tests étaient ROUGES avant la 4.6, et pour la même raison
 * de fond : le bandeau ne savait répondre qu'à `beforeinstallprompt`.
 *
 *   - sur iPhone, cet événement n'arrive jamais : rien ne s'affichait ;
 *   - après un « Plus tard », le refus était écrit une fois pour toutes.
 *
 * Le troisième verrouille un défaut que la correction elle-même introduisait :
 * un affichage arme le report, donc le bandeau se serait masqué tout seul au
 * rendu suivant, sous les doigts de l'utilisateur.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import { setupDom, mount } from './helpers/dom.mjs';
import { PwaInstallPrompt } from '../react/pwa-install-prompt.js';
import { LabelsProvider } from '../react/labels.js';
import { INSTALL_STATE_KEY, LEGACY_DISMISS_KEY } from '../install.js';

const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36';

const banner = view =>
  view.container.querySelector('[data-dwc="pwa-install-prompt"]');
const texts = view =>
  [...view.container.querySelectorAll('button')].map(b => b.textContent);

/** L'événement de Chromium, tel qu'il arrive vraiment : annulable. */
function fireBeforeInstall(dom, outcome = 'accepted') {
  const event = new dom.window.Event('beforeinstallprompt', {
    cancelable: true,
  });
  const calls = [];
  event.prompt = () => calls.push('prompt');
  event.userChoice = Promise.resolve({ outcome });
  dom.window.dispatchEvent(event);
  return calls;
}

test('sur iPhone, le bandeau dit COMMENT installer — il ne s’affichait pas', async () => {
  const dom = setupDom({ userAgent: IPHONE });
  try {
    const view = await mount(h(PwaInstallPrompt));
    const el = banner(view);
    assert.ok(el, 'aucun bandeau : c’est le défaut d’origine sur iOS');
    assert.equal(el.dataset.method, 'instructions');
    assert.equal(el.dataset.platform, 'ios');
    assert.match(
      el.querySelector('[data-dwc="pwa-install-desc"]').textContent,
      /Partager/
    );
    // Un bouton « Installer » ne pourrait rien honorer ici : la seule sortie
    // est « Plus tard ». Et la marche à suivre est décrite pour le lecteur
    // d'écran, sans quoi il n'entend qu'un titre et un bouton de renvoi.
    assert.deepEqual(texts(view), ['Plus tard']);
    assert.equal(
      el.getAttribute('aria-describedby'),
      el.querySelector('[data-dwc="pwa-install-desc"]').id
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('sur Android, l’invite native reste la voie normale', async () => {
  const dom = setupDom({ userAgent: ANDROID });
  try {
    const view = await mount(h(PwaInstallPrompt));
    // Rien tant que Chromium n'a pas parlé : deviner afficherait des
    // instructions à qui aura une vraie invite une seconde plus tard.
    assert.equal(banner(view), null);

    let calls;
    await view.act(() => {
      calls = fireBeforeInstall(dom);
    });
    const el = banner(view);
    assert.ok(el);
    assert.equal(el.dataset.method, 'prompt');
    assert.deepEqual(texts(view), ['Installer', 'Plus tard']);

    await view.act(() => view.container.querySelector('button').click());
    assert.deepEqual(calls, ['prompt']);
    // Installée : le bandeau s'efface, et ne reviendra plus.
    assert.equal(banner(view), null);
    assert.equal(
      JSON.parse(dom.window.localStorage.getItem(INSTALL_STATE_KEY)).done,
      true
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('« Plus tard » reporte d’un mois — il valait pour toujours', async () => {
  const dom = setupDom({ userAgent: IPHONE });
  try {
    const view = await mount(h(PwaInstallPrompt));
    await view.act(() => view.container.querySelector('button').click());
    assert.equal(banner(view), null);

    // Le lancement suivant se tait…
    const view2 = await mount(h(PwaInstallPrompt));
    assert.equal(banner(view2), null);

    // …mais la mémoire porte une DATE, pas un booléen : c'est toute la
    // différence avec l'ancien `'1'`, qu'aucune horloge ne pouvait défaire.
    const état = JSON.parse(dom.window.localStorage.getItem(INSTALL_STATE_KEY));
    assert.equal(état.done, false);
    assert.ok(état.until > Date.now());

    dom.window.localStorage.setItem(
      INSTALL_STATE_KEY,
      JSON.stringify({ ...état, until: Date.now() - 1 })
    );
    const view3 = await mount(h(PwaInstallPrompt));
    assert.ok(banner(view3), 'l’échéance passée, on repropose');

    await view.unmount();
    await view2.unmount();
    await view3.unmount();
  } finally {
    dom.restore();
  }
});

test('le bandeau ne se masque pas tout seul sous les doigts', async () => {
  // Un affichage arme le report : sans verrou, `shouldPrompt` retomberait à
  // faux au rendu déclenché par cette écriture, et le bandeau disparaîtrait
  // avant qu'on ait pu le lire.
  const dom = setupDom({ userAgent: IPHONE });
  try {
    const view = await mount(h(PwaInstallPrompt));
    assert.ok(banner(view));
    await view.act(() => {});
    await view.rerender(h(PwaInstallPrompt));
    assert.ok(banner(view), 'le bandeau s’est effacé de lui-même');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('déjà installée : on ne propose rien', async () => {
  const dom = setupDom({ userAgent: IPHONE });
  try {
    dom.setMediaQuery('(display-mode: fullscreen)', true);
    const view = await mount(h(PwaInstallPrompt));
    assert.equal(banner(view), null);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('`cadence={false}` : l’app place l’invite elle-même, sans quota', async () => {
  // Le cas de `pwa-starter-kit`, qui monte le bandeau dans sa page « À
  // propos » : là, l'utilisateur est venu CHERCHER l'installation. Un quota de
  // trois affichages y serait absurde.
  const dom = setupDom({ userAgent: IPHONE });
  try {
    for (let i = 0; i < 5; i += 1) {
      const view = await mount(h(PwaInstallPrompt, { cadence: false }));
      assert.ok(banner(view), `tour ${i} : le bandeau devrait rester visible`);
      await view.unmount();
    }
    // Et rien n'est compté : la cadence du bandeau principal reste intacte.
    assert.equal(dom.window.localStorage.getItem(INSTALL_STATE_KEY), null);
  } finally {
    dom.restore();
  }
});

test('un refus d’avant la 4.6 se traduit en report, pas en oubli', async () => {
  const dom = setupDom({ userAgent: IPHONE });
  try {
    dom.window.localStorage.setItem(LEGACY_DISMISS_KEY, '1');
    const view = await mount(h(PwaInstallPrompt));
    assert.equal(banner(view), null, 'un refus récent doit être respecté');
    assert.equal(dom.window.localStorage.getItem(LEGACY_DISMISS_KEY), null);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('les instructions suivent la langue du provider', async () => {
  const dom = setupDom({ userAgent: IPHONE });
  try {
    const view = await mount(
      h(LabelsProvider, { locale: 'nl' }, h(PwaInstallPrompt))
    );
    assert.match(
      banner(view).querySelector('[data-dwc="pwa-install-desc"]').textContent,
      /beginscherm/
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});
