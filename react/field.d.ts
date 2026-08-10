import type {
  FC,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';

interface FieldCommon {
  label: string;
  /** Aide affichée sous le champ. Reste lisible même en erreur. */
  hint?: string;
  /** Message d'erreur : pose `aria-invalid` et `role="alert"`. */
  error?: string;
  className?: string;
}

export interface TextFieldProps
  extends FieldCommon,
    Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {}

export interface SelectFieldProps
  extends FieldCommon,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  children?: ReactNode;
}

export interface TextAreaFieldProps
  extends FieldCommon,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> {}

/** Champ texte labellisé et accessible (`[data-dwc="field"]`). */
export declare const TextField: FC<TextFieldProps>;
/** Liste déroulante labellisée et accessible. */
export declare const SelectField: FC<SelectFieldProps>;
/** Zone de texte multiligne labellisée et accessible. */
export declare const TextAreaField: FC<TextAreaFieldProps>;
