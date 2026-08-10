import { createElement as h } from 'react';

/**
 * Bouton de la famille.
 *
 * L'API n'est pas inventée : quatre apps (miss-genius, miss-uwh, mister-doc,
 * mister-footcoach) avaient convergé indépendamment sur le même jeu de
 * variantes `primary | secondary | ghost | danger`, deux d'entre elles sur
 * `size` et `loading`. On promeut cette convergence, en ajoutant `outline`
 * (variante creuse, présente dans plusieurs maquettes).
 *
 * Ce que la version partagée garantit et que les copies locales rataient :
 *  - la cible tactile de 2,75 rem même en taille `sm` (le `sm` de footcoach
 *    faisait 32 px, son `icon` 36 px) ;
 *  - `aria-busy` + désactivation pendant le chargement, pour que l'état soit
 *    annoncé et non seulement dessiné ;
 *  - un libellé accessible obligatoire en mode icône seule.
 *
 * Non stylé : cibler `[data-dwc="button"][data-variant][data-size]`, ou
 * importer `@mister-guiiug/dev-wpa-config/components.css`.
 *
 * @param {{ variant?: 'primary'|'secondary'|'outline'|'ghost'|'danger',
 *   size?: 'sm'|'md'|'lg', loading?: boolean, block?: boolean,
 *   iconOnly?: boolean, type?: 'button'|'submit'|'reset',
 *   children?: import('react').ReactNode, className?: string }} props
 */
export function Button(props = {}) {
  const {
    variant = 'primary',
    size = 'md',
    loading = false,
    block = false,
    iconOnly = false,
    type = 'button',
    disabled,
    children,
    className,
    ...rest
  } = props;

  // Un bouton en cours de traitement ne doit pas pouvoir être re-déclenché :
  // les apps qui n'affichaient qu'un spinner laissaient passer le double-clic.
  const isDisabled = disabled === true || loading === true;

  return h(
    'button',
    {
      ...rest,
      type,
      className,
      disabled: isDisabled,
      'aria-busy': loading ? 'true' : undefined,
      'data-dwc': 'button',
      'data-variant': variant,
      'data-size': size,
      'data-loading': loading ? '' : undefined,
      'data-block': block ? '' : undefined,
      'data-icon-only': iconOnly ? '' : undefined,
    },
    loading
      ? h('span', {
          'data-dwc': 'button-spinner',
          'aria-hidden': 'true',
        })
      : null,
    children
  );
}
