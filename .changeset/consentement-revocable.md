---
'@mister-guiiug/dev-pwa-config': minor
---

`ConsentSettings` : le bouton qui rappelle le bandeau, pour revenir sur son choix.

**Le relevé qui l'a fait naître.** Le 16/09/2026, sur les vingt et une apps du parc : dix-neuf montent `ConsentBanner`, et **zéro** référence `reset`, `clearConsentChoice` ou `useConsentChoice`. Un visiteur qui avait accepté — ou refusé — ne pouvait plus jamais changer d'avis, par aucun chemin. Les pièces existaient depuis la 4.17.0 et n'étaient branchées nulle part.

L'article 7.3 du RGPD demande que le retrait soit **aussi simple que l'accord**. Ici il était impossible : ce n'est pas un défaut d'ergonomie, c'en est un de conformité.

**Un bouton qui rappelle le bandeau, et pas un interrupteur.** Un interrupteur dans un pied de page serait une seconde surface de décision, à tenir à l'équilibre du bandeau — même taille, même contraste, même coût au clic — sous peine de refaire par la mise en page ce que le bandeau évite par construction. Rappeler le bandeau garantit l'égalité sans avoir à la maintenir : c'est le même écran qui repose la question.

**`reset()` refuse avant d'oublier — changement de comportement.** Il se contentait d'oublier le choix, ce qui laissait la mesure active pendant toute la session : l'utilisateur avait demandé à revoir sa décision, le stockage ne disait plus rien, et Google continuait de recevoir. Zéro app du parc l'appelait, donc aucune ne change de comportement.

**Les instances du hook se synchronisent.** `useConsentChoice` tient son choix dans un `useState` local : le bandeau et le réglage sont deux instances. Sans registre d'abonnés, cliquer « Modifier mon choix » vidait le stockage et le bandeau ne revenait pas — le bouton n'aurait rien fait de visible. La diffusion porte la **clé** et non la portée, pour que deux apps qui cloisonnent leur consentement ne s'entendent pas l'une l'autre.

Le pied de page n'est **pas** touché : `AppFooter` a déjà `links` et `after`, et y importer `ConsentSettings` aurait tiré `analytics.js` dans le bundle des vingt apps, y compris celles sans mesure.

Au passage, `consent-banner.d.ts` déclare enfin `scope` et `consentKey`, absents des types depuis leur arrivée en 4.17.1.
