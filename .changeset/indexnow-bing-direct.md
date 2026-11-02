---
'@mister-guiiug/dev-pwa-config': patch
---

IndexNow : le job `indexnow` de `pwa-deploy.yml` envoie aussi la liste à `www.bing.com/indexnow`, en plus du relais `api.indexnow.org` qui perdait des envois quand plusieurs apps signalaient presque en même temps. Chaque réponse sort en annotation (`::notice::`).
