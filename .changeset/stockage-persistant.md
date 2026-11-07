---
'@mister-guiiug/dev-pwa-config': minor
---

`persistent-storage` (nouveau) : `requestPersistentStorage()`, `isStoragePersisted()`, `storageEstimate()`. Sans stockage persistant, le navigateur peut évincer les données de l'origine pour faire de la place, et Safari les efface après sept jours sans visite tant que l'application n'est pas installée. Les applications du parc partagent l'origine : un effacement les emporte toutes. Au 07/11/2026, aucune ne le demandait.

Chaque fonction rend `null` quand l'API manque ou lève ; `requestPersistentStorage()` ne redemande pas ce qui est déjà accordé (Firefox reposerait la question).

`react/use-install-prompt` : `useInstallPrompt` demande le stockage persistant quand l'application vient d'être installée (`appinstalled`). Chromium l'accorde alors sans invite. Rien n'est demandé au chargement.
