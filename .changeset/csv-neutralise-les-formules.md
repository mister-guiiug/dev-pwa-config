---
'@mister-guiiug/dev-pwa-config': minor
---

`csv` : le dialecte `excel-fr` neutralise les formules (option `neutralizeFormulas`). Toute cellule de texte qui commence par `=`, `+`, `-`, `@`, une tabulation ou un retour chariot reçoit une apostrophe en tête, pour qu'Excel ne l'exécute pas (« CSV injection », OWASP). Relevé par miss-arcade (07/11/2026) : les contacts d'un stand sont saisis par des visiteurs, puis ouverts dans l'Excel de l'organisateur, où une cellule `=HYPERLINK(…)` devenait un lien actif.

Un nombre écrit en texte (« -12 », « +3,5 ») passe intact, tout comme les nombres, dates et booléens typés. `rfc4180` et `unix`, lus par une machine, ne changent pas ; l'option force l'un ou l'autre comportement dans tous les dialectes.

Une application qui neutralisait elle-même (miss-arcade, `neutralizeFormula` dans `admin/leads-csv.ts`) peut retirer sa fonction après la montée : une cellule déjà préfixée commence par une apostrophe et n'est pas préfixée deux fois.
