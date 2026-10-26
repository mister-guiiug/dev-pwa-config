---
'@mister-guiiug/dev-pwa-config': minor
---

`applyUpdate` ne purge plus hors connexion. Signalé en usage le 26/10/2026 sur toutes les apps : réseau coupé, Réglages, « Recharger l'application ». La recherche de mise à jour échouait sans bruit, et la purge partait : worker désinscrit, caches vidés, puis une page d'erreur réseau jusqu'au retour du réseau.

- **La purge n'a lieu que si l'origine répond** à une requête `HEAD` vers la page courante. `navigator.onLine` ne suffit pas : il dit vrai sur un Wi-Fi sans accès. Une réponse venue d'une autre origine, celle d'un portail captif, ne compte pas.
- **Hors connexion, `applyUpdate` rend `'offline'`.** Le worker et les caches restent en place, et la page se recharge à son adresse, sans anti-cache. L'activation d'un worker qui attend reste possible : il est déjà téléchargé.
- **Nouvelles options :** `reloadWhenOffline` (défaut `true`) et `probeTimeoutMs` (défaut 800 ms).
- **`useUpdatePrompt` et `UpdateButton` ne rechargent pas hors connexion.** Le hook expose `offline`, et le bouton affiche le nouveau libellé `update.forceOffline`, traduit dans les huit langues.

La purge d'une app n'emporte plus le worker du hub. Sa portée `/` couvre toutes les pages de l'origine, et il était pris pour celui de l'app.

- **Seul le worker qui contrôle la page est désinscrit**, celui de la portée la plus précise. `unregisterServiceWorkers` suit la même règle.
- **Un cache est épargné quand son nom FINIT par la portée d'un autre worker.** Avant, il suffisait que le nom la CONTIENNE : la portée du hub étant le début de toutes les autres, une app qui purgeait n'effaçait plus son propre précache.
