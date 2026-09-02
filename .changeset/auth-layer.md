---
'@mister-guiiug/dev-wpa-config': minor
---

La couche auth : `react/auth-provider`, `react/login-form`, `react/mfa-challenge`

Le socle avait le **port** (`auth/index`, `auth/supabase`, `auth/mfa`,
`auth/errors-fr`), un instantané React (`react/use-auth`) et une garde
(`react/auth-gate`). Aucune des six apps n'avait adopté `useAuth`, et
`CAMPAGNE.md` notait que migrer `AuthGate` entraînerait « tout le port ». Vu
depuis les apps, il manquait trois pièces — et elles les avaient toutes
écrites, chacune de son côté :

| pièce                                                    | exemplaires                                      |
| -------------------------------------------------------- | ------------------------------------------------ |
| un contexte `signIn` / `signOut` / `session` / `loading` | uwh 161 l., footcoach 62, doc 218, lookhouse 119 |
| un formulaire e-mail + mot de passe                      | uwh 64, footcoach 58, doc 166, lookhouse 170     |
| un défi MFA                                              | uwh 60, doc 142                                  |

**`AuthProvider` / `useAuthContext`** — le contrat de footcoach, le plus
simple, rebâti sur le port : le client est créé une fois par adaptateur, les
actions rendent `{ ok, error }` et jamais une exception, la session arrive par
l'évènement du service. Sans adaptateur : mode local, `signed-out`, chaque
action rend `{ ok: false, error: { code: 'local-mode' } }`.

**`LoginForm`** — présentationnel : `onSubmit({ email, password })`, `busy`,
`error` (une chaîne déjà traduite, dans un `role="alert"` à part), `mode`
`signin` / `signup`, et deux emplacements pour ce qui diffère entre les apps :
`children` (des champs de plus) et `footer` (passkey, mot de passe oublié).

**`MfaChallenge`** — promu de mister-doc : TOTP avec le clavier numérique et
`one-time-code`, code de secours et déconnexion **seulement** si l'appelant
les fournit.

Le dictionnaire gagne le groupe `auth` — quatorze libellés, sept langues.
`components.css` habille les deux formulaires ; le showroom porte leurs
fiches ; la table d'équivalences compte `AuthContext.tsx`, `LoginPage.tsx`,
`LoginScreen.tsx` et `MfaChallenge.tsx`.
