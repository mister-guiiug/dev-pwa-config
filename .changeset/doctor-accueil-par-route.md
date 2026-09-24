---
'@mister-guiiug/dev-pwa-config': minor
---

`pwa-doctor` : l'accueil se reconnaît aussi à sa route, plus seulement à son nom de fichier

**Le défaut, relevé le 24/09/2026.** La règle des liens de la famille — code
source, soutien et signalement sur l'accueil et les Réglages, nulle part
ailleurs — ne reconnaissait l'accueil qu'au NOM DE SON FICHIER (`home`,
`accueil`, `index`, `dashboard`, `start`). Trois apps qui la respectaient à la
lettre se voyaient reprocher « un écran étranger » : leur accueil s'appelle
`ConnectionsScreen` (miss-supatool), `PlanningView` (mister-doc) ou
`ExplorePage` (mister-family-map). Les renommer pour plaire au contrôle aurait
été le monde à l'envers.

**Désormais**, l'écran qu'un routeur monte sur `/` compte comme accueil, en
plus du nom de fichier. Trois formes sont lues : `<Route path="/" element={…} />`
fermée sur elle-même (une route `/` qui a des enfants est une mise en page, et
c'est son enfant `index` qui est l'accueil), `<Route index element={…} />`, et
`{ index: true, element: … }` de `createBrowserRouter` — y compris derrière
`lazy()` et un habillage `page(…)`. Le composant est rapproché du fichier qui
l'exporte sous ce nom.

Nouvel export `composantsAccueil(texte)` : les composants montés sur l'accueil
par les routes d'un fichier.
