/**
 * Le suivi des erreurs : en option, après l'accord, et nettoyé.
 *
 * CE QUE CES TESTS PROTÈGENT. Trois promesses, chacune avec son risque :
 *
 *  1. **Rien avant l'accord** — `errorTrackingLoader` n'est pas plus appelé
 *     que `loader` tant que la mesure n'est pas acceptée.
 *  2. **Rien ne part tel quel** — un `$exception` cite ce que le navigateur ou
 *     l'app avait sous la main : une URL avec sa requête, une adresse, la
 *     valeur qui n'a pas pu s'analyser. `nettoieTexteLibre` remplace ce qui y
 *     ressemble à une donnée ; le type et la pile, qui disent OÙ, restent.
 *  3. **Pas de câblage muet** — `__extensionClasses` est une option INTERNE de
 *     posthog-js. Si elle changeait de nom, `init` l'ignorerait en silence :
 *     le socle doit le dire.
 *
 * Le double de `posthog-js` n'instancie pas les classes d'extension : il les
 * pose sur l'instance, comme la vraie, et c'est ce que le socle vérifie. Le
 * comportement de la VRAIE bibliothèque (capture effective, `before_send`
 * appelé, refus respecté) a été relevé à la main sur posthog-js 1.438.2 et
 * 1.445.4 — le socle ne l'installe pas, voir la PR.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import {
  OPTIONS_VIE_PRIVEE,
  initAnalytics,
  isAnalyticsLoaded,
  resetAnalytics,
  setAnalyticsConsent,
} from '../analytics.js';
import {
  OPTIONS_SUIVI_ERREURS,
  nettoieException,
  nettoieTexteLibre,
} from '../analytics-erreurs.js';
import { nettoieUrlsEvenement } from '../analytics-url.js';
import { ConsentBanner, writeConsentChoice } from '../react/consent-banner.js';
import { ConsentSection } from '../react/consent-section.js';
import { mount, setupDom } from './helpers/dom.mjs';
import {
  chargeurFactice,
  fauxPosthog,
  laisseCharger,
} from './helpers/posthog.mjs';

const CLE = 'phc_abcdefghijklmnopqrstuvwxyz0123456789';

/** Deux « classes » d'extension, comme `ErrorTrackingExtensions`. */
class FausseExceptions {}
class FauxObservateur {}
const EXTENSIONS = Object.freeze({
  exceptions: FausseExceptions,
  exceptionObserver: FauxObservateur,
});

/** Un `errorTrackingLoader` qui compte ses appels. */
function chargeurErreurs(rendu = EXTENSIONS) {
  const appels = { n: 0 };
  const charge = async () => {
    appels.n++;
    return rendu;
  };
  return { charge, appels };
}

/** Capture `console.warn` le temps d'un test. */
function ecouteAvertissements() {
  const recus = [];
  const original = console.warn;
  console.warn = (...args) => recus.push(args.join(' '));
  return {
    recus,
    restore: () => {
      console.warn = original;
    },
  };
}

/* ── nettoieTexteLibre ────────────────────────────────────────────────── */

test('une adresse électronique devient [email]', () => {
  assert.equal(
    nettoieTexteLibre('User jean.dupont+test@exemple.fr already registered'),
    'User [email] already registered'
  );
  assert.equal(
    nettoieTexteLibre('Invalid login: élise@école.fr'),
    'Invalid login: [email]'
  );
});

test('quatre chiffres ou plus deviennent [nombre], trois restent', () => {
  assert.equal(
    nettoieTexteLibre('Dossier 123456 introuvable'),
    'Dossier [nombre] introuvable'
  );
  // Un code d'erreur de React, un statut HTTP : trois chiffres, ils disent quoi.
  assert.equal(
    nettoieTexteLibre('Minified React error #418'),
    'Minified React error #418'
  );
  assert.equal(nettoieTexteLibre('HTTP 404'), 'HTTP 404');
});

test('un téléphone, une carte, une date : chiffres séparés, [nombre] aussi', () => {
  assert.equal(
    nettoieTexteLibre('Appeler le 06 12 34 56 78'),
    'Appeler le [nombre]'
  );
  assert.equal(
    nettoieTexteLibre('Carte 4111 1111 1111 1111 refusée'),
    'Carte [nombre] refusée'
  );
  assert.equal(nettoieTexteLibre('né le 21/11/1990'), 'né le [nombre]');
  // Une version n'en est pas une : quatre chiffres en tout, séparés.
  assert.equal(nettoieTexteLibre('posthog-js 1.438.2'), 'posthog-js 1.438.2');
});

test('une URL perd sa requête et son fragment, garde origine et chemin', () => {
  assert.equal(
    nettoieTexteLibre(
      'Failed to fetch https://api.exemple.fr/v1/recherche?q=diab%C3%A8te&page=2#haut'
    ),
    'Failed to fetch https://api.exemple.fr/v1/recherche?[requête]#[fragment]'
  );
  // React met les arguments du message dans la requête de son lien d'aide.
  assert.equal(
    nettoieTexteLibre(
      'visit https://react.dev/errors/418?args[]=Jean%20Dupont&args[]= for the full message'
    ),
    'visit https://react.dev/errors/418?[requête] for the full message'
  );
  // La ponctuation qui suit l'URL dans la phrase reste à sa place.
  assert.equal(
    nettoieTexteLibre('(voir https://x.fr/a?b=c).'),
    '(voir https://x.fr/a?[requête]).'
  );
});

test('une requête HORS d’une URL absolue disparaît aussi', () => {
  // Le message d'une erreur Supabase cite le chemin relatif de la requête.
  assert.equal(
    nettoieTexteLibre('GET /rest/v1/profils?email=eq.jean@x.fr 406'),
    'GET /rest/v1/profils?[requête] 406'
  );
});

test('la route d’un HashRouter reste, sa requête non', () => {
  assert.equal(
    nettoieTexteLibre(
      'https://mister-guiiug.github.io/miss-uwh/#/depenses?mois=novembre'
    ),
    'https://mister-guiiug.github.io/miss-uwh/#/depenses?[requête]'
  );
  // Ses identifiants passent par les autres règles.
  assert.equal(
    nettoieTexteLibre(
      'https://mister-guiiug.github.io/miss-uwh/#/depenses/123456'
    ),
    'https://mister-guiiug.github.io/miss-uwh/#/depenses/[nombre]'
  );
  // Un fragment qui n'est pas une route — le jeton d'un retour d'auth — non.
  assert.equal(
    nettoieTexteLibre(
      'https://x.github.io/app/#access_token=abc&type=recovery'
    ),
    'https://x.github.io/app/#[fragment]'
  );
});

test('un SECOND fragment après la route part aussi — le retour implicite de Supabase', () => {
  // Supabase AJOUTE son fragment à l'adresse de retour : une app en HashRouter
  // reçoit `#/reset#access_token=…`. Un jeton de rafraîchissement sans chiffre
  // échappait aux règles des jetons : seule la coupe de la route le retire.
  assert.equal(
    nettoieTexteLibre(
      'https://x.github.io/app/#/reset#access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2ln&refresh_token=kqzmwbrtyplx&type=recovery'
    ),
    'https://x.github.io/app/#/reset#[fragment]'
  );
  assert.equal(
    nettoieTexteLibre('https://x.github.io/app/#/carte#nom=Jean%20Dupont'),
    'https://x.github.io/app/#/carte#[fragment]'
  );
  // Requête de la route ET second fragment : les deux marqueurs, dans l'ordre.
  assert.equal(
    nettoieTexteLibre('https://x.github.io/app/#/reset?code=abc#suite'),
    'https://x.github.io/app/#/reset?[requête]#[fragment]'
  );
  // Une route qui enchaîne des paramètres sans `?` les perd aussi.
  assert.equal(
    nettoieTexteLibre('https://x.github.io/app/#/invite&nom=dupont'),
    'https://x.github.io/app/#/invite?[requête]'
  );
});

test('une entrée de deux cent mille caractères est nettoyée vite', () => {
  // La règle des adresses électroniques, non bornée, prenait un temps
  // QUADRATIQUE sur une suite sans espace : 26 s pour deux cent mille
  // caractères, dans le gestionnaire d'erreur. La borne est large exprès —
  // une machine de CI lente ne doit pas la franchir, une régression si.
  const entrees = [
    'a'.repeat(200_000),
    'Ab_9-'.repeat(40_000),
    `x@${'a'.repeat(200_000)}`,
    `https://x.fr/${')'.repeat(200_000)}x`,
  ];
  for (const entree of entrees) {
    const debut = performance.now();
    const propre = nettoieTexteLibre(entree);
    const duree = performance.now() - debut;
    assert.ok(
      duree < 1000,
      `${duree.toFixed(0)} ms pour ${entree.slice(0, 8)}…`
    );
    assert.ok(propre.length <= 501, `tronqué : ${propre.length}`);
  }
  // LE MOT QUE LA COUPE TRANCHE PART AVEC ELLE. Coupée en `jean.dupont@exe`,
  // une adresse n'est plus reconnue — et des jetons remplacés par `[jeton]`
  // raccourcissent assez le texte pour que ce bout ressorte sous les cinq
  // cents caractères.
  const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2lnbmF0dXJlc2lnbmF0dXJl';
  const n = Math.floor(1985 / (jwt.length + 1));
  const avant = `${`${jwt} `.repeat(n)}${' '.repeat(1985 - n * (jwt.length + 1))}`;
  const propre = nettoieTexteLibre(`${avant}jean.dupont@exemple.fr`);
  assert.ok(propre.length < 500, 'le bout coupé serait visible');
  assert.equal(propre.includes('jean'), false, propre.slice(-40));
});

test('les identifiants d’une URL et une URL data: disparaissent', () => {
  assert.equal(
    nettoieTexteLibre('fetch https://jean:secret@api.exemple.fr/v1 failed'),
    'fetch https://[identifiants]@api.exemple.fr/v1 failed'
  );
  assert.equal(
    nettoieTexteLibre(
      'Refused to load data:image/png;base64,iVBORw0KGgoAAAANSUhEUg'
    ),
    'Refused to load data:[données]'
  );
});

test('les jetons longs deviennent [jeton], un UUID [uuid]', () => {
  const jwt =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U';
  assert.equal(
    nettoieTexteLibre(`Bearer ${jwt} rejected`),
    'Bearer [jeton] rejected'
  );
  assert.equal(
    nettoieTexteLibre('token 9f86d081884c7d659a2feaa0c55ad015a3bf4f1b expired'),
    'token [jeton] expired'
  );
  assert.equal(
    nettoieTexteLibre('refresh aZ3kP9qL2xV7mN4bR8tY1wE6 invalid'),
    'refresh [jeton] invalid'
  );
  assert.equal(
    nettoieTexteLibre(
      'row 2f1c4b9e-8d7a-4e6f-9b3c-1a2b3c4d5e6f violates policy'
    ),
    'row [uuid] violates policy'
  );
});

test('le nom d’un morceau de Vite reste lisible', () => {
  // L'erreur la plus courante d'une PWA après un déploiement : son nom de
  // fichier est ce qui la rend lisible.
  const message =
    'Failed to fetch dynamically imported module: https://mister-guiiug.github.io/miss-uwh/assets/SettingsScreen-B7AteW3E.js';
  assert.equal(nettoieTexteLibre(message), message);
  // Les identifiants de code sans chiffre ne sont pas des jetons.
  assert.equal(
    nettoieTexteLibre('useSyncExternalStoreWithSelector is not a function'),
    'useSyncExternalStoreWithSelector is not a function'
  );
});

test('le texte cité qui porte une espace devient [texte] ; un nom de propriété reste', () => {
  assert.equal(
    nettoieTexteLibre(`Unexpected token 'j', "jean dupont" is not valid JSON`),
    `Unexpected token 'j', "[texte]" is not valid JSON`
  );
  assert.equal(
    nettoieTexteLibre("Cannot read properties of undefined (reading 'map')"),
    "Cannot read properties of undefined (reading 'map')"
  );
  assert.equal(
    nettoieTexteLibre('Catégorie « Sortie au ski » introuvable'),
    'Catégorie « [texte] » introuvable'
  );
  // L'apostrophe d'élision n'est pas un guillemet.
  assert.equal(
    nettoieTexteLibre("Impossible d'ouvrir l'écran des réglages"),
    "Impossible d'ouvrir l'écran des réglages"
  );
});

test('un message long est tronqué, et ce qui n’est pas du texte passe', () => {
  const long = 'x'.repeat(30).split('').join(' ').repeat(40);
  const propre = nettoieTexteLibre(long);
  assert.ok(propre.length <= 501, `tronqué : ${propre.length}`);
  assert.ok(propre.endsWith('…'));
  assert.equal(nettoieTexteLibre(''), '');
  assert.equal(nettoieTexteLibre(/** @type {any} */ (undefined)), undefined);
});

/* ── nettoieException ─────────────────────────────────────────────────── */

const exception = () => ({
  event: '$exception',
  uuid: '0190-uuid',
  properties: {
    $exception_level: 'error',
    $exception_list: [
      {
        type: 'TypeError',
        value: 'Échec pour jean@x.fr sur https://api.x.fr/a?token=secret',
        mechanism: { handled: false, type: 'onerror' },
        stacktrace: {
          type: 'raw',
          frames: [
            {
              platform: 'web:javascript',
              filename:
                'https://mister-guiiug.github.io/miss-uwh/assets/index-DkF3a9xQ.js?v=2',
              function: 'enregistreDepense',
              lineno: 12,
              colno: 34567,
              in_app: true,
            },
          ],
        },
      },
      {
        type: 'Error',
        value: 'cause : dossier 123456',
        mechanism: { type: 'chained', source: 'cause' },
      },
    ],
    $exception_values: ['Échec pour jean@x.fr'],
    $exception_message: 'Échec pour jean@x.fr',
    $exception_steps: [{ $message: 'Saisie de « Jean Dupont »' }],
    $current_url:
      'https://mister-guiiug.github.io/miss-uwh/#/depenses/42?q=ski',
    $referrer: '$direct',
    app_name: 'miss-uwh',
  },
});

test('un $exception part nettoyé : messages, URL, causes chaînées', () => {
  const brut = exception();
  const propre = nettoieException(brut);
  const [premiere, cause] = propre.properties.$exception_list;

  assert.equal(
    premiere.value,
    'Échec pour [email] sur https://api.x.fr/a?[requête]'
  );
  assert.equal(cause.value, 'cause : dossier [nombre]');
  assert.deepEqual(propre.properties.$exception_values, ['Échec pour [email]']);
  assert.equal(propre.properties.$exception_message, 'Échec pour [email]');
  assert.equal(
    propre.properties.$current_url,
    'https://mister-guiiug.github.io/miss-uwh/#/depenses/42?[requête]'
  );
  assert.equal(propre.properties.$referrer, '$direct');
  // Le fil d'Ariane est du texte libre par construction : il ne part pas.
  assert.equal('$exception_steps' in propre.properties, false);
});

test('le type et les cadres de pile restent — seule leur requête part', () => {
  const propre = nettoieException(exception());
  const [premiere] = propre.properties.$exception_list;
  assert.equal(premiere.type, 'TypeError');
  assert.deepEqual(premiere.mechanism, { handled: false, type: 'onerror' });
  const [cadre] = premiere.stacktrace.frames;
  assert.deepEqual(cadre, {
    platform: 'web:javascript',
    filename:
      'https://mister-guiiug.github.io/miss-uwh/assets/index-DkF3a9xQ.js',
    function: 'enregistreDepense',
    lineno: 12,
    // Une colonne n'est pas une donnée : les cadres ne passent pas par la
    // règle des nombres.
    colno: 34567,
    in_app: true,
  });
  assert.equal(propre.properties.app_name, 'miss-uwh');
  assert.equal(propre.uuid, '0190-uuid');
});

test('les propriétés d’entrée de session et de personne partent nettoyées', () => {
  // Les noms RÉELS que posthog-js pose (relevés sur 1.438.2, 1.445.4 et
  // 1.453.2) : `$current_url` partait propre, `$session_entry_url` portait
  // encore les jetons du retour d'auth, toute la session durant.
  const retour =
    'https://mister-guiiug.github.io/miss-x/?code=0f8e7d6c-5b4a-4321-9876-abcdef012345#/reset#access_token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ4In0.c2ln&refresh_token=kqzmwbrtyplx';
  const referent = 'https://mister-guiiug.github.io/miss-a/?user=jean@x.fr';
  const brut = exception();
  brut.properties = {
    ...brut.properties,
    $referrer: referent,
    $pathname: '/miss-x/dossier/jean.dupont@x.fr',
    $session_entry_url: retour,
    $session_entry_referrer: referent,
    $session_entry_pathname: '/miss-x/',
    $session_entry_referring_domain: 'mister-guiiug.github.io',
    $set: { $current_url: retour },
  };
  const avecPersonne = {
    ...brut,
    $set_once: { $initial_current_url: retour, $initial_referrer: referent },
  };
  const propre = nettoieException(avecPersonne);
  const p = propre.properties;
  const attendu =
    'https://mister-guiiug.github.io/miss-x/?[requête]#/reset#[fragment]';
  const referentPropre = 'https://mister-guiiug.github.io/miss-a/?[requête]';
  assert.equal(p.$session_entry_url, attendu);
  assert.equal(p.$session_entry_referrer, referentPropre);
  assert.equal(p.$referrer, referentPropre);
  assert.equal(p.$pathname, '/miss-x/dossier/[email]');
  assert.equal(p.$session_entry_pathname, '/miss-x/');
  // Un domaine n'est pas une adresse : il reste, comme `app_name`.
  assert.equal(p.$session_entry_referring_domain, 'mister-guiiug.github.io');
  assert.equal(p.$set.$current_url, attendu);
  assert.equal(propre.$set_once.$initial_current_url, attendu);
  assert.equal(propre.$set_once.$initial_referrer, referentPropre);
  // Aucun jeton, aucune adresse, nulle part dans l'événement.
  const tout = JSON.stringify(propre);
  for (const fuite of ['eyJ', 'kqzmwbrtyplx', '0f8e7d6c', 'jean']) {
    assert.equal(tout.includes(fuite), false, `${fuite} a fui`);
  }
});

test('l’événement d’origine n’est pas modifié', () => {
  const brut = exception();
  const copie = structuredClone(brut);
  nettoieException(brut);
  assert.deepEqual(brut, copie);
});

test('tout autre événement est rendu TEL QUEL, même objet', () => {
  const vue = {
    event: '$pageview',
    properties: { $current_url: 'https://x.fr/a?email=jean@x.fr' },
  };
  assert.equal(nettoieException(vue), vue);
  assert.equal(nettoieException(null), null);
});

/* ── Le chargement ────────────────────────────────────────────────────── */

test('SANS le chargeur, la capture est ÉTEINTE, et rien d’autre ne change', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const faux = fauxPosthog();
    initAnalytics({
      posthogKey: CLE,
      loader: chargeurFactice(faux),
      requireConsent: false,
    });
    await laisseCharger();
    const { options } = faux.appels.init[0];
    // Les options d'avant, plus `capture_exceptions: false`. Le projet
    // PostHog a la capture allumée côté serveur, et posthog-js la suit quand
    // l'option est absente — une app passée à la build complète capterait ses
    // erreurs sans `before_send`. Le `before_send` reste celui de toutes les
    // apps, les URL seules (`analytics-url.js`) : ni extension, ni nettoyage
    // des exceptions, ni rien d'autre.
    assert.deepEqual(options, {
      ...OPTIONS_VIE_PRIVEE,
      api_host: 'https://eu.i.posthog.com',
      capture_exceptions: false,
      before_send: nettoieUrlsEvenement,
    });
    assert.equal('before_send' in OPTIONS_VIE_PRIVEE, false);
    assert.equal('capture_exceptions' in OPTIONS_VIE_PRIVEE, false);
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('RIEN AVANT L’ACCORD : le chargeur des erreurs n’est pas appelé', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const faux = fauxPosthog();
    const erreurs = chargeurErreurs();
    initAnalytics({
      posthogKey: CLE,
      loader: chargeurFactice(faux),
      errorTrackingLoader: erreurs.charge,
    });
    await laisseCharger();
    assert.equal(erreurs.appels.n, 0, 'aucun import avant l’accord');
    assert.equal(faux.appels.init.length, 0);

    setAnalyticsConsent('denied');
    await laisseCharger();
    assert.equal(erreurs.appels.n, 0, 'ni après un refus');

    setAnalyticsConsent({ analytics: true });
    await laisseCharger();
    assert.equal(erreurs.appels.n, 1, 'un import, à l’accord');
    assert.equal(faux.appels.init.length, 1);
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('à l’accord, les extensions et la capture des exceptions sont passées à init', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const faux = fauxPosthog();
    const avertis = ecouteAvertissements();
    try {
      initAnalytics({
        posthogKey: CLE,
        loader: chargeurFactice(faux),
        errorTrackingLoader: chargeurErreurs().charge,
        requireConsent: false,
      });
      await laisseCharger();
    } finally {
      avertis.restore();
    }
    const { options } = faux.appels.init[0];
    assert.deepEqual(options.__extensionClasses, {
      exceptions: FausseExceptions,
      exceptionObserver: FauxObservateur,
    });
    assert.deepEqual(options.capture_exceptions, { ...OPTIONS_SUIVI_ERREURS });
    // Jamais les `console.error` : leur texte est ce que l'app journalise.
    assert.equal(options.capture_exceptions.capture_console_errors, false);
    // Les deux nettoyages, bout à bout : les URL de tout événement, puis le
    // message d'un `$exception`.
    const net = options.before_send({
      event: '$exception',
      properties: {
        $exception_message: 'Échec pour jean.dupont@exemple.fr',
        $session_entry_url:
          'https://h.io/miss-x/?code=abc#/reset#access_token=eyJabc.def.ghi',
      },
    });
    assert.doesNotMatch(JSON.stringify(net), /jean.dupont|eyJabc|code=abc/u);
    assert.equal(
      options.before_send({ event: '$pageview', properties: {} }).event,
      '$pageview'
    );
    assert.equal(nettoieException(null), null);
    // Les réglages de vie privée sont toujours là.
    assert.equal(options.autocapture, false);
    assert.equal(options.disable_session_recording, true);
    // L'instance a pris les extensions : aucun avertissement.
    assert.deepEqual(avertis.recus, []);
    assert.ok(Object.isFrozen(OPTIONS_SUIVI_ERREURS));
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('le module entier est accepté, et le socle n’en garde que les deux classes', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const faux = fauxPosthog();
    class Enregistrement {}
    class Autocapture {}
    // Ce que rend `import('posthog-js/dist/extension-bundles.js')` : un
    // `AllExtensions` à côté, qu'il ne faut surtout pas embarquer.
    const module = {
      ErrorTrackingExtensions: EXTENSIONS,
      AllExtensions: {
        ...EXTENSIONS,
        sessionRecording: Enregistrement,
        autocapture: Autocapture,
      },
    };
    initAnalytics({
      posthogKey: CLE,
      loader: chargeurFactice(faux),
      errorTrackingLoader: async () => module,
      requireConsent: false,
    });
    await laisseCharger();
    assert.deepEqual(
      Object.keys(faux.appels.init[0].options.__extensionClasses),
      ['exceptions', 'exceptionObserver']
    );
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('un AllExtensions passé par mégarde n’allume que les erreurs', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const faux = fauxPosthog();
    class Enregistrement {}
    initAnalytics({
      posthogKey: CLE,
      loader: chargeurFactice(faux),
      errorTrackingLoader: async () => ({
        ...EXTENSIONS,
        sessionRecording: Enregistrement,
      }),
      requireConsent: false,
    });
    await laisseCharger();
    const ext = faux.appels.init[0].options.__extensionClasses;
    assert.equal('sessionRecording' in ext, false);
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('LE GARDIEN DE __extensionClasses : ignorée par posthog-js, la console le dit', async () => {
  // `__extensionClasses` est marquée `@internal` dans les types de posthog-js.
  // Renommée un jour, `init` l'ignorerait sans rien dire, et plus aucune
  // erreur ne partirait. Ce double fait comme une version qui l'aurait perdue.
  const dom = setupDom();
  try {
    resetAnalytics();
    const faux = fauxPosthog();
    faux.init = (cle, options) => faux.appels.init.push({ cle, options });
    const avertis = ecouteAvertissements();
    try {
      initAnalytics({
        posthogKey: CLE,
        loader: chargeurFactice(faux),
        errorTrackingLoader: chargeurErreurs().charge,
        requireConsent: false,
      });
      await laisseCharger();
    } finally {
      avertis.restore();
    }
    assert.equal(avertis.recus.length, 1);
    assert.match(avertis.recus[0], /__extensionClasses/u);
    assert.match(avertis.recus[0], /AUCUNE ERREUR NE PARTIRA/u);
    // La mesure d'audience, elle, continue.
    assert.equal(isAnalyticsLoaded(), true);
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('un chargeur qui rend autre chose que les extensions le dit', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const faux = fauxPosthog();
    const avertis = ecouteAvertissements();
    try {
      initAnalytics({
        posthogKey: CLE,
        loader: chargeurFactice(faux),
        // Un export renommé, un mauvais chemin : le module arrive, vide.
        errorTrackingLoader: async () => ({ AutreChose: {} }),
        requireConsent: false,
      });
      await laisseCharger();
    } finally {
      avertis.restore();
    }
    assert.equal(avertis.recus.length, 1);
    assert.match(avertis.recus[0], /ErrorTrackingExtensions/u);
    const { options } = faux.appels.init[0];
    assert.equal('__extensionClasses' in options, false);
    // Sans nettoyage, pas de capture — pas même celle que le serveur allume.
    assert.equal(options.capture_exceptions, false);
    assert.equal(options.before_send, nettoieUrlsEvenement);
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('un import des extensions qui échoue n’empêche pas la mesure', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    const faux = fauxPosthog();
    const avertis = ecouteAvertissements();
    try {
      initAnalytics({
        posthogKey: CLE,
        loader: chargeurFactice(faux),
        errorTrackingLoader: async () => {
          throw new TypeError('Failed to fetch dynamically imported module');
        },
        requireConsent: false,
      });
      await laisseCharger();
    } finally {
      avertis.restore();
    }
    // Réseau coupé : silence, comme pour le module lui-même.
    assert.deepEqual(avertis.recus, []);
    assert.equal(faux.appels.init.length, 1);
    const { options } = faux.appels.init[0];
    assert.equal('__extensionClasses' in options, false);
    assert.equal(options.capture_exceptions, false);
    assert.equal(options.before_send, nettoieUrlsEvenement);
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('un refus donné pendant l’import est appris, extensions comprises', async () => {
  // La bibliothèque collecte par défaut, ses exceptions comprises : un refus
  // arrivé avant elle doit lui être transmis dès l'init.
  const dom = setupDom();
  try {
    resetAnalytics();
    const faux = fauxPosthog();
    initAnalytics({
      posthogKey: CLE,
      loader: chargeurFactice(faux),
      errorTrackingLoader: chargeurErreurs().charge,
    });
    setAnalyticsConsent({ analytics: true });
    setAnalyticsConsent('denied');
    await laisseCharger();
    assert.ok(faux.appels.init[0].options.__extensionClasses);
    assert.equal(faux.has_opted_out_capturing(), true);
  } finally {
    resetAnalytics();
    dom.restore();
  }
});

test('LE GARDIEN DU POIDS : analytics.js n’importe le suivi des erreurs que dynamiquement', async () => {
  // Un import statique — une réexportation suffit — rangerait le nettoyage
  // (1,8 kB gzip) dans le morceau principal de CHAQUE app, y compris
  // celles qui ne suivent pas leurs erreurs. Rien ne le signalerait ailleurs.
  const { readFileSync } = await import('node:fs');
  const source = readFileSync(
    new URL('../analytics.js', import.meta.url),
    'utf8'
  );
  assert.match(source, /import\('\.\/analytics-erreurs\.js'\)/u);
  // Ni `import … from`, ni `export … from` : seulement `import()`.
  assert.doesNotMatch(
    source,
    /^\s*(?:import|export)\b[^;]*?from\s+'\.\/analytics-erreurs\.js'/mu
  );
});

/* ── app_version ──────────────────────────────────────────────────────── */

test('app_version est une super-propriété quand versionPlugin a posé la version', async () => {
  const dom = setupDom();
  try {
    resetAnalytics();
    globalThis.__DWC_BUILD__ = { version: '2.4.1', commit: 'abc1234' };
    const faux = fauxPosthog();
    initAnalytics({
      posthogKey: CLE,
      loader: chargeurFactice(faux),
      appName: 'miss-uwh',
      requireConsent: false,
    });
    await laisseCharger();
    assert.deepEqual(faux.appels.register.at(-1), {
      app_name: 'miss-uwh',
      app_version: '2.4.1',
    });
  } finally {
    delete globalThis.__DWC_BUILD__;
    resetAnalytics();
    dom.restore();
  }
});

/* ── Le relais des composants ─────────────────────────────────────────── */

test('le bandeau relaie errorTrackingLoader : chargé à l’accord, pas avant', async () => {
  const dom = setupDom();
  resetAnalytics();
  const faux = fauxPosthog();
  const erreurs = chargeurErreurs();
  const vue = await mount(
    h(ConsentBanner, {
      posthogKey: CLE,
      loader: chargeurFactice(faux),
      errorTrackingLoader: erreurs.charge,
    })
  );
  try {
    await laisseCharger();
    assert.equal(erreurs.appels.n, 0, 'bandeau affiché, rien de chargé');

    await vue.act(() =>
      vue.container.querySelector('[data-dwc="consent-accept"]').click()
    );
    await laisseCharger();
    assert.equal(erreurs.appels.n, 1);
    assert.deepEqual(
      faux.appels.init[0].options.__extensionClasses,
      EXTENSIONS
    );
  } finally {
    await vue.unmount();
    resetAnalytics();
    dom.restore();
  }
});

test('la section relaie errorTrackingLoader quand elle initialise la mesure', async () => {
  // Un visiteur qui a accepté hier et arrive directement sur les réglages : la
  // section initialise la mesure la première, et rejoue l'accord.
  const dom = setupDom();
  resetAnalytics();
  const faux = fauxPosthog();
  const erreurs = chargeurErreurs();
  writeConsentChoice('granted');
  const vue = await mount(
    h(ConsentSection, {
      posthogKey: CLE,
      loader: chargeurFactice(faux),
      errorTrackingLoader: erreurs.charge,
    })
  );
  try {
    await laisseCharger();
    assert.equal(erreurs.appels.n, 1);
    assert.ok(faux.appels.init[0].options.__extensionClasses);
  } finally {
    await vue.unmount();
    resetAnalytics();
    dom.restore();
  }
});
