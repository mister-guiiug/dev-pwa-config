/**
 * `ThemeToggle` — cinq copies, trois défauts.
 *
 * Le troisième est le plus coûteux et le moins visible : une bascule à deux
 * états rend « système » inatteignable, donc l'app cesse définitivement de
 * suivre le réglage du système d'exploitation.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import { setupDom, mount } from './helpers/dom.mjs';
import { ThemeToggle } from '../react/theme-toggle.js';
import { LabelsProvider } from '../react/labels.js';

const bouton = view =>
  view.container.querySelector('[data-dwc="theme-toggle"]');

test('le bouton porte type="button"', async () => {
  // mister-doc et miss-lookhouse l'oublient : dans un <form>, changer de thème
  // soumet le formulaire.
  const dom = setupDom();
  try {
    const view = await mount(h(ThemeToggle, {}));
    assert.equal(bouton(view).getAttribute('type'), 'button');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('le cycle passe par « système », et y revient', async () => {
  const dom = setupDom();
  try {
    const view = await mount(h(ThemeToggle, {}));
    const vus = [];
    for (let i = 0; i < 4; i += 1) {
      vus.push(bouton(view).dataset.themeState);
      await view.act(() => bouton(view).click());
    }
    assert.deepEqual(vus, ['system', 'light', 'dark', 'system']);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('le nom accessible dit QUEL thème est actif, et lequel suit', async () => {
  // Quatre copies sur cinq posent un libellé figé (« Changer de thème ») : un
  // lecteur d'écran n'apprend jamais l'état courant.
  const dom = setupDom();
  try {
    const view = await mount(h(ThemeToggle, {}));
    assert.equal(
      bouton(view).getAttribute('aria-label'),
      'Thème : système. Activer le thème clair.'
    );
    await view.act(() => bouton(view).click());
    assert.equal(
      bouton(view).getAttribute('aria-label'),
      'Thème : clair. Activer le thème sombre.'
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('aria-pressed n’apparaît qu’à deux états', async () => {
  const dom = setupDom();
  try {
    const trois = await mount(h(ThemeToggle, {}));
    assert.equal(bouton(trois).getAttribute('aria-pressed'), null);
    await trois.unmount();

    const deux = await mount(h(ThemeToggle, { states: ['light', 'dark'] }));
    assert.equal(bouton(deux).getAttribute('aria-pressed'), 'false');
    await deux.act(() => bouton(deux).click());
    assert.equal(bouton(deux).getAttribute('aria-pressed'), 'true');
    assert.equal(bouton(deux).dataset.themeState, 'dark');
    await deux.unmount();
  } finally {
    dom.restore();
  }
});

test('le thème est réellement appliqué au document', async () => {
  const dom = setupDom();
  try {
    const view = await mount(h(ThemeToggle, {}));
    await view.act(() => bouton(view).click());
    assert.equal(document.documentElement.dataset.theme, 'light');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('les libellés suivent le dictionnaire', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(LabelsProvider, { locale: 'en' }, h(ThemeToggle, { showLabel: true }))
    );
    // Avec `showLabel`, le texte est visible : pas d'aria-label en double.
    assert.equal(bouton(view).getAttribute('aria-label'), null);
    assert.match(
      view.container.textContent,
      /Theme: system\. Switch to the light theme\./
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});
