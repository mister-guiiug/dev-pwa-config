/**
 * La carte « Sauvegarde » dans un vrai DOM : elle exporte ce que l'app lui
 * donne, n'importe qu'après confirmation, dit de quand date la dernière
 * sauvegarde, et propose de demander au navigateur de garder les données.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import { setupDom, mount } from './helpers/dom.mjs';
import { BackupCard } from '../react/backup-card.js';
import { backupStateKey } from '../backup-reminder.js';

const carte = view => view.container.querySelector('[data-dwc="backup-card"]');
const bouton = (view, texte) =>
  [...document.querySelectorAll('button')].find(b => b.textContent === texte);
const texte = (view, sel) =>
  view.container.querySelector(`[data-dwc="${sel}"]`)?.textContent ?? null;

/** Le navigateur tel que la carte le voit : stockage persistant, téléchargement. */
function poserNavigateur(dom, { persisted = false, accorde = true } = {}) {
  const demandes = [];
  Object.defineProperty(dom.window.navigator, 'storage', {
    value: {
      persisted: async () => persisted,
      persist: async () => {
        demandes.push('persist');
        return accorde;
      },
    },
    configurable: true,
  });
  const telecharges = [];
  globalThis.URL.createObjectURL = () => 'blob:x';
  globalThis.URL.revokeObjectURL = () => {};
  globalThis.Blob = dom.window.Blob;
  dom.window.HTMLAnchorElement.prototype.click = function () {
    telecharges.push(this.download);
  };
  return { demandes, telecharges };
}

test('jamais sauvegardé : la carte le dit, et rappelle d’exporter', async () => {
  const dom = setupDom();
  try {
    poserNavigateur(dom);
    const view = await mount(
      h(BackupCard, { app: 'miss-x', exportData: () => ({ a: 1 }) })
    );
    assert.ok(carte(view));
    assert.match(texte(view, 'backup-card-last'), /Aucune sauvegarde/);
    assert.match(texte(view, 'backup-card-due'), /Pensez à exporter/);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('exporter télécharge les données de l’app et note la date', async () => {
  const dom = setupDom();
  try {
    const { telecharges } = poserNavigateur(dom);
    const view = await mount(
      h(BackupCard, { app: 'miss-x', exportData: async () => ({ notes: [1] }) })
    );
    await view.act(() => bouton(view, 'Exporter une sauvegarde').click());
    await view.act(async () => {});
    assert.equal(telecharges.length, 1);
    assert.match(telecharges[0], /^miss-x-sauvegarde-\d{4}-\d{2}-\d{2}\.json$/);
    const etat = JSON.parse(localStorage.getItem(backupStateKey('miss-x')));
    assert.ok(etat.last, 'la date de sauvegarde est notée');
    assert.equal(texte(view, 'backup-card-due'), null, 'le rappel se tait');
    assert.match(texte(view, 'backup-card-status'), /Sauvegarde exportée/);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('le stockage non persistant se dit, et se demande sur un geste', async () => {
  const dom = setupDom();
  try {
    const { demandes } = poserNavigateur(dom, { persisted: false });
    const view = await mount(
      h(BackupCard, { app: 'miss-x', exportData: () => ({}) })
    );
    await view.act(async () => {});
    assert.match(texte(view, 'backup-card-persist'), /peut effacer/);
    assert.equal(demandes.length, 0, 'rien n’est demandé sans geste');
    await view.act(() => bouton(view, 'Lui demander de les garder').click());
    await view.act(async () => {});
    assert.deepEqual(demandes, ['persist']);
    assert.match(texte(view, 'backup-card-persist'), /garde ces données/);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('sans importData, pas de bouton d’import', async () => {
  const dom = setupDom();
  try {
    poserNavigateur(dom);
    const view = await mount(
      h(BackupCard, { app: 'miss-x', exportData: () => ({}) })
    );
    assert.equal(bouton(view, 'Importer un fichier'), undefined);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('importer demande confirmation, puis rend la main à l’app', async () => {
  const dom = setupDom();
  try {
    poserNavigateur(dom);
    const recus = [];
    const view = await mount(
      h(BackupCard, {
        app: 'miss-x',
        exportData: () => ({}),
        importData: data => {
          recus.push(data);
          return { ok: true };
        },
      })
    );
    const champ = view.container.querySelector('input[type="file"]');
    const fichier = new dom.window.File(['{"notes":[2]}'], 's.json', {
      type: 'application/json',
    });
    Object.defineProperty(champ, 'files', {
      value: [fichier],
      configurable: true,
    });
    await view.act(() =>
      champ.dispatchEvent(new dom.window.Event('change', { bubbles: true }))
    );
    await view.act(async () => {});
    assert.equal(recus.length, 0, 'rien n’est importé avant la confirmation');
    await view.act(() => bouton(view, 'Remplacer').click());
    await view.act(async () => {});
    assert.deepEqual(recus, [{ notes: [2] }]);
    assert.match(texte(view, 'backup-card-status'), /Données importées/);
    await view.unmount();
  } finally {
    dom.restore();
  }
});
