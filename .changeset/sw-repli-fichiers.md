---
'@mister-guiiug/dev-pwa-config': minor
---

`vite-pwa` : les fichiers échappent au repli de navigation du service worker

**Le défaut, relevé le 24/09/2026 sur tout le parc.** Le `navigateFallback`
répond `index.html` à TOUTE navigation dans la portée du worker. Un visiteur qui
avait déjà ouvert une app et tapait `…/sitemap.xml` retombait donc sur son
accueil. Même chose pour `llms.txt` ou `version.json` ouverts dans un onglet.
Googlebot n'installe pas de worker et lisait bien le XML : le moteur n'était
pas touché, le propriétaire si.

- **Nouvelle constante `NAVIGATE_FALLBACK_DENY_FILES`** : un chemin dont le
  dernier segment porte une extension, avant toute requête. La requête est
  exclue du test, car Workbox éprouve la liste sur `pathname + search` :
  `/app/?next=/a.b` reste une page de l'app. `index.html` et `404.html`
  restent servis hors ligne, puisqu'ils sont précachés.
- **`pwaWorkbox` (donc `pwaBaseOptions`) la pose d'office.** Une
  `navigateFallbackDenylist` passée dans `workbox` **s'ajoute** à la règle au
  lieu de la remplacer : cinq apps déclaraient la leur.
- **Une app qui écrit son `VitePWA()` elle-même** (17 sur 20) importe la
  constante et la place en tête de sa liste : voir `docs/CONFIGS.md`.
