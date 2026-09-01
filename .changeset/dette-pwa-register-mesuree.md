---
'@mister-guiiug/dev-wpa-config': patch
---

Le plus gros doublon du parc n'était pas compté

`testing/pwa-register.js` annonce dans son en-tête, depuis sa promotion, qu'il
répond au **plus gros doublon du parc** : douze dépôts portaient ce double de
`virtual:pwa-register` écrit à la main, sous trois noms de fichier différents.

`EQUIVALENTS` n'avait aucune ligne pour lui. La plus grosse duplication connue
du dépôt n'a donc jamais figuré dans le chiffre qu'on publie.

**Il n'a pas été trouvé à la main.** `scripts/adoption-candidates.mjs`, ajouté
ici, compare ce que les apps _déclarent_ à ce que le paquet _exporte_ — et l'a
sorti en tête, avec neuf apps. La table est écrite à la main, entrée par
entrée ; c'est sa force et c'est son plafond : vingt-six besoins pour cent
trente-huit sous-chemins. Ce qu'elle ignore, personne ne le voit.

L'outil sort du bruit par construction — `CATEGORIES` y apparaît pour le
tableau de score du yahtzee de miss-dice. Sa sortie est une liste de choses à
aller lire, pas un relevé.

**Et le défaut n°1 survivait dans le README.** `adoptionTable` cherchait un
symbole portant le _nom du besoin_ : dix des vingt-sept clés n'étant le nom
d'aucun export, leur colonne « Importé par » affichait zéro par construction.
`testing/pwa-register` s'annonçait `0 / 17` alors que cinq apps importent
`swStub` — cinq migrations réussies, affichées comme n'existant pas, dans le
document qui sert à convaincre. Deux autres lignes étaient fausses au passage :
`useTheme` (2 → 10) et `applyUpdate` (4 → 8).

Une règle d'acquittement ne vaut que si tout ce qui la lit l'applique.

La dette passe de 2 à **11**, et c'est le but : elle était fausse à 2.

Rien de publié ne change : outillage de développement du dépôt.
