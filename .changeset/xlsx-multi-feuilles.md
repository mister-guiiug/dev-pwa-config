---
'@mister-guiiug/dev-wpa-config': minor
---

`/xlsx` : `buildXlsx` écrit plusieurs onglets, et l'en-tête du module cesse de
promettre une adoption impossible.

Le module se présentait comme le remplaçant du SheetJS-par-CDN de miss-uwh.
C'était faux, et la relecture du code cible l'a établi : `buildWorkbookSheets`
rend AU MOINS trois onglets — Bilan, Compte, Evolution —, 19 sur le jeu de
démonstration, 30 au maximum (un par catégorie mouvementée du référentiel
R1–R9 / D1–D13), là où `buildXlsx` codait en dur un `sheet1.xml`, un `<sheet>`,
un `Override` et un `Relationship`. Le bouton promet « Classeur Excel
multi-feuilles » : basculer, c'était livrer un onglet sur dix-neuf. La bascule
a été refusée pour cette raison (miss-uwh PR #54), et l'app est restée sur
SheetJS.

`buildXlsx` accepte donc une feuille **ou un tableau de feuilles**. Chaque
onglet a sa partie `xl/worksheets/sheetN.xml`, son `Override` de type de
contenu, sa relation `rIdN` et son `<sheet name sheetId r:id>` — quatre
numérotations qu'un test relit désormais ENSEMBLE, en suivant le chemin du
tableur, parce qu'aucune ne se vérifie seule. Le `rId` des styles suit le
nombre de feuilles (`rId{N+1}`) au lieu d'être figé à `rId2`, où il serait
entré en collision avec la deuxième feuille.

Deux ajustements que le classeur réel exigeait :

- **`header` devient facultatif.** Une feuille de bilan n'a pas d'en-tête au
  sens du module : elle a un titre sur une cellule. Sans en-tête, les données
  commencent en ligne 1.
- **Les lignes irrégulières sont des lignes.** Une ligne vide occupe sa ligne
  (`<row r="7"/>`) au lieu de disparaître — sans quoi tout ce qui suit remonte
  d'un cran ; une ligne d'une cellule reste d'une cellule ; une cellule absente
  n'est pas émise, et les suivantes gardent leur colonne.

Les noms d'onglets sont maintenant **dédoublonnés** après assainissement
(suffixe ` 2`, ` 3`…, base retaillée pour tenir en 31 caractères) : Excel
compare sans la casse et refuse le classeur entier sur un doublon. Logique
reprise de `safeSheetName` (miss-uwh), qui la tenait déjà pour ses catégories.
La casse donnée par l'appelant est conservée.

Aucune rupture, au sens fort : `buildXlsx({ name, header, rows })` rend les
**mêmes octets** qu'en 3.23.0 — vérifié, et verrouillé par un test qui compare
l'objet seul au tableau d'un élément. `buildXlsx([])` rend un classeur d'un
onglet vide plutôt que de lever, comme `buildPdf([])` rend une page vide : un
classeur sans onglet ne s'ouvre pas.

Migration : miss-uwh bascule `xlsxExport.ts` dès cette version publiée — son
`buildWorkbookSheets` rend déjà des chaînes et des nombres, sans formule, ni
format, ni largeur de colonne. Son **import** de classeurs reste sur SheetJS :
le socle n'écrit que.
