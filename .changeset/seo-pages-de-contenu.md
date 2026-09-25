---
'@mister-guiiug/dev-pwa-config': minor
---

`pwaSeoPlugin` sert des **pages de contenu** et une **image de partage**, sans
réglage.

- Chaque `content/pages/<slug>.md` de l'app devient au build un fichier HTML
  statique `<base>/<slug>.html` : lu tel quel par tout robot, ajouté au plan de
  site, listé dans le contenu servi de l'accueil. Le gabarit porte l'en-tête de
  l'app, le fil d'Ariane, un encadré « Ouvrir <App> », une CSP stricte et les
  données structurées `Article`, `BreadcrumbList` et `FAQPage` (tiré de la
  section « Questions fréquentes »). L'extension `.html` fait passer la page à
  travers le repli du service worker (`NAVIGATE_FALLBACK_DENY_FILES`).
- Si le dossier public porte `og-image.jpg` (ou `.png`), le plugin pose
  `og:image` avec ses dimensions et une empreinte de contenu, et passe
  `twitter:card` en `summary_large_image`, sur l'accueil et sur les pages.
- Nouveau bin `pwa-og-image` : dessine cette image, 1200×630, à partir de ce que
  l'app déclare déjà (catalogue, `<title>`, `theme-color`, icône, capture du
  manifeste).
