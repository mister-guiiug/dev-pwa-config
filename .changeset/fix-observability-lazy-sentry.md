---
'@mister-guiiug/dev-wpa-config': patch
---

`react/observability` : `initSentry` ne casse plus le build des apps SANS
`@sentry/react`. Sous Vite 8 / Rolldown, l'import dynamique littéral de la peer
optionnelle était résolu AU BUILD → « Rolldown failed to resolve import
"@sentry/react" » pour tout consommateur du module d'observabilité n'ayant pas
installé Sentry (découvert sur mister-molkky). L'import de repli devient non
analysable (spécificateur non littéral + `@vite-ignore`), et une nouvelle option
`loader: () => import('@sentry/react')` permet aux apps équipées de Sentry de
fournir un import bundlé normalement.
