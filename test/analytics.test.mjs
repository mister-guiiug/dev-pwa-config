/**
 * GA4 : le consentement d'abord, la mesure ensuite.
 *
 * CE QUE CES TESTS PROTÈGENT. Les fragments d'injection existaient depuis
 * longtemps — neuf apps portaient les marqueurs `__ANALYTICS_*__` — mais
 * aucune app ne mesurait quoi que ce soit : zéro `trackEvent`, zéro vue de
 * page sur changement de route, zéro consentement. Les deux règles qui
 * comptent ici : rien ne part avant l'accord, et une vue de page par
 * navigation.
 *
 * Depuis septembre 2026, plus aucune app ne porte ces marqueurs, et le gabarit
 * non plus : `ConsentBanner` est la seule voie en service.
 * `buildAnalyticsHtmlFragments` n'est gardée que parce qu'elle est exportée —
 * ces tests continuent donc de la couvrir, obsolète ou pas.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import {
  getAnalyticsId,
  initAnalytics,
  isAnalyticsLoaded,
  nomDApp,
  parseGaMeasurementId,
  resetAnalytics,
  setAnalyticsConsent,
  trackEvent,
  trackPageView,
} from '../analytics.js';
import { buildAnalyticsHtmlFragments } from '../vite-pwa-base.js';
import { usePageViews } from '../react/use-page-views.js';
import { mount, setupDom } from './helpers/dom.mjs';

/** Les commandes `gtag` sont poussées sous forme d'`arguments`, pas de tableau. */
const commands = () =>
  (window.dataLayer ?? [])
    .filter(entry => typeof entry?.length === 'number')
    .map(entry => [...entry]);

test('les identifiants sont validés, pas devinés', () => {
  assert.equal(parseGaMeasurementId('g-abc123'), 'G-ABC123');
  assert.equal(parseGaMeasurementId('GTM-ABC'), null);
});

test('sans identifiant, rien n’est installé et rien ne jette', () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const state = initAnalytics({});
    assert.deepEqual(state, { mode: null, id: null, loaded: false });
    assert.equal(trackEvent('essai'), false);
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('rien ne part avant le consentement, et le tag n’est pas même injecté', () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    initAnalytics({ gaMeasurementId: 'G-ABC123' });

    assert.equal(isAnalyticsLoaded(), false, 'aucun script injecté');
    assert.equal(document.querySelectorAll('script').length, 0);
    assert.equal(trackEvent('clic'), false);
    assert.equal(trackPageView('/a'), false);

    // L'état par défaut est déclaré AVANT le chargement : c'est la seule
    // position où le mode consentement de Google en tient compte.
    const [first] = commands();
    assert.deepEqual(first.slice(0, 2), ['consent', 'default']);
    assert.equal(first[2].analytics_storage, 'denied');
    assert.equal(first[2].ad_storage, 'denied');

    setAnalyticsConsent({ analytics: true });
    assert.equal(isAnalyticsLoaded(), true);
    const script = document.querySelector('script[src]');
    assert.match(script.src, /googletagmanager\.com\/gtag\/js\?id=G-ABC123/u);
    assert.equal(getAnalyticsId(), 'G-ABC123');

    assert.equal(trackEvent('clic', { cible: 'menu' }), true);
    assert.deepEqual(commands().at(-1), ['event', 'clic', { cible: 'menu' }]);
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('requireConsent: false charge tout de suite', () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    initAnalytics({ gaMeasurementId: 'G-ABC123', requireConsent: false });
    assert.equal(isAnalyticsLoaded(), true);
    const script = document.querySelector('script[src]');
    assert.match(script.src, /gtag\/js\?id=G-ABC123/u);
    // GA4 est configuré SANS vue de page automatique : sinon la page d'entrée
    // serait comptée deux fois, ici et par `trackPageView`.
    const config = commands().find(c => c[0] === 'config');
    assert.equal(config[2].send_page_view, false);
    assert.equal(trackEvent('clic'), true);
    assert.deepEqual(commands().at(-1).slice(0, 2), ['event', 'clic']);
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('usePageViews envoie une vue par navigation, pas par rendu', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    initAnalytics({ gaMeasurementId: 'G-ABC123', requireConsent: false });

    function Probe({ path }) {
      usePageViews(path);
      return h('span', null, path);
    }
    const view = await mount(h(Probe, { path: '/a' }));
    const vues = () =>
      commands()
        .filter(c => c[0] === 'event' && c[1] === 'page_view')
        .map(c => c[2]);
    assert.equal(vues().length, 1);

    // Même chemin, nouveau rendu : pas de vue de plus.
    await view.rerender(h(Probe, { path: '/a' }));
    assert.equal(vues().length, 1);

    await view.rerender(h(Probe, { path: '/b' }));
    assert.equal(vues().length, 2);
    assert.equal(vues().at(-1).page_path, '/b');
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
    // Comme en vrai : la mesure attend le consentement, et le visiteur n'a pas
    // encore répondu quand l'écran d'arrivée se monte.
    initAnalytics({ gaMeasurementId: 'G-ABC123' });

    function Probe({ path }) {
      usePageViews(path);
      return h('span', null, path);
    }
    const view = await mount(h(Probe, { path: '/accueil' }));
    const vues = () =>
      commands()
        .filter(c => c[0] === 'event' && c[1] === 'page_view')
        .map(c => c[2]);

    // Rien ne part avant l'accord — c'est la règle, et elle tient.
    assert.equal(vues().length, 0);

    // L'accord arrive APRÈS le montage : sans rejeu, cette vue serait perdue
    // pour toujours, le chemin n'ayant plus de raison de changer.
    setAnalyticsConsent('granted');
    assert.equal(vues().length, 1);
    assert.equal(vues().at(-1).page_path, '/accueil');

    // Et elle ne part qu'UNE fois : une navigation ultérieure ne la rejoue pas.
    await view.rerender(h(Probe, { path: '/suite' }));
    assert.equal(vues().length, 2);
    assert.deepEqual(
      vues().map(v => v.page_path),
      ['/accueil', '/suite']
    );
    await view.unmount();
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('un refus jette la vue mise de côté', () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    initAnalytics({ gaMeasurementId: 'G-ABC123' });
    assert.equal(trackPageView('/accueil'), false);

    // Refuser, puis accepter plus tard : la vue de l'écran d'arrivée ne doit
    // pas ressurgir — l'utilisateur l'a quitté depuis longtemps.
    setAnalyticsConsent('denied');
    setAnalyticsConsent('granted');
    assert.equal(
      commands().filter(c => c[0] === 'event' && c[1] === 'page_view').length,
      0
    );
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('page_location porte le chemin de base de l’app', () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    initAnalytics({ gaMeasurementId: 'G-ABC123', requireConsent: false });
    trackPageView('/history');
    const vue = commands()
      .filter(c => c[0] === 'event' && c[1] === 'page_view')
      .map(c => c[2])
      .at(-1);

    // Les vingt sites partagent l'origine : sans le chemin de base, l'URL
    // enregistrée n'existe pas. `BASE_URL` vaut « / » hors build, donc on
    // vérifie ici que la composition est correcte et sans double barre.
    assert.equal(vue.page_path, '/history');
    assert.equal(vue.page_location, `${window.location.origin}/history`);
    assert.ok(!vue.page_location.includes('//history'));
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('les fragments de build déclarent le consentement avant le tag', () => {
  const ga = buildAnalyticsHtmlFragments({ gaMeasurementId: 'G-ABC123' });
  const posConsent = ga.head.indexOf("gtag('consent', 'default'");
  const posTag = ga.head.indexOf('gtag/js');
  assert.ok(posConsent >= 0, 'état par défaut absent');
  assert.ok(posConsent < posTag, 'le consentement doit précéder le tag');
  assert.match(ga.head, /analytics_storage: 'denied'/u);
  // Plus de corps : le `noscript` était la moitié GTM, retirée le 18/09/2026.
  assert.equal(ga.body, '');

  // `consent: false` restaure le comportement d'avant, pour une CMP externe.
  const sans = buildAnalyticsHtmlFragments({
    gaMeasurementId: 'G-ABC123',
    consent: false,
  });
  assert.doesNotMatch(sans.head, /gtag\('consent'/u);

  // Sans identifiant : aucun fragment, donc aucun état de consentement inutile.
  assert.deepEqual(buildAnalyticsHtmlFragments({}), { head: '', body: '' });
});

/* ---------------------------------------------------------------------------
 * `app_name` — la maille application dans une propriété commune.
 *
 * Les sites du parc partagent une propriété GA4 (ADR 0011 du squelette). Sans
 * dimension qui les nomme, le total est lisible et le détail ne l'est plus. Et
 * ce n'est
 * PAS `page_path` qui peut jouer ce rôle : au-delà d'environ 500 lignes, les
 * rapports standard rangent le reste dans « (other) ».
 * ------------------------------------------------------------------------ */

test('le nom d’app se déduit du chemin de base, et rien à la racine', () => {
  assert.equal(nomDApp('/mister-cim10/'), 'mister-cim10');
  assert.equal(nomDApp('/miss-dice/'), 'miss-dice');
  // Sans barre finale, et avec un sous-chemin : le PREMIER segment nomme.
  assert.equal(nomDApp('/mister-cim10'), 'mister-cim10');
  assert.equal(nomDApp('/mister-cim10/aide'), 'mister-cim10');
  // À la racine, le chemin ne nomme rien : `null` plutôt qu'un nom inventé,
  // et GA4 affichera « (not set) », qui dit la vérité.
  assert.equal(nomDApp('/'), null);
  assert.equal(nomDApp(''), null);
});

test('app_name accompagne CHAQUE événement, vue de page comprise', () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    initAnalytics({
      gaMeasurementId: 'G-ABC123',
      appName: 'mister-cim10',
      requireConsent: false,
    });

    trackEvent('export');
    trackPageView('/aide');

    const parametres = commands()
      .filter(c => c[0] === 'event')
      .map(c => c[2]);
    // Une dimension personnalisée de GA4 est à portée ÉVÉNEMENT : elle ne se
    // remplit que par un paramètre d'événement. La poser une fois sur la
    // configuration ne suffirait pas.
    assert.equal(parametres.length, 2);
    assert.ok(parametres.every(p => p.app_name === 'mister-cim10'));
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('l’appelant garde le dernier mot sur app_name', () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    initAnalytics({
      gaMeasurementId: 'G-ABC123',
      appName: 'mister-cim10',
      requireConsent: false,
    });
    // S'il nomme l'application lui-même, c'est qu'il sait quelque chose de
    // plus — une vue rejouée pour un autre écran, par exemple.
    trackEvent('clic', { app_name: 'autre-chose' });
    assert.equal(commands().at(-1)[2].app_name, 'autre-chose');
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('sans nom d’app, aucune clé vide n’est envoyée', () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    // `BASE_URL` vaut « / » hors build : la déduction rend `null`.
    initAnalytics({ gaMeasurementId: 'G-ABC123', requireConsent: false });
    trackEvent('clic');
    // Ni `app_name: null` ni `app_name: ''` : la clé est absente. Une valeur
    // vide créerait une ligne « (not set) » qu'on croirait significative.
    assert.ok(!('app_name' in commands().at(-1)[2]));
  } finally {
    resetAnalytics();
    dom.restore();
  }
});
