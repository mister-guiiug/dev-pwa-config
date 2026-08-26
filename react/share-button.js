import {
  createElement as h,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { shareOrCopy } from '../share.js';
import { useLabels } from './labels.js';

/**
 * Bouton « Partager », branché sur `shareOrCopy`.
 *
 * PROMU, PAS INVENTÉ — la suite de `share.js`. Quatre apps portent un
 * `share.ts` ; le module a été promu, mais chacune garde SON bouton, et chacune
 * retombe sur la même question sans y répondre pareil : que montrer quand le
 * partage natif n'existe pas et qu'on a copié à la place ? Le relevé donne
 * trois réponses — rien du tout, une alerte `window.alert`, un libellé qui ne
 * revient jamais à son état initial.
 *
 * CE QUE CE COMPOSANT TRANCHE, et pourquoi :
 *
 * 1. **L'annulation ne dit rien.** `shareOrCopy` distingue `'cancelled'` de
 *    `'failed'` précisément pour ça : quelqu'un qui ferme la feuille de partage
 *    n'a pas échoué, et lui afficher un message est une surprise. Seuls
 *    `'copied'` et `'failed'` produisent un retour.
 *
 * 2. **Le retour est ANNONCÉ, pas seulement affiché.** La zone d'état est une
 *    région `status` présente dès le premier rendu, vide tant qu'il n'y a rien
 *    à dire. Une région insérée en même temps que son texte n'est pas lue de
 *    façon fiable — c'est le défaut classique du message qui apparaît sans que
 *    personne ne l'entende.
 *
 * 3. **L'état revient de lui-même.** `resetAfterMs` remet le bouton à sa forme
 *    normale ; sans quoi « Lien copié » reste indéfiniment et ment au prochain
 *    regard.
 *
 * Non stylé : cibler `[data-dwc="share-button"]`.
 *
 * @param {{ title?: string, text?: string, url?: string, label?: string,
 *   copiedLabel?: string, failedLabel?: string, resetAfterMs?: number,
 *   className?: string, onResult?: (result: string) => void,
 *   share?: (data?: object) => Promise<string> }} props
 */
export function ShareButton(props = {}) {
  const {
    title,
    text,
    url,
    label,
    copiedLabel,
    failedLabel,
    resetAfterMs = 2500,
    className,
    onResult,
    share = shareOrCopy,
  } = props;

  const labels = useLabels('share');
  const [state, setState] = useState('idle');
  const timer = useRef(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const onClick = useCallback(async () => {
    // `data` reconstruit à chaque clic : une app qui recalcule son URL entre
    // deux rendus doit partager la nouvelle, pas celle du montage.
    const data = {};
    if (title !== undefined) data.title = title;
    if (text !== undefined) data.text = text;
    if (url !== undefined) data.url = url;

    let result = 'failed';
    try {
      result = await share(data);
    } catch {
      // `shareOrCopy` ne lève pas ; une implémentation injectée, peut-être.
      result = 'failed';
    }
    onResult?.(result);

    // `'shared'` n'a rien à annoncer : la feuille de partage du système l'a
    // déjà fait. `'cancelled'` non plus — voir l'en-tête.
    if (result !== 'copied' && result !== 'failed') return;

    setState(result);
    if (timer.current) clearTimeout(timer.current);
    if (resetAfterMs > 0) {
      timer.current = setTimeout(() => setState('idle'), resetAfterMs);
    }
  }, [title, text, url, share, onResult, resetAfterMs]);

  const message =
    state === 'copied'
      ? (copiedLabel ?? labels.copied)
      : state === 'failed'
        ? (failedLabel ?? labels.failed)
        : '';

  return h(
    'span',
    { className, 'data-dwc': 'share-button-group' },
    h(
      'button',
      {
        type: 'button',
        onClick: () => void onClick(),
        'data-dwc': 'share-button',
        'data-state': state === 'idle' ? undefined : state,
      },
      label ?? labels.label
    ),
    // Présente dès le premier rendu, vide tant qu'il n'y a rien à dire.
    h('span', { 'data-dwc': 'share-button-status', role: 'status' }, message)
  );
}
