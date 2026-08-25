/**
 * Les cinq façades — observabilité, thèmes, mise à jour, icônes, Rive.
 *
 * Chaque test verrouille soit une répétition supprimée, soit un défaut que la
 * montée en abstraction referme. Deux d'entre eux corrigent un défaut que le
 * paquet avait INTRODUIT lui-même : deux écrivains de `data-theme`, et un
 * journal d'erreurs qui écrivait le contexte sans le masquer.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement as h } from 'react';

import { setupDom, mount, renderHook } from './helpers/dom.mjs';
import {
  installObservability,
  recordError,
  getErrorLog,
  clearErrorLog,
  setRedactKeys,
} from '../react/observability.js';
import { ObservabilityBoundary } from '../react/error-boundary.js';
import { ThemeProvider, useThemeContext } from '../react/theme-provider.js';
import { ThemeToggle } from '../react/theme-toggle.js';
import {
  AppUpdates,
  parseInterval,
  useAppUpdates,
} from '../react/app-updates.js';
import { IconsProvider, Icon, useIcon } from '../react/icons-context.js';
import { themeBootSource, themeBootScript } from '../theme-boot.js';

/* ── Observabilité ──────────────────────────────────────────────────────── */

test('le contexte d’une erreur est masqué AVANT d’entrer dans localStorage', () => {
  // LE DÉFAUT REFERMÉ. Ce journal vit dans `localStorage`, lisible par tout
  // script de la page. `redact` avait été écrit POUR ce cas — son propre
  // commentaire le dit — et n'y était pas branché.
  const dom = setupDom();
  try {
    clearErrorLog();
    setRedactKeys(['matricule']);
    recordError(new Error('zut'), {
      email: 'a@b.fr',
      token: 'secret',
      matricule: 'X1',
      ecran: 'reglages',
    });
    const [entry] = getErrorLog();
    assert.equal(entry.context.email, '[masqué]');
    assert.equal(entry.context.token, '[masqué]');
    assert.equal(entry.context.matricule, '[masqué]', 'clé propre à l’app');
    assert.equal(
      entry.context.ecran,
      'reglages',
      'un champ anodin doit survivre'
    );

    // Et le stockage lui-même ne contient pas la valeur en clair.
    const brut = globalThis.localStorage.getItem('dwc_error_log');
    assert.doesNotMatch(brut, /a@b\.fr/);
    assert.doesNotMatch(brut, /secret/);
    setRedactKeys([]);
  } finally {
    dom.restore();
  }
});

test('installObservability remplace les deux lignes que treize apps recopient', async () => {
  const dom = setupDom();
  try {
    clearErrorLog();
    const vus = [];
    const faux = {
      onTTFB: fn => fn({ name: 'TTFB', value: 10, id: 't', rating: 'good' }),
      onFCP: fn => fn({ name: 'FCP', value: 20, id: 'f', rating: 'good' }),
      onLCP: fn => fn({ name: 'LCP', value: 30, id: 'l', rating: 'good' }),
      onCLS: fn => fn({ name: 'CLS', value: 0, id: 'c', rating: 'good' }),
      // onINP absent : le cas `onFID` de la v4, transposé.
    };
    const { sentry, vitals } = await installObservability({
      webVitals: { loader: () => Promise.resolve(faux) },
      onMetric: m => vus.push(m.name),
    });
    assert.equal(sentry, null, 'sans dsn, Sentry ne doit jamais être importé');
    assert.deepEqual(vitals, ['TTFB', 'FCP', 'LCP', 'CLS']);
    assert.deepEqual(vus, ['TTFB', 'FCP', 'LCP', 'CLS']);

    // La métrique manquante est ENREGISTRÉE, pas murmurée dans une console.
    const inp = getErrorLog().find(e => e.context?.metric === 'INP');
    assert.ok(inp, 'la métrique absente n’a pas été journalisée');
    assert.match(inp.message, /onINP/);
  } finally {
    dom.restore();
  }
});

test('ObservabilityBoundary journalise sans qu’on ait à la brancher', async () => {
  const dom = setupDom();
  const erreurs = [];
  const sauve = console.error;
  console.error = (...a) => erreurs.push(a);
  try {
    clearErrorLog();
    function Casse() {
      throw new Error('rendu impossible');
    }
    const view = await mount(
      h(ObservabilityBoundary, { context: { ecran: 'accueil' } }, h(Casse))
    );
    const entry = getErrorLog().at(-1);
    assert.equal(entry.message, 'rendu impossible');
    assert.equal(entry.context.source, 'error-boundary');
    assert.equal(entry.context.ecran, 'accueil');
    // La frontière rend quand même son repli.
    assert.match(view.container.textContent, /erreur/i);
    await view.unmount();
  } finally {
    console.error = sauve;
    dom.restore();
  }
});

/* ── Thèmes ─────────────────────────────────────────────────────────────── */

test('sous ThemeProvider, il n’y a plus qu’un écrivain de data-theme', async () => {
  // LE DÉFAUT REFERMÉ, et il venait du paquet : `ThemeToggle` appelait
  // `useTheme()` pour son compte. Une app qui l'appelle aussi avait deux
  // instances écrivant `data-theme` — le piège que le catalogue documente.
  const dom = setupDom();
  try {
    let vuDepuisLApp;
    function Sonde() {
      vuDepuisLApp = useThemeContext();
      return h(ThemeToggle, {});
    }
    const view = await mount(
      h(ThemeProvider, { appId: 'miss-genius' }, h(Sonde))
    );
    const bouton = view.container.querySelector('[data-dwc="theme-toggle"]');
    await view.act(() => bouton.click());

    // Un seul état : ce que voit l'app est ce qu'affiche la bascule.
    assert.equal(vuDepuisLApp.theme, 'light');
    assert.equal(bouton.dataset.themeState, 'light');
    assert.equal(document.documentElement.dataset.theme, 'light');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('la palette du catalogue peint les variables du contrat', async () => {
  const dom = setupDom();
  try {
    const view = await mount(
      h(ThemeProvider, { appId: 'miss-genius' }, h('p', {}, 'x'))
    );
    const root = document.documentElement;
    // Palette claire de miss-genius, résolue par défaut hors préférence sombre.
    assert.equal(root.style.getPropertyValue('--dwc-primary'), '#6d28d9');
    assert.equal(root.style.getPropertyValue('--dwc-surface'), '#ffffff');
    assert.equal(root.style.getPropertyValue('--dwc-radius'), '1.25rem');
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('sans appId, le fournisseur ne peint rien', async () => {
  const dom = setupDom();
  try {
    const view = await mount(h(ThemeProvider, {}, h('p', {}, 'x')));
    assert.equal(
      document.documentElement.style.getPropertyValue('--dwc-primary'),
      ''
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('le script anti-FOUC applique le thème stocké, et survit à un stockage refusé', () => {
  const dom = setupDom();
  try {
    globalThis.localStorage.setItem('dwc_theme', 'dark');
    // Le script est exécuté tel qu'il sera injecté : c'est le seul moyen de
    // vérifier qu'il fait ce que `useTheme` fera ensuite.
    globalThis.window.eval(themeBootSource());
    assert.equal(document.documentElement.getAttribute('data-theme'), 'dark');
    assert.equal(document.documentElement.style.colorScheme, 'dark');
  } finally {
    dom.restore();
  }
});

test('le script est injectable tel quel, et échappe la clé', () => {
  assert.match(themeBootScript(), /^<script>.*<\/script>$/s);
  // Une clé avec une apostrophe ne doit pas pouvoir refermer la chaîne.
  assert.match(themeBootSource({ storageKey: "a'b" }), /"a'b"/);
  assert.match(themeBootSource({ attribute: 'class' }), /classList\.toggle/);
});

/* ── Mise à jour ────────────────────────────────────────────────────────── */

test('parseInterval lit les durées écrites, et refuse le reste', () => {
  assert.equal(parseInterval('1h'), 3_600_000);
  assert.equal(parseInterval('30m'), 1_800_000);
  assert.equal(parseInterval('45s'), 45_000);
  assert.equal(parseInterval(5000), 5000);
  assert.equal(parseInterval('nawak'), 0);
  assert.equal(parseInterval(undefined), 0);
});

test('AppUpdates vérifie périodiquement, et arrête au démontage', async () => {
  // PROMU DE mister-qowa, seule app à le faire. Sans ça, une PWA installée
  // ouverte plusieurs jours ne découvre rien avant un démarrage à froid.
  const dom = setupDom();
  let checks = 0;
  Object.defineProperty(globalThis.navigator, 'serviceWorker', {
    value: {
      addEventListener() {},
      removeEventListener() {},
      getRegistration: () =>
        Promise.resolve({
          update: () => {
            checks += 1;
            return Promise.resolve();
          },
        }),
    },
    configurable: true,
  });
  try {
    const view = await mount(
      h(AppUpdates, { checkEvery: 30, banner: false }, h('p', {}, 'app'))
    );
    await view.act(() => new Promise(r => setTimeout(r, 110)));
    assert.ok(checks >= 2, `vérifications attendues, obtenu ${checks}`);
    await view.unmount();
    const apres = checks;
    await new Promise(r => setTimeout(r, 90));
    assert.equal(checks, apres, 'la minuterie a survécu au démontage');
  } finally {
    dom.restore();
  }
});

test('le bouton partage l’état du fournisseur, et reste autonome sans lui', async () => {
  const dom = setupDom();
  try {
    let sous;
    function Sonde() {
      sous = useAppUpdates();
      return null;
    }
    const view = await mount(h(AppUpdates, { banner: false }, h(Sonde)));
    assert.ok(sous, 'aucun état partagé sous le fournisseur');
    assert.equal(typeof sous.forceUpdate, 'function');
    await view.unmount();

    const seul = await renderHook(() => useAppUpdates());
    assert.equal(seul.result.current, null, 'hors fournisseur : null');
    await seul.unmount();
  } finally {
    dom.restore();
  }
});

/* ── Icônes ─────────────────────────────────────────────────────────────── */

test('le paquet demande un rôle ; l’app fournit le dessin', async () => {
  const dom = setupDom();
  try {
    const Croix = () => h('span', { 'data-app-icon': 'x' }, '×');
    const view = await mount(
      h(IconsProvider, { icons: { close: Croix } }, h(Icon, { role: 'close' }))
    );
    assert.ok(view.container.querySelector('[data-app-icon="x"]'));
    await view.unmount();

    // Hors fournisseur : le SVG maison, comme avant.
    const repli = await mount(h(Icon, { role: 'close' }));
    assert.ok(repli.container.querySelector('svg'));
    await repli.unmount();
  } finally {
    dom.restore();
  }
});

test('fournir un seul rôle ne fait pas perdre les autres', async () => {
  const dom = setupDom();
  try {
    const Croix = () => h('span', { 'data-app-icon': 'x' }, '×');
    let soleil;
    function Sonde() {
      soleil = useIcon('light');
      return h(Icon, { role: 'light' });
    }
    const view = await mount(
      h(IconsProvider, { icons: { close: Croix } }, h(Sonde))
    );
    assert.ok(soleil, 'le rôle non fourni a perdu son repli');
    assert.ok(view.container.querySelector('svg'));
    await view.unmount();
  } finally {
    dom.restore();
  }
});

test('les composants du paquet passent par les rôles', async () => {
  const dom = setupDom();
  try {
    const { Sheet } = await import('../react/sheet.js');
    const Croix = () => h('span', { 'data-app-icon': 'x' }, '×');
    const view = await mount(
      h(
        IconsProvider,
        { icons: { close: Croix } },
        h(Sheet, { open: true, title: 'T', onClose() {} }, h('p', {}, 'c'))
      )
    );
    assert.ok(
      view.container.querySelector(
        '[data-dwc="sheet-close"] [data-app-icon="x"]'
      ),
      'la feuille dessine encore sa propre croix'
    );
    await view.unmount();
  } finally {
    dom.restore();
  }
});

/* ── Rive ───────────────────────────────────────────────────────────────── */

test('le runtime Rive s’injecte, et le lazy est mémorisé par loader', async () => {
  // miss-genius utilise `@rive-app/react-webgl2`, que ce module ne connaissait
  // pas : elle a donc écrit son propre lecteur. Adoption : zéro sur trois.
  const dom = setupDom();
  try {
    let charges = 0;
    const loader = () => {
      charges += 1;
      return Promise.resolve({ Rive: () => h('canvas', { 'data-rive': '1' }) });
    };
    const { RiveAnimation } = await import('../react/rive.js');
    const view = await mount(
      h(RiveAnimation, { src: 'a.riv', ariaLabel: 'Animation', loader })
    );
    await view.act(() => new Promise(r => setTimeout(r, 20)));
    assert.ok(view.container.querySelector('[data-rive="1"]'));
    assert.equal(
      view.container.querySelector('[role="img"]').getAttribute('aria-label'),
      'Animation'
    );

    // Un second montage avec LE MÊME loader ne recharge pas le runtime :
    // recréer `lazy()` à chaque rendu rechargerait le WASM.
    const second = await mount(h(RiveAnimation, { src: 'b.riv', loader }));
    await second.act(() => new Promise(r => setTimeout(r, 20)));
    assert.equal(charges, 1, `runtime chargé ${charges} fois`);
    await second.unmount();
    await view.unmount();
  } finally {
    dom.restore();
  }
});
