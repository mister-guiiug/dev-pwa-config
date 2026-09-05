---
'@mister-guiiug/dev-pwa-config': minor
---

Les gardes du parc deviennent effectifs : le docteur en CI, la spec a11y jouée, pgTAP partout, un audit sans page refusé.

Relevé du 05/09/2026 ([AMELIORATIONS.md](AMELIORATIONS.md)) : `pwa-doctor` ne tournait que sur le squelette, une application sur vingt ; la spec `@a11y` du gabarit et du squelette n'était jamais exécutée parce que `pwa-ci.yml` ne jouait que `@critical` et que Playwright rend « No tests found » avec un code 0 ; les onze assertions pgTAP du squelette ne tournaient nulle part ; et un audit Lighthouse en `NO_FCP` passait vert sans catégorie accessibilité.

- **`pwa-ci.yml`** : entrée `run-doctor` (opt-in en 4.x, défaut `true` à la prochaine majeure) qui lance `pwa-doctor` après le build, et `doctor-strict` ; `e2e-grep` vaut désormais `@critical|@a11y` par défaut, et **un filtre qui ne trouve aucun test fait échouer le job**. Le nom de l'artefact de rapport ne porte plus le filtre (`|` y est interdit).
- **`pwa-lighthouse.yml`** : le rapport est relu après l'audit ; un `runtimeError` ou l'absence de score accessibilité fait échouer le job.
- **`pwa-supabase-test.yml`** (nouveau réutilisable) : les tests pgTAP sur une pile Supabase jetable du runner, migrations depuis zéro, aucun secret — promu de `miss-lookhouse`, seule application à le faire.
- **`pwa-pgtap`** (nouveau bin) : les mêmes fichiers joués contre la base liée, sans Docker — promu de `mister-miss-koh`, avec ses trois pièges écrits (colonne `(line)`, grants sur la table et la séquence, plan exact).
- **`pwa-doctor`** : quatre lectures de plus — un déploiement Pages écrit à la main (sans le réutilisable, donc sans repli SPA ni `required-env`), une spec e2e que le filtre de CI ne joue jamais, l'absence de `version.json` (`versionPlugin`), et deux informations (budget sans `mainChunkKb`, accès directs à `localStorage` sans `versioned-store`). `spa-404` ne compte plus comme défaut ce que `pwa-deploy.yml@v4` ajoute au déploiement.
- **`probe-sites`** : un lien profond qui rend le corps d'`index.html` est une coquille, quel que soit l'identifiant de l'élément racine (cim10 était un faux positif).
