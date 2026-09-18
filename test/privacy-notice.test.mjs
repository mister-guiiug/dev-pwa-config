/**
 * Le panneau qui dit ce que la mesure d'audience fait.
 *
 * CE QUE CES TESTS PROTÈGENT, et pourquoi ce n'est pas du cosmétique :
 *
 *  1. **Un trou se VOIT.** Les deux mentions que seul l'exploitant peut
 *     fournir — responsable du traitement, adresse des droits — n'ont pas de
 *     valeur par défaut plausible. Sans elles, le panneau affiche son marqueur
 *     à l'écran plutôt que de se taire : c'est l'idiome d'`exploitant.ts` de
 *     `mister-doc`, et c'est ce qui fait qu'un oubli finit par être corrigé.
 *  2. **Le panneau n'ajoute AUCUNE décision.** Deux surfaces de choix
 *     demanderaient d'être tenues à l'équilibre l'une de l'autre, sous peine
 *     de refaire par la mise en page ce que le bandeau évite par construction.
 *     Un test compte donc les boutons.
 *  3. **La conservation affichée est celle qu'on lui passe.** Écrire « 14 mois »
 *     en dur dirait faux dans une propriété restée au défaut de GA4, qui est
 *     de deux mois.
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
  // DEUX : le responsable du traitement, et l'adresse des droits. Une seule
  // voudrait dire qu'une des deux a été comblée par un défaut.
  assert.equal(occurrences, 2, 'les deux mentions manquantes doivent se voir');

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
    })
  );

  const t = texte(container);
  assert.ok(!t.includes(fr.privacy.missing), 'plus aucun marqueur');
  assert.ok(t.includes('Association Untel'), 'le responsable est affiché');
  assert.ok(t.includes('rgpd@exemple.fr'), "l'adresse des droits est affichée");

  await unmount();
  dom.restore();
});

test("la conservation affichée est celle qu'on lui passe", async () => {
  const dom = prepare();
  const { container, rerender, unmount } = await mount(
    h(PrivacyNotice, { posthogKey: CLE })
  );
  // Le défaut du socle : les vingt propriétés du parc ont été relevées à 14.
  assert.match(texte(container), /\b14\b/);

  // Et une app restée au défaut de GA4 doit pouvoir dire « 2 », sans quoi le
  // panneau mentirait.
  await rerender(h(PrivacyNotice, { posthogKey: CLE, retentionMonths: 2 }));
  const t = texte(container);
  assert.match(t, /\b2\b/);
  assert.ok(!/\b14\b/.test(t), 'la valeur en dur ne doit pas subsister');

  await unmount();
  dom.restore();
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
