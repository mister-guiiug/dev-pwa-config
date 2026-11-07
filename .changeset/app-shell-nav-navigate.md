---
'@mister-guiiug/dev-pwa-config': minor
---

`react/app-shell` : nouvelle prop `navNavigate`, transmise au `navigate` de `BottomNav`. Avec des routes paresseuses, react-router navigue dans une transition et le repli de Suspense ne paraît jamais : la barre doit piloter la navigation pour dire qu'elle charge (`pwa-doctor`, `nav-attente`). La coquille ne transmettait pas `navigate` et n'avait aucune prop pour le recevoir. Une app sous `AppShell` n'avait donc que le refus motivé ; miss-arcade a dû y recourir (07/11/2026).

`pwa-doctor` reconnaît `navNavigate={…}` comme remède à `nav-attente`, et son conseil le cite.

Migration : passer `navNavigate={navigate}` (le `useNavigate()` de react-router) à `<AppShell>`, puis retirer le refus `nav-attente` de `pwaDoctor.refus` s'il y en avait un (miss-arcade).
