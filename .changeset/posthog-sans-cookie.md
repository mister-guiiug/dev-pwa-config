---
'@mister-guiiug/dev-pwa-config': patch
---

PostHog ne pose plus aucun cookie : `persistence: 'localStorage'`

Signalé le 20/09/2026 sur deux sites du parc, dans la console de Firefox :
« Le cookie "dmn_chk_01a0be81-…" a été rejeté car le domaine est invalide. »

`dmn_chk_` est la **sonde de domaine de posthog-js**. Avant d'écrire son cookie
de persistance, elle remonte l'hôte de la droite vers la gauche et pose un
cookie jetable à chaque candidat. Sur `mister-guiiug.github.io` :

```
dmn_chk_…=1;domain=.io;path=/;max-age=3         REJETÉ  (suffixe public)
dmn_chk_…=1;domain=.github.io;path=/;max-age=3  REJETÉ  (suffixe public)
dmn_chk_…=1;domain=.mister-guiiug.github.io;…   accepté, puis effacé
```

Deux refus, donc deux lignes rouges chez **chaque visiteur Firefox des dix-huit
sites qui mesurent**, à partir de leur deuxième visite.

`cross_subdomain_cookie: false` était déjà posé et ne l'empêche pas :
`PostHogPersistence.remove()` efface le cookie dans ses deux formes et porte un
`true` **codé en dur** pour la seconde. Aucune option ne le désactive ;
`remove()` tourne pendant `init`.

`persistence: 'localStorage'` coupe la branche entière — mesuré sur le morceau
déployé : douze écritures de cookie avec le défaut `'localStorage+cookie'`,
**zéro** avec celui-ci.

Ce n'est pas un pis-aller : sous un suffixe public, un cookie ne peut être que
_host-only_, c'est-à-dire exactement la portée que `localStorage` donne déjà.
La moitié « cookie » n'achète que le partage entre sous-domaines, précisément
ce qui est impossible ici. Seule perte : l'identifiant ne voyage plus dans un
en-tête de requête, ce dont aucune application du parc n'a l'usage.

`cross_subdomain_cookie: false` reste posé — il décrit l'intention et sera
honoré le jour où le parc quittera `github.io`.
