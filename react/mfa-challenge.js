import { createElement as h, useId, useState } from 'react';
import { Button } from './button.js';
import { TextField } from './field.js';
import { useLabels } from './labels.js';

/**
 * Le `FormData` du DOCUMENT du formulaire, pas celui du processus : sous
 * Node, `globalThis.FormData` est celui d'undici et ne sait pas lire un
 * `<form>` jsdom. Dans un navigateur, les deux sont le même objet.
 */
const formDataOf = form =>
  new (form.ownerDocument?.defaultView?.FormData ?? globalThis.FormData)(form);

/**
 * Le défi MFA au login : un code TOTP à six chiffres, ou un code de secours.
 *
 * PROMU, PAS INVENTÉ. `MfaChallenge` de mister-doc (142 l., la référence :
 * deux voies, TOTP et code de secours, et une échappatoire de déconnexion) et
 * de miss-uwh (60 l., le TOTP seul). Le paquet avait la LOGIQUE (`auth/mfa`,
 * `challengeTotp`) ; il n'avait pas l'écran.
 *
 * PRÉSENTATIONNEL, comme `LoginForm` : `onVerify(code)` pour le TOTP,
 * `onRecover(code)` pour le secours — la voie n'est proposée que si
 * l'appelant la fournit, parce que les codes de secours de doc sont des RPC
 * applicatives, pas une API Supabase Auth —, `onSignOut` pour sortir. Un
 * utilisateur qui a perdu son téléphone ET ses codes doit pouvoir se
 * déconnecter plutôt que rester bloqué devant un champ.
 *
 * Le champ porte `autocomplete="one-time-code"` : iOS et Android y proposent
 * le code reçu, et `inputmode="numeric"` ouvre le bon clavier.
 *
 * Non stylé : cibler `[data-dwc="mfa-challenge"]`, ou importer
 * `components.css`.
 *
 * @param {{
 *   onVerify?: (code: string) => void, onRecover?: (code: string) => void,
 *   onSignOut?: () => void, busy?: boolean, error?: string | null,
 *   title?: import('react').ReactNode | null, titleAs?: string,
 *   digits?: number, recoveryMinLength?: number, className?: string,
 * }} props
 */
export function MfaChallenge(props = {}) {
  const {
    onVerify,
    onRecover,
    onSignOut,
    busy = false,
    error = null,
    title,
    titleAs = 'h1',
    digits = 6,
    recoveryMinLength = 8,
    className,
  } = props;

  const labels = useLabels('auth');
  const [mode, setMode] = useState('totp');
  const totp = mode === 'totp';

  const heading = title === undefined ? labels.mfaTitle : title;

  // Le champ est REMONTÉ au changement de voie (`key`) : un code TOTP à
  // moitié saisi ne reste pas dans le champ du code de secours.
  const switchMode = next => setMode(next);

  // Non contrôlé, comme `LoginForm` : le code est lu dans `FormData`. Le
  // gestionnaire de mots de passe qui colle le code sans émettre `input` est
  // exactement le cas d'un champ `one-time-code`.
  const submit = event => {
    event.preventDefault();
    if (busy) return;
    const data = formDataOf(event.currentTarget);
    const value = String(data.get(totp ? 'totp' : 'recovery') ?? '').trim();
    if (totp) onVerify?.(value);
    else onRecover?.(value);
  };

  const titreId = useId();

  return h(
    'form',
    {
      'data-dwc': 'mfa-challenge',
      // Le formulaire prend le nom de son titre — même idiome que `Sheet` et
      // `ConfirmDialog`. Sans lui, un lecteur d'écran annonce « formulaire »
      // et rien d'autre, alors que le titre est juste au-dessus. Quand
      // l'appelant rend son propre titre (`title={null}`), il n'y a rien à
      // désigner : l'attribut disparaît plutôt que de pointer dans le vide.
      'aria-labelledby':
        heading !== null && heading !== undefined ? titreId : undefined,
      'data-mode': mode,
      className,
      onSubmit: submit,
    },
    heading !== null && heading !== undefined
      ? h(titleAs, { id: titreId, 'data-dwc': 'mfa-challenge-title' }, heading)
      : null,
    totp ? h('p', { 'data-dwc': 'mfa-challenge-hint' }, labels.mfaHint) : null,
    h(TextField, {
      key: mode,
      label: totp ? labels.mfaCode : labels.mfaRecoveryCode,
      name: totp ? 'totp' : 'recovery',
      inputMode: totp ? 'numeric' : 'text',
      autoComplete: 'one-time-code',
      autoCapitalize: 'off',
      spellCheck: false,
      required: true,
      minLength: totp ? digits : recoveryMinLength,
      maxLength: totp ? digits : undefined,
      pattern: totp ? '[0-9]*' : undefined,
    }),
    error
      ? h('p', { role: 'alert', 'data-dwc': 'mfa-challenge-error' }, error)
      : null,
    h(Button, { type: 'submit', block: true, loading: busy }, labels.mfaVerify),
    onRecover
      ? h(
          Button,
          {
            type: 'button',
            variant: 'ghost',
            block: true,
            // `Button` pose son propre `data-dwc` : l'action se distingue par `data-action`.
            'data-action': 'switch',
            onClick: () => switchMode(totp ? 'recovery' : 'totp'),
          },
          totp ? labels.mfaRecovery : labels.mfaUseApp
        )
      : null,
    onSignOut
      ? h(
          Button,
          {
            type: 'button',
            variant: 'secondary',
            block: true,
            'data-action': 'sign-out',
            onClick: onSignOut,
          },
          labels.signOut
        )
      : null
  );
}
