---
'@mister-guiiug/dev-pwa-config': patch
---

`applyUpdate` ne se croit plus hors connexion quand la CSP de la page refuse la sonde. Régression de la 6.28.0, relevée le 26/10/2026 par l'e2e de miss-devises : son `connect-src` ne liste pas `'self'`, la requête `HEAD` vers la page était refusée, et « Forcer la mise à jour » ne purgeait plus jamais, même en ligne.

- **Deux sondes courent ensemble, et une seule réponse suffit :** la requête `HEAD`, et `registration.update()`. Ce dernier retélécharge le script du worker, et le navigateur le fait hors de la CSP de la page.
- **Sans réseau, les deux échouent :** la purge reste refusée hors connexion.
- Vérifié sur miss-devises en ligne, CSP en place : la 6.28.0 rendait `'offline'`, la correction purge et recharge sur `?_t=`.
