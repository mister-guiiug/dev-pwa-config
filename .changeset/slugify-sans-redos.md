---
'@mister-guiiug/dev-pwa-config': patch
---

`slugify` rogne les tirets de bord par `slice`, et non plus par l'expression `/^-+|-+$/`, que CodeQL classait en ReDoS polynomial (`js/polynomial-redos`, gravité élevée). Le résultat ne change pas, comparé sur 200 000 entrées tirées au hasard : la ligne précédente réduit déjà toute suite de séparateurs à un seul tiret, ce qui rendait l'expression inoffensive ici et permet de n'en retirer qu'un de chaque côté.
