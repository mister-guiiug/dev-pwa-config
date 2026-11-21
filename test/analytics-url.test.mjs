/**
 * Les URL que PostHog joint de lui-même, nettoyées avant de partir.
 *
 * CE QUE CES TESTS PROTÈGENT. posthog-js ajoute à chaque événement
 * `$session_entry_url`, qui vaut `location.href` au début de la session,
 * fragment compris. Une redirection Supabase y laissait les jetons d'accès et
 * de rafraîchissement pour toute la session. Les noms de clés ci-dessous sont
 * ceux de la vraie bibliothèque (posthog-js 1.453).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  MARQUES_URL,
  nettoieUrl,
  nettoieUrlsEvenement,
} from '../analytics-url.js';

const ORIGINE = 'https://mister-guiiug.github.io/miss-x';
const JWT =
  'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';

test('la requête et le fragment disparaissent, l’origine et le chemin restent', () => {
  assert.equal(nettoieUrl(`${ORIGINE}/`), `${ORIGINE}/`);
  assert.equal(
    nettoieUrl(`${ORIGINE}/?code=4f8c2a3e-1b2d-4c5e-9f00-112233445566`),
    `${ORIGINE}/?${MARQUES_URL.requete}`
  );
  assert.equal(
    nettoieUrl(`${ORIGINE}/#access_token=${JWT}&type=recovery`),
    `${ORIGINE}/#${MARQUES_URL.fragment}`
  );
  assert.equal(
    nettoieUrl('https://jean:secret@exemple.fr/a'),
    `https://${MARQUES_URL.identifiants}@exemple.fr/a`
  );
});

test('la route d’un HashRouter reste, et s’arrête au second #', () => {
  assert.equal(nettoieUrl(`${ORIGINE}/#/depenses`), `${ORIGINE}/#/depenses`);
  assert.equal(
    nettoieUrl(`${ORIGINE}/#/recherche?q=jean%20dupont`),
    `${ORIGINE}/#/recherche?${MARQUES_URL.requete}`
  );
  const redirige = nettoieUrl(
    `${ORIGINE}/?code=abc#/reset#access_token=${JWT}&refresh_token=kqzmwbrtyplx&type=recovery`
  );
  assert.equal(
    redirige,
    `${ORIGINE}/?${MARQUES_URL.requete}#/reset#${MARQUES_URL.fragment}`
  );
  assert.doesNotMatch(redirige, /eyJ|kqzmwbrtyplx|code=/u);
  assert.equal(
    nettoieUrl(`${ORIGINE}/#/carte#nom=Jean%20Dupont`),
    `${ORIGINE}/#/carte#${MARQUES_URL.fragment}`
  );
});

test('une valeur qui n’est pas une URL passe telle quelle', () => {
  assert.equal(nettoieUrl('$direct'), '$direct');
  assert.equal(nettoieUrl(''), '');
});

test('LES PROPRIÉTÉS D’ENTRÉE DE SESSION sont nettoyées sur tous les événements', () => {
  const entree = `${ORIGINE}/?code=abc#/reset#access_token=${JWT}&refresh_token=kqzmwbrtyplx`;
  for (const event of ['$pageview', 'creation', '$exception', '$opt_in']) {
    const sortie = nettoieUrlsEvenement({
      event,
      properties: {
        $current_url: `${ORIGINE}/#/reglages`,
        $referrer: 'https://exemple.fr/page?jeton=abc123',
        $referring_domain: 'exemple.fr',
        $session_entry_url: entree,
        $session_entry_referrer: 'https://exemple.fr/page?jeton=abc123',
        $session_entry_pathname: '/miss-x/',
        $pathname: '/reglages',
        app_name: 'miss-x',
      },
    });
    const p = sortie.properties;
    assert.equal(p.$current_url, `${ORIGINE}/#/reglages`);
    assert.equal(p.$referrer, `https://exemple.fr/page?${MARQUES_URL.requete}`);
    assert.equal(p.$referring_domain, 'exemple.fr');
    assert.equal(
      p.$session_entry_url,
      `${ORIGINE}/?${MARQUES_URL.requete}#/reset#${MARQUES_URL.fragment}`
    );
    assert.equal(
      p.$session_entry_referrer,
      `https://exemple.fr/page?${MARQUES_URL.requete}`
    );
    assert.equal(p.$session_entry_pathname, '/miss-x/');
    assert.equal(p.$pathname, '/reglages');
    assert.equal(p.app_name, 'miss-x');
    assert.doesNotMatch(JSON.stringify(sortie), /eyJ|kqzmwbrtyplx|abc123/u);
  }
});

test('$set et $set_once sont nettoyés, au premier niveau comme dans les propriétés', () => {
  const sale = `${ORIGINE}/?code=abc#access_token=${JWT}`;
  const sortie = nettoieUrlsEvenement({
    event: '$set',
    properties: {
      $set: { $current_url: sale, langue: 'fr' },
      $set_once: { $initial_current_url: sale, $initial_referrer: sale },
    },
    $set: { $current_url: sale },
    $set_once: {
      $initial_current_url: sale,
      $initial_person_info: { u: sale, r: '$direct' },
    },
  });
  assert.doesNotMatch(JSON.stringify(sortie), /eyJ|code=/u);
  assert.equal(sortie.properties.$set.langue, 'fr');
  assert.equal(sortie.$set_once.$initial_person_info.r, '$direct');
  assert.equal(
    sortie.$set_once.$initial_person_info.u,
    `${ORIGINE}/?${MARQUES_URL.requete}#${MARQUES_URL.fragment}`
  );
});

test('rien à nettoyer : le même objet revient, et null reste null', () => {
  const propre = {
    event: '$pageview',
    properties: { $current_url: `${ORIGINE}/#/a`, $referrer: '$direct' },
  };
  assert.equal(nettoieUrlsEvenement(propre), propre);
  assert.equal(nettoieUrlsEvenement(null), null);
});

test('l’événement d’origine n’est pas modifié', () => {
  const props = { $session_entry_url: `${ORIGINE}/?code=abc` };
  const evenement = { event: '$pageview', properties: props };
  const sortie = nettoieUrlsEvenement(evenement);
  assert.notEqual(sortie, evenement);
  assert.equal(props.$session_entry_url, `${ORIGINE}/?code=abc`);
});
