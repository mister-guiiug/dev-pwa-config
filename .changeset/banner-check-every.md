---
'@mister-guiiug/dev-pwa-config': minor
---

**`UpdatePromptBanner` accepte `checkEvery`.**

La vérification périodique n'existait que sur `AppUpdates`. Or neuf
applications du parc posent le bandeau seul : elles n'avaient **aucun moyen**
d'écrire `checkEvery`, et leur bandeau attendait donc un démarrage à froid pour
apparaître. Sur une PWA installée et laissée ouverte — le cas normal — ce
démarrage peut ne jamais venir. Relevé sur les vingt PWA : cinq seulement
vérifiaient périodiquement, et les quinze autres étaient toutes dans ce cas ou
n'avaient simplement pas posé la prop.

L'intervalle est extrait dans `useUpdateCheck`, avec désormais deux appelants
et une seule implémentation. Il ne s'arme que sur un bandeau **autonome**,
celui qui possède l'enregistrement du service worker : sous `AppUpdates`, le
fournisseur le tient déjà, et le relancer ferait tourner deux minuteries pour
un seul service worker. Le test le vérifie dans les deux sens — il compte les
appels avec et sans bandeau sous le fournisseur, et refuse l'écart.
