---
'@mister-guiiug/dev-pwa-config': minor
---

`FamilyApps` sait regrouper les cartes en replis : `groupBy`

**Dix-neuf applications à faire défiler, ça n'est plus une grille, c'est un
mur.** `groupBy: 'category'` rend un `<details>` par catégorie du catalogue,
chacun annonçant son compte : dix-neuf lignes en deviennent sept.
`'maturity'` groupe de la même façon, pour une app qui préfère séparer ce qui
est stable de ce qui ne l'est pas.

```jsx
<FamilyApps currentAppId="miss-dice" groupBy="category" />
```

**Rien ne change sans la prop.** Absente, la grille reste exactement celle
d'avant — même balisage, même CSS.

**`<details>`/`<summary>` natifs**, pas un bouton et un `aria-expanded`
maison : le clavier, l'annonce « replié / déplié » et la recherche dans la
page viennent avec, sans une ligne de JavaScript ni un état à synchroniser.

**Les groupes d'un seul élément restent dépliés.** Le catalogue en porte —
`education` n'a qu'une app. Un repli qui cache une ligne coûte un clic pour ne
rien gagner.

**Adopter ne coûte rien aux vingt apps.** La liste interne garde
`data-dwc="family-app-list"` : le CSS déjà écrit pour la grille continue de
s'appliquer à l'identique, et il n'y a que `family-app-group` à habiller —
`components.css` le fait déjà pour qui l'importe.

L'ordre des groupes suit le catalogue, pas leur taille : il ne bouge donc pas
quand une app naît. Une valeur hors catalogue, ou une facette absente, est
rendue après les autres sous son propre nom plutôt qu'avalée en silence — un
test à fixtures le tient, éprouvé par mutation.

Nouveau groupe de libellés `categories`, dans les sept langues.
