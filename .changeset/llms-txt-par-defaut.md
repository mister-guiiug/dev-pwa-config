---
'@mister-guiiug/dev-pwa-config': minor
---

`pwaSeoPlugin` : `llms.txt` est écrit par défaut (`llms: true`), au format de llmstxt.org. L'option existait, éteinte, et aucune app ne l'activait : la racine et les vingt-trois sites répondaient 404, dernier point P1 ouvert des audits SEO/GEO du 28/09 et du 06/11. Google ne s'en sert pas et la convention est inégalement lue, mais le fichier ne coûte rien, ne s'affiche nulle part, échappe déjà au repli de navigation du worker et n'entre pas au précache.

`defaultLlmsTxt` passe au format de la convention — des liens Markdown (`- [Miss Dice](https://…/miss-dice/)`, `- [Code source](…)`) au lieu de « Application : URL » — et liste les pages de contenu écrites par le build dans une section « Guides », chacune avec sa description : ce sont les seules pages de l'app qu'un agent lise sans exécuter de JavaScript.

Migration : aucune. `llms: false` coupe le fichier, une chaîne le remplace, comme avant.
