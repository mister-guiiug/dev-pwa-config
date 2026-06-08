import { useCallback, useEffect, useState } from 'react';

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    window.navigator.standalone === true
  );
}

/**
 * Capture l'événement `beforeinstallprompt` et expose un déclencheur
 * d'installation A2HS. Détecte le mode standalone (déjà installé).
 *
 * @returns {{ canInstall: boolean, installed: boolean,
 *   promptInstall: () => Promise<'accepted' | 'dismissed' | null> }}
 */
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onBeforeInstall = e => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onInstalled);
    // Certaines plateformes (iOS, install via menu navigateur) ne déclenchent
    // pas `appinstalled` : on suit aussi le passage en mode standalone.
    const mq = window.matchMedia?.('(display-mode: standalone)');
    const onDisplayMode = () => {
      if (mq?.matches) setInstalled(true);
    };
    mq?.addEventListener?.('change', onDisplayMode);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onInstalled);
      mq?.removeEventListener?.('change', onDisplayMode);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return null;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return outcome;
    } catch {
      // `userChoice` peut rejeter (prompt déjà consommé) : on respecte le
      // contrat `Promise<… | null>` au lieu de propager un rejet non géré.
      setDeferredPrompt(null);
      return null;
    }
  }, [deferredPrompt]);

  return {
    canInstall: deferredPrompt !== null && !installed,
    installed,
    promptInstall,
  };
}
