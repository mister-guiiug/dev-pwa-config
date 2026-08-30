---
'@mister-guiiug/dev-wpa-config': patch
---

`react/use-wake-lock` a enfin ses tests, et les angles morts de la suite
deviennent des décisions déclarées.

**Ce que la campagne a payé pour l'apprendre.** Le hook a été promu de deux
apps, publié, et importé par personne pendant des semaines — sans qu'aucun test
ne l'ouvre jamais. Quand trois apps l'ont adopté le 30/08/2026, l'une d'elles
portait dans sa copie un défaut que le paquet corrigeait **sans le prouver** :
pas d'écoute de `visibilitychange`, donc l'écran s'éteignait en pleine
contraction après un simple aller-retour dans une autre app. Une autre laissait
fuir une demande de verrou encore en vol au démontage.

Le hook du paquet était juste sur les deux points ; rien ne garantissait qu'il
le reste. Huit tests le garantissent maintenant — la ré-acquisition au retour au
premier plan, le relâchement d'une demande arrivée après le démontage, le
silence quand l'API manque ou refuse, et le fait qu'inactif il ne demande rien
(c'est ce qui porte le réglage « garder l'écran allumé » des apps). Les deux
garanties centrales sont vérifiées **par mutation** : retirer la ligne
correspondante du hook fait tomber le test qui la nomme, et lui seul.

**Onze modules n'étaient ouverts par aucun test.** `test/package-surface.test.mjs`
les fait maintenant apparaître : chacun est inscrit dans une liste nommée avec
sa raison — API absente de Node (Web Audio, DeviceMotion, caméra, gestes
tactiles), enveloppe fine dont le socle est déjà testé, ou transport exigeant un
SDK complet. Publier un nouveau module sans test force désormais à venir écrire
la sienne. Un second test empêche l'inverse : une exemption qui survit au test
qu'on a fini par écrire cacherait la suivante.
