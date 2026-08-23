/**
 * Tests des hooks React, dans un vrai DOM.
 *
 * Sept hooks du paquet n'avaient aucun test : la suite existante rend en HTML
 * statique, donc aucun effet ne s'exécutait. Le premier test écrit ici — celui
 * de la file hors-ligne — reproduit une perte d'écriture bien réelle.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { setupDom, mount, renderHook } from './helpers/dom.mjs';
import { useOfflineMutationQueue } from '../react/use-offline-queue.js';
import { useLocalStorage } from '../react/use-local-storage.js';
import { useTheme } from '../react/use-theme.js';
import { useOnline } from '../react/use-online.js';
import { useMediaQuery, useReducedMotion } from '../react/use-media-query.js';

/** Promesse dont on contrôle la résolution depuis le test. */
function deferred() {
  let resolve, reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/* ── File de mutations hors-ligne ───────────────────────────────────────── */

test('file hors-ligne : une écriture ajoutée pendant le rejeu n’est pas perdue', async () => {
  const dom = setupDom({ online: false });
  try {
    const gate = deferred();
    const seen = [];
    const view = await renderHook(() =>
      useOfflineMutationQueue({
        storageKey: 'q',
        retries: 0,
        process: payload => {
          seen.push(payload);
          return payload === 'A' ? gate.promise : Promise.resolve();
        },
      })
    );

    await view.act(() => view.result.current.enqueue('A'));
    assert.equal(view.result.current.pending, 1);

    // Retour du réseau : `flush` démarre et reste bloqué sur l'envoi de A.
    await view.act(() => dom.setOnline(true));
    assert.deepEqual(seen, ['A']);

    // L'utilisateur saisit B pendant que A part encore.
    await view.act(() => view.result.current.enqueue('B'));

    // A aboutit : le retrait de A ne doit pas emporter B avec lui.
    await view.act(async () => {
      gate.resolve();
    });

    assert.ok(seen.includes('B'), 'B n’a jamais été envoyé : écriture perdue');
    assert.equal(view.result.current.pending, 0);
    assert.equal(localStorage.getItem('q'), '[]');

    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('file hors-ligne : un élément durablement en échec est mis de côté, les suivants passent', async () => {
  const dom = setupDom({ online: false });
  try {
    const seen = [];
    const view = await renderHook(() =>
      useOfflineMutationQueue({
        storageKey: 'q',
        retries: 0,
        maxAttempts: 2,
        process: payload => {
          seen.push(payload);
          return payload === 'poison'
            ? Promise.reject(new Error('boom'))
            : Promise.resolve();
        },
      })
    );

    await view.act(() => {
      view.result.current.enqueue('poison');
      view.result.current.enqueue('ok');
    });

    // Deux passages : le premier consomme la tentative restante du poison.
    await view.act(() => dom.setOnline(true));
    await view.act(() => view.result.current.flush());

    assert.ok(
      seen.includes('ok'),
      'la tête de file en échec bloque définitivement les suivants'
    );
    assert.equal(view.result.current.pending, 0);
    assert.equal(view.result.current.failed.length, 1);
    assert.equal(view.result.current.failed[0].payload, 'poison');

    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('file hors-ligne : un contenu stocké illisible ne fait pas planter le montage', async () => {
  // Hors ligne : sans ça, le rejeu au montage viderait la file avant l'assertion.
  const dom = setupDom({ online: false });
  try {
    localStorage.setItem('q', '{"pas":"un tableau"}');
    const view = await renderHook(() =>
      useOfflineMutationQueue({
        storageKey: 'q',
        process: () => Promise.resolve(),
      })
    );
    assert.equal(view.result.current.pending, 0);
    await view.act(() => view.result.current.enqueue('A'));
    assert.equal(view.result.current.pending, 1);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('file hors-ligne : le plafond refuse l’ajout au lieu de gonfler sans fin', async () => {
  const dom = setupDom({ online: false });
  try {
    const view = await renderHook(() =>
      useOfflineMutationQueue({
        storageKey: 'q',
        maxQueueSize: 2,
        process: () => Promise.resolve(),
      })
    );
    let accepted;
    await view.act(() => {
      view.result.current.enqueue('A');
      view.result.current.enqueue('B');
    });
    await view.act(() => {
      accepted = view.result.current.enqueue('C');
    });
    assert.equal(accepted, null, 'l’ajout au-delà du plafond doit être refusé');
    assert.equal(view.result.current.pending, 2);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

/* ── useLocalStorage ────────────────────────────────────────────────────── */

test('useLocalStorage : lit la valeur existante, persiste, et resynchronise', async () => {
  const dom = setupDom();
  try {
    localStorage.setItem('k', '"initiale"');
    const view = await renderHook(() => useLocalStorage('k', 'défaut'));
    assert.equal(view.result.current[0], 'initiale');

    await view.act(() => view.result.current[1]('modifiée'));
    assert.equal(localStorage.getItem('k'), '"modifiée"');
    assert.equal(view.result.current[0], 'modifiée');

    await view.act(() => view.result.current[2]());
    assert.equal(localStorage.getItem('k'), null);
    assert.equal(view.result.current[0], 'défaut');

    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('useLocalStorage : deux instances de la même clé restent en phase', async () => {
  const dom = setupDom();
  try {
    const a = await renderHook(() => useLocalStorage('partagee', 0));
    const b = await renderHook(() => useLocalStorage('partagee', 0));
    await a.act(() => a.result.current[1](42));
    assert.equal(b.result.current[0], 42);
    await a.unmount();
    await b.unmount();
  } finally {
    dom.restore();
  }
});

/* ── useTheme ───────────────────────────────────────────────────────────── */

test('useTheme : applique data-theme et color-scheme sur <html>', async () => {
  const dom = setupDom();
  try {
    const view = await renderHook(() => useTheme());
    assert.equal(document.documentElement.getAttribute('data-theme'), 'light');
    assert.equal(document.documentElement.style.colorScheme, 'light');

    await view.act(() => view.result.current.setTheme('dark'));
    assert.equal(document.documentElement.getAttribute('data-theme'), 'dark');
    assert.equal(localStorage.getItem('dwc_theme'), 'dark');

    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('useTheme : en mode système, suit le changement de préférence', async () => {
  const dom = setupDom();
  try {
    const view = await renderHook(() => useTheme());
    assert.equal(view.result.current.resolved, 'light');
    await view.act(() =>
      dom.setMediaQuery('(prefers-color-scheme: dark)', true)
    );
    assert.equal(view.result.current.resolved, 'dark');
    assert.equal(document.documentElement.getAttribute('data-theme'), 'dark');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('useTheme : une valeur stockée corrompue retombe sur le défaut', async () => {
  const dom = setupDom();
  try {
    localStorage.setItem('dwc_theme', 'néon');
    const view = await renderHook(() => useTheme({ defaultTheme: 'light' }));
    assert.equal(view.result.current.theme, 'light');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('useTheme : attribute "class" bascule .dark au lieu de data-theme', async () => {
  const dom = setupDom();
  try {
    const view = await renderHook(() =>
      useTheme({ attribute: 'class', defaultTheme: 'dark' })
    );
    assert.ok(document.documentElement.classList.contains('dark'));
    assert.equal(document.documentElement.getAttribute('data-theme'), null);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

/* ── useOnline / useMediaQuery ──────────────────────────────────────────── */

test('useOnline : suit les événements online / offline', async () => {
  const dom = setupDom({ online: true });
  try {
    const view = await renderHook(() => useOnline());
    assert.equal(view.result.current, true);
    await view.act(() => dom.setOnline(false));
    assert.equal(view.result.current, false);
    await view.act(() => dom.setOnline(true));
    assert.equal(view.result.current, true);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('useMediaQuery : réagit au changement et se désabonne au démontage', async () => {
  const dom = setupDom();
  try {
    const view = await renderHook(() => useMediaQuery('(min-width: 48rem)'));
    assert.equal(view.result.current, false);
    await view.act(() => dom.setMediaQuery('(min-width: 48rem)', true));
    assert.equal(view.result.current, true);
    await view.unmount();
    // Après démontage, une notification ne doit plus provoquer de rendu
    // (React signalerait « update on unmounted component »).
    dom.setMediaQuery('(min-width: 48rem)', false);
  } finally {
    dom.restore();
  }
});

test('useReducedMotion : lit la préférence système', async () => {
  const dom = setupDom();
  try {
    dom.setMediaQuery('(prefers-reduced-motion: reduce)', true);
    const view = await renderHook(() => useReducedMotion());
    assert.equal(view.result.current, true);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

/* ── Garde-fou : le harnais lui-même ────────────────────────────────────── */

test('le DOM de test est bien retiré des globales après restore()', async () => {
  const dom = setupDom();
  const view = await mount(null);
  await view.unmount();
  dom.restore();
  assert.equal(typeof globalThis.IS_REACT_ACT_ENVIRONMENT, 'undefined');
});
