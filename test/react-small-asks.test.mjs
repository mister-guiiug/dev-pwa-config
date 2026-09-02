// Les petites demandes écrites dans les apps (GISEMENTS.md, n°10) : un axe de
// taille sur `Badge` (mister-doc), le plein écran en hook (badminton, molkky),
// `cn` (genius, uwh — deux copies identiques).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { setupDom, renderHook } from './helpers/dom.mjs';
import { Badge } from '../react/badge.js';
import { useFullscreen } from '../react/use-fullscreen.js';
import { cn } from '../cn.js';

test('Badge : un axe de taille, md par défaut, xs pour les pastilles d’un calendrier', () => {
  assert.match(renderToStaticMarkup(h(Badge, {}, 'x')), /data-size="md"/);
  assert.match(
    renderToStaticMarkup(h(Badge, { size: 'xs' }, 'x')),
    /data-size="xs"/
  );
  assert.match(
    renderToStaticMarkup(h(Badge, { size: 'sm', tone: 'info' }, 'x')),
    /data-tone="info" data-variant="soft" data-size="sm"/
  );
});

test('useFullscreen : sans API, supported vaut false et les gestes ne lèvent pas', async () => {
  const dom = setupDom();
  try {
    const view = await renderHook(() => useFullscreen());
    assert.equal(view.result.current.supported, false);
    assert.equal(view.result.current.active, false);
    let result;
    await view.act(async () => {
      result = await view.result.current.toggle();
    });
    assert.equal(result, false, 'rien à faire : false, pas une exception');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('useFullscreen : entre, suit fullscreenchange, sort — et encaisse un refus', async () => {
  const dom = setupDom();
  const { document } = globalThis.window;
  const root = document.documentElement;
  let element = null;
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => element,
  });
  const change = () =>
    document.dispatchEvent(new globalThis.window.Event('fullscreenchange'));
  root.requestFullscreen = async () => {
    element = root;
    change();
  };
  document.exitFullscreen = async () => {
    element = null;
    change();
  };
  try {
    const view = await renderHook(() => useFullscreen());
    assert.equal(view.result.current.supported, true);
    assert.equal(view.result.current.active, false);

    let ok;
    await view.act(async () => {
      ok = await view.result.current.toggle();
    });
    assert.equal(ok, true);
    assert.equal(view.result.current.active, true, 'suit fullscreenchange');

    await view.act(async () => {
      ok = await view.result.current.toggle();
    });
    assert.equal(ok, true);
    assert.equal(view.result.current.active, false);

    // Le navigateur refuse (pas de geste utilisateur) : false, état intact.
    root.requestFullscreen = async () => {
      throw new Error('Permissions check failed');
    };
    await view.act(async () => {
      ok = await view.result.current.enter();
    });
    assert.equal(ok, false);
    assert.equal(view.result.current.active, false);
    await view.unmount();
  } finally {
    delete document.fullscreenElement;
    dom.restore();
  }
});

test('cn : chaînes, conditions, tableaux, objets — et rien pour le faux', () => {
  const open = Boolean(process.env);
  const off = !open;
  assert.equal(cn('card', off && 'x', null, undefined, 0, ''), 'card');
  assert.equal(
    cn('card', open && 'card--open', { 'card--busy': open, 'card--off': 0 }),
    'card card--open card--busy'
  );
  assert.equal(cn(['a', ['b', null]], 'c'), 'a b c');
  assert.equal(cn(), '');
  assert.equal(cn(3), '3');
});
