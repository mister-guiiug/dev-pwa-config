// La couche auth au-dessus du port : `AuthProvider` + `useAuthContext`,
// `LoginForm`, `MfaChallenge`. Ce que quatre apps recopiaient entre le port et
// leurs écrans — et ce qu'elles rataient chacune : une action qui lève au lieu
// de rendre, un mode local qui plante, un champ de code sans le bon clavier.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { setupDom, mount } from './helpers/dom.mjs';
import { AuthProvider, useAuthContext } from '../react/auth-provider.js';
import { LoginForm } from '../react/login-form.js';
import { MfaChallenge } from '../react/mfa-challenge.js';
import { LabelsProvider } from '../react/labels.js';

/** Un adaptateur pilotable, comme dans `react-auth.test.mjs`. */
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

/**
 * Saisit dans un champ : poser la valeur suffit. Les formulaires sont NON
 * CONTRÔLÉS et lus par `FormData` — le DOM est la source de vérité, comme
 * pour un gestionnaire de mots de passe qui remplit sans émettre `input`.
 */
function type(input, value) {
  input.value = value;
}

const soumettre = form =>
  form.dispatchEvent(
    new globalThis.window.Event('submit', { bubbles: true, cancelable: true })
  );

/**
 * Monte `AuthProvider` avec une sonde qui lit `useAuthContext` : `renderHook`
 * n'a pas de `wrapper`, et la valeur du contexte n'existe que sous le
 * fournisseur.
 */
async function renderInProvider(props) {
  const result = { current: undefined };
  function Sonde() {
    result.current = useAuthContext();
    return null;
  }
  const view = await mount(h(AuthProvider, props, h(Sonde)));
  return { result, ...view };
}

/* ── AuthProvider ───────────────────────────────────────────────────────── */

test('AuthProvider : signIn passe par l’adaptateur et rend { ok }, la session arrive par l’évènement', async () => {
  const dom = setupDom();
  try {
    const calls = [];
    const { adapter, emit } = fakeAdapter({
      async signInWithPassword(args) {
        calls.push(args);
        return { ok: true, session: { user: { id: 'u1' } }, error: null };
      },
    });
    const view = await renderInProvider({ adapter });
    await view.act(async () => {});
    assert.equal(view.result.current.status, 'signed-out');
    assert.equal(view.result.current.ready, true);

    let result;
    await view.act(async () => {
      result = await view.result.current.signIn('a@b.c', 'secret');
    });
    assert.deepEqual(calls, [{ email: 'a@b.c', password: 'secret' }]);
    assert.equal(result.ok, true);
    // L'action ne pose PAS la session : c'est l'évènement du service qui le
    // fait, comme dans les quatre apps.
    assert.equal(view.result.current.status, 'signed-out');
    await view.act(() => emit('SIGNED_IN', { user: { id: 'u1' } }));
    assert.equal(view.result.current.status, 'signed-in');
    assert.equal(view.result.current.signedIn, true);
    assert.equal(view.result.current.user.id, 'u1');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('AuthProvider : une action qui lève rend { ok: false }, jamais une exception', async () => {
  const dom = setupDom();
  try {
    const { adapter } = fakeAdapter({
      async signInWithPassword() {
        throw new Error('Failed to fetch');
      },
    });
    const view = await renderInProvider({ adapter });
    let result;
    await view.act(async () => {
      result = await view.result.current.signIn('a@b.c', 'x');
    });
    assert.equal(result.ok, false);
    assert.equal(result.error.message, 'Failed to fetch');
    // Une méthode absente de l'adaptateur : même contrat.
    await view.act(async () => {
      result = await view.result.current.signInWithOtp({ email: 'a@b.c' });
    });
    assert.equal(result.error.code, 'unsupported');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('AuthProvider : sans adaptateur, mode local — signed-out, et chaque action le dit', async () => {
  const dom = setupDom();
  try {
    const view = await renderInProvider({});
    assert.equal(view.result.current.status, 'signed-out');
    assert.equal(view.result.current.client, null);
    let result;
    await view.act(async () => {
      result = await view.result.current.signIn('a@b.c', 'x');
    });
    assert.equal(result.error.code, 'local-mode');
    await view.act(() => view.result.current.signOut()); // ne lève pas
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('useAuthContext hors du fournisseur lève : une erreur de câblage, pas un état', async () => {
  const dom = setupDom();
  try {
    let thrown = null;
    function Sonde() {
      try {
        useAuthContext();
      } catch (error) {
        thrown = error;
      }
      return null;
    }
    const view = await mount(h(Sonde));
    assert.match(String(thrown?.message), /AuthProvider/);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

/* ── LoginForm ──────────────────────────────────────────────────────────── */

test('LoginForm : deux champs nommés, autocomplete de gestionnaire de mots de passe, un bouton', () => {
  const html = renderToStaticMarkup(h(LoginForm, {}));
  assert.match(html, /<form data-dwc="login-form" data-mode="signin">/);
  assert.match(html, /<h1 data-dwc="login-form-title">Connexion<\/h1>/);
  assert.match(html, /Adresse e-mail/);
  assert.match(html, /type="email"[^>]*autocomplete="username"/i);
  assert.match(html, /type="password"[^>]*autocomplete="current-password"/i);
  assert.match(html, /type="submit"[^>]*>Se connecter</);
  assert.doesNotMatch(html, /role="alert"/, 'sans erreur, pas d’alerte');

  const signup = renderToStaticMarkup(h(LoginForm, { mode: 'signup' }));
  assert.match(signup, /Créer un compte/);
  assert.match(signup, /autocomplete="new-password"/i);
  assert.match(signup, /minlength="8"/i);
});

test('LoginForm : soumet l’e-mail rogné et le mot de passe, jamais deux fois pendant busy', async () => {
  const dom = setupDom();
  try {
    const received = [];
    const view = await mount(
      h(LoginForm, { onSubmit: values => received.push(values) })
    );
    const form = view.container.querySelector('form');
    const [email, password] = form.querySelectorAll('input');
    await view.act(() => type(email, '  a@b.c '));
    await view.act(() => type(password, 'secret'));
    await view.act(() => soumettre(form));
    assert.deepEqual(received, [{ email: 'a@b.c', password: 'secret' }]);
    await view.unmount();

    const busy = await mount(
      h(LoginForm, { busy: true, onSubmit: values => received.push(values) })
    );
    const form2 = busy.container.querySelector('form');
    assert.match(
      busy.container.querySelector('button[type="submit"]').outerHTML,
      /aria-busy="true"/
    );
    await busy.act(() => soumettre(form2));
    assert.equal(received.length, 1, 'pas de seconde soumission');
    await busy.unmount();
  } finally {
    dom.restore();
  }
});

test('LoginForm : l’erreur est une alerte à part, les emplacements sont à leur place, la langue suit', () => {
  const html = renderToStaticMarkup(
    h(
      LabelsProvider,
      { locale: 'en' },
      h(
        LoginForm,
        {
          error: 'Wrong password',
          footer: h('a', { href: '/forgot' }, 'Forgot?'),
        },
        h('input', { name: 'extra' })
      )
    )
  );
  assert.match(html, /Email address/);
  assert.match(
    html,
    /<p role="alert" data-dwc="login-form-error">Wrong password<\/p>/
  );
  // children avant le bouton, footer après.
  assert.ok(html.indexOf('name="extra"') < html.indexOf('type="submit"'));
  assert.ok(html.indexOf('type="submit"') < html.indexOf('login-form-footer'));
  assert.ok(html.indexOf('login-form-error') < html.indexOf('type="submit"'));
});

/* ── MfaChallenge ───────────────────────────────────────────────────────── */

test('LoginForm mode otp : un seul champ, un bouton qui parle de lien, et un mot de passe vide à la soumission', async () => {
  const html = renderToStaticMarkup(h(LoginForm, { mode: 'otp' }));
  assert.match(html, /<form data-dwc="login-form" data-mode="otp">/);
  assert.match(html, /Recevoir un lien de connexion<\/h1>/);
  assert.doesNotMatch(
    html,
    /type="password"/,
    'aucun mot de passe, nulle part'
  );
  // Sans mot de passe à apparier, `email` est le bon indice pour le
  // gestionnaire — `username` désigne la moitié d'un couple qui n'existe pas.
  assert.match(html, /type="email"[^>]*autocomplete="email"/i);
  assert.match(html, /type="submit"[^>]*>Recevoir un lien</);

  const en = renderToStaticMarkup(
    h(LabelsProvider, { locale: 'en' }, h(LoginForm, { mode: 'otp' }))
  );
  assert.match(en, /Sign in with a link/);
  assert.match(en, /Send me a link/);

  const dom = setupDom();
  try {
    const received = [];
    const view = await mount(
      h(LoginForm, { mode: 'otp', onSubmit: values => received.push(values) })
    );
    const form = view.container.querySelector('form');
    await view.act(() => type(form.querySelector('input'), ' lien@b.c '));
    await view.act(() => soumettre(form));
    // Le TYPE ne change pas : `password` est là, vide. L'appelant fait
    // `signInWithOtp` et n'a rien à réapprendre.
    assert.deepEqual(received, [{ email: 'lien@b.c', password: '' }]);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('MfaChallenge : le clavier numérique, le code reçu proposé, et la vérification', async () => {
  const dom = setupDom();
  try {
    const verified = [];
    const view = await mount(
      h(MfaChallenge, { onVerify: code => verified.push(code) })
    );
    const input = view.container.querySelector('input');
    assert.equal(input.getAttribute('inputmode'), 'numeric');
    assert.equal(input.getAttribute('autocomplete'), 'one-time-code');
    assert.equal(input.getAttribute('minlength'), '6');
    assert.match(view.container.innerHTML, /Vérification en deux étapes/);
    assert.doesNotMatch(
      view.container.innerHTML,
      /data-action="switch"|data-action="sign-out"/,
      'sans onRecover ni onSignOut, pas de bouton en trop'
    );
    await view.act(() => type(input, ' 123456 '));
    await view.act(() => soumettre(view.container.querySelector('form')));
    assert.deepEqual(verified, ['123456']);
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('MfaChallenge : la voie de secours et la déconnexion n’existent que si l’appelant les donne', async () => {
  const dom = setupDom();
  try {
    const recovered = [];
    let signedOut = 0;
    const view = await mount(
      h(MfaChallenge, {
        onVerify() {},
        onRecover: code => recovered.push(code),
        onSignOut: () => signedOut++,
      })
    );
    const switcher = view.container.querySelector('[data-action="switch"]');
    assert.match(switcher.textContent, /code de secours/);
    await view.act(() => switcher.click());
    const form = view.container.querySelector('form');
    assert.equal(form.getAttribute('data-mode'), 'recovery');
    const input = form.querySelector('input');
    assert.equal(input.getAttribute('inputmode'), 'text');
    assert.equal(input.getAttribute('minlength'), '8');
    await view.act(() => type(input, 'ABCD-EFGH'));
    await view.act(() => soumettre(form));
    assert.deepEqual(recovered, ['ABCD-EFGH']);

    await view.act(() =>
      view.container.querySelector('[data-action="sign-out"]').click()
    );
    assert.equal(signedOut, 1);
    await view.unmount();
  } finally {
    dom.restore();
  }
});
