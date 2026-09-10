---
'@mister-guiiug/dev-pwa-config': minor
---

**Les 56 contrôles de `pwa-doctor` sont nommés, groupés, et jouables un par
un.**

`diagnose()` faisait **617 lignes d'un seul tenant** — l'instrument le plus
exécuté du parc, lancé au `postbuild` de chaque application, et dont aucune
règle ne pouvait être jouée seule, nommée dans une commande, ni corrigée sans
lire les six cents autres.

Il se compose désormais d'un **contexte lu une fois** (`contexteDepot`) et de
**quatre familles** de règles (dépôt, workflows, source, build), toutes
exportées et jouables séparément sur ce contexte. Le comportement est
strictement inchangé : l'ordre d'exécution est le même — et il compte, un
identifiant déjà émis étant ignoré — et les 38 tests existants n'ont pas bougé
d'une ligne. Ce sont eux qui le prouvent.

Trois entrées nouvelles en ligne de commande :

```bash
npx pwa-doctor --regles                      # les 56 contrôles, par famille
npx pwa-doctor --only spa-404,manifest-lang  # travailler sur deux d'entre eux
npx pwa-doctor --skip wf-lighthouse          # en écarter un, le temps d'un essai
```

`--only` et `--skip` servent à travailler **sur** un contrôle — le déboguer,
mesurer ce qu'il coûte, écrire son correctif. Ce ne sont pas un moyen de se
taire en CI : personne ne les écrit dans un workflow, et un identifiant inconnu
fait échouer la commande (code 2) au lieu de rendre un rapport vide et faux.
Pour ne pas suivre un contrôle ici, le geste reste le **refus motivé** de
`package.json`, qui l'éteint sans le cacher.

Le catalogue est figé dans le code et non déduit à l'exécution — une liste
engendrée à la volée ne dirait rien d'un contrôle disparu par accident : le
test le compare aux familles **dans les deux sens** et refuse le moindre écart.

**Pourquoi maintenant.** `pwa-doctor --fix` est un chantier ouvert
(`STRATEGIE.md` § 8). Il s'écrit règle par règle, ou pas du tout : ce découpage
en est la condition, et c'est sa seule raison d'être.
