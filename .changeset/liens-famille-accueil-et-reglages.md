---
'@mister-guiiug/dev-pwa-config': minor
---

**Règle famille** : le lien **code source** et le lien **m'offrir un café** sont
visibles **sur le premier écran** et **sur À propos / Réglages**. Pas l'un ou
l'autre.

`pwa-doctor` la vérifie (`liens-famille`), et accepte les deux façons de la
tenir : `<AppFooter>` rendu dans la coquille **hors des `<Routes>`** — la
réponse du socle, un seul endroit pour tous les écrans —, ou le pied de page
rendu sur l'accueil **et** sur À propos / Réglages.

Le contrôle dépouille les routes avant de conclure : un `<AppFooter>` écrit dans
un `element={…}` ne vaut que pour cette route-là. Sans ce dépouillement, douze
apps sur dix-neuf passaient à tort.

Relevé du 05/09/2026 : **sept apps sur dix-neuf** tiennent la règle.
