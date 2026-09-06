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
  versionManifestUrl,
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

  // Sous la base du build, jamais relatif au document : depuis un lien
  // profond, `version.json` relatif partait à côté de la page (404 muet).
  const url = checkUrl ?? versionManifestUrl(info);
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
 * L'état de version. Sous `VersionProvider`, le sien. Hors fournisseur, la
 * version injectée au build — et, si `check` est demandé, UN SONDAGE DE
 * `version.json` AU MONTAGE (puis tous les `checkEvery`, s'il est donné).
 *
 * POURQUOI SONDER SANS FOURNISSEUR. Le cas qui compte est le plus simple : une
 * PWA installée s'ouvre sur la coquille que le service worker a gardée, alors
 * qu'une version l'attend en ligne. Exiger un `VersionProvider` en haut de
 * l'arbre pour le dire, c'est un câblage de plus que dix-sept apps n'ont pas
 * fait ; un `AppVersion` dans le pied de page suffit désormais, et il ne coûte
 * qu'une requête au démarrage. `justUpdated`, lui, reste au fournisseur : il
 * demande de mémoriser la version d'avant, ce qu'un pied de page ne décide pas.
 *
 * @param {{ check?: boolean, checkUrl?: string, checkEvery?: string|number,
 *   fetch?: typeof fetch }} [options]
 */
export function useAppVersion(options = {}) {
  const { check = false, checkUrl, checkEvery, fetch: fetchImpl } = options;
  const context = useContext(VersionContext);
  const build = useMemo(() => readBuildInfo(), []);
  const [latest, setLatest] = useState('');
  const url = checkUrl ?? versionManifestUrl();
  const everyMs = parseInterval(checkEvery);

  useEffect(() => {
    // Le fournisseur sonde déjà ; et sans `check`, rien n'est demandé.
    if (context || !check) return undefined;
    let alive = true;
    const tick = async () => {
      const found = await fetchAppVersion(url, { fetch: fetchImpl });
      if (alive && found?.version) setLatest(found.version);
    };
    void tick();
    const id = everyMs ? setInterval(() => void tick(), everyMs) : null;
    return () => {
      alive = false;
      if (id) clearInterval(id);
    };
  }, [context, check, url, everyMs, fetchImpl]);

  const fallback = useMemo(
    () => ({
      ...standalone(build),
      latest,
      updateAvailable: isNewerVersion(latest, build.version),
    }),
    [build, latest]
  );
  return context ?? fallback;
}
