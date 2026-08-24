/**
 * `share.js` et `download.js` — deux mécaniques recopiées, l'une dans quatre
 * apps, l'autre dans DOUZE.
 *
 * Les tests verrouillent d'abord ce qui a été corrigé à la promotion : une
 * annulation n'est pas un échec, et une ancre détachée ne télécharge rien.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setupDom } from './helpers/dom.mjs';
import { shareOrCopy, copyToClipboard, currentAppUrl } from '../share.js';
import {
  dateSlug,
  downloadBlob,
  downloadJson,
  downloadText,
  readJsonFile,
} from '../download.js';

/** Installe un `navigator.share` / `clipboard` pilotable. */
function withNavigator({ share, clipboard } = {}) {
  const nav = globalThis.navigator;
  const saved = {
    share: Object.getOwnPropertyDescriptor(nav, 'share'),
    clipboard: Object.getOwnPropertyDescriptor(nav, 'clipboard'),
  };
  Object.defineProperty(nav, 'share', { value: share, configurable: true });
  Object.defineProperty(nav, 'clipboard', {
    value: clipboard,
    configurable: true,
  });
  return () => {
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(nav, key, descriptor);
      else delete nav[key];
    }
  };
}

/* ── share ──────────────────────────────────────────────────────────────── */

test('une annulation n’est pas un échec, et ne copie rien en douce', async () => {
  // LE DÉFAUT REPRODUIT : mister-qowa rend `'failed'` dès que `navigator.share`
  // lève — or il lève AUSSI quand l'utilisateur ferme la feuille. L'app affiche
  // « échec » à quelqu'un qui a simplement changé d'avis.
  const dom = setupDom();
  let copie = 0;
  const restore = withNavigator({
    share: () => {
      const error = new Error('canceled');
      error.name = 'AbortError';
      return Promise.reject(error);
    },
    clipboard: {
      writeText: () => {
        copie += 1;
        return Promise.resolve();
      },
    },
  });
  try {
    assert.equal(
      await shareOrCopy({ url: 'https://exemple.test/' }),
      'cancelled'
    );
    assert.equal(
      copie,
      0,
      'le presse-papiers a été utilisé après une annulation'
    );
  } finally {
    restore();
    dom.restore();
  }
});

test('un partage abouti dit « shared » ; une vraie panne bascule sur la copie', async () => {
  const dom = setupDom();
  const copies = [];
  const clipboard = {
    writeText: text => {
      copies.push(text);
      return Promise.resolve();
    },
  };

  let restore = withNavigator({ share: () => Promise.resolve(), clipboard });
  assert.equal(await shareOrCopy({ url: 'https://exemple.test/' }), 'shared');
  assert.deepEqual(copies, []);
  restore();

  restore = withNavigator({
    share: () => Promise.reject(new Error('NotAllowedError')),
    clipboard,
  });
  assert.equal(await shareOrCopy({ url: 'https://exemple.test/a' }), 'copied');
  assert.deepEqual(copies, ['https://exemple.test/a']);
  restore();
  dom.restore();
});

test('sans Web Share, on copie ; sans presse-papiers non plus, on le dit', async () => {
  const dom = setupDom();
  let restore = withNavigator({
    clipboard: { writeText: () => Promise.resolve() },
  });
  assert.equal(await shareOrCopy({ text: 'coucou' }), 'copied');
  restore();

  restore = withNavigator({
    clipboard: { writeText: () => Promise.reject(new Error('refusé')) },
  });
  assert.equal(await shareOrCopy({ text: 'coucou' }), 'failed');
  assert.equal(await copyToClipboard('x'), false);
  restore();

  // Rien à partager : inutile d'aller plus loin.
  restore = withNavigator({});
  assert.equal(await shareOrCopy({}), 'failed');
  restore();
  dom.restore();
});

test('currentAppUrl rend la racine du déploiement, sans lever hors navigateur', () => {
  const dom = setupDom({ url: 'https://exemple.test/appli/page?x=1' });
  try {
    assert.equal(currentAppUrl(), 'https://exemple.test/');
  } finally {
    dom.restore();
  }
  // Hors DOM : chaîne vide plutôt qu'une exception.
  assert.equal(currentAppUrl(), '');
});

/* ── download ───────────────────────────────────────────────────────────── */

test('l’ancre est attachée au document, cliquée, puis retirée', async () => {
  // LE DÉFAUT REPRODUIT : deux des douze copies ne rattachent pas l'ancre —
  // détachée, elle ne déclenche rien sur Firefox.
  const dom = setupDom();
  const created = [];
  const original = document.createElement.bind(document);
  document.createElement = tag => {
    const node = original(tag);
    if (tag === 'a') {
      created.push(node);
      node.click = () => {
        node.__attaché = node.isConnected;
        node.__clics = (node.__clics ?? 0) + 1;
      };
    }
    return node;
  };
  const revoked = [];
  globalThis.URL.createObjectURL = () => 'blob:essai';
  globalThis.URL.revokeObjectURL = url => revoked.push(url);
  try {
    assert.equal(downloadText('bonjour', 'note.txt'), true);
    const anchor = created.at(-1);
    assert.equal(anchor.__clics, 1);
    assert.equal(
      anchor.__attaché,
      true,
      'l’ancre n’était pas dans le document'
    );
    assert.equal(anchor.isConnected, false, 'l’ancre n’a pas été retirée');
    assert.equal(anchor.download, 'note.txt');
    // L'URL d'objet est révoquée : les copies qui l'oublient fuient à chaque export.
    assert.deepEqual(revoked, ['blob:essai']);
  } finally {
    document.createElement = original;
    dom.restore();
  }
});

test('l’URL d’objet est révoquée même si le clic lève', () => {
  const dom = setupDom();
  const original = document.createElement.bind(document);
  const revoked = [];
  document.createElement = tag => {
    const node = original(tag);
    if (tag === 'a')
      node.click = () => {
        throw new Error('bloqué');
      };
    return node;
  };
  globalThis.URL.createObjectURL = () => 'blob:zut';
  globalThis.URL.revokeObjectURL = url => revoked.push(url);
  try {
    assert.throws(() => downloadText('x', 'x.txt'));
    assert.deepEqual(revoked, ['blob:zut'], 'fuite : URL non révoquée');
  } finally {
    document.createElement = original;
    dom.restore();
  }
});

test('sans DOM, downloadBlob rend false au lieu de lever', () => {
  assert.equal(downloadBlob(new Blob(['x']), 'x.txt'), false);
});

test('downloadJson indente, et readJsonFile relit', async () => {
  const data = { a: 1, b: [2, 3] };
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  });
  assert.deepEqual(await readJsonFile(blob), data);
  // Un JSON invalide LÈVE, au lieu de rendre `false` comme mister-cim10 :
  // un import raté doit pouvoir dire pourquoi.
  await assert.rejects(() => readJsonFile(new Blob(['{oups'])), SyntaxError);
  assert.equal(typeof downloadJson, 'function');
});

test('dateSlug rend une date utilisable dans un nom de fichier', () => {
  assert.equal(dateSlug(new Date(2026, 7, 4)), '2026-08-04');
  assert.equal(dateSlug('pas une date'), '');
  assert.match(dateSlug(), /^\d{4}-\d{2}-\d{2}$/);
});
