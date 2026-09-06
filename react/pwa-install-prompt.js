import { useLabels } from './labels.js';
import { createElement as h, useId } from 'react';
import { useInstallPrompt } from './use-install-prompt.js';

function getStore(kind) {
  try {
    return kind === 'session' ? window.sessionStorage : window.localStorage;
  } catch {
    // Navigation privée, stockage refusé : le hook retombe sur une cadence
    // qui ne vaut que pour la session, plutôt que de faire planter le rendu.
    return null;
  }
}

/** Le libellé d'instructions correspondant à la plateforme détectée. */
function howTo(labels, platform) {
  if (platform === 'ios') return labels.howIos;
  if (platform === 'safari') return labels.howSafari;
  return labels.howGeneric;
}

/**
 * Bandeau « Installer l'application ».
 *
 * CE QUI CHANGE (4.6), et pourquoi. Le bandeau ne paraissait que si
 * `beforeinstallprompt` était arrivé, et un refus le taisait pour toujours :
 * sur iPhone il n'a jamais rien affiché, et ailleurs il n'avait qu'une chance.
 * Il suit désormais la cadence de `../install.js` — au premier lancement, puis
 * tous les trente jours, trois fois — et remplace le bouton par des
 * instructions là où le navigateur n'expose pas d'invite (iOS, Safari).
 *
 * Non stylé au-delà de `components.css` : cibler `[data-dwc="pwa-install-*"]`.
 *
 * @param {{ storage?: 'local'|'session', dismissKey?: string,
 *   storageKey?: string, cadence?: Partial<import('../install.js').InstallCadence>|false,
 *   title?: string, description?: string, installLabel?: string,
 *   dismissLabel?: string, className?: string }} [props]
 */
export function PwaInstallPrompt(props = {}) {
  const {
    storage = 'local',
    dismissKey = 'dwc_pwa_install_dismissed',
    storageKey,
    cadence,
    title,
    description,
    installLabel,
    dismissLabel,
    className,
  } = props;

  const labels = useLabels('install');
  const titleId = useId();
  const descId = useId();

  const { method, platform, shouldPrompt, promptInstall, snooze } =
    useInstallPrompt({
      storage: getStore(storage),
      storageKey,
      // `dismissKey` désigne l'ANCIENNE clé booléenne. Une app qui l'avait
      // personnalisée garde donc le bénéfice de son refus passé : sans ce
      // relais, la migration ne trouverait rien et l'invite repartirait de
      // zéro chez ses utilisateurs.
      legacyKey: dismissKey,
      cadence: cadence === false ? undefined : cadence,
      enabled: cadence !== false,
    });

  // `cadence={false}` : l'app place l'invite elle-même (écran de réglages,
  // page « À propos ») et veut la voir dès qu'une installation est possible.
  const visible = cadence === false ? method !== 'none' : shouldPrompt;
  if (!visible) return null;

  const instructions = method === 'instructions';
  const description_ =
    description ??
    (instructions ? howTo(labels, platform) : labels.description);

  return h(
    'div',
    {
      className,
      // Bannière passive, non modale : `region` (et non `dialog`, qui
      // promettrait à tort un piège de focus / une gestion d'échappement).
      role: 'region',
      // `aria-labelledby` et NON `aria-label` : le titre peut être un nœud
      // React (une icône suivie d'un libellé), et un nœud passé en attribut
      // rendrait « [object Object] » comme nom accessible. Pointer le titre
      // rendu marche pour les deux formes, et garde le nom synchronisé avec ce
      // qui est réellement affiché.
      'aria-labelledby': titleId,
      // En mode instructions, la marche à suivre EST le contenu utile : sans
      // ce lien, un lecteur d'écran annonce « Installer l'application » puis
      // ne trouve qu'un bouton « Plus tard ».
      ...(instructions ? { 'aria-describedby': descId } : {}),
      'data-dwc': 'pwa-install-prompt',
      'data-method': method,
      'data-platform': platform,
    },
    h(
      'p',
      { id: titleId, 'data-dwc': 'pwa-install-title' },
      title ?? labels.title
    ),
    h('p', { id: descId, 'data-dwc': 'pwa-install-desc' }, description_),
    h(
      'div',
      { 'data-dwc': 'pwa-install-actions' },
      // Pas de bouton « Installer » quand rien ne peut l'honorer : un bouton
      // qui ouvrirait un tutoriel déjà lu à l'écran serait une fausse porte.
      instructions
        ? null
        : h(
            'button',
            { type: 'button', onClick: () => void promptInstall() },
            installLabel ?? labels.install
          ),
      h(
        'button',
        { type: 'button', onClick: snooze },
        dismissLabel ?? labels.dismiss
      )
    )
  );
}
