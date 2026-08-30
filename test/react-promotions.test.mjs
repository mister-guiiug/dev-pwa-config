/**
 * Promotions du 30/08/2026 — hooks et composants React, dans un vrai DOM.
 * Les modules purs sont couverts par `promotions.test.mjs`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import { setupDom, mount, renderHook } from './helpers/dom.mjs';
import { useKeyboardShortcuts } from '../react/use-keyboard-shortcuts.js';
import { useAsync } from '../react/use-async.js';
import { useUndoableState } from '../react/use-undoable-state.js';
import { useLongPress } from '../react/use-long-press.js';
import { SegmentedControl } from '../react/segmented-control.js';
import { ConnectionBanner } from '../react/connection-banner.js';

/* ── useKeyboardShortcuts ───────────────────────────────────────────────── */

test('raccourcis : déclenchés au clavier, inertes dans un champ de saisie', async () => {
  const dom = setupDom();
  try {
    const hits = [];
    const view = await renderHook(() =>
      useKeyboardShortcuts({ r: () => hits.push('r') })
    );

    const press = target =>
      view.act(() => {
        const event = new dom.window.KeyboardEvent('keydown', {
          key: 'R',
          bubbles: true,
        });
        (target ?? dom.window).dispatchEvent(event);
      });

    await press();
    assert.deepEqual(hits, ['r']);

    // La même frappe née dans un input ne doit rien déclencher.
    const input = dom.window.document.createElement('input');
    dom.window.document.body.appendChild(input);
    await press(input);
    assert.deepEqual(hits, ['r']);

    await view.unmount();
  } finally {
    dom.restore();
  }
});

/* ── useAsync ───────────────────────────────────────────────────────────── */

test('useAsync : donnée, erreur normalisée en Error, rechargement', async () => {
  const dom = setupDom();
  try {
    let mode = 'ok';
    const view = await renderHook(() =>
      useAsync(
        () => (mode === 'ok' ? Promise.resolve(42) : Promise.reject('boom')),
        'k'
      )
    );
    await view.act(async () => {});
    assert.equal(view.result.current.data, 42);
    assert.equal(view.result.current.loading, false);

    mode = 'ko';
    await view.act(() => view.result.current.reload());
    await view.act(async () => {});
    assert.ok(view.result.current.error instanceof Error);
    assert.equal(view.result.current.error.message, 'boom');

    await view.unmount();
  } finally {
    dom.restore();
  }
});

/* ── useUndoableState ───────────────────────────────────────────────────── */

test('useUndoableState : undo, persistance injectée, état final effacé', async () => {
  const dom = setupDom();
  try {
    const store = { value: null };
    const view = await renderHook(() =>
      useUndoableState({
        load: () => store.value,
        save: s => {
          store.value = s;
        },
        clear: () => {
          store.value = null;
        },
        isFinal: s => s.done === true,
      })
    );

    await view.act(() => view.result.current.start({ score: 0 }));
    assert.equal(view.result.current.canUndo, false);
    assert.deepEqual(store.value, { score: 0 });

    await view.act(() => view.result.current.apply({ score: 5 }));
    assert.equal(view.result.current.canUndo, true);

    await view.act(() => view.result.current.undo());
    assert.deepEqual(view.result.current.state, { score: 0 });

    // Un état final ne se « reprend » pas : sa sauvegarde disparaît.
    await view.act(() => view.result.current.apply({ score: 9, done: true }));
    assert.equal(store.value, null);

    await view.unmount();
  } finally {
    dom.restore();
  }
});

/* ── useLongPress ───────────────────────────────────────────────────────── */

test('useLongPress : appui long déclenché, tap court distingué', async ctx => {
  ctx.mock.timers.enable({ apis: ['setTimeout'] });
  const dom = setupDom();
  try {
    const calls = [];
    const view = await renderHook(() =>
      useLongPress(() => calls.push('long'), {
        onTap: () => calls.push('tap'),
        delayMs: 450,
      })
    );
    const down = { clientX: 0, clientY: 0, pointerId: 1 };

    // Appui maintenu au-delà du délai : long press.
    await view.act(() => view.result.current.handlers.onPointerDown(down));
    assert.equal(view.result.current.isPressing, true);
    await view.act(() => ctx.mock.timers.tick(500));
    await view.act(() => view.result.current.handlers.onPointerUp(down));
    assert.deepEqual(calls, ['long']);

    // Relâche rapide : tap.
    await view.act(() => view.result.current.handlers.onPointerDown(down));
    await view.act(() => ctx.mock.timers.tick(100));
    await view.act(() => view.result.current.handlers.onPointerUp(down));
    assert.deepEqual(calls, ['long', 'tap']);

    await view.unmount();
  } finally {
    dom.restore();
  }
});

/* ── SegmentedControl ───────────────────────────────────────────────────── */

test('SegmentedControl : tablist accessible, clic remonte la valeur', async () => {
  const dom = setupDom();
  try {
    let selected = 'a';
    const view = await mount(
      h(SegmentedControl, {
        value: 'a',
        onChange: v => {
          selected = v;
        },
        ariaLabel: 'Période',
        options: [
          { value: 'a', label: 'Jour' },
          { value: 'b', label: 'Semaine' },
        ],
      })
    );
    const tabs = view.container.querySelectorAll('[data-dwc="segmented-tab"]');
    assert.equal(tabs.length, 2);
    assert.equal(tabs[0].getAttribute('aria-selected'), 'true');
    assert.equal(tabs[1].getAttribute('aria-selected'), 'false');

    await view.act(() => tabs[1].click());
    assert.equal(selected, 'b');

    await view.unmount();
  } finally {
    dom.restore();
  }
});

/* ── ConnectionBanner ───────────────────────────────────────────────────── */

test('ConnectionBanner : rien en ligne, visible après le délai hors ligne', async ctx => {
  ctx.mock.timers.enable({ apis: ['setTimeout'] });
  const dom = setupDom({ online: true });
  try {
    const view = await mount(h(ConnectionBanner, { delayMs: 1000 }));
    const query = () =>
      view.container.querySelector('[data-dwc="connection-banner"]');
    assert.equal(query(), null);

    // Coupure : rien avant le délai (anti-clignotement)…
    await view.act(() => dom.setOnline(false));
    assert.equal(query(), null);
    await view.act(() => ctx.mock.timers.tick(1100));
    assert.notEqual(query(), null);
    assert.equal(query().getAttribute('role'), 'status');

    // …et disparition immédiate au retour du réseau.
    await view.act(() => dom.setOnline(true));
    assert.equal(query(), null);

    await view.unmount();
  } finally {
    dom.restore();
  }
});
