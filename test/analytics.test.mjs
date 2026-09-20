/**
 * PostHog : le consentement d'abord, la mesure ensuite.
 *
 * CE QUE CES TESTS PROTÈGENT. Deux règles qui ont coûté cher, et qui survivent
 * au changement d'outil : **rien ne part avant l'accord**, et **une vue de page
 * par navigation** — ni zéro (la vue d'arrivée perdue), ni deux (celle de la
 * bibliothèque en plus de la nôtre).
 *
 * S'y ajoutent, depuis l'ADR 0012, les réglages de vie privée qui ne sont PAS
 * des préférences : `autocapture`, l'enregistrement de session, les vues
 * automatiques. Ils sont ici pour qu'on ne puisse pas les perdre sans qu'un
 * test tombe.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import {
  OPTIONS_VIE_PRIVEE,
  getAnalyticsId,
  initAnalytics,
  isAnalyticsLoaded,
  nomDApp,
  parsePosthogKey,
  resetAnalytics,
  setAnalyticsConsent,
  trackEvent,
  trackPageView,
} from '../analytics.js';
import { usePageViews } from '../react/use-page-views.js';
import { mount, setupDom } from './helpers/dom.mjs';
import {
  chargeurFactice,
  fauxPosthog,
  laisseCharger,
} from './helpers/posthog.mjs';

const CLE = 'phc_abcdefghijklmnopqrstuvwxyz0123456789';

/** Monte la mesure avec un double, consentement déjà donné. */
async function avecAccord(options = {}) {
  const faux = fauxPosthog();
  initAnalytics({
    posthogKey: CLE,
    loader: chargeurFactice(faux),
    requireConsent: false,
    ...options,
  });
  await laisseCharger();
  return faux;
}

const vuesDe = faux =>
  faux.appels.capture.filter(c => c.event === '$pageview').map(c => c.params);

test('les identifiants sont validés, pas devinés', () => {
  assert.equal(parsePosthogKey(CLE), CLE);
  assert.equal(parsePosthogKey('G-ABC123'), null);
  assert.equal(parsePosthogKey('phc_court'), null);
  assert.equal(parsePosthogKey(undefined), null);
});

test('sans identifiant, rien n’est installé et rien ne jette', () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const state = initAnalytics({});
    assert.deepEqual(state, { id: null, loaded: false });
    assert.equal(trackEvent('essai'), false);
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('rien ne part avant le consentement, et le script n’est pas même chargé', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const faux = fauxPosthog();
    initAnalytics({ posthogKey: CLE, loader: chargeurFactice(faux) });
    await laisseCharger();

    // LE LOADER N'EST PAS APPELÉ. C'est la différence avec un
    // `opt_out_capturing_by_default` : là, le script serait téléchargé et
    // évalué, et n'attendrait qu'un appel pour parler. Ici il n'est pas là.
    assert.equal(faux.appels.init.length, 0, 'posthog ne doit pas être init');
    assert.equal(isAnalyticsLoaded(), false);
    assert.equal(trackEvent('clic'), false);
    assert.equal(trackPageView('/a'), false);

    setAnalyticsConsent({ analytics: true });
    await laisseCharger();
    assert.equal(isAnalyticsLoaded(), true);
    assert.equal(faux.appels.init.length, 1);
    assert.equal(faux.appels.init[0].cle, CLE);
    assert.equal(getAnalyticsId(), CLE);

    assert.equal(trackEvent('clic', { cible: 'menu' }), true);
    assert.deepEqual(faux.appels.capture.at(-1), {
      event: 'clic',
      params: { cible: 'menu' },
    });
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('LES RÉGLAGES DE VIE PRIVÉE sont réellement passés à init', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const faux = await avecAccord();
    const { options } = faux.appels.init[0];

    // Chacun a sa raison dans l'ADR 0012 ; les perdre ne se verrait nulle part
    // ailleurs qu'ici.
    assert.equal(options.autocapture, false, 'capterait le texte des éléments');
    assert.equal(
      options.disable_session_recording,
      true,
      'filmerait la saisie'
    );
    assert.equal(
      options.capture_pageview,
      false,
      'compterait les vues DEUX fois'
    );
    assert.equal(options.capture_pageleave, false);
    // AUCUN COOKIE, ET CE N'EST PAS UNE PRÉFÉRENCE. Le défaut de PostHog est
    // `'localStorage+cookie'` ; avec lui, `PostHogPersistence.remove()` lance la
    // sonde de domaine `dmn_chk_`, qui pose un cookie jetable sur `.io` puis
    // `.github.io` — tous deux REFUSÉS, suffixe public — avant de trouver
    // l'hôte exact. Deux lignes rouges dans la console de chaque visiteur
    // Firefox des dix-huit sites qui mesurent, relevées le 20/09/2026.
    //
    // `cross_subdomain_cookie: false` NE SUFFIT PAS : la suppression des deux
    // formes du cookie porte un `true` codé en dur. C'est `persistence` qui
    // coupe la branche — mesuré sur le morceau déployé, douze écritures de
    // cookie avec le défaut, zéro avec celui-ci.
    assert.equal(options.persistence, 'localStorage');
    // Gardé quand même : il décrit l'intention, et il est honoré pour
    // l'écriture de valeur le jour où le parc quittera `github.io`.
    assert.equal(options.cross_subdomain_cookie, false);
    assert.equal(options.person_profiles, 'identified_only');
    // Le nuage EUROPÉEN — seule raison d'avoir quitté GA4.
    assert.match(options.api_host, /^https:\/\/eu\./u);
    // Et l'objet ne se modifie pas par mégarde d'un appel à l'autre.
    assert.ok(Object.isFrozen(OPTIONS_VIE_PRIVEE));
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('le nom d’app se déduit du chemin de base, et rien à la racine', () => {
  assert.equal(nomDApp('/mister-cim10/'), 'mister-cim10');
  assert.equal(nomDApp('/miss-dice/'), 'miss-dice');
  // Sans barre finale, et avec un sous-chemin : le PREMIER segment nomme.
  assert.equal(nomDApp('/mister-cim10'), 'mister-cim10');
  assert.equal(nomDApp('/mister-cim10/aide'), 'mister-cim10');
  // À la racine, le chemin ne nomme rien : `null` plutôt qu'un nom inventé.
  assert.equal(nomDApp('/'), null);
  assert.equal(nomDApp(''), null);
});

test('app_name est une SUPER-propriété, pas un paramètre recopié', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const faux = await avecAccord({ appName: 'mister-cim10' });
    // Enregistrée UNE fois : PostHog la joint ensuite à tout ce qui part, y
    // compris à ce que la bibliothèque envoie d'elle-même. La recopier sur
    // chaque appel la ferait manquer sur ces derniers.
    assert.deepEqual(faux.appels.register.at(-1), { app_name: 'mister-cim10' });
    trackEvent('export');
    assert.deepEqual(faux.appels.capture.at(-1).params, {});
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('usePageViews envoie une vue par navigation, pas par rendu', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const faux = await avecAccord();

    function Probe({ path }) {
      usePageViews(path);
      return h('span', null, path);
    }
    const view = await mount(h(Probe, { path: '/a' }));
    assert.equal(vuesDe(faux).length, 1);

    // Même chemin, nouveau rendu : pas de vue de plus.
    await view.rerender(h(Probe, { path: '/a' }));
    assert.equal(vuesDe(faux).length, 1);

    await view.rerender(h(Probe, { path: '/b' }));
    assert.equal(vuesDe(faux).length, 2);
    assert.equal(vuesDe(faux).at(-1).$pathname, '/b');
    await view.unmount();
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('la vue d’arrivée est rejouée à l’accord, pas perdue', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const faux = fauxPosthog();
    // Comme en vrai : la mesure attend le consentement, et le visiteur n'a pas
    // encore répondu quand l'écran d'arrivée se monte.
    initAnalytics({ posthogKey: CLE, loader: chargeurFactice(faux) });

    function Probe({ path }) {
      usePageViews(path);
      return h('span', null, path);
    }
    const view = await mount(h(Probe, { path: '/accueil' }));

    // Rien ne part avant l'accord — c'est la règle, et elle tient.
    assert.equal(vuesDe(faux).length, 0);

    // L'accord arrive APRÈS le montage : sans rejeu, cette vue serait perdue
    // pour toujours, le chemin n'ayant plus de raison de changer.
    setAnalyticsConsent('granted');
    await laisseCharger();
    assert.equal(vuesDe(faux).length, 1);
    assert.equal(vuesDe(faux).at(-1).$pathname, '/accueil');

    // Et elle ne part qu'UNE fois : une navigation ultérieure ne la rejoue pas.
    await view.rerender(h(Probe, { path: '/suite' }));
    assert.deepEqual(
      vuesDe(faux).map(v => v.$pathname),
      ['/accueil', '/suite']
    );
    await view.unmount();
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('un refus jette la vue mise de côté', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const faux = fauxPosthog();
    initAnalytics({ posthogKey: CLE, loader: chargeurFactice(faux) });
    assert.equal(trackPageView('/accueil'), false);

    // Refuser, puis accepter plus tard : la vue de l'écran d'arrivée ne doit
    // pas ressurgir — l'utilisateur l'a quitté depuis longtemps.
    setAnalyticsConsent('denied');
    setAnalyticsConsent('granted');
    await laisseCharger();
    assert.equal(vuesDe(faux).length, 0);
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('$current_url porte le chemin de base de l’app', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const faux = await avecAccord();
    trackPageView('/history');
    const vue = vuesDe(faux).at(-1);

    // Les vingt sites partagent l'origine : sans le chemin de base, l'URL
    // enregistrée n'existe pas. `BASE_URL` vaut « / » hors build, donc on
    // vérifie ici que la composition est correcte et sans double barre.
    assert.equal(vue.$pathname, '/history');
    assert.equal(vue.$current_url, `${window.location.origin}/history`);
    assert.ok(!vue.$current_url.includes('//history'));
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('un refus APRÈS un accord coupe la collecte', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const faux = await avecAccord();
    setAnalyticsConsent('denied');
    // Le script ne se décharge pas — c'est impossible une fois évalué — mais la
    // collecte est coupée, et plus rien ne part d'ici.
    assert.equal(faux.appels.optOut, 1);
    assert.equal(trackEvent('clic'), false);
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('la couture des tests e2e retient ce qui a été demandé', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    await avecAccord({ appName: 'miss-dice' });
    trackPageView('/a');
    trackEvent('lancer', { des: 2 });
    // `window.__DWC_MESURE` remplace ce que `dataLayer` donnait gratuitement du
    // temps de GA4 : la garde `playwright-entree` en dépend, et neuf apps en
    // dépendent d'elle.
    const trace = window.__DWC_MESURE ?? [];
    assert.deepEqual(
      trace.map(e => e.event),
      ['$pageview', 'lancer']
    );
    assert.equal(trace.at(-1).des, 2);
  } finally {
    delete window.__DWC_MESURE;
    resetAnalytics();
    dom.restore();
  }
});
