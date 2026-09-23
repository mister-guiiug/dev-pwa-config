---
'@mister-guiiug/dev-pwa-config': minor
---

`pwaSeoPlugin` : données structurées `WebApplication`, et `lastmod` au plan de site

**Relevé du 23/09/2026 sur les vingt et un sites servis : un seul portait des
données structurées** (`mister-puzzle`, écrites à la main), et **aucun plan de
site ne portait `lastmod`**, seul champ que Google lise vraiment.

- **JSON-LD `WebApplication` injecté dans `<head>`, sans réglage.** Le nom et la
  catégorie viennent du catalogue (`FAMILY_APPS`), la description, l'image et
  la langue de l'`index.html` de l'app. La catégorie éditoriale est traduite
  dans le vocabulaire documenté par Google (`SCHEMA_APPLICATION_CATEGORIES`) ;
  un test exige une correspondance pour chaque catégorie du catalogue. Jamais
  injecté si la page porte déjà un `application/ld+json`. `jsonLd: false` le
  coupe, un objet surcharge des champs. Pas de note ni d'avis : en inventer
  serait une donnée fausse.
- **Une image qui n'est que l'URL d'accueil n'en est pas une** — c'est le repli
  de `__SEO_LOGO_URL__` sans `logoPath`, que `miss-carbook` servait en
  `og:image`. L'icône du catalogue la remplace.
- **`lastmod`** au jour du build, sur chaque entrée du plan de site.
- **`routes`** : des chemins PUBLICS à ajouter au plan de site ; `&` échappé.
- Nouveaux exports : `webApplicationJsonLd`, `jsonLdScript` (`<` échappé :
  une description ne peut pas fermer le bloc), `SCHEMA_APPLICATION_CATEGORIES`.

`cspPlugin` ignore déjà les `<script type=…>` : rien à hacher, rien à régler.
