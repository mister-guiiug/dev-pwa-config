import { useCallback, useEffect, useState } from 'react';

/**
 * Le plein écran natif : l'état, et les trois gestes.
 *
 * PROMU, PAS INVENTÉ. `miss-badminton` (`FullscreenToggle`, 62 l.) et
 * `mister-molkky` (44 l.) portaient le même bouton flottant — le même
 * `fullscreenchange`, le même `requestFullscreen` sur `documentElement`, le
 * même silence sur un refus du navigateur. Le paquet promeut le HOOK, pas le
 * bouton : l'icône, la place et le libellé sont à l'app, comme pour
 * `ThemeToggle`.
 *
 * `supported` est lu une fois : l'API Fullscreen n'apparaît pas en cours de
 * route, et un bouton qui ne peut rien faire ne doit pas exister
 * (badminton le masque, molkky le rend `null`).
 *
 * `toggle` n'échoue JAMAIS : un refus du navigateur (geste utilisateur
 * absent, iframe sans permission) rend `false`, l'état ne change pas, et
 * `fullscreenchange` reste la seule source de vérité.
 *
 * @returns {{ supported: boolean, active: boolean,
 *   enter: () => Promise<boolean>, exit: () => Promise<boolean>,
 *   toggle: () => Promise<boolean> }}
 */
export function useFullscreen() {
  const [supported] = useState(
    () =>
      typeof document !== 'undefined' &&
      typeof document.documentElement?.requestFullscreen === 'function'
  );
  const [active, setActive] = useState(
    () => typeof document !== 'undefined' && Boolean(document.fullscreenElement)
  );

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const refresh = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', refresh);
    return () => document.removeEventListener('fullscreenchange', refresh);
  }, []);

  const enter = useCallback(async () => {
    if (!supported || document.fullscreenElement)
      return Boolean(document.fullscreenElement);
    try {
      await document.documentElement.requestFullscreen();
      return true;
    } catch {
      return false;
    }
  }, [supported]);

  const exit = useCallback(async () => {
    if (!supported || !document.fullscreenElement) return true;
    try {
      await document.exitFullscreen();
      return true;
    } catch {
      return false;
    }
  }, [supported]);

  const toggle = useCallback(
    () => (document.fullscreenElement ? exit() : enter()),
    [enter, exit]
  );

  return { supported, active, enter, exit, toggle };
}
