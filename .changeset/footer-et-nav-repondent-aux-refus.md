---
'@mister-guiiug/dev-wpa-config': minor
---

`AppFooter` et `BottomNav` : répondre aux deux refus argumentés

Deux apps de la famille refusaient de migrer, et **avaient écrit pourquoi dans
leur propre fichier**. Ce sont les deux dernières dettes du relevé, et les deux
seules argumentées. Leurs demandes sont ici.

**`AppFooter` gagne `children` et `links`.** L'en-tête de
`miss-contraction/src/react/components/layout/AppFooter.tsx` dresse le tableau :
sur ses quatre éléments, le pied de page du socle n'en couvrait qu'un.

- `children`, rendu EN PREMIER — l'avertissement médical n'avait aucun
  emplacement. Le remplacer l'aurait sorti du repère de pied de page, et
  l'imbriquer était interdit (`<footer>` ne peut pas descendre d'un `<footer>`).
  Sur une app qu'on ouvre pendant un accouchement, « cet outil ne remplace pas
  un avis médical » n'est pas décoratif : c'était un blocage complet.
- `links` — son lien « À propos » est un `Link` de routeur vers `/a-propos`,
  quand `repoUrl` rend un `<a target=_blank>` vers GitHub. Ce composant ne
  dépend d'aucun routeur et ne peut pas en fabriquer un, mais il peut en
  accueillir.

**`BottomNav` gagne `trailing` et `item.className`.** La dernière ligne de son
`BottomNav.tsx` est une demande textuelle : « À DEMANDER AU SOCLE si la
migration doit un jour aboutir : un emplacement libre en fin de barre
(`trailing`), et une accroche d'habillage par élément. »

- `trailing` — sa cinquième cellule n'est pas une destination : c'est un
  `<button>` qui ouvre le tiroir de l'app. Le bouton « Plus » interne lui
  ressemble mais fait autre chose (il déplie _son_ tiroir d'onglets en
  surnombre) : même balisage, autre mécanique.
- `item.className` — son appel maternité est un bouton d'action, pas un onglet.
  `key` ne descend pas dans le DOM, et un sélecteur sur le `href` ne tiendrait
  pas : les chemins sont traduits dans sept langues.

Les quatre ajouts sont **additifs** : les six apps qui importent déjà ces
composants ne changent pas d'un pixel, et un test l'exige pour chacun. Sept
tests neufs, quatre garanties vérifiées par mutation.
