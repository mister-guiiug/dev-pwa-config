---
'@mister-guiiug/dev-wpa-config': minor
---

Sept chantiers, tirés du relevé d'adoption des dix-sept apps.

**Le constat d'abord** : sur les 23 besoins que les apps recopient encore — 130 fichiers — **aucun ne manquait au socle**. Ce n'est pas un problème de modules, c'en est un d'adoption. Deux chantiers s'en occupent, cinq ajoutent ce qui manque vraiment.

**Adoption.** `scripts/adopt.mjs` remplace un fichier recopié par l'import du socle, app par app — essai à blanc par défaut, et refus explicite quand l'app a ajouté ses propres symboles à côté (`ListSkeleton`, `ToastViewport`, `formatPercent` : quatre cas réels détectés). La dette est désormais engendrée en tête du README par `npm run sync`, avec sa partition migration / promotion.

**`./csv`** — construire un CSV, pas seulement le télécharger. Échappement RFC 4180 (le guillemet se double), dialecte `excel-fr` (point-virgule, virgule décimale, BOM), lecture caractère par caractère. Huit apps produisent des tableaux.

**`./similarity`** — promu du `dedupe` de mister-family-map (Sørensen–Dice sur bigrammes), avec le verdict EXPLIQUÉ que miss-lookhouse appelle « scoring explicable ». La distance est injectée : kilomètres, écart de prix, différence de dates.

**`./backend`** — promu de la sélection de family-map. Les ports de domaine ne se généralisent pas ; la mécanique autour, si : repli local obligatoire, migration port par port, et couverture rapportée.

**`./realtime`** + `realtime/supabase`, `realtime/firebase`, `realtime/local` — NEUF ASSUMÉ. Six apps annoncent du temps réel, aucune n'est lisible depuis cette session. Le port porte ce que la plateforme impose : retrait exponentiel dispersé, rattrapage borné après coupure, sonde au réveil de l'onglet.

**`./sparkline`** + `react/sparkline` — courbe, barres, jauge en SVG calculé, sans dépendance, avec l'alternative textuelle produite d'office. Un trou (`null`) n'est jamais un zéro.
