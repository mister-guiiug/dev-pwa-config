import { useLabels } from './labels.js';
import { createElement as h, useState } from 'react';
import { useInstallPrompt } from './use-install-prompt.js';

function getStore(kind) {
  return kind === 'session' ? window.sessionStorage : window.localStorage;
}

/**
 * Bandeau « Installer l'application » réutilisable. Ne s'affiche que si
 * l'installation est possible et n'a pas été refusée. Non stylé : cibler
 * `[data-dwc="pwa-install-prompt"]` (et descendants) en CSS du projet.
 *
 * @param {{ storage?: 'local'|'session', dismissKey?: string, title?: string,
 *   description?: string, installLabel?: string, dismissLabel?: string,
 *   className?: string }} [props]
 */
export function PwaInstallPrompt(props = {}) {
  const {
    storage = 'local',
    dismissKey = 'dwc_pwa_install_dismissed',
    title,
    description,
    installLabel,
    dismissLabel,
    className,
  } = props;

  const labels = useLabels('install');
  const title_ = title ?? labels.title;
  const description_ = description ?? labels.description;

  const { canInstall, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return getStore(storage).getItem(dismissKey) === '1';
    } catch {
      return false;
    }
  });

  if (!canInstall || dismissed) return null;

  const dismiss = () => {
    try {
      getStore(storage).setItem(dismissKey, '1');
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  return h(
    'div',
    {
      className,
      // Bannière passive, non modale : `region` (et non `dialog`, qui
      // promettrait à tort un piège de focus / une gestion d'échappement).
      role: 'region',
      'aria-label': title_,
      'data-dwc': 'pwa-install-prompt',
    },
    h('p', { 'data-dwc': 'pwa-install-title' }, title_),
    h('p', { 'data-dwc': 'pwa-install-desc' }, description_),
    h(
      'div',
      { 'data-dwc': 'pwa-install-actions' },
      h(
        'button',
        { type: 'button', onClick: () => void promptInstall() },
        installLabel ?? labels.install
      ),
      h(
        'button',
        { type: 'button', onClick: dismiss },
        dismissLabel ?? labels.dismiss
      )
    )
  );
}
