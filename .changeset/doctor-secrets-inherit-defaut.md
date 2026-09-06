---
'@mister-guiiug/dev-pwa-config': minor
---

**`pwa-doctor` gagne un droit de réponse, et `secrets: inherit` devient un
défaut.** Les deux vont ensemble : le second serait une faute sans le premier.

**Le droit de réponse.** `pwaDoctor.refus` dans `package.json` associe l'id
d'un contrôle à la RAISON de ne pas le suivre ici :

```json
"pwaDoctor": {
  "refus": { "wf-lighthouse": "app interne, aucun site publié" }
}
```

La ligne sort alors en `– refus`, avec sa raison sous les yeux, et ne compte
plus dans le code de sortie. Trois règles la tiennent honnête : une raison
vide n'est pas un refus (l'entrée est ignorée, le contrôle reprend son niveau
— on refuse en disant pourquoi, ou on ne refuse pas) ; un refus n'efface rien,
la ligne reste au rapport ; et un refus qui n'excuse plus rien **se signale
lui-même** en info, sinon la liste d'exceptions grossit d'un cran à chaque
décision et ne redescend jamais.

Ce qui manquait se voyait déjà : les e2e de mister-puzzle sont volontairement
sans étiquette — « hygiène locale, pas la porte de la CI », décision assumée —
et le docteur ne savait que la compter, faute de pouvoir l'entendre.

**La promotion.** Le contrôle `secrets-inherit` existait, en dette, avec ses
tests et le dépouillement des commentaires qui distingue la ligne de celui qui
met en garde contre elle. Il n'a rien empêché : au relevé du 06/09/2026,
**dix-sept dépôts sur dix-sept** l'écrivaient, dans quarante-sept fichiers.
Aucune app ne lance `--strict`, donc la dette ne coûtait rien — et une dette
que rien ne force ne se paie jamais.

Ce que la ligne fait, elle : elle remet **tout le trousseau du dépôt** au
workflow appelé, à chaque exécution. Or `pwa-ci.yml` et `pwa-lighthouse.yml`
ne déclarent **aucun** secret (`secrets.GITHUB_TOKEN` est fourni d'office à un
workflow appelé), et `pwa-deploy.yml` n'en déclare qu'un,
`FIREBASE_SERVICE_ACCOUNT_KEY` — que le seul dépôt qui déploie sur Firebase
nomme désormais.

La définition du verdict s'élargit en conséquence, d'un cas vers un principe :
un DÉFAUT est ce qui **nuit déjà** — parce que quelqu'un en souffre (pas
installable, 404) ou parce que le dépôt **expose à chaque run** ce qu'il n'a
pas à exposer.

**Ce que ça demande aux apps.** Rien pour celles du parc : elles sont revenues
à zéro par campagne les 06 et 07/09/2026, la ligne y étant remplacée par le
commentaire qui explique son absence. Reste le miroir `mister-family-map`, qui
ne se corrige pas par PR : ou bien il est régénéré depuis bac-sable (déjà
corrigé), ou bien il écrit son refus — c'est exactement le cas pour lequel le
droit de réponse existe.
