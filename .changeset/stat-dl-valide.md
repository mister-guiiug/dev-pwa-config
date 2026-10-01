---
'@mister-guiiug/dev-pwa-config': patch
---

`Stat` rend un `<dl>` valide. Un `<div data-dwc="stat-head">` enveloppait le seul `<dt>`, suivi de `<dd>` libres : axe le relevait sur tout écran à chiffre-clé (règle « definition-list », contrôle « structured-dlitems », impact sérieux). Relevé sur miss-devises le 01/10/2026 ; mister-miss-koh, mister-settle, mister-quota et miss-supatool rendaient la même structure.

L'icône passe DANS le `<dt>` (`stat-label`), qui reprend la mise en ligne libellé / icône. Le sélecteur `[data-dwc="stat-head"]` disparaît : aucune application du parc ne le ciblait.
