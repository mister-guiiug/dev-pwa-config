---
'@mister-guiiug/dev-pwa-config': patch
---

`ConsentSection` n'est plus un second repère « Mesure d'audience » à côté du bandeau : la section porte `role="group"`.

Nommée par son titre, la `<section>` était une `region`, un repère du même nom que le bandeau. Les deux sont à l'écran ensemble à la première visite, et juste après « Modifier mon choix », c'est-à-dire dans le parcours que la section déclenche elle-même. axe-core le relevait (`landmark-unique`, mesuré le 01/10/2026 dans ces deux états, aucune violation après la correction). La liste des repères d'un lecteur d'écran montrait deux « Mesure d'audience » sans dire lequel pose la question.

Le groupe garde le nom : le lecteur d'écran l'annonce quand le focus entre sur le bouton, et il dit de quoi « Retirer mon consentement » parle. Rien ne change pour les apps : la section reste un `<section>` (`closest('section')`), avec le même titre et les mêmes `data-dwc`. Aucun test du parc ne la cherchait comme région (relevé sur les dix-neuf apps qui la montent) ; miss-dice et mister-qowa trouvent le BANDEAU par `getByRole('region', { name })`, qui n'a plus d'homonyme.
