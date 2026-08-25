/**
 * Les primitives d'accessibilité.
 *
 * CE QUE CES TESTS PROTÈGENT. 38 dialogues dans la famille, trois pièges de
 * focus. Le comportement existait dans `Sheet`, enfermé dans un hook interne :
 * ces tests portent sur les primitives extraites, celles qu'un dialogue maison
 * peut enfin emprunter. `Sheet` et `ConfirmDialog` reposent désormais dessus,
 * donc leurs suites existantes les couvrent aussi.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h, useRef } from 'react';

import {
  AnnouncerProvider,
  SkipLink,
  VisuallyHidden,
  getFocusable,
  useAnnouncer,
  useEscape,
  useFocusTrap,
  useScrollLock,
} from '../react/a11y.js';
import { mount, setupDom } from './helpers/dom.mjs';

const press = (key, options = {}) =>
  document.dispatchEvent(
    new window.KeyboardEvent('keydown', { key, bubbles: true, ...options })
  );

test('getFocusable ignore ce qui ne participe pas au parcours clavier', async () => {
  const dom = setupDom();
  try {
    const panel = document.createElement('div');
    panel.innerHTML = `
      <a href="/a">a</a>
      <button>ok</button>
      <button disabled>non</button>
      <input />
      <input disabled />
      <span tabindex="-1">non</span>
      <span tabindex="0">oui</span>`;
    document.body.append(panel);
    assert.deepEqual(
      getFocusable(panel).map(el => el.tagName.toLowerCase()),
      ['a', 'button', 'input', 'span']
    );
    assert.deepEqual(getFocusable(null), []);
  } finally {
    dom.restore();
  }
});

test('useEscape écoute le document, et se retire à la désactivation', async () => {
  const dom = setupDom();
  try {
    let count = 0;
    function Probe({ active }) {
      useEscape(() => (count += 1), active);
      return null;
    }
    const view = await mount(h(Probe, { active: true }));
    await view.act(() => press('Escape'));
    assert.equal(count, 1);
    // Une autre touche ne déclenche rien.
    await view.act(() => press('a'));
    assert.equal(count, 1);
    await view.rerender(h(Probe, { active: false }));
    await view.act(() => press('Escape'));
    assert.equal(count, 1);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('useFocusTrap boucle sur Tab et rend le focus au démontage', async () => {
  const dom = setupDom();
  try {
    const outside = document.createElement('button');
    outside.textContent = 'dehors';
    document.body.append(outside);
    outside.focus();

    function Panel({ active }) {
      const ref = useRef(null);
      useFocusTrap(ref, { active });
      return h(
        'div',
        { ref, tabIndex: -1 },
        h('button', { id: 'p' }, 'premier'),
        h('button', { id: 'd' }, 'dernier')
      );
    }

    const view = await mount(h(Panel, { active: true }));
    const first = document.getElementById('p');
    const last = document.getElementById('d');

    // Le focus est entré dans le panneau (sur le conteneur, faute de cible).
    assert.ok(view.container.contains(document.activeElement));

    await view.act(() => last.focus());
    await view.act(() => press('Tab'));
    assert.equal(document.activeElement, first, 'Tab boucle sur le premier');

    await view.act(() => press('Tab', { shiftKey: true }));
    assert.equal(document.activeElement, last, 'Maj+Tab boucle sur le dernier');

    // Focus échappé dans le fond : Tab le ramène au lieu de sortir.
    await view.act(() => outside.focus());
    await view.act(() => press('Tab'));
    assert.equal(document.activeElement, first);

    await view.unmount();
    // Restitution : sans elle, le focus retombe sur <body>.
    assert.equal(document.activeElement, outside);
  } finally {
    dom.restore();
  }
});

test('useScrollLock est compté : deux surfaces fermées dans le désordre', async () => {
  const dom = setupDom();
  try {
    document.body.style.overflow = 'scroll';
    function Lock() {
      useScrollLock(true);
      return null;
    }
    const a = await mount(h(Lock));
    const b = await mount(h(Lock));
    assert.equal(document.body.style.overflow, 'hidden');
    await a.unmount();
    assert.equal(document.body.style.overflow, 'hidden', 'une reste ouverte');
    await b.unmount();
    // La valeur d'origine est rendue, pas écrasée par une chaîne vide.
    assert.equal(document.body.style.overflow, 'scroll');
  } finally {
    dom.restore();
  }
});

test('l’annonceur ré-annonce le même texte, et reste inerte hors fournisseur', async () => {
  const dom = setupDom();
  try {
    const api = { current: null };
    function Probe() {
      api.current = useAnnouncer();
      return null;
    }

    const seul = await mount(h(Probe));
    // Hors fournisseur : ne jette pas, ne fait rien.
    assert.doesNotThrow(() => api.current('perdu'));
    await seul.unmount();

    const view = await mount(h(AnnouncerProvider, null, h(Probe)));
    const region = () =>
      view.container.querySelector('[aria-live="polite"]').textContent;

    await view.act(() => api.current('Enregistré'));
    assert.equal(region(), 'Enregistré');

    // Deux fois le même texte : le DOM doit CHANGER, sinon rien n'est relu.
    const before = view.container.querySelector(
      '[aria-live="polite"]'
    ).innerHTML;
    await view.act(() => api.current('Enregistré'));
    assert.equal(region(), 'Enregistré');
    assert.notEqual(
      view.container.querySelector('[aria-live="polite"]').innerHTML,
      before
    );

    await view.act(() => api.current('Échec', 'assertive'));
    assert.match(
      view.container.querySelector('[role="alert"]').textContent,
      /Échec/u
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('VisuallyHidden et SkipLink portent les classes du contrat', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h('div', null, h(VisuallyHidden, null, 'caché'), h(SkipLink))
    );
    const hidden = view.container.querySelector('[data-dwc="visually-hidden"]');
    assert.equal(hidden.className, 'dwc-sr-only');
    assert.equal(hidden.textContent, 'caché');

    const skip = view.container.querySelector('[data-dwc="skip-link"]');
    assert.equal(skip.getAttribute('href'), '#contenu');
    assert.equal(skip.textContent, 'Aller au contenu');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('tokens.css fournit les deux utilitaires, et le mouvement réduit', async () => {
  const { readFileSync } = await import('node:fs');
  const css = readFileSync(new URL('../tokens.css', import.meta.url), 'utf8');
  assert.match(css, /\.dwc-sr-only\s*\{/u);
  assert.match(css, /\.dwc-skip-link\s*\{/u);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/u);
  // `0s` empêcherait `transitionend`, dont dépendent des fermetures.
  assert.doesNotMatch(css, /transition-duration:\s*0s\s*!important/u);
});
