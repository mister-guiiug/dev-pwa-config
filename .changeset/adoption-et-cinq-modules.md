---
'@mister-guiiug/dev-wpa-config': minor
---

Le paquet mesure enfin son adoption — et ce qu'il découvre change la suite.

**Le relevé.** `npm run adoption` extrait ce que les seize apps importent
RÉELLEMENT du paquet, et ce qu'elles recopient encore à côté. La couche
outillage est adoptée : `vitest-base` 14/16, l'observabilité 13, Playwright et
`vite-pwa-base` 12, `vite-csp` 9. La couche interface ne l'est pas : sur tout
`/react`, seuls `FamilyApps` (13) et `ErrorBoundary` (9) sont importés.
`Button`, `Sheet`, `EmptyState`, `Badge`, `Stat`, `Skeleton`, `AppFooter` sont
à **zéro** — publiés le 10 août, pendant que quatre à sept apps en gardent une
réimplémentation. Le README porte désormais ce tableau, engendré : un document
qui présente un export comme la manière de faire sans dire que personne ne
l'utilise laisse croire à une adoption qui n'existe pas.

**Deux props manquantes, trouvées en comparant les API.** La migration de
miss-uwh a buté sur du concret. `Sheet` n'avait pas de `footer` : miss-uwh en
passe un dans **quinze de ses vingt-trois feuilles**, avec le motif écrit dans
son code — « reste TOUJOURS visible même quand le corps défile (essentiel sur
mobile pour les formulaires longs) ». Le panneau devient donc une colonne dont
le CORPS défile, le pied restant épinglé. Et `EmptyState` n'acceptait qu'une
`description` en chaîne, là où la copie de miss-uwh ne prend que des
`children` : une liste, un lien, deux paragraphes. Les deux étaient des
empêchements réels, pas des préférences.

**Quatre modules promus, mesurés.**

`./download` — **douze apps sur seize** recopient la même danse
`createObjectURL` + ancre + `click()` + `revokeObjectURL`. Deux n'attachent pas
l'ancre au document, ce qui ne déclenche rien sur Firefox ; d'autres oublient
`revokeObjectURL` et fuient à chaque export. Ici l'ancre est attachée puis
retirée, et l'URL révoquée dans un `finally`.

`./share` — quatre apps, trois `shareOrCopy`. Elles se contredisent sur
l'annulation : mister-qowa rend `'failed'` quand l'utilisateur ferme la feuille
de partage, et affiche donc « échec » à quelqu'un qui a changé d'avis.
`'cancelled'` devient une réponse à part entière. `currentAppUrl()` reprend
l'`appUrl()` recopié **à l'identique dans six apps**.

`./web-vitals` — **les quatre copies sont cassées**. Elles déclarent
`web-vitals: ^4.2.0` (résolu en 4.2.4 dans les quatre verrous) et appellent
`onFID`, retiré en v4.0. Le code enregistre CLS, lève sur `onFID`, et le
`try/catch` qui entoure les cinq appels avale l'erreur : FCP, LCP et TTFB ne
sont **jamais enregistrés**. Ces apps croient mesurer cinq métriques, en
mesurent une, et le disent dans une console que personne ne lit. Ici `onINP`
remplace `onFID`, chaque métrique est enregistrée séparément, et la fonction
rend la liste de celles qui ont réellement pris.

`react/theme-toggle` — cinq apps, 18 à 73 lignes. Deux oublient
`type="button"`, si bien que changer de thème soumet le formulaire ; une seule
pose `aria-pressed` ; et **les cinq réduisent le thème à deux états**, rendant
« système » inatteignable une fois qu'on en est sorti. Celui-ci parcourt les
trois états de `useTheme` ; `states={['light','dark']}` retrouve la bascule
mesurée, et alors `aria-pressed` réapparaît.
