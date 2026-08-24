import { createElement as h } from 'react';

/**
 * Vrai hors production. Le paquet est servi tel quel, sans étape de build : on
 * ne peut pas compter sur un seul indicateur. `import.meta.env` couvre Vite,
 * `process.env` couvre Node (tests, SSR) ; les deux sont gardés par `typeof`
 * pour rester inoffensifs dans un navigateur sans bundler.
 */
function isDev() {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env.DEV === true;
  }
  return (
    typeof process !== 'undefined' &&
    process.env &&
    process.env.NODE_ENV !== 'production'
  );
}

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
 *  - `aria-busy` pendant le chargement, pour que l'état soit annoncé et non
 *    seulement dessiné, avec `aria-disabled` plutôt que `disabled` : un bouton
 *    `disabled` perd le focus, qui retombe sur `<body>` — l'utilisateur au
 *    clavier repart du début de la page au moment précis où il attend un
 *    résultat. Le double-clic reste bloqué, par le gestionnaire ;
 *  - un libellé accessible en mode icône seule, **vérifié** en développement
 *    (un avertissement console, jamais en production).
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

  // `disabled` reste vrai quand l'app le demande explicitement ; le chargement,
  // lui, passe par `aria-disabled` pour ne pas voler le focus.
  const isDisabled = disabled === true;
  const isBusy = loading === true;

  if (isDev() && iconOnly && !rest['aria-label'] && !rest['aria-labelledby']) {
    console.warn(
      '[dwc] <Button iconOnly> sans aria-label : le bouton n’a pas de nom accessible.'
    );
  }

  return h(
    'button',
    {
      ...rest,
      type,
      className,
      disabled: isDisabled,
      'aria-disabled': isBusy ? 'true' : undefined,
      onClick: event => {
        // Un bouton occupé ne doit pas pouvoir être re-déclenché : les apps qui
        // n'affichaient qu'un spinner laissaient passer le double-clic.
        if (isBusy) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }
        rest.onClick?.(event);
      },
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
