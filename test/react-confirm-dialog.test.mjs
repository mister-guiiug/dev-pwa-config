/**
 * `ConfirmDialog` — les sept copies, et ce qu'elles se contredisaient.
 *
 * Chaque test ci-dessous verrouille un arbitrage dont l'inverse existe dans une
 * app mesurée. Un composant partagé qui trancherait sans le prouver ne vaudrait
 * pas mieux que la huitième copie.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import { setupDom, mount } from './helpers/dom.mjs';
import { ConfirmDialog } from '../react/confirm-dialog.js';
import { LabelsProvider } from '../react/labels.js';

const base = (overrides = {}) => ({
  open: true,
  title: 'Supprimer la partie ?',
  message: 'Cette action est définitive.',
  onConfirm() {},
  onCancel() {},
  ...overrides,
});

test('le focus s’ouvre sur Annuler, jamais sur la confirmation', async () => {
  // mister-quota pose `autoFocus` sur le bouton de CONFIRMATION : pour une
  // suppression, une frappe sur Entrée détruit. mister-doc et mister-qowa
  // documentent le choix inverse — c'est celui-ci.
  const dom = setupDom();
  try {
    const view = await mount(h(ConfirmDialog, base({ destructive: true })));
    const actif = document.activeElement;
    assert.equal(actif.dataset.dwc, 'confirm-cancel');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('la boîte porte un rôle d’alerte ET un nom accessible', async () => {
  // mister-quota pose `role="dialog"` sur le fond, sans étiquette : la boîte
  // n'a aucun nom. Ici le titre étiquette et le message décrit.
  const dom = setupDom();
  try {
    const view = await mount(h(ConfirmDialog, base()));
    const panel = view.container.querySelector('[role="alertdialog"]');
    assert.ok(panel, 'role="alertdialog" absent');
    assert.equal(panel.getAttribute('aria-modal'), 'true');

    const titleId = panel.getAttribute('aria-labelledby');
    assert.equal(
      view.container.querySelector(`#${titleId}`).textContent,
      'Supprimer la partie ?'
    );
    const bodyId = panel.getAttribute('aria-describedby');
    assert.match(
      view.container.querySelector(`#${bodyId}`).textContent,
      /définitive/
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('Échap annule ; le focus revient d’où il venait', async () => {
  const dom = setupDom();
  try {
    const declencheur = document.createElement('button');
    document.body.appendChild(declencheur);
    declencheur.focus();

    let annule = 0;
    const view = await mount(
      h(ConfirmDialog, base({ onCancel: () => (annule += 1) }))
    );
    await view.act(() => {
      document.dispatchEvent(
        new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
    });
    assert.equal(annule, 1);

    // La fermeture est décidée par l'app : on rejoue avec `open: false`.
    await view.rerender(h(ConfirmDialog, base({ open: false })));
    assert.equal(document.activeElement, declencheur);
    await view.unmount();
    declencheur.remove();
  } finally {
    dom.restore();
  }
});

test('Tab boucle dans la boîte au lieu de partir dans la page', async () => {
  const dom = setupDom();
  try {
    const dehors = document.createElement('button');
    document.body.appendChild(dehors);

    const view = await mount(h(ConfirmDialog, base()));
    const [annuler, confirmer] = [...view.container.querySelectorAll('button')];
    confirmer.focus();
    await view.act(() => {
      document.dispatchEvent(
        new window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true })
      );
    });
    assert.equal(document.activeElement, annuler, 'Tab s’est échappé');

    await view.act(() => {
      document.dispatchEvent(
        new window.KeyboardEvent('keydown', {
          key: 'Tab',
          shiftKey: true,
          bubbles: true,
        })
      );
    });
    assert.equal(document.activeElement, confirmer);
    await view.unmount();
    dehors.remove();
  } finally {
    dom.restore();
  }
});

test('destructive change le mot, pas seulement la couleur', async () => {
  const dom = setupDom();
  try {
    const doux = await mount(h(ConfirmDialog, base()));
    assert.equal(
      doux.container.querySelector('[data-dwc="confirm-confirm"]').textContent,
      'Confirmer'
    );
    await doux.unmount();

    const dur = await mount(h(ConfirmDialog, base({ destructive: true })));
    assert.equal(
      dur.container.querySelector('[data-dwc="confirm-confirm"]').textContent,
      'Supprimer'
    );
    assert.ok(
      dur.container.querySelector('[data-dwc="confirm"][data-destructive]'),
      'l’habillage n’a aucun crochet pour le cas destructif'
    );
    await dur.unmount();
  } finally {
    dom.restore();
  }
});

test('loading garde la boîte ouverte et bloque le double envoi', async () => {
  // miss-uwh appelle `onConfirm()` PUIS `onClose()` : une confirmation
  // asynchrone ne peut pas garder la boîte le temps de sa requête.
  const dom = setupDom();
  try {
    let confirme = 0;
    const view = await mount(
      h(
        ConfirmDialog,
        base({ loading: true, onConfirm: () => (confirme += 1) })
      )
    );
    const bouton = view.container.querySelector('[data-dwc="confirm-confirm"]');
    assert.equal(bouton.getAttribute('aria-disabled'), 'true');
    // `aria-disabled` et non `disabled` : le focus ne doit pas quitter le piège.
    assert.equal(bouton.disabled, false);
    await view.act(() => bouton.click());
    await view.act(() => bouton.click());
    assert.equal(confirme, 0, 'le clic passe malgré loading');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('le fond ferme, sauf pendant une confirmation en cours', async () => {
  const dom = setupDom();
  try {
    let annule = 0;
    const view = await mount(
      h(ConfirmDialog, base({ onCancel: () => (annule += 1) }))
    );
    const racine = view.container.querySelector('[data-dwc="confirm"]');
    await view.act(() =>
      racine.dispatchEvent(
        new window.MouseEvent('mousedown', { bubbles: true })
      )
    );
    assert.equal(annule, 1);
    await view.unmount();

    const occupe = await mount(
      h(ConfirmDialog, base({ loading: true, onCancel: () => (annule += 1) }))
    );
    await occupe.act(() =>
      occupe.container
        .querySelector('[data-dwc="confirm"]')
        .dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }))
    );
    assert.equal(annule, 1, 'le fond a fermé pendant l’opération');
    await occupe.unmount();
  } finally {
    dom.restore();
  }
});

test('les libellés suivent le dictionnaire', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(
        LabelsProvider,
        { locale: 'en' },
        h(ConfirmDialog, base({ destructive: true }))
      )
    );
    assert.match(view.container.innerHTML, />Cancel</);
    assert.match(view.container.innerHTML, />Delete</);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('cancelLabel: null — l’alerte à un bouton, focus sur l’action unique', async () => {
  // Trois apps n'ont pas pu migrer leurs boîtes d'ALERTE pendant la campagne
  // components.css, parce que le composant rendait toujours deux boutons :
  // l'ErrorModal de mister-puzzle, le mode « alert » du DialogProvider de
  // mister-cim10, la boîte d'erreur de miss-carbook. `null` — et non
  // `undefined`, qui garde le repli « Annuler » — retire le bouton. Sans
  // Annuler, le « choix sûr » n'existe plus : le focus va sur l'action
  // unique, comme `window.alert`.
  const dom = setupDom();
  try {
    const view = await mount(
      h(ConfirmDialog, {
        open: true,
        title: 'Sauvegarde impossible',
        message: 'Vérifiez l’espace disponible.',
        cancelLabel: null,
        onConfirm() {},
        // Pas d'`onCancel` : une alerte n'en a pas — la prop est optionnelle.
      })
    );
    assert.equal(
      view.container.querySelector('[data-dwc="confirm-cancel"]'),
      null,
      'le bouton Annuler est rendu malgré cancelLabel: null'
    );
    const bouton = view.container.querySelector('[data-dwc="confirm-confirm"]');
    // Le défaut n'est plus « Confirmer » : une alerte ne confirme rien.
    assert.equal(bouton.textContent, 'OK');
    // Le rôle reste `alertdialog` : c'est LE rôle prévu pour une alerte.
    assert.ok(
      view.container.querySelector('[role="alertdialog"]'),
      'le rôle alertdialog a disparu en mono-action'
    );
    assert.equal(document.activeElement, bouton);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('en mono-action, Échap et le voile valent un « OK »', async () => {
  // Il n'y a qu'une issue : la prise d'acte. Échap et le clic dans le fond
  // passent par `onConfirm` — et par sa garde `loading`, sinon la touche
  // referait exactement ce que la garde du bouton empêche. `onCancel`, s'il
  // est quand même fourni, est ignoré.
  const dom = setupDom();
  try {
    let ok = 0;
    let annule = 0;
    const props = {
      open: true,
      title: 'Sauvegarde impossible',
      cancelLabel: null,
      onConfirm: () => (ok += 1),
      onCancel: () => (annule += 1),
    };
    const view = await mount(h(ConfirmDialog, props));
    await view.act(() => {
      document.dispatchEvent(
        new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
    });
    assert.equal(ok, 1, 'Échap n’a pas pris acte');
    await view.act(() =>
      view.container
        .querySelector('[data-dwc="confirm"]')
        .dispatchEvent(new window.MouseEvent('mousedown', { bubbles: true }))
    );
    assert.equal(ok, 2, 'le voile n’a pas pris acte');
    assert.equal(annule, 0, 'onCancel a été appelé en mono-action');
    await view.unmount();

    const occupe = await mount(h(ConfirmDialog, { ...props, loading: true }));
    await occupe.act(() => {
      document.dispatchEvent(
        new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
    });
    assert.equal(ok, 2, 'Échap est passé malgré loading');
    await occupe.unmount();
  } finally {
    dom.restore();
  }
});

test('mono-action : la prop l’emporte, puis le dictionnaire, puis « OK »', async () => {
  // mister-puzzle affiche « Fermer », mister-cim10 son « OK » i18n : les trois
  // niveaux de résolution valent aussi pour ce libellé-là.
  const dom = setupDom();
  try {
    // `destructive` garde sa teinte (le crochet CSS), pas son mot : une
    // alerte ne supprime rien, le défaut reste « OK ».
    const defaut = await mount(
      h(ConfirmDialog, base({ cancelLabel: null, destructive: true }))
    );
    assert.equal(
      defaut.container.querySelector('[data-dwc="confirm-confirm"]')
        .textContent,
      'OK'
    );
    assert.ok(
      defaut.container.querySelector('[data-dwc="confirm"][data-destructive]')
    );
    await defaut.unmount();

    const explicite = await mount(
      h(ConfirmDialog, base({ cancelLabel: null, confirmLabel: 'Fermer' }))
    );
    assert.equal(
      explicite.container.querySelector('[data-dwc="confirm-confirm"]')
        .textContent,
      'Fermer'
    );
    await explicite.unmount();

    const surcharge = await mount(
      h(
        LabelsProvider,
        { locale: 'fr', overrides: { confirm: { ok: 'Compris' } } },
        h(ConfirmDialog, base({ cancelLabel: null }))
      )
    );
    assert.match(surcharge.container.innerHTML, />Compris</);
    await surcharge.unmount();
  } finally {
    dom.restore();
  }
});

test('fermée, elle ne rend rien et ne verrouille pas la page', async () => {
  const dom = setupDom();
  try {
    const view = await mount(h(ConfirmDialog, base({ open: false })));
    assert.equal(view.container.innerHTML, '');
    assert.equal(document.body.style.overflow, '');
    await view.unmount();
  } finally {
    dom.restore();
  }
});
