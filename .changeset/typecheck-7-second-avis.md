---
'@mister-guiiug/dev-pwa-config': minor
---

Cohabitation TypeScript 6 + 7 : le bin `pwa-typecheck-7` et l'entrée de CI

**TypeScript 7 ne peut pas REMPLACER la 6 dans ce parc**, et ce n'est pas de la
prudence : `typescript-eslint` refuse la 7.0 par une assertion à l'import, donc
ESLint meurt pour TOUS les fichiers du dépôt, pas seulement pour les règles
typées. Sa plage de pairs le dit aussi — `>=4.8.4 <6.1.0`, canary comprise — et
le support amont ne vise que TS ≥ 7.1 (typescript-eslint#10940, ouverte).

La seule disposition qui laisse vivre les deux est celle que Microsoft documente
sous « running side-by-side with TypeScript 6.0 » :

```
typescript      ~6.0.3                 ce que typescript-eslint résout
typescript-7    npm:typescript@~7.0.2  le compilateur natif, en second avis
```

**Mesuré avant d'être outillé** : les deux compilateurs ont été passés sur les
**22 dépôts** du parc, sur le même état, et comparés diagnostic par diagnostic —
**2 174 fichiers lus, ZÉRO divergence**. La 7 accepte aujourd'hui tout ce que la
6 accepte. Le second avis ne sert donc pas à réparer quelque chose : il sert à
voir venir.

## `pwa-typecheck-7`

Promu de `miss-ticket`, seule app à avoir demandé cette disposition. Avec deux
gardes que la copie locale n'avait pas, et qui viennent chacune d'une erreur
commise en mesurant :

**GARDE 1 — un tsconfig « solution » ne compile rien.** Vingt apps du parc
type-vérifient par `tsc -b`, et leur `tsconfig.json` racine porte `files: []` +
des `references`. Un `tsc --noEmit -p tsconfig.json` y lit **zéro fichier**, sort
0, et met 130 ms : l'avis dirait « OK » sans avoir rien lu. Le bin suit donc les
références jusqu'aux projets qui portent du code. Et `--noEmit` par projet, pas
`tsc -b`, qui écrirait `.d.ts` et `.tsbuildinfo` — un second avis n'a pas à
salir la copie de travail.

**GARDE 2 — zéro fichier lu ÉCHOUE.** Le bin compte les fichiers du dépôt
réellement lus et refuse de conclure sur un compte nul. Un contrôle qui ne lit
rien et se déclare vert est pire que pas de contrôle.

L'alias absent, le message dit comment l'installer **et pourquoi en alias** :
sans ce « pourquoi », la correction naturelle est de remplacer `typescript`, ce
qui éteint le lint du dépôt.

## `pwa-ci.yml` : `run-type-check-7`

**Opt-in (défaut `false`) et NON bloquant.** Par défaut à `true`, l'étape
rendrait rouges d'un coup les vingt dépôts qui n'ont ni l'alias ni le script.

`continue-on-error` seul ne suffit pas — un pas en échec sous ce drapeau
s'affiche en gris et se rate. L'étape écrit donc son verdict dans le résumé du
job, et lève une annotation quand les deux compilateurs divergent : c'est la
divergence qui est l'information, pas le succès.

## Adopter, côté app

```
npm i -D "typescript-7@npm:typescript@~7.0.2"
```

puis `"type-check:7": "pwa-typecheck-7"` et `run-type-check-7: true` dans le
caller. `type-check` (TypeScript 6) reste le contrôle de référence.

Le prix est réel et se dit : un second compilateur par dépôt (~31 Mo installés),
et un build qui accepte ce que l'information de types du lint ne juge pas avec la
même version. Le jour où typescript-eslint#10940 se ferme, l'alias, le bin et
l'entrée de CI disparaissent ensemble.
