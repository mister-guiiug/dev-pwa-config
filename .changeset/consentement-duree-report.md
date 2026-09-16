---
'@mister-guiiug/dev-pwa-config': minor
---

Le choix de consentement porte sa date ; le report ne fuit plus d'une app à l'autre, et dure quatre heures par défaut.

**Le report d'une app faisait taire celui des autres.** `snoozeKey` valait `'dwc_sw_update_snoozed_until'`, une clé **nue**. Les vingt sites de la famille partagent l'origine `<compte>.github.io` : reporter sur `mister-puzzle` — qui reporte 24 h — silenciait donc aussi `miss-supaboss`, `miss-supatool` et `mister-family-map`, les trois autres apps à report du parc. Aucune des quatre ne passe de `snoozeKey` : elles lisaient toutes celle-là. C'est le **même défaut** que celui du consentement, corrigé en 4.17.1 sur l'autre clé, et il a survécu sur celle-ci faute d'avoir cherché ses semblables. Le calcul vit désormais dans `storage.appScopedKey`, et les deux l'appellent.

Aucune reprise de l'ancienne clé, délibérément : la valeur qui s'y trouve peut être le report d'une **autre** app, et la recopier perpétuerait la fuite qu'on ferme. Au pire un report en cours est oublié une fois.

**`snoozeHours` vaut 4 par défaut, et plus 0.** À zéro, le second bouton n'écarte que pour la session : le bandeau revient au rechargement suivant. Seize apps sur vingt étaient dans ce cas faute d'avoir écrit la prop — aucune ne l'avait choisi, et le libellé « Plus tard » promettait pourtant une durée. Quatre heures est la plus courte des quatre valeurs déjà en service. `snoozeHours={0}` reste disponible. La valeur vit dans une constante unique : le hook, le fournisseur, le bandeau autonome et le bandeau portaient chacun leur `= 0`, et le libellé se calcule dans le dernier tandis que le report s'applique dans le premier.

**Le choix de consentement porte sa date, et sa version de finalités.** Le stockage ne contenait que `granted` ou `denied` : un accord de 2026 valait indéfiniment, et si une finalité s'ajoutait, rien ne permettait de reposer la question. Trois formes se lisent — `choix`, `choix;date`, `choix;date;version` — et la première est l'ancienne : un choix mémorisé avant cette version reste valide.

Treize mois par défaut (`maxAgeDays`), la durée de vie maximale admise pour un traceur ; le refus expire au même âge, jamais avant. Un choix **sans date** n'est pas périmé : il est **re-daté d'aujourd'hui**, pour que l'horloge parte de la montée et non du néant — sinon le bandeau reparaîtrait chez tout le monde le même jour, pour une raison que l'utilisateur n'a pas vécue. Un accord périmé ne rejoue **pas** le tag : c'est toute la différence entre dater un choix et le faire compter.
