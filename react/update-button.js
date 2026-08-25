import { createElement as h } from 'react';
import { useUpdatePrompt } from './use-update-prompt.js';
import { useAppUpdates } from './app-updates.js';
import { useLabels } from './labels.js';

/**
 * Bouton « Forcer la mise à jour » des écrans de réglages.
 *
 * PROMU, PAS INVENTÉ. Six apps portent ce bouton — mister-molkky, miss-genius,
 * miss-uwh, miss-badminton, miss-lookhouse, mister-doc — avec six mécaniques
 * différentes et trois d'entre elles cassées (voir `sw-update.js`). Deux
 * (molkky, genius) affichent déjà un libellé « Mise à jour… » pendant
 * l'opération : cet état est repris ici plutôt que réinventé.
 *
 * POURQUOI UN BOUTON À PART, et pas le bandeau. Le bandeau réagit à
 * `needRefresh` : il n'apparaît que quand le navigateur a DÉJÀ vu la nouvelle
 * version. Le bouton, lui, sert quand l'utilisateur soupçonne d'être en retard —
 * c'est-à-dire précisément quand `needRefresh` est faux et que le bandeau
 * n'existe pas. Il ne demande donc pas `registerSW`.
 *
 * Non stylé : cibler `[data-dwc="update-button"]`.
 *
 * @param {{ label?: string, updatingLabel?: string, hint?: string,
 *   showHint?: boolean, className?: string, children?: unknown,
 *   updateOptions?: import('../sw-update.js').ApplyUpdateOptions }} props
 */
function Button_(props) {
  const { label, updatingLabel, hint, showHint = false, className } = props;

  const labels = useLabels('update');
  const { updating, forceUpdate } = props;
  const text = updating
    ? (updatingLabel ?? labels.updating)
    : (label ?? labels.force);

  const button = h(
    'button',
    {
      type: 'button',
      className,
      onClick: () => {
        if (updating) return;
        void forceUpdate();
      },
      'aria-disabled': updating || undefined,
      'aria-busy': updating || undefined,
      'data-dwc': 'update-button',
    },
    text
  );

  if (!showHint) return button;
  return h(
    'div',
    { 'data-dwc': 'update-button-group' },
    button,
    h('p', { 'data-dwc': 'update-button-hint' }, hint ?? labels.forceHint)
  );
}

/** Autonome : c'est CE composant qui monte le hook, et lui seul. */
function StandaloneUpdateButton(props) {
  const { updating, forceUpdate } = useUpdatePrompt({
    updateOptions: props.updateOptions,
  });
  return h(Button_, { ...props, updating, forceUpdate });
}

/**
 * Aiguillage. Sous `AppUpdates`, le bouton partage l'état du fournisseur —
 * pendant qu'une mise à jour est en cours, le bandeau ET le bouton le disent.
 * Hors fournisseur, il monte son propre hook et reste utilisable seul, ce qui
 * est justement son cas d'usage : un écran de réglages, là où `needRefresh`
 * est faux et où aucun bandeau n'existe.
 *
 * @param {{ label?: string, updatingLabel?: string, hint?: string,
 *   showHint?: boolean, className?: string,
 *   updateOptions?: import('../sw-update.js').ApplyUpdateOptions }} props
 */
export function UpdateButton(props = {}) {
  const shared = useAppUpdates();
  if (!shared) return h(StandaloneUpdateButton, props);
  return h(Button_, {
    ...props,
    updating: shared.updating,
    forceUpdate: shared.forceUpdate,
  });
}
