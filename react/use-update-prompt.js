import { useCallback, useEffect, useRef, useState } from 'react';
import { applyUpdate } from '../sw-update.js';

/**
 * Mise à jour du service worker : état du bandeau, report, application.
 *
 * CE QUI CHANGE. Le hook importait `virtual:pwa-register/react` en dur. Ce
 * module virtuel n'existe QUE dans un build Vite avec vite-plugin-pwa : le
 * sous-chemin était donc inimportable ailleurs — hors du barrel, hors du
 * balayage de résolution de la CI, intestable. `registerSW` est désormais
 * **injecté** :
 *
 *   import { registerSW } from 'virtual:pwa-register';
 *   const update = useUpdatePrompt({ registerSW });
 *
 * Sans injection, le hook fonctionne quand même : `needRefresh` reste faux,
 * mais `update()` et `forceUpdate()` restent utilisables — c'est exactement le
 * bouton « Forcer la mise à jour » que six apps portent dans leurs réglages,
 * lequel n'a jamais eu besoin de `registerSW`.
 *
 * POURQUOI `registerSW` ET PAS `useRegisterSW`. Un hook ne s'appelle pas
 * conditionnellement : injecter `useRegisterSW` obligerait à l'appeler toujours.
 * `useRegisterSW` n'est de toute façon qu'une enveloppe React autour de
 * `registerSW` ; le relevé montre les deux formes en usage (cinq apps
 * `registerSW`, six `useRegisterSW`), et la forme impérative les couvre toutes.
 *
 * UN SEUL ENREGISTREMENT. `registerSW` pose des écouteurs : l'appeler deux fois
 * les double. Le hook mémorise la connexion PAR fonction injectée, ce qui
 * neutralise aussi le double effet de `StrictMode`.
 *
 * LES RAPPELS D'ENREGISTREMENT SONT TRANSMIS. `connect()` ne passait que
 * `immediate`, `onNeedRefresh` et `onOfflineReady` : les trois autres rappels
 * de vite-plugin-pwa étaient AVALÉS. Deux apps ont dû enrober `registerSW`
 * dans une constante de module pour les récupérer — `mister-doc` sa
 * journalisation d'échec d'enregistrement (sans elle, une panne
 * d'enregistrement est indiscernable d'une app à jour), `mister-qowa` sa
 * revérification horaire via `onRegisteredSW` ; `mister-cim10` posait
 * `onRegistered` et `onRegisterError` hors de React, faute de pouvoir les
 * donner au hook. `onRegisterError`, `onRegisteredSW` et `onRegistered` sont
 * désormais des options.
 *
 * Ce sont les rappels du PREMIER crochet connecté qui font foi — même règle
 * que `registerSW`, qui n'est appelé qu'une fois. Ils sont lus par
 * l'intermédiaire d'une référence, donc toujours dans leur version du dernier
 * rendu : une app peut les écrire en ligne sans ré-enregistrer quoi que ce
 * soit.
 */

/** @type {WeakMap<Function, { updateSW?: Function, needRefresh: boolean, offlineReady: boolean, listeners: Set<Function>, handlers: { current: object } }>} */
const CONNECTIONS = new WeakMap();

/**
 * @param {Function} registerSW
 * @param {{ current: { onRegisterError?: Function, onRegisteredSW?: Function, onRegistered?: Function, onNeedReload?: Function } }} handlers
 */
function connect(registerSW, handlers) {
  const existing = CONNECTIONS.get(registerSW);
  if (existing) return existing;

  const connection = {
    updateSW: undefined,
    needRefresh: false,
    offlineReady: false,
    listeners: new Set(),
    handlers,
  };
  CONNECTIONS.set(registerSW, connection);

  const notify = () => {
    for (const listener of connection.listeners) listener();
  };
  /** Le rappel de l'app, dans sa version la plus récente. */
  const relay = name => connection.handlers.current?.[name];
  try {
    connection.updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        connection.needRefresh = true;
        notify();
      },
      onOfflineReady() {
        connection.offlineReady = true;
        notify();
      },
      onRegistered(registration) {
        relay('onRegistered')?.(registration);
      },
      onRegisteredSW(swUrl, registration) {
        relay('onRegisteredSW')?.(swUrl, registration);
      },
      onRegisterError(error) {
        relay('onRegisterError')?.(error);
      },
      // LE SEUL RAPPEL DU MODE `autoUpdate`, et il change ce que le plugin
      // fait. En `registerType: 'autoUpdate'`, `vite-plugin-pwa` n'appelle
      // JAMAIS `onNeedRefresh` — sa branche `auto` n'a que celui-ci — et il
      // recharge la page tout seul… SAUF si on le fournit. Le passer rend donc
      // la main à l'app : c'est le seul moyen de différer un rechargement qui
      // tomberait au mauvais moment. Relayé comme les autres, jamais posé
      // d'office : sans rappel de l'app, `relay` rend `undefined` et le
      // comportement automatique du plugin est intact.
      onNeedReload() {
        relay('onNeedReload')?.();
      },
    });
  } catch {
    // Un enregistrement raté ne doit pas casser le rendu : l'app reste
    // utilisable, simplement sans bandeau.
  }
  return connection;
}

function readSnooze(key) {
  try {
    const value = globalThis.localStorage?.getItem(key);
    return value ? Number(value) : 0;
  } catch {
    return 0;
  }
}

function writeSnooze(key, until) {
  try {
    globalThis.localStorage?.setItem(key, String(until));
  } catch {
    /* stockage refusé (navigation privée) : le report vaut pour la session */
  }
}

/**
 * @param {{
 *   registerSW?: Function,
 *   snoozeHours?: number,
 *   snoozeKey?: string,
 *   updateOptions?: import('../sw-update.js').ApplyUpdateOptions,
 *   onNeedReload?: () => void,
 *   onRegisterError?: (error: unknown) => void,
 *   onRegisteredSW?: (swUrl: string, registration?: ServiceWorkerRegistration) => void,
 *   onRegistered?: (registration?: ServiceWorkerRegistration) => void,
 * }} [options]
 */
export function useUpdatePrompt(options = {}) {
  const {
    registerSW,
    snoozeHours = 0,
    snoozeKey = 'dwc_sw_update_snoozed_until',
    updateOptions,
    onRegisterError,
    onRegisteredSW,
    onRegistered,
    onNeedReload,
  } = options;

  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState(() =>
    snoozeHours > 0 ? readSnooze(snoozeKey) : 0
  );

  // Les options de `applyUpdate` sont lues au moment du clic : une app qui
  // reconstruit l'objet à chaque rendu ne doit pas invalider `update`.
  const updateOptionsRef = useRef(updateOptions);
  updateOptionsRef.current = updateOptions;

  // Même raison, pour les rappels d'enregistrement : le hook les relit au
  // moment où le service worker parle, pas au moment où il s'enregistre. Une
  // fonction écrite en ligne ne provoque donc aucun ré-enregistrement.
  const handlersRef = useRef(null);
  handlersRef.current = {
    onRegisterError,
    onRegisteredSW,
    onRegistered,
    onNeedReload,
  };

  useEffect(() => {
    if (typeof registerSW !== 'function') return undefined;
    const connection = connect(registerSW, handlersRef);
    const sync = () => {
      setNeedRefresh(connection.needRefresh);
      setOfflineReady(connection.offlineReady);
      if (connection.needRefresh) setDismissed(false);
    };
    connection.listeners.add(sync);
    sync();
    return () => {
      connection.listeners.delete(sync);
    };
  }, [registerSW]);

  const visible =
    needRefresh &&
    !dismissed &&
    (snoozeHours <= 0 || Date.now() >= snoozedUntil);

  const run = useCallback(async extra => {
    setUpdating(true);
    try {
      return await applyUpdate({ ...updateOptionsRef.current, ...extra });
    } finally {
      // La page se décharge normalement avant d'arriver ici. Si elle est
      // toujours là (navigation ignorée), le bouton doit redevenir cliquable.
      setUpdating(false);
    }
  }, []);

  const update = useCallback(() => run(), [run]);
  const forceUpdate = useCallback(() => run({ hard: true }), [run]);

  const dismiss = useCallback(() => setDismissed(true), []);

  const snooze = useCallback(() => {
    if (snoozeHours <= 0) {
      setDismissed(true);
      return;
    }
    const until = Date.now() + snoozeHours * 3_600_000;
    writeSnooze(snoozeKey, until);
    setSnoozedUntil(until);
  }, [snoozeHours, snoozeKey]);

  return {
    needRefresh,
    offlineReady,
    visible,
    updating,
    update,
    forceUpdate,
    dismiss,
    snooze,
  };
}
