---
'@mister-guiiug/dev-pwa-config': minor
---

`pwa-doctor` : nouveau **défaut** `stockage-clear`. Un `localStorage.clear()` ou `sessionStorage.clear()` dans le code de l'app (tests et e2e exclus) efface les données de TOUTES les applications servies depuis `mister-guiiug.github.io`, pas seulement les siennes. Relevé le 07/11/2026 dans mister-molkky : « Tout effacer » vidait aussi le journal de contractions et les carnets des applications sœurs (corrigé par mister-molkky#161).

La correction : retirer ses seules clés, par le `clear()` du `Store` préfixé (`storage`, `versioned-store`) ou une boucle sur son préfixe.
