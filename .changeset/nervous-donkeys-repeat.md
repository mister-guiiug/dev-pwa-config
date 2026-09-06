---
'@mister-guiiug/dev-pwa-config': minor
---

**`pwa-bindings` : les binaires natifs du poste, aux versions du lockfile.**

Là où le `.npmrc` d'une app épingle `os=linux` — pour que le lockfile reste
celui de la CI —, `npm ci` n'installe aucun binaire natif Windows ou macOS, et
`tsc`, les tests et le build s'arrêtent sur « Cannot find native binding ». La
parade circulait de main en main, jamais écrite dans un dépôt, et **sans numéro
de version** :

```bash
npm i --no-save @rolldown/binding-win32-x64-msvc lightningcss-win32-x64-msvc …
```

Or `npm i <nom>` installe la DERNIÈRE version publiée, pas celle que le lockfile
a résolue : le poste fait alors tourner un compilateur que la CI n'a jamais vu.

Mesuré sur `mister-footcoach` le 06/09/2026 : `@rolldown/binding-win32-x64-msvc`
**1.2.7** posé là où le lockfile disait **1.1.5**. Le transformeur de 1.2.7
conserve davantage de commentaires à travers la transformation JSX, donc des
indices `istanbul ignore` qui ne survivaient pas survivaient — et
`ast-v8-to-istanbul` retire du rapport le sous-arbre annoté. Deux fichiers y
perdaient une région entière, **entièrement couverte** : 75.67 / 74.83 / 71.18 /
76.13 sur le poste contre 75.72 / 75.22 / 71.26 / 76.18 en CI. Les seuils de
couverture de l'app, calés sur le poste, étaient donc la mesure exacte d'une
installation abîmée — et la CI restait verte en gardant la mauvaise référence.

`npx pwa-bindings` lit `package-lock.json` et pose ce qu'il y trouve, épinglé.
La liste des paquets n'est pas écrite : est retenue toute entrée dont les
contraintes `os` / `cpu` / `libc` désignent ce poste — exactement ce que npm
aurait installé sans le `.npmrc`. C'est ce qui permet de rester juste quand les
versions diffèrent d'une app à l'autre (le même jour, `@rolldown/binding` valait
1.0.3 sur `miss-uwh`, 1.1.5 sur `mister-footcoach`, 1.2.5 ici) et à la première
montée de version. `--dry-run` imprime la commande sans l'exécuter.
