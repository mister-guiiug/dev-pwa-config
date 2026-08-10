import { createElement as h, useId } from 'react';

/**
 * Champs de formulaire labellisés et accessibles.
 *
 * miss-genius et miss-uwh avaient le MÊME fichier à la variable CSS près, et
 * mister-doc la même sémantique sous une autre forme : label lié par `id`
 * généré, aide, message d'erreur, `aria-invalid` et `aria-describedby`. C'est
 * cette convergence qu'on promeut.
 *
 * Deux détails que les copies locales n'avaient pas toutes :
 *  - `aria-describedby` référence l'aide ET l'erreur quand les deux sont
 *    présentes, au lieu de faire disparaître l'aide ;
 *  - le message d'erreur porte `role="alert"` et l'aide reste lisible.
 *
 * Non stylé : cibler `[data-dwc="field"]` et descendants.
 */

function FieldShell(props) {
  const { id, label, hint, error, className, children } = props;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;

  return h(
    'div',
    { className, 'data-dwc': 'field', 'data-invalid': error ? '' : undefined },
    h('label', { htmlFor: id, 'data-dwc': 'field-label' }, label),
    children,
    hint ? h('p', { id: hintId, 'data-dwc': 'field-hint' }, hint) : null,
    error
      ? h('p', { id: errorId, role: 'alert', 'data-dwc': 'field-error' }, error)
      : null
  );
}

// `aria-describedby` accepte plusieurs id : on garde l'aide visible même en
// erreur, plutôt que de la remplacer.
function describedBy(id, hint, error) {
  const ids = [];
  if (hint) ids.push(`${id}-hint`);
  if (error) ids.push(`${id}-error`);
  return ids.length ? ids.join(' ') : undefined;
}

function useFieldIds(props) {
  const generated = useId();
  const id = props.id ?? generated;
  return {
    id,
    'aria-invalid': props.error ? 'true' : undefined,
    'aria-describedby': describedBy(id, props.hint, props.error),
  };
}

/** Champ texte (`<input>`). */
export function TextField(props = {}) {
  const { label, hint, error, className, id: _id, ...rest } = props;
  const aria = useFieldIds(props);
  return h(
    FieldShell,
    { id: aria.id, label, hint, error, className },
    h('input', { ...rest, ...aria, 'data-dwc': 'field-control' })
  );
}

/** Champ liste déroulante (`<select>`). */
export function SelectField(props = {}) {
  const { label, hint, error, className, children, id: _id, ...rest } = props;
  const aria = useFieldIds(props);
  return h(
    FieldShell,
    { id: aria.id, label, hint, error, className },
    h('select', { ...rest, ...aria, 'data-dwc': 'field-control' }, children)
  );
}

/** Champ texte multiligne (`<textarea>`). */
export function TextAreaField(props = {}) {
  const { label, hint, error, className, id: _id, ...rest } = props;
  const aria = useFieldIds(props);
  return h(
    FieldShell,
    { id: aria.id, label, hint, error, className },
    h('textarea', {
      ...rest,
      ...aria,
      'data-dwc': 'field-control',
      'data-multiline': '',
    })
  );
}
