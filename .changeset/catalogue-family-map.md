---
'@mister-guiiug/dev-wpa-config': minor
---

`mister-family-map` entre au catalogue de la famille.

Dix-septième app : carte collaborative de sorties en famille, Supabase, maturité
`alpha`. Elle apparaît donc dans la grille `FamilyApps` des seize autres, dans le
tableau « Projets consommateurs » du README et dans la vitrine.

Sa palette rejoint `themes.js`, **relevée** dans le `src/shared/styles/index.css` de
l'app — qui exprime tout en OKLCH — et convertie en sRGB exact, pas approximée à vue.
Le rôle `info`, absent de l'app, reporte le repli de `components.css` plutôt que
d'inventer une couleur qu'elle n'utilise pas.

Deux dérivés suivent : les comptes de persistance écrits en toutes lettres dans la
vitrine passent de six à sept apps Supabase, et `showroom/adoption.js` voit son
`total` suivre le catalogue — ce champ projette le catalogue, il ne mesure rien.
Le relevé d'adoption de `mister-family-map` reste à faire : il exige les dix-sept
dépôts clonés côte à côte.
