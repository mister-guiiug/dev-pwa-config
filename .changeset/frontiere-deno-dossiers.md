---
'@mister-guiiug/dev-wpa-config': patch
---

`similarity` — l'en-tête dit désormais qu'une de ses deux provenances ne pourra
jamais l'importer.

Le cœur métier de `miss-lookhouse` (`src/domain/`, dont son anti-doublons) est
**recopié vers des Supabase Edge Functions** par un script de build. Ce code
tourne donc aussi sous Deno, qui ne sait pas résoudre un paquet publié sur un
registre privé — la limite déjà constatée chez `mister-doc`, mais qui porte ici
sur **tout un dossier** : `scoring`, `similarity`, `clustering`, `priceHistory`,
`normalize`, `text` et `imageHash` sont dans le même cas.

Le corollaire mérite d'être écrit plutôt que redécouvert : un module tiré d'un
code qui franchit la frontière Deno est un module que son donneur ne récupérera
pas. Ça ne l'invalide pas — l'autre provenance l'importe — mais ça se sait
d'avance, et ça évite d'inscrire une app dans un lot d'adoption qu'elle ne peut
pas tenir.
