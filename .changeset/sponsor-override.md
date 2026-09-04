---
'@mister-guiiug/dev-wpa-config': minor
---

`SponsorProvider` : le lien de soutien se déclare une fois, et se retire

Nouveau sous-export `react/sponsor` (`SponsorProvider`, `useSponsorUrl`), et
`SPONSOR_HANDLE` + `sponsorUrl(handle)` au catalogue. `AppFooter` portait sa
propre copie en dur de l'URL Buy Me a Coffee : changer le catalogue ne changeait
pas le pied de page. Les deux composants lisent désormais la même source, avec
trois niveaux — prop, contexte, famille — et `null` veut dire « pas de lien ».

Aucune rupture : une app qui ne fait rien obtient exactement ce qu'elle rendait.
