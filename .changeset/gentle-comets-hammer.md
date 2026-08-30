---
'@mister-guiiug/dev-wpa-config': minor
---

**`./ical`** — l'agenda que quatre apps avaient écrit chacune de son côté.

`bac-sable` (le plus propre, et le seul testé), `mister-footcoach`,
`miss-uwh` et `mister-doc` engendrent tous du `.ics` (RFC 5545), et aucun de
la même façon : deux n'écrivent pas de `DTSTAMP` — propriété **obligatoire** ;
trois ne plient pas leurs lignes, le quatrième les plie en comptant les
caractères et coupe donc les accents en deux ; deux calculent un lendemain à
la main parce que le `DTEND` d'une journée entière est **exclusif** ; et
`mister-doc` recalcule un horodatage par événement, si bien qu'un fichier
engendré d'un seul coup en porte plusieurs.

L'union tranche ce qui divergeait. **La date choisit sa nature** : une date
ISO donne une journée entière, un horodatage sans décalage une heure
**flottante** (18 h reste 18 h pour le parent en déplacement), un `Date` un
**instant** UTC — écrire l'un pour l'autre décale l'agenda deux heures six
mois par an, et seulement chez ceux qui voyagent. Le pliage est celui de
`./vcard` : c'est le MÊME texte de RFC (§3.1 ici, §3.2 là), donc la même
fonction plutôt qu'une cinquième réécriture. `DTSTAMP` est unique pour tout le
fichier et **injectable**, comme dans `miss-uwh` — un export déterministe est
un export testable. `URL` n'est plus échappée : c'est une valeur URI, et `\,`
casse le lien. Et l'arithmétique d'une heure flottante se fait sur le cadran,
pas sur un instant : le `icalEnd` de `mister-footcoach` déplace d'une heure
une séance de 01 h 30 la nuit du changement d'heure, ce que la CI — en UTC —
ne peut pas voir.

Le flux d'abonnement de `mister-doc` est couvert (`METHOD`, `X-WR-TIMEZONE`,
`REFRESH-INTERVAL` **et** `X-PUBLISHED-TTL`, `CATEGORIES`, `TRANSP`), tout
comme le `STATUS` de `mister-footcoach` — un match annulé reste au calendrier,
barré. En revanche, pas de `RRULE`, pas de `VALARM`, pas de `VTIMEZONE` :
aucune des quatre n'en émet, la récurrence étant dépliée en amont par le
domaine.

Les quatre apps peuvent migrer : `bac-sable/src/shared/lib/ics.ts`,
`mister-footcoach/src/utils/ical.ts`,
`miss-uwh/src/features/export/icalExport.ts` et la partie génération de
`mister-doc/supabase/functions/calendar/index.ts` — leurs cas de test servent
de cas de test au module.
