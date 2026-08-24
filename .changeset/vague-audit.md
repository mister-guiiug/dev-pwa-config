---
'@mister-guiiug/dev-wpa-config': minor
---

Les cinq chantiers prioritaires de l'audit du 23/08/2026.

**Une perte d'écriture, dans le seul module sans test.** `useOfflineMutationQueue`
gardait un instantané de la file et réécrivait `instantané.slice(1)` après chaque
envoi : une mutation ajoutée pendant le rejeu était écrasée, sans erreur. Le
rejeu relit désormais le stockage à chaque itération et retire par identifiant.
Trois défauts du même module tombent avec : tête de file bloquante (quarantaine
après `maxAttempts`), croissance sans fin (`maxQueueSize`, refus visible plutôt
que perte silencieuse), `JSON.parse` non validé. Ces sept hooks n'avaient aucun
test — la suite rendait en HTML statique, où aucun effet ne s'exécute. D'où un
harnais DOM et 25 tests, dont le premier reproduit la perte. 123 → 194 tests.

**Le contrat de couleur est livré.** `components.css` lisait 93 `var(--dwc-*)`
sans qu'aucune valeur ne soit fournie : une seule app sur seize définissait le
contrat, ce qui explique son taux d'adoption de 1/16. `tokens.css` donne les
valeurs, claires et sombres, sans couleur de marque, pour les trois états de
thème. Le contraste est calculé en test, pas affirmé — et ce calcul a révélé que
`--dwc-border` bordait à la fois les cartes et les champs de saisie, dont le
pourtour demande 3:1 (WCAG 1.4.11). D'où `--dwc-border-strong`, quinzième
variable du contrat.

**Les seize palettes sont publiées.** Elles ne vivaient que dans le showroom, qui
n'est pas dans `files` : le paquet ignorait ce que sa vitrine savait. Nouvel
export `./themes` avec `themeById` et `brandColor` — de quoi engendrer un
`theme_color` au lieu de le recopier (cinq manifests sur treize avaient divergé).

**La couche PWA existe enfin.** `vite-pwa-base` ne contient rien de PWA : c'est
du SEO. Le relevé des seize apps montrait dix `prompt`, quatre `autoUpdate`,
deux sans ; cinq `runtimeCaching` ; et quinze apps recâblant
`virtual:pwa-register` à la main alors que le hook existe. `pwaBaseOptions()`
donne la base, avec trois défauts assumés et testés : `registerType: 'prompt'`,
aucune mise en cache d'API par défaut, couleurs lues dans `themes.js`.
`vite-pwa-base` gagne l'alias `./vite-seo`, qui dit ce qu'il fait.

**Deux protections qui n'en étaient pas.** `frame-ancestors` en `<meta>` est
ignorée par les navigateurs : le template la portait, huit apps la passent au
plugin. Elle est maintenant retirée avec un avertissement qui dit où la poser
pour de vrai. Et `cspPlugin` + `pwaSeoPlugin`, documentés côte à côte, se
cassaient mutuellement — `analytics: true` autorise exactement les hôtes que
l'autre injecte.

**Surface et outillage.** Un sous-chemin par module `react/` et
`sideEffects: ["*.css"]` (le barrel seul empêchait tout élagage) ; ESLint sort
des `dependencies` ; les trois greffons passent d'optionnels à requis, parce
qu'`eslint-react` les importe sans garde ; le paquet se lint et se type-checke
enfin (`npm run validate`), avec zéro erreur sous `strict` + `checkJs`.

**Changements de comportement, sans adoptant mesuré.** `Button` en chargement
pose `aria-disabled` au lieu de `disabled` (le focus ne retombe plus sur
`<body>` ; le double-clic reste bloqué). `retryableQuery` ne réessaie plus les
4xx définitifs et ajoute une gigue. `Sheet` est étiqueté par `aria-labelledby`.
Aucune app n'importe ces trois symboles à ce jour.
