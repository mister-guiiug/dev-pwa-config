// `react/use-auth` + `react/auth-gate`, dans un vrai DOM : le raccord
// `useSyncExternalStore` et l'aiguillage de la garde — la partie que uwh et
// lookhouse avaient dupliquée.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import { setupDom, mount, renderHook } from './helpers/dom.mjs';
import { createAuthClient } from '../auth/index.js';
import { useAuth } from '../react/use-auth.js';
import { AuthGate } from '../react/auth-gate.js';

/** Un adaptateur pilotable, comme dans `auth.test.mjs`. */
function fakeAdapter(overrides = {}) {
  const callbacks = new Set();
  return {
    adapter: {
      getSession: async () => null,
      onAuthStateChange(callback) {
        callbacks.add(callback);
        return () => callbacks.delete(callback);
      },
      ...overrides,
    },
    emit(event, session) {
      for (const callback of callbacks) callback(event, session);
    },
  };
}

test('useAuth : démarre le client et suit connexion puis déconnexion', async () => {
  const dom = setupDom();
  try {
    const { adapter, emit } = fakeAdapter();
    const client = createAuthClient({ adapter });
    const view = await renderHook(() => useAuth(client));

    // L'effet a démarré le client : la lecture initiale (null) est passée.
    await view.act(async () => {});
    assert.equal(view.result.current.status, 'signed-out');

    const session = { user: { id: 'u1' } };
    await view.act(() => emit('SIGNED_IN', session));
    assert.equal(view.result.current.status, 'signed-in');
    assert.equal(view.result.current.user, session.user);

    await view.act(() => emit('SIGNED_OUT', null));
    assert.equal(view.result.current.status, 'signed-out');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('useAuth : deux composants, un client — même état, sans Provider', async () => {
  const dom = setupDom();
  try {
    const { adapter, emit } = fakeAdapter();
    const client = createAuthClient({ adapter });
    const a = await renderHook(() => useAuth(client));
    const b = await renderHook(() => useAuth(client));

    await a.act(() => emit('SIGNED_IN', { user: { id: 'u1' } }));
    assert.equal(a.result.current.status, 'signed-in');
    assert.equal(
      b.result.current,
      a.result.current,
      'le même instantané, à l’identique'
    );
    await a.unmount();
    await b.unmount();
  } finally {
    dom.restore();
  }
});

test('useAuth : sans client (mode local), figé `signed-out` — jamais bloquant', async () => {
  const dom = setupDom();
  try {
    const view = await renderHook(() => useAuth(null));
    assert.equal(view.result.current.status, 'signed-out');
    assert.equal(view.result.current.session, null);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('AuthGate : chargement → connexion → défi MFA → application', async () => {
  const dom = setupDom();
  try {
    let level = false;
    const session = { user: { id: 'u1' } };
    const { adapter, emit } = fakeAdapter({
      mfaRequired: async () => level,
    });
    const client = createAuthClient({ adapter });

    const gate = () =>
      h(AuthGate, {
        client,
        loading: h('p', null, 'chargement'),
        fallback: h('p', null, 'connexion'),
        mfa: h('p', null, 'défi'),
        children: h('p', null, 'application'),
      });

    const view = await mount(gate());
    // La lecture initiale (rapide) est déjà passée : pas de session.
    await view.act(async () => {});
    assert.equal(view.container.textContent, 'connexion');

    level = true;
    await view.act(() => emit('SIGNED_IN', session));
    assert.equal(view.container.textContent, 'défi');

    level = false;
    await view.act(() => emit('MFA_CHALLENGE_VERIFIED', session));
    assert.equal(view.container.textContent, 'application');

    await view.act(() => emit('SIGNED_OUT', null));
    assert.equal(view.container.textContent, 'connexion');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('AuthGate : sans `mfa`, needs-mfa retombe sur l’écran de connexion', async () => {
  // Fail-closed : tant que l'étape TOTP n'est pas franchie, on ne montre
  // pas l'application (doc et uwh bloquent pareil).
  const dom = setupDom();
  try {
    const { adapter, emit } = fakeAdapter({ mfaRequired: async () => true });
    const client = createAuthClient({ adapter });
    const view = await mount(
      h(AuthGate, {
        client,
        fallback: h('p', null, 'connexion'),
        children: h('p', null, 'application'),
      })
    );
    await view.act(async () => {});
    await view.act(() => emit('SIGNED_IN', { user: { id: 'u1' } }));
    assert.equal(view.container.textContent, 'connexion');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('AuthGate : `bypass` laisse passer sans client — le mode local', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(AuthGate, {
        bypass: true,
        fallback: h('p', null, 'connexion'),
        children: h('p', null, 'application'),
      })
    );
    assert.equal(view.container.textContent, 'application');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('AuthGate : l’état `loading` s’affiche tant que la session se lit', async () => {
  const dom = setupDom();
  try {
    let release;
    const lente = new Promise(resolve => {
      release = resolve;
    });
    const { adapter } = fakeAdapter({ getSession: () => lente });
    const client = createAuthClient({ adapter });
    const view = await mount(
      h(AuthGate, {
        client,
        loading: h('p', null, 'chargement'),
        fallback: h('p', null, 'connexion'),
        children: h('p', null, 'application'),
      })
    );
    assert.equal(view.container.textContent, 'chargement');
    await view.act(() => release(null));
    assert.equal(view.container.textContent, 'connexion');
    await view.unmount();
  } finally {
    dom.restore();
  }
});
