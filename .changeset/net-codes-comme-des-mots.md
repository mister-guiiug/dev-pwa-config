---
'@mister-guiiug/dev-pwa-config': patch
---

`react/net` : `isTransientMessage` lit les codes de Node (`ECONNREFUSED`, `ECONNRESET`, `ENOTFOUND`) comme des mots, plus à l'intérieur d'un mot. Relevé par miss-arcade (07/11/2026) : « borne non reconnue », le refus 403 d'un jeton révoqué, contient « econn » (r-econn-ue). Il était classé coupure réseau, donc rejoué sans fin par une file d'envoi qui s'en servait comme `shouldRetry`. « Utilisateur non reconnu » ou « code non reconnu » tombaient dans le même piège.
