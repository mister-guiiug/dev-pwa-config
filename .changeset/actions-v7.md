---
'@mister-guiiug/dev-pwa-config': minor
---

Actions GitHub : `actions/checkout` et `actions/setup-node` en `@v7`

Dans les workflows réutilisables, l'action composite `setup-pwa` et le gabarit
`templates/github-workflows/ci.yml` — qui était encore en `@v4`, si bien que
chaque application née du gabarit démarrait deux majeures en retard. Les
applications qui appellent ces workflows par l'étiquette mobile `@v6` passent
en v7 à cette publication, sans rien toucher de leur côté.

Deux ruptures annoncées entre la v5 et la v7, vérifiées **sur pièces** avant la
montée :

- **`checkout` v6 conserve les identifiants dans un fichier séparé.** `git push`
  après `checkout` doit continuer de marcher ; c'est ce que fait `publish.yml`
  pour poser son tag. Prouvé en réel : `parc-dashboard` tourne en `checkout@v7`
  depuis le 16/09/2026 et ses commits de relevé nocturne arrivent bien sur
  `main`.
- **`setup-node` v7 ne pose plus de faux `NODE_AUTH_TOKEN`.** Avec
  `registry-url`, la v5 en exportait un pour que npm ne bute pas sur le
  `${NODE_AUTH_TOKEN}` du `.npmrc`. Or `setup-pwa` ne donne le vrai qu'à
  `npm ci` : `lint`, `test` et `build` tournaient grâce au faux. Depuis npm 7,
  une variable indéfinie dans un `.npmrc` est laissée telle quelle sans
  erreur — et seules les requêtes vers GitHub Packages exigent le vrai jeton,
  que `npm ci` reçoit. Prouvé en réel : le déploiement de `mister-molkky` tourne
  en `setup-node@v7` avec `registry-url` et un `npm run build` sans jeton, et
  il est vert.

`checkout` v7 refuse aussi d'extraire la PR d'un fork sous
`pull_request_target` ou `workflow_run` : aucun workflow du socle n'utilise ces
déclencheurs.
