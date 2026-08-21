---
'@mister-guiiug/dev-wpa-config': minor
---

Vitrine, deuxième vague : ce que chaque dépôt consomme du paquet, relevé plutôt que déclaré.

**`configs` — le chaînon manquant.** Chaque app du catalogue porte désormais la
liste des sous-chemins du paquet qu'elle importe réellement, obtenue en
cherchant `'@mister-guiiug/dev-wpa-config/…'` dans son code source. Nouveaux
exports `CONFIG_SUBPATHS` et `countByConfig`, nouveau critère
`filterApps({ config })`. Le relevé a immédiatement dit deux choses que
personne n'avait écrites : `components.css` n'a **qu'un adoptant sur seize**
(`miss-uwh`), et **`mister-quota` ne consomme rien du paquet** — la vitrine
affirmait pourtant que les seize dépôts en étaient consommateurs.

**Le tableau « Projets consommateurs » du README est engendré.** Il redisait à
la main ce que le catalogue sait déjà, et avait déjà divergé sur la persistance
de `miss-uwh`. `npm run sync` (ex-`showroom:sync`, désormais
`scripts/sync-generated.mjs`) régénère quatre dérivés du catalogue : le miroir
du showroom, la copie de `components.css`, ce tableau, et un bloc JSON-LD
`ItemList` posé en dur dans le `<head>` — seize `SoftwareApplication` lisibles
sans exécuter le script.

**Recherche corrigée.** Taper « supabase » ne renvoyait qu'une carte, à côté
d'une pastille annonçant « Supabase 6 » : la page se contredisait. Les facettes
et les sous-chemins entrent dans le texte cherché, sous leur identifiant comme
sous leur libellé traduit.

**Vitrine.** Quatrième axe de filtre (« Consomme… », menu déroulant avec le taux
d'adoption de chacun des dix-huit sous-chemins), vue **tableau** pour comparer
les seize lignes d'un coup d'œil, ancre `#app-<id>` par application, bouton
« copier le lien de cette vue », raccourci <kbd>/</kbd> vers la recherche, et le
détail des sous-chemins par carte. La section « Démo » a perdu son menu
d'applications : deux sélecteurs pour une seule bascule, treize apps d'un côté
contre seize de l'autre — la vitrine est le seul sélecteur.

**Palettes complètes.** `miss-dice`, `miss-ticket-pwa` et `mister-quota`
rejoignent `themes.js` : seize apps, seize palettes. Les valeurs exprimées en
`rgba()` sont composées sur le fond réel de l'app plutôt que choisies à vue, et
`accent` répète `primary` là où l'app n'a qu'un ton de marque, plutôt
qu'inventer une couleur.

**Données vivantes.** `scripts/fetch-metrics.mjs` relève l'état réel des dépôts
(version publiée, dernier push, dépôt archivé) et un workflow nocturne commite
`showroom/metrics.js`. La page ne fait toujours **aucune requête réseau** : le
relevé est posé sur `globalThis` par un `<script src>`, comme `themes.js`. Un
fichier vide est un état valide, et c'est celui qui est livré.

**Captures.** `npm run screenshots` cadre, normalise et convertit en WebP les
applications déployées ; une capture déclarée remplace le monogramme sur sa
carte et l'aperçu généré dans la section « Démo ». Aucune image n'est livrée
avec cette version.
