import {
  createContext,
  createElement as h,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CloseIcon } from './icons.js';
import { useLabels } from './labels.js';

/**
 * Notifications transitoires — fournisseur, file et zone d'affichage.
 *
 * PROMU, PAS INVENTÉ. **Six apps sur seize** portent leur propre pile de
 * notifications : miss-carbook (`ToastContext`), miss-supaboss et miss-uwh
 * (`ToastViewport` sur un magasin zustand), mister-doc et mister-footcoach
 * (`ToastProvider`), mister-quota (`toast.ts` + `Toaster`). Six mécaniques, six
 * durées, six façons d'annoncer.
 *
 * TROIS DÉFAUTS CONSTATÉS, corrigés ici :
 *
 * 1. **La double annonce.** miss-supaboss et mister-footcoach posent
 *    `aria-live` sur le conteneur ET `role="status"` sur chaque message : le
 *    message est inséré DANS une région déjà vivante, ce qui le fait annoncer
 *    deux fois par plusieurs lecteurs d'écran. Ici, la région vit sur le
 *    conteneur — monté en permanence, condition pour qu'une insertion soit
 *    détectée — et les messages ne portent aucun rôle.
 * 2. **Le message perdu.** miss-carbook n'affiche qu'UN message à la fois : le
 *    suivant remplace le précédent, qui disparaît sans avoir été lu. Ici la
 *    pile est bornée (`max`, 4 par défaut) et c'est le PLUS ANCIEN qui cède.
 * 3. **La minuterie qui survit.** mister-doc et mister-footcoach appellent
 *    `setTimeout` sans jamais le nettoyer : un démontage pendant l'attente
 *    laisse une mise à jour d'état orpheline. Ici chaque minuterie est suivie et
 *    purgée au démontage.
 *
 * DEUX DÉCISIONS, faute de convergence à promouvoir :
 *
 * - **Les durées divergeaient** (3 200, 4 000, 5 000 ms). Retenu : 5 000 ms,
 *   la plus longue — une notification qu'on n'a pas eu le temps de lire n'a
 *   servi à rien.
 * - **Une erreur ne s'efface pas toute seule** (`duration: 0`). Un message
 *   d'erreur qui disparaît avant d'être lu ne peut pas être suivi d'effet ; le
 *   bouton de fermeture, lui, est toujours là. Passer `duration` explicitement
 *   rétablit l'effacement automatique.
 *
 * Le compte à rebours est SUSPENDU tant que le pointeur survole la pile ou que
 * le focus s'y trouve (WCAG 2.2.1) : aucune des six copies ne le faisait.
 *
 * Non stylé : cibler `[data-dwc="toast-viewport"]` et descendants.
 */

/** Vrai hors production — voir `button.js`, même garde. */
function isDev() {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.DEV === true;
  }
  return (
    typeof process !== 'undefined' &&
    process.env &&
    process.env.NODE_ENV !== 'production'
  );
}

const DEFAULT_DURATION = 5000;

/**
 * Hors fournisseur, l'API ne fait rien plutôt que de lever : une notification
 * manquante ne doit pas casser un écran. Un avertissement le signale en
 * développement — mister-footcoach avait le no-op sans l'avertissement,
 * miss-carbook et mister-doc levaient.
 */
const NOOP_API = {
  show: () => {
    if (isDev()) {
      console.warn(
        '[dwc] useToast() hors <ToastProvider> : la notification est ignorée.'
      );
    }
    return null;
  },
  success: () => null,
  error: () => null,
  info: () => null,
  dismiss: () => {},
  clear: () => {},
};

const ToastContext = createContext(NOOP_API);

let counter = 0;

/**
 * @param {{ children?: import('react').ReactNode, duration?: number,
 *   max?: number, className?: string }} props
 */
export function ToastProvider(props = {}) {
  const { children, duration = DEFAULT_DURATION, max = 4, className } = props;

  const [toasts, setToasts] = useState([]);
  const [paused, setPaused] = useState(false);
  // id → { remaining, startedAt, timer }
  const timersRef = useRef(new Map());

  const clearTimer = useCallback(id => {
    const entry = timersRef.current.get(id);
    if (entry?.timer) clearTimeout(entry.timer);
    timersRef.current.delete(id);
  }, []);

  const dismiss = useCallback(
    id => {
      clearTimer(id);
      setToasts(list => list.filter(toast => toast.id !== id));
    },
    [clearTimer]
  );

  const clear = useCallback(() => {
    for (const id of [...timersRef.current.keys()]) clearTimer(id);
    setToasts([]);
  }, [clearTimer]);

  const show = useCallback(
    (message, options = {}) => {
      const tone = options.tone ?? 'info';
      // Une erreur reste jusqu'à ce qu'on la ferme, sauf durée explicite.
      const life = options.duration ?? (tone === 'error' ? 0 : duration);
      const id = options.id ?? `dwc-toast-${(counter += 1)}`;
      setToasts(list => {
        const next = [
          ...list.filter(toast => toast.id !== id),
          { id, message, tone },
        ];
        // La pile est bornée : c'est le PLUS ANCIEN qui cède, pas le nouveau.
        const dropped = next.slice(0, Math.max(0, next.length - max));
        for (const toast of dropped) clearTimer(toast.id);
        return next.slice(-max);
      });
      if (life > 0) {
        timersRef.current.set(id, {
          remaining: life,
          startedAt: Date.now(),
          timer: setTimeout(() => dismiss(id), life),
        });
      }
      return id;
    },
    [duration, max, dismiss, clearTimer]
  );

  // Suspension : on retient le temps restant, on ne le perd pas.
  useEffect(() => {
    const timers = timersRef.current;
    if (paused) {
      for (const [id, entry] of timers) {
        if (!entry.timer) continue;
        clearTimeout(entry.timer);
        timers.set(id, {
          remaining: Math.max(
            0,
            entry.remaining - (Date.now() - entry.startedAt)
          ),
          startedAt: Date.now(),
          timer: null,
        });
      }
      return undefined;
    }
    for (const [id, entry] of timers) {
      if (entry.timer) continue;
      timers.set(id, {
        remaining: entry.remaining,
        startedAt: Date.now(),
        timer: setTimeout(() => dismiss(id), entry.remaining),
      });
    }
    return undefined;
  }, [paused, dismiss]);

  // Au démontage, aucune minuterie ne survit.
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const entry of timers.values()) {
        if (entry.timer) clearTimeout(entry.timer);
      }
      timers.clear();
    };
  }, []);

  const api = useMemo(
    () => ({
      show,
      success: (message, options) =>
        show(message, { ...options, tone: 'success' }),
      error: (message, options) => show(message, { ...options, tone: 'error' }),
      info: (message, options) => show(message, { ...options, tone: 'info' }),
      dismiss,
      clear,
    }),
    [show, dismiss, clear]
  );

  return h(
    ToastContext.Provider,
    { value: api },
    children,
    h(ToastViewport, {
      toasts,
      onDismiss: dismiss,
      onPauseChange: setPaused,
      className,
    })
  );
}

/**
 * Zone d'affichage. Exportée pour les apps qui gèrent la file dans leur propre
 * magasin (miss-supaboss et miss-uwh le font sur zustand) : elles gardent leur
 * état et reprennent l'accessibilité.
 *
 * @param {{ toasts?: Array<{id: string, message: unknown, tone?: string}>,
 *   onDismiss?: (id: string) => void, onPauseChange?: (paused: boolean) => void,
 *   className?: string }} props
 */
export function ToastViewport(props = {}) {
  const { toasts = [], onDismiss, onPauseChange, className } = props;
  const labels = useLabels('toast');

  const pause = value => onPauseChange?.(value);

  const item = toast =>
    h(
      'div',
      { key: toast.id, 'data-dwc': 'toast', 'data-tone': toast.tone ?? 'info' },
      h('span', { 'data-dwc': 'toast-message' }, toast.message),
      typeof onDismiss === 'function'
        ? h(
            'button',
            {
              type: 'button',
              onClick: () => onDismiss(toast.id),
              'aria-label': labels.close,
              'data-dwc': 'toast-close',
            },
            h(CloseIcon)
          )
        : null
    );

  const region = (live, role, list) =>
    h(
      'div',
      {
        // La région est montée EN PERMANENCE, même vide : un lecteur d'écran
        // n'annonce une insertion que dans une région déjà présente.
        'data-dwc': 'toast-region',
        'data-live': live,
        role,
        'aria-live': live,
        'aria-atomic': 'false',
      },
      list.map(item)
    );

  return h(
    'div',
    {
      className,
      'data-dwc': 'toast-viewport',
      'aria-label': labels.region,
      role: 'region',
      onMouseEnter: () => pause(true),
      onMouseLeave: () => pause(false),
      onFocusCapture: () => pause(true),
      onBlurCapture: () => pause(false),
    },
    region(
      'polite',
      'status',
      toasts.filter(toast => (toast.tone ?? 'info') !== 'error')
    ),
    region(
      'assertive',
      'alert',
      toasts.filter(toast => toast.tone === 'error')
    )
  );
}

/** API de notification. Hors fournisseur : ne fait rien (et le dit en dev). */
export function useToast() {
  return useContext(ToastContext);
}
