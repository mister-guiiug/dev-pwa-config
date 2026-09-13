---
'@mister-guiiug/dev-pwa-config': minor
---

**`pwa-icons` produit `apple-touch-icon.png`.**

`pwa-doctor` réclamait déjà la balise `<link rel="apple-touch-icon">` en
annonçant « pwa-icons la génère ». C'était faux : le générateur s'arrêtait à
`icon-<taille>.png` et `icon-maskable.png`. Le socle se contredisait lui-même,
et chaque application se débrouillait — un relevé des vingt-et-un sites en ligne
trouve **six conventions différentes** pour cette seule balise, et cinq
applications qui n'en ont aucune.

Elle est écrite **par défaut**, contrairement au maskable qui reste sur
demande. Les deux ne se valent pas : Android lit le manifeste et se rabat sur
une icône `any` quand le maskable manque, tandis qu'iOS n'a que la balise
`<link>` — sans ce fichier, il met une capture d'écran de la page sur l'écran
d'accueil. `--no-apple` la retire, `--apple-size` la redimensionne (180 par
défaut).

C'est la seule icône du lot à être **opaque**. iOS ignore la transparence et
compose un PNG à canal alpha sur du NOIR : une icône claire à fond transparent
arrive cernée de sombre sur l'écran d'accueil alors qu'elle est correcte
partout ailleurs. Le `flatten` la pose sur la couleur `--bg`.

Au passage, le script ne lance plus `main()` à l'import : il passe par
`estPointDEntree`, comme les autres bins du socle, et exporte `parseArgs` —
ce qui rend ses options testables sans `sharp`.
