---
'@mister-guiiug/dev-wpa-config': minor
---

Deuxième vague : géographie, garde d'action, sauvegarde, dump d'échec E2E, et la campagne outillée.

**`./geo`** — PROMU de mister-family-map : haversine, validation, boîte englobante avec l'antiméridien géré, `formatDistance` français. Le socle en avait besoin lui-même : les tests de `./similarity` fabriquaient une distance approximative à la main — ils utilisent désormais la vraie.

**`./react/use-action-guard`** — PROMU de miss-supaboss : un bouton bloqué qui dit POURQUOI. Codes stables (`offline`, puis vos vérifications ordonnées), texte traduit via les labels, `aria-disabled` plutôt que `disabled` (le bouton reste focusable, le motif reste découvrable), `wrap()` qui rend l'action inerte. Les rôles sont injectés — ils appartiennent aux apps.

**`./backup`** — la moitié « sauvegarde » que la promotion de `storage` n'avait pas traitée. Export daté et identifié, valeurs BRUTES (un blob chiffré n'est pas du JSON et doit survivre), import qui valide TOUT avant la première écriture, et refus d'une sauvegarde d'une autre app — le pire échec étant le silencieux.

**`playwright-base`** — `dumpAppState` + `rethrowWithState`, promus du try/catch qui a fermé le bug des doublons après trois échecs aveugles en CI. URL, titre, clés du stockage (pas les valeurs), état applicatif à la demande ; ne lève jamais.

**La campagne** — `CAMPAGNE.md` (le mode d'emploi complet, gardes-fous compris) et `scripts/console-audit.mjs` : chaque `console.error`/`warn` orphelin, avec un nom de journal proposé — l'audit s'arrête où le jugement commence. La carte du codemod apprend `geo` ; `useActionGuard` en est volontairement absent, sa signature ayant changé à la promotion.
