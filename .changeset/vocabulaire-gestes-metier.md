---
'@mister-guiiug/dev-pwa-config': minor
---

Le vocabulaire des gestes MÉTIER, et l'alarme qui empêche d'y glisser du texte libre.

Les trois gestes communs (`installation`, `maj`, `partage`) couvrent ce que le
socle possède. Restent les gestes propres à chaque application — lancer un dé,
exporter un bilan, coter un compte-rendu — que dix-huit dépôts vont poser.

**CINQ NOMS, PAS QUARANTE.** Le nom de l'application est déjà porté par
`app_name` : le détail va dans les propriétés, jamais dans le nom de
l'événement. Un nom par app et par geste rendrait la liste d'événements
illisible dès la première semaine — et c'est la première chose qu'on voit en
ouvrant le projet.

| événement      | propriétés                                      | exemple                           |
| -------------- | ----------------------------------------------- | --------------------------------- |
| `creation`     | `objet`                                         | une dépense, un lieu, un scénario |
| `export`       | `format`                                        | `pdf`, `csv`, `png`               |
| `partie`       | `etape` (`demarree`, `terminee`)                | un match, une manche              |
| `operation`    | `nom`, `etape` (`lancee`, `reussie`, `echouee`) | une analyse, une pause de projet  |
| `consultation` | `objet`                                         | là où lire EST l'usage            |

`demarree` sans `terminee` ne veut rien dire, et l'inverse non plus : c'est leur
**rapport** qui répond — combien de parties vont au bout. Et une opération qui
échoue est au moins aussi instructive qu'une réussie.

### L'alarme qui manquait

Toute la privauté de ce dispositif tient à une règle qu'aucun type ne peut
exprimer : **les propriétés ne portent que des valeurs énumérées**. Le jour où
quelqu'un écrit `trackEvent('creation', { titre: saisie })`, rien ne casse, rien
ne prévient, la CI reste verte — et du texte d'utilisateur part chez le
sous-traitant. Soit exactement ce pour quoi `autocapture` a été coupée.

`trackEvent` avertit donc, **hors production**, quand une valeur ressemble à du
texte libre.

**On ne valide PAS une liste fermée**, et c'est délibéré : le socle ne peut pas
connaître les `objet` de dix-huit applications. On détecte ce qui ne peut pas
être un jeton — une **espace**, ou plus de **quarante caractères**. Un libellé
saisi en a presque toujours ; `pdf`, `depense`, `mister-cim10` n'en ont jamais.
Viser plus large ferait crier sur `fr-FR` ou `6.1.0`, et une alarme qui crie à
tort finit ignorée.

Trois précautions : les événements de PostHog (`$pageview` et ses
`$current_url` / `page_title`) sont **exemptés**, ils portent légitimement du
texte libre ; l'alarme ne crie **qu'une fois par clé**, pour ne pas noyer la
console d'une boucle de rendu ; et **l'événement part quand même** — avertir
l'auteur est utile, l'avaler en silence serait un second défaut.
