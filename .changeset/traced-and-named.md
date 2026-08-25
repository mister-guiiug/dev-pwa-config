---
'@mister-guiiug/dev-wpa-config': minor
---

feat(correlation, logger, map) : relier les canaux d'observabilité, et rendre
l'adaptateur MapLibre utilisable en développement

**`/correlation`** — le socle portait déjà quatre canaux (frontière d'erreur,
journal local, Sentry, télémétrie) qui décrivaient le même incident sans
pouvoir être rapprochés. `installCorrelation()` pose un identifiant unique dans
les quatre : contexte de session des erreurs, en-têtes `X-Correlation-Id` /
`X-Session-Id` des requêtes sortantes (`withCorrelation(fetch)`), propriété
`correlation_session_id` de la télémétrie (opt-in), et référence affichée par
`ObservabilityBoundary` pour que l'utilisateur puisse la citer.

Pas de contexte asynchrone implicite : le navigateur n'a pas d'`AsyncLocalStorage`,
et une corrélation « courante » en variable de module serait fausse dès deux
requêtes concurrentes. L'identifiant de session est implicite, celui de requête
explicite.

**`/logger`** — journal à niveaux (`createLogger`, `setLogLevel`) écrivant dans
le **même** fil d'Ariane que `breadcrumb` : pas de second tampon ni de second
transport, mêmes masquages, et chaque ligne estampillée de son origine et de
l'identifiant de corrélation.

**`pwaSeoPlugin` exclut `/map/maplibre` du pré-bundling** — l'adaptateur résout
l'URL de son worker par le suffixe `?worker&url`, que le pré-bundling des
dépendances ne sait pas interpréter : `vite dev` refusait de démarrer sur
`[UNLOADABLE_DEPENDENCY]` alors que le build de production fonctionnait.
L'exclusion rejoint celle de `react/observability`, déjà portée par ce plugin
pour la même famille de panne — les apps qui utilisent `pwaSeoPlugin` n'ont
rien à changer, et celles qui avaient écrit l'exclusion à la main peuvent la
retirer.
