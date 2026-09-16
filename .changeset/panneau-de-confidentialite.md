---
'@mister-guiiug/dev-pwa-config': minor
---

`react/privacy-notice` — le panneau qui dit au visiteur ce que la mesure d'audience fait. Et `ConsentBanner` gagne une prop `policy` pour le déplier sur place.

**Le relevé qui l'a fait naître, 16/09/2026.** Dix-huit apps du parc mesurent après consentement. **Aucune ne dit ce qu'elle mesure** : zéro passe `policyHref` au bandeau — les deux occurrences que `git grep` rend sont des commentaires expliquant pourquoi la prop est absente. Le bandeau demandait donc un accord sans qu'aucun texte ne dise à quoi.

**Un panneau, pas une page, et le routage ne laissait pas le choix** : neuf apps en `HashRouter`, sept en `BrowserRouter`, deux en `createBrowserRouter`, et **trois sans aucun routeur** — `miss-dice`, `miss-ticket-pwa`, `mister-puzzle`. Il n'y a pas d'URL à leur donner. `mister-doc`, la seule app qui ait déjà écrit une politique, l'a faite en dialogue pour la même raison.

**Ce qu'il affiche est mesuré, pas supposé** : rien ne part avant le clic, `gtag/js` après, le cookie `_ga`, le choix rangé sous `dwc_consent:/<app>/`, et la conservation — 14 mois, la valeur posée le même jour sur les vingt propriétés GA4 du compte, et relue une par une. `retentionMonths` reste une prop : une app restée au défaut de GA4 doit pouvoir dire « 2 » plutôt que mentir.

**Deux mentions n'appartiennent pas au socle** : le responsable du traitement et l'adresse où exercer ses droits. Sans elles, le panneau affiche `[À compléter]` **à l'écran** plutôt que de se taire — l'idiome d'`exploitant.ts` de `mister-doc`. Les inventer publierait une information juridique fausse, ce qui est pire que de ne rien publier. Le marqueur est traduit dans les sept langues, et `MARQUEUR_MOTIF` les couvre toutes : un test refuse qu'une locale s'ajoute sans y être inscrite.

**Il n'ajoute aucune décision.** Le choix se fait au bandeau et se reprend par `ConsentSettings`, rendu en fin de panneau. Deux surfaces de décision demanderaient d'être tenues à l'équilibre l'une de l'autre — même taille, même contraste, même coût au clic — sous peine de refaire par la mise en page ce que le bandeau évite par construction. Un test compte les boutons, et le repli `policy` est rendu **après** les actions pour ne pas s'interposer entre la question et ses réponses.

Habillé dans `components.css`, contrairement au contrat habituel du paquet : un texte de conformité rendu en `<dl>` nu est illisible, et un texte illisible ne vaut pas information.
