---
'@mister-guiiug/dev-pwa-config': minor
---

**ESLint 10 est autorisé — et la recette qui le permet tient en trois gestes, pas
deux.**

Les peers `eslint` et `@eslint/js` acceptent désormais `^9.39.4 || ^10.0.0`, et
le socle tourne lui-même en `eslint@10.10.0` / `@eslint/js@10.0.1` : installation
propre sans `--legacy-peer-deps`, lint vert, 1363 tests verts sur Node 22 et 24.
ESLint 9 est sorti du support et l'annonçait à chaque installation depuis des
mois.

**Ce que la première tentative avait raté**, et que la CI a refusé : élargir les
peers ne suffit pas. La plage élargie autorise la 10, npm prend donc la plus
haute, et bute sur `eslint-plugin-jsx-a11y@6.10.2`, qui plafonne à `^9` —
`ERESOLVE`. Une app qui déclare `eslint` elle-même n'est pas touchée ; celle qui
s'en remet à la peer du socle, si.

**Et l'override seul est INERTE.** `$eslint` désigne la plage que le projet
racine déclare en dépendance directe : sans déclaration, il ne renvoie à rien.
D'où trois gestes côté app, et non deux :

```json
"devDependencies": {
  "eslint": "^10.10.0",
  "@eslint/js": "^10.0.1"
},
"overrides": {
  "eslint-plugin-jsx-a11y": { "eslint": "$eslint" }
}
```

**Éprouvé de bout en bout** sur `pwa-starter-kit`, installé sur le paquet
candidat : `npm install` résout sans forcer, puis lint (ESLint 10), `tsc -b`, ses
28 tests, son build, son budget de poids et `pwa-doctor --strict` passent tous —
0 défaut, 0 dette, 0 info.

**Ce que ça demande aux apps.** Celles qui déclarent déjà `eslint@^9.39.4` : rien,
elles montent quand elles veulent. Celles qui s'en remettent à la peer du socle :
les trois gestes, sans quoi leur prochain `npm install` échoue. `ESLINT-10.md`
porte la recette corrigée et l'ordre des opérations qui va avec.
