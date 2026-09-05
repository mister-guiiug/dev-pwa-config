---
'@mister-guiiug/dev-pwa-config': minor
---

`LoginForm mode="otp"` : la connexion par lien, sans champ mot de passe.

Les deux applications du parc qui ont écrit un écran de compte en septembre 2026 (miss-carbook, mister-miss-koh) passent par `signInWithOtp` ; le composant ne connaissait que le mot de passe. En mode `otp`, le formulaire ne rend qu'un champ e-mail (`autoComplete="email"`) et un bouton « Recevoir un lien », dans les sept langues du dictionnaire (`auth.otpTitle`, `auth.sendLink`) ; `onSubmit` reçoit `{ email, password: '' }` — le type ne change pas, l'appelant fait `signInWithOtp({ email, emailRedirectTo })`.

Deux réglages sans lesquels le lien ne ramène nulle part, écrits dans la documentation du module : `flowType: 'pkce'` dès que l'application route par `#` (le flux implicite met le jeton dans le fragment, là où le routeur lit la route), et la liste d'URL autorisées du projet, qui ne contient que `http://localhost:3000` à la création.
