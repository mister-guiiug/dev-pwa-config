/**
 * Environnement DOM minimal pour tester les hooks et les comportements
 * interactifs des composants avec `node --test`.
 *
 * POURQUOI. La suite existante rend les composants avec `renderToStaticMarkup` :
 * aucun effet React ne s'exécute. Tout ce que le paquet promet et que les copies
 * locales ratent — piège de focus, restitution du focus, verrou du scroll,
 * rejeu d'une file hors-ligne — vivait donc dans du code non testé. C'est
 * précisément là qu'on a trouvé une perte d'écriture.
 *
 * Pas de framework de test supplémentaire : `jsdom` pose les globales, `act()`
 * (React 19, exporté depuis `react`) vide les effets, et `createRoot` monte.
 *
 *   const dom = setupDom();
 *   const view = await mount(h(MonComposant, {}));
 *   await view.act(() => view.container.querySelector('button').click());
 *   await view.unmount();
 *   dom.restore();
 */
import { JSDOM } from 'jsdom';
import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';

const GLOBALS = [
  'window',
  'document',
  'navigator',
  // Sans `location`, tout module qui lit l'URL courante est intestable : c'est
  // ce qui manquait à `sw-update.js`, dont la destination anti-cache en dépend.
  'location',
  'localStorage',
  'HTMLElement',
  'Element',
  'Node',
  'Event',
  'CustomEvent',
  'KeyboardEvent',
  'MouseEvent',
  'getComputedStyle',
];

/**
 * Installe un DOM jsdom dans les globales et renvoie de quoi le retirer.
 *
 * `matchMedia` n'existe pas dans jsdom : on en pose une implémentation
 * pilotable (`setMediaQuery`) qui notifie ses abonnés, sans quoi `useTheme` et
 * `useMediaQuery` ne seraient pas testables.
 *
 * `userAgent` et `maxTouchPoints` sont REDÉFINIS sur le navigateur de jsdom,
 * pas passés à son constructeur : jsdom 30 ignore l'option `userAgent` de ses
 * versions précédentes — elle est acceptée sans effet, ce qui est le pire des
 * cas. C'est le même geste que pour `navigator.onLine` ci-dessous. Sans eux,
 * rien de ce qui dépend du navigateur n'est testable : l'invite d'installation
 * n'existe pas sur iOS, et seul l'agent utilisateur le dit.
 *
 * @param {{ url?: string, online?: boolean, userAgent?: string,
 *   maxTouchPoints?: number }} [options]
 */
export function setupDom(options = {}) {
  const { url = 'https://exemple.test/', online = true, userAgent } = options;
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url,
    pretendToBeVisual: true,
  });
  if (userAgent !== undefined) {
    Object.defineProperty(dom.window.navigator, 'userAgent', {
      get: () => userAgent,
      configurable: true,
    });
  }
  if (options.maxTouchPoints !== undefined) {
    Object.defineProperty(dom.window.navigator, 'maxTouchPoints', {
      value: options.maxTouchPoints,
      configurable: true,
    });
  }

  const saved = new Map();
  for (const name of GLOBALS) {
    saved.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
    Object.defineProperty(globalThis, name, {
      value: dom.window[name] ?? dom.window,
      configurable: true,
      writable: true,
    });
  }
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;

  // `navigator.onLine` n'est pas modifiable dans jsdom : on redéfinit la
  // propriété pour pouvoir simuler la perte et le retour du réseau.
  let isOnline = online;
  Object.defineProperty(dom.window.navigator, 'onLine', {
    get: () => isOnline,
    configurable: true,
  });

  /** @type {Map<string, { matches: boolean, listeners: Set<Function> }>} */
  const media = new Map();
  const queryState = query => {
    if (!media.has(query))
      media.set(query, { matches: false, listeners: new Set() });
    return media.get(query);
  };
  dom.window.matchMedia = query => {
    const state = queryState(query);
    return {
      media: query,
      get matches() {
        return state.matches;
      },
      addEventListener: (_type, fn) => state.listeners.add(fn),
      removeEventListener: (_type, fn) => state.listeners.delete(fn),
      addListener: fn => state.listeners.add(fn),
      removeListener: fn => state.listeners.delete(fn),
      dispatchEvent: () => false,
      onchange: null,
    };
  };

  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  return {
    window: dom.window,
    /** Bascule une media query et notifie les abonnés. */
    setMediaQuery(query, matches) {
      const state = queryState(query);
      state.matches = matches;
      for (const fn of state.listeners) fn({ matches });
    },
    /** Simule le passage en ligne / hors ligne. */
    setOnline(value) {
      isOnline = value;
      dom.window.dispatchEvent(
        new dom.window.Event(value ? 'online' : 'offline')
      );
    },
    restore() {
      dom.window.close();
      for (const [name, descriptor] of saved) {
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else delete globalThis[name];
      }
      delete globalThis.IS_REACT_ACT_ENVIRONMENT;
    },
  };
}

/** Monte un élément React dans un conteneur détaché et vide les effets. */
export async function mount(element) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(async () => {
    root.render(element);
  });
  return {
    container,
    /** Rejoue le rendu avec un nouvel élément. */
    async rerender(next) {
      await act(async () => {
        root.render(next);
      });
    },
    /** Exécute une interaction puis vide les effets et les microtâches. */
    async act(fn) {
      await act(async () => {
        await fn?.();
      });
    },
    async unmount() {
      await act(async () => {
        root.unmount();
      });
      container.remove();
    },
  };
}

/** Rend un hook seul, et expose sa dernière valeur de retour dans `result`. */
export async function renderHook(useHook) {
  const result = { current: undefined };
  function Probe() {
    result.current = useHook();
    return null;
  }
  const view = await mount(createElement(Probe));
  return { result, ...view };
}
