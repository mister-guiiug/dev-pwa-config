---
'@mister-guiiug/dev-wpa-config': patch
---

La table « Exports npm » du README documente enfin **les 137 sous-chemins
publiés**, contre 62 auparavant. Les 75 manquants n'étaient pas des modules
mineurs : `security`, `markdown`, `similarity`, `haptics`, `audio`, `speech`,
`rate-limit`, `geocode-ban`, `image`, les trois transports `push/*`, sept hooks
React promus d'apps de la famille et quatre composants d'interface — dont 22
sans aucune mention ailleurs dans la page.

C'est la leçon `sparkline` à l'échelle du tiers du paquet : ce module est resté
inutilisé non parce qu'il manquait, mais parce qu'il était introuvable. Les
relevés d'adoption comptaient donc des doublons pour du code que les apps ne
pouvaient pas découvrir.

`test/package-surface.test.mjs` empêche la dérive de revenir : publier un
sous-chemin sans l'inscrire dans la table fait échouer `npm test`. Seule la
présence de la ligne est vérifiée, pas son contenu.

Le journal de campagne consigne par ailleurs ce que les quatre migrations
`ical` ont appris — dont la **limite du paquet** : il ne franchit pas la
frontière Deno, car GitHub Packages exige un jeton même en lecture et le
constructeur distant de Supabase ne l'a pas. Pour du code qui tourne chez
l'hébergeur, l'adoption utile est la référence écrite, pas l'import.
