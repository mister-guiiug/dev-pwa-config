import { useLabels } from './labels-core.js';
import { createElement as h, useId, useEffect, useRef } from 'react';
import { useInstallPrompt } from './use-install-prompt.js';
import { GESTES, trackEvent } from '../analytics.js';

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

  /*
   * L'IMPRESSION, UNE FOIS PAR MONTAGE — et pourquoi elle compte.
   *
   * Sans elle, `acceptee` n'a aucun dénominateur : on saurait combien de gens
   * installent, jamais combien on l'a proposé, donc jamais si l'invite marche.
   * C'est l'étape qui fait de ce couple un entonnoir plutôt qu'un compteur.
   *
   * LE GARDE N'EST PAS DÉCORATIF. `StrictMode` monte deux fois en
   * développement, et cet effet partirait deux fois pour une seule invite
   * affichée — un taux d'acceptation divisé par deux, sans que rien ne le dise.
   * Le `ref` survit au double montage, là où un état ne survivrait pas.
   */
  const impressionEnvoyee = useRef(false);
  useEffect(() => {
    if (!visible || impressionEnvoyee.current) return;
    impressionEnvoyee.current = true;
    trackEvent(GESTES.INSTALLATION, {
      etape: 'proposee',
      methode: method,
      plateforme: platform,
    });
  }, [visible, method, platform]);

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
            {
              type: 'button',
              // L'ISSUE VIENT DU NAVIGATEUR, pas du clic. Compter une
              // installation sur le clic serait faux : la boîte native
              // s'ouvre, et l'utilisateur y dit encore non une fois sur deux.
              // `promptInstall` rend `'accepted'` ou `'dismissed'` ; tout
              // autre retour (invite déjà consommée) ne compte rien plutôt
              // que d'inventer.
              onClick: () => {
                void promptInstall().then(issue => {
                  if (issue !== 'accepted' && issue !== 'dismissed') return;
                  trackEvent(GESTES.INSTALLATION, {
                    etape: issue === 'accepted' ? 'acceptee' : 'refusee',
                    methode: method,
                    plateforme: platform,
                  });
                });
              },
            },
            installLabel ?? labels.install
          ),
      h(
        'button',
        {
          type: 'button',
          onClick: () => {
            snooze();
            trackEvent(GESTES.INSTALLATION, {
              etape: 'reportee',
              methode: method,
              plateforme: platform,
            });
          },
        },
        dismissLabel ?? labels.dismiss
      )
    )
  );
}
