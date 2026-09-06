/**
 * `Toast` — six piles maison, trois défauts communs.
 *
 * Les trois premiers tests reproduisent chacun un défaut observé dans une app
 * nommée ; les suivants verrouillent les deux décisions prises faute de
 * convergence (durée, erreur permanente) et la suspension du compte à rebours.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import { setupDom, mount } from './helpers/dom.mjs';
import { ToastProvider, ToastViewport, useToast } from '../react/toast.js';
import { LabelsProvider } from '../react/labels.js';

/** Bouton de test qui empile une notification au clic. */
function Declencheur(props) {
  const toast = useToast();
  return h(
    'button',
    {
      type: 'button',
      id: props.id ?? 'go',
      onClick: () =>
        toast[props.method ?? 'show'](props.message, props.options),
    },
    'go'
  );
}

const attendre = ms => new Promise(resolve => setTimeout(resolve, ms));

test('la région vivante est le conteneur, jamais le message', async () => {
  // miss-supaboss et mister-footcoach posent `aria-live` sur le conteneur ET
  // `role="status"` sur chaque message : annoncé deux fois.
  const dom = setupDom();
  try {
    const view = await mount(
      h(ToastProvider, {}, h(Declencheur, { message: 'Enregistré' }))
    );
    await view.act(() => document.getElementById('go').click());

    const message = view.container.querySelector('[data-dwc="toast"]');
    assert.ok(message, 'aucune notification rendue');
    assert.equal(message.getAttribute('role'), null);
    assert.equal(message.getAttribute('aria-live'), null);

    const regions = view.container.querySelectorAll(
      '[data-dwc="toast-region"]'
    );
    assert.equal(regions.length, 2, 'les deux régions doivent exister');
    assert.deepEqual(
      [...regions].map(node => node.getAttribute('aria-live')),
      ['polite', 'assertive']
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('les régions sont montées AVANT d’avoir quoi que ce soit à dire', async () => {
  // Une région créée en même temps que son contenu n'est pas annoncée : c'est
  // pour ça qu'elles existent vides.
  const dom = setupDom();
  try {
    const view = await mount(h(ToastProvider, {}, h(Declencheur, {})));
    assert.equal(
      view.container.querySelectorAll('[data-dwc="toast-region"]').length,
      2
    );
    assert.equal(
      view.container.querySelectorAll('[data-dwc="toast"]').length,
      0
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('une seconde notification n’écrase pas la première', async () => {
  // miss-carbook n'en garde qu'une : la précédente disparaît sans être lue.
  const dom = setupDom();
  try {
    const view = await mount(
      h(
        ToastProvider,
        {},
        h(Declencheur, { id: 'a', message: 'Un' }),
        h(Declencheur, { id: 'b', message: 'Deux' })
      )
    );
    await view.act(() => document.getElementById('a').click());
    await view.act(() => document.getElementById('b').click());
    const messages = [
      ...view.container.querySelectorAll('[data-dwc="toast-message"]'),
    ].map(node => node.textContent);
    assert.deepEqual(messages, ['Un', 'Deux']);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('la pile est bornée, et c’est le PLUS ANCIEN qui cède', async () => {
  const dom = setupDom();
  try {
    let api;
    function Sonde() {
      api = useToast();
      return null;
    }
    const view = await mount(h(ToastProvider, { max: 2 }, h(Sonde)));
    await view.act(() => {
      api.show('Un');
      api.show('Deux');
      api.show('Trois');
    });
    const messages = [
      ...view.container.querySelectorAll('[data-dwc="toast-message"]'),
    ].map(node => node.textContent);
    assert.deepEqual(messages, ['Deux', 'Trois']);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('une erreur ne s’efface pas toute seule, les autres si', async () => {
  const dom = setupDom();
  try {
    let api;
    function Sonde() {
      api = useToast();
      return null;
    }
    const view = await mount(h(ToastProvider, { duration: 30 }, h(Sonde)));
    await view.act(() => {
      api.success('Enregistré');
      api.error('Envoi impossible');
    });
    assert.equal(
      view.container.querySelectorAll('[data-dwc="toast"]').length,
      2
    );

    await view.act(() => attendre(70));
    const restants = [
      ...view.container.querySelectorAll('[data-dwc="toast"]'),
    ].map(node => node.dataset.tone);
    assert.deepEqual(restants, ['error']);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('« danger » et « error » sont le même ton, jusque dans la région annoncée', async () => {
  // Le vocabulaire de la famille est celui de `Badge` : `tone` pour le sens,
  // `danger` pour le rouge. `error` est l'ancien nom, que les apps passent
  // encore. LES DEUX DOIVENT SE COMPORTER PAREIL — un seul prédicat décide,
  // sinon la durée de vie reconnaîtrait un mot et la région d'annonce l'autre,
  // et une erreur s'effacerait sans avoir été annoncée.
  const dom = setupDom();
  try {
    let api;
    function Sonde() {
      api = useToast();
      return null;
    }
    const view = await mount(h(ToastProvider, { duration: 30 }, h(Sonde)));
    await view.act(() => {
      api.show('Ancien mot', { tone: 'error' });
      api.show('Nouveau mot', { tone: 'danger' });
      api.show('Sans gravité', { tone: 'info' });
    });

    await view.act(() => attendre(70));
    const restants = [
      ...view.container.querySelectorAll('[data-dwc="toast"]'),
    ].map(node => node.dataset.tone);
    assert.deepEqual(
      restants.sort(),
      ['danger', 'error'],
      'les deux mots restent, l’info s’efface'
    );

    // Et les deux partent dans la région `assertive`, celle qu'un lecteur
    // d'écran interrompt pour lire.
    const assertive = view.container.querySelector('[aria-live="assertive"]');
    assert.match(assertive.textContent, /Ancien mot/);
    assert.match(assertive.textContent, /Nouveau mot/);
    assert.doesNotMatch(assertive.textContent, /Sans gravité/);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('le compte à rebours est suspendu tant que le pointeur est dessus', async () => {
  // WCAG 2.2.1 : aucune des six copies ne le faisait.
  const dom = setupDom();
  try {
    let api;
    function Sonde() {
      api = useToast();
      return null;
    }
    const view = await mount(h(ToastProvider, { duration: 60 }, h(Sonde)));
    await view.act(() => api.info('Lisez-moi'));

    const viewport = view.container.querySelector(
      '[data-dwc="toast-viewport"]'
    );
    await view.act(() =>
      viewport.dispatchEvent(
        new window.MouseEvent('mouseover', { bubbles: true })
      )
    );
    await view.act(() => attendre(120));
    assert.equal(
      view.container.querySelectorAll('[data-dwc="toast"]').length,
      1,
      'la notification s’est effacée alors qu’elle était survolée'
    );

    await view.act(() =>
      viewport.dispatchEvent(
        new window.MouseEvent('mouseout', { bubbles: true })
      )
    );
    await view.act(() => attendre(120));
    assert.equal(
      view.container.querySelectorAll('[data-dwc="toast"]').length,
      0
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('aucune minuterie ne survit au démontage', async () => {
  // mister-doc et mister-footcoach appellent `setTimeout` sans jamais le
  // nettoyer : un démontage pendant l'attente laisse un `setState` orphelin.
  const dom = setupDom();
  try {
    let api;
    function Sonde() {
      api = useToast();
      return null;
    }
    const view = await mount(h(ToastProvider, { duration: 40 }, h(Sonde)));
    await view.act(() => api.info('Bientôt démonté'));
    await view.unmount();

    const erreurs = [];
    const sauve = console.error;
    console.error = (...args) => erreurs.push(args.join(' '));
    try {
      await attendre(90);
    } finally {
      console.error = sauve;
    }
    assert.deepEqual(erreurs, []);
  } finally {
    dom.restore();
  }
});

test('dismiss retire la bonne notification, clear les retire toutes', async () => {
  const dom = setupDom();
  try {
    let api;
    function Sonde() {
      api = useToast();
      return null;
    }
    const view = await mount(h(ToastProvider, {}, h(Sonde)));
    let premier;
    await view.act(() => {
      premier = api.show('Un');
      api.show('Deux');
    });
    await view.act(() => api.dismiss(premier));
    assert.deepEqual(
      [...view.container.querySelectorAll('[data-dwc="toast-message"]')].map(
        node => node.textContent
      ),
      ['Deux']
    );
    await view.act(() => api.clear());
    assert.equal(
      view.container.querySelectorAll('[data-dwc="toast"]').length,
      0
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('le bouton de fermeture est nommé, dans la langue du provider', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(
        LabelsProvider,
        { locale: 'en' },
        h(ToastViewport, {
          toasts: [{ id: 'x', message: 'Saved', tone: 'success' }],
          onDismiss() {},
        })
      )
    );
    assert.match(view.container.innerHTML, /aria-label="Dismiss notification"/);
    assert.match(view.container.innerHTML, /aria-label="Notifications"/);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('useToast hors fournisseur ne casse rien et le dit', async () => {
  // miss-carbook et mister-doc lèvent ; mister-footcoach ne fait rien, en
  // silence. Ici : rien, mais l'avertissement dit pourquoi l'écran est muet.
  const dom = setupDom();
  const avertissements = [];
  const sauve = console.warn;
  console.warn = (...args) => avertissements.push(args.join(' '));
  try {
    const view = await mount(h(Declencheur, { message: 'Perdu' }));
    await view.act(() => document.getElementById('go').click());
    assert.equal(avertissements.length, 1);
    assert.match(avertissements[0], /hors <ToastProvider>/);
    await view.unmount();
  } finally {
    console.warn = sauve;
    dom.restore();
  }
});
