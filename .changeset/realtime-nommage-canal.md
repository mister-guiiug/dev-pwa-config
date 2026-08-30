---
'@mister-guiiug/dev-wpa-config': patch
---

`realtime/supabase` : deux abonnements à la même table ne se marchent plus
dessus, et une tentative qui échoue ne fuit plus un canal.

Le transport nommait son canal `dwc:<schema>:<table>` — **sans le filtre**.
Trois comportements de `@supabase/realtime-js` 2.107.0 se combinaient alors en
un échec parfaitement muet : `RealtimeClient.channel(sujet)` REND le canal déjà
enregistré sous ce sujet au lieu d'en créer un ; `RealtimeChannel.subscribe()`
ne fait RIEN sur un canal qui n'est pas `closed` — pas d'erreur, pas de rappel ;
et `removeChannel()` est asynchrone, si bien que le canal sortant reste
enregistré, en état `leaving`, le temps de l'aller-retour serveur. Deux
abonnements à la même table avec des filtres différents — un fil de
commentaires par candidat et un journal par espace de travail, cas d'école —
recevaient donc le même canal : le second y greffait ses écouteurs, son
`subscribe()` ne faisait rien, la promesse de `connect()` ne se résolvait
**jamais**, et l'écran restait muet sans qu'aucune erreur ne le dise. Le
démontage-remontage de React dans un même commit produisait exactement le même
silence.

Le sujet porte maintenant le filtre — pour rester lisible dans une trace ou
dans `getChannels()` — **et** un numéro monotone, interne au module, renouvelé
à chaque tentative : la lisibilité et l'unicité sont deux besoins distincts, et
deux abonnements rigoureusement identiques doivent coexister aussi.
`channelName` remplace la part lisible sans figer le sujet, sans quoi un nom en
dur réintroduirait la collision.

Second défaut, même diagnostic : une tentative qui échouait **avant**
`SUBSCRIBED` ne donnait aucune poignée de fermeture à l'appelant — il ne
pouvait donc pas nettoyer, et le canal restait dans `client.channels` pour
toujours, un de plus à chaque montage (deux par montage en développement).
`CHANNEL_ERROR`, `TIMED_OUT`, une levée pendant l'abonnement, et désormais un
`CLOSED` mort-né — qui laissait jusqu'ici la promesse en suspens pour toujours,
sans erreur ni tentative suivante — retirent le canal du client avant de
rejeter.

Diagnostic établi pendant la migration de miss-carbook (mister-guiiug/miss-carbook#14),
qui a dû contourner côté app : un client factice qui suffixait le sujet d'un
compteur de module et gardait un `Set` de canaux orphelins à refermer au
démontage. Ce contournement peut être retiré de `useRealtimeTable.ts` dès cette
version publiée — le socle tient les deux garanties.

En revanche, `catchUp` n'applique **toujours pas** le `filter` de l'abonnement,
et ce n'est pas corrigé ici : le rattrapage interroge la table sur la seule
colonne curseur, et réappliquer un filtre PostgREST demanderait d'en interpréter
la grammaire (`eq`, `in`, `neq`…) pour un résultat qui resterait approximatif.
La limite est en revanche écrite noir sur blanc — en-tête du module, `.d.ts` et
README —, parce qu'elle est un piège de sécurité **fonctionnelle** : là où la
RLS laisse passer plusieurs espaces, le rattrapage fait entrer des lignes d'un
autre espace que celui écouté, sans erreur, et seulement au retour d'une veille.

Les tests posent un client Supabase factice fidèle aux trois comportements
ci-dessus — un faux complaisant validerait le bogue au lieu de le montrer.
Six d'entre eux échouaient sur le code précédent.
