---
'@mister-guiiug/dev-pwa-config': minor
---

Le clic qui répond, le morceau qui arrive avant, le repli qui se relit — trois
comportements que le parc a réécrits dix fois le 20/09/2026, remontés ici.

**`BottomNav navigate={navigate}`** — la barre pilote la navigation dans SA
transition. react-router 7 et 8 enveloppent tout changement d'URL dans
`startTransition`, et React 19 garde délibérément l'écran courant : le
`<Suspense fallback>` d'une route ne paraît JAMAIS sur un clic (mesuré à froid :
133 ms d'écran figé sur mister-settle, 161 sur mister-molkky, `aria-busy` faux
d'un bout à l'autre). Dix apps ont corrigé cela le 20/09 en quatre formes, et
quatre d'entre elles ont dû contourner cette barre : `onNavigate(item)` ne
recevait pas l'évènement, donc ni `preventDefault`, ni touche de modification,
ni transition ne pouvaient y passer — d'où un `linkComponent` maison et un
contexte par app. Désormais, avec `navigate` : l'entrée cliquée porte
`aria-busy` et `data-pending`, son icône cède la place au rôle `busy` (une
pastille qui tourne, immobile sous `prefers-reduced-motion`), une zone vive
`role="status"` HORS des liens annonce `nav.loading` dans les sept langues, et
les clics à modificateur restent au navigateur. `onNavigate` reçoit l'évènement
en second argument. Sans `navigate`, rien ne change : pas un attribut de plus.

**`items[].load`** — le thunk du morceau, LE MÊME que celui passé à `lazy()` :
la barre le tire à l'approche du pointeur, au focus ou au doigt, par le
`prefetch` du socle (une fois, jamais sur `saveData` ni en 2g). Le socle avait
déjà `react/use-prefetch` — zéro adoptant, treize copies à la main.

**`react/use-retry-when-online`** — `useRetryWhenOnline(onFallback, retry, {
graceMs })` : promu du `useReferentialRetry` de mister-miss-koh. Un service
worker sert la PWA avant que la radio soit prête ; une app qui choisit alors un
repli et ne relit jamais le garde toute la session. Une tentative par retour du
réseau, après un répit, et le repli choisi sur délai est couvert aussi.

**`isTransientMessage`** (`react/net`) — le motif que miss-uwh et mister-doc
portaient au caractère près comme `shouldRetry` de leur file de synchro.

**`pwa-doctor`** — deux dettes de plus, famille `source` : `prefetch-routes`
(des routes paresseuses sans aucun préchargement) et `nav-attente` (des routes
paresseuses sans retour au clic : ni `navigate` sur la barre, ni transition
propre, ni frontière `key={pathname}`). Un dépôt dont les routes paresseuses ne
sont atteintes par aucun lien interne (mister-miss-koh) répond par
`pwaDoctor.refus`.

Un rôle d'icône `busy` (`LoaderCircle` chez lucide, même tracé en repli) et une
clé `nav.loading` entrent dans les contrats ; `lucideIconSet` et les sept
dictionnaires les portent.
