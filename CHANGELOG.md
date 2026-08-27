# Changelog

## 3.19.0

### Minor Changes

- e12423b: Stockage tolérant, coffre chiffré, préchargement des routes, et un port de notifications push.

  **`./storage`** — PROMU. L'accès `localStorage` enveloppé de `try/catch` est recopié dans **7 apps sur 17**, la plus grosse duplication du relevé. La promotion ajoute `createStore(prefix)` : les seize apps sont servies depuis un seul domaine, donc un seul `localStorage`, et trois seulement préfixent leurs clés.

  **`./secure-storage`** — PROMU de `miss-supaboss/src/api/crypto/patVault.ts` (AES-256-GCM, clé PBKDF2-SHA-256 en mémoire seule). Ses limites sont reprises telles quelles : protège la fuite passive, **pas** un XSS actif. Le nombre d'itérations est relu depuis le coffre, pour qu'en relever la constante ne rende pas illisibles les coffres existants.

  **`./prefetch` et `./react/use-prefetch`** — NEUF, besoin constaté : les 17 apps découpent leurs routes en `lazy()`, aucune ne les préchauffe. Le précache du service worker ne couvre que la deuxième visite. Préchargement sur l'intention (pointeur, focus, doigt), coupé sur `saveData` et en 2G.

  **`./push` + `./push/firebase`, `./push/supabase`, `./push/webpush`** — NEUF ASSUMÉ : aucun code push n'existait dans les dépôts relevés. Livré comme un **port avec adaptateurs**, sur le modèle de `MapProvider` — le paquet n'impose aucun fournisseur. Rapporte _pourquoi_ le push est indisponible (dont le cas iPhone-en-onglet), ne redemande pas une permission déjà refusée, et désabonne côté serveur d'abord.

  Le volet **Logging** de la demande existait déjà (`./logger`), de même que l'offline, la mise à jour et les stratégies de cache (`./vite-pwa`, `./sw-update`).

## 3.18.0

### Minor Changes

- bedf85a: Catégorie `loisirs`, et un relevé d'adoption qui ne s'efface plus lui-même.

  **`loisirs` rejoint la taxonomie** (`CATEGORIES`, le type publié, les libellés fr et en de la vitrine). `mister-family-map` y passe : elle était rangée dans `outils` « faute de mieux », un pis-aller assumé à son ajout. Un test tient désormais la règle — toute catégorie du catalogue doit porter ses trois libellés, faute de quoi la facette affiche un identifiant brut sans que rien ne le signale.

  **`npm run adoption` fusionne au lieu de remplacer.** Lancé sans les dépôts des apps clonés à côté, il écrivait `measured: 1` et effaçait le relevé des seize autres — 1187 lignes en une commande, sans un mot. Un relevé partiel n'est pas un relevé plus récent : c'est une vue partielle du même objet. Les apps mesurées écrasent leur propre entrée, les autres gardent la leur, et chaque entrée porte son `measuredAt`. `--replace` reste possible et refuse de réduire la couverture sans `--force`. La logique vit dans `scripts/adoption-merge.mjs`, éprouvée par six tests.

  Le relevé passe ainsi à **17/17 apps**, pour la première fois complet.

## 3.17.1

### Patch Changes

- fd2b41a: Carte : un `moveend` qui ne déplace rien n'est plus annoncé comme un déplacement.

  Les deux moteurs émettent `moveend` lors d'un **redimensionnement du conteneur** — Leaflet par `invalidateSize`, MapLibre par son observateur de taille — en rapportant le centre inchangé. Une app qui recopie `onViewportChange` dans un formulaire y voyait la saisie de l'utilisateur écrasée par le centre de départ, sans que personne n'ait bougé la carte.

  Les adaptateurs mémorisent désormais la dernière vue annoncée, amorcée à la vue de montage, et ne relaient l'évènement que s'il dit autre chose. Nouveau prédicat `sameViewport(a, b)` dans `@mister-guiiug/dev-wpa-config/map`.

  Complète le correctif de la 3.15.0, qui n'avait retiré que l'émission au chargement.

## 3.17.0

### Minor Changes

- eddcc1e: `react/share-button` — le bouton « Partager », la suite de `share.js`.

  Le module a été promu ; les boutons, non. Quatre apps portent un `share.ts`, et
  chacune garde son bouton — trois réponses différentes à la même question : que
  montrer quand le partage natif n'existe pas et qu'on a copié à la place ? Rien du
  tout, un `window.alert`, ou un libellé qui ne revient jamais à son état initial.

  Ce que le composant tranche :
  - **L'annulation n'affiche rien.** `shareOrCopy` distingue `cancelled` de `failed`
    précisément pour ça ; afficher « échec » à quelqu'un qui a fermé la feuille de
    partage est faux.
  - **Le retour est annoncé.** La région `status` existe dès le premier rendu, vide
    tant qu'il n'y a rien à dire — insérée avec son texte, elle ne serait pas lue.
  - **L'état revient de lui-même** (`resetAfterMs`), sans quoi « Lien copié » ment au
    prochain regard.

  Trois libellés fr/en rejoignent `react/labels`, et `components.css` habille le
  bouton comme les autres du paquet (cible tactile de 2,75 rem comprise).

### Patch Changes

- eddcc1e: `applyUpdate` ne renvoie plus vers une route que le serveur ignore.

  Une app monopage déployée sur un hébergement statique — GitHub Pages, pour les
  dix-sept apps de la famille — n'a de fichier qu'à sa racine :
  `/mister-family-map/profil` n'existe pas côté serveur et ne répond que parce que le
  service worker la rattrape par son `navigateFallback`. Le chemin de purge
  désinscrivait le worker, **puis** rechargeait cette même URL : l'utilisateur
  tombait sur la page 404 de l'hébergeur.

  Reproduit sur un serveur statique sans repli : « Forcer la mise à jour » depuis
  `/profil` menait à `/profil?_t=…` et à « 404 — File not found ». Le défaut ne se
  voit pas en développement, où `vite preview` sert `index.html` pour n'importe quel
  chemin.

  La portée du worker qui contrôle la page est désormais relevée **avant** la
  désinscription, et sert de destination : c'est la seule URL dont on sait que le
  serveur sait la servir. Le chemin propre, lui, reste sur la page courante — le
  worker n'est pas touché, et rien ne justifie de faire perdre son écran à
  l'utilisateur. `reloadTo` garde le dernier mot.

## 3.16.0

### Minor Changes

- 40db19a: `mister-family-map` entre au catalogue de la famille.

  Dix-septième app : carte collaborative de sorties en famille, Supabase, maturité
  `alpha`. Elle apparaît donc dans la grille `FamilyApps` des seize autres, dans le
  tableau « Projets consommateurs » du README et dans la vitrine.

  Sa palette rejoint `themes.js`, **relevée** dans le `src/shared/styles/index.css` de
  l'app — qui exprime tout en OKLCH — et convertie en sRGB exact, pas approximée à vue.
  Le rôle `info`, absent de l'app, reporte le repli de `components.css` plutôt que
  d'inventer une couleur qu'elle n'utilise pas.

  Deux dérivés suivent : les comptes de persistance écrits en toutes lettres dans la
  vitrine passent de six à sept apps Supabase, et `showroom/adoption.js` voit son
  `total` suivre le catalogue — ce champ projette le catalogue, il ne mesure rien.
  Le relevé d'adoption de `mister-family-map` reste à faire : il exige les dix-sept
  dépôts clonés côte à côte.

### Patch Changes

- c2edd10: Le barrel `/react` déclare enfin `VersionProvider`, `useAppVersion` et `AppVersion`.

  `react/index.js` et `react/index.d.ts` sont deux listes tenues à la main, et rien ne
  les comparait. Les trois modules de version ont donc rejoint le barrel d'exécution
  sans rejoindre celui des types : l'import fonctionnait, `tsc` le refusait, et la
  première app à les consommer a dû passer par les sous-chemins.

  `npm run typecheck` ne pouvait pas le voir — il vérifie les fichiers du paquet, pas
  la correspondance entre deux listes dont l'une n'est lue que par les consommateurs.
  Un test compare désormais les exports d'exécution du barrel aux symboles que ses
  types déclarent, en résolvant les `export *` par le compilateur TypeScript lui-même.

## 3.15.0

### Minor Changes

- d2d982f: Carte : la vue initiale part par `onReady`, plus par `onViewportChange`.

  Les deux adaptateurs annonçaient la vue de départ par `onViewportChange` —
  `whenReady` côté Leaflet, `once('load')` côté MapLibre. Une carte qui finit de
  s'initialiser n'a pourtant rien déplacé, et confondre les deux fait d'elle un
  **second écrivain** de l'état qu'elle est censée refléter.

  Le défaut se voit sur une machine lente, donc jamais en développement :
  `mister-family-map` recopie ce callback dans le brouillon de son assistant
  « ajouter un lieu » ; sur un runner à WebGL logiciel, le `load` de la carte
  tombait après la saisie et le centre par défaut (46.6 / 2.4, le milieu de la
  France) écrasait les coordonnées tapées. La détection de doublons cherchait
  alors à 400 km du lieu visé, et le parcours critique échouait trois fois sur
  trois — uniquement en CI.
  - `onViewportChange` ne signale plus que les déplacements réels.
  - `onReady` livre la vue initiale, une fois, quand la carte est prête : c'est
    ce qu'il faut pour amorcer un zoom ou un regroupement de marqueurs.

  **Migration** : un écran qui s'appuyait sur la première émission pour connaître
  son zoom de départ doit désormais brancher `onReady`. Un écran qui n'utilisait
  `onViewportChange` que pour suivre l'utilisateur n'a rien à changer — et cesse
  d'être écrasé.

## 3.14.0

### Minor Changes

- 31dea9c: Affichage et gestion de la version côté frontend.

  Le paquet réclamait une version qu'il ne savait pas produire : `installObservability`
  attendait `context.version`, les cinq modules de mise à jour pilotaient une bascule de
  service worker sans jamais nommer un numéro, et `pwaSeoPlugin` proposait un `iconQuery`
  recopié à la main. Quatre sous-chemins ferment le circuit.
  - `./vite-version` — `versionPlugin()` : `__APP_VERSION__` / `__APP_BUILD_TIME__` /
    `__APP_COMMIT__` par `define`, `globalThis.__DWC_BUILD__` posé dans le `<head>` (le
    seul chemin qu'un module de `node_modules` puisse lire), et `version.json` à la racine
    du build, servi aussi par `vite dev`. À placer **avant** `cspPlugin`.
  - `./version` — SemVer comparé (préversions comprises), `readBuildInfo`,
    `rememberVersion` (montée, rollback et première ouverture distingués) et
    `fetchAppVersion`, qui ne lève jamais. Sans React ni module virtuel.
  - `./react/version` — `VersionProvider` / `useAppVersion` : version courante,
    précédente et publiée. Sans `checkEvery`, aucune requête n'est émise.
  - `./react/app-version` — `AppVersion` : le numéro affiché, « mis à jour vers X » après
    une bascule réussie, « version Y disponible » en région `status`.

  Trois modules existants s'y raccordent, sans rupture :
  - `installObservability` renseigne seul `version`, `buildTime` et `commit` dans le
    contexte de session ; un `context` explicite garde le dernier mot.
  - `AppFooter` accepte `version` (opt-in) ; absent, le rendu est inchangé.
  - `pwaWorkbox` exclut `version.json` du précache — figé, il rendrait éternellement la
    version du build qui l'a figé.

## 3.13.0

### Minor Changes

- c75a066: feat(correlation, logger, map) : relier les canaux d'observabilité, et rendre
  l'adaptateur MapLibre utilisable en développement

  **`/correlation`** — le socle portait déjà quatre canaux (frontière d'erreur,
  journal local, Sentry, télémétrie) qui décrivaient le même incident sans
  pouvoir être rapprochés. `installCorrelation()` pose un identifiant unique dans
  les quatre : contexte de session des erreurs, en-têtes `X-Correlation-Id` /
  `X-Session-Id` des requêtes sortantes (`withCorrelation(fetch)`), propriété
  `correlation_session_id` de la télémétrie (opt-in), et référence affichée par
  `ObservabilityBoundary` pour que l'utilisateur puisse la citer.

  Pas de contexte asynchrone implicite : le navigateur n'a pas d'`AsyncLocalStorage`,
  et une corrélation « courante » en variable de module serait fausse dès deux
  requêtes concurrentes. L'identifiant de session est implicite, celui de requête
  explicite.

  **`/logger`** — journal à niveaux (`createLogger`, `setLogLevel`) écrivant dans
  le **même** fil d'Ariane que `breadcrumb` : pas de second tampon ni de second
  transport, mêmes masquages, et chaque ligne estampillée de son origine et de
  l'identifiant de corrélation.

  **`pwaSeoPlugin` exclut `/map/maplibre` du pré-bundling** — l'adaptateur résout
  l'URL de son worker par le suffixe `?worker&url`, que le pré-bundling des
  dépendances ne sait pas interpréter : `vite dev` refusait de démarrer sur
  `[UNLOADABLE_DEPENDENCY]` alors que le build de production fonctionnait.
  L'exclusion rejoint celle de `react/observability`, déjà portée par ce plugin
  pour la même famille de panne — les apps qui utilisent `pwaSeoPlugin` n'ont
  rien à changer, et celles qui avaient écrit l'exclusion à la main peuvent la
  retirer.

### Patch Changes

- 100da27: fix(correlation) : l'identifiant arrivait masqué, et le câblage ne produisait rien

  Deux défauts du module `/correlation`, invisibles aux tests et constatés en
  faisant tourner une app réelle :
  - **La clé était masquée.** `correlationContext()` renvoyait
    `correlationSessionId` — or le motif de `redact` couvre `session`. Dans le
    contexte des erreurs, donc dans Sentry, l'identifiant arrivait sous la forme
    `[masqué]` : exactement ce que le module est censé apporter, annulé. La clé
    devient `correlationId` (et la propriété de télémétrie `correlation_id`).
  - **Le module était dupliqué.** `/correlation` et `/logger` importent
    `react/observability`, qui est exclu du pré-bundling. Un module pré-bundlé
    embarquant sa copie de ce qu'il importe, il existait DEUX contextes de
    session : celui que la corrélation renseignait n'était pas celui que les
    erreurs lisaient, et `installCorrelation()` ne produisait rien —
    silencieusement. Les deux sous-chemins rejoignent donc l'exclusion.

  Règle générale qui en découle, écrite dans `vite-pwa-base.js` : **ce qui
  importe un singleton exclu doit être exclu aussi.**

  Deux tests de non-régression : l'identifiant survit à `redact`, et les
  sous-chemins à état sont bien exclus.

## 3.12.0

### Minor Changes

- b281be2: Le paquet mesure enfin son adoption — et ce qu'il découvre change la suite.

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

- c8cbdee: Cinq domaines montent d'un cran : ils avaient leurs pièces, pas leur assemblage.

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

- 5bd1bff: Six domaines montent d'un cran, et la mesure d'audience existe enfin.

  Tout ce qui suit part d'une mesure sur les seize apps consommatrices, pas d'une
  intuition. Aucun changement de rupture : chaque ajout est facultatif, et une app
  qui ne touche à rien obtient exactement ce qu'elle avait — à une exception près,
  signalée en fin de note.

  **Internationalisation — 78 formatages ignoraient la langue choisie.** 27
  constructions `Intl.*('xx-XX', …)` et 51 appels `toLocale*('fr-FR')` dans la
  famille : l'utilisateur bascule en anglais, les libellés changent, les nombres
  et les dates restent français. La cause n'était pas la négligence — le contexte
  de `createI18n` rendait la langue mais aucun formateur. Il rend désormais `fmt`
  (`number`, `currency`, `percent`, `date`, `dateTime`, `relative`, `bytes`,
  `list`, `plural`), déjà lié à la locale courante ; il pose `<html dir>`, absent
  partout ; il appelle `setDefaultLocale`, si bien que `format.js` suit la langue
  **même appelé sans locale** ; et il pose lui-même `LabelsProvider`, câblage que
  rien ne rappelait. Nouvelles options : `localeTags`, `currency`, `labels`.

  **Accessibilité — 38 dialogues, 3 pièges de focus.** Le comportement existait,
  enfermé dans `Sheet` via un hook interne, donc inatteignable pour les
  trente-cinq dialogues que les apps écrivent elles-mêmes. `react/a11y` l'expose :
  `useFocusTrap`, `useEscape`, `useScrollLock`, `AnnouncerProvider` /
  `useAnnouncer` (une seule région vivante, contre 66 attributs `aria-live`
  dispersés), `SkipLink` (trois apps en ont un), `VisuallyHidden`. `tokens.css`
  gagne `.dwc-sr-only` — redéfini dans cinq feuilles de style, absent des onze
  autres — `.dwc-skip-link` et un bloc `prefers-reduced-motion`. `Sheet` et
  `ConfirmDialog` reposent maintenant sur ces primitives, à comportement égal.

  **Thèmes — six clés de stockage, dix barres système figées.** `'theme'` (quatre
  apps), `'lh_theme'`, `'mc-theme'`, `'mister-doc:theme'`, `'mister_puzzle_theme'`
  face au `'dwc_theme'` du paquet : adopter le socle perdait la préférence de
  chaque utilisateur, une fois, en silence. `legacyKeys` (sur `themeBootSource`,
  `useTheme` et `ThemeProvider`) lit l'ancienne clé et réécrit sous la neuve.
  `pwaSeoPlugin({ themeColor })` remplace la balise `theme-color` de l'index par
  deux balises `media` qui suivent le thème système dès le premier rendu, et
  `ThemeProvider` en pose une sans `media` pour le choix explicite contraire.

  **Observabilité — le transport était là, le contexte manquait.** Treize apps
  initialisent Sentry, six seulement renseignent un contexte, et 59
  `console.error`/`warn` ne quittent jamais le navigateur. Ajoutés :
  `setSessionContext`, `breadcrumb` / `getBreadcrumbs` (tampon de vingt entrées,
  **en mémoire seulement**), `captureConsole` (enveloppe la console, ne la
  remplace pas), et le hook `useRouteBreadcrumbs`. Tout est masqué avant d'être
  écrit — y compris les arguments objets d'un `console.warn`. Le relais Sentry
  reçoit désormais le contexte **masqué** ; il recevait le contexte brut.

  **Icônes — 149 symboles, zéro adoption.** `lucideIconSet` branche un jeu
  complet en une ligne (`aria-hidden` sauf nom explicite, `focusable="false"`,
  poids de trait commun), sans que le paquet dépende de `lucide-react`. Corrigé
  au passage : `<Icon aria-label="…">` rendait une icône à la fois nommée et
  masquée, donc muette.

  **Rive — aucun `.riv` n'existe.** `find -name '*.riv'` renvoie zéro fichier sur
  les seize dépôts, alors que trois apps déclarent un runtime. Le repli est donc
  le cas nominal : `RiveAnimation` affiche son `fallback` si le runtime manque, si
  le fichier manque ou si le rendu échoue, au lieu de faire disparaître l'écran ;
  `onError` permet de le remonter ; un `src` neuf redonne sa chance au chargement.

  **Mesure d'audience — le tag était posé, la mesure n'existait pas.** Neuf apps
  portent les marqueurs `__ANALYTICS_*__`, trois ont recopié un extrait `gtag` en
  dur, sept n'ont rien — et aucune n'envoie d'événement ni de vue de page après le
  chargement initial. Nouveau module `analytics` : `initAnalytics`,
  `setAnalyticsConsent`, `trackEvent`, `trackPageView`, `setUserProperties`, plus
  le hook `usePageViews`. **Rien n'est injecté avant le consentement** : ni
  script, ni requête, ni cookie. Les fragments de build sont désormais précédés
  d'un `gtag('consent', 'default', …)` où tous les signaux sont `denied` — seule
  position où le mode consentement en tient compte (`consent: false` restaure
  l'ancien comportement). GA4 est configuré avec `send_page_view: false`, pour que
  la page d'entrée ne soit pas comptée deux fois.

  **Le seul changement de sortie visible.** `formatBytes` traduit son unité
  (`1.4 MB` en anglais, au lieu du `1,4 Mo` figé par un tableau écrit en dur) et
  sépare le nombre de l'unité par une espace fine insécable — le séparateur que
  `formatNumber` produit déjà pour les milliers, et dont cette fonction était la
  seule à s'écarter parce qu'elle assemblait sa chaîne à la main. Une comparaison
  de chaînes écrite avec une espace ordinaire échoue donc et doit être ajustée.

## 3.11.0

### Minor Changes

- 3fbb0dc: Trois composants promus, la mise à jour rationalisée, et un dictionnaire fr/en.

  **Trois composants que sept apps avaient déjà écrits chacune de leur côté.**
  `ConfirmDialog` existe dans sept apps sur seize, en sept fichiers différents —
  trois disent explicitement remplacer `window.confirm`. Elles se contredisent sur
  le point le plus lourd : mister-quota met `autoFocus` sur le bouton de
  CONFIRMATION, si bien qu'une frappe sur Entrée supprime, quand mister-doc et
  mister-qowa documentent le choix inverse. C'est celui-ci qui est repris. S'y
  ajoutent le rôle `alertdialog` (deux copies sur sept), un nom accessible (le
  `role="dialog"` de mister-quota était posé sur le fond, sans étiquette), et
  `loading` — miss-uwh enchaînait `onConfirm()` puis `onClose()`, ce qui interdit
  toute confirmation asynchrone.

  `Toast` : six piles maison, six durées, trois défauts communs. miss-supaboss et
  mister-footcoach posent `aria-live` sur le conteneur ET `role="status"` sur
  chaque message, qui est donc annoncé deux fois ; miss-carbook n'en affiche qu'un
  à la fois, le précédent disparaissant sans avoir été lu ; mister-doc et
  mister-footcoach ne nettoient jamais leurs `setTimeout`. La version promue monte
  deux régions vivantes en permanence, borne la pile en faisant céder le plus
  ancien, et suspend le compte à rebours au survol et au focus — ce qu'aucune des
  six ne faisait.

  `BottomNav` : sept apps, quatre défauts d'accessibilité. Trois `<nav>` sans nom ;
  quatre onglets courants distingués par la seule couleur, invisible en contraste
  forcé ; une pastille nommée par `aria-label` sur un `<span>`, donc muette
  (miss-lookhouse) ; un bouton « Plus » sans `aria-expanded` (mister-footcoach,
  alors que miss-contraction pose les deux). Le composant est agnostique de
  routeur : `linkComponent` + `hrefProp`.

  **La mise à jour cesse d'être un bouton mort.** Six apps portent un bouton
  « Forcer la mise à jour », avec six mécaniques. `mister-molkky` documente le
  symptôme : sans worker EN ATTENTE, `updateServiceWorker(true)` ne fait
  strictement rien. miss-genius et miss-uwh, elles, postent `SKIP_WAITING` puis
  rechargent dans la foulée — l'activation étant asynchrone, la page rechargée
  peut encore être servie par l'ancien worker. Nouveau module `./sw-update`, sans
  React ni module virtuel : il attend `controllerchange` avant de recharger, et
  bascule sur la purge du Cache Storage quand aucun worker n'attend. Chaque appel
  aux API service worker est plafonné (elles pendent sur iOS en mode autonome), et
  une minuterie de secours recharge quoi qu'il arrive. `localStorage`,
  `sessionStorage` et IndexedDB ne sont jamais touchés.

  Conséquence : `useUpdatePrompt` reçoit `registerSW` en paramètre au lieu de
  l'importer en dur. Les deux modules de mise à jour **rejoignent le barrel** et
  sortent de la liste d'exclusion de la CI — il n'y reste qu'un module hors
  contexte, contre trois. Nouveau `UpdateButton` pour l'écran de réglages, qui n'a
  besoin de rien.

  **Onze libellés sortent du code.** Ils étaient codés en dur en français dans six
  composants, tous surchargeables par prop, mais sans aucun pont avec `createI18n`
  que huit apps utilisent : chacune recâblait les mêmes chaînes à la main.
  `LabelsProvider` / `useLabels` posent trois niveaux — la prop l'emporte, puis le
  contexte, puis le français — de sorte qu'une app qui ne fait rien obtient
  exactement ce qu'elle avait avant. Le contexte est séparé de `createI18n` à
  dessein : celui-ci est isolé par app, le paquet ne peut pas le lire. Et `plural`,
  sur `Intl.PluralRules`, remplace le ternaire `n > 1` qui donne « 0 éléments » en
  français.

  **Au passage.** Échap, piège de focus, restitution et verrou de scroll sortent de
  `Sheet` dans un `use-dialog.js` interne, partagé avec `ConfirmDialog` — recopier
  ces quatre-vingts lignes aurait été l'erreur que le paquet reproche aux apps. La
  garde de `components.css` sur les bordures transparentes ne voyait pas les
  raccourcis directionnels (`border-block-start`), elle les voit maintenant ; le
  harnais de test n'exposait pas `location`, ce qui rendait `sw-update` intestable.
  265 tests, contre 213 : 52 de plus, dont une bonne moitié reproduit un défaut
  relevé dans une app nommée avant de vérifier qu'il est refermé.

- 0e63a1a: Deux modules recopiés sont promus — en corrigeant ce qu'ils avaient faux.

  **`./format`.** Six apps ont un `format.ts`, et **trois portent exactement la
  même liste de dix fonctions** (miss-carbook, miss-contraction, mister-puzzle) :
  du copier-coller, pas une convergence. `Intl.NumberFormat` apparaît dans treize
  apps sur seize. Trois défauts tombent à la promotion : une valeur non finie
  affichait « NaN € » et rend désormais une chaîne vide ; `slugify` s'appuyait sur
  `[^\w-]` pour faire tomber les diacritiques — un effet de bord — et laissait
  « bonjour- » pour « Bonjour ! » ; `formatRelativeTime` prend une référence de
  temps, donc se teste.

  **`./security`.** Trois apps portent un `src/utils/security.ts`, dont **deux
  identiques à l'octet**, et dont l'en-tête dit déjà « Utilitaires de sécurité pour
  tous les projets ». Deux corrections de fond : `sanitizeHtml` créait un élément
  DOM pour lire son `innerHTML` — inutilisable en test Node, en service worker ou
  en rendu serveur, et le nom promettait un nettoyage qui n'a jamais eu lieu ; elle
  devient `escapeHtml`, pure, avec sa limite écrite. Et `isBotRequest`, qui
  reniflait l'agent utilisateur, n'est pas reprise : un agent se déclare ce qu'il
  veut.

  **Un déni de service, dans la fonction la plus anodine.** `isValidEmail`
  utilisait `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`, dont les deux dernières classes se
  recouvrent : un point appartient à `[^\s@]`. Sur une saisie qui ÉCHOUE, le
  moteur explore chaque découpage possible — 19 ms pour 4 ko, **1 s pour 32 ko**,
  ×4 à chaque doublement. Un champ où l'on colle une adresse suffisait à figer
  l'onglet. La validation se fait désormais en un seul parcours, sans expression
  régulière, avec le même verdict sur onze cas limites. Le test échoue en 3 974 ms
  sur l'ancienne version.

- c85f4ae: feat(map) : socle cartographique multi-moteurs derrière un port `MapProvider`

  Nouveaux sous-chemins :
  - `/map` — agnostique du moteur : port `MapProvider`, sources de tuiles
    (`osmRasterTiles`, `vectorTiles`), regroupement par grille (`clusterByGrid`,
    `clustersToMarkers`, `isClusterId`) et helpers d'intégration
    (`mapCspDirectives`, `mapTileRuntimeCaching`).
  - `/map/leaflet` — adaptateur Leaflet (peer optionnelle `leaflet`).
  - `/map/maplibre` — adaptateur MapLibre GL (peer optionnelle `maplibre-gl` ^6).

  Le moteur se choisit **par l'import** : un seul adaptateur est embarqué. Il est
  chargé paresseusement au montage, donc les modules restent importables côté
  serveur et le poids n'est téléchargé que si une carte s'affiche.

  Trois pièges de production sont pris en charge par le paquet : l'URL du worker
  MapLibre (introuvable en prod alors que le dev fonctionne), les tuiles chargées
  par `fetch` qui relèvent de `connect-src` et non d'`img-src`, et les échecs de
  tuiles qui ne doivent jamais faire échouer le montage.

- 7f841e3: Les cinq chantiers prioritaires de l'audit du 23/08/2026.

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

- ab1e988: Vitrine des dépôts de la famille : catalogue à facettes, `FamilyApps` étendu, miroir engendré pour le showroom.

  **`apps-catalog` — quatre facettes et six helpers.** Chaque app porte désormais
  `category` (domaine éditorial), `backend` (persistance **relevée** dans son code)
  et `platform` (`web` par défaut, `desktop` pour l'app Electron). `backend` est
  laissé **absent** quand il n'a pas été relevé : un filtre qui affiche « non
  relevé » vaut mieux qu'une donnée devinée. Nouveaux exports `appById`,
  `sortApps`, `filterApps`, `countBy`, plus les constantes `MATURITIES`,
  `MATURITY_ORDER`, `CATEGORIES`, `BACKENDS`, `PLATFORMS`. La recherche de
  `filterApps` ignore les diacritiques (« molkky » trouve « Mölkky ») et exige
  tous les mots. Aucun champ existant n'a changé de forme.

  **`FamilyApps` — le dépôt devient atteignable depuis la carte.** Nouvelles props
  `showRepoLinks` (lien GitHub par carte), `sort` (`curated | maturity | name`) et
  `max` (coupe **après** le tri). `showRepoLinks` est opt-in : sans lui, le DOM
  produit est identique à celui des versions précédentes. Avec lui, la carte porte
  deux ancres **frères** — l'application et son dépôt —, jamais imbriquées. Chaque
  `<li>` expose les facettes du catalogue (`data-maturity`, `data-category`,
  `data-backend`, `data-platform`), stylables sans réimplémenter la grille.
  `components.css` habille les nouveaux sélecteurs `family-app-item` et
  `family-app-repo`, cible tactile de 2,75 rem comprise.

  **Showroom — une section « Les applications de la famille ».** Les seize dépôts
  en une grille : recherche, trois axes de filtres croisés affichant le compte
  qu'ils donneraient, tri, liens app + dépôt, et un bouton qui rhabille la page
  entière avec la palette de l'app. L'état de la vitrine entre dans l'URL, donc se
  partage. Les pastilles sont peintes avec la primaire réelle de chaque app :
  aucune icône distante, la page ne fait toujours aucune requête réseau.

  **Anti-dérive.** `npm run showroom:sync` (`scripts/sync-showroom.mjs`) engendre
  `showroom/apps.js` depuis le catalogue et recopie `components.css` ;
  `test/apps-catalog.test.mjs` refuse un miroir périmé et vérifie que les comptes
  annoncés par la section « Stack » (6 Supabase, 3 Firebase, 5 local-first)
  collent au champ `backend`.

- 3bfec7d: Vitrine, deuxième vague : ce que chaque dépôt consomme du paquet, relevé plutôt que déclaré.

  **`configs` — le chaînon manquant.** Chaque app du catalogue porte désormais la
  liste des sous-chemins du paquet qu'elle importe réellement, obtenue en
  cherchant `'@mister-guiiug/dev-wpa-config/…'` dans son code source. Nouveaux
  exports `CONFIG_SUBPATHS` et `countByConfig`, nouveau critère
  `filterApps({ config })`. Le relevé a immédiatement dit deux choses que
  personne n'avait écrites : `components.css` n'a **qu'un adoptant sur seize**
  (`miss-uwh`), et **`mister-quota` ne consomme rien du paquet** — la vitrine
  affirmait pourtant que les seize dépôts en étaient consommateurs.

  **Le tableau « Projets consommateurs » du README est engendré.** Il redisait à
  la main ce que le catalogue sait déjà, et avait déjà divergé sur la persistance
  de `miss-uwh`. `npm run sync` (ex-`showroom:sync`, désormais
  `scripts/sync-generated.mjs`) régénère quatre dérivés du catalogue : le miroir
  du showroom, la copie de `components.css`, ce tableau, et un bloc JSON-LD
  `ItemList` posé en dur dans le `<head>` — seize `SoftwareApplication` lisibles
  sans exécuter le script.

  **Recherche corrigée.** Taper « supabase » ne renvoyait qu'une carte, à côté
  d'une pastille annonçant « Supabase 6 » : la page se contredisait. Les facettes
  et les sous-chemins entrent dans le texte cherché, sous leur identifiant comme
  sous leur libellé traduit.

  **Vitrine.** Quatrième axe de filtre (« Consomme… », menu déroulant avec le taux
  d'adoption de chacun des dix-huit sous-chemins), vue **tableau** pour comparer
  les seize lignes d'un coup d'œil, ancre `#app-<id>` par application, bouton
  « copier le lien de cette vue », raccourci <kbd>/</kbd> vers la recherche, et le
  détail des sous-chemins par carte. La section « Démo » a perdu son menu
  d'applications : deux sélecteurs pour une seule bascule, treize apps d'un côté
  contre seize de l'autre — la vitrine est le seul sélecteur.

  **Palettes complètes.** `miss-dice`, `miss-ticket-pwa` et `mister-quota`
  rejoignent `themes.js` : seize apps, seize palettes. Les valeurs exprimées en
  `rgba()` sont composées sur le fond réel de l'app plutôt que choisies à vue, et
  `accent` répète `primary` là où l'app n'a qu'un ton de marque, plutôt
  qu'inventer une couleur.

  **Données vivantes.** `scripts/fetch-metrics.mjs` relève l'état réel des dépôts
  (version publiée, dernier push, dépôt archivé) et un workflow nocturne commite
  `showroom/metrics.js`. La page ne fait toujours **aucune requête réseau** : le
  relevé est posé sur `globalThis` par un `<script src>`, comme `themes.js`. Un
  fichier vide est un état valide, et c'est celui qui est livré.

  **Captures.** `npm run screenshots` cadre, normalise et convertit en WebP les
  applications déployées ; une capture déclarée remplace le monogramme sur sa
  carte et l'aperçu généré dans la section « Démo ». Aucune image n'est livrée
  avec cette version.

## 3.10.1

### Patch Changes

- 0ac413a: Showroom : catalogue cherchable, pièges par composant, arbres de décision,
  hooks. Aucun changement du contenu publié sur npm — `showroom/` n'est pas dans
  `files`.

  Le showroom montrait chaque composant isolément et ne répondait jamais à deux
  questions : **lequel prendre** quand plusieurs conviennent, et **comment on se
  trompe** avec celui qu'on a pris. Les deux se répondaient pourtant déjà dans le
  dépôt — en commentaires de `components.css`, en notes de version — c'est-à-dire
  partout sauf là où l'erreur se commet.
  - **32 pièges** répartis sur les 14 fiches, chacun adossé à un défaut constaté
    et chiffré : 7 apps sur 13 avaient réimplémenté `EmptyState`, les variantes
    `sm` locales descendaient à 32 px, une variante pleine de `Badge` échouait au
    contraste dans 11 thèmes sur 14, les copies locales de `Field` remplaçaient
    l'aide par l'erreur dans `aria-describedby`. Plus une note d'accessibilité par
    fiche.
  - **4 arbres de décision** de deux à quatre branches — au-delà, ce n'est pas
    l'arbre qui manque de place, c'est l'API qui est sous-spécifiée. Chaque
    recommandation est un lien vers la fiche du composant.
  - **Les 9 hooks du paquet**, qui n'apparaissaient nulle part dans sa propre
    vitrine alors qu'ils en sont près de la moitié de la surface React.
  - **Un catalogue cherchable** de 23 entrées, filtrable par catégorie.

  `test/showroom-catalogue.test.mjs` importe `react/index.js` et exige que tout
  export soit documenté ou nommément exclu — c'est ce qui a révélé l'absence des
  hooks. Il vérifie aussi la parité FR/EN piège par piège (longueur des listes
  comprise), la forme des arbres, et que chaque fiche a bien son emplacement dans
  la page.

  Deux défauts trouvés et corrigés en cours de route : reconstruire les boutons de
  filtre à chaque clic renvoyait le focus sur `<body>` — au clavier, on repartait
  en haut de la page ; et le lien de recommandation, peint en `--ds-primary`,
  tombait sous 4,5:1 dans 5 combinaisons thème × schéma sur 28. Son encre est
  désormais dérivée, comme celle des pastilles.

## 3.10.0

### Minor Changes

- 802db6b: `components.css` : contraste forcé et impression.

  Deux rendus que le fichier ne traitait pas, et que personne ne regarde. Ils
  remplacent les couleurs sans prévenir, alors que tout l'habillage repose sur des
  variables et des `color-mix()`.

  **Contraste forcé** (`forced-colors: active`). Trois régressions, vérifiées et
  non déduites. `transparent` n'est pas remplacé par le navigateur : le bouton
  primaire perdait son aplat et gardait un contour invisible — il devenait un
  texte flottant. `box-shadow` est supprimée : le panneau modal, seul composant
  sans bordure, se confondait avec son propre voile devenu opaque. Enfin le
  squelette de chargement et la pastille de synchro n'existaient que par leur
  couleur de fond. Le survol passe désormais par `Highlight` / `HighlightText`
  plutôt que par un `filter: brightness()` — non forcé, il délavait la palette
  choisie par l'utilisateur — et l'état désactivé par `GrayText` plutôt qu'une
  opacité, elle non plus pas forcée. Aucun `forced-color-adjust: none` : figer nos
  teintes reviendrait à passer outre le réglage.

  **Impression**. Les navigateurs suppriment les fonds mais gardent la couleur du
  texte : un libellé en `--dwc-primary-contrast` s'imprimait blanc sur blanc. Le
  texte posé sur un aplat repasse en encre système, les bannières d'installation
  et de mise à jour ne s'impriment plus, et les animations sont figées — un
  squelette s'imprimait à l'opacité qu'il avait au moment du rendu.

  Deux tests empêchent la récidive plutôt que de constater la présence des blocs :
  tout contour transparent doit avoir sa contrepartie en contraste forcé, et tout
  texte posé sur un aplat la sienne à l'impression.

  Showroom : bac à sable de props (aperçu et appel React réécrits ensemble),
  audit de contraste forcé avec émulation avant / après, feuille d'impression, et
  section Rive dans la stack.

## 3.9.0

### Minor Changes

- 361e02d: Lighthouse : ne plus publier le rapport sur un stockage public par défaut.

  Le reusable `pwa-lighthouse.yml` passait `temporaryPublicStorage: true` en dur :
  chaque run de PR poussait le rapport complet — dont la capture pleine page de
  l'application — dans un bucket GCP public, sans que le dépôt consommateur ait
  son mot à dire. Le rapport est désormais joint au run en artefact, et
  l'exposition publique devient un choix explicite via le nouvel input
  `public-report` (défaut `false`).

  Le template `.lighthouserc.json` bascule aussi son `upload.target` sur
  `filesystem` : l'action ignore ce bloc (elle force ses propres cibles), mais
  `lhci autorun` en local le lit, et publiait donc lui aussi sans prévenir.

  Aucun changement du contenu publié sur npm.

## 3.8.4

### Patch Changes

- 19c9c68: Showroom, UX vague 2 : copie, extraits d'usage, comparaison clair/sombre,
  échecs d'accessibilité actionnables, tableaux en cartes sur mobile.

  La page montrait le DOM produit et les sélecteurs à cibler, jamais l'appel du
  composant — c'est pourtant ce qu'on vient copier. Quatorze extraits React sont
  désormais injectés, chacun montrant les props qui comptent pour
  l'accessibilité. Tokens, sélecteurs, couleurs et extraits sont copiables.

  Les échecs de contraste ne se contentent plus d'un verdict : ils affichent les
  deux couleurs en cause, proposent la couleur corrigée la plus proche — en
  sachant distinguer les cas où c'est le FOND qu'il faut foncer, du blanc sur une
  couleur de marque ne se rattrapant pas par le texte — et se localisent d'un
  clic sur la page.

  Sept tableaux sur onze débordaient horizontalement en 375 px : il n'en reste
  qu'un, la matrice de boutons, dont l'aplatissement détruirait le croisement
  variantes × tailles.

  Aucun changement du contenu publié sur npm.

## 3.8.3

### Patch Changes

- d6ddbde: Showroom, UX : régions nommées, état partageable par lien, barre compacte sur
  mobile.

  Les neuf sections portaient zéro nom accessible — une page qui documente
  l'accessibilité annonçait neuf « region » anonymes. Elles sont désormais
  étiquetées par leur titre, et le nom suit la langue.

  L'état (thème, schéma, langue) vit dans l'URL, le stockage local ne servant
  plus que de mémoire entre deux visites. Sur une page dont le sujet est la
  comparaison de thèmes, ne pas pouvoir en envoyer un par lien était le manque
  le plus surprenant.

  Sur mobile, les réglages occupaient 243 px sur 812, soit 30 % du premier écran
  avant le moindre contenu. Ils passent derrière une divulgation : 101 px, 12 %.
  Le badge de breakpoint, qui est de la sortie de mesure, descend auprès de la
  liste des points de rupture.

  Aucun changement du contenu publié sur npm.

## 3.8.2

### Patch Changes

- 12a18e2: Showroom : chaîne d'outils d'accessibilité et galerie de démo par application.

  La section Accessibilité expose désormais les quatre filets successifs et ce
  que chacun attrape — `eslint-plugin-jsx-a11y` à l'écriture, axe-core en CI dans
  11 apps, Lighthouse CI qui bloque la PR sous 0,9 dans 12 apps, et le design
  system lui-même pour ce qu'un audit ne rattrape pas. Avec le rappel qu'axe-core
  ne détecte que 30 à 50 % des défauts.

  La galerie de démo laisse choisir une app : le showroom bascule dans son
  univers et un aperçu montre les composants partagés à ses couleurs. Ce sont des
  aperçus GÉNÉRÉS, dit explicitement, pas des captures. Une vraie capture déposée
  dans `showroom/screenshots/` et déclarée dans `screenshots.js` prend
  automatiquement leur place.

  Aucun changement du contenu publié sur npm.

## 3.8.1

### Patch Changes

- 2dac101: `pwaSeoPlugin` exclut désormais `react/observability` du pré-bundling Vite.

  Ce module charge Sentry (peer **optionnelle**) par un import dynamique au
  spécificateur volontairement non littéral, précisément pour rester
  inanalysable. L'optimiseur de dépendances replie malgré tout la concaténation
  en littéral — visible dans la sortie générée — et `vite:import-analysis` échoue
  alors à résoudre `@sentry/react` dans les apps qui ne l'ont pas installé :
  **500 sur toute la page en dev**, écran blanc. Le build de production n'était
  pas concerné, ce qui rendait le défaut d'autant plus déroutant.

  Trois apps avaient déjà écrit cette exclusion à la main, chacune de son côté.
  Elle appartient au paquet : c'est son propre module qui est en cause. Les apps
  qui n'utilisent pas `pwaSeoPlugin` doivent la déclarer elles-mêmes.

## 3.8.0

### Minor Changes

- fe19ce7: Catalogue famille : ajout de **Miss Lookhouse** (beta) et **Mister Qowa** (alpha).

  Les deux applications sont publiques, déployées sur GitHub Pages et consomment
  le preset partagé depuis un moment, mais n'apparaissaient dans le composant
  `FamilyApps` d'aucune autre app de la famille.

  `mister-qowa` n'a pas de `favicon.svg` à la racine (404 vérifié en production) :
  son entrée pointe sur `icons/icon.svg`. Les 15 icônes du catalogue ont été
  re-vérifiées en production à cette occasion — toutes répondent 200.

## 3.7.1

### Patch Changes

- 897f91b: `components.css` : neutralise l'attribut `hidden`.

  L'attribut `hidden` ne masque que via la feuille de style du navigateur — la
  moindre règle d'auteur posant un `display` le neutralise. Presque tous les
  composants habillés ici déclarent un `display`, si bien qu'une app basculant
  `hidden` (plutôt que de démonter le composant) voyait l'élément rester à
  l'écran. Symptôme observé : la feuille modale du showroom s'affichait par-dessus
  la page dès le chargement, alors qu'elle portait bien `hidden`.

  Une règle `[data-dwc][hidden] { display: none }` couvre tout le jeu. Elle est
  placée en dernier et un test l'y maintient : à spécificité égale, c'est l'ordre
  qui tranche.

## 3.7.0

### Minor Changes

- b05aeaf: Six primitives d'interface promues depuis les apps : `Button`, `TextField` /
  `SelectField` / `TextAreaField`, `Skeleton` / `SkeletonGroup`, `Sheet`, `Stat`,
  `Badge`.

  Aucune API inventée : chacune reprend ce sur quoi plusieurs apps avaient
  convergé (quatre d'entre elles avaient le même jeu de variantes de bouton, deux
  avaient le même fichier `Field` à la variable CSS près). La version partagée
  referme les trous d'accessibilité que chaque copie laissait passer :
  - `Button` — cible tactile de 2,75 rem à TOUTES les tailles, `aria-busy` +
    désactivation pendant `loading` (anti double-clic), `type="button"` par défaut ;
  - `Field` — `aria-describedby` référence l'aide ET l'erreur, au lieu de faire
    disparaître la consigne au moment où elle sert ;
  - `Skeleton` — barres `aria-hidden`, `role="status"` porté par le seul conteneur ;
  - `Sheet` — piège de focus, focus restitué à la fermeture, scroll de fond
    restauré, safe-area iOS ;
  - `Stat` — `<dl>/<dt>/<dd>`, tendance signalée par une flèche ET un libellé lu ;
  - `Badge` — axe `tone` sémantique × `variant`.

  `components.css` habille les six. Le texte des pastilles est **dérivé** du ton
  plutôt que pris brut : mesuré sur les 14 thèmes du showroom, un ambre ou un vert
  de marque posés tels quels tombaient à 2:1. Le mélange avec `--dwc-text` remonte
  le pire cas à 5,3:1 en conservant la teinte. Nouveau token de contrat
  `--dwc-info`.

  `react` et `react-dom` deviennent des devDependencies du paquet : les tests de
  rendu des composants étaient jusqu'ici toujours ignorés faute de dépendances, et
  ne prouvaient donc rien.

### Patch Changes

- c6038d7: Showroom : section **Stack** et bascule **français / anglais**.

  La section Stack est relevée dans le `package.json` et le code des applications,
  pas dans une note d'intention — Supabase (6 apps) / Firebase (3) / local-first
  (5) avec les fonctionnalités réellement appelées, la règle d'icônes
  `lucide-react`, Leaflet + OpenStreetMap pour la seule app qui cartographie, et
  l'outillage de test (Vitest 4, Playwright, axe-core, Browser Mode inutilisé).

  L'internationalisation ne duplique pas le français : il reste dans le HTML, et
  `showroom/i18n.js` ne porte que les autres langues. `test/showroom-i18n.test.mjs`
  refuse qu'un bloc reste sans traduction ou qu'une clé traîne sans emploi.

  Aucun changement du contenu publié sur npm : le showroom n'est pas dans `files`.

## 3.6.0

### Minor Changes

- da85dcd: Nouvel export opt-in `./components.css` : habillage prêt à l'emploi des
  composants `/react`.

  Les composants ne posent que des attributs `data-dwc` et restent non stylés — en
  pratique, 11 apps sur 13 ont réécrit à la main les mêmes 12 à 23 sélecteurs, et 7
  ont réimplémenté `EmptyState` plutôt que d'habiller celui du paquet.

  `@import '@mister-guiiug/dev-wpa-config/components.css'` donne une base correcte
  en clair comme en sombre sans aucune configuration (replis via les couleurs
  système CSS `Canvas` / `CanvasText` / `GrayText`, qui suivent `color-scheme`, et
  `light-dark()` pour les quatre tons d'état). Pour passer aux couleurs de l'app,
  brancher le contrat `--dwc-*` : treize variables, une fois.

  Aucune couleur de marque n'est imposée et rien n'est verrouillé : tout est en
  `@layer components`, donc les utilitaires Tailwind et le CSS non « layered » de
  l'app l'emportent. Toutes les commandes respectent la cible tactile de 2,75 rem.

  Additif : aucun changement sur les exports existants.

## 3.5.2

### Patch Changes

- `eslint-react` : les règles jsx-a11y que `recommended` désactive restent désactivées.

  Le passage « toutes les règles a11y en `warn` » de la 3.5.0 mappait **toutes** les
  clés de `jsxA11y.flatConfigs.recommended.rules` vers `warn`, y compris les deux que
  le plugin met délibérément à `off` : `label-has-for` (déprécié au profit de
  `label-has-associated-control`) et `anchor-ambiguous-text`.

  Conséquence chez les consommateurs : `label-has-for` exige `nesting` **ET** `id`, donc
  tout `<label>` enveloppant son champ — motif pourtant parfaitement accessible et
  recommandé — remontait en warning. 12 faux positifs sur mister-qowa à lui seul.

  Les niveaux `off` de `recommended` sont désormais préservés ; les autres règles
  restent en `warn` comme prévu.

## 3.5.1

### Patch Changes

- `tailwind-preset` : breakpoints repassés en **rem** (`40/48/64/80rem`) au lieu de px.

  Les valeurs px (`640/768/1024/1280`) écrasaient les défauts rem de Tailwind 4 : une
  fois le preset importé, `sm:` / `md:` / `lg:` / `xl:` compilaient en
  `@media (width>=640px)` au lieu de `@media (width>=40rem)`, et ne suivaient donc plus
  la taille de police par défaut du navigateur (régression d'accessibilité pour qui
  agrandit sa police). Les nouvelles valeurs sont strictement équivalentes aux
  anciennes quand la racine vaut 16 px — aucun changement visuel dans le cas nominal.

  `tailwind-preset.js` (export informationnel) est réaligné sur le `.css`.

## 3.5.0

### Minor Changes

- 35068c5: `eslint-react` : ajout de `eslint-plugin-jsx-a11y` (config `recommended`), toutes
  les règles ramenées à `warn`.

  Capte les violations d'accessibilité au **lint** (en amont du filet e2e axe-core),
  sans bloquer la CI. Trajectoire d'adoption identique aux règles React Compiler :
  remonter en `error` par app une fois les warnings résorbés (cf. README, section
  « Accessibilité »). Le plugin est déclaré en `dependencies` (bundlé) + peer
  optionnelle, comme `react-hooks`/`react-refresh`.

### Patch Changes

- 36527c2: Fiabilisation du cycle de vie (refs, publication, doc) — aucun changement d'API.
  - **Reusables & templates** : toutes les refs internes `@v1` → `@v3`. Les tags
    majeurs `v1`/`v2` sont gelés (publish.yml n'avance que le major courant), donc
    `firebase-deploy@v1`/`supabase-migrate@v1` servaient du code pré-3.0.0. Nouveau
    garde-fou `test/workflow-refs.test.mjs` : échec CI si une ref interne ne suit
    plus le tag majeur de `package.json`.
  - **publish.yml** : crée désormais une **GitHub Release** par tag (notes = section
    correspondante du `CHANGELOG.md`).
  - **pwa-deploy.yml** : secret `FIREBASE_SERVICE_ACCOUNT_KEY` passé via `env:` (plus
    d'interpolation inline dans `run:`) ; actions Pages `upload-pages-artifact@v5` /
    `deploy-pages@v5`.
  - **renovate.json** : configuration autonome — l'ancien préset partagé
    `github>mister-guiiug/.github//renovate/default.json` pointe sur un dépôt
    inexistant (Renovate était inopérant).
  - **tsconfig-strict-plus** : retrait de `noUncheckedIndexedAccess` redondant (déjà
    porté par la base depuis 3.0.0).
  - **README** : refs `@v3`, flux de release changesets, table des 14 consommateurs,
    exports 3.4.0 documentés (`vite-csp`, `react/i18n`, `tsconfig-strict-plus`,
    `react/observability`, `react/update-prompt-banner`), checklist d'adoption, badges.
  - **templates/.npmrc** : ligne `_authToken=${NODE_AUTH_TOKEN}` (aligne le template
    sur les 14 apps consommatrices).

## 3.4.0

### Minor Changes

- Deux nouveaux exports partagés pour l'alignement famille.
  - `./vite-csp` — `cspPlugin(options)` : plugin Vite qui injecte la
    Content-Security-Policy avec `script-src` par hash SHA-256 des scripts inline
    (plus de `'unsafe-inline'` en production), extrait du motif éprouvé de
    mister-doc. `connect-src`/`img-src`/`style-src`/directives arbitraires
    configurables par app ; normalisation CRLF→LF (hash cohérent sur un build
    Windows) ; remplace un `<meta>` CSP statique existant s'il y en a un. À placer
    après `pwaSeoPlugin`/analytics pour hasher aussi les scripts injectés au build.
  - `./react/i18n` — `createI18n({ messages, locales, fallbackLocale, storageKey })` :
    i18n minimal typé (clés dot-notation dérivées du dictionnaire de messages),
    zéro dépendance runtime, avec `I18nProvider` + `useI18n` (détection de langue,
    persistance localStorage, `document.documentElement.lang`, interpolation
    `{param}`, repli sur la locale de secours). Logique pure exposée via
    `createTranslator` (testable sans React).

## 3.3.1

### Patch Changes

- 5e19130: `react/observability` : `initSentry` ne casse plus le build des apps SANS
  `@sentry/react`. Sous Vite 8 / Rolldown, l'import dynamique littéral de la peer
  optionnelle était résolu AU BUILD → « Rolldown failed to resolve import
  "@sentry/react" » pour tout consommateur du module d'observabilité n'ayant pas
  installé Sentry (découvert sur mister-molkky). L'import de repli devient non
  analysable (spécificateur non littéral + `@vite-ignore`), et une nouvelle option
  `loader: () => import('@sentry/react')` permet aux apps équipées de Sentry de
  fournir un import bundlé normalement.

## 3.3.0

### Minor Changes

- c65173d: `apps-catalog` : ajout de **Mister Doc** (beta) — synchronisation du planning de
  gardes des médecins d'un hôpital (vue mensuelle des créneaux, compteurs week-end
  et heures par médecin). `FamilyApps` l'affiche automatiquement dans la grille des
  apps sœurs. Icône par défaut (`favicon.svg` racine) et URL Pages standard, sans
  surcharge.

## 3.2.1

### Patch Changes

- 3534365: fix(family-apps) : corrige les URLs d'icônes du catalogue (404 sur les vignettes « Nos autres applications »)

  Le défaut `${appUrl}icon-192.png` ne correspondait qu'à 2 apps sur 12 — les
  autres servent leur icône sous un autre nom (`pwa-192.png`, `icons/icon-192.png`,
  `logo.svg`, `icon.svg`, `logo.png`) ou seulement `favicon.svg`. Résultat :
  des `GET … 404` (ex. `miss-carbook/icon-192.png`) et des vignettes en repli
  initiale.
  - Défaut d'icône → `favicon.svg` (racine, présent pour la majorité, SVG net).
  - Nouvelle surcharge `icon: 'chemin/relatif'` jointe à `appUrl` pour les apps
    au nommage différent (genius/uwh `icons/icon-192.png`, contraction `icon.svg`,
    footcoach `logo.svg`, molkky `logo.png`).
  - **mister-cim10** : suppression de la surcharge de casse `mister-CIM10`
    (le site Pages est servi en **minuscules** `mister-cim10` ; l'ancienne URL
    donnait un 404 sur le lien ET l'icône).

  Les 12 URLs d'icônes sont vérifiées 200 en production. Aucune API publique
  changée (le composant `FamilyApps` gère déjà le repli si une icône échoue).

## 3.2.0

### Minor Changes

- `apps-catalog` : ajout de **Miss Supaboss** (alpha) — pilotage multi-comptes
  Supabase Free (pause/restore, quotas Free Plan, préparation de démo guidée).
  `FamilyApps` l'affiche automatiquement dans la grille des apps sœurs.

## 3.1.0

### Minor Changes

- Platform layer partagé (anti écran-blanc, observabilité, résilience réseau) + variante TS strict-plus.

  **Nouveaux exports `/react`** (JS + `.d.ts`, sans build) :
  - `ErrorBoundary` — anti écran-blanc, `fallback` render-prop, `onError` (reporting), `onReset`, `onDownloadBackup` (sauvegarde locale).
  - `useOnline`, `retryableQuery` (`/react/net`, backoff exponentiel), `useOfflineMutationQueue` (file persistante rejouée au retour online), `SyncStatusBadge`.
  - `EmptyState` (état vide + CTA), `ErrorBanner` (erreur récupérable + Réessayer).
  - `@mister-guiiug/dev-wpa-config/react/observability` — `installErrorReporter` (ring-buffer localStorage + `setForwarder`), `recordError`, `initSentry({ dsn })` no-op si pas de dsn (lazy `@sentry/react`).
  - `@mister-guiiug/dev-wpa-config/react/update-prompt-banner` — `UpdatePromptBanner` prêt à l'emploi (hors barrel, couplé vite-plugin-pwa).

  **Nouveau `@mister-guiiug/dev-wpa-config/tsconfig-strict-plus`** (opt-in) : `noUncheckedIndexedAccess`, `noPropertyAccessFromIndexSignature`, `noImplicitOverride`, `exactOptionalPropertyTypes`.

  Tests : `test/platform.test.mjs` (helpers purs + smoke-render des composants).

## 3.0.0

Release majeure : durcissement TypeScript (breaking côté consumer), sécurité CI,
corrections de hooks/plugins et nouvelles capacités. Regroupée par lots.

### ⚠️ Breaking (lot C — durcissement TypeScript)

- `tsconfig-app` / `tsconfig-node` : ajout de **`verbatimModuleSyntax: true`** et
  **`noUncheckedIndexedAccess: true`**. Plus sûr (force `import type`, rend les
  accès indexés `T | undefined`) mais **fait apparaître de nouvelles erreurs**
  dans les apps au bump.
  - `verbatimModuleSyntax` : préfixer en `import type` les imports de types.
    mister-puzzle le déclarait déjà localement → l'override projet peut être
    retiré.
  - `noUncheckedIndexedAccess` : garder/valider les accès `arr[i]` / `record[k]`.
    Migration progressive possible en remettant `"noUncheckedIndexedAccess": false`
    dans le `tsconfig.app.json` du projet le temps d'adapter.
- `engines.node` : **`>=20` → `>=22`** (aligné sur `.nvmrc` et la CI ; le paquet
  n'était jamais testé sous Node 20).
- `eslint-base` : `languageOptions.globals` inclut désormais **`globals.node`** en
  plus de `globals.browser` (la base sert aussi aux scripts Node). Additif —
  supprime des faux positifs `process`/`Buffer`.

### Added (lot B — capacités)

- **`useMediaQuery` / `useReducedMotion` / `usePrefersDark`** (export `/react`) —
  brique partagée (SSR-safe) ; `rive` la réutilise (dédup).
- **Playwright `preview`** : `definePwaPlaywrightConfig({ preview: true })` teste
  un build de prod (`build` + `preview`) au lieu du dev server → service worker,
  minification et cache réels (le comportement PWA qu'on veut valider).
- **`vitest-setup` enrichi** : stubs `ResizeObserver`, `IntersectionObserver`,
  `scrollTo`, `crypto.randomUUID` (installés seulement si absents).
- **`vitest-base` `DEFAULT_SETUP_FILE`** exporté : composer `setupFiles` sans
  écraser celui de la base.
- **`useLocalStorage` sync intra-onglet** : plusieurs instances de la même clé
  dans le même onglet restent synchronisées (le `storage` event ne notifie que
  les autres onglets) ; `initialValue` figé en ref (un défaut inline ne réabonne
  plus les effets).
- **Anti-désync lockfile** : `templates/.npmrc` documenté + job CI
  `verify-lockfile` (reusable `pwa-ci.yml`, input `verify-lockfile`, défaut true)
  qui détecte en PR un `package-lock.json` désynchronisé (ex. bindings natifs
  optionnels Vite 8 / Rolldown / oxc omis hors Linux) avec un message clair.

### Fixed (lot A — corrections)

- `vite-pwa-base` : `closeBundle` n'écrit `sitemap.xml`/`robots.txt`/`llms.txt`
  qu'en **mode build**, **crée le dossier de sortie** (`mkdirSync` — évite ENOENT)
  et respecte un **`build.outDir` personnalisé** (lu via `configResolved`).
- `playwright-base` : `snapshotPathTemplate` inclut **`{projectName}`** — sans lui,
  les 5 navigateurs écrasaient le même snapshot (diffs visuels faux).
- `react/use-theme` : la valeur stockée est **validée** (`light|dark|system`) —
  une valeur corrompue ne se propage plus dans `colorScheme`/`data-theme`.
- `react/use-install-prompt` : garde SSR sur l'effet, `promptInstall` ne propage
  plus de rejet non géré (respecte `Promise<… | null>`), et suit le passage en
  mode standalone (`display-mode`) en plus de `appinstalled`.
- `react/rive` : résolution de l'export lazy en **`mod.Rive ?? mod.default`**
  (`Rive` est l'export nommé du paquet).
- `react/pwa-install-prompt` : `role="dialog"` → **`role="region"`** (bannière
  passive non modale — ne promet plus à tort un piège de focus).
- `eslint-react` **étend `eslint-base`** au lieu de dupliquer ignores /
  `no-unused-vars` / override e2e (plus de risque de dérive).

### Security (lot A — CI/CD)

- Reusables `pwa-ci` / `pwa-deploy` / `pwa-lighthouse` : l'input `build-env`
  (et `pre-build-script`) est passé via `env:` (plus jamais interpolé dans le
  corps du script) — supprime un vecteur d'**injection shell** ; `build-env` est
  validé ligne par ligne (`KEY=VALUE`).
- **`persist-credentials: false`** sur tous les `checkout` sauf le push de tag de
  `publish.yml` (le token n'est plus persisté sur disque pendant les builds).
- Actions tierces **épinglées au SHA** : `treosh/lighthouse-ci-action` (v12),
  `supabase/setup-cli` (v1.7.1) — Renovate met à jour les pins.
- Action `firebase-deploy` : **service account** (`service-account-key`) en plus
  du `token` (déprécié par Google), et **firebase-tools épinglé** via `npx`
  (plus d'install globale non reproductible). `project-id`/inputs passés via env:.
- `prettier` épinglé côté devDependency + formatage normalisé (reproductibilité).

## 2.2.0

### Minor Changes

- Catalogue famille + composant `FamilyApps` (cross-promotion entre apps).
  - Nouveau sous-export `@mister-guiiug/dev-wpa-config/apps-catalog` (données pures,
    sans React) : `FAMILY_APPS` (id, nom, description, `repoUrl`, `appUrl`,
    `iconUrl`, **`maturity`** obligatoire parmi `alpha | beta | stable`), helpers
    `otherApps`, `repoUrl`, `pagesUrl`, et constantes `GITHUB_OWNER` / `SPONSOR_URL`.
    Source unique de la liste des apps de la famille.
  - Nouveau composant `FamilyApps` (export `/react`, non stylé, attributs
    `[data-dwc="…"]`) : met en avant le code source (GitHub), le sponsor (Buy Me a
    Coffee) et la grille des autres applications de la famille avec leur badge de
    maturité (l'app courante est exclue). Props `currentAppId`, `apps`, `repoUrl`,
    `sponsorUrl`, `showSource`, `showSponsor`, `labels` (i18n), `className`.
  - Refactor interne : icônes SVG (GitHub, café, lien externe) extraites dans
    `react/icons.js`, réutilisées par `AppFooter` et `FamilyApps` (rendu d'`AppFooter`
    inchangé).

## 2.1.2

### Patch Changes

- `vitest-setup` : polyfill `localStorage`/`sessionStorage` en mémoire installé
  seulement si l'environnement n'expose pas de Storage fonctionnel. Sous Vitest 4
  - jsdom, `localStorage` peut exister sans `getItem`/`setItem` opérationnels, ce
    qui casse les tests de persistance (`localStorage.getItem is not a function`).
    No-op quand jsdom fournit déjà un Storage correct. Corrige les suites de
    persistance des apps (ex. miss-uwh syncQueue/sync, miss-carbook assistantStorage).

## 2.1.1

### Patch Changes

- `vitest-setup` : ajout d'un `vitest-setup.d.ts` qui réexporte l'augmentation de
  types jest-dom (`declare module 'vitest'`). Sans lui, les apps qui importent
  `@mister-guiiug/dev-wpa-config/vitest-setup` depuis `src/test/setup.ts` perdaient
  les matchers typés (`toBeInTheDocument`, `toHaveTextContent`, …) au `tsc` (le
  `.js` sans types n'était pas suivi). Requiert `@testing-library/jest-dom` côté
  consommateur (déjà peer optionnelle).

## 2.1.0

### Minor Changes

- Helpers React partagés, durcissement des configs et outillage sécurité/SEO/Rive.

  **Nouveau sous-export `@mister-guiiug/dev-wpa-config/react`** (hooks + composants
  PWA, sans étape de build) :
  - `useLocalStorage` — état persistant typé, sync inter-onglets, tolérant au mode privé.
  - `useInstallPrompt` — capture `beforeinstallprompt`, détection standalone.
  - `useTheme` — thème `light|dark|system`, persistant, suit le système.
  - `PwaInstallPrompt` — bandeau d'installation A2HS (non stylé, cibler `[data-dwc]`).
  - `AppFooter` — lien code source (GitHub SVG inline) + sponsor (café), liens externes sécurisés.
  - `useUpdatePrompt` (sous-chemin dédié `…/react/use-update-prompt`, couplé vite-plugin-pwa) — MAJ du service worker, variante snooze.
  - `RiveAnimation` (sous-chemin `…/react/rive`) — wrapper Rive **lazy**, a11y et `prefers-reduced-motion`. Peer optionnelle `@rive-app/react-canvas`.

  **Setup Vitest partagé** `@mister-guiiug/dev-wpa-config/vitest-setup` — jest-dom +
  stub `matchMedia` + mocks `virtual:pwa-register` (à importer depuis `src/test/setup.ts`).

  **Durcissement des configs** (impacte toutes les apps, sans changement applicatif) :
  - `tsconfig-node` aligné sur `tsconfig-app` (`noUnusedLocals`, `noUnusedParameters`,
    `noFallthroughCasesInSwitch`, `moduleDetection: force`, `allowImportingTsExtensions`,
    `isolatedModules`) — mister-puzzle n'a plus besoin de les redéclarer.
  - `vitest-base` : reporters de couverture `lcov` + `json-summary` (upload Codecov en CI) ;
    nouvel export `recommendedThresholds`.
  - `lint-staged` : type-check pré-commit `tsc -b --noEmit`.

  **SEO — `pwaSeoPlugin()` étendu en sur-ensemble** (remplace les plugins maison
  de mister-puzzle `vite-plugin-seo.ts` et miss-carbook `htmlTrackingPlugin()`) :
  nouvelles options `robots`, `basePath`, `logoPath`/`iconQuery` (→ `__SEO_LOGO_URL__`
  / `__PWA_ICON_QS__`), `llms` (génère `llms.txt`), `gtmContainerId`/`gaMeasurementId`
  (IDs explicites, fallback env), `extraReplacements`. `resolveSeoPublicUrls` accepte
  désormais un objet `{ basePath, logoPath, iconQuery }` (rétro-compatible string).

  **Accessibilité — `@mister-guiiug/dev-wpa-config/playwright-a11y`** : helpers
  `analyzeA11y` / `expectNoA11yViolations` / `formatViolations` (axe-core via
  `AxeBuilder` injecté, peer optionnelle `@axe-core/playwright`) +
  `templates/e2e/a11y.spec.ts`.

  **Sécurité** :
  - `pwa-ci.yml` : inputs `run-npm-audit` (opt-in) + `npm-audit-level`.
  - `templates/index.html` : template avec CSP de référence (offline-first +
    variantes Supabase/Firebase/GA4), script anti-FOUC aligné `useTheme`, et
    placeholders SEO/analytics de `pwaSeoPlugin()`.

  Nouvelle peer-dependency **optionnelle** : `@axe-core/playwright`.

  Nouvelles peer-dependencies **optionnelles** : `react`, `@testing-library/jest-dom`,
  `@rive-app/react-canvas`.

## 2.0.0

### Major Changes

- Passe les peer-dependencies de la toolchain sur les nouvelles majeures (breaking) :
  - `vite` ajouté en peer optionnel `^8.0.0`
  - `vitest` et `@vitest/browser` → `^4.0.0` (fin du support Vitest 3)
  - `typescript` → `~6.0.3`
  - `zod` → `^4.0.0` (fin du support Zod 3)

  Les bases Vitest/Vite n'utilisent aucune option supprimée par ces majeures ; les `vite.config.ts`
  existants (forme fonction de `manualChunks`, `build.rollupOptions`) restent fonctionnels sous
  Rolldown. Voir la section migration du README pour les détails Vite 8 / Vitest 4 / Zod 4.

Historique des versions de `@mister-guiiug/dev-wpa-config`.

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
versionnement [SemVer](https://semver.org/lang/fr/).

## [Unreleased]

## [1.6.0] - 2026-06-04

### Added

- **Anti-pause Supabase Free** :
  - Reusable `pwa-supabase-keepalive.yml` — `SELECT` REST (anon key) sur une table
    `keep_alive` tous les ~3 j → empêche la pause des projets Free (inactivité 7 j).
  - Template SQL `templates/supabase/keep-alive.sql` (table + policy anon).
  - Template caller `templates/github-workflows/supabase-keepalive.yml`
    (cron planifié, `secrets: inherit`).
  - Section README dédiée (mise en place par projet).

## [1.5.0] - 2026-06-03

### Added

- **Workflow `cleanup-runs`** : nettoyage manuel (`workflow_dispatch`) de
  l'historique GitHub Actions — ne conserve que les **N runs les plus récents
  par workflow** (défaut 3), option `dry-run`. Disponible en
  [template](./templates/github-workflows/cleanup-runs.yml) **et** actif dans ce
  dépôt (dogfood).
- **`pwa-ci.yml`** : input **`build-env`** (variables `KEY=VALUE` injectées avant
  build/test, pour les apps dont le build exige des `VITE_*` — Firebase/Supabase)
  et input **`server-dir`** (install + `tsc --noEmit` d'un backend annexe). Permet
  enfin à `mister-puzzle` & co. d'utiliser la CI réutilisable au lieu d'une CI
  custom.
- **`pwa-lighthouse.yml`** : input **`build-env`** (idem) → Lighthouse activable
  sur les apps à secrets.
- **`pwa-deploy.yml`** : input **`build-env`** + **déploiement Firebase optionnel**
  (`firebase-project`, `firebase-only`, secret `FIREBASE_SERVICE_ACCOUNT_KEY`)
  avec auth correcte — évite à chaque app Firebase de réécrire (et mal
  authentifier) son job de déploiement.
- **Auto-tests du paquet** : scripts `test` (node:test — exports/files/parité
  `.d.ts`↔`.js`/chargement), `format:check`/`format` (dogfood `prettier-base`),
  `validate` ; champ `engines.node >= 20` ; jobs `format:check` + `test` ajoutés
  à `ci.yml`.
- **Changesets** câblé (`.changeset/config.json` + scripts `changeset` /
  `version-packages`) pour automatiser bump + CHANGELOG.

### Changed

- **`publish.yml`** fait désormais **avancer automatiquement le tag majeur mobile
  `v1`** vers chaque release stable. Corrige le fait que `v1` était figé sur la
  v1.3.2 : tous les consommateurs en `...@v1` recevaient des workflows périmés.
- **`scripts/migrate-consumers.mjs`** réécrit en **codemod générique** :
  auto-découverte des consommateurs (plus de liste codée en dur), bump vers une
  version cible **et alignement des peers déclarés** (lucide-react, vitest…),
  modes `--write` / `--install`.
- Dépôt **formaté avec sa propre config Prettier** (dogfood).

### Docs

- `npm-publish.yml` : périmètre clarifié (paquets publiables uniquement, pas les
  apps).

## [1.4.0] - 2026-06-02

### Added

- **`lucide-react`** comme **bibliothèque d'icônes standard** de la famille
  React : ajout en `peerDependencies` (optionnelle) + règle documentée dans le
  README (« Icônes — `lucide-react` »). Iconographie fonctionnelle (nav, boutons,
  tendances) en SVG tree-shakés ; emoji réservé au contenu utilisateur et aux
  illustrations mascotte. Premier consommateur : `miss-genius`.
- **Règle « Liens app — code source + sponsor »** : chaque app expose un lien
  vers son **code source** (GitHub) et un lien **sponsor** (Buy Me a Coffee,
  handle famille `mister.guiiug`). Documentée dans le README (pattern
  `src/links.ts` + footer, `target="_blank" rel="noopener noreferrer"`, marque
  GitHub en SVG inline car lucide 1.x n'a plus d'icônes de marque). Template
  `templates/FUNDING.yml` ajouté pour le bouton « Sponsor » du dépôt. Premier
  consommateur : `miss-genius`.

### Changed

- **Template `.lighthouserc.json`** : passage à des assertions **catégorielles
  uniquement** (perf/a11y/bp/seo) au lieu du preset `lighthouse:recommended`.
  Ce dernier assertait chaque audit individuel (dont des insights binaires et
  flaky comme `forced-reflow-insight`), provoquant des faux négatifs en CI.
  Seuls les scores de catégories restent des gates. (Templates non publiés npm —
  pas de bump de version ; à recopier côté consommateurs.)

## [1.3.2] - 2026-05-31

### Changed

- **ESLint `no-unused-vars`** (base + react) : ajout de
  `argsIgnorePattern` / `varsIgnorePattern` / `caughtErrorsIgnorePattern: '^_'`.
  Le préfixe `_` marque un binding intentionnellement inutilisé (convention
  standard, alignée sur TypeScript `noUnusedLocals`/`noUnusedParameters`).
  Évite les divergences eslint↔tsc rencontrées dans les consommateurs
  (ex. `_id` dans mister-footcoach, `_tokenId` dans miss-ticket-pwa).

## [1.3.1] - 2026-05-30

### Fixed

- **peerDep `sharp`** élargie de `^0.33.0` à `>=0.33.0`. La plage `^0.33.0`
  refusait `sharp@0.34.x` (présent côté consommateurs, ex. miss-badminton) et
  provoquait un `ERESOLVE` à l'install, alors que `sharp` n'est qu'un peer
  optionnel utilisé par le bin `pwa-icons` (API resize/png/composite stable).

## [1.3.0] - 2026-05-30

Cette version remonte dans le paquet des patterns qui étaient dupliqués (ou
contournés) dans les consommateurs, après audit de la famille `miss-*` / `mister-*`.

### Added

- **Factory Playwright** (`playwright-base`) : `definePwaPlaywrightConfig({ devices })`
  - helpers `pwaProjects(devices)` / `pwaReporters()`. Centralise la matrice 5
    navigateurs, les reporters multi-format, le `snapshotPathTemplate`, `reducedMotion`
    et le `webServer` que les 7 projets réécrivaient à l'identique (~50 lignes chacun).
    `basePlaywrightOptions` reste exporté (rétro-compat).
- **Bin `pwa-icons`** : générateur d'icônes PWA partagé (`scripts/generate-pwa-icons.mjs`),
  remplace les `generate-*-icons.{mjs,ts}` dupliqués. Options `--source`, `--out`,
  `--sizes`, `--maskable`, `--bg`, `--prefix`. `sharp` ajouté en peerDep optionnelle.
- **Export `vite-pwa-base`** : `pwaSeoPlugin()` (injection GTM/GA4 + sitemap.xml/robots.txt)
  et helpers `parseGtmContainerId` / `parseGaMeasurementId` / `buildAnalyticsHtmlFragments` /
  `resolveSeoPublicUrls`. Généralise `puzzle/vite-plugin-seo.ts` et `carbook` htmlTrackingPlugin.
- **Preset coverage Vitest** : `coveragePreset` (provider v8 + reporters + exclude) dans
  `vitest-base`. Thresholds laissés au projet.
- **Reusable workflow `pwa-lighthouse.yml`** + template `templates/.lighthouserc.json` :
  Lighthouse CI (build base-path `/` puis LHCI). Remplace les workflows inline dupliqués
  (badminton, molkky).
- **Composite actions** pour les déploiements custom récurrents :
  `.github/actions/supabase-migrate` (link + db push) et `.github/actions/firebase-deploy`
  (deploy rules/indexes).
- **Override ESLint `e2e/**`** intégré dans `eslint-base`et`eslint-react`
(`no-explicit-any`+`no-unused-vars` off sur les specs) — était dupliqué dans
  badminton / contraction / molkky.
- **Tailwind preset** enrichi : typographie/spacing fluides (`--text-fluid-*`,
  `--spacing-fluid-*`) + utilitaires `*-safe` / `*-safe-3` (safe-areas) + `touch-target`,
  pour rendre `tailwind-preset.css` réellement adoptable (0 adoption jusqu'ici).
- **`@commitlint/cli`** ajouté en peerDep optionnelle.

### Changed

- **CI du paquet** : nouveau job `consumer-resolution` qui fait `npm pack` + installe
  le tarball dans un projet jetable et vérifie que **chaque subpath résout via `exports`**
  (`tsconfig extends` + imports JS + assets CSS/JSON). Comble le trou qui avait laissé
  passer la résolution intermittente de `./tsconfig-app-react` en CI (molkky avait dû
  ré-inliner ses tsconfig/vitest). Le job `validate` ne testait que le parsing in-repo.
- **Actions GitHub** bumpées `checkout`/`setup-node` `@v4` → `@v5` (runtime Node 24)
  dans tous les workflows et la composite action. Supprime la nécessité du workaround
  `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24` côté consommateurs (badminton, molkky).

### Migration guide

- **Playwright** : remplacer le bloc `{ ...basePlaywrightOptions, ... }` réécrit par
  `export default defineConfig(definePwaPlaywrightConfig({ devices }))`.
- **Icônes** : remplacer le script local par `"icons": "pwa-icons --source <svg> --maskable"`
  (installer `sharp` en devDep si absent).
- **Node 24** : retirer `env: { FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: 'true' }` des `ci.yml`
  une fois le tag `v1` republié.
- **molkky** : une fois ce paquet publié et le job `consumer-resolution` vert, re-basculer
  `tsconfig.app.json` / `tsconfig.node.json` / `vitest.config.ts` sur les `extends`/imports
  partagés et supprimer le contenu inliné.

## [1.2.0] - 2026-05-07

### Added

- **Vitest Browser Mode** : nouvel export `@mister-guiiug/dev-wpa-config/vitest-browser-base` (`baseBrowserTestOptions`). Tests dans un vrai navigateur via Playwright provider. Convention de nommage `*.browser.test.{ts,tsx}` pour cohabiter avec les tests jsdom (`*.test.{ts,tsx}`). Opt-in : nécessite `@vitest/browser` + `playwright` côté consumer.
- **peerDependencies étendues** : `zod ^3 || ^4` (les deux supportés), `@vitest/browser ^3.2.4`, `playwright ^1.49.0` (optionnels).

### Changed

- **React Compiler rules** dans `eslint-react.js` : passage de `'off'` à `'warn'`. Les 6 règles (`set-state-in-effect`, `purity`, `immutability`, `preserve-manual-memoization`, `refs`, `static-components`) sont désormais visibles en lint mais ne bloquent pas la CI. Mode strict opt-in via override local en `'error'` (exemple dans le commentaire d'en-tête).

### Migration guide

- **React Compiler** : aucune action requise — les règles passent en `warn`. Pour adopter le compiler côté Vite, ajouter `babel-plugin-react-compiler` au `vite.config.ts` puis basculer les règles ESLint en `error` localement.
- **Zod 3 → 4** : breaking changes côté API (`.parse` strict par défaut, `.errors[]` → `.issues[]`, etc.). Procédure recommandée :
  1. `npm install zod@^4`
  2. `npx zod-codemod` (si publié) ou recherche manuelle de `.errors`, `.parse({})`, `.format()`.
  3. Lancer `npm run type-check && npm run test`.
  4. Voir le [migration guide officiel](https://zod.dev/v4/migration).
- **Vitest Browser Mode** : opt-in. Pour activer sur un projet :
  ```bash
  npm install -D @vitest/browser playwright
  npx playwright install chromium
  ```
  Puis créer `vitest.config.ts` avec `baseBrowserTestOptions` ou un fichier dédié `vitest.browser.config.ts` pour cohabiter avec jsdom.

### Documentation

- README : ajout d'un avertissement explicite sur l'obligation de déclarer les `permissions:` au niveau caller des reusable workflows (intersection only — le called ne peut pas élever celles du caller). Sans ça, les jobs deploy/publish échouent en `startup_failure`. Tous les exemples README incluent désormais le bloc `permissions:` requis.
- README : section "Migration guide" pour Zod 3→4, React Compiler opt-in strict, Vitest Browser Mode.

## [1.1.0] - 2026-05-07

### Added

- **Reusable workflows** GitHub Actions :
  - `.github/workflows/pwa-ci.yml` — CI standard (format · lint · type · test · build, + E2E optionnel)
  - `.github/workflows/pwa-deploy.yml` — déploiement GitHub Pages
  - `.github/workflows/npm-publish.yml` — publication npm avec provenance
- **Composite action** `.github/actions/setup-pwa/action.yml` — checkout + Node 22 + scope `@mister-guiiug` + `npm ci`
- **Configs partagées** :
  - `commitlint-base.js` (`@mister-guiiug/dev-wpa-config/commitlint`)
  - `lint-staged-base.js` (`@mister-guiiug/dev-wpa-config/lint-staged`)
  - `playwright-base.js` + `.d.ts` (`basePlaywrightOptions`)
  - `tailwind-preset.js` + `tailwind-preset.css` (design tokens famille)
- **Templates** :
  - `templates/husky/{pre-commit,commit-msg}` + README
  - `templates/changesets/config.json` + README
  - `templates/.editorconfig` + `templates/.nvmrc`
- **Script** `scripts/apply-rulesets.mjs` — applique le ruleset "main protection" via `gh api` sur tous les repos
- **OIDC + provenance** activés dans `publish.yml` (`id-token: write`, `npm publish --provenance`)

### Changed

- `package.json` : exports + files étendus, peerDeps optionnelles ajoutées (commitlint, playwright, tailwindcss).

## [1.0.1] - 2026-05-07

### Fixed

- Le scope npm est désormais `@mister-guiiug` (avec tiret) pour correspondre au compte GitHub. La v1.0.0 ne pouvait pas être publiée sur GitHub Packages à cause d'un mismatch de scope.

## [1.0.0] - 2026-05-07

### Initial

- ESLint base + React (flat config) avec ECMA 2025
- Prettier (singleQuote, tabWidth 2, printWidth 80, trailingComma 'es5', arrowParens 'avoid')
- tsconfig-app + tsconfig-app-react + tsconfig-node (cible ES2025 strict)
- Vitest base (`baseTestOptions` : jsdom + globals + setupFiles + passWithNoTests)
- Templates VSCode (extensions, settings, tasks, launch)
- Templates GitHub Actions (ci, deploy)

[Unreleased]: https://github.com/mister-guiiug/dev-wpa-config/compare/v1.2.0...HEAD
[1.2.0]: https://github.com/mister-guiiug/dev-wpa-config/releases/tag/v1.2.0
[1.1.0]: https://github.com/mister-guiiug/dev-wpa-config/releases/tag/v1.1.0
[1.0.1]: https://github.com/mister-guiiug/dev-wpa-config/releases/tag/v1.0.1
[1.0.0]: https://github.com/mister-guiiug/dev-wpa-config/releases/tag/v1.0.0
