---
'@mister-guiiug/dev-pwa-config': patch
---

`themes` : six palettes du catalogue reprennent les couleurs que leurs apps peignent vraiment (pont `--dwc-*`, mesuré en ligne le 07/10/2026). Le catalogue décrivait encore du blanc sur des primaires que les apps avaient déjà foncées : mister-doc (#0d9488, 3,7:1), mister-footcoach (#16a34a, 3,3:1), miss-ticket-pwa (#f43f5e, 3,7:1), miss-supatool (encre #052b1c, 4,4:1), miss-dice en sombre (#7c5cf6, 4,5:1 tout juste) et miss-supaboss, dont le vert de texte passe à #066a44 (miss-supaboss#142). Le showroom, qui peint ces palettes, les montrait sous le seuil AA.

L'encre posée sur la primaire (`primaryContrast`) doit désormais tenir 4,5:1, et non plus 3:1 : c'est le libellé du bouton primaire, du bouton de confirmation, de la pastille de la barre basse. Une palette qui ne le tient pas fait échouer le test.

Aucune app ne lit ces valeurs aujourd'hui (aucune ne passe `appId` à `ThemeProvider`, toutes donnent `themeColor` à `pwaManifest`) : la montée ne change rien à leur rendu.
