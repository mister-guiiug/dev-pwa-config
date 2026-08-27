/**
 * Préchargement des routes découpées : charger le morceau AVANT le clic.
 *
 * BESOIN CONSTATÉ, CODE ABSENT — et c'est écrit ici plutôt que maquillé en
 * promotion. Les dix-sept apps découpent toutes leurs routes en `lazy(() =>
 * import(…))` ; AUCUNE ne préchauffe le morceau. Résultat : le premier clic sur
 * « Carte » ou « Profil » ouvre une requête réseau, puis un `Suspense` — sur un
 * téléphone en 4G moyenne, deux à cinq cents millisecondes d'écran vide, à
 * chaque route, à chaque visite.
 *
 * CE QUE LE PRÉCACHE NE FAIT PAS. Le service worker précache bien tous les
 * morceaux (`globPatterns` dans `vite-pwa`) — mais seulement à partir de la
 * DEUXIÈME visite, une fois le worker installé et le précache terminé. La
 * première visite, celle qui décide si l'utilisateur revient, n'en profite pas.
 * C'est exactement le trou que ce module comble.
 *
 * POURQUOI PAS `navigationPreload`. On aurait pu l'activer côté workbox : ça
 * n'aurait rien apporté. La préconnexion de navigation n'accélère que les
 * navigations servies par le RÉSEAU ; ces apps répondent aux navigations par
 * `navigateFallback` sur un `index.html` PRÉCACHÉ, sans toucher au réseau. On
 * aurait payé une requête inutile à chaque navigation pour en jeter la réponse.
 * Un réglage qui a l'air d'une optimisation n'en est pas une.
 *
 * SUR L'INTENTION, PAS AU CHARGEMENT. Tout précharger au démarrage annule le
 * découpage : autant livrer un seul paquet. On précharge quand l'utilisateur
 * MONTRE son intention — le pointeur entre dans le lien, le lien prend le
 * focus, le doigt s'y pose — c'est-à-dire quelques dizaines à quelques
 * centaines de millisecondes avant le clic. Assez pour effacer l'attente,
 * rarement pour rien.
 *
 * ON NE DÉPENSE PAS LE FORFAIT DES AUTRES. `saveData` et les connexions `2g`
 * coupent le préchargement : télécharger d'avance ce qui ne sera peut-être
 * jamais ouvert est un service quand la donnée est gratuite, une facture quand
 * elle ne l'est pas.
 *
 * SANS REACT. Le hook `react/use-prefetch` n'est qu'une enveloppe.
 */

/** Les chargeurs déjà lancés : un morceau ne se télécharge qu'une fois. */
const started = new WeakSet();

/**
 * Faut-il précharger dans ce contexte ?
 *
 * `false` quand l'utilisateur a demandé d'économiser les données, ou quand la
 * connexion est assez lente pour que le préchargement vole de la bande passante
 * à ce qui est réellement affiché.
 */
export function shouldPrefetch(connection = globalThis.navigator?.connection) {
  if (!connection) return true;
  if (connection.saveData === true) return false;
  return !/(^|\W)(slow-)?2g$/.test(String(connection.effectiveType ?? ''));
}

/**
 * Lance un chargeur, une seule fois, sans jamais laisser échapper d'erreur.
 *
 * UN ÉCHEC DE PRÉCHARGEMENT N'EST PAS UN ÉCHEC. Le réseau tombe, le morceau
 * n'arrive pas : l'utilisateur cliquera, et `lazy()` retentera pour de vrai,
 * avec son `Suspense` et sa frontière d'erreur. Une promesse rejetée ici
 * remonterait en `unhandledrejection` et polluerait le rapport d'erreurs d'un
 * incident qui n'en est pas un.
 *
 * @param {() => Promise<unknown>} loader
 * @returns {boolean} `true` si l'appel a bien été déclenché maintenant.
 */
export function prefetch(loader) {
  if (typeof loader !== 'function') return false;
  if (started.has(loader)) return false;
  if (!shouldPrefetch()) return false;
  started.add(loader);
  try {
    Promise.resolve(loader()).catch(() => {});
  } catch {
    /* un chargeur qui lève à l'appel : rien de plus à tenter */
  }
  return true;
}

/** `true` si ce chargeur a déjà été déclenché (tests, journaux). */
export function isPrefetched(loader) {
  return started.has(loader);
}

/** Les évènements qui trahissent l'intention de cliquer, par ordre d'arrivée. */
export const INTENT_EVENTS = ['pointerenter', 'focus', 'touchstart'];

/**
 * Précharge quand l'utilisateur approche de l'élément.
 *
 * `focus` autant que `pointerenter` : la navigation au clavier mérite le même
 * confort que la souris, et c'est le genre de détail qu'on oublie quand on ne
 * teste qu'à la souris.
 *
 * @returns {() => void} Le désabonnement.
 */
export function prefetchOnIntent(element, loader, options = {}) {
  if (!element?.addEventListener) return () => {};
  const events = options.events ?? INTENT_EVENTS;
  const fire = () => {
    if (prefetch(loader)) stop();
  };
  const stop = () => {
    for (const name of events) element.removeEventListener(name, fire);
  };
  for (const name of events) {
    // `passive` : ces écouteurs ne préviennent jamais le défilement, et
    // `touchstart` non passif le bloque le temps du gestionnaire.
    element.addEventListener(name, fire, { passive: true });
  }
  return stop;
}

/**
 * Précharge quand l'élément approche de l'écran — pour ce qui se voit avant
 * d'être survolé, comme une carte au fond d'une liste.
 *
 * @returns {() => void} Le désabonnement.
 */
export function prefetchWhenVisible(element, loader, options = {}) {
  const Observer = globalThis.IntersectionObserver;
  // Sans observateur (jsdom, navigateur ancien), on ne précharge pas : mieux
  // vaut ne rien faire que tout charger d'un coup en guise de repli.
  if (!element || !Observer) return () => {};
  const observer = new Observer(
    entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        prefetch(loader);
        observer.disconnect();
      }
    },
    { rootMargin: options.rootMargin ?? '200px' }
  );
  observer.observe(element);
  return () => observer.disconnect();
}

/**
 * Précharge quand le navigateur n'a rien de mieux à faire.
 *
 * Pour les routes qu'on sait probables sans savoir quand — le « Profil » d'une
 * app à cinq onglets. `requestIdleCallback` n'existe pas sur Safari : le repli
 * est un `setTimeout` généreux, pas un appel immédiat, qui reviendrait à tout
 * charger au démarrage.
 *
 * @returns {() => void} L'annulation.
 */
export function prefetchWhenIdle(loader, options = {}) {
  const timeout = options.timeout ?? 2000;
  const idle = globalThis.requestIdleCallback;
  if (typeof idle === 'function') {
    const handle = idle(() => prefetch(loader), { timeout });
    return () => globalThis.cancelIdleCallback?.(handle);
  }
  const timer = setTimeout(() => prefetch(loader), timeout);
  return () => clearTimeout(timer);
}
