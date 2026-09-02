---
'@mister-guiiug/dev-wpa-config': patch
---

Renovate hébergé par le socle. Aucun des dix-huit dépôts n'avait jamais reçu
une PR de Renovate : treize apps étendaient un préréglage dans un dépôt
`.github` qui n'existe pas, et l'application n'était pas installée. Le
préréglage vit désormais dans `renovate/default.json` (les apps l'étendent par
`github>mister-guiiug/dev-wpa-config//renovate/default.json`), et
`.github/workflows/renovate.yml` fait tourner Renovate auto-hébergé le samedi
matin sur tous les dépôts du compte qui portent une configuration — jamais le
miroir `mister-family-map`. Il faut un secret `RENOVATE_TOKEN` ; sans lui le
workflow le dit et s'arrête.
