/**
 * `useInstallPrompt` (`react/use-install-prompt.js`) — la surface la plus
 * récente du paquet (4.6.0), et la seule sans test.
 *
 * La DÉCISION est descendue dans `install.js`, qui est éprouvé ailleurs. Ce
 * fichier ne teste donc que ce qui reste ici, et qu'aucune relecture n'attrape :
 * le branchement des trois évènements du navigateur, le VERROU d'affichage —
 * une invite affichée arme le report, donc `shouldPrompt` retomberait à faux
 * dans la foulée et le bandeau disparaîtrait sous les doigts — et le comptage
 * de l'affichage APRÈS le rendu, sans quoi `StrictMode` brûlerait deux des
 * trois invites en développement.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setupDom, renderHook } from './helpers/dom.mjs';
import { useInstallPrompt } from '../react/use-install-prompt.js';
import { readInstallState } from '../install.js';

const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Mobile Safari/537.36';
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

/** Un stockage neuf par test : `install.js` ne compte qu'une visite par objet. */
function stockage(initial = {}) {
  const donnees = new Map(Object.entries(initial));
  return {
    getItem: cle => donnees.get(cle) ?? null,
    setItem: (cle, valeur) => donnees.set(cle, String(valeur)),
    removeItem: cle => donnees.delete(cle),
    donnees,
  };
}

/** Émet `beforeinstallprompt` avec une invite native pilotable. */
function armerInvite(dom, { outcome = 'accepted' } = {}) {
  const invite = { prompts: 0, defaults: 0 };
  const evenement = new dom.window.Event('beforeinstallprompt');
  evenement.preventDefault = () => {
    invite.defaults += 1;
  };
  evenement.prompt = () => {
    invite.prompts += 1;
  };
  evenement.userChoice = Promise.resolve({ outcome });
  return { invite, emettre: () => dom.window.dispatchEvent(evenement) };
}

test('sans invite native ni repli, il n’y a rien à proposer', async () => {
  // Chromium sans `beforeinstallprompt` : l'app est peut-être déjà installée,
  // ou les heuristiques d'engagement ne sont pas atteintes. On se tait.
  const dom = setupDom({ userAgent: CHROME_ANDROID });
  try {
    const vue = await renderHook(() =>
      useInstallPrompt({ storage: stockage() })
    );
    assert.equal(vue.result.current.canInstall, false);
    assert.equal(vue.result.current.method, 'none');
    assert.equal(vue.result.current.shouldPrompt, false);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('iOS n’émet jamais l’évènement, et reçoit pourtant des instructions', async () => {
  // Le manque qui a fait écrire ce hook : `canInstall` restait faux sur iOS et
  // le bandeau ne s’affichait pas, alors que l’app EST installable à la main.
  const dom = setupDom({ userAgent: IPHONE });
  try {
    const vue = await renderHook(() =>
      useInstallPrompt({ storage: stockage() })
    );
    assert.equal(vue.result.current.canInstall, false);
    assert.equal(vue.result.current.method, 'instructions');
    assert.equal(vue.result.current.platform, 'ios');
    assert.equal(vue.result.current.shouldPrompt, true);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('l’invite native est capturée, le défaut empêché, et l’issue rendue', async () => {
  const dom = setupDom({ userAgent: CHROME_ANDROID });
  const { invite, emettre } = armerInvite(dom, { outcome: 'accepted' });
  try {
    const store = stockage();
    const vue = await renderHook(() => useInstallPrompt({ storage: store }));
    await vue.act(() => emettre());

    assert.equal(
      invite.defaults,
      1,
      'le mini-infobar du navigateur est retenu'
    );
    assert.equal(vue.result.current.canInstall, true);
    assert.equal(vue.result.current.method, 'prompt');

    let issue;
    await vue.act(async () => {
      issue = await vue.result.current.promptInstall();
    });
    assert.equal(issue, 'accepted');
    assert.equal(invite.prompts, 1);
    assert.equal(
      vue.result.current.canInstall,
      false,
      'l’invite est consommée'
    );
    assert.equal(vue.result.current.method, 'none', 'plus rien à proposer');
    assert.equal(vue.result.current.shouldPrompt, false);
    // L'état écrit sur l'appareil dit « c'est fait » : aucune app ne
    // reproposera l'installation au prochain lancement. `installed`, lui,
    // attend `appinstalled` — que le navigateur émet juste après une
    // acceptation, et que le dernier test de ce fichier couvre.
    assert.equal(readInstallState({ storage: store }).done, true);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('une invite déjà consommée ne casse pas le contrat de retour', async () => {
  const dom = setupDom({ userAgent: CHROME_ANDROID });
  const evenement = new dom.window.Event('beforeinstallprompt');
  evenement.preventDefault = () => {};
  evenement.prompt = () => {};
  // `userChoice` rejette : le navigateur a déjà consommé cette invite. Écrit
  // en thenable et non en `Promise.reject` : une promesse rejetée d'avance
  // serait signalée « non gérée » avant même que le hook ne l'attende.
  evenement.userChoice = {
    then: (_resoudre, rejeter) => rejeter(new Error('déjà consommée')),
  };
  try {
    const vue = await renderHook(() =>
      useInstallPrompt({ storage: stockage() })
    );
    await vue.act(() => dom.window.dispatchEvent(evenement));

    let issue = 'non-appelé';
    await vue.act(async () => {
      issue = await vue.result.current.promptInstall();
    });
    assert.equal(issue, null, 'le contrat promet null, pas un rejet');
    assert.equal(vue.result.current.canInstall, false);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('LE VERROU : l’affichage arme le report, et le bandeau ne s’évanouit pas', async () => {
  const dom = setupDom({ userAgent: IPHONE });
  try {
    const store = stockage();
    const vue = await renderHook(() => useInstallPrompt({ storage: store }));

    assert.equal(vue.result.current.shouldPrompt, true);
    // L'affichage vient d'être compté ; sans le verrou, la cadence dirait
    // « pas maintenant » au rendu suivant et le bandeau disparaîtrait sous
    // les doigts de l'utilisateur.
    const etat = readInstallState({ storage: store });
    assert.equal(etat.shown, 1);
    await vue.act(() => {});
    assert.equal(vue.result.current.shouldPrompt, true, 'le verrou tient');

    // Tant que personne ne tranche, l'affichage n'est compté qu'UNE fois.
    assert.equal(readInstallState({ storage: store }).shown, 1);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('« Plus tard » referme le bandeau et reporte, « Non merci » clôt le sujet', async () => {
  const dom = setupDom({ userAgent: IPHONE });
  try {
    const store = stockage();
    const vue = await renderHook(() => useInstallPrompt({ storage: store }));
    await vue.act(() => vue.result.current.snooze());
    assert.equal(vue.result.current.shouldPrompt, false);
    assert.ok(
      readInstallState({ storage: store }).until > Date.now(),
      'le report doit porter une échéance'
    );

    const autre = stockage();
    const vue2 = await renderHook(() => useInstallPrompt({ storage: autre }));
    await vue2.act(() => vue2.result.current.dismiss());
    assert.equal(vue2.result.current.shouldPrompt, false);
    await vue.unmount();
    await vue2.unmount();
  } finally {
    dom.restore();
  }
});

test('`enabled: false` ne compte aucune visite : l’app place l’invite elle-même', async () => {
  const dom = setupDom({ userAgent: IPHONE });
  try {
    const store = stockage();
    const vue = await renderHook(() =>
      useInstallPrompt({ storage: store, enabled: false })
    );
    assert.equal(vue.result.current.shouldPrompt, false);
    assert.equal(
      vue.result.current.method,
      'instructions',
      'la voie reste dite'
    );
    assert.equal(readInstallState({ storage: store }).visits, 0);
    assert.equal(readInstallState({ storage: store }).shown, 0);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('une installation par le menu du navigateur est reconnue sans évènement', async () => {
  // iOS et « installer » depuis le menu ne déclenchent pas `appinstalled` :
  // seul le passage en mode d'affichage autonome le dit.
  const dom = setupDom({ userAgent: IPHONE });
  try {
    const vue = await renderHook(() =>
      useInstallPrompt({ storage: stockage() })
    );
    assert.equal(vue.result.current.installed, false);
    await vue.act(() => dom.setMediaQuery('(display-mode: standalone)', true));
    assert.equal(vue.result.current.installed, true);
    assert.equal(vue.result.current.shouldPrompt, false);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});

test('`appinstalled` marque l’état comme clos', async () => {
  const dom = setupDom({ userAgent: CHROME_ANDROID });
  try {
    const store = stockage();
    const vue = await renderHook(() => useInstallPrompt({ storage: store }));
    await vue.act(() =>
      dom.window.dispatchEvent(new dom.window.Event('appinstalled'))
    );
    assert.equal(vue.result.current.installed, true);
    assert.equal(readInstallState({ storage: store }).done, true);
    await vue.unmount();
  } finally {
    dom.restore();
  }
});
