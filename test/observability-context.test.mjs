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
  setSessionContext,
} from '../react/observability.js';
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
