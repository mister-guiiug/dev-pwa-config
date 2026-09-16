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
  ConsentSettings,
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

/**
 * Le DERNIER `consent update` poussé dans `dataLayer`.
 *
 * `setAnalyticsConsent` ne rend rien d'observable une fois le script chargé :
 * un refus après un accord ne décharge pas le tag, il coupe la collecte CÔTÉ
 * GOOGLE. Le seul témoin de ce geste est donc l'ordre poussé — et c'est
 * exactement ce qu'il faut vérifier pour un retrait.
 */
const dernierConsentement = () => {
  // `window.dataLayer`, et non `globalThis` : `analytics.js` écrit sur la
  // fenêtre, et le DOM de test n'est pas l'objet global.
  const ordres = [...(window.dataLayer ?? [])].filter(
    a => a?.[0] === 'consent' && a?.[1] === 'update'
  );
  return ordres.at(-1)?.[2]?.analytics_storage ?? null;
};

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

test('placement="fixed" : le bandeau demande sa place, et l’oublie sans la prop', async () => {
  // LE DÉFAUT MESURÉ. Cette section habillait la boîte sans la placer :
  // `position: static`, donc en fin de flux, là où les apps le montent —
  // sous le pied de page. mister-cim10 en production, 375 × 812 : boîte de 753
  // à 891 px pour une fenêtre de 812, recouverte par la barre basse dont le
  // bord haut est à 756.
  let dom = prepare();
  let vue = await mount(
    h(ConsentBanner, { gaMeasurementId: GA, placement: 'fixed' })
  );
  assert.equal(
    vue.container.querySelector('[data-dwc="consent-banner"]').dataset
      .placement,
    'fixed'
  );
  await vue.unmount();
  dom.restore();

  // Opt-in : miss-dice pose le sien EN HAUT dans sa propre feuille. Un
  // attribut qui apparaîtrait sans être demandé lui ferait subir un `bottom`
  // par-dessus son `top`.
  dom = prepare();
  vue = await mount(h(ConsentBanner, { gaMeasurementId: GA }));
  assert.equal(
    vue.container
      .querySelector('[data-dwc="consent-banner"]')
      .hasAttribute('data-placement'),
    false
  );
  await vue.unmount();
  dom.restore();
});

/* ── ConsentSettings : revenir sur son choix ───────────────────────────── */

const reglage = container =>
  container.querySelector('[data-dwc="consent-settings"]');

test('le réglage ne paraît pas tant qu’il n’y a pas de choix à modifier', async () => {
  // Sans identifiant : rien à régler.
  let dom = prepare();
  let vue = await mount(h(ConsentSettings, {}));
  assert.equal(reglage(vue.container), null, 'aucune mesure configurée');
  await vue.unmount();
  dom.restore();

  // Avec un identifiant mais aucun choix : le bandeau est à l'écran en train
  // de poser la question, un « modifier mon choix » à côté d'elle n'aurait
  // pas de référent.
  dom = prepare();
  vue = await mount(h(ConsentSettings, { gaMeasurementId: GA }));
  assert.equal(reglage(vue.container), null, 'la question est encore ouverte');
  await vue.unmount();
  dom.restore();
});

test('le réglage dit l’état, et le dit dans les deux sens', async () => {
  for (const [choix, attendu] of [
    ['granted', /acceptée/],
    ['denied', /refusée/],
  ]) {
    const dom = prepare(choix);
    const vue = await mount(h(ConsentSettings, { gaMeasurementId: GA }));

    const bouton = reglage(vue.container);
    assert.ok(bouton, `le réglage doit paraître après un ${choix}`);
    assert.equal(bouton.dataset.choice, choix);
    assert.match(bouton.textContent, attendu);
    // Le nom accessible porte AUSSI ce que le clic fait : l'état seul ne le
    // dirait pas.
    assert.match(bouton.textContent, /Modifier mon choix/);

    await vue.unmount();
    dom.restore();
  }
});

test('LE TEST QUI COMPTE : cliquer le réglage RAPPELLE le bandeau', async () => {
  // Le bandeau et le réglage sont DEUX instances du hook, chacune avec sa
  // copie du choix dans un `useState`. Sans le registre d'abonnés, vider le
  // stockage ici laissait le bandeau — qui n'en savait rien — invisible : le
  // bouton n'aurait rien fait de visible, c'est-à-dire rien du tout.
  const dom = prepare('granted');
  const vue = await mount(
    h('div', null, [
      h(ConsentBanner, { key: 'b', gaMeasurementId: GA }),
      h(ConsentSettings, { key: 'r', gaMeasurementId: GA }),
    ])
  );

  assert.equal(
    vue.container.querySelector('[data-dwc="consent-banner"]'),
    null,
    'le choix est fait : pas de bandeau'
  );

  await vue.act(() => reglage(vue.container).click());

  assert.ok(
    vue.container.querySelector('[data-dwc="consent-banner"]'),
    'le bandeau doit revenir poser la question'
  );
  assert.equal(reglage(vue.container), null, 'et le réglage s’efface');
  assert.equal(
    window.localStorage.getItem(CONSENT_KEY),
    null,
    'le choix est oublié'
  );

  await vue.unmount();
  dom.restore();
});

test('le retrait COUPE LA COLLECTE avant d’oublier le choix', async () => {
  // La raison d'être du refus préalable : l'utilisateur qui rouvre la question
  // et s'en va sans rien choisir ne doit pas être mesuré pendant ce temps. Le
  // script, lui, reste évalué — c'est le mode consentement de Google, et c'est
  // pour ça qu'on regarde l'ORDRE poussé et non la présence du tag.
  const dom = prepare('granted');
  const vue = await mount(h(ConsentSettings, { gaMeasurementId: GA }));

  assert.equal(dernierConsentement(), 'granted', 'l’accord d’hier est rejoué');

  await vue.act(() => reglage(vue.container).click());

  assert.equal(
    dernierConsentement(),
    'denied',
    'la collecte doit être coupée par le geste lui-même'
  );

  await vue.unmount();
  dom.restore();
});

test('le réglage est cloisonné comme le bandeau', async () => {
  // Le choix d'une autre app ne doit pas donner à celle-ci un réglage sans
  // objet — ni, pire, lui laisser modifier le consentement de sa voisine.
  const dom = prepare('granted', '/mister-cim10/');
  const vue = await mount(
    h(ConsentSettings, { gaMeasurementId: GA, scope: '/miss-contraction/' })
  );

  assert.equal(reglage(vue.container), null);
  assert.equal(
    window.localStorage.getItem(consentKey('/mister-cim10/')),
    'granted',
    'le choix de la voisine est intact'
  );

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
