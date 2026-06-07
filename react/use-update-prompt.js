import { useCallback, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

function readSnooze(key) {
  try {
    const v = window.localStorage.getItem(key);
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

function writeSnooze(key, until) {
  try {
    window.localStorage.setItem(key, String(until));
  } catch {
    /* ignore */
  }
}

/**
 * Gestion unifiée de la mise à jour du service worker (vite-plugin-pwa).
 * Variante « snooze » optionnelle : reporte le bandeau de `snoozeHours` heures.
 *
 * Requiert vite-plugin-pwa (module virtuel `virtual:pwa-register/react`).
 *
 * @param {{ snoozeHours?: number, snoozeKey?: string }} [options]
 */
export function useUpdatePrompt(options = {}) {
  const { snoozeHours = 0, snoozeKey = 'dwc_sw_update_snoozed_until' } =
    options;

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  const [snoozedUntil, setSnoozedUntil] = useState(() =>
    snoozeHours > 0 ? readSnooze(snoozeKey) : 0
  );

  const visible =
    needRefresh && (snoozeHours <= 0 || Date.now() >= snoozedUntil);

  const update = useCallback(
    () => updateServiceWorker(true),
    [updateServiceWorker]
  );

  const dismiss = useCallback(() => {
    setNeedRefresh(false);
    setOfflineReady(false);
  }, [setNeedRefresh, setOfflineReady]);

  const snooze = useCallback(() => {
    if (snoozeHours <= 0) {
      dismiss();
      return;
    }
    const until = Date.now() + snoozeHours * 3_600_000;
    writeSnooze(snoozeKey, until);
    setSnoozedUntil(until);
  }, [snoozeHours, snoozeKey, dismiss]);

  return { needRefresh, offlineReady, visible, update, dismiss, snooze };
}
