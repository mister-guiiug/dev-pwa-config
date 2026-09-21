---
'@mister-guiiug/dev-pwa-config': minor
---

`FamilyApps` : les groupes naissent DÉPLIÉS, et le repli se souvient

**Le défaut était à l'envers.** Les groupes de `groupBy` naissaient repliés,
sur un écran qui annonce déjà « Nos autres applications » : on payait un clic
pour voir ce qu'on venait de demander. Ils s'ouvrent maintenant, tous, et le
geste de l'utilisateur est retenu.

**Le second défaut ne se voyait pas, et il coûtait plus cher : `axe` ne lit pas
un `<details>` fermé.** Toute app qui auditait sa page d'à-propos validait donc
une grille dont aucun contenu n'avait été analysé — une règle qui passe sans
avoir rien lu. Dépliés, les dix-neuf cartes entrent dans l'audit.

Le repli choisi est retenu sous **`dwc_family_groups`**, clé FAMILLE comme
`dwc_theme` et `dwc_locale`. Les applications partagent une origine : replier
« Santé » dans l'une le replie dans toutes — voulu, puisque le catalogue est le
même partout. Une clé par app obligerait à refermer dix-neuf fois le même
groupe.

Rien à changer chez les adoptants : `<FamilyApps groupBy="category" />` se
comporte désormais ainsi. Pour renoncer à la mémoire sans renoncer au
regroupement, passer `groupStorageKey={null}` — les groupes s'ouvrent alors à
chaque visite.

**L'élément reste celui du navigateur.** La mémoire n'ajoute qu'un `onToggle` :
le clavier, l'annonce « replié / déplié » et la recherche dans la page
continuent de venir avec `<details>`. Rien n'est réimplémenté, et un stockage
refusé (mode privé) ne fait que perdre le souvenir.

**La mémoire ne s'écrit que sur un geste**, jamais au montage. Sans cette
garde, le composant graverait son propre défaut au premier rendu et aucun
changement de défaut n'atteindrait plus un appareil déjà visité.

Le cas « un groupe d'un seul élément s'ouvre d'office » disparaît : tout s'ouvre,
la règle n'avait plus d'objet.

## ⚠ À vérifier chez les adoptants : les e2e qui attendaient un repli

Une spec qui affirme `[data-dwc="family-app"]` **caché** échoue désormais. Trois
existaient au 21/09/2026 — `mister-doc`, `bac-sable` et sa copie dans le miroir
`mister-family-map`. Les chercher avant de relever :

```bash
grep -rln "family-app" --include=*.spec.ts */e2e/
```

Le remède est plus court que l'ancien : la grille étant dépliée, il n'y a plus
de `summary` à cliquer avant d'appeler `axe`.
