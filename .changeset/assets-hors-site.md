---
'@mister-guiiug/dev-pwa-config': patch
---

`pwa-doctor` — nouveau défaut **`assets-hors-site`** : les scripts et feuilles
de style liés hors du chemin du site.

`miss-ticket-pwa` a servi une **page blanche du 03/06 au 06/09/2026**. Sa base
de build valait `/` alors que le site vit sous `/miss-ticket-pwa/` : Vite
écrivait `<script src="/assets/…">`, qui part de la racine de l'origine et
répond 404. Ni JS ni CSS ne se chargeaient. Build vert, CI verte, `pwa-doctor`
muet — et `run-doctor` était pourtant activé.

**Muet pour une raison précise.** `sitePrefix()` déduit le chemin du site _des
scripts eux-mêmes_ : quand ils sont faux, il se replie sur `/`, et `escapesSite`
se désarme — exactement quand il servirait. Le nouveau contrôle juge à l'aune de
la **canonique**, écrite par `pwaSeoPlugin` depuis l'URL publique déclarée, qui
ne dépend pas de la base des assets.

`htmlMarkers` expose désormais `canonicalHref` et `styles` ; `siteScope()` en
tire le chemin. Sans canonique, le contrôle **se tait** au lieu de deviner — et
`escapesSite` refuse d'accuser sur un préfixe inconnu.

Relevé sur les dix-neuf sites publiés : seul `miss-ticket-pwa` était concerné,
et il est corrigé.
