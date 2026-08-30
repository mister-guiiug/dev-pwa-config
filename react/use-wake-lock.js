import { useEffect } from 'react';

/**
 * Garde l'écran allumé (Screen Wake Lock API) tant que `active`.
 *
 * PROMU depuis `mister-molkky` et `miss-dice` (mêmes besoins : match en
 * cours, jeu pass-and-play — l'écran ne doit pas s'éteindre entre deux
 * tours). Le verrou est RE-ACQUIS au retour au premier plan : le navigateur
 * le relâche silencieusement quand l'onglet passe en arrière-plan.
 *
 * Silencieux si l'API manque (Firefox, anciens Safari) ou si la demande est
 * refusée (pas de geste utilisateur).
 *
 * @param {boolean} [active]
 */
export function useWakeLock(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    if (typeof navigator === 'undefined' || !navigator.wakeLock)
      return undefined;

    let sentinel = null;
    let disposed = false;

    const acquire = async () => {
      try {
        const next = await navigator.wakeLock.request('screen');
        // La demande a pu aboutir APRÈS le nettoyage : relâcher aussitôt.
        if (disposed) next.release().catch(() => undefined);
        else sentinel = next;
      } catch {
        /* refus (pas de geste) ou API restreinte : silencieux */
      }
    };
    void acquire();

    const onVisible = () => {
      if (
        document.visibilityState === 'visible' &&
        sentinel?.released !== false
      )
        void acquire();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisible);
      sentinel?.release().catch(() => undefined);
    };
  }, [active]);
}
