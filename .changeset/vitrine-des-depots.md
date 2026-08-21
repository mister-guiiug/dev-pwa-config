---
'@mister-guiiug/dev-wpa-config': minor
---

Vitrine des dépôts de la famille : catalogue à facettes, `FamilyApps` étendu, miroir engendré pour le showroom.

**`apps-catalog` — quatre facettes et six helpers.** Chaque app porte désormais
`category` (domaine éditorial), `backend` (persistance **relevée** dans son code)
et `platform` (`web` par défaut, `desktop` pour l'app Electron). `backend` est
laissé **absent** quand il n'a pas été relevé : un filtre qui affiche « non
relevé » vaut mieux qu'une donnée devinée. Nouveaux exports `appById`,
`sortApps`, `filterApps`, `countBy`, plus les constantes `MATURITIES`,
`MATURITY_ORDER`, `CATEGORIES`, `BACKENDS`, `PLATFORMS`. La recherche de
`filterApps` ignore les diacritiques (« molkky » trouve « Mölkky ») et exige
tous les mots. Aucun champ existant n'a changé de forme.

**`FamilyApps` — le dépôt devient atteignable depuis la carte.** Nouvelles props
`showRepoLinks` (lien GitHub par carte), `sort` (`curated | maturity | name`) et
`max` (coupe **après** le tri). `showRepoLinks` est opt-in : sans lui, le DOM
produit est identique à celui des versions précédentes. Avec lui, la carte porte
deux ancres **frères** — l'application et son dépôt —, jamais imbriquées. Chaque
`<li>` expose les facettes du catalogue (`data-maturity`, `data-category`,
`data-backend`, `data-platform`), stylables sans réimplémenter la grille.
`components.css` habille les nouveaux sélecteurs `family-app-item` et
`family-app-repo`, cible tactile de 2,75 rem comprise.

**Showroom — une section « Les applications de la famille ».** Les seize dépôts
en une grille : recherche, trois axes de filtres croisés affichant le compte
qu'ils donneraient, tri, liens app + dépôt, et un bouton qui rhabille la page
entière avec la palette de l'app. L'état de la vitrine entre dans l'URL, donc se
partage. Les pastilles sont peintes avec la primaire réelle de chaque app :
aucune icône distante, la page ne fait toujours aucune requête réseau.

**Anti-dérive.** `npm run showroom:sync` (`scripts/sync-showroom.mjs`) engendre
`showroom/apps.js` depuis le catalogue et recopie `components.css` ;
`test/apps-catalog.test.mjs` refuse un miroir périmé et vérifie que les comptes
annoncés par la section « Stack » (6 Supabase, 3 Firebase, 5 local-first)
collent au champ `backend`.
