---
'@mister-guiiug/dev-pwa-config': patch
---

`analytics` : les URL que PostHog joint de lui-même à chaque événement sont nettoyées avant de
partir. posthog-js ajoute à tout ce qui part `$session_entry_url` et `$session_entry_referrer`,
relevées au début de la session, fragment compris : après une redirection Supabase
(`?code=…`, `#access_token=…&refresh_token=…`), les jetons partaient avec chaque vue et chaque
geste de la session, même une fois la barre d'adresse nettoyée. Un `before_send` posé dans tous
les cas (`analytics-url.js`) ne laisse partir, pour toute clé d'URL ou de référent
(`$current_url`, `$referrer`, `$session_entry_*`, `$initial_*`, dans les propriétés, `$set` et
`$set_once`), que l'origine, le chemin et la route d'un `HashRouter` ; requête et fragment
deviennent `?[requête]` et `#[fragment]`. Rien à changer dans les apps.
