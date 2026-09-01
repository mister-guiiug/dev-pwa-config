---
'@mister-guiiug/dev-wpa-config': patch
---

`apply-rulesets` exigeait un check qui n'existe pas

Trois défauts, trouvés en relevant les `check-runs` réels des dix-neuf dépôts
avant d'appliquer quoi que ce soit.

**Le préfixe `ci / ` manquait.** Les seize apps appellent le workflow
réutilisable depuis un job nommé `ci` : GitHub enregistre donc
`ci / Format · Lint · Type · Test · Build`. Le script exigeait
`Format · Lint · Type · Test · Build` tout court — un contexte qui n'est jamais
rapporté sous ce nom. Appliqué tel quel, il aurait **gelé toutes les PR des
seize apps**, sans recours autre que modifier le ruleset. C'est exactement la
panne que l'en-tête du script décrit, et qu'il portait encore.

**`mister-family-map` est un MIROIR.** `npm run mirror` y fait littéralement
`git push --force <remote> refs/heads/main:refs/heads/main`. Le ruleset
standard le casserait deux fois : `non_fast_forward` refuse le forçage, la
règle `pull_request` refuse le push direct. Il ne reçoit donc plus que la règle
`deletion` — la relecture a lieu sur sa source, `bac-sable`.

**`mister-quota` a sa propre CI.** Une matrice Node (`20.x`, `22.x`), et un job
`package desktop` conditionné à `refs/tags/v*`, donc jamais exécuté sur une PR.
Exiger celui-là aurait produit le même gel.

`.github` est retiré de la liste : le dépôt n'existe pas (404), et son entrée
produisait une croix avalée par le `try` — au milieu d'une sortie verte.

Outillage de développement du dépôt : rien de publié ne change.
