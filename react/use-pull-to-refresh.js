import { useEffect, useRef, useState } from 'react';

/**
 * Tirer-pour-rafraîchir léger, borné au composant appelant.
 *
 * PROMU depuis `mister-molkky` (la version complète : progression exposée,
 * amorti « élastique », `overscroll-behavior` neutralisé pendant l'activation)
 * — `mister-puzzle` en portait une variante réduite.
 *
 * Le site d'appel possède l'état : on peut l'activer sur UN écran (historique,
 * suivi en direct) sans réactiver le pull-to-refresh natif sur le reste de
 * l'app — qui rechargerait en plein match.
 *
 * @param {{ onRefresh: () => void | Promise<void>, enabled?: boolean,
 *   threshold?: number }} options
 * @returns {{ pulling: boolean, progress: number, refreshing: boolean }}
 *   `progress` ∈ [0, 1] : proportion du seuil parcourue (pour l'indicateur).
 */
export function usePullToRefresh(options) {
  const { onRefresh, enabled = true, threshold = 64 } = options;
  const [pulling, setPulling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(null);
  const distance = useRef(0);

  const onRefreshRef = useRef(onRefresh);
  useEffect(() => {
    onRefreshRef.current = onRefresh;
  });

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overscrollBehaviorY;
    const prevBody = body.style.overscrollBehaviorY;
    html.style.overscrollBehaviorY = 'auto';
    body.style.overscrollBehaviorY = 'auto';

    const onTouchStart = e => {
      if (window.scrollY > 0) return;
      startY.current = e.touches[0]?.clientY ?? null;
      distance.current = 0;
    };

    const onTouchMove = e => {
      if (startY.current === null) return;
      const y = e.touches[0]?.clientY ?? 0;
      const delta = y - startY.current;
      if (delta <= 0) {
        distance.current = 0;
        setPulling(false);
        setProgress(0);
        return;
      }
      // Amorti (sensation élastique).
      distance.current = Math.min(delta * 0.55, threshold * 1.5);
      setPulling(true);
      setProgress(Math.min(1, distance.current / threshold));
    };

    const onTouchEnd = async () => {
      const reached = distance.current >= threshold;
      startY.current = null;
      distance.current = 0;
      setPulling(false);
      setProgress(0);
      if (!reached || refreshing) return;
      setRefreshing(true);
      try {
        await onRefreshRef.current();
      } finally {
        setRefreshing(false);
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      html.style.overscrollBehaviorY = prevHtml;
      body.style.overscrollBehaviorY = prevBody;
    };
  }, [enabled, threshold, refreshing]);

  return { pulling, progress, refreshing };
}
