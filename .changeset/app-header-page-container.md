---
'@mister-guiiug/dev-wpa-config': minor
---

`react/app-header` et `react/page-container` — le troisième côté du cadre, et
le conteneur de vue

Le socle avait `BottomNav` et `AppFooter`. Il n'avait pas l'en-tête. Neuf
apps en ont un — `AppHeader` (genius, supaboss, uwh, cim10), `Header` (doc,
ticket-pwa), `TopBar` (footcoach, carbook), `Navbar` (puzzle) — dont le
contenu est métier mais la mise en page identique : `<header>` collant, zone
sûre iOS, fond translucide, filet, un titre, une rangée d'actions.

**`AppHeader`** ne rend que ça, sur le contrat du `TopBar` de footcoach :
`title` (un vrai `h1` — `mister-cim10` le rendait en `<p>` hors de l'accueil,
et la page perdait son titre pour un lecteur d'écran), `leading`, `actions`,
`children` sous la rangée, et le retour : un **lien** quand il a une
destination (`backHref`, par le `linkComponent` du routeur), un **bouton**
quand il n'a qu'une action (`onBack`), nommé « Retour » dans les sept langues
du dictionnaire (`nav.back`) et dessiné par le nouveau rôle `back`
d'`IconsProvider`.

**`PageContainer`**, promu de badminton et molkky : centré, borné à un palier
(`sm` 28 rem → `xl` 64 rem, `full`), zones sûres comprises — celle du bas
surtout, sans laquelle le dernier bouton d'une vue colle à la barre d'onglets.

`components.css` habille les deux ; le showroom porte leurs fiches ; la table
d'équivalences compte `AppHeader.tsx`, `TopBar.tsx` et `PageContainer.tsx` —
pas `Header.tsx`, qui désigne deux choses différentes selon l'app.
