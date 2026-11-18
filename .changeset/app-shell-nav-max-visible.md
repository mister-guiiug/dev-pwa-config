---
'@mister-guiiug/dev-pwa-config': minor
---

`react/app-shell` : nouvelle prop `navMaxVisible`, transmise au `maxVisible` de `BottomNav`. Au-delà de cinq entrées, la barre replie les suivantes sous « Plus » ; la coquille ne transmettait pas l'option et n'avait aucune prop pour la recevoir. Trois apps la contournaient pour en montrer six : miss-supatool assemble `AppHeader`, `PageContainer` et `BottomNav` à la main — la coquille elle-même —, mister-doc enveloppe sa barre, mister-uwh-tactic rend la sienne dans `beforeMain` (rail de bureau, 18/11/2026). Absente, rien ne change : le défaut de la barre (5) vaut.

Migration : passer `navMaxVisible={6}` à `<AppShell>` et retirer la barre rendue à côté (mister-uwh-tactic : `beforeMain` ; miss-supatool : la coquille écrite à la main peut redevenir un `<AppShell>`). mister-doc garde sa barre enveloppée tant qu'elle porte sa transition de menu.
