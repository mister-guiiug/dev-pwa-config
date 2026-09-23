---
'@mister-guiiug/dev-pwa-config': minor
---

`pwa-vice.yml` : l'audit de sécurité VICE, en second avis non bloquant

Un nouveau réutilisable, **à la demande** : une app l'appelle depuis un
`.github/workflows/vice.yml` (exemple en tête du fichier), avec `contents: read`
et `security-events: write`.

[VICE](https://github.com/Webba-Creative-Technologies/vice) relit le code du
dépôt : secrets écrits en dur et fichiers `.env`, `npm audit`, politiques RLS
des migrations Supabase (une table sans `enable row level security`, une
fonction `security definer`, un `grant` trop large), motifs dangereux (XSS,
`eval`, injection SQL), droits et références des workflows. pgTAP
(`pwa-supabase-test.yml`) éprouve ce qu'une politique FAIT ; VICE relit ce que
les migrations OUBLIENT.

**Ce que l'action fait par défaut, et que le réutilisable éteint** : elle commite
un badge sur la branche par défaut (le ruleset « Protect main » le refuserait),
commente chaque PR, et fait échouer la CI sous un score de 70. Restent le
résumé du job — score, puis constats du plus grave au moins grave — et l'onglet
Security, où chaque constat se trie ou se rejette avec sa raison.

**Épinglé par SHA sur la 3.4.1**, une version en arrière : la 3.5.0 est sortie un
quart d'heure avant l'écriture de ce workflow, et rien de moins de 24 h n'entre
dans le parc. Relu avant de l'épingler : quatre dépendances installées en
`--ignore-scripts`, et un audit local qui n'appelle aucun service de l'éditeur.
Le scan DISTANT de VICE n'est pas appelé : sur `github.io`, ses sondes viseraient
l'infrastructure de GitHub.

Le socle s'audite lui-même avec ce réutilisable (job `vice` de `security.yml`),
ce qui l'éprouve avant le premier appelant.
