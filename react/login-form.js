import { createElement as h, useId } from 'react';
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
 * Le formulaire de connexion : e-mail, mot de passe, un bouton, une erreur.
 *
 * PROMU, PAS INVENTÉ. Quatre apps ont le même écran — `LoginPage` de miss-uwh
 * (64 l.), mister-footcoach (58) et mister-doc (166), `LoginScreen` de
 * miss-lookhouse (170) — deux champs, un bouton, une erreur traduite, sur
 * `Card` + `TextField` + `Button`, dont trois importent déjà les deux
 * derniers du paquet. Ce qui diffère est AUTOUR : doc ajoute l'inscription
 * et la passkey, lookhouse le garde réseau. Ce composant rend le formulaire,
 * et laisse deux emplacements pour le reste : `children` (des champs de
 * plus, avant le bouton — le nom affiché à l'inscription) et `footer`
 * (après — passkey, lien de confidentialité, mot de passe oublié).
 *
 * TROIS MODES. `signin` et `signup` portent le mot de passe ; **`otp`** n'a
 * qu'un champ e-mail et un bouton « Recevoir un lien » — la connexion par
 * lien à usage unique, que les deux applications ayant écrit un écran de
 * compte en septembre 2026 (miss-carbook, mister-miss-koh) ont choisie :
 * l'application ne voit passer aucun secret et n'en stocke aucun. En `otp`,
 * `onSubmit` reçoit `{ email, password: '' }` — le type ne change pas — et
 * l'appelant fait `signInWithOtp({ email, emailRedirectTo })`.
 *
 * DEUX RÉGLAGES QUE LE LIEN EXIGE, hors de ce composant : `flowType: 'pkce'`
 * sur le client dès que l'application route par `#` (le flux implicite met
 * le jeton dans le FRAGMENT, exactement là où le routeur lit la route — il
 * le remplacerait par « / » avant qu'il ait servi), et la liste d'URL
 * autorisées du projet, qui ne contient que `http://localhost:3000` à la
 * création. Les deux échouent en silence.
 *
 * PRÉSENTATIONNEL. Il ne connaît ni le port ni l'adaptateur : `onSubmit`
 * reçoit `{ email, password }`, l'appelant fait `signIn` et redonne `busy` et
 * `error` — une chaîne DÉJÀ traduite (`frAuthError`, ou l'i18n de l'app).
 * L'erreur est rendue dans un `role="alert"` à part, pas accrochée au champ :
 * « identifiants invalides » concerne les deux.
 *
 * NON CONTRÔLÉ, ET C'EST VOULU. Les valeurs sont lues dans `FormData` à la
 * soumission, pas tenues dans un état React. Les quatre copies étaient
 * contrôlées, et c'est un piège connu des écrans de connexion : un
 * gestionnaire de mots de passe qui remplit les champs sans émettre `input`
 * laisse l'état React vide, et l'utilisateur soumet un formulaire qu'il voit
 * rempli. Le DOM est la source de vérité ; il l'est aussi pour le navigateur.
 *
 * Non stylé : cibler `[data-dwc="login-form"]`, ou importer `components.css`.
 *
 * @param {{
 *   onSubmit?: (values: { email: string, password: string }) => void,
 *   busy?: boolean, error?: string | null, mode?: 'signin' | 'signup' | 'otp',
 *   title?: import('react').ReactNode | null, titleAs?: string,
 *   emailLabel?: string, passwordLabel?: string, submitLabel?: string,
 *   minPasswordLength?: number, initialEmail?: string, className?: string,
 *   children?: import('react').ReactNode, footer?: import('react').ReactNode,
 * }} props `title: null` retire le titre (l'écran en a déjà un).
 */
export function LoginForm(props = {}) {
  const {
    onSubmit,
    busy = false,
    error = null,
    mode = 'signin',
    title,
    titleAs = 'h1',
    emailLabel,
    passwordLabel,
    submitLabel,
    minPasswordLength = 8,
    initialEmail = '',
    className,
    children,
    footer,
  } = props;

  const labels = useLabels('auth');
  const signup = mode === 'signup';
  const otp = mode === 'otp';

  const heading =
    title === undefined
      ? otp
        ? labels.otpTitle
        : signup
          ? labels.signUpTitle
          : labels.title
      : title;

  const submit = event => {
    event.preventDefault();
    // Une seconde soumission pendant la première est un double-clic, pas une
    // intention : on l'ignore, le bouton l'annonce déjà par `aria-busy`.
    if (busy) return;
    const data = formDataOf(event.currentTarget);
    onSubmit?.({
      email: String(data.get('email') ?? '').trim(),
      password: otp ? '' : String(data.get('password') ?? ''),
    });
  };

  const titreId = useId();

  return h(
    'form',
    {
      'data-dwc': 'login-form',
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
      ? h(titleAs, { id: titreId, 'data-dwc': 'login-form-title' }, heading)
      : null,
    h(TextField, {
      label: emailLabel ?? labels.email,
      type: 'email',
      name: 'email',
      inputMode: 'email',
      // `username`, pas `email` : c'est ce qu'un gestionnaire de mots de
      // passe attend pour proposer l'identifiant enregistré. Sans mot de
      // passe à côté, `email` est le bon indice — il n'y a rien à apparier.
      autoComplete: otp ? 'email' : 'username',
      required: true,
      defaultValue: initialEmail,
    }),
    otp
      ? null
      : h(TextField, {
          label: passwordLabel ?? labels.password,
          type: 'password',
          name: 'password',
          autoComplete: signup ? 'new-password' : 'current-password',
          required: true,
          minLength: signup ? minPasswordLength : undefined,
        }),
    children,
    error
      ? h('p', { role: 'alert', 'data-dwc': 'login-form-error' }, error)
      : null,
    h(
      Button,
      { type: 'submit', block: true, loading: busy },
      submitLabel ??
        (otp ? labels.sendLink : signup ? labels.signUp : labels.signIn)
    ),
    footer ? h('div', { 'data-dwc': 'login-form-footer' }, footer) : null
  );
}
