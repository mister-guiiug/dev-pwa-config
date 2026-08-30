---
'@mister-guiiug/dev-wpa-config': minor
---

Promotion de fonctionnalités issues des apps de la famille (P0/P1/P2).

Nouveaux modules racine : `haptics` (API Vibration, patterns gradués),
`audio` (synthèse WebAudio, presets sonores), `speech` (synthèse vocale),
`image` (validation, suppression des métadonnées, compression sous budget),
`rate-limit` (limiteur côté client, horloge injectable), `geocode-ban`
(géocodage Base Adresse Nationale), `dates` (arithmétique pure, ISO local).

Nouveaux sous-chemins React : `use-long-press`, `use-feedback` (son +
vibration), `use-wake-lock`, `use-pull-to-refresh`, `use-keyboard-shortcuts`,
`use-shake`, `use-async`, `use-undoable-state`, `segmented-control`,
`connection-banner` (avec styles opt-in dans `components.css`).

Extensions : `format` gagne `formatCount`, `formatUsage`, `formatDuration` ;
`security` gagne `sanitizeUserText`, `sanitizeSingleLine`, `isSafeHttpUrl`
(et `sanitizeInput` retire désormais les caractères de contrôle) ; `backend`
gagne `classifyBackendError` ; `react/use-media-query` gagne
`usePrefersHighContrast`.
