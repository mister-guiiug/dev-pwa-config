/**
 * Le panneau qui dit ce que l'application fait des données.
 *
 * CE QUE CES TESTS PROTÈGENT, et pourquoi ce n'est pas du cosmétique :
 *
 *  1. **Un trou se VOIT.** Les mentions que seul l'exploitant peut fournir —
 *     responsable du traitement, adresse des droits, conservation, fondement
 *     des rapports d'erreur — n'ont pas de valeur par défaut plausible. Sans
 *     elles, le panneau affiche son marqueur à l'écran plutôt que de se taire :
 *     c'est l'idiome d'`exploitant.ts` de `mister-doc`, et c'est ce qui fait
 *     qu'un oubli finit par être corrigé.
 *  2. **Le panneau n'ajoute AUCUNE décision.** Deux surfaces de choix
 *     demanderaient d'être tenues à l'équilibre l'une de l'autre, sous peine
 *     de refaire par la mise en page ce que le bandeau évite par construction.
 *     Un test compte donc les boutons.
 *  3. **Un chiffre plausible est le plus dangereux des défauts.** La
 *     conservation valait 14 mois en dur — la durée des propriétés GA4 du parc,
 *     abandonnées le 19/09/2026. Elle a survécu trois jours à ce qu'elle
 *     décrivait, sans que rien ne le signale. Elle n'a plus de défaut.
 *  4. **Le destinataire annoncé est le destinataire réel.** Ces textes
 *     nommaient Google dans les sept langues alors que la mesure passe par
 *     PostHog et les erreurs par Sentry. Un test refuse désormais le retour du
 *     nom.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import { PrivacyNotice, MARQUEUR_MOTIF } from '../react/privacy-notice.js';
import { ConsentBanner, consentKey } from '../react/consent-banner.js';
import { LABELS } from '../react/labels.js';
import fr from '../react/labels-fr.js';
import { resetAnalytics } from '../analytics.js';
import { mount, setupDom } from './helpers/dom.mjs';

const CLE = 'phc_abcdefghijklmnopqrstuvwxyz0123456789';

function prepare(choixMemorise) {
  const dom = setupDom();
  resetAnalytics();
  delete globalThis.__DWC_MESURE;
  if (choixMemorise) window.localStorage.setItem(consentKey(), choixMemorise);
  return dom;
}

const texte = container => container.textContent ?? '';

test("sans mention de l'exploitant, le panneau le dit à l'écran", async () => {
  const dom = prepare();
  const { container, unmount } = await mount(
    h(PrivacyNotice, { posthogKey: CLE })
  );

  const marqueur = fr.privacy.missing;
  const occurrences = texte(container).split(marqueur).length - 1;
  // TROIS : le responsable du traitement, l'adresse des droits, et la
  // conservation — qui n'a plus de défaut depuis le 19/09/2026. Les 14 mois
  // d'avant décrivaient les propriétés GA4 du parc, abandonnées ; les laisser
  // aurait annoncé au visiteur une durée que personne n'a vérifiée chez
  // PostHog. Une de moins voudrait dire qu'une mention a été comblée par un
  // défaut plausible, ce qui est précisément ce que ce panneau refuse.
  assert.equal(occurrences, 3, 'les trois mentions manquantes doivent se voir');

  await unmount();
  dom.restore();
});

test('les mentions fournies remplacent le marqueur', async () => {
  const dom = prepare();
  const { container, unmount } = await mount(
    h(PrivacyNotice, {
      posthogKey: CLE,
      controller: 'Association Untel, 1 rue des Lilas',
      contact: 'rgpd@exemple.fr',
      retentionMonths: 12,
    })
  );

  const t = texte(container);
  assert.ok(!t.includes(fr.privacy.missing), 'plus aucun marqueur');
  assert.ok(t.includes('Association Untel'), 'le responsable est affiché');
  assert.ok(t.includes('rgpd@exemple.fr'), "l'adresse des droits est affichée");

  await unmount();
  dom.restore();
});

test("la conservation n'a AUCUN défaut, et s'affiche quand on la passe", async () => {
  const dom = prepare();
  const { container, rerender, unmount } = await mount(
    h(PrivacyNotice, { posthogKey: CLE })
  );
  // Sans valeur : le marqueur, jamais un chiffre. Le défaut d'avant (14 mois)
  // venait de GA4 et a survécu trois jours à son abandon — un chiffre plausible
  // est le plus dangereux des défauts, parce que personne ne le relit.
  assert.ok(
    !/\b\d+\b/.test(texte(container)),
    'aucun nombre ne doit apparaître sans valeur fournie'
  );

  await rerender(h(PrivacyNotice, { posthogKey: CLE, retentionMonths: 2 }));
  assert.match(texte(container), /\b2\b/);

  await unmount();
  dom.restore();
});

test("sans DSN, le panneau ne parle pas d'erreurs", async () => {
  const dom = prepare();
  const { container, unmount } = await mount(
    h(PrivacyNotice, { posthogKey: CLE })
  );

  // Annoncer un envoi qui n'a pas lieu est une information fausse, exactement
  // comme taire celui qui a lieu. `mister-doc` est dans ce cas : câblé, sans
  // DSN posé.
  assert.ok(!texte(container).includes(fr.privacy.errors));
  assert.ok(!texte(container).includes('Sentry'));

  await unmount();
  dom.restore();
});

test('avec un DSN, la section erreurs apparaît et son fondement manque', async () => {
  const dom = prepare();
  const { container, rerender, unmount } = await mount(
    h(PrivacyNotice, {
      posthogKey: CLE,
      retentionMonths: 12,
      controller: 'Association Untel',
      contact: 'rgpd@exemple.fr',
      sentryDsn: 'https://abc123@o1.ingest.de.sentry.io/2',
    })
  );

  const t = texte(container);
  assert.ok(t.includes(fr.privacy.errors), 'la section doit être là');
  assert.ok(t.includes('Sentry'), 'le destinataire doit être nommé');
  assert.ok(t.includes('IP'), "l'adresse IP doit être annoncée");
  // Le DSN lui-même n'a rien à faire à l'écran : il sert de signal, pas de
  // contenu.
  assert.ok(!t.includes('o1.ingest'), 'le DSN ne doit pas être rendu');
  // Le fondement de CES rapports vient de l'exploitant : il ne peut pas être
  // « votre consentement », puisqu'ils partent avant toute question.
  assert.equal(
    t.split(fr.privacy.missing).length - 1,
    1,
    'seul le fondement des rapports doit manquer'
  );

  await rerender(
    h(PrivacyNotice, {
      posthogKey: CLE,
      retentionMonths: 12,
      controller: 'Association Untel',
      contact: 'rgpd@exemple.fr',
      sentryDsn: 'https://abc123@o1.ingest.de.sentry.io/2',
      errorBasis:
        'Intérêt légitime : maintenir l’application en état de marche.',
    })
  );
  assert.ok(!texte(container).includes(fr.privacy.missing));

  await unmount();
  dom.restore();
});

test('aucune locale ne nomme plus Google', async () => {
  // LE DÉFAUT QUE CE TEST EMPÊCHE DE REVENIR. Écrits le 16/09/2026, ces sept
  // textes décrivaient Google Analytics et « un cookie de Google ». Le parc est
  // passé à PostHog le 19 et rien ne les a suivis : le panneau nommait un
  // destinataire faux, dans les sept langues. Il n'a trompé personne — aucune
  // app ne le montait — mais il allait le faire à l'adoption.
  for (const [locale, dictionnaire] of Object.entries(LABELS)) {
    const bloc = JSON.stringify(dictionnaire.privacy ?? {});
    assert.ok(
      !/Google/i.test(bloc),
      `${locale} : le panneau nomme encore Google`
    );
    assert.ok(
      /PostHog/.test(bloc) && /Sentry/.test(bloc),
      `${locale} : les deux destinataires réels doivent être nommés`
    );
  }
});

test("tant qu'aucun choix n'est fait, le panneau n'offre aucun bouton", async () => {
  const dom = prepare();
  const { container, unmount } = await mount(
    h(PrivacyNotice, { posthogKey: CLE })
  );

  // Le bandeau est alors à l'écran en train de poser la question : une seconde
  // surface de décision à côté de lui serait exactement ce qu'on évite.
  assert.equal(container.querySelectorAll('button').length, 0);

  await unmount();
  dom.restore();
});

test('un choix fait, la sortie est dans le panneau', async () => {
  const dom = prepare('granted');
  const { container, unmount } = await mount(
    h(PrivacyNotice, { posthogKey: CLE })
  );

  const sortie = container.querySelector('[data-dwc="consent-settings"]');
  assert.ok(sortie, 'le moyen de revenir sur son choix doit être là');
  assert.equal(sortie.dataset.choice, 'granted');

  await unmount();
  dom.restore();
});

test('les sept locales décrivent le même panneau', async () => {
  const attendues = Object.keys(fr.privacy).sort();
  for (const [locale, dictionnaire] of Object.entries(LABELS)) {
    assert.deepEqual(
      Object.keys(dictionnaire.privacy ?? {}).sort(),
      attendues,
      `${locale} : le groupe privacy diverge du français`
    );
    // Le marqueur est TRADUIT — un lecteur néerlandophone ne doit pas lire
    // « [À compléter] ». Le motif exporté doit donc couvrir les sept : en
    // ajouter une sans l'y ajouter rend ce test rouge, ce qui est le but.
    assert.match(
      dictionnaire.privacy.missing,
      MARQUEUR_MOTIF,
      `${locale} : marqueur hors du motif exporté`
    );
    // Les deux interpolations doivent survivre à la traduction.
    assert.ok(
      dictionnaire.privacy.retentionText.includes('{months}'),
      `${locale} : {months} perdu`
    );
    assert.ok(
      dictionnaire.privacy.rightsText.includes('{contact}'),
      `${locale} : {contact} perdu`
    );
  }
});

test('`policy` se déplie après les actions, sans ajouter de décision', async () => {
  const dom = prepare();
  const { container, unmount } = await mount(
    h(ConsentBanner, {
      posthogKey: CLE,
      policy: h(PrivacyNotice, { posthogKey: CLE, contact: 'x@y.fr' }),
    })
  );

  const bandeau = container.querySelector('[data-dwc="consent-banner"]');
  const actions = bandeau.querySelector('[data-dwc="consent-actions"]');
  const repli = bandeau.querySelector('[data-dwc="consent-policy-details"]');
  assert.ok(repli, 'le repli doit exister quand `policy` est fourni');

  // APRÈS les actions : le repli ne doit pas s'interposer entre la question et
  // les deux boutons qui y répondent.
  assert.equal(
    actions.compareDocumentPosition(repli) & Node.DOCUMENT_POSITION_FOLLOWING,
    Node.DOCUMENT_POSITION_FOLLOWING
  );

  // Toujours DEUX boutons : accepter, refuser. Le panneau déplié n'en ajoute
  // aucun tant qu'aucun choix n'est fait.
  assert.equal(bandeau.querySelectorAll('button').length, 2);

  await unmount();
  dom.restore();
});
