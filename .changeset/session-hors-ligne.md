---
'@mister-guiiug/dev-pwa-config': minor
---

**`auth.getSession()` n'est pas une lecture, et l'adaptateur le traitait comme
telle. Une app sans réseau démarrait sur son écran de connexion.**

Jeton d'accès périmé — et il ne vit qu'une heure — `getSession()` part le
RENOUVELER contre le réseau, avec des reprises à intervalle croissant bornées
par la fenêtre de rafraîchissement de Supabase. Sans réseau, aucune ne peut
aboutir. Mesuré sur la production de `mister-doc` le 2026-09-10 : **27 secondes
de « Chargement… », puis l'écran de connexion** — qu'on ne peut pas franchir
hors ligne. Une application dont toutes les données étaient pourtant en cache
sur l'appareil.

Le même piège attendait une porte plus loin : `getAuthenticatorAssuranceLevel()`
et tout appel PostgREST commencent eux aussi par `getSession()`, pour joindre le
jeton.

**`auth/stored-session` (nouveau sous-chemin)** lit la session écrite sur
l'appareil sans passer par la bibliothèque. Le nom de case est RECONNU
(`sb-<ref>-auth-token`), pas recalculé : reproduire la formule engagerait à la
suivre à chaque version, et imposer `storageKey` aux apps déconnecterait d'un
coup tous ceux dont la session est rangée sous l'ancien nom. La session est
rendue **même périmée** — hors ligne, un jeton expiré ne dit rien de
l'utilisateur, il dit qu'une heure a passé.

**`supabaseAuthAdapter.getSession()`** ne dépend plus du réseau pour obtenir la
session : hors ligne (`navigator.onLine === false`) il lit le stockage ; sinon
il demande à Supabase mais **borne l'attente** — nouvelle option
`sessionTimeoutMs`, 5 s par défaut. `navigator.onLine` ne protège que du cas
franc : il est vrai derrière un portail captif comme sur un Wi-Fi qui ne route
rien.

**`supabaseAuthAdapter.mfaRequired(session)`** calcule le niveau d'assurance sur
place — claim `aal` du jeton, facteurs vérifiés de la session — au lieu
d'appeler `getAuthenticatorAssuranceLevel()`. Son commentaire affirmait déjà
« aucun appel réseau » ; c'est cette phrase, plus que le code, qui a laissé la
panne s'installer. Le calcul est publié à part :
`assuranceLevelFromSession` dans `auth/mfa`.

**Le défi TOTP n'est pas contourné pour autant.** Une session en `aal1` avec un
facteur vérifié rend toujours « défi requis », sans réseau comme avec — c'est ce
qui distingue ce calcul d'un « pas de défi » de confort, et un test le fixe.

**Changement de comportement à noter** : `mfaRequired()` ne consulte plus
`auth.mfa` et ne lève plus l'erreur de l'API. Il lit la session que le port lui
tend déjà (`mfaRequired?(session)`, contrat inchangé). Une app qui truquait
`getAuthenticatorAssuranceLevel()` dans ses tests doit désormais donner un jeton
et des facteurs à sa session.
