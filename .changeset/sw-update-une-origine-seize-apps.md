---
'@mister-guiiug/dev-wpa-config': patch
---

« Forcer la mise à jour » pouvait emmener chez la voisine, et casser les quinze autres

Défaut signalé en usage : « si on ouvre plusieurs apps et qu'on clique sur
forcer la mise à jour, des fois on bascule sur la page d'accueil d'une **autre
app** que celle en cours ».

**La cause tient en une ligne de spécification.** Les seize apps de la famille
sont publiées sous `https://mister-guiiug.github.io/<app>/` — **une seule
origine**. Or `getRegistrations()` et `caches.keys()` portent sur l'origine, pas
sur l'application : depuis miss-dice, on voit les service workers et les caches
des quinze autres, et on peut les détruire.

Trois conséquences, toutes reproduites par des tests avant d'être corrigées.

**1. On naviguait chez la voisine.** `controllingScope` finissait par
`couvrantes[0] ?? scopes[0]`. Quand aucune portée ne couvre la page — le worker
n'est pas encore installé, ou une voisine vient de le désinscrire — la seconde
branche rendait une registration **arbitraire** de l'origine. `applyUpdate`
naviguait alors vers `bustedUrl(portée d'une autre app)`. Le test rend
littéralement `https://exemple.test/miss-carbook/?_t=…` depuis une page de
miss-dice. Ne rien trouver rend maintenant `''`, et on reste chez soi.

**2. On désinscrivait toute l'origine.** « Désinscrit tous les service
workers » voulait dire _ceux des seize apps_. Réinitialiser miss-dice emportait
la capacité hors ligne des quinze autres, en silence — et c'est ce qui produit
ensuite la situation du point 1 chez la voisine. Seules les registrations qui
couvrent la page courante sont désinscrites.

**3. On effaçait le précache des voisines.** Workbox nomme ses caches
`workbox-precache-v2-<portée>` et sa propre routine de nettoyage filtre sur
`self.registration.scope` ; ce module ne le faisait pas. Tout cache dont le nom
porte la portée d'une voisine est désormais épargné.

**Le doute profite à la désinscription.** Une portée illisible ne prouve pas
qu'on a affaire à une autre app, seulement qu'on ne sait pas — on n'épargne que
ce qu'on peut prouver étranger. Laisser en place un worker qu'on n'a pas su
lire rendrait au bouton le défaut qu'il existe pour corriger.

Aucun changement d'API. Cinq tests neufs, quatre garanties vérifiées par
mutation.
