/**
 * Le lien de soutien — trois niveaux, et le droit de le retirer.
 *
 * DEUX DÉFAUTS POUR UNE SEULE VÉRITÉ. Jusqu'au 04/09/2026, `AppFooter` portait
 * sa PROPRE copie de l'URL Buy Me a Coffee, en dur, quand `FamilyApps` lisait
 * `SPONSOR_URL` du catalogue. Changer le catalogue ne changeait donc pas le
 * pied de page : deux liens de la même app pouvaient pointer ailleurs.
 *
 * Ce qui est verrouillé ici :
 *   1. la PROP l'emporte, puis le CONTEXTE, puis le lien de la famille ;
 *   2. `null` n'est pas `undefined` — c'est « pas de lien », et il est respecté
 *      jusqu'au bout, sinon un fork ne peut pas retirer un appel au don qui
 *      pointe vers quelqu'un d'autre ;
 *   3. `AppFooter` et `FamilyApps` répondent au MÊME fournisseur.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import { setupDom, mount } from './helpers/dom.mjs';
import { SponsorProvider } from '../react/sponsor.js';
import { AppFooter } from '../react/app-footer.js';
import { FamilyApps } from '../react/family-apps.js';
import { SPONSOR_HANDLE, SPONSOR_URL, sponsorUrl } from '../apps-catalog.js';

const lienSponsor = view =>
  view.container.querySelector('[data-dwc="footer-sponsor"]');

/** Monte un arbre, lit le href du lien de soutien du pied de page, démonte. */
async function href(element) {
  const dom = setupDom();
  try {
    const view = await mount(element);
    const lien = lienSponsor(view);
    const valeur = lien ? lien.getAttribute('href') : null;
    await view.unmount();
    return valeur;
  } finally {
    dom.restore();
  }
}

test('le catalogue compose l’URL depuis le pseudo, sans le réécrire', () => {
  assert.equal(sponsorUrl(), SPONSOR_URL);
  assert.equal(SPONSOR_URL, `https://buymeacoffee.com/${SPONSOR_HANDLE}`);
  assert.equal(
    sponsorUrl('autre.pseudo'),
    'https://buymeacoffee.com/autre.pseudo'
  );
});

test('sans rien déclarer, le pied de page rend le lien de la famille', async () => {
  assert.equal(await href(h(AppFooter, {})), SPONSOR_URL);
});

test('le fournisseur surcharge le pseudo pour toute l’app', async () => {
  assert.equal(
    await href(
      h(SponsorProvider, { handle: 'autre.pseudo' }, h(AppFooter, {}))
    ),
    'https://buymeacoffee.com/autre.pseudo'
  );
});

test('le fournisseur accepte une autre plateforme que Buy Me a Coffee', async () => {
  assert.equal(
    await href(
      h(
        SponsorProvider,
        { url: 'https://liberapay.com/quelquun' },
        h(AppFooter, {})
      )
    ),
    'https://liberapay.com/quelquun'
  );
});

test('la prop l’emporte sur le fournisseur', async () => {
  assert.equal(
    await href(
      h(
        SponsorProvider,
        { handle: 'du.contexte' },
        h(AppFooter, { sponsorUrl: 'https://exemple.test/de-la-prop' })
      )
    ),
    'https://exemple.test/de-la-prop'
  );
});

test('`null` retire le lien — par le fournisseur comme par la prop', async () => {
  assert.equal(
    await href(h(SponsorProvider, { url: null }, h(AppFooter, {}))),
    null,
    'le fournisseur doit pouvoir tout retirer'
  );
  assert.equal(
    await href(h(AppFooter, { sponsorUrl: null })),
    null,
    'la prop null se comportait déjà ainsi : rien ne doit changer'
  );
});

test('un fournisseur qui ne dit rien laisse répondre la famille', async () => {
  // `undefined` = « je ne me prononce pas ». Sans cette distinction, monter le
  // fournisseur sans le renseigner effacerait le lien.
  assert.equal(
    await href(h(SponsorProvider, {}, h(AppFooter, {}))),
    SPONSOR_URL
  );
});

test('FamilyApps répond au même fournisseur que le pied de page', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(
        SponsorProvider,
        { handle: 'autre.pseudo' },
        h(FamilyApps, { currentAppId: 'miss-dice' }),
        h(AppFooter, {})
      )
    );
    const attendu = 'https://buymeacoffee.com/autre.pseudo';
    assert.equal(
      view.container
        .querySelector('[data-dwc="family-sponsor"]')
        .getAttribute('href'),
      attendu
    );
    assert.equal(lienSponsor(view).getAttribute('href'), attendu);
    await view.unmount();
  } finally {
    dom.restore();
  }
});
