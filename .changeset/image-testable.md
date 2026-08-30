---
'@mister-guiiug/dev-wpa-config': minor
---

`image` — le module est enfin testable, et deux défauts que trois adoptions ont
mis au jour sont corrigés.

**La même option, deux défauts différents.** `stripImageMetadata` lisait
`IMAGE_MAX_DIMENSION` (2048) quand `compressImageToMaxBytes` codait `2560` en
dur, sous le même nom d'option `maxDimension`. La divergence est désormais
**intentionnelle et nommée** : `IMAGE_COMPRESS_START_DIMENSION` est exportée, et
son en-tête dit pourquoi elle dépasse le plafond d'affichage — viser un budget
d'octets autorise à partir plus haut, et l'unifier silencieusement à 2048
dégraderait les photos de `miss-carbook`, dont la compression est promue ici. Un
test empêche qu'on les « corrige » en les rapprochant.

**Le DOM est isolé derrière deux coutures.** `render` et `encode` sont
injectables, et la géométrie devient une fonction pure exportée, `fitWithin`.
Ces fonctions n'avaient aucun test au-delà de leur partie pure — non par oubli,
mais parce que `createImageBitmap` est absent de jsdom : simuler un canvas
aurait donné des tests ne prouvant que leur propre bouchon. La décision — quelle
taille, quelle qualité, quand s'arrêter — se vérifie maintenant sans lui, en
18 tests. Le dessin reste hors de portée, et c'est écrit.

`fitWithin` publie les trois garanties qui étaient jusqu'ici implicites : jamais
d'agrandissement, plancher à 1 px sur chaque côté (une bande 1 × 5000 arrondit
sa petite dimension à 0, et un canvas de largeur nulle fait échouer `toBlob`
sans rien dire), rapport d'aspect conservé.

`compressImageToMaxBytes` accepte en outre une horloge `now`, pour que le
`lastModified` produit soit stable en test.

**En-tête corrigé.** Il affirmait que la contribution de `mister-puzzle` était
« couverte par les deux précédentes ». Sa migration (#15) a prouvé le
contraire : sa sortie doit être une **chaîne** (Firebase RTDB ne stocke pas de
binaire) et son budget se compte en **caractères de base64**, pas en octets. Le
dernier maillon reste légitimement chez elle.

Aucune rupture : les appels existants gardent leur comportement, les coutures
sont facultatives.
