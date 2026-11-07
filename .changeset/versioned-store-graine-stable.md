---
'@mister-guiiug/dev-pwa-config': patch
---

`versioned-store` : la graine (`seed`) est tirée une fois par magasin et rendue en copie, au lieu d'être recalculée à chaque `load()`. Relevé par miss-arcade (07/11/2026) : tant que rien n'était écrit, une graine aux identifiants aléatoires ou datée (`new Date()`) changeait d'une lecture à l'autre. Une administration ouverte puis enregistrée sur un appareil vierge se voyait refuser « modifiée ailleurs ». Vitest ne le voyait pas (deux lectures dans la même milliseconde), l'e2e si.

`clear()` oublie la graine tirée : la suivante est neuve. Une graine qui ne se copie pas (fonction, instance de classe) garde l'ancien comportement. La stabilité vaut le temps de la page : si d'autres données renvoient aux identifiants de la graine, l'application l'écrit à la première lecture (`save(load())`).
