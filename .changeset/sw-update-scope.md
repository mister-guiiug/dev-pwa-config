---
'@mister-guiiug/dev-wpa-config': patch
---

`applyUpdate` ne renvoie plus vers une route que le serveur ignore.

Une app monopage déployée sur un hébergement statique — GitHub Pages, pour les
dix-sept apps de la famille — n'a de fichier qu'à sa racine :
`/mister-family-map/profil` n'existe pas côté serveur et ne répond que parce que le
service worker la rattrape par son `navigateFallback`. Le chemin de purge
désinscrivait le worker, **puis** rechargeait cette même URL : l'utilisateur
tombait sur la page 404 de l'hébergeur.

Reproduit sur un serveur statique sans repli : « Forcer la mise à jour » depuis
`/profil` menait à `/profil?_t=…` et à « 404 — File not found ». Le défaut ne se
voit pas en développement, où `vite preview` sert `index.html` pour n'importe quel
chemin.

La portée du worker qui contrôle la page est désormais relevée **avant** la
désinscription, et sert de destination : c'est la seule URL dont on sait que le
serveur sait la servir. Le chemin propre, lui, reste sur la page courante — le
worker n'est pas touché, et rien ne justifie de faire perdre son écran à
l'utilisateur. `reloadTo` garde le dernier mot.
