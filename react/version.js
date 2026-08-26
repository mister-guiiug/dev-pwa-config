import {
  createContext,
  createElement as h,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  fetchAppVersion,
  isNewerVersion,
  readBuildInfo,
  rememberVersion,
  VERSION_MANIFEST,
} from '../version.js';
import { parseInterval } from './app-updates.js';

/**
 * L'état de version de l'app : celle qui tourne, celle d'avant, celle en ligne.
 *
 * LE PENDANT DE `AppUpdates`, ET SON COMPLÉMENT. `AppUpdates` sait qu'une
 * bascule de service worker est possible ; il ne sait pas vers QUOI, ni si la
 * précédente a abouti. Ce fournisseur répond aux deux, et sur le même modèle :
 * une seule déclaration en haut de l'arbre, un contexte pour tout le reste,
 * `checkEvery` écrit de la même façon (`'1h'`, `'30m'`) — c'est déjà le format
 * que `parseInterval` impose au reste du paquet, il n'y en aura pas un second.
 *
 * DEUX CANAUX, PAS UN. Le worker dit « quelque chose a changé » ; `version.json`
 * dit « c'est la 3.14.0 ». Les deux sont utiles, et le second marche pour les
 * apps sans service worker — cinq du parc n'en ont pas.
 *
 * CE QUI N'EST PAS FAIT ICI : recharger. Poser la question et appliquer la
 * réponse sont deux gestes distincts, et `applyUpdate` fait déjà le second,
 * avec ses trois défauts corrigés. `updateAvailable` alimente un bandeau ou un
 * bouton — il ne déclenche rien tout seul.
 */

const VersionContext = createContext(null);

/** L'état rendu hors fournisseur : la version, et rien qui exige un montage. */
function standalone(info) {
  const build = readBuildInfo(info);
  return {
    ...build,
    previous: '',
    firstRun: false,
    changed: false,
    justUpdated: false,
    latest: '',
    updateAvailable: false,
    checking: false,
    checkNow: async () => null,
  };
}

/**
 * @param {{ info?: unknown, checkUrl?: string, checkEvery?: string|number,
 *   storageKey?: string, remember?: boolean, fetch?: typeof fetch,
 *   children?: import('react').ReactNode }} props
 */
export function VersionProvider(props = {}) {
  const {
    info,
    checkUrl,
    checkEvery,
    storageKey,
    remember = true,
    fetch: fetchImpl,
    children,
  } = props;

  const build = useMemo(() => readBuildInfo(info), [info]);

  // Au PREMIER rendu, une fois : c'est la comparaison avec le démarrage
  // précédent, et elle n'a de sens qu'avant que quoi que ce soit l'écrase.
  const [history] = useState(() =>
    remember
      ? rememberVersion(build.version, { key: storageKey })
      : { previous: '', firstRun: false, changed: false, upgraded: false }
  );

  const [latest, setLatest] = useState('');
  const [checking, setChecking] = useState(false);

  const url = checkUrl ?? VERSION_MANIFEST;
  const checkNow = useCallback(async () => {
    setChecking(true);
    try {
      const found = await fetchAppVersion(url, { fetch: fetchImpl });
      if (found?.version) setLatest(found.version);
      return found;
    } finally {
      setChecking(false);
    }
  }, [url, fetchImpl]);

  const everyMs = parseInterval(checkEvery);
  useEffect(() => {
    // Sans `checkEvery`, AUCUN sondage automatique : une requête périodique
    // qu'on n'a pas demandée est une requête de trop, surtout sur mobile.
    if (!everyMs) return undefined;
    let alive = true;
    const tick = async () => {
      const found = await fetchAppVersion(url, { fetch: fetchImpl });
      if (alive && found?.version) setLatest(found.version);
    };
    void tick();
    const id = setInterval(() => void tick(), everyMs);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [everyMs, url, fetchImpl]);

  const value = useMemo(
    () => ({
      ...build,
      previous: history.previous,
      firstRun: history.firstRun,
      changed: history.changed,
      // `upgraded`, pas `changed` : un rollback de déploiement ne s'annonce pas
      // comme une nouveauté à l'utilisateur.
      justUpdated: history.upgraded,
      latest,
      updateAvailable: isNewerVersion(latest, build.version),
      checking,
      checkNow,
    }),
    [build, history, latest, checking, checkNow]
  );

  return h(VersionContext.Provider, { value }, children);
}

/**
 * L'état de version. Hors fournisseur, rend la version injectée au build et
 * des drapeaux à `false` : un `AppVersion` posé dans un pied de page s'affiche
 * donc sans rien avoir à déclarer, il ne surveille simplement rien.
 */
export function useAppVersion() {
  const context = useContext(VersionContext);
  const fallback = useMemo(() => standalone(), []);
  return context ?? fallback;
}
