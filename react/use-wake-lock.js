import { useEffect, useRef, useState } from 'react';

/**
 * Garde l'écran allumé tant que `active` est vrai (Screen Wake Lock API).
 *
 * PROMU, PAS INVENTÉ. Deux apps l'avaient écrit chacune de leur côté, et
 * aucune des deux copies n'était complète :
 *
 * - **miss-contraction** (`useWakeLock(enabled, active)`) tient une sentinelle
 *   en `ref`, la relâche au démontage et ignore les erreurs — mais ne se
 *   réacquiert JAMAIS. Or le navigateur relâche d'autorité le verrou dès que
 *   l'onglet passe en arrière-plan : au retour, l'écran s'éteint de nouveau
 *   au bout du délai système, en plein chronométrage de contraction.
 * - **mister-molkky** (`useWakeLock(active)`) réacquiert bien au retour de
 *   `visibilitychange` — mais garde sa sentinelle dans une variable de
 *   fermeture, sans écouter l'événement `release` : après une réacquisition,
 *   c'est l'ancienne sentinelle déjà relâchée qui est libérée au démontage.
 *   Il lit aussi son réglage directement dans `useSettingsStore`, ce qui rend
 *   le hook inutilisable ailleurs.
 *
 * L'UNION, ici : sentinelle en `ref` (elle survit aux rendus sans en
 * provoquer), réacquisition au retour de visibilité, libération au démontage
 * ET à la retombée d'`active`, et l'événement `release` du navigateur écouté
 * pour que l'état exposé dise la vérité.
 *
 * UN SEUL PARAMÈTRE, ET C'EST VOULU. Le branchement sur un réglage
 * (« garder l'écran allumé ») reste APPLICATIF : l'app compose elle-même sa
 * préférence et son état de marche — `useWakeLock(reglages.wakeLock && enCours)`
 * — au lieu que le socle impose la forme de son store.
 *
 * NE LÈVE JAMAIS. L'API manque (Firefox, iOS avant 16.4), le geste
 * utilisateur fait défaut, la permission est refusée, l'onglet est caché au
 * moment de la demande : dans tous les cas, `supported`/`held` renseignent, et
 * rien ne remonte. Un verrou d'écran est un confort, jamais une fonction.
 *
 * @param {boolean} [active] `true` pour tenir le verrou.
 * @returns {{ supported: boolean, held: boolean }} `supported` : l'API existe
 *   dans ce navigateur (de quoi masquer un réglage qui ne servirait à rien).
 *   `held` : le verrou est tenu À CET INSTANT — il retombe seul quand l'onglet
 *   passe en arrière-plan, et remonte à son retour.
 */
export function useWakeLock(active = false) {
  const sentinelRef = useRef(null);
  const [held, setHeld] = useState(false);
  const supported = wakeLockApi() !== null;

  useEffect(() => {
    const api = wakeLockApi();
    if (!active || !api || typeof document === 'undefined') return undefined;

    let cancelled = false;

    const acquire = async () => {
      // Déjà tenu : ne pas empiler les sentinelles. `released` couvre le cas
      // où le navigateur a relâché sans que l'événement nous soit parvenu.
      const current = sentinelRef.current;
      if (cancelled || (current && current.released !== true)) return;
      try {
        const sentinel = await api.request('screen');
        if (cancelled) {
          // Démonté pendant l'attente : la sentinelle arrive orpheline.
          void sentinel?.release?.().catch?.(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        setHeld(true);
        sentinel?.addEventListener?.('release', () => {
          if (sentinelRef.current === sentinel) sentinelRef.current = null;
          setHeld(false);
        });
      } catch {
        /* pas de geste utilisateur, permission refusée, onglet caché… */
      }
    };

    void acquire();

    // LE PIÈGE CLASSIQUE. Le verrou saute tout seul quand l'onglet passe en
    // arrière-plan ; sans cet écouteur, il ne revient jamais.
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void acquire();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      const sentinel = sentinelRef.current;
      sentinelRef.current = null;
      setHeld(false);
      if (sentinel) {
        try {
          void sentinel.release?.()?.catch?.(() => {});
        } catch {
          /* une sentinelle déjà relâchée jette parfois : sans conséquence */
        }
      }
    };
  }, [active]);

  return { supported, held };
}

/** L'API du navigateur, ou `null` — lue sans jamais supposer un `navigator`. */
function wakeLockApi() {
  if (typeof navigator === 'undefined') return null;
  const api = navigator.wakeLock;
  return typeof api?.request === 'function' ? api : null;
}
