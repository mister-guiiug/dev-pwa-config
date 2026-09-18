---
'@mister-guiiug/dev-pwa-config': patch
---

`pwa-doctor` LIT le majeur du socle au lieu de le figer — il exigeait encore `@v4` depuis la 6.0.0.

Le contrôle `wf-v3` compare les `uses:` du dépôt à l'étiquette majeure flottante du socle. La cible était écrite en dur : `@(?!v4\b)`. À la 6.0.0, un dépôt correctement monté en `@v6` se voyait donc reprocher **la bonne valeur**, et `--strict` refusait son build. Le contrôle accusait ce qu'il était censé récompenser.

**LE DOCTEUR EST LE SOCLE**, et c'est ce qui rend la lecture juste. Il s'exécute depuis le `node_modules` de l'application : sa version EST celle dont l'application dépend. Une app sur `^4.21.3` lance le docteur 4 et doit référencer `@v4` ; une app sur `^6.0.0` lance le docteur 6 et doit référencer `@v6`. Il n'y a jamais eu besoin d'écrire le chiffre.

C'est **le même défaut que `workflows.test.mjs` portait** et qui avait été corrigé de la même façon lors de la 5.0.0. Il restait ici — dans le fichier qui le dit à vingt dépôts.

### Ce qui change

- `MAJEUR` est lu dans le `package.json` du paquet ;
- le motif de `wf-v3` se construit à l'exécution, **antislashs doublés** : dans un gabarit, `\s` s'évanouit avant d'atteindre `RegExp`, et le motif se met alors à tout accepter sans qu'un test le voie — le parc a déjà payé exactement cette erreur ;
- les cinq gestes conseillés (`pwa-lighthouse.yml@…`, `cleanup-runs.yml@…`, `pwa-supabase-keepalive.yml@…`, `pwa-deploy.yml@…`, le repli SPA) nomment le majeur courant au lieu d'en figer un.

### Ce que le test tient désormais

Un dépôt référençant le majeur **courant** ne produit aucune dette ; le majeur **précédent** en produit toujours une, dont le geste nomme la cible courante. Les deux côtés lisent la version : la figer dans le test aurait fait passer une tautologie pour une preuve. Les onze dépôts factices des autres cas lisent aussi, au lieu de fixer `@v4`.
