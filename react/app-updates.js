import {
  createContext,
  createElement as h,
  useContext,
  useEffect,
} from 'react';
import { useUpdatePrompt } from './use-update-prompt.js';
import { UpdatePromptBanner } from './update-prompt-banner.js';

/**
 * La mise à jour, assemblée : un enregistrement, un bandeau, et le bouton
 * posable n'importe où.
 *
 * QUATRE PIÈCES, AUCUN ASSEMBLAGE. La vague précédente a produit `applyUpdate`,
 * `useUpdatePrompt`, `UpdatePromptBanner` et `UpdateButton` — et chacune
 * demandait son câblage. Le bandeau réclame `registerSW`, le bouton des
 * réglages n'en veut pas, et rien ne reliait les deux : une app posant les deux
 * passait `registerSW` à deux endroits, donc enregistrait deux fois.
 *
 * ICI, `registerSW` N'EST DONNÉ QU'UNE FOIS. Le fournisseur enregistre, rend le
 * bandeau, et publie l'état pour tout l'arbre. `UpdateButton` posé dans un
 * écran de réglages profond n'a plus rien à recevoir.
 *
 * `checkEvery` PROMU DE mister-qowa, seule app à le faire :
 *
 *   onRegisteredSW(_url, registration) {
 *     setInterval(() => void registration.update(), 60 * 60 * 1000);
 *   }
 *
 * Sans cette vérification périodique, une PWA ouverte plusieurs jours — le cas
 * normal d'une app installée — ne découvre une nouvelle version qu'au prochain
 * démarrage à froid. Le bandeau n'apparaît alors jamais.
 */

const UpdatesContext = createContext(null);

/** Millisecondes d'un intervalle écrit `'1h'`, `'30m'`, `'45s'`, ou un nombre. */
export function parseInterval(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const match = /^(\d+(?:\.\d+)?)(s|m|h)$/.exec(String(value ?? '').trim());
  if (!match) return 0;
  const units = { s: 1000, m: 60_000, h: 3_600_000 };
  return Number(match[1]) * units[match[2]];
}

/**
 * @param {{ registerSW?: Function, snoozeHours?: number,
 *   checkEvery?: string|number, banner?: boolean,
 *   bannerProps?: object, children?: import('react').ReactNode,
 *   updateOptions?: import('../sw-update.js').ApplyUpdateOptions }} props
 */
export function AppUpdates(props = {}) {
  const {
    registerSW,
    snoozeHours = 0,
    checkEvery,
    banner = true,
    bannerProps,
    children,
    updateOptions,
  } = props;

  const state = useUpdatePrompt({ registerSW, snoozeHours, updateOptions });

  const everyMs = parseInterval(checkEvery);
  useEffect(() => {
    if (!everyMs) return undefined;
    const sw = globalThis.navigator?.serviceWorker;
    if (!sw?.getRegistration) return undefined;
    const tick = async () => {
      try {
        const registration = await sw.getRegistration();
        await registration?.update?.();
      } catch {
        // Une vérification ratée n'est pas un incident : la suivante viendra,
        // et le rechargement manuel reste possible.
      }
    };
    const id = setInterval(tick, everyMs);
    return () => clearInterval(id);
  }, [everyMs]);

  return h(
    UpdatesContext.Provider,
    { value: state },
    children,
    // Le bandeau se pose seul : c'est ce que les six apps écrivaient à la main
    // juste sous leur `<App />`.
    banner ? h(UpdatePromptBanner, { ...bannerProps, registerSW }) : null
  );
}

/**
 * L'état de mise à jour partagé. Hors fournisseur, rend `null` — l'appelant
 * retombe alors sur son propre `useUpdatePrompt`.
 */
export function useAppUpdates() {
  return useContext(UpdatesContext);
}
