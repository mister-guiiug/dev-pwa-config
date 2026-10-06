---
'@mister-guiiug/dev-pwa-config': patch
---

`FamilyApps` : le nom accessible d'une carte est désormais son texte visible (nom, maturité, description). Un `aria-label` court, le nom et la maturité suivis de « nouvel onglet », le remplaçait : la description visible manquait au nom (WCAG 2.5.3, relevé par Lighthouse sur le showroom), et ce libellé restait en français dans toutes les langues. L'ouverture dans un nouvel onglet passe en description, par `title`, traduite dans les sept langues (nouveau libellé `apps.newTab`). Aucun changement visuel.
