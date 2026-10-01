---
'@mister-guiiug/dev-pwa-config': patch
---

`PrivacyNotice` ne dit plus que PostHog dépose un cookie : depuis la 6.2.0 (#324), la persistance est `localStorage` seul, et le panneau annonçait encore « cookie et stockage local » dans les sept langues.

« Ce qui est déposé sur votre appareil » dit maintenant ce qui est gardé et où : si l'on accepte, un identifiant de visite dans le stockage du navigateur ; dans tous les cas, le choix. Le texte ne dit pas non plus « aucun cookie » : un identifiant en stockage local est un traceur au même titre (CNIL), et le présenter comme une absence de cookie rassurerait à tort. Un test lie désormais ce texte à `OPTIONS_VIE_PRIVEE.persistence`, dans les sept langues : le mot « cookie » n'y figure que si la persistance réglée en pose un.
