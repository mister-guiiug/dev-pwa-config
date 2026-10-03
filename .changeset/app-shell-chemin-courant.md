---
'@mister-guiiug/dev-pwa-config': minor
---

`AppShell` accepte `navCurrentPath` et le transmet au `currentPath` de sa barre basse. `BottomNav` exige ce chemin dès que le routeur a un `basename` : sans lui, il lit `location.pathname`, qui vaut `/miss-devises/` une fois déployé quand ses entrées valent `/`, et aucun onglet n'est actif. La coquille ne le transmettait pas et n'avait aucune prop pour le recevoir.

Le défaut ne se voyait qu'en ligne, jamais en développement ni en e2e, servis sous `/`. Relevé le 03/10/2026 sur https://mister-guiiug.github.io/miss-devises/ : aucun des cinq onglets ne portait `aria-current`. Le squelette `pwa-starter-kit` monte la coquille de la même façon, donc toute app née du générateur en hérite.

À faire dans les apps qui passent `navItems` à `AppShell` sous `<BrowserRouter basename>` (le squelette et miss-devises) : `navCurrentPath={pathname}`, avec `pathname` de `useLocation()`. Une app qui monte `BottomNav` elle-même passe déjà `currentPath`.
