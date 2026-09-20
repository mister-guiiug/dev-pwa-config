import { useEffect, useRef } from 'react';
import { useOnline } from './use-online.js';

/**
 * Rejouer un chargement quand le réseau revient — tant que l'app vit sur un
 * repli.
 *
 * LE DÉFAUT QUE CECI CORRIGE. Une PWA est servie par son service worker AVANT
 * que la radio soit prête : au démarrage, `navigator.onLine` vaut souvent
 * `false` pendant une seconde ou deux. Une app qui, à cet instant, choisit un
 * repli — le cache d'hier, « serveur injoignable » — et ne relit JAMAIS garde
 * ce repli pour toute la session. Signalé sur mister-miss-koh le 20/09/2026
 * (« au premier chargement, j'ai le message : Serveur injoignable ») et corrigé
 * par son `useReferentialRetry`, dont ce hook est la promotion. Le relevé du
 * même jour a trouvé trois versions du geste dans le parc, aucune pareille :
 * koh (un répit, une tentative par retour du réseau), mister-doc (immédiat,
 * sans garde), miss-uwh (au fond de son moteur de synchro) — et quatre apps
 * qui ne relisent jamais.
 *
 * TROIS DÉCISIONS, toutes venues de koh :
 *
 *  - **Un répit** (`graceMs`, 1,5 s). L'évènement `online` part quand
 *    l'interface réseau remonte, pas quand le DNS et le TLS répondent : relire
 *    à l'instant même échoue une fois de plus, et le repli redevient
 *    « définitif ».
 *  - **Une tentative par retour du réseau.** Un chargement qui échoue alors
 *    qu'on est en ligne ne doit pas boucler : la garde ne se réarme qu'au
 *    passage par hors ligne. Un repli choisi sur DÉLAI (5 s sans réponse, réseau
 *    présent) est aussi couvert : au démarrage en ligne, une tentative part
 *    après le répit.
 *  - **Le hook ne sait pas ce qu'est un repli.** L'app le dit (`onFallback`) :
 *    « la donnée vient du cache », « l'erreur est posée et rien n'est chargé ».
 *    C'est la seule chose qu'il lui demande.
 *
 * `retry` est lu au moment de tirer, pas figé au montage : une fonction
 * recréée à chaque rendu ne désarme pas le minuteur.
 *
 * @param {boolean} onFallback L'app vit sur un repli à cet instant.
 * @param {() => unknown} retry Le chargement à rejouer.
 * @param {{ graceMs?: number }} [options]
 * @returns {boolean} L'état en ligne, pour éviter un second `useOnline`.
 */
export function useRetryWhenOnline(onFallback, retry, options = {}) {
  const { graceMs = 1500 } = options;
  const online = useOnline();
  const latest = useRef(retry);
  const tried = useRef(false);

  useEffect(() => {
    latest.current = retry;
  }, [retry]);

  useEffect(() => {
    if (!online) {
      tried.current = false;
      return undefined;
    }
    if (!onFallback || tried.current) return undefined;
    tried.current = true;
    const timer = setTimeout(() => {
      void latest.current();
    }, graceMs);
    return () => clearTimeout(timer);
  }, [online, onFallback, graceMs]);

  return online;
}
