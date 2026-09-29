/**
 * Le contexte d'observabilité : session, fil d'Ariane, console.
 *
 * CE QUE CES TESTS PROTÈGENT. Treize apps sur seize initialisent Sentry, six
 * seulement renseignent un contexte, et 59 `console.error`/`warn` ne quittent
 * jamais le navigateur. Deux règles non négociables sont vérifiées ici : le
 * contexte est MASQUÉ avant d'être écrit, et la console n'est jamais avalée.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import {
  breadcrumb,
  captureConsole,
  clearBreadcrumbs,
  clearErrorLog,
  getBreadcrumbs,
  getSessionContext,
  recordError,
  setForwarder,
  installObservability,
  setSessionContext,
} from '../react/observability.js';
import { BUILD_INFO_GLOBAL } from '../version.js';
import { useRouteBreadcrumbs } from '../react/use-route-breadcrumbs.js';
import { mount, setupDom } from './helpers/dom.mjs';

test('le contexte de session est joint aux erreurs, et masqué', () => {
  const dom = setupDom();
  try {
    clearErrorLog();
    clearBreadcrumbs();
    setSessionContext({ app: 'miss-test', version: '1.2.3' });
    setSessionContext({ locale: 'fr' });
    assert.deepEqual(getSessionContext(), {
      app: 'miss-test',
      version: '1.2.3',
      locale: 'fr',
    });

    const entry = recordError(new Error('boum'), { token: 'abc', écran: 'x' });
    assert.equal(entry.context.app, 'miss-test');
    assert.equal(entry.context.écran, 'x');
    // Le journal vit dans localStorage : un jeton n'a rien à y faire.
    assert.equal(entry.context.token, '[masqué]');
  } finally {
    setSessionContext({
      app: undefined,
      version: undefined,
      locale: undefined,
    });
    dom.restore();
  }
});

test('le fil d’Ariane est joint, borné, et reste en mémoire', () => {
  const dom = setupDom();
  try {
    clearErrorLog();
    clearBreadcrumbs();
    for (let i = 0; i < 25; i += 1) breadcrumb('nav', `étape ${i}`);
    const trail = getBreadcrumbs();
    assert.equal(trail.length, 20, 'tampon circulaire borné');
    assert.equal(trail.at(-1).message, 'étape 24');

    const entry = recordError('boum');
    assert.equal(entry.trail.length, 20);

    // Jamais persisté : c'est ce qui le distingue du journal d'erreurs.
    assert.equal(localStorage.getItem('dwc_breadcrumbs'), null);
    const stored = JSON.parse(localStorage.getItem('dwc_error_log') ?? '[]');
    assert.ok(stored.length > 0);
  } finally {
    clearBreadcrumbs();
    dom.restore();
  }
});

test('les données d’un fil d’Ariane sont masquées comme le reste', () => {
  clearBreadcrumbs();
  const entry = breadcrumb('form', 'envoi', { email: 'a@b.fr', champs: 3 });
  assert.equal(entry.data.email, '[masqué]');
  assert.equal(entry.data.champs, 3);
  clearBreadcrumbs();
});

test('captureConsole enregistre SANS avaler le message', () => {
  clearBreadcrumbs();
  const vus = [];
  const original = console.warn;
  const stub = (...args) => vus.push(args);
  console.warn = stub;

  const restore = captureConsole({ levels: ['warn'] });
  assert.notEqual(console.warn, stub, 'la console est bien enveloppée');
  console.warn('échec', { token: 'secret', id: 7 });

  // Le message est bien passé à la console d'origine.
  assert.equal(vus.length, 1);
  assert.equal(vus[0][0], 'échec');

  const [trace] = getBreadcrumbs();
  assert.equal(trace.category, 'console.warn');
  // Masqué AVANT la mise en chaîne : `redact` agit sur les clés.
  assert.match(trace.message, /"token":"\[masqué\]"/u);
  assert.match(trace.message, /"id":7/u);

  restore();
  assert.equal(console.warn, stub, 'la console est rendue telle quelle');
  // Idempotent : une seconde restauration ne doit pas remplacer la console
  // par une capture périmée.
  restore();
  assert.equal(console.warn, stub);
  console.warn = original;
  clearBreadcrumbs();
});

test('le relais reçoit le contexte masqué, pas le contexte brut', () => {
  const dom = setupDom();
  try {
    clearErrorLog();
    clearBreadcrumbs();
    const reçus = [];
    setForwarder((error, context, trail) => reçus.push({ context, trail }));
    breadcrumb('nav', '/a');
    recordError(new Error('x'), { password: 'p', vue: 'accueil' });
    setForwarder(null);

    assert.equal(reçus[0].context.password, '[masqué]');
    assert.equal(reçus[0].context.vue, 'accueil');
    assert.equal(reçus[0].trail.length, 1);
  } finally {
    clearBreadcrumbs();
    dom.restore();
  }
});

test('useRouteBreadcrumbs enregistre l’entrée puis les transitions', async () => {
  const dom = setupDom();
  try {
    clearBreadcrumbs();
    function Probe({ path }) {
      useRouteBreadcrumbs(path);
      return null;
    }
    const view = await mount(h(Probe, { path: '/a' }));
    await view.rerender(h(Probe, { path: '/b' }));

    const messages = getBreadcrumbs().map(entry => entry.message);
    assert.deepEqual(messages, ['/a', '/a → /b']);
    assert.equal(getSessionContext().route, '/b');
    await view.unmount();
  } finally {
    clearBreadcrumbs();
    dom.restore();
  }
});

test('installObservability n’a plus besoin qu’on lui donne la version', async () => {
  // Le défaut mesuré en tête du module — « pas de version, pas de langue » —
  // tenait à ce que le paquet réclamait une version sans savoir la produire.
  // `versionPlugin` la pose désormais sur le global ; elle doit arriver seule.
  const dom = setupDom();
  globalThis[BUILD_INFO_GLOBAL] = {
    version: '3.13.0',
    commit: '104c944abcdef',
    buildTime: '2026-08-26T07:54:00.000Z',
  };
  try {
    setSessionContext({});
    await installObservability({
      context: { app: 'mister-family-map', environment: 'test' },
      console: false,
    });
    const context = getSessionContext();
    assert.equal(context.version, '3.13.0');
    assert.equal(context.commit, '104c944abcdef');
    assert.equal(context.app, 'mister-family-map');
    assert.equal(context.environment, 'test');
  } finally {
    delete globalThis[BUILD_INFO_GLOBAL];
    setForwarder(null);
    dom.restore();
  }
});

test('le contexte de l’app l’emporte sur la version injectée', async () => {
  const dom = setupDom();
  globalThis[BUILD_INFO_GLOBAL] = { version: '3.13.0' };
  try {
    setSessionContext({});
    await installObservability({
      context: { version: 'imposée' },
      console: false,
    });
    assert.equal(getSessionContext().version, 'imposée');
  } finally {
    delete globalThis[BUILD_INFO_GLOBAL];
    setForwarder(null);
    dom.restore();
  }
});

/* ── Les fils d'Ariane de Sentry, sans requête ni fragment ─────────────── */

/**
 * LE CONSTAT (29/09/2026). mister-cim10 envoie le texte d'un compte rendu
 * médical à l'API de l'OMS dans la chaîne de requête ; Sentry gardait l'URL
 * complète dans ses fils d'Ariane, et l'envoyait avec l'erreur suivante.
 */
test('scrubBreadcrumb : origine et chemin, ni requête ni fragment', async () => {
  const { scrubBreadcrumb } = await import('../react/observability.js');
  const fetchCrumb = {
    category: 'fetch',
    data: {
      method: 'GET',
      url: 'https://id.who.int/icd/release/11/mms/search?q=douleur+thoracique+depuis+3+jours#top',
      status_code: 500,
    },
  };
  const propre = scrubBreadcrumb(fetchCrumb);
  assert.equal(propre.data.url, 'https://id.who.int/icd/release/11/mms/search');
  assert.equal(propre.data.method, 'GET');
  assert.equal(propre.data.status_code, 500);
  // Copié, jamais modifié en place.
  assert.match(fetchCrumb.data.url, /douleur/);

  assert.deepEqual(
    scrubBreadcrumb({
      category: 'navigation',
      data: {
        from: '/mister-cim10/?texte=secret',
        to: '/mister-cim10/#/aide?x=1',
      },
    }).data,
    { from: '/mister-cim10/', to: '/mister-cim10/' }
  );
  assert.equal(
    scrubBreadcrumb({ category: 'xhr', data: { url: '/api/x?token=abc' } }).data
      .url,
    '/api/x'
  );
  // `ui.*` : les URL d'un texte libre.
  assert.equal(
    scrubBreadcrumb({
      category: 'ui.click',
      message: 'a[href="https://o/app/p?q=secret"] > span',
    }).message,
    'a[href="https://o/app/p"] > span'
  );
  // Les autres catégories passent telles quelles, même objet.
  const journal = { category: 'console', message: 'https://o/?q=1' };
  assert.equal(scrubBreadcrumb(journal), journal);
  assert.equal(scrubBreadcrumb(null), null);
});

test('initSentry branche le nettoyage APRÈS le beforeBreadcrumb de l’app', async () => {
  const { initSentry, setForwarder: relais } =
    await import('../react/observability.js');
  const vus = [];
  let options = null;
  const Sentry = {
    init: o => {
      options = o;
    },
    captureException: () => {},
  };
  try {
    await initSentry({
      dsn: 'https://cle@o.ingest.sentry.io/1',
      loader: async () => Sentry,
      beforeBreadcrumb: (crumb, hint) => {
        vus.push([crumb.data?.url, hint]);
        // L'app voit l'URL complète, et peut écarter un fil.
        return crumb.data?.url?.includes('ignorer') ? null : crumb;
      },
    });
    assert.equal(typeof options.beforeBreadcrumb, 'function');
    const sortie = options.beforeBreadcrumb(
      { category: 'fetch', data: { url: 'https://o/api?q=secret' } },
      { input: 1 }
    );
    assert.equal(sortie.data.url, 'https://o/api');
    assert.deepEqual(vus[0], ['https://o/api?q=secret', { input: 1 }]);
    assert.equal(
      options.beforeBreadcrumb({
        category: 'fetch',
        data: { url: 'https://o/ignorer?q=1' },
      }),
      null
    );

    // Sans hook de l'app : le nettoyage seul.
    await initSentry({
      dsn: 'https://cle@o.ingest.sentry.io/1',
      loader: async () => Sentry,
    });
    assert.equal(
      options.beforeBreadcrumb({
        category: 'navigation',
        data: { from: '/a?x=1', to: '/b#c' },
      }).data.to,
      '/b'
    );
    // Le reste de l'initialisation est inchangé.
    assert.equal(options.dsn, 'https://cle@o.ingest.sentry.io/1');
  } finally {
    relais(null);
  }
});
