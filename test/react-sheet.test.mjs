/**
 * Comportement interactif du `Sheet`, dans un vrai DOM.
 *
 * Le JSDoc du composant énumère cinq garanties — piège de focus, Échap, focus
 * déplacé puis restitué, verrou du scroll — qui sont exactement ce que les
 * vingt-et-une copies locales ratent. Aucune n'était vérifiée : les tests
 * existants rendent en HTML statique, où aucun effet ne s'exécute.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import { setupDom, mount } from './helpers/dom.mjs';
import { Sheet } from '../react/sheet.js';

/** Une feuille avec deux boutons dans le corps, pour observer le parcours. */
function sheet(props = {}, ...children) {
  return h(
    Sheet,
    { open: true, title: 'Ajouter une dépense', onClose() {}, ...props },
    ...children
  );
}

function press(key, options = {}) {
  document.dispatchEvent(
    new window.KeyboardEvent('keydown', { key, bubbles: true, ...options })
  );
}

test('Sheet : le dialogue est étiqueté par le titre visible, pas par une copie', async () => {
  const dom = setupDom();
  try {
    const view = await mount(sheet());
    const dialog = view.container.querySelector('[role="dialog"]');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    assert.ok(labelledBy, 'aria-labelledby attendu');
    assert.equal(dialog.getAttribute('aria-label'), null);
    const heading = document.getElementById(labelledBy);
    assert.ok(heading, 'l’id référencé par aria-labelledby doit exister');
    assert.equal(heading.tagName, 'H2');
    assert.equal(heading.textContent, 'Ajouter une dépense');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('Sheet : le focus entre dans le panneau à l’ouverture', async () => {
  const dom = setupDom();
  try {
    const view = await mount(sheet());
    const panel = view.container.querySelector('[data-dwc="sheet-panel"]');
    assert.equal(document.activeElement, panel);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('Sheet : le focus est restitué à l’élément d’origine à la fermeture', async () => {
  const dom = setupDom();
  try {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    assert.equal(document.activeElement, opener);

    const view = await mount(sheet());
    assert.notEqual(document.activeElement, opener);

    await view.rerender(sheet({ open: false }));
    assert.equal(
      document.activeElement,
      opener,
      'sans restitution, la navigation clavier repart du début de la page'
    );

    await view.unmount();
    opener.remove();
  } finally {
    dom.restore();
  }
});

test('Sheet : Échap ferme', async () => {
  const dom = setupDom();
  try {
    let closed = 0;
    const view = await mount(sheet({ onClose: () => (closed += 1) }));
    await view.act(() => press('Escape'));
    assert.equal(closed, 1);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('Sheet : un clic sur le VOILE ferme — le chemin réel du navigateur', async () => {
  // LE BUG MESURÉ (mister-footcoach#25, mister-molkky#14). Le voile recouvre
  // toute la racine : en navigateur, c'est LUI que le hit-testing désigne
  // comme cible d'un clic dans le fond. jsdom n'en fait pas — dispatcher sur
  // la racine, comme le faisait ce test, validait donc un chemin qu'aucun
  // clic réel n'emprunte. Ici on dispatche sur le nœud du voile lui-même.
  const dom = setupDom();
  try {
    let closed = 0;
    const view = await mount(sheet({ onClose: () => (closed += 1) }));
    const backdrop = view.container.querySelector(
      '[data-dwc="sheet-backdrop"]'
    );

    await view.act(() =>
      backdrop.dispatchEvent(
        new window.MouseEvent('mousedown', { bubbles: true })
      )
    );
    assert.equal(closed, 1, 'le clic reçu par le voile doit fermer');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('Sheet : un clic reçu par la racine ferme toujours, un clic dans le panneau non', async () => {
  // Chez mister-footcoach et mister-molkky, la rustine `pointer-events: none`
  // posée sur le voile fait atterrir le clic sur la RACINE : cette topologie
  // doit continuer de fermer. Et un mousedown né dans le panneau — qui bulle
  // avec sa cible d'origine — ne doit toujours pas fermer.
  const dom = setupDom();
  try {
    let closed = 0;
    const view = await mount(sheet({ onClose: () => (closed += 1) }));
    const root = view.container.querySelector('[data-dwc="sheet"]');
    const panel = view.container.querySelector('[data-dwc="sheet-panel"]');

    await view.act(() =>
      panel.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }))
    );
    assert.equal(closed, 0, 'un clic dans le panneau ne doit pas fermer');

    await view.act(() =>
      root.dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }))
    );
    assert.equal(closed, 1);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('Sheet : Tab et Maj+Tab bouclent dans le panneau', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      sheet(
        {},
        h('button', { key: 'a', type: 'button' }, 'Annuler'),
        h('button', { key: 'b', type: 'button' }, 'Valider')
      )
    );
    const items = [
      ...view.container.querySelectorAll('[data-dwc="sheet-panel"] button'),
    ];
    assert.equal(items.length, 3, 'fermeture + deux boutons du corps');
    const [first, , last] = items;

    // Depuis le dernier, Tab revient au premier.
    last.focus();
    await view.act(() => press('Tab'));
    assert.equal(document.activeElement, first);

    // Depuis le premier, Maj+Tab va au dernier.
    await view.act(() => press('Tab', { shiftKey: true }));
    assert.equal(document.activeElement, last);

    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('Sheet : sans élément focusable, Tab garde le focus sur le panneau', async () => {
  const dom = setupDom();
  try {
    // Le bouton de fermeture est toujours là : on cible un panneau où il a été
    // retiré du parcours pour vérifier le repli.
    const view = await mount(sheet());
    const panel = view.container.querySelector('[data-dwc="sheet-panel"]');
    panel
      .querySelector('[data-dwc="sheet-close"]')
      .setAttribute('disabled', '');
    await view.act(() => press('Tab'));
    assert.equal(document.activeElement, panel);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('Sheet : le focus échappé au fond est ramené dans le panneau', async () => {
  const dom = setupDom();
  try {
    const outside = document.createElement('button');
    document.body.appendChild(outside);
    const view = await mount(sheet());
    outside.focus();
    await view.act(() => press('Tab'));
    assert.ok(
      view.container
        .querySelector('[data-dwc="sheet-panel"]')
        .contains(document.activeElement),
      'Tab ne doit pas laisser le focus partir dans la page de fond'
    );
    await view.unmount();
    outside.remove();
  } finally {
    dom.restore();
  }
});

test('Sheet : le scroll de fond est verrouillé puis rendu à sa valeur d’origine', async () => {
  const dom = setupDom();
  try {
    document.body.style.overflow = 'auto';
    const view = await mount(sheet());
    assert.equal(document.body.style.overflow, 'hidden');
    await view.rerender(sheet({ open: false }));
    assert.equal(document.body.style.overflow, 'auto');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('Sheet : deux feuilles fermées dans le désordre ne figent pas la page', async () => {
  const dom = setupDom();
  try {
    document.body.style.overflow = '';
    const a = await mount(sheet({ title: 'A' }));
    const b = await mount(sheet({ title: 'B' }));
    assert.equal(document.body.style.overflow, 'hidden');

    // Fermeture dans l'ordre inverse de l'ouverture : le compteur doit tenir.
    await a.rerender(sheet({ title: 'A', open: false }));
    assert.equal(
      document.body.style.overflow,
      'hidden',
      'une feuille est encore ouverte : le verrou doit tenir'
    );
    await b.rerender(sheet({ title: 'B', open: false }));
    assert.equal(document.body.style.overflow, '');

    await a.unmount();
    await b.unmount();
  } finally {
    dom.restore();
  }
});

test('Sheet : le gestionnaire clavier est retiré au démontage', async () => {
  const dom = setupDom();
  try {
    let closed = 0;
    const view = await mount(sheet({ onClose: () => (closed += 1) }));
    await view.unmount();
    press('Escape');
    assert.equal(closed, 0, 'un écouteur laissé en place fuiterait');
  } finally {
    dom.restore();
  }
});

test('Sheet : le pied est épinglé, et le corps est ce qui défile', async () => {
  // LE BLOCAGE MESURÉ. miss-uwh passe un `footer` dans QUINZE de ses vingt-trois
  // feuilles, avec ce commentaire : « reste TOUJOURS visible même quand le corps
  // défile (essentiel sur mobile pour les formulaires longs) ». Sans cette prop,
  // la feuille du paquet ne pouvait pas remplacer la sienne — c'était le seul
  // empêchement réel trouvé en comparant les deux API.
  const dom = setupDom();
  try {
    const view = await mount(
      h(
        Sheet,
        {
          open: true,
          title: 'Dépense',
          onClose() {},
          footer: h('button', {}, 'Enregistrer'),
        },
        h('p', {}, 'corps')
      )
    );
    const panel = view.container.querySelector('[data-dwc="sheet-panel"]');
    const body = view.container.querySelector('[data-dwc="sheet-body"]');
    const foot = view.container.querySelector('[data-dwc="sheet-footer"]');

    assert.ok(foot, 'pied absent');
    assert.match(foot.textContent, /Enregistrer/);
    // Le pied est un FRÈRE du corps, pas un enfant : sinon il défile avec lui.
    assert.equal(foot.parentElement, panel);
    assert.equal(body.parentElement, panel);
    assert.ok(
      [...panel.children].indexOf(foot) > [...panel.children].indexOf(body),
      'le pied doit venir après le corps'
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('Sheet : sans footer, aucun élément parasite', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(
        Sheet,
        { open: true, title: 'Simple', onClose() {} },
        h('p', {}, 'corps')
      )
    );
    assert.equal(
      view.container.querySelector('[data-dwc="sheet-footer"]'),
      null
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});
