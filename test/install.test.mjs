/**
 * La décision d'installation : détecter, décider, se souvenir.
 *
 * DEUX DÉFAUTS SONT VERROUILLÉS ICI, et chacun a d'abord été rouge.
 *
 *   1. `beforeinstallprompt` n'existe pas sur iOS ni sur Safari. Le bandeau du
 *      paquet ne s'affichait donc JAMAIS sur iPhone — l'appareil où l'on
 *      installe le plus. `miss-dice` l'avait écrit dans son propre code sans
 *      pouvoir y remédier.
 *   2. « Plus tard » valait pour toujours : un `'1'` dans `localStorage`, et
 *      plus personne ne reparlait d'installation.
 *
 * Aucun DOM ici : c'est la raison d'être de `../install.js`. Les user-agents
 * ci-dessous sont réels, pas inventés — c'est tout l'intérêt.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_CADENCE,
  INSTALL_STATE_KEY,
  LEGACY_DISMISS_KEY,
  countInstallVisit,
  installFallback,
  isAppInstalled,
  nextInstallState,
  readInstallState,
  shouldOfferInstall,
  writeInstallState,
} from '../install.js';

const JOUR = 86_400_000;

/** Un `localStorage` de poche, dont on peut aussi simuler le refus. */
function fakeStorage(initial = {}, { throws = false } = {}) {
  const map = new Map(Object.entries(initial));
  const boom = () => {
    throw new Error('stockage refusé');
  };
  return {
    map,
    getItem: throws ? boom : k => (map.has(k) ? map.get(k) : null),
    setItem: throws ? boom : (k, v) => map.set(k, String(v)),
    removeItem: throws ? boom : k => map.delete(k),
  };
}

/* ── Où l'installation est possible, et comment ─────────────────────────── */

const UA = {
  safariIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  chromeIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/126.0.6478.54 Mobile/15E148 Safari/604.1',
  safariMac:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36',
  edgeWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.0.0',
  firefoxAndroid:
    'Mozilla/5.0 (Android 14; Mobile; rv:127.0) Gecko/127.0 Firefox/127.0',
  firefoxWindows:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0',
  facebookIphone:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBDV/iPhone15,2;FBMD/iPhone]',
  webviewAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36',
};

test('iOS et Safari reçoivent une marche à suivre — le défaut d’origine', () => {
  // Le bandeau ne s'affichait pas du tout sur ces trois-là. C'est la ligne
  // qui rouvre le sujet : `instructions` veut dire « on a quelque chose à
  // dire », là où l'ancien code n'avait que « rien à proposer ».
  for (const ua of [UA.safariIphone, UA.chromeIphone]) {
    assert.deepEqual(installFallback({ userAgent: ua }), {
      method: 'instructions',
      platform: 'ios',
    });
  }
  assert.deepEqual(installFallback({ userAgent: UA.safariMac }), {
    method: 'instructions',
    platform: 'safari',
  });
  assert.deepEqual(installFallback({ userAgent: UA.firefoxAndroid }), {
    method: 'instructions',
    platform: 'generic',
  });
});

test('un iPad qui se fait passer pour un Mac est démasqué par le tactile', () => {
  // iPadOS 13+ envoie le user-agent d'un Mac de bureau, à la lettre près : le
  // MÊME que `UA.safariMac`. Sans `maxTouchPoints`, un iPad recevrait la
  // consigne « menu Fichier ▸ Ajouter au Dock », qui n'existe pas chez lui.
  assert.equal(
    installFallback({
      userAgent: UA.safariMac,
      platformName: 'MacIntel',
      maxTouchPoints: 5,
    }).platform,
    'ios'
  );
  assert.equal(
    installFallback({
      userAgent: UA.safariMac,
      platformName: 'MacIntel',
      maxTouchPoints: 0,
    }).platform,
    'safari'
  );
});

test('Chromium se tait : on attend son événement, on ne le devine pas', () => {
  // Deviner « Chromium donc installable » afficherait des instructions à qui
  // aura une vraie invite une seconde plus tard — ou à qui a déjà installé.
  for (const ua of [UA.chromeAndroid, UA.edgeWindows]) {
    assert.deepEqual(installFallback({ userAgent: ua }), {
      method: 'unavailable',
      platform: 'chromium',
    });
  }
});

test('là où rien n’est possible, on ne dit rien', () => {
  // Firefox de bureau n'installe pas ; une webview intégrée non plus, et lui
  // montrer « ouvrez le menu » serait une consigne inapplicable.
  assert.equal(
    installFallback({ userAgent: UA.firefoxWindows }).method,
    'unavailable'
  );
  assert.deepEqual(installFallback({ userAgent: UA.facebookIphone }), {
    method: 'unavailable',
    platform: 'in-app',
  });
  assert.deepEqual(installFallback({ userAgent: UA.webviewAndroid }), {
    method: 'unavailable',
    platform: 'in-app',
  });
  assert.equal(installFallback({ userAgent: '' }).method, 'unavailable');
});

/* ── Déjà installée ? ───────────────────────────────────────────────────── */

test('les quatre modes d’affichage installés, pas seulement standalone', () => {
  const avec = mode =>
    isAppInstalled({
      matchMedia: q => ({ matches: q === `(display-mode: ${mode})` }),
    });
  for (const mode of [
    'standalone',
    'minimal-ui',
    'fullscreen',
    'window-controls-overlay',
  ]) {
    assert.equal(avec(mode), true, `${mode} devrait compter comme installée`);
  }
  // Un jeu en `display: 'fullscreen'` ou une app de bureau en
  // `window-controls-overlay` se voyait proposer une installation qu'elle
  // avait déjà : `vite-pwa.js` accepte ces valeurs en option.
  assert.equal(avec('browser'), false);
  assert.equal(isAppInstalled({ standalone: true }), true);
  assert.equal(isAppInstalled({ matchMedia: undefined }), false);
});

test('une media query invalide ne fait pas tomber le rendu', () => {
  assert.equal(
    isAppInstalled({
      matchMedia: () => {
        throw new Error('valeur inconnue');
      },
    }),
    false
  );
});

/* ── La cadence ─────────────────────────────────────────────────────────── */

test('on propose au premier lancement', () => {
  const état = nextInstallState(
    { v: 1, visits: 0, shown: 0, until: 0, done: false },
    'visit'
  );
  assert.equal(shouldOfferInstall(état), true);
});

test('un affichage arme le report — sinon on harcèle celui qui ignore', () => {
  // Le cas fréquent n'est pas le clic sur « Plus tard », c'est l'onglet fermé
  // sans rien toucher. Si seul le clic reportait, cet utilisateur reverrait
  // l'invite à CHAQUE chargement jusqu'à épuisement du quota.
  const t0 = 1_000_000_000_000;
  let état = nextInstallState(
    { v: 1, visits: 1, shown: 0, until: 0, done: false },
    'shown',
    {},
    t0
  );
  assert.equal(état.shown, 1);
  assert.equal(shouldOfferInstall(état, {}, t0 + JOUR), false);
  assert.equal(
    shouldOfferInstall(état, {}, t0 + DEFAULT_CADENCE.snoozeDays * JOUR),
    true
  );

  // Trois affichages en tout, puis plus rien — la cadence s'éteint d'elle-même.
  état = nextInstallState(état, 'shown', {}, t0 + 40 * JOUR);
  état = nextInstallState(état, 'shown', {}, t0 + 80 * JOUR);
  assert.equal(état.shown, 3);
  assert.equal(shouldOfferInstall(état, {}, t0 + 10_000 * JOUR), false);
});

test('« ne plus proposer » et « installée » sont définitifs', () => {
  const base = { v: 1, visits: 5, shown: 1, until: 0, done: false };
  for (const event of ['dismiss', 'installed']) {
    const état = nextInstallState(base, event);
    assert.equal(état.done, true);
    assert.equal(shouldOfferInstall(état, {}, Date.now() + 1e12), false);
  }
});

test('la cadence se règle : sans limite, ou après quelques visites', () => {
  const état = { v: 1, visits: 1, shown: 9, until: 0, done: false };
  assert.equal(shouldOfferInstall(état), false);
  assert.equal(shouldOfferInstall(état, { maxPrompts: 0 }), true);
  assert.equal(
    shouldOfferInstall({ ...état, shown: 0 }, { minVisits: 3 }),
    false
  );
  assert.equal(
    shouldOfferInstall({ ...état, shown: 0, visits: 3 }, { minVisits: 3 }),
    true
  );
});

/* ── La mémoire ─────────────────────────────────────────────────────────── */

test('un refus d’avant la 4.6 vaut un report, pas un silence définitif', () => {
  // Le bouton qui écrivait ce `'1'` disait « Plus tard ». En faire un refus
  // définitif trahirait ce que l'utilisateur a lu ; le traduire en « tout de
  // suite » lui reproposerait dès la première visite après la mise à jour.
  const t0 = 1_000_000_000_000;
  const storage = fakeStorage({ [LEGACY_DISMISS_KEY]: '1' });
  const état = readInstallState({ storage, now: t0 });
  assert.equal(état.done, false);
  assert.equal(état.shown, 1);
  assert.equal(état.until, t0 + DEFAULT_CADENCE.snoozeDays * JOUR);
  // La clé est consommée : la migration ne se rejoue pas à chaque lecture, ce
  // qui repousserait le report indéfiniment.
  assert.equal(storage.map.has(LEGACY_DISMISS_KEY), false);
});

test('une app qui avait choisi sa clé garde le bénéfice de son refus', () => {
  const storage = fakeStorage({ mm_install_dismissed: '1' });
  const état = readInstallState({ storage, legacyKey: 'mm_install_dismissed' });
  assert.equal(état.shown, 1);
  assert.equal(storage.map.has('mm_install_dismissed'), false);
});

test('tout ce qu’un stockage peut contenir se lit sans planter', () => {
  const vierge = { v: 1, visits: 0, shown: 0, until: 0, done: false };
  for (const raw of ['', 'pas du json', '[]', 'null', '42', '{"visits":"x"}']) {
    const état = readInstallState({
      storage: fakeStorage({ [INSTALL_STATE_KEY]: raw }),
    });
    assert.equal(état.done, false, `« ${raw} » devrait rendre un état vierge`);
    assert.equal(état.visits, 0);
  }
  assert.deepEqual(readInstallState({ storage: null }), vierge);
});

test('un stockage qui refuse tout ne fait pas tomber le rendu', () => {
  // Safari en navigation privée lève à la lecture COMME à l'écriture. Le
  // paquet doit alors se comporter comme une première visite éternelle.
  const storage = fakeStorage({}, { throws: true });
  const état = readInstallState({ storage });
  assert.equal(état.visits, 0);
  assert.doesNotThrow(() => writeInstallState(état, { storage }));
  assert.doesNotThrow(() => countInstallVisit({ storage }));
});

test('un lancement compte pour une visite, quel que soit le nombre d’appels', () => {
  // `StrictMode` monte les effets deux fois, et deux composants peuvent monter
  // le hook : sans garde, la cadence dériverait d'autant.
  const storage = fakeStorage();
  assert.equal(countInstallVisit({ storage }).visits, 1);
  assert.equal(countInstallVisit({ storage }).visits, 1);
  assert.equal(countInstallVisit({ storage: fakeStorage() }).visits, 1);
  // Et la visite est bien ÉCRITE : sans persistance, `minVisits` ne pourrait
  // rien compter d'un lancement à l'autre.
  assert.equal(JSON.parse(storage.map.get(INSTALL_STATE_KEY)).visits, 1);
});
