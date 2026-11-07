---
'@mister-guiiug/dev-pwa-config': minor
---

`playwright-a11y` : `expectNoA11yViolationsOn` et `analyzeA11yOn` passent axe sur une liste de routes ou d'états. Une étape est un chemin (`'/reglages'`) ou `{ path?, setup?, name?, options? }`, où `setup(page)` fait les gestes qui mènent à l'état (ouvrir une feuille, remplir un champ) ; `ready(page)` attend l'écran réel après chaque navigation. Toutes les étapes sont auditées avant de conclure, et le rapport nomme chaque écran fautif. Une liste vide est refusée.

`pwa-doctor` : nouvelle dette `a11y-accueil-seul` quand la spec d'accessibilité n'ouvre que l'accueil (`goto('/')`, ou la base de l'app) sans aucun geste qui change d'état. Un `goto` sur une variable ou un chemin construit la fait taire : le contrôle ne devine pas. Relevé sur `main` le 07/11/2026 : neuf apps la portent (miss-badminton, miss-genius, miss-supaboss, miss-ticket-pwa, miss-uwh, mister-footcoach, mister-molkky, mister-puzzle, mister-settle). miss-carbook, mister-cim10 et mister-qowa ne visitent que `/` mais atteignent leurs écrans par des clics : elles ne la portent pas. Le gabarit `templates/e2e/a11y.spec.ts` montre l'aide en commentaire.

Migration : dans chacune des neuf apps, ajouter à `e2e/a11y.spec.ts` un test `expectNoA11yViolationsOn(page, AxeBuilder, expect, [...])` sur ses écrans publics, ou refuser la dette avec sa raison (`pwaDoctor.refus`) — miss-ticket-pwa n'a qu'un écran sans connexion. Deux d'entre elles jouent le docteur en strict, et une dette y suffit à échouer : miss-supaboss (`doctor-strict: true` dans sa CI) et mister-settle (`pwa-doctor --strict` dans son `build`). Pour elles, ajouter les écrans — ou poser le refus — DANS la PR de montée de version, sans quoi elle rougit.
