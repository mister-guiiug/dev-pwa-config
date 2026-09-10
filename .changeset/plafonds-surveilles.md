---
'@mister-guiiug/dev-pwa-config': minor
---

**Les plafonds du socle cessent d'être invisibles — et le premier d'entre eux
s'est révélé plus coûteux que prévu.**

Une `peerDependency` est un plafond pour les vingt applications : `"vitest":
"^4.0.0"` leur interdit Vitest 5, qu'elles le veuillent ou non. Et un plafond
ne fait aucun bruit — ni au `npm install`, ni en CI, ni dans une app : il se
découvre le jour où quelqu'un tente de monter, en conflit de peers, très loin
d'ici.

`node scripts/plafonds.mjs` compare chaque plage déclarée à la version publiée
sous `latest` et ne retient que les plafonds qui excluent la majeure courante.
Le premier relevé en a trouvé **neuf** : `eslint` et `@eslint/js` (9 → 10),
`@commitlint/cli` et sa config (19 → 21), `@testing-library/jest-dom` (6 → 7),
`vitest` et `@vitest/browser` (4 → 5), `typescript` (~6.0.3 → 7), `web-vitals`
(4 → 6). Aucun n'était une décision : ils avaient cessé d'être regardés,
Renovate n'ayant jamais tourné faute de `RENOVATE_TOKEN`. La sonde ferme ce
trou **sans** jeton.

Le workflow `Plafonds` la rejoue chaque lundi et sur toute PR qui touche
`package.json`, et **reste vert** : un plafond assumé n'est pas un défaut, il
doit seulement rester une décision.

**Ce que la sonde a permis de mesurer tout de suite.** Lever le plafond
d'ESLint a été tenté puis annulé dans la même passe : élargir les peers en
`^9.39.4 || ^10.0.0` autorise npm à prendre la 10, qui bute sur le plafond de
`eslint-plugin-jsx-a11y@6.10.2` (`^9`) — `ERESOLVE` sur toute app qui ne
déclare pas `eslint` elle-même, à commencer par `pwa-starter-kit`. Le socle ne
peut pas ouvrir cette porte seul : il faut la même passe pour lui et le
squelette. Les peers restent donc en `^9.39.4`, et
[`ESLINT-10.md`](../blob/main/ESLINT-10.md) porte désormais ce que l'essai a
démenti.

**Ce qui est gardé du chantier**, parce que ça vaut dans les deux cas : les
**dix** `no-useless-assignment` du socle sont corrigés — la règle entre dans
`recommended` avec ESLint 10, et le dossier en annonçait sept le 03/09, trois
fichiers écrits depuis s'y étaient ajoutés — et les deux autres règles
entrantes sont vérifiées à zéro occurrence.

**Et la CI éprouve enfin ce que le paquet promet.** `engines` dit `>=22` et
seul Node 22 était joué : le job `validate` tourne maintenant sur **22 et 24**.
