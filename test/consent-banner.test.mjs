/**
 * Le bandeau de consentement.
 *
 * CE QUE CES TESTS PROTÈGENT. `analytics.js` n'injecte le tag Google qu'après
 * un accord explicite — c'est sa promesse centrale, et le bandeau est
 * désormais le seul endroit d'où cet accord peut venir. Chaque test ci-dessous
 * vérifie donc la PRÉSENCE OU L'ABSENCE DU SCRIPT dans le document, pas l'état
 * interne du module : un état interne juste avec un script chargé quand même
 * serait exactement le défaut qu'on veut rendre impossible.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import {
  ConsentBanner,
  CONSENT_KEY,
  consentKey,
} from '../react/consent-banner.js';
import { resetAnalytics } from '../analytics.js';
import { mount, setupDom } from './helpers/dom.mjs';

const GA = 'G-TEST12345';

/** Le script du tag, ou `null` — la seule mesure qui compte ici. */
const tagCharge = () =>
  document.head.querySelector('script[src*="googletagmanager.com"]');

/** Un DOM neuf, un module d'analytics neuf, un stockage neuf. */
function prepare(choixMemorise, scope) {
  const dom = setupDom();
  resetAnalytics();
  delete globalThis.dataLayer;
  if (choixMemorise)
    window.localStorage.setItem(consentKey(scope), choixMemorise);
  return dom;
}

const bouton = (container, nom) =>
  container.querySelector(`[data-dwc="consent-${nom}"]`);

test('sans identifiant de mesure, aucun bandeau', async () => {
  const dom = prepare();
  const vue = await mount(h(ConsentBanner, {}));

  assert.equal(
    vue.container.querySelector('[data-dwc="consent-banner"]'),
    null
  );
  // La contre-épreuve : ce n'est pas « le bandeau est caché », c'est qu'il n'y
  // a rien à demander. Dix des vingt et une apps du parc partiront ainsi.
  assert.equal(tagCharge(), null);

  await vue.unmount();
  dom.restore();
});

test('avec un identifiant et aucun choix, le bandeau paraît — et rien n’est chargé', async () => {
  const dom = prepare();
  const vue = await mount(h(ConsentBanner, { gaMeasurementId: GA }));

  assert.ok(vue.container.querySelector('[data-dwc="consent-banner"]'));
  // LE POINT ENTIER DU MODULE : le tag n'est pas là AVANT la réponse.
  assert.equal(tagCharge(), null);

  await vue.unmount();
  dom.restore();
});

test('refuser et accepter sont au même niveau, dans le même conteneur', async () => {
  const dom = prepare();
  const vue = await mount(h(ConsentBanner, { gaMeasurementId: GA }));

  const accepter = bouton(vue.container, 'accept');
  const refuser = bouton(vue.container, 'refuse');
  assert.ok(accepter && refuser);
  // La CNIL demande que refuser coûte autant qu'accepter. Un « gérer mes
  // préférences » qui cacherait le refus derrière un second écran rendrait ce
  // test faux, et c'est précisément ce qu'on veut qu'il empêche.
  assert.equal(refuser.parentElement, accepter.parentElement);

  await vue.unmount();
  dom.restore();
});

test('accepter charge le tag et mémorise le choix', async () => {
  const dom = prepare();
  const vue = await mount(h(ConsentBanner, { gaMeasurementId: GA }));

  await vue.act(() => bouton(vue.container, 'accept').click());

  const script = tagCharge();
  assert.ok(script, 'le tag doit être injecté après l’accord');
  assert.match(script.src, /gtag\/js\?id=G-TEST12345/);
  assert.equal(window.localStorage.getItem(CONSENT_KEY), 'granted');
  assert.equal(
    vue.container.querySelector('[data-dwc="consent-banner"]'),
    null
  );

  await vue.unmount();
  dom.restore();
});

test('refuser ne charge rien, et le bandeau ne revient pas', async () => {
  const dom = prepare();
  const vue = await mount(h(ConsentBanner, { gaMeasurementId: GA }));

  await vue.act(() => bouton(vue.container, 'refuse').click());

  assert.equal(tagCharge(), null);
  assert.equal(window.localStorage.getItem(CONSENT_KEY), 'denied');
  assert.equal(
    vue.container.querySelector('[data-dwc="consent-banner"]'),
    null
  );

  await vue.unmount();
  dom.restore();
});

test('un accord mémorisé recharge le tag au montage suivant, sans reposer la question', async () => {
  const dom = prepare('granted');
  const vue = await mount(h(ConsentBanner, { gaMeasurementId: GA }));

  // SANS CE REJEU, le tag ne serait jamais injecté pour un visiteur qui a déjà
  // accepté : `initAnalytics` part toujours de `denied`, et l'accord d'hier ne
  // survit que dans le stockage.
  assert.ok(tagCharge(), 'l’accord d’hier doit rouvrir la collecte');
  assert.equal(
    vue.container.querySelector('[data-dwc="consent-banner"]'),
    null
  );

  await vue.unmount();
  dom.restore();
});

test('un refus mémorisé ne charge rien et ne repose pas la question', async () => {
  const dom = prepare('denied');
  const vue = await mount(h(ConsentBanner, { gaMeasurementId: GA }));

  assert.equal(tagCharge(), null);
  assert.equal(
    vue.container.querySelector('[data-dwc="consent-banner"]'),
    null
  );

  await vue.unmount();
  dom.restore();
});

test('le bandeau est une région nommée, pas une boîte modale', async () => {
  const dom = prepare();
  const vue = await mount(h(ConsentBanner, { gaMeasurementId: GA }));

  const bandeau = vue.container.querySelector('[data-dwc="consent-banner"]');
  // Piéger le focus pour obtenir un consentement est la figure que le RGPD
  // appelle un « dark pattern » : le rôle doit rester `region`.
  assert.equal(bandeau.getAttribute('role'), 'region');
  assert.ok(bandeau.getAttribute('aria-label'));

  await vue.unmount();
  dom.restore();
});

test('le lien de confidentialité n’apparaît que si on le fournit', async () => {
  const dom = prepare();
  const sans = await mount(h(ConsentBanner, { gaMeasurementId: GA }));
  assert.equal(
    sans.container.querySelector('[data-dwc="consent-policy"]'),
    null
  );
  await sans.unmount();

  resetAnalytics();
  const avec = await mount(
    h(ConsentBanner, { gaMeasurementId: GA, policyHref: '/confidentialite' })
  );
  const lien = avec.container.querySelector('[data-dwc="consent-policy"]');
  assert.equal(lien?.getAttribute('href'), '/confidentialite');
  await avec.unmount();

  dom.restore();
});

test('la clé de stockage porte le chemin de l’application', () => {
  // Sans portée (développement, racine), la clé reste nue : le cloisonnement
  // vient déjà du port, et deux apps locales ne se marchent pas dessus.
  assert.equal(consentKey('/'), CONSENT_KEY);
  assert.equal(consentKey(), CONSENT_KEY);
  // Déployées, les vingt apps partagent l'origine `<compte>.github.io` : c'est
  // le chemin de base qui les distingue, et donc la clé.
  assert.equal(consentKey('/miss-uwh/'), `${CONSENT_KEY}:/miss-uwh/`);
  assert.notEqual(consentKey('/miss-uwh/'), consentKey('/mister-doc/'));
});

test('un accord donné à une app ne vaut PAS pour une autre', async () => {
  // LE DÉFAUT QUE CE TEST REND IMPOSSIBLE, mesuré en production le 15/09/2026 :
  // accepter sur mister-cim10 faisait disparaître le bandeau de miss-contraction,
  // qui chargeait son propre tag sans avoir rien demandé à personne.
  const dom = prepare('granted', '/mister-cim10/');
  const vue = await mount(
    h(ConsentBanner, { gaMeasurementId: GA, scope: '/miss-contraction/' })
  );

  assert.ok(
    vue.container.querySelector('[data-dwc="consent-banner"]'),
    'la seconde app doit poser sa propre question'
  );
  // Et la mesure qui compte : rien n'est parti chez Google entre-temps.
  assert.equal(tagCharge(), null);

  await vue.unmount();
  dom.restore();
});

test('sous la MÊME portée, le choix d’hier est rejoué', async () => {
  // La contre-épreuve du test précédent. Cloisonner ne doit pas casser le
  // rejeu : sans lui, l'acceptation d'hier serait reperdue à chaque visite et
  // le tag ne partirait jamais.
  const dom = prepare('granted', '/miss-uwh/');
  const vue = await mount(
    h(ConsentBanner, { gaMeasurementId: GA, scope: '/miss-uwh/' })
  );

  assert.equal(
    vue.container.querySelector('[data-dwc="consent-banner"]'),
    null,
    'la question a déjà été posée, elle ne se repose pas'
  );
  assert.ok(tagCharge(), 'le tag doit être chargé, le choix ayant été rejoué');

  await vue.unmount();
  dom.restore();
});
