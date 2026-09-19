import { createElement as h, useState, useEffect, useRef } from 'react';
import { DEFAULT_SNOOZE_HOURS, useUpdatePrompt } from './use-update-prompt.js';
import { useLabels } from './labels-core.js';
import { useAppUpdates, useUpdateCheck } from './app-updates.js';
import { GESTES, trackEvent } from '../analytics.js';

/**
 * Bandeau « Mise à jour disponible », branché sur `useUpdatePrompt`.
 *
 * Le relevé des seize apps donne six bandeaux quasi identiques (miss-genius,
 * miss-uwh, mister-qowa, mister-doc, mister-footcoach, mister-molkky) : un
 * titre, un bouton qui recharge, un bouton qui reporte. Deux d'entre eux
 * n'offrent AUCUNE sortie autre que la mise à jour (footcoach n'a pas de second
 * bouton du tout) ; celui-ci en propose toujours une.
 *
 * Non stylé : cibler `[data-dwc="update-banner"]`.
 *
 * `placement="fixed"` — LA PLACE, ENFIN DEMANDABLE.
 *
 * Le socle plaçait déjà ce bandeau, mais seulement sous
 * `:root:has([data-dwc='bottom-nav'][data-placement='fixed'])` : il fallait
 * une barre basse, du socle, ET déclarée. Relevé du 16/09/2026 : cinq apps sur
 * vingt remplissaient cette condition. Les autres recevaient une boîte
 * habillée POSÉE DANS LE FLUX, en fin de document, sous le pied de page — et
 * six d'entre elles ont réécrit le placement à la main : miss-badminton,
 * miss-carbook, miss-contraction, miss-dice (sous un `className`),
 * mister-miss-koh, mister-molkky. Six copies, six jeux de valeurs, des
 * `z-index` allant de 25 à 9999.
 *
 * La prop dit la même chose que celle de `BottomNav`, et le même mot : collé
 * en bas de la fenêtre. Elle ne dépend d'AUCUNE barre — c'était tout le
 * problème — mais elle en tient compte s'il y en a une, le plancher venant de
 * `--_dwc-bottom-clearance`.
 *
 * PAS DE MODE « EN HAUT », et c'est le corpus qui l'a tranché : les six
 * placements maison relevés collent le bandeau EN BAS, sans exception. Un mode
 * que personne n'utilise est un mode qu'on maintient pour rien.
 *
 * DEUX SORTIES, SUR DEMANDE. `secondaryActions: 'both'` rend le report ET
 * l'écartement pour la session, au lieu du seul report. `mister-puzzle` offrait
 * les deux — « Plus tard (24 h) », persisté, et « Ignorer », le temps de la
 * session — et a dû abandonner le second en migrant : le socle n'en rendait
 * qu'un. Le mode par défaut reste `'auto'`, et il ne bouge pas d'un pixel.
 *
 * LE « PRÊT HORS LIGNE », SUR DEMANDE AUSSI. `useUpdatePrompt` expose
 * `offlineReady` depuis toujours, et rien ne l'affichait : `miss-genius` gardait
 * pour ça un `OfflineReadyNotice` local. `showOfflineReady` le fait rendre ici,
 * avec la précédence que cette app avait écrite — tant qu'une version attend,
 * le message hors ligne s'efface. Les deux messages ne se chevauchent jamais.
 *
 * @param {{ registerSW?: Function, snoozeHours?: number, snoozeKey?: string,
 *   secondaryActions?: 'auto'|'both', showOfflineReady?: boolean,
 *   placement?: 'static'|'fixed',
 *   title?: import('react').ReactNode, updateLabel?: string,
 *   updatingLabel?: string, snoozeLabel?: string, dismissLabel?: string,
 *   ignoreLabel?: string, offlineReadyTitle?: import('react').ReactNode,
 *   offlineReadyLabel?: string, className?: string,
 *   updateOptions?: import('../sw-update.js').ApplyUpdateOptions }} props
 */
function Banner(props) {
  const {
    snoozeHours = DEFAULT_SNOOZE_HOURS,
    secondaryActions = 'auto',
    showOfflineReady = false,
    placement,
    title,
    updateLabel,
    updatingLabel,
    snoozeLabel,
    dismissLabel,
    ignoreLabel,
    offlineReadyTitle,
    offlineReadyLabel,
    className,
  } = props;

  const labels = useLabels('update');
  const { visible, updating, update, snooze, dismiss } = props;

  // `placement="fixed"` : le bandeau flotte au-dessus du contenu, dégagé de la
  // barre basse quand il y en a une. Voir le bloc de documentation ci-dessus.
  const colle = placement === 'fixed' ? 'fixed' : undefined;

  // `offlineReady` et `needRefresh` viennent de l'ÉTAT du hook, versé sur les
  // mêmes props : c'est pourquoi l'interrupteur s'appelle `showOfflineReady` et
  // non `offlineReady`, qui serait écrasé par l'état à chaque rendu.
  const { offlineReady, needRefresh } = props;
  const [offlineDismissed, setOfflineDismissed] = useState(false);

  /*
   * L'IMPRESSION DU BANDEAU DE MISE À JOUR.
   *
   * Ce que ce couple d'événements répond, et que rien ne disait : les gens
   * prennent-ils les mises à jour ? Le parc a choisi `registerType: 'prompt'`
   * plutôt qu'`autoUpdate` — un déploiement ne recharge plus la page sous les
   * doigts de l'utilisatrice (`miss-contraction`, pendant un chronométrage).
   * Le prix de ce choix est qu'une version peut n'être jamais prise, et
   * personne ne le savait.
   *
   * `ref` et non état, pour la même raison qu'ailleurs : `StrictMode` monte
   * deux fois et doublerait le dénominateur.
   */
  const impressionEnvoyee = useRef(false);
  useEffect(() => {
    if (!visible || impressionEnvoyee.current) return;
    impressionEnvoyee.current = true;
    trackEvent(GESTES.MAJ, { etape: 'proposee' });
  }, [visible]);

  if (!visible) {
    // La mise à jour L'EMPORTE : dès qu'une version attend, le message hors
    // ligne se tait — même si le bandeau est écarté ou reporté. C'est la
    // précédence de `miss-genius`, dont ce bloc est la promotion.
    if (!showOfflineReady || !offlineReady || needRefresh || offlineDismissed)
      return null;

    return h(
      'div',
      {
        className,
        role: 'status',
        'aria-live': 'polite',
        'data-dwc': 'offline-ready',
        'data-placement': colle,
      },
      h(
        'span',
        { 'data-dwc': 'offline-ready-title' },
        offlineReadyTitle ?? labels.offlineReady
      ),
      h(
        'button',
        {
          type: 'button',
          onClick: () => setOfflineDismissed(true),
          'data-dwc': 'offline-ready-dismiss',
        },
        offlineReadyLabel ?? labels.offlineReadyOk
      )
    );
  }

  // Sans report à offrir, `'both'` n'a pas de second bouton à rendre : il ne
  // reste que l'écartement, soit exactement ce que fait `'auto'`. Deux boutons
  // qui écartent tous deux pour la session ne diraient rien de plus.
  const bothExits = secondaryActions === 'both' && snoozeHours > 0;
  // LE REPORT DIT SA DURÉE. Le même « Plus tard » servait deux gestes — un
  // report de 4, 6 ou 24 h, persisté, et un écartement pour la seule session —
  // et rien à l'écran ne les distinguait. `{hours}` est rempli ici, avec la
  // valeur que le hook applique : le libellé ne peut pas mentir sur la durée.
  // Un `snoozeLabel` de l'app passe par le même remplissage, qu'il porte le
  // gabarit ou non — sans lui, il sort tel quel.
  const secondaryLabel =
    snoozeHours > 0
      ? (snoozeLabel ?? labels.snooze).replaceAll(
          '{hours}',
          String(snoozeHours)
        )
      : (dismissLabel ?? labels.dismiss);
  const onSecondary = () => {
    trackEvent(GESTES.MAJ, { etape: 'reportee' });
    return snoozeHours > 0 ? snooze() : dismiss();
  };

  return h(
    'div',
    {
      className,
      role: 'status',
      'data-dwc': 'update-banner',
      'data-placement': colle,
    },
    h('span', { 'data-dwc': 'update-banner-title' }, title ?? labels.title),
    h(
      'button',
      {
        type: 'button',
        // `aria-disabled` plutôt que `disabled` : un bouton retiré du parcours
        // pendant l'opération renvoie le focus sur `<body>` (même choix que
        // `Button`). Le double clic est bloqué par la garde, pas par le DOM.
        onClick: () => {
          if (updating) return;
          // AVANT `update()`, et non après : la mise à jour recharge le
          // document. Un événement posé après ne partirait jamais — PostHog
          // met en file et vide par lots, et le rechargement emporte la file.
          trackEvent(GESTES.MAJ, { etape: 'appliquee' });
          void update();
        },
        'aria-disabled': updating || undefined,
        'aria-busy': updating || undefined,
        'data-dwc': 'update-banner-update',
      },
      updating
        ? (updatingLabel ?? labels.updating)
        : (updateLabel ?? labels.update)
    ),
    // `update-banner-dismiss` DÉSIGNE TOUJOURS LE MÊME BOUTON : celui de
    // toujours, à sa place de toujours, avec son action de toujours (le report
    // dès que `snoozeHours > 0`, malgré son nom). `'both'` n'en change ni le
    // libellé ni le comportement — il AJOUTE seulement le suivant. Deux apps
    // habillent ce sélecteur dans leur CSS ; opter pour deux sorties ne doit
    // rien leur décoiffer.
    h(
      'button',
      {
        type: 'button',
        onClick: onSecondary,
        'data-dwc': 'update-banner-dismiss',
      },
      secondaryLabel
    ),
    bothExits
      ? h(
          'button',
          {
            type: 'button',
            onClick: dismiss,
            'data-dwc': 'update-banner-ignore',
          },
          ignoreLabel ?? labels.ignore
        )
      : null
  );
}

/**
 * Autonome : c'est CE composant qui monte le hook, et lui seul.
 *
 * `snoozeKey` est une PROP depuis la vague du 30/08/2026. Le bandeau lisait
 * toujours la clé du socle : `mister-puzzle`, qui reportait sous une clé à lui,
 * a dû verser son report en cours dans celle du socle au chargement du module —
 * sans quoi tout report actif était oublié le jour de la migration, et le
 * bandeau revenait aussitôt chez qui avait justement demandé le silence.
 */
function StandaloneBanner(props) {
  const state = useUpdatePrompt({
    registerSW: props.registerSW,
    snoozeHours: props.snoozeHours ?? DEFAULT_SNOOZE_HOURS,
    snoozeKey: props.snoozeKey,
    updateOptions: props.updateOptions,
    onRegisterError: props.onRegisterError,
    onNeedReload: props.onNeedReload,
    onRegisteredSW: props.onRegisteredSW,
    onRegistered: props.onRegistered,
  });
  // C'est ce mode — et lui seul — qui possède l'enregistrement, donc c'est ici
  // que la vérification périodique a sa place. Sous `AppUpdates`, le
  // fournisseur la tient déjà : la relancer ici doublerait l'intervalle.
  useUpdateCheck(props.checkEvery);
  return h(Banner, { ...props, ...state });
}

/**
 * Aiguillage. Sous `AppUpdates`, le bandeau lit l'état du fournisseur : écarter
 * le bandeau et cliquer le bouton des réglages parlent alors du même état.
 * Hors fournisseur, il s'enregistre lui-même à partir de `registerSW`.
 *
 * @param {import('./update-prompt-banner.js').UpdatePromptBannerProps} props
 */
export function UpdatePromptBanner(props = {}) {
  const shared = useAppUpdates();
  if (!shared) return h(StandaloneBanner, props);
  return h(Banner, { ...props, ...shared });
}
