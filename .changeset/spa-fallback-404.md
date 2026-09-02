---
'@mister-guiiug/dev-wpa-config': minor
---

Repli SPA `404.html` — `spaFallbackPlugin()` et le déploiement réutilisable

GitHub Pages n'a pas de repli SPA : rafraîchir `/miss-contraction/a-propos`,
ou ouvrir un lien partagé, sert sa page « File not found », pas l'app. Mesuré
le 02/09/2026 sur les sites publiés : **quatre apps à routage par chemin**
(contraction, footcoach, badminton, family-map) étaient dans ce cas, et trois
autres (carbook, molkky, dice) avaient chacune écrit la même correction chez
elles — le plugin de dice et celui de molkky sont identiques à la ligne près.

Deux réponses, pour deux chemins de déploiement :

- **`pwa-deploy.yml`** copie `index.html` en `404.html` après le build, s'il
  manque. Les apps déployées par le workflow réutilisable sont couvertes **sans
  changer une ligne**, dès que `v3` suit cette version.
- **`spaFallbackPlugin()`** dans `vite-pwa-base`, pour `vite preview`, un autre
  hébergeur ou un déploiement écrit à la main — et pour que carbook, molkky et
  dice retirent leur copie.

Inoffensif pour une app qui route par `#` : GitHub ne voit jamais le chemin,
le fichier ne sert jamais. Le service worker masquait déjà le défaut après la
première visite ; il restait entier pour un lien ouvert à froid.
