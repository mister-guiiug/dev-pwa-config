---
'@mister-guiiug/dev-pwa-config': minor
---

**ESLint 10 devient possible pour le parc, et les plafonds cessent d'être invisibles.**

`npm install` du socle affichait depuis des mois : _« npm warn deprecated
eslint@9.39.5: This version is no longer supported »_. La 9 est sortie du
support, la 10 est publiée, et aucune app ne pouvait monter — les peers du
socle déclaraient `^9.39.4` seul.

Elles déclarent maintenant **`^9.39.4 || ^10.0.0`** (`eslint` et `@eslint/js`).
Les deux plages, pas seulement la 10 : une app qui ne change rien continue
d'installer sa 9 sans rien voir. Pour monter, deux gestes, dont l'override qui
lève la déclaration périmée du seul paquet de la chaîne à s'arrêter à `^9` —
son code, lui, fonctionne sous ESLint 10 :

```json
"overrides": { "eslint-plugin-jsx-a11y": { "eslint": "$eslint" } }
```

**Le socle est monté ainsi, il ne le décrit pas.** Installation propre, sans
`--legacy-peer-deps`, `eslint@10.10.0` et `@eslint/js@10.0.1`, lint vert. Ce
qui coûte, c'est `no-useless-assignment`, entrée dans `recommended` : **dix
occurrences** ici — `ESLINT-10.md` en annonçait sept le 03/09, le parc a bougé
depuis — toutes du même motif, `let x = valeur;` réaffecté dans un `try` sans
que la valeur de départ soit jamais lue. Corrigées en déclarant `let x;`, sans
changement de comportement.

**Et l'instrument qui empêche la liste de se reformer.** `node
scripts/plafonds.mjs` compare chaque plage déclarée à la version publiée sous
`latest` et ne retient que les plafonds qui excluent la majeure courante. Le
premier relevé en a trouvé neuf, dont ESLint ; sept restent, chacun étant
désormais soit une décision écrite, soit un chantier nommé :
`@commitlint/cli` et sa config (19 → 21), `@testing-library/jest-dom` (6 → 7),
`vitest` et `@vitest/browser` (4 → 5), `typescript` (~6.0.3 → 7), `web-vitals`
(4 → 6). Le workflow `Plafonds` le rejoue chaque lundi et sur toute PR qui
touche `package.json`, et **reste vert** : un plafond assumé n'est pas un
défaut, il doit seulement rester une décision. Personne ne les regardait, faute
de `RENOVATE_TOKEN` — c'est ce trou que la sonde ferme, sans jeton.

**La CI du socle éprouve enfin ce qu'il promet.** `engines` dit `>=22` et seul
Node 22 était joué : le job `validate` tourne maintenant sur **22 et 24**. Les
1301 tests passent sur les deux.

**Ce que ça change pour les apps.** Rien, tant qu'elles n'y touchent pas. Celle
qui veut monter suit les deux gestes ci-dessus ; le dossier complet, avec la
mesure des trois règles entrantes, est dans `ESLINT-10.md`.
