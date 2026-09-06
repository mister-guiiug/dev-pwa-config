import { useCallback, useEffect, useRef, useState } from 'react';
import {
  countInstallVisit,
  installFallback,
  installedRelatedApps,
  isAppInstalled,
  nextInstallState,
  readInstallState,
  shouldOfferInstall,
  writeInstallState,
} from '../install.js';

/**
 * Capture `beforeinstallprompt`, sait installer là où il n'existe pas, et dit
 * QUAND proposer.
 *
 * CE QUI CHANGE (4.6). Le hook ne répondait qu'à « une invite native est-elle
 * disponible ? ». Deux manques en découlaient, mesurés sur les vingt apps du
 * parc : sur iOS et Safari l'événement n'arrive jamais, donc `canInstall`
 * restait faux et le bandeau ne s'affichait pas — `miss-dice` l'avait écrit
 * dans son propre code sans pouvoir y remédier ; et un « Plus tard » valait
 * pour toujours. La décision (installée ? installable comment ? à proposer
 * maintenant ?) est descendue dans `../install.js`, testable sans DOM ; il ne
 * reste ici que le branchement React.
 *
 * COMPATIBLE. `canInstall`, `installed` et `promptInstall` gardent exactement
 * leur sens : une app qui ne lit qu'eux ne voit aucune différence, sinon que
 * `installed` détecte maintenant les quatre modes d'affichage installés au
 * lieu du seul `standalone`.
 *
 * LE VERROU D'AFFICHAGE. Une invite affichée arme le report (voir la cadence),
 * donc `shouldPrompt` redeviendrait faux dans la foulée et le bandeau
 * disparaîtrait sous les doigts. Une fois vraie, la réponse est donc retenue
 * pour ce chargement de page, jusqu'à ce que l'utilisateur tranche.
 *
 * @param {import('./use-install-prompt.js').UseInstallPromptOptions} [options]
 * @returns {import('./use-install-prompt.js').UseInstallPrompt}
 */
export function useInstallPrompt(options = {}) {
  const { storage, storageKey, legacyKey, cadence, enabled = true } = options;

  // Les options de stockage forment un objet neuf à chaque rendu si l'app
  // écrit `cadence={{…}}` en ligne : on les relit par référence plutôt que de
  // les mettre en dépendance, sinon chaque rendu relancerait les effets.
  const optionsRef = useRef(null);
  optionsRef.current = { storage, key: storageKey, legacyKey, cadence };

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(isAppInstalled);
  // `enabled: false` — l'app place l'invite elle-même (un écran de réglages) :
  // elle ne veut ni cadence, ni visite comptée pour un bandeau qui ne paraîtra
  // pas. Lu au premier rendu seulement, comme tout état initial.
  const [state, setState] = useState(() =>
    enabled
      ? countInstallVisit(optionsRef.current)
      : readInstallState(optionsRef.current)
  );
  // Le repli ne dépend que du navigateur : constant pour la page.
  const [fallback] = useState(installFallback);
  const latched = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onBeforeInstall = e => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
      latched.current = false;
      setState(s =>
        writeInstallState(nextInstallState(s, 'installed'), optionsRef.current)
      );
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

  // Installée mais consultée dans un onglet : le seul signal qui le dise, et
  // il est asynchrone. Il ne peut que CONFIRMER — jamais remettre à faux ce
  // que les modes d'affichage ont établi.
  useEffect(() => {
    let vivant = true;
    void installedRelatedApps().then(oui => {
      if (oui && vivant) setInstalled(true);
    });
    return () => {
      vivant = false;
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return null;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      if (outcome === 'accepted') {
        latched.current = false;
        setState(s =>
          writeInstallState(
            nextInstallState(s, 'installed'),
            optionsRef.current
          )
        );
      }
      return outcome;
    } catch {
      // `userChoice` peut rejeter (prompt déjà consommé) : on respecte le
      // contrat `Promise<… | null>` au lieu de propager un rejet non géré.
      setDeferredPrompt(null);
      return null;
    }
  }, [deferredPrompt]);

  const record = useCallback(event => {
    latched.current = false;
    setState(s =>
      writeInstallState(
        nextInstallState(s, event, optionsRef.current.cadence),
        optionsRef.current
      )
    );
  }, []);

  const snooze = useCallback(() => record('snooze'), [record]);
  const dismiss = useCallback(() => record('dismiss'), [record]);

  const canInstall = deferredPrompt !== null && !installed;
  /** La voie ouverte ici et maintenant. */
  const method = installed
    ? 'none'
    : canInstall
      ? 'prompt'
      : fallback.method === 'instructions'
        ? 'instructions'
        : 'none';

  const dûMaintenant =
    enabled &&
    method !== 'none' &&
    shouldOfferInstall(state, optionsRef.current.cadence);
  if (dûMaintenant) latched.current = true;
  const shouldPrompt = latched.current && method !== 'none';

  // Compter l'affichage APRÈS le rendu : une écriture dans le corps du
  // composant s'exécuterait deux fois sous `StrictMode`, et brûlerait deux des
  // trois invites en développement.
  const compté = useRef(false);
  useEffect(() => {
    if (!shouldPrompt || compté.current) return;
    compté.current = true;
    setState(s =>
      writeInstallState(
        nextInstallState(s, 'shown', optionsRef.current.cadence),
        optionsRef.current
      )
    );
  }, [shouldPrompt]);

  return {
    canInstall,
    installed,
    method,
    platform: fallback.platform,
    shouldPrompt,
    promptInstall,
    snooze,
    dismiss,
  };
}
