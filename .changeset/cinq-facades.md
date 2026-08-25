---
'@mister-guiiug/dev-wpa-config': minor
---

Cinq domaines montent d'un cran : ils avaient leurs pièces, pas leur assemblage.

**Observabilité — la couche la plus adoptée (13/16), et la plus recopiée.** Les
treize apps ouvrent leur `main.tsx` par les deux mêmes lignes, et neuf y
ajoutent le même troisième geste : `recordError` recâblé à la main dans le
`onError` de la frontière d'erreur. `installObservability()` fait les trois, et
prend au passage `initWebVitals` — mesurer ce qui casse et mesurer ce qui rame
sont le même sujet, relayés au même endroit. `ObservabilityBoundary` tient le
branchement que quatre apps ne font pas du tout : miss-dice, miss-uwh,
mister-doc et mister-qowa montent leur propre frontière, qui ne relaie rien —
leur écran blanc n'est enregistré nulle part.

**Et un défaut du paquet lui-même.** Le journal d'erreurs écrivait le `context`
dans `localStorage` **sans le masquer**, alors que `redact` avait été écrit pour
ce cas précis — son propre commentaire dit « Pensé pour `react/observability` ».
Une valeur de formulaire, un jeton, une adresse y atterrissaient en clair.
`setRedactKeys` ajoute les clés propres à une app.

**Thèmes — treize scripts anti-FOUC recopiés à la main.** Treize apps sur seize
portent un script de thème _inline_ dans leur `index.html`, de dix à
trente-trois lignes, tous différents. Il doit rester inline et synchrone, donc
hors de portée d'un module — sauf que `pwaSeoPlugin` transforme déjà
`index.html`. `themeBootScript()` l'engendre, `pwaSeoPlugin({ themeBoot: true })`
l'injecte, et `cspPlugin` le hache sans réglage (vérifié de bout en bout).

`ThemeProvider` relie enfin les quatre pièces — palette du catalogue, valeurs,
état, contrôle — et **referme un défaut introduit hier** : `ThemeToggle`
appelait `useTheme()` pour son compte, si bien qu'une app appelant aussi
`useTheme()` avait deux instances écrivant `data-theme` sur `<html>`. C'est
exactement le piège que le catalogue documente à l'entrée `useTheme`. Sous le
fournisseur il n'y a plus qu'un écrivain ; hors fournisseur, la bascule reste
autonome.

**Mise à jour — `registerSW` n'est plus donné qu'une fois.** Quatre pièces
demandaient chacune leur câblage ; une app posant le bandeau ET le bouton
passait `registerSW` deux fois. `AppUpdates` enregistre, rend le bandeau et
publie l'état : `UpdateButton` posé dans un écran de réglages profond ne reçoit
plus rien. `checkEvery` est promu de mister-qowa, seule app à vérifier
périodiquement — sans quoi une PWA installée ouverte plusieurs jours ne
découvre une version qu'au prochain démarrage à froid, et le bandeau
n'apparaît jamais.

**Icônes — un contrat de rôles, pas un jeu d'icônes.** Dix apps sur seize
dépendent de `lucide-react`, règle famille écrite dans le README ; le paquet
dessinait ses propres SVG. Dans ces dix apps, la croix du `Sheet` ne ressemblait
à aucune autre croix de l'écran. `IconsProvider` laisse l'app fournir le dessin
d'un rôle (`close`, `light`, `repo`…) ; les SVG maison restent le repli, donc
une app sans lucide ne change de rien.

**Rive — le runtime s'injecte.** Trois apps déclarent Rive, avec **deux runtimes
différents** : `@rive-app/react-canvas` (mister-molkky, miss-badminton) et
`@rive-app/react-webgl2` (miss-genius). Le module n'en connaissait qu'un —
miss-genius ne pouvait donc pas l'utiliser et a écrit son propre lecteur.
Adoption du composant du paquet : zéro sur trois. `loader` porte désormais ce
choix, et le `lazy()` est mémorisé par loader — le recréer à chaque rendu
rechargerait le WASM et perdrait l'animation en cours.

327 tests, contre 311.
