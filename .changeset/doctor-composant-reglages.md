---
'@mister-guiiug/dev-pwa-config': patch
---

`pwa-doctor` : un composant rangé dans un dossier de réglages compte pour l'écran qui le rend

La règle des liens de la famille lit le chemin entier pour reconnaître les
Réglages (`setting`, `profil`, `about`…). Mesuré le 24/09/2026 sur mister-doc :
`features/profile/OtherAppsCard.tsx` — la liste des autres apps, rendue par
`ProfilePage` — comptait comme un troisième écran à côté de l'accueil et du
Profil. Désormais, un fichier NOMMÉ comme un écran compte pour lui-même ; un
fichier qui ne l'est que par son dossier compte pour les écrans qui le rendent,
et pour lui-même seulement si personne ne le rend.
