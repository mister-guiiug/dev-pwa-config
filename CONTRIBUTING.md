# Contribuer

Ce dépôt est le socle commun de la famille. Une modification ici part vers
**vingt dépôts** (05/09/2026) : dix-sept applications du catalogue — dont une
par son miroir —, deux qui n'y sont pas encore inscrites, et le squelette. Les
règles qui suivent existent pour ça, pas par formalisme.

## Démarrer

```bash
npm install
npm run validate   # format + lint + types + tests — ce que la CI exécute
npm run showroom   # la vitrine, sur http://localhost:4173
```

Node 22 minimum (`.nvmrc`).

## Les quatre règles du dépôt

**1. Le socle promeut, il n'invente pas.** Un composant, un hook ou une option
n'entre pas parce qu'il serait utile : il entre parce que plusieurs apps l'ont
déjà écrit chacune de leur côté. Le commentaire en tête de chaque module dit
d'où il vient (« quatre apps avaient convergé sur… ») — c'est une exigence, pas
un ornement.

**2. Promouvoir sans migrer, c'est ne pas avoir fini.** Le relevé du 23/08/2026
est sans appel : quatre exports sur vingt-deux sont réellement importés, et
douze apps sur seize gardent leurs doublons locaux. Toute promotion s'accompagne
d'un plan de migration, même court, même différé — écrit dans la PR.

**3. Ce qui est en double est ENGENDRÉ, et VÉRIFIÉ.** Cinq fichiers de ce dépôt
répètent une information qui vit ailleurs : la copie du showroom, le miroir du
catalogue, celui des palettes, le bloc JSON-LD, le tableau du README. Tous sont
produits par `npm run sync`, et un test compare chacun à sa source. Une copie
non engendrée finit toujours par diverger — c'est déjà arrivé, sur la
persistance de `miss-uwh`.

**4. Un correctif s'accompagne du test qui échouait.** Écrire d'abord le test
qui reproduit le défaut, le voir rouge, puis corriger. La perte d'écriture de la
file hors-ligne vivait dans le seul module du paquet qui n'avait aucun test :
ce n'était pas une coïncidence.

## Avant d'ouvrir une PR

```bash
npm run sync       # si un fichier engendré est concerné
npm run validate
npm run changeset  # si le contenu PUBLIÉ change (cf. `files` de package.json)
```

Pas de changeset pour ce qui ne sort pas du dépôt — showroom, workflows, README.
Le CHANGELOG le dirait à tort.

Commits au format [Conventional Commits](https://www.conventionalcommits.org/fr/)
(`feat:`, `fix:`, `refactor:`, `chore:`…), sujet en français, à l'impératif. Le
corps du message explique **pourquoi**, pas quoi : le diff dit déjà quoi.

## Relecture

`.github/workflows/` et `.github/actions/` s'exécutent dans dix-neuf dépôts,
avec leurs secrets. C'est le chemin d'escalade le plus court de la famille : ces
fichiers demandent une relecture, même pour un changement qui paraît anodin.
`CODEOWNERS` le rend explicite.

Ne jamais écrire `secrets: inherit` dans un caller : chaque workflow
réutilisable **déclare** les secrets dont il a besoin, on ne passe que ceux-là.

## Publier

**`main` est protégé : le commit de version passe par une PR**, comme les
autres. La recette en trois lignes qui poussait directement ne fonctionne plus
depuis le 01/09/2026.

```bash
npm run version-packages          # changesets → version + CHANGELOG
git switch -c chore/release-x.y.z && git commit -am "chore(release): x.y.z"
git push -u origin chore/release-x.y.z && gh pr create
```

**Fusionner en `--merge`, pas en `--squash`** : le tag doit pointer sur le
commit de version, et un squash le réécrit.

Puis, sans poser de tag à la main :

```bash
gh workflow run publish.yml --ref main
```

`publish.yml` lit alors la version dans `package.json`, **crée le tag lui-même**,
publie avec provenance sigstore, crée la release, et fait avancer le tag majeur
mobile (`v4`) que les dix-neuf dépôts consomment pour les workflows
réutilisables. Un `git push --follow-tags` reste possible — le workflow se
déclenche aussi sur `v*` — mais il suppose que le commit de version soit déjà
sur `main`.

## Accessibilité

Le paquet livre `playwright-a11y`, `jsx-a11y` et un template de suite axe-core.
Un composant qui promet une garantie d'accessibilité doit la faire vérifier par
un test : `test/react-sheet.test.mjs` monte dans un vrai DOM et vérifie le piège
de focus, Échap, la restitution du focus et le verrou du scroll. Une garantie
écrite en JSDoc et vérifiée par rien n'est pas une garantie.

## Sécurité

Une faille se signale en privé — voir [SECURITY.md](SECURITY.md).
