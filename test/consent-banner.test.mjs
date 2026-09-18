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
  consentPerime,
  readConsentChoice,
  readConsentRecord,
  writeConsentChoice,
} from '../react/consent-banner.js';
import { resetAnalytics } from '../analytics.js';
import {
  chargeurFactice,
  fauxPosthog,
  laisseCharger,
} from './helpers/posthog.mjs';
import { mount, setupDom } from './helpers/dom.mjs';

const CLE = 'phc_abcdefghijklmnopqrstuvwxyz0123456789';

/** Le double de `posthog-js` du test courant, refait par `prepare()`. */
let faux;

/** Les props qui branchent le bandeau sur le double. */
const props = (extra = {}) => ({
  posthogKey: CLE,
  loader: chargeurFactice(faux),
  ...extra,
});

/**
 * Le tag est-il chargé ? Du temps de GA4, un `<script src>` dans le `<head>`
 * en faisait foi. PostHog est importé, pas injecté : le témoin est l'appel à
 * `init` du double, qui ne part que si le socle a décidé de charger.
 */
const tagCharge = () =>
  faux.appels.init.length > 0 ? faux.appels.init[0] : null;

/** Un DOM neuf, un module d'analytics neuf, un stockage neuf. */
function prepare(choixMemorise, scope) {
  const dom = setupDom();
  resetAnalytics();
  faux = fauxPosthog();
  delete globalThis.__DWC_MESURE;
  if (choixMemorise)
    window.localStorage.setItem(consentKey(scope), choixMemorise);
  return dom;
}

const bouton = (container, nom) =>
  container.querySelector(`[data-dwc="consent-${nom}"]`);

/**
 * Le DERNIER geste de consentement adressé au client.
 *
 * `setAnalyticsConsent` ne rend rien d'observable une fois le script chargé :
 * un refus après un accord ne décharge pas la bibliothèque, il coupe la
 * collecte. Le seul témoin est donc l'appel — `opt_out_capturing` pour un
 * retrait, `opt_in_capturing` pour un retour. C'est exactement ce qu'il faut
 * vérifier.
 */
const dernierConsentement = () => {
  // DANS L'ORDRE, jamais par comptage : un refus suivi d'un accord et l'inverse
  // donnent les mêmes compteurs et des états opposés.
  if (faux.appels.gestes.length > 0) return faux.appels.gestes.at(-1);
  // Au tout premier chargement, un accord mémorisé ne produit AUCUN geste : la
  // bibliothèque démarre en collectant, et `init` est alors le seul témoin.
  return faux.appels.init.length > 0 ? 'granted' : null;
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
  const vue = await mount(h(ConsentBanner, props()));

  assert.ok(vue.container.querySelector('[data-dwc="consent-banner"]'));
  // LE POINT ENTIER DU MODULE : le tag n'est pas là AVANT la réponse.
  assert.equal(tagCharge(), null);

  await vue.unmount();
  dom.restore();
});

test('refuser et accepter sont au même niveau, dans le même conteneur', async () => {
  const dom = prepare();
  const vue = await mount(h(ConsentBanner, props()));

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
  const vue = await mount(h(ConsentBanner, props()));

  await vue.act(() => bouton(vue.container, 'accept').click());

  // Le chargement est ASYNCHRONE — `posthog-js` est importé, pas injecté en
  // `<script src>` : au retour immédiat du clic, rien n'est encore observable.
  await laisseCharger();
  const init = tagCharge();
  assert.ok(init, 'le tag doit être chargé après l’accord');
  assert.equal(init.cle, CLE);
  // La valeur brute porte sa DATE depuis le 16/09/2026 (`granted;<ms>`) : on
  // vérifie le choix par le lecteur, et la date à part.
  assert.equal(readConsentChoice(), 'granted');
  assert.ok(
    Math.abs(Date.now() - readConsentRecord().at) < 5_000,
    'le choix doit être daté de maintenant'
  );
  assert.equal(
    vue.container.querySelector('[data-dwc="consent-banner"]'),
    null
  );

  await vue.unmount();
  dom.restore();
});

test('refuser ne charge rien, et le bandeau ne revient pas', async () => {
  const dom = prepare();
  const vue = await mount(h(ConsentBanner, props()));

  await vue.act(() => bouton(vue.container, 'refuse').click());

  assert.equal(tagCharge(), null);
  assert.equal(readConsentChoice(), 'denied');
  assert.equal(
    vue.container.querySelector('[data-dwc="consent-banner"]'),
    null
  );

  await vue.unmount();
  dom.restore();
});

test('un accord mémorisé recharge le tag au montage suivant, sans reposer la question', async () => {
  const dom = prepare('granted');
  const vue = await mount(h(ConsentBanner, props()));

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
  const vue = await mount(h(ConsentBanner, props()));

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
  const vue = await mount(h(ConsentBanner, props()));

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
  const sans = await mount(h(ConsentBanner, props()));
  assert.equal(
    sans.container.querySelector('[data-dwc="consent-policy"]'),
    null
  );
  await sans.unmount();

  resetAnalytics();
  const avec = await mount(
    h(ConsentBanner, { ...props(), policyHref: '/confidentialite' })
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
    h(ConsentBanner, { ...props(), scope: '/miss-contraction/' })
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

/* ── La fraîcheur du choix ─────────────────────────────────────────────── */

const JOUR = 86_400_000;

test('consentPerime : treize mois, et un choix sans date n’expire jamais', () => {
  const hier = { choice: 'granted', at: Date.now() - JOUR, version: null };
  const vieux = {
    choice: 'granted',
    at: Date.now() - 400 * JOUR,
    version: null,
  };
  const sansDate = { choice: 'granted', at: null, version: null };

  assert.equal(consentPerime(hier), false);
  assert.equal(
    consentPerime(vieux),
    true,
    '400 jours : au-delà des treize mois'
  );
  // Un choix mémorisé avant que la date existe : le compter comme expiré ferait
  // reparaître le bandeau chez tout le monde le jour de la montée.
  assert.equal(consentPerime(sansDate), false);
  assert.equal(consentPerime(null), false);

  // Le REFUS expire au même âge, jamais avant.
  assert.equal(
    consentPerime({ ...vieux, choice: 'denied' }),
    true,
    'un refus de quatre cents jours a cessé de valoir, comme un accord'
  );

  // Réglable, et débrayable.
  assert.equal(consentPerime(hier, { maxAgeDays: 0 }), false);
  assert.equal(consentPerime(hier, { maxAgeDays: 0.5 }), true);
});

test('consentPerime : une version de finalités qui a changé repose la question', () => {
  const v1 = { choice: 'granted', at: Date.now(), version: 1 };
  assert.equal(consentPerime(v1, { purposeVersion: 1 }), false);
  assert.equal(
    consentPerime(v1, { purposeVersion: 2 }),
    true,
    'l’accord d’hier ne porte pas sur ce qu’on mesure aujourd’hui'
  );
  // Une app qui se met à versionner ses finalités repose la question aux choix
  // qui n'en portent pas : c'est le seul sens sûr.
  assert.equal(
    consentPerime({ ...v1, version: null }, { purposeVersion: 2 }),
    true
  );
  // Et une app qui ne versionne rien ne voit aucune différence.
  assert.equal(consentPerime({ ...v1, version: null }), false);
});

test('un accord PÉRIMÉ ne rouvre pas la collecte, et repose la question', async () => {
  // C'est toute la différence entre dater un choix et le faire compter : un
  // `readConsentChoice` nu aurait rejoué `granted` et rechargé le tag.
  const dom = prepare();
  writeConsentChoice('granted', undefined, { at: Date.now() - 400 * JOUR });
  const vue = await mount(h(ConsentBanner, props()));

  assert.equal(
    tagCharge(),
    null,
    'rien ne doit être chargé sur un accord périmé'
  );
  assert.ok(
    vue.container.querySelector('[data-dwc="consent-banner"]'),
    'la question doit être reposée'
  );
  assert.equal(readConsentChoice(), null, 'le choix périmé est oublié');

  await vue.unmount();
  dom.restore();
});

test('un choix SANS DATE est re-daté d’aujourd’hui, pas expiré', async () => {
  // Les choix d'avant cette version n'ont pas de date. L'horloge doit partir de
  // la montée : sans ça, soit ils n'expirent jamais, soit ils expirent tous le
  // même jour.
  const dom = prepare('granted');
  assert.equal(readConsentRecord().at, null, 'la forme ancienne, sans date');

  const vue = await mount(h(ConsentBanner, props()));

  assert.ok(tagCharge(), 'l’accord d’hier vaut toujours');
  assert.equal(
    vue.container.querySelector('[data-dwc="consent-banner"]'),
    null
  );
  assert.ok(
    Math.abs(Date.now() - readConsentRecord().at) < 5_000,
    'il doit désormais porter la date du jour'
  );

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
  let vue = await mount(h(ConsentBanner, { ...props(), placement: 'fixed' }));
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
  vue = await mount(h(ConsentBanner, props()));
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
  vue = await mount(h(ConsentSettings, props()));
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
    const vue = await mount(h(ConsentSettings, props()));

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
      h(ConsentBanner, { key: 'b', ...props() }),
      h(ConsentSettings, { key: 'r', ...props() }),
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
  // script, lui, reste évalué — on ne décharge pas une bibliothèque importée —
  // et c'est pour ça qu'on regarde le GESTE et non la présence du tag.
  const dom = prepare('granted');
  const vue = await mount(h(ConsentSettings, props()));
  await laisseCharger();

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
    h(ConsentSettings, { ...props(), scope: '/miss-contraction/' })
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
    h(ConsentBanner, { ...props(), scope: '/miss-uwh/' })
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
