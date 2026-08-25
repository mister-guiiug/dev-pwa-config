/**
 * GA4 / GTM : le consentement d'abord, la mesure ensuite.
 *
 * CE QUE CES TESTS PROTÈGENT. Les fragments d'injection existaient depuis
 * longtemps (neuf apps portent les marqueurs `__ANALYTICS_*__`), mais aucune
 * app ne mesurait quoi que ce soit : zéro `trackEvent`, zéro vue de page sur
 * changement de route, zéro consentement. Les deux règles qui comptent ici :
 * rien ne part avant l'accord, et une vue de page par navigation.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import {
  getAnalyticsId,
  initAnalytics,
  isAnalyticsLoaded,
  parseGaMeasurementId,
  parseGtmContainerId,
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

const events = () =>
  (window.dataLayer ?? []).filter(entry => typeof entry?.event === 'string');

test('les identifiants sont validés, pas devinés', () => {
  assert.equal(parseGtmContainerId('gtm-abc123'), 'GTM-ABC123');
  assert.equal(parseGtmContainerId('G-ABC123'), null);
  assert.equal(parseGaMeasurementId('g-abc123'), 'G-ABC123');
  assert.equal(parseGaMeasurementId('GTM-ABC'), null);
  assert.equal(parseGtmContainerId(undefined), null);
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
    initAnalytics({ gtmContainerId: 'GTM-ABC123' });

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
    assert.match(script.src, /googletagmanager\.com\/gtm\.js\?id=GTM-ABC123/u);
    assert.equal(getAnalyticsId(), 'GTM-ABC123');

    assert.equal(trackEvent('clic', { cible: 'menu' }), true);
    assert.deepEqual(events().at(-1), { event: 'clic', cible: 'menu' });
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

test('GTM l’emporte sur GA4 quand les deux sont fournis', () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const state = initAnalytics({
      gtmContainerId: 'GTM-ABC123',
      gaMeasurementId: 'G-ABC123',
      requireConsent: false,
    });
    // Charger les deux compterait chaque événement deux fois : GA4 se
    // configure DANS GTM. C'est déjà l'arbitrage des fragments de build.
    assert.equal(state.mode, 'gtm');
    assert.equal(document.querySelectorAll('script[src]').length, 1);
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('usePageViews envoie une vue par navigation, pas par rendu', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    initAnalytics({ gtmContainerId: 'GTM-ABC123', requireConsent: false });

    function Probe({ path }) {
      usePageViews(path);
      return h('span', null, path);
    }
    const view = await mount(h(Probe, { path: '/a' }));
    const vues = () => events().filter(e => e.event === 'page_view');
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

test('les fragments de build déclarent le consentement avant le tag', () => {
  const gtm = buildAnalyticsHtmlFragments({ gtmContainerId: 'GTM-ABC123' });
  const posConsent = gtm.head.indexOf("gtag('consent', 'default'");
  const posTag = gtm.head.indexOf('Google Tag Manager');
  assert.ok(posConsent >= 0, 'état par défaut absent');
  assert.ok(posConsent < posTag, 'le consentement doit précéder le tag');
  assert.match(gtm.head, /analytics_storage: 'denied'/u);

  const ga = buildAnalyticsHtmlFragments({ gaMeasurementId: 'G-ABC123' });
  assert.ok(ga.head.indexOf("gtag('consent'") < ga.head.indexOf('gtag/js'));

  // `consent: false` restaure le comportement d'avant, pour une CMP externe.
  const sans = buildAnalyticsHtmlFragments({
    gtmContainerId: 'GTM-ABC123',
    consent: false,
  });
  assert.doesNotMatch(sans.head, /consent/u);

  // Sans identifiant : aucun fragment, donc aucun état de consentement inutile.
  assert.deepEqual(buildAnalyticsHtmlFragments({}), { head: '', body: '' });
});
