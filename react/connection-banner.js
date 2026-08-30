import { createElement as h, useEffect, useState } from 'react';
import { useOnline } from './use-online.js';

/**
 * Bandeau « hors ligne », débouncé pour ne pas clignoter.
 *
 * PROMU depuis `mister-qowa`. Deux décisions y étaient déjà prises et sont
 * conservées :
 * - le bandeau n'apparaît qu'après `delayMs` HORS LIGNE CONTINU (défaut
 *   1,5 s) — les micro-coupures ne clignotent pas ;
 * - la remise à zéro se fait PENDANT le rendu (et non dans un effet) : c'est
 *   le motif React recommandé pour réinitialiser un état quand une entrée
 *   change, sans rendu en cascade.
 *
 * `useOnline` lit `navigator.onLine` ; une app dont la connectivité vient
 * d'ailleurs (`.info/connected` Firebase…) passe `online` en prop.
 *
 * Non stylé : cibler `[data-dwc="connection-banner"]`.
 *
 * @param {{ label?: import('react').ReactNode, delayMs?: number,
 *   online?: boolean, className?: string }} props
 */
export function ConnectionBanner(props = {}) {
  const {
    label = 'Hors ligne — reconnexion…',
    delayMs = 1500,
    className,
  } = props;

  const navigatorOnline = useOnline();
  const online = props.online ?? navigatorOnline;

  const [debounced, setDebounced] = useState(false);
  const [lastOnline, setLastOnline] = useState(online);
  if (online !== lastOnline) {
    setLastOnline(online);
    setDebounced(false);
  }

  useEffect(() => {
    if (online) return undefined;
    const id = setTimeout(() => setDebounced(true), delayMs);
    return () => clearTimeout(id);
  }, [online, delayMs]);

  if (online || !debounced) return null;
  return h(
    'div',
    { role: 'status', className, 'data-dwc': 'connection-banner' },
    label
  );
}
