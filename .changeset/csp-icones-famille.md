---
'@mister-guiiug/dev-pwa-config': minor
---

`img-src` nomme l'origine de la famille — et l'icône de Mölkky maigrit de 1,28 Mo

Relevé le 20/09/2026 sur `miss-badminton`, serveur de développement, dans la
console du navigateur :

```
Loading the image 'https://mister-guiiug.github.io/mister-footcoach/logo.svg'
violates the following Content Security Policy directive:
"img-src 'self' data: blob:". The action has been blocked.
```

Dix-huit fois, pour un seul écran : la grille « Nos autres applications » de
`FamilyApps` va chercher l'icône de chaque app sœur sur l'origine du parc.

**La production n'a jamais été touchée, et c'est le cœur de l'affaire.** Les
sites du parc SONT servis depuis `https://mister-guiiug.github.io` : `'self'`
désigne déjà cette origine, et les icônes se chargent — vérifié dans un
navigateur sur le site publié de `miss-badminton`, 18 sur 18. Ce qui échouait,
c'est tout ce qui tourne en LOCAL, où la même politique désigne `localhost` :
le serveur de développement des dix-sept apps publiées qui affichent la grille,
et `vite preview` sur leur build.

`cspPlugin` ajoute donc `FAMILY_ORIGIN` à `img-src`, en dev comme en prod. La
politique déployée ne s'en trouve pas élargie — elle autorisait déjà cette
origine sous un autre nom ; ce qui change, c'est que le local dit enfin la même
chose que le déployé. Aucune option à poser : une case à cocher de plus, c'est
vingt applications à modifier et une à oublier. Une liste qui vaut `["'none'"]`
est laissée intacte, `'none'` devant rester seul.

`mister-doc` y était arrivé le premier, **dans sa copie locale du plugin**, avec
le bon commentaire (« en prod `'self'` suffit (même origine), l'entrée explicite
sert au dev local »). Seize autres dépôts ont continué de cracher la même erreur
pendant ce temps : c'est le défaut de la copie locale, pas celui de l'analyse.

**Et une autre découverte, dans le même écran.** `mister-molkky` était inscrit au
catalogue avec `logo.png` — **1 276 707 octets**, 1,28 Mo pour une vignette de
40 px, le seul fichier du catalogue à dépasser 8 ko. Il partait vraiment sur le
réseau, en production, chez les seize apps sœurs, à chaque ouverture de leur
écran Paramètres. Le catalogue pointe désormais `icons/icon-192.png`, que l'app
déclare elle-même dans son `index.html` : 23 663 octets, cinquante-quatre fois
moins. Rien ne mesurait ce poids — un budget de bundle ne voit pas ce qui part
chez le voisin.

Nouveauté d'API : `FAMILY_ORIGIN` est exporté par `apps-catalog`. `pagesUrl` en
dérive, pour que l'origine ne s'écrive qu'une fois.
