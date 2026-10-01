---
'@mister-guiiug/dev-pwa-config': patch
---

Sur un téléphone, les trois liens d'`AppFooter` (« Code source », « M'offrir un café », « Signaler un problème ») tiennent sur une rangée. En 13 px avec 12 px d'écart, il leur fallait 374 px, et une colonne de téléphone en offre 343 sur un écran de 375 px : le signalement passait seul à la ligne.

Sous 30rem, le pied de page est resserré (texte de 12 px, écarts de 8 et 4 px). Quand le signalement le ferme, il se replie dans la rangée plutôt que de la quitter (`flex: 1 1 0%`, `max-width: max-content`). Le retour à la ligne reste permis : rien ne déborde, et `children`, `links`, `version` et `after` se rangent comme avant.

Deux applications retouchaient ce pied de page localement et peuvent retirer leur règle à la montée : mister-miss-koh (sous 30rem) et miss-devises (sous 28rem).
