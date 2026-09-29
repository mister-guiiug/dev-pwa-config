/**
 * La section « Mesure d'audience » d'un écran de réglages.
 *
 * CE QUE CES TESTS PROTÈGENT. L'article 7.3 du RGPD : retirer son consentement
 * doit être aussi simple que le donner. Au 29/09/2026, aucune des dix-huit
 * applications qui mesurent ne le permettait. La section tient une règle —
 * l'accord ne se donne qu'au bandeau, le retrait se fait ici en un clic — et
 * chaque test ci-dessous en vérifie un morceau PAR SES EFFETS : le geste reçu
 * par la bibliothèque, ce qui est mémorisé, ce qui est à l'écran, où est le
 * focus. Un état interne juste avec une collecte qui continue serait
 * exactement le défaut à rendre impossible.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h, useState } from 'react';

import { ConsentSection } from '../react/consent-section.js';
import {
  ConsentBanner,
  consentKey,
  readConsentRecord,
} from '../react/consent-banner.js';
import { LabelsProvider } from '../react/labels-core.js';
import en from '../react/labels-en.js';
import { parsePosthogKey, resetAnalytics } from '../analytics.js';
import { CLE_DE_TEST } from '../testing/posthog.js';
import {
  chargeurFactice,
  fauxPosthog,
  laisseCharger,
} from './helpers/posthog.mjs';
import { mount, setupDom } from './helpers/dom.mjs';

const CLE = 'phc_abcdefghijklmnopqrstuvwxyz0123456789';

/** Le double de `posthog-js` du test courant, refait par `prepare()`. */
let faux;

/** Les MÊMES props au bandeau et à la section, comme dans une app. */
const props = (extra = {}) => ({
  posthogKey: CLE,
  loader: chargeurFactice(faux),
  ...extra,
});

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

/** La coquille d'une app : le bandeau, et l'écran de réglages qui porte la section. */
const appAvecReglages = (extra = {}) =>
  h('div', null, [
    h(ConsentBanner, { key: 'bandeau', ...props(extra) }),
    h('main', { key: 'reglages' }, h(ConsentSection, props(extra))),
  ]);

const q = (container, nom) =>
  container.querySelector(`[data-dwc="consent-${nom}"]`);

/** Le dernier geste de consentement reçu par la bibliothèque, dans l'ordre. */
const dernierGeste = () => faux.appels.gestes.at(-1) ?? null;

test('sans identifiant de mesure, pas de section — titre compris', async () => {
  const dom = prepare();
  const vue = await mount(h(ConsentSection, {}));

  // Rien à mesurer, donc rien à régler : un titre « Mesure d'audience » sur
  // une app qui ne mesure pas serait une information fausse.
  assert.equal(vue.container.innerHTML, '');

  await vue.unmount();
  dom.restore();
});

test('sans choix encore fait, elle le dit, et n’offre aucun bouton', async () => {
  const dom = prepare();
  const vue = await mount(appAvecReglages());

  const section = q(vue.container, 'section');
  assert.ok(section, 'la section paraît dès qu’il y a quelque chose à mesurer');
  assert.match(q(vue.container, 'section-title').textContent, /Mesure/);
  assert.match(q(vue.container, 'section-text').textContent, /PostHog/);
  assert.match(
    q(vue.container, 'section-state').textContent,
    /pas encore fait votre choix/
  );
  // Le bandeau est à l'écran en train de poser la question : c'est là, et
  // seulement là, que l'accord se donne.
  assert.equal(q(vue.container, 'section-action'), null);
  assert.ok(q(vue.container, 'banner'), 'le bandeau pose la question');
  assert.equal(faux.appels.init.length, 0, 'et rien n’est chargé');

  await vue.unmount();
  dom.restore();
});

test('LE TEST QUI COMPTE : accepté, un clic retire le consentement — sans reposer la question', async () => {
  const dom = prepare('granted');
  const vue = await mount(appAvecReglages());
  await laisseCharger();

  assert.equal(q(vue.container, 'section').dataset.choice, 'granted');
  assert.match(q(vue.container, 'section-state').textContent, /avez accepté/);
  const bouton = q(vue.container, 'section-action');
  assert.equal(bouton.textContent, 'Retirer mon consentement');
  assert.equal(dernierGeste(), null, 'l’accord d’hier collecte déjà');

  bouton.focus();
  await vue.act(() => bouton.click());

  // 1. La collecte s'arrête, par le geste lui-même.
  assert.equal(dernierGeste(), 'denied');
  assert.equal(faux.has_opted_out_capturing(), true);
  // 2. Le refus est MÉMORISÉ et daté : il tient au rechargement.
  const memoire = readConsentRecord();
  assert.equal(memoire?.choice, 'denied');
  assert.ok(memoire?.at, 'le refus porte sa date');
  // 3. La question n'est PAS reposée : un clic, et c'est fini.
  assert.equal(q(vue.container, 'banner'), null);
  // 4. L'écran le dit, et le focus reste où l'utilisateur l'a mis : même
  //    nœud, nouveau libellé.
  assert.equal(q(vue.container, 'section').dataset.choice, 'denied');
  assert.match(q(vue.container, 'section-state').textContent, /avez refusé/);
  assert.equal(q(vue.container, 'section-action'), bouton, 'le même bouton');
  assert.equal(bouton.textContent, 'Modifier mon choix');
  assert.equal(document.activeElement, bouton, 'le focus n’est pas perdu');

  await vue.unmount();
  dom.restore();
});

test('le retrait tient au rechargement : rien n’est chargé à la visite suivante', async () => {
  let dom = prepare('granted');
  let vue = await mount(appAvecReglages());
  await laisseCharger();
  await vue.act(() => q(vue.container, 'section-action').click());
  const memoire = window.localStorage.getItem(consentKey());
  await vue.unmount();
  dom.restore();

  // Une autre visite : le même navigateur, un module neuf.
  dom = prepare(memoire);
  vue = await mount(appAvecReglages());
  await laisseCharger();

  assert.equal(faux.appels.init.length, 0, 'la bibliothèque n’est pas chargée');
  assert.equal(q(vue.container, 'banner'), null, 'et on ne redemande pas');
  assert.equal(q(vue.container, 'section').dataset.choice, 'denied');

  await vue.unmount();
  dom.restore();
});

test('refusé : « Modifier mon choix » rouvre la question AU BANDEAU, qui prend le focus', async () => {
  const dom = prepare('denied');
  const vue = await mount(appAvecReglages());

  const bouton = q(vue.container, 'section-action');
  assert.equal(bouton.dataset.action, 'manage');
  assert.equal(q(vue.container, 'banner'), null);

  await vue.act(() => bouton.click());

  const bandeau = q(vue.container, 'banner');
  assert.ok(bandeau, 'la question est rouverte');
  assert.equal(
    document.activeElement,
    bandeau,
    'le bandeau vient à l’utilisateur : le focus le fait défiler à l’écran'
  );
  assert.equal(readConsentRecord(), null, 'le choix est oublié');
  // Pas de second « Accepter » dans la section : l'accord se donne au bandeau.
  assert.equal(q(vue.container, 'section-action'), null);
  assert.match(
    q(vue.container, 'section-state').textContent,
    /pas encore fait votre choix/
  );

  // Et le bandeau répond comme d'habitude : accepter charge la mesure.
  await vue.act(() => q(vue.container, 'accept').click());
  await laisseCharger();
  assert.equal(faux.appels.init.length, 1);
  assert.equal(q(vue.container, 'section').dataset.choice, 'granted');

  await vue.unmount();
  dom.restore();
});

test('ouvrir l’écran de réglages ne compte pas un second accord', async () => {
  // Le bandeau a rejoué l'accord d'hier ; la section, montée ensuite (l'écran
  // de réglages qu'on ouvre), le rejoue à son tour. `opt_in_capturing` envoie
  // un `$opt_in` : l'appeler ici compterait un faux accord par ouverture.
  const dom = prepare('granted');
  const vue = await mount(h(ConsentBanner, props()));
  await laisseCharger();
  assert.equal(faux.appels.init.length, 1);

  await vue.rerender(appAvecReglages());
  await laisseCharger();

  assert.equal(faux.appels.optIn, 0, 'aucun accord à reprendre');
  assert.equal(faux.appels.init.length, 1, 'ni second chargement');

  await vue.unmount();
  dom.restore();
});

test('le titre prend le niveau demandé, et nomme la section', async () => {
  const dom = prepare('granted');
  let vue = await mount(h(ConsentSection, props({ headingLevel: 3 })));

  const section = q(vue.container, 'section');
  const titre = q(vue.container, 'section-title');
  assert.equal(titre.tagName, 'H3');
  assert.equal(section.getAttribute('aria-labelledby'), titre.id);
  await vue.unmount();

  // Un niveau hors de 2 à 6 retombe sur 2 plutôt que de produire un `<h9>`.
  vue = await mount(h(ConsentSection, props({ headingLevel: 9 })));
  assert.equal(q(vue.container, 'section-title').tagName, 'H2');

  await vue.unmount();
  dom.restore();
});

test('en anglais par LabelsProvider, comme le reste du socle', async () => {
  const dom = prepare('granted');
  const vue = await mount(
    h(LabelsProvider, { dictionary: en }, h(ConsentSection, props()))
  );

  assert.equal(
    q(vue.container, 'section-title').textContent,
    'Audience measurement'
  );
  assert.match(q(vue.container, 'section-text').textContent, /European Union/);
  assert.equal(
    q(vue.container, 'section-state').textContent,
    'You have accepted this measurement.'
  );
  assert.equal(
    q(vue.container, 'section-action').textContent,
    'Withdraw my consent'
  );

  await vue.unmount();
  dom.restore();
});

test('cloisonnée comme le bandeau : le choix d’une autre app ne s’y lit pas', async () => {
  const dom = prepare('granted', '/mister-cim10/');
  const vue = await mount(
    h(ConsentSection, props({ scope: '/miss-contraction/' }))
  );

  assert.equal(q(vue.container, 'section').dataset.choice, undefined);
  assert.equal(q(vue.container, 'section-action'), null);
  assert.match(
    window.localStorage.getItem(consentKey('/mister-cim10/')) ?? '',
    /^granted/,
    'le choix de la voisine est intact'
  );

  await vue.unmount();
  dom.restore();
});

test('des réglages PAR-DESSUS l’écran : `onReopen` les ferme dans le même geste', async () => {
  // miss-dice ouvre ses réglages dans un tiroir modal, miss-ticket-pwa dans une
  // surimpression plein écran : le bandeau rouvert serait dessous, invisible,
  // et son focus caché derrière un dialogue.
  let dom = prepare('denied');
  let fermetures = 0;
  const Reglages = () => {
    const [ouverts, setOuverts] = useState(true);
    return h('div', null, [
      h(ConsentBanner, { key: 'bandeau', ...props() }),
      ouverts
        ? h(
            'div',
            { key: 'tiroir', role: 'dialog' },
            h(ConsentSection, {
              ...props(),
              onReopen: () => {
                fermetures++;
                setOuverts(false);
              },
            })
          )
        : null,
    ]);
  };
  let vue = await mount(h(Reglages));

  await vue.act(() => q(vue.container, 'section-action').click());

  assert.equal(fermetures, 1);
  assert.equal(vue.container.querySelector('[role="dialog"]'), null);
  const bandeau = q(vue.container, 'banner');
  assert.ok(bandeau, 'la question est rouverte');
  assert.equal(document.activeElement, bandeau, 'et le bandeau a le focus');
  await vue.unmount();
  dom.restore();

  // Le RETRAIT, lui, ne ferme rien : il se fait sur place, et l'écran le dit.
  dom = prepare('granted');
  fermetures = 0;
  vue = await mount(h(Reglages));
  await laisseCharger();
  await vue.act(() => q(vue.container, 'section-action').click());
  assert.equal(fermetures, 0);
  assert.ok(vue.container.querySelector('[role="dialog"]'));
  await vue.unmount();
  dom.restore();
});

test('le titre et le bouton prennent les classes de l’app qui les accueille', async () => {
  // miss-dice et miss-contraction n'importent pas `components.css` : leurs
  // boutons ont leurs propres classes.
  const dom = prepare('granted');
  const vue = await mount(
    h(
      ConsentSection,
      props({
        className: 'carte',
        titleClassName: 'titre-de-section',
        actionClassName: 'bouton bouton--discret',
      })
    )
  );

  assert.equal(q(vue.container, 'section').className, 'carte');
  assert.equal(q(vue.container, 'section-title').className, 'titre-de-section');
  assert.equal(
    q(vue.container, 'section-action').className,
    'bouton bouton--discret'
  );

  await vue.unmount();
  dom.restore();
});

test('le double publié pour les apps : une clé valide, et la mémoire du retrait', () => {
  // Sans clé au bon format, la section ne rend rien : un test d'app qui
  // l'oublierait passerait au vert sur un écran vide.
  assert.equal(parsePosthogKey(CLE_DE_TEST), CLE_DE_TEST);

  const faux = fauxPosthog();
  assert.equal(faux.has_opted_out_capturing(), false);
  faux.capture('creation', { objet: 'lieu' });
  faux.opt_out_capturing();
  faux.capture('creation', { objet: 'lieu' });
  assert.equal(faux.has_opted_out_capturing(), true);
  assert.equal(faux.appels.capture.length, 1, 'retirée, elle n’envoie plus');
  assert.equal(fauxPosthog({ retire: true }).has_opted_out_capturing(), true);
});
