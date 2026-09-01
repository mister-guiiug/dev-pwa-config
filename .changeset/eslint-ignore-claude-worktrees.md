---
'@mister-guiiug/dev-wpa-config': patch
---

ESLint ignore `.claude/worktrees`

Un agent lancé en `isolation: worktree` checkoute **l'arbre entier du dépôt**
sous `.claude/worktrees/<nom>/`. Personne ne le voit : git masque le dossier
par `.git/info/exclude`, donc `git status` reste vide. ESLint, lui, ne lit pas
`.gitignore` — il descend dedans et lint la copie.

Le résultat est un angle mort exact :

```
$ git status          # rien à signaler
$ npm run lint        # ✖ 65 problems (47 errors, 18 warnings)
```

Sur `miss-contraction`, **les 47 erreurs venaient toutes de la copie** : son
propre code en avait zéro. On cherche longtemps un défaut dans du code qu'on ne
lit pas. Quatre dépôts de la famille en traînaient cinq, pour 2,3 Go.

L'ignore est étroit à dessein. `.claude` en entier couperait aussi ce qu'un
dépôt y écrit à la main et versionne — `launch.json`, `skills/` — alors que
seul `worktrees` est engendré par la machine. `test/configs.test.mjs` le
vérifie par l'API d'ESLint, à travers `eslint-react` (la seule config que les
apps importent), et refuse un ignore qui déborderait.

Prettier n'a pas besoin de ce correctif : depuis la 3.x il honore `.gitignore`.
Une ligne `.claude/worktrees/` **versionnée** dans le `.gitignore` de chaque
dépôt le couvre, et rend au passage visible ce que `.git/info/exclude` cachait.
