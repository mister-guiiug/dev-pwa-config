---
'@mister-guiiug/dev-wpa-config': minor
---

`format` — les options passées à la place de la locale ne sont plus avalées.

**Le piège.** Huit fonctions ont la forme `(valeur, locale, options)`, mais
`formatNumber(1234, { maximumFractionDigits: 0 })` est le réflexe naturel — et
c'était un appel **silencieux** : `Intl` accepte n'importe quoi comme `locales`
sans lever, l'objet passait pour une locale illisible, la locale par défaut
reprenait la main, et **les options disparaissaient**. Aucune erreur, un format
simplement inchangé, et un appelant convaincu d'avoir configuré quelque chose.

Une locale est toujours une chaîne (ou un tableau de chaînes) : un objet à cette
place ne peut être que des options. Elles sont désormais reconnues. Non ambigu,
non cassant — la forme historique est verrouillée par un test, tableau de
locales compris.

**`formatCurrency` gagne des options.** Il n'en acceptait aucune : afficher un
prix sans centimes était **impossible** sans réimplémenter la fonction. C'est ce
que `miss-supaboss` demandait.

**`dateStyle` et `timeStyle` remplacent les composantes** au lieu de s'y
ajouter. `Intl` lève « Invalid option » quand ils côtoient `year`/`month`/`day`,
que ce module posait par défaut : demander une date longue faisait donc échouer
l'appel. Une migration l'avait rapporté comme « ça lève une TypeError » — le
diagnostic était juste, la cause était ailleurs.

Les deux correctifs sont vérifiés par mutation : retirer la reconnaissance ou
l'exclusion fait tomber le test qui la nomme.
