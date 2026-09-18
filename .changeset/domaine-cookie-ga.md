---
'@mister-guiiug/dev-pwa-config': patch
---

`initAnalytics` POSE `cookie_domain` au lieu de laisser gtag le deviner — le parc est servi sous un suffixe public.

Les vingt sites vivent sous `mister-guiiug.github.io`, et **`github.io` est inscrit à la Public Suffix List** : aucun site ne peut y poser de cookie. C'est la règle qui empêche un `mechant.github.io` d'écrire un cookie que tous les autres liraient.

Or le défaut de gtag est `cookie_domain: 'auto'`, qui commence par viser le domaine enregistrable — donc `github.io`. Firefox l'annonce au visiteur, à chaque chargement, dans sa console :

```
Le cookie « _ga_XXXXXXXX » a été rejeté car le domaine est invalide.
La valeur de l'attribut « expires » pour le cookie « _ga_XXXXXXXX » a été écrasée.
Le cookie « _ga » a été rejeté car le domaine est invalide.
```

Signalé sur `mister-puzzle` « et d'autres » — et pour cause : la ligne fautive est dans le socle, donc dans les dix-neuf apps qui mesurent.

**Mesuré dans un navigateur, sur la production**, avant d'écrire une ligne :

| `domain=`                 | résultat |
| ------------------------- | -------- |
| `.github.io`              | refusé   |
| `github.io`               | refusé   |
| `mister-guiiug.github.io` | accepté  |
| _(aucun)_                 | accepté  |

**ON NE DEVINE PAS UN SUFFIXE PUBLIC EN LISANT UNE CHAÎNE.** La liste ne se calcule pas : `github.io` en est un, `exemple.com` non, `co.uk` aussi. `domaineDeCookie()` le **mesure** donc — un cookie jetable par candidat, du plus large au plus étroit, et le premier qui tient gagne. Elle ne laisse rien derrière elle, et rend `'none'` quand rien n'est acceptable plutôt que d'inventer une valeur.

La sonde restera juste le jour où le parc passera sur un domaine à lui : elle rendra ce domaine-là, et les sous-domaines continueront de partager l'identifiant de client. C'est la raison de ne pas coder `'none'` en dur.

`domaineDeCookie` est exportée pour être éprouvée : sept tests, dont un qui vérifie que la valeur arrive bien dans la commande `config` poussée — une sonde juste dont le résultat n'atteindrait pas gtag ne servirait à rien. Vérifié à la main que ce test tombe sans le correctif.
