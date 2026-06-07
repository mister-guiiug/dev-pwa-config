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
    title = 'Installer l’application',
    description = 'Ajoutez cette application à votre écran d’accueil : accès rapide, hors-ligne.',
    installLabel = 'Installer',
    dismissLabel = 'Plus tard',
    className,
  } = props;

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
      role: 'dialog',
      'aria-label': title,
      'data-dwc': 'pwa-install-prompt',
    },
    h('p', { 'data-dwc': 'pwa-install-title' }, title),
    h('p', { 'data-dwc': 'pwa-install-desc' }, description),
    h(
      'div',
      { 'data-dwc': 'pwa-install-actions' },
      h(
        'button',
        { type: 'button', onClick: () => void promptInstall() },
        installLabel
      ),
      h('button', { type: 'button', onClick: dismiss }, dismissLabel)
    )
  );
}
