---
'@mister-guiiug/dev-wpa-config': minor
---

`AppFooter` gagne `after`, et `linkComponent` cesse d'interdire ce qu'il recommande

**Les deux corrections viennent d'une migration réelle**, pas d'une revue.

**`after` — le troisième emplacement.** La 3.31.0 ajoutait `children` et
`links` en pensant couvrir le pied de page de miss-contraction, son tableau de
besoins à l'appui. La migration a buté sur le quatrième élément : son numéro
n'est pas `version` mais `deploymentVersion`, de la forme `1.2.3+1756…`, et
`AppVersion` passe par `formatVersion`, qui **supprime le `+buildId`**. Or
c'est lui, et lui seul, qui permet de vérifier qu'un déploiement a pris — sans
lui, deux bundles différents affichent la même chaîne.

`version` n'était donc pas un remplacement, et aucune combinaison de `children`
et `links` ne place un paragraphe **en dernier** ; un `order` CSS aurait menti à
l'ordre de lecture. `after` rend sous les liens et le numéro.

Deux emplacements conçus depuis un tableau de besoins en couvraient trois sur
quatre. C'est en migrant qu'on l'a su.

**`linkComponent` était typé `ComponentType<Record<string, unknown>>`**, qui
refuse tout composant à prop obligatoire — donc précisément le `Link` de
react-router et son `to`, l'usage que sa propre documentation recommande.
**Cinq apps portaient la même conversion**, avec le même commentaire : « c'est
l'usage documenté du socle ». Un type qui interdit ce que sa documentation
recommande est un défaut du type. Il devient `ComponentType<any>`, et les cinq
casts peuvent partir.

Aucun changement de comportement : `after` est optionnel, et l'élargissement
d'un type n'invalide aucun appel existant.
