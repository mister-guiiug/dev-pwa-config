# Changelog

## 4.5.2

### Patch Changes

- **La matrice E2E de `pwa-ci.yml` sait enfin nommer un téléphone.** `e2e-project`
  partait à la fois dans `--project=` et dans `playwright install`, qui ne connaît
  que des NAVIGATEURS : `playwright install mobile-chrome` répond « Invalid
  installation targets ». Les deux projets mobiles de la matrice famille
  (`mobile-chrome` = Pixel 5, `mobile-safari` = iPhone 12, posés par `pwaProjects`)
  étaient donc **inexprimables en CI**, et l'entrée n'en acceptait qu'un seul de
  toute façon.

  Ce que cet angle mort a coûté : deux tests de `e2e/navigation.spec.ts` de
  miss-badminton échouaient sur ces deux projets **depuis toujours** — un lien de
  la barre latérale, cherché sous le seuil `md` où elle n'existe pas. Personne ne
  les jouait, donc personne ne le savait.

  `e2e-project` accepte désormais une **liste** séparée par des espaces. Une étape
  la lit une fois et en tire trois choses : les `--project=` des deux étapes
  Playwright, les navigateurs à installer, et le nom de l'artefact de rapport (une
  liste y mettrait un espace). Les navigateurs se **déduisent** du projet —
  `mobile-chrome` → chromium, `mobile-safari` → webkit — et se **dédoublonnent** :
  `chromium mobile-chrome` n'installe qu'un binaire, Pixel 5 tournant sur le même.
  `e2e-install` reste la sortie de secours pour un `extraProjects` maison, dont le
  nom ne désigne aucun navigateur.

  **Le défaut ne bouge pas** (`chromium`) : ouvrir la matrice pour tout le parc
  d'un coup rendrait rouges des CI qui ne demandaient rien — c'est exactement ce
  que miss-badminton a découvert en jouant enfin ses mobiles. L'ouverture est un
  opt-in, app par app.

  Le prix, mesuré le 06/09/2026 sur miss-badminton : le job E2E coûte 63 s dont 39
  de mise en place (`setup-pwa` 18, `playwright install --with-deps` 20) ; toute la
  matrice ne représente que 71 s de tests (chromium 6,7 · firefox 34,8 · webkit
  12,1 · mobile-chrome 6,9 · mobile-safari 10,9). Ajouter `mobile-chrome` à un run
  chromium coûte donc **sept secondes et aucun téléchargement**.

  Sûreté : chaque nom est filtré sur `[A-Za-z0-9._-]` avant de devenir un argument,
  et `set -f` empêche un motif de s'expanser en noms de fichiers. Les entrées
  n'entrent toujours dans le job que par le bloc `env:`. Les tests **exécutent** le
  corps de l'étape sous `bash`, avec un `GITHUB_ENV` et un `GITHUB_OUTPUT` de bac à
  sable : c'est le script réel qui répond, pas une regex recopiée à côté.

  Le paquet publié ne change pas d'un octet — cette version existe pour faire
  avancer l'étiquette mobile `v4`, seul chemin par lequel un réutilisable atteint
  les dix-neuf dépôts qui le consomment.

## 4.5.1

### Patch Changes

- 6091697: **`pwa-screenshots` vérifie que l'adresse qu'il ouvre reste sur la boucle locale.** L'adresse servie était fabriquée par concaténation — `http://localhost:${port}` devant une base lue dans `dist/index.html`, ou passée en `--base`. Ni l'une ni l'autre n'est écrite par le script, et la garantie reposait entièrement sur leur FORME : tant que la base commence par une barre, l'hôte ne bouge pas. Rien ne l'exigeait, et une référence protocol-relative (`//ailleurs/`) change d'hôte dès qu'on la résout — c'est ce que CodeQL relevait (`js/file-access-to-http`, « le contenu d'un fichier atteint une requête sortante », alerte 27). Le nouveau `adresseLocale(port, base)` construit l'URL contre une origine fixe puis **compare l'origine obtenue**, seul contrôle qui tienne quelle que soit la valeur reçue ; une base qui sortirait de `http://localhost:<port>` arrête le script avant même de démarrer le serveur d'aperçu, avec un message qui la nomme. `--url` n'est pas concerné : c'est une adresse que l'appelant donne, pas une valeur déduite d'un fichier. Aucun changement pour les appels normaux.
- 8cea04d: **« Signaler un problème » portait la flèche d'un autre rôle, et le contrat
  d'icônes se contredisait lui-même.**

  `DEFAULT_ICONS.issue` valait `ExternalLinkIcon` — le dessin d'`external` —
  pendant que `LUCIDE_NAMES.issue` valait `Bug`. Une app avec `lucide-react`
  affichait donc un insecte, une app sans affichait une flèche : **deux dessins
  pour un rôle**, ce que ce module existe précisément pour empêcher (« deux
  langages visuels dans la même interface, sans que personne l'ait décidé »).
  Sur les neuf rôles, `issue` était le seul dans ce cas.

  À l'écran, l'effet était pire que l'incohérence. La flèche dit « ce lien sort
  du site », ce qui est vrai des **trois** liens du pied de page : elle ne
  distinguait rien, et entre l'octocat de « Code source » et la tasse de
  « M'offrir un café », elle se lisait comme un glyphe égaré plutôt que comme une
  icône. Elle pesait aussi moins que ses deux voisines — 14 px de contour fin
  contre 16.

  `BugIcon` est un dessin original, à la taille des deux autres (16 px), et
  volontairement pauvre en traits : un corps, deux antennes, quatre pattes. À
  16 px, un thorax segmenté et six pattes deviennent une tache.

  **Le garde qui manquait.** `themes-icons-rive.test.mjs` vérifiait déjà que les
  deux tables ont les mêmes clés — ce qui était vrai, et ne suffisait pas. Un
  nouveau test compare leur **partage** : deux rôles servis par le même repli
  doivent l'être par le même nom lucide, et réciproquement. Un rôle qui emprunte
  le dessin d'un autre d'un seul côté échoue désormais, nommément. Vérifié par
  falsification : remettre `issue: ExternalLinkIcon` le fait rougir.

  Une app qui fournit déjà ses propres icônes (`IconsProvider`) ne change de
  rien, et celles sur lucide non plus — elles voyaient déjà un insecte.

## 4.5.0

### Minor Changes

- 774b2b0: **Règle famille : les trois liens sur deux écrans, et deux seulement.** Le code source, « M'offrir un café » et « Signaler un problème » sont visibles sur l'accueil ET sur À propos / Réglages — et nulle part ailleurs. La coquille n'est plus une façon de tenir la règle : un `<AppFooter>` rendu hors des `<Routes>` suit chaque écran, plateau de jeu et formulaires compris. `pwa-doctor` (`liens-famille`) le dit désormais — une dette pour le pied de page rendu par la coquille (« sur tous les écrans »), une autre pour un troisième écran ou un écran qui n'est ni l'accueil ni À propos / Réglages (« N écrans (…) », nommés) — et le geste est le même : `<AppFooter repoUrl={REPO_URL} issues />` dans l'écran d'accueil et dans À propos / Réglages. Il résout une indirection côté écrans (`<Footer/>` défini à part, rendu par deux écrans) et lit la condition d'une coquille sans routeur (`{screen === 'x' && <X />}` n'est pas « partout »). Relevé du 06/09/2026 sur vingt dépôts : une app tient la règle (`mister-molkky`), seize rendent le pied de page par la coquille — dont le squelette —, deux sur trois écrans, une sans lien. En `--strict`, cette dette fait échouer la CI : le squelette passe le premier, les apps suivent à la montée.
- 66998fb: **Le toast porte une action : annuler plutôt que confirmer.** `ConfirmDialog` du socle est posé sur **quatorze** apps, `useUndoableState` sur **aucune** — quatorze demandent « êtes-vous sûr ? » avant chaque suppression, pas une n'offre de revenir en arrière après (relevé du 06/09/2026 : `miss-contraction` a un bandeau maison après _enregistrement_, `miss-badminton`, `mister-molkky` et `miss-dice` annulent un coup et non une ligne, `mister-miss-koh` et `mister-family-map` suppriment logiquement sans écran de restauration). Le geste manquait parce que le toast n'avait aucune notion d'action, et six apps s'apprêtaient à réécrire chacune la sienne. `show(message, { action: { onAction } })` rend un vrai `<button>` DANS le message : libellé par défaut « Annuler » dans les sept langues de `labels` — `toast.undo`, distinct de `confirm.cancel` parce que six langues sur sept distinguent « défaire » de « renoncer » —, `action.label` pour un autre mot (« Rouvrir », « Voir »), et il agit puis referme. **Sa durée de vie est un plancher de 8 s**, pas la durée ordinaire : lire, décider PUIS atteindre un bouton à la souris ou en trois tabulations ne tient pas dans les cinq secondes de l'ordinaire (8 s est la seule mesure du parc, l'`UNDO_MS` de `miss-contraction`) ; un fournisseur réglé plus haut garde sa valeur, une `duration` explicite l'emporte et redevient la responsabilité de l'app. Sans `onAction`, rien n'est rendu — un libellé seul promet une annulation que personne n'exécute. Côté accessibilité, le focus qui se pose sur le bouton suspend le rebours (WCAG 2.2.1), sinon le message s'effacerait sous les doigts de qui vient l'atteindre ; chaque message reste clé sur son `id`, donc le rendu déclenché par cette suspension ne réinsère rien dans la région vivante et le lecteur d'écran ne relit pas le message à chaque survol. `ToastViewport` valide l'action pour son compte : les apps qui tiennent la file sur zustand (`miss-supaboss`, `miss-uwh`) en héritent sans passer par le fournisseur. `components.css` habille `[data-dwc='toast-action']` — un texte souligné et non un aplat, qui demanderait un contour transparent (invisible en contraste forcé) et un libellé en `--dwc-primary-contrast` (blanc sur blanc à l'impression) —, et le showroom en porte la fiche, l'extrait de code, la note d'accessibilité et deux pièges.

### Patch Changes

- 28799cc: **Le bandeau de mise à jour flotte au-dessus de la barre basse collée.** `components.css` habillait `[data-dwc='update-banner']` et `[data-dwc='offline-ready']` sans les placer ; rendus après `children`, ils finissaient en flux tout en bas du document — sous `BottomNav placement="fixed"`, hors écran puis sous la barre, « Recharger » inatteignable (mister-miss-koh, le squelette, miss-lookhouse). Sous cette barre, et seulement sous elle, le bandeau est désormais `position: fixed` au-dessus (`z-index: 25`, entre la barre à 20 et l'en-tête à 30), avec l'entrée `dwc-rise` éteinte sous `prefers-reduced-motion` ; les toasts surgissent au-dessus de la barre aussi. L'empreinte de la barre (4,5 rem + zone sûre) n'est plus écrite qu'une fois, dans `--_dwc-bottom-nav-reserve`, lue par la réserve de `PageContainer`, les toasts et le bandeau. Sans barre collée, rien ne bouge. Une app qui plaçait le bandeau elle-même et adopte la barre collée retire son placement maison — mister-miss-koh porte la règle côté app depuis sa PR #12 et pourra la retirer à la montée.
- 6e4c114: **Deux couleurs que `components.css` fabriquait tombaient sous AA dans presque la moitié du parc.** Elles ont été relevées le 06/09/2026 par axe sur `/profil` de mister-family-map, à la PREMIÈRE exécution réelle d'une suite a11y qui n'avait jamais tourné en CI — son `e2e-grep` valait `@critical` et aucun titre `@a11y` n'y correspondait, donc Playwright imprimait « No tests found » en rendant 0. `[data-dwc='app-version-details']` posait `opacity: .85` **sur** du `--dwc-text-soft` : l'opacité compose une TROISIÈME couleur, plus pâle que le rôle « soft » choisi par la palette et sur laquelle aucune palette ne s'est prononcée (`#707871` sur `#fefcf6`, 4,43 pour 4,5 exigé) — elle passait sous 4,5:1 dans **quatorze des trente-six palettes**. La règle disparaît : la discrétion voulue est le rôle du jeton, pas d'un voile posé dessus. `[data-dwc='maturity']` employait `--dwc-success` / `--dwc-warning`, des couleurs de SIGNAL calibrées pour une pastille ou un liseré, comme couleur de TEXTE à 0.68rem (~10,9 px) — du petit texte, donc le seuil 4,5:1 : le libellé de maturité était illisible dans **quinze palettes sur trente-six** (`stable`) et **douze** (`beta`), sur l'écran même qui liste les autres apps de la famille. Les deux mélangent désormais leur couleur de signal vers `--dwc-text` à 60 % : le mélange pousse la teinte vers celle du texte de l'app, donc vers le contraste, dans les DEUX schémas — plus sombre en clair, plus clair en sombre — sans que le paquet impose de couleur. 60 % est le point mesuré où les trente-six palettes passent en gardant la teinte reconnaissable. Deux tests de `themes.test.mjs` figent la disparition du piège en lisant les **valeurs de la feuille** et non des constantes recopiées : remettre une opacité sur le bloc version, ou remonter le pourcentage du `color-mix`, fait échouer nommément les palettes concernées (vérifié : à 90 %, `miss-badminton/light` tombe à 3,87:1). `AA_PAIRS` ne pouvait pas les voir — il compare des jetons entre eux, jamais les couleurs que la feuille compose à partir d'eux.
- 66998fb: **`pwa-doctor` — nouveau défaut `issues-desactivees` : le lien « Signaler un problème » mène-t-il quelque part ?** `miss-supatool` l'affichait le 06/09/2026 et `github.com/mister-guiiug/miss-supatool/issues/new?template=bug.yml` répondait **404** : les issues du dépôt étaient désactivées (`miss-ticket-pwa` aussi). Un canal de retour mort est pire que pas de canal — l'utilisateur clique, se cogne, et n'essaie pas deux fois. Les deux dépôts ont été rouverts le jour même et répondent 200 : ce contrôle ne répare donc rien aujourd'hui, il empêche la rechute (une case se décoche en deux clics, un dépôt neuf peut naître sans, et le code de l'app est écrit exactement pareil dans les deux cas). Il se déclenche quand l'app propose de signaler — `<AppFooter … issues>` ou l'appel direct à `issueReportUrl` / `currentIssueReportUrl` d'un pied de page maison, lus hors des commentaires et hors des tests — **et** que le dépôt refuse les issues. C'est le seul fait du docteur qui ne se lise pas sur le disque : `run()` interroge l'API GitHub quand un jeton est là (`pwa-ci.yml` passe désormais `github.token`, qui ne demande rien à l'appelant : `metadata: read` est toujours accordé) et passe le résultat à `diagnose(dir, faits)`, qui reste pure. **Sans jeton, sans réseau, sur une réponse inattendue — DNS, 401, 404, JSON illisible, délai de 8 s dépassé — ou sur un dépôt qu'on n'a pas su nommer sans deviner, le fait vaut `null` et le contrôle se tait** : ni « probablement », ni « à vérifier », rien. C'est la règle d'`escapesSite`, qui refuse d'accuser sur un préfixe inconnu, et le contraire du repli qui faisait de tout asset absolu un défaut. Le dépôt est identifié par le catalogue de la famille, puis par `repository` du `package.json`, puis par `GITHUB_REPOSITORY` — ce dernier seulement quand le dossier diagnostiqué EST la copie de travail du run, sinon un `--dir /tmp/…` lancé depuis la CI d'un autre dépôt jugerait le mauvais dépôt sans jamais le dire. `--no-github` coupe l'appel pour un diagnostic strictement hors ligne.
- 2c3ba14: **Le lien « Signaler un problème » était illisible, et rien ne pouvait le voir.**

  `AppFooter issues` (4.4.0) pose `[data-dwc='footer-issues']` à côté de
  `footer-source` et `footer-sponsor` ; `components.css` n'habillait que les deux
  premiers. Le troisième héritait donc de la couleur du texte courant : sur un
  fond sombre, noir sur violet nuit — **contraste 1,08**, relevé « serious » par
  axe sur mister-qowa. Huit applications l'affichent en production.

  Il rejoint ses deux voisins dans les trois règles qui les concernent : la cible
  tactile de 2,75 rem, la couleur et la mise en ligne, et l'état survolé.

  **Le garde qui manquait.** Rien ne croisait les marqueurs que `react/` ÉMET avec
  ceux que la feuille habille — un défaut invisible à la compilation, au test
  unitaire et à la relecture du composant, visible seulement à l'écran et
  seulement en thème sombre. `test/components-css.test.mjs` fait désormais ce
  croisement, avec la liste écrite des cinq marqueurs volontairement sans règle
  (`visually-hidden` et `skip-link`, habillés par classe dans `tokens.css` ;
  `app-version-label` et `family-apps`, qui héritent ou délèguent à leurs
  enfants ; `sparkline-last`, peint par son attribut `fill`) — chacun avec ce qui
  l'habille à la place. Un second test refuse une dispense devenue inutile, pour
  que la liste ne survive pas à ce qu'elle protège.

  Vérifié par falsification : en retirant les trois règles, le garde échoue en
  nommant `footer-issues (react/app-footer.js)`.

- 6c4c742: **Les quatre bins du paquet ne s'exécutaient PAS depuis `node_modules/.bin` — donc jamais en CI, donc nulle part.** `pwa-doctor`, `pwa-bundle-budget`, `pwa-screenshots` et `pwa-pgtap` finissaient tous sur le même garde d'entrée : `import.meta.url === pathToFileURL(process.argv[1]).href`. Or ces deux chemins ne désignent le même fichier que lorsqu'aucun lien ne se trouve sur la route — Node résout le realpath du module d'entrée pour `import.meta.url`, et laisse `process.argv[1]` sur le chemin tel qu'on l'a tapé. Sous POSIX, `npm` installe `node_modules/.bin/pwa-doctor` en **lien symbolique** vers `scripts/pwa-doctor.mjs` : les deux diffèrent, le garde est faux, et le bin **sort en silence avec le code 0**. Sous Windows le cmd-shim passe un chemin bourré de `..` que `pathToFileURL` normalise — le garde tenait, et personne ne voyait rien ; sauf avec un `node_modules` monté en jonction, où le parc avait déjà relevé le symptôme sans en comprendre la cause. **Mesuré le 06/09/2026** : `mister-miss-koh`, run 34045499498, étape « Doctor (conformité au parc) » — `npx pwa-doctor` dure 0,31 s et n'imprime rien, alors que `format()` imprime toujours, inconditionnellement, une ligne de résumé ; idem pour `pwa-starter-kit` (run 34041572861) et pour le job « Le squelette » du socle (run 34046133821). Vingt dépôts avaient une étape de CI verte qui ne contrôlait rien, `pwa-bundle-budget` n'a jamais tranché sur un seul build, et le défaut `issues-desactivees` — qui n'a de sens qu'en CI, seul endroit où un jeton permet de lire l'état du dépôt — ne s'exécutait nulle part. `pwa-icons` échappait au piège pour la seule raison qu'il appelle `main()` directement, sans garde.

  Le garde vit désormais dans `scripts/entree.mjs` (`estPointDEntree(import.meta.url)`) et **compare des realpath des deux côtés**, ce qui règle d'un coup le lien symbolique POSIX, le cmd-shim Windows, la jonction Windows et l'import par un test (où `argv[1]` désigne le lanceur, un autre fichier pour de bon). Un `argv[1]` absent ou qui ne mène nulle part rend `false` sans lever. `test/entree-bins.test.mjs` lance les quatre bins **par un chemin qui n'est pas leur realpath** — lien symbolique de fichier sous POSIX, jonction de dossier sous Windows où le lien de fichier demande un privilège — et exige qu'ils impriment exactement ce qu'ils impriment par leur vrai chemin ; il échoue sur les quatre avant ce correctif. Il vérifie aussi que `scripts/entree.mjs` figure bien dans `files` — le paquet énumère ses fichiers un par un, et un module oublié là arrêterait les bins publiés sur `ERR_MODULE_NOT_FOUND` chez les vingt applications.

  **Les sept outils de dépôt non publiés passent par le même garde** (`capture-screenshots`, `console-audit`, `dead-exports`, `fetch-metrics`, `probe-sites`, `promotion-candidates`, `sync-generated`). Ils fonctionnaient — on les lance par leur chemin réel, jamais par un lien — mais ils portaient le piège écrit de **trois façons différentes** : `pathToFileURL(argv[1])`, `new URL('file://' + argv[1])` (qui ne tient sous Windows que par la clause du parseur d'URL rendant sa lettre de lecteur à un « hôte » `D:`), et la comparaison de chaînes nue `argv[1] === fileURLToPath(import.meta.url)`, qui ne normalise rien du tout. Interdire ces trois orthographes laisserait passer la quatrième : le test exige donc qu'**un seul module du dépôt lise `process.argv[1]`**, celui qui est éprouvé de bout en bout. Les quatre bins restent vérifiés en vrai, derrière un lien ; les outils de dépôt s'arrêtent à ce contrôle statique, parce que les lancer coûterait un balayage du parc ou un accès réseau pour prouver la même ligne.

## 4.4.1

### Patch Changes

- a98b2dc: **`version.json` est cherché sous la base du build, et un pied de page suffit pour le sonder.** `vite-version` injecte désormais la base (`/miss-genius/`) avec la version ; `versionManifestUrl` en dérive une URL absolue — un `version.json` relatif partait à côté de la page depuis un lien profond d'une app qui route par chemin, et recevait 404 en silence. Hors `VersionProvider`, `AppVersion updates` (le défaut) sonde `version.json` une fois au montage (`checkUrl`, `checkEvery`, `fetch`) : une PWA installée ouverte sur la coquille du service worker sait qu'une version l'attend, sans câbler le fournisseur — dix-sept apps ne l'avaient pas posé. `useAppVersion(options)` porte ce sondage ; `readBuildInfo().base` est nouveau.

## 4.4.0

### Minor Changes

- beec787: **Signaler un problème avec le contexte.** Nouveau module `issue-report` : `issueReportUrl` compose l'URL de `issues/new` du dépôt avec le gabarit `bug.yml` que le dépôt `.github` du compte prête à tous, et ses champs préremplis — version et commit (lus dans ce que `vite-version` injecte), écran courant, navigateur, système, appareil, app installée (`describeEnvironment`). `AppFooter` gagne `issues` (opt-in) : un troisième lien, « Signaler un problème », en sept langues, dont l'URL est recalculée au clic. Aucune application du parc n'avait de signalement structuré.

### Patch Changes

- 9a18ece: `pwa-doctor` — nouveau défaut **`assets-hors-site`** : les scripts et feuilles
  de style liés hors du chemin du site.

  `miss-ticket-pwa` a servi une **page blanche du 03/06 au 06/09/2026**. Sa base
  de build valait `/` alors que le site vit sous `/miss-ticket-pwa/` : Vite
  écrivait `<script src="/assets/…">`, qui part de la racine de l'origine et
  répond 404. Ni JS ni CSS ne se chargeaient. Build vert, CI verte, `pwa-doctor`
  muet — et `run-doctor` était pourtant activé.

  **Muet pour une raison précise.** `sitePrefix()` déduit le chemin du site _des
  scripts eux-mêmes_ : quand ils sont faux, il se replie sur `/`, et `escapesSite`
  se désarme — exactement quand il servirait. Le nouveau contrôle juge à l'aune de
  la **canonique**, écrite par `pwaSeoPlugin` depuis l'URL publique déclarée, qui
  ne dépend pas de la base des assets.

  `htmlMarkers` expose désormais `canonicalHref` et `styles` ; `siteScope()` en
  tire le chemin. Sans canonique, le contrôle **se tait** au lieu de deviner — et
  `escapesSite` refuse d'accuser sur un préfixe inconnu.

  Relevé sur les dix-neuf sites publiés : seul `miss-ticket-pwa` était concerné,
  et il est corrigé.

## 4.3.2

### Patch Changes

- e17cfc3: `pwa-screenshots` : l'aperçu sert le build sous SA base, lue dans `dist/index.html` (`--base` pour l'imposer, `--dist` pour un autre dossier). Servi sous `/`, un build fait pour `/mister-x/` demandait ses actifs à `/mister-x/assets/…`, recevait des 404 et rendait une page blanche — les captures du squelette étaient deux rectangles blancs. Le bin refuse maintenant d'écrire une page vide, compte les 404 et sort en erreur.

## 4.3.1

### Patch Changes

- bc1a28a: `pwa-screenshots` : le script de Vite est résolu par `vite/package.json` et son champ `bin`. `vite/bin/vite.js` n'est pas exporté par le paquet, et le bin sortait en `ERR_PACKAGE_PATH_NOT_EXPORTED` à sa première exécution réelle.

## 4.3.0

### Minor Changes

- 74c606e: Les cinq actions de l'audit du design system du 06/09/2026.

  **Cinq jetons avaient des replis divergents.** `--dwc-danger` valait `#b91c1c`
  dans douze règles et `#b42318` dans quatre : une app qui ne déclare pas ses
  jetons voyait **deux rouges côte à côte**. Idem pour `success`, `info`,
  `primary-soft` (dont un repli `rgb(0 0 0 / 8%)`, noir sur noir en thème sombre)
  et `border-strong`. Le garde-fou qui devait l'empêcher s'en tenait aux replis
  sans parenthèses — il est remplacé par un lecteur à parenthèses équilibrées.

  **Douze marqueurs `data-dwc` étaient émis sans une seule règle.** Le bandeau
  « prêt hors ligne » d'`UpdatePromptBanner` sortait entièrement nu, `UpdateButton`
  et son indice aussi. Le libellé de `BottomNav` déborde désormais en points de
  suspension au lieu de pousser son voisin, et le contenu libre d'`EmptyState`
  n'est plus comprimé au centre.

  **`LoginForm` et `MfaChallenge` prennent le nom de leur titre**
  (`aria-labelledby`), comme `Sheet` et `ConfirmDialog` : un lecteur d'écran
  annonçait « formulaire » sur un écran qui n'a que ça.

  **`tone` est le mot de la famille**, `variant` la forme. `ErrorBanner` accepte
  `tone` (`severity` continue de marcher et reste l'attribut rendu), `Toast`
  accepte `tone="danger"` à côté de `"error"`. En l'écrivant, un vrai défaut est
  apparu : un `danger` tombait dans les **deux** régions vivantes — rendu et
  annoncé deux fois.

  **`Sparkline`, `BarChart` et `Gauge` ont enfin des tests** — seul composant
  visuel sans aucun, avec trois adoptants — une fiche de catalogue et une
  démonstration dans la vitrine.

- c61bb66: Les briques qui circulent : la barre basse collée, les captures du manifeste, le port de développement au catalogue, le budget à cliquet, et deux défauts connus corrigés (étape 4 d'[AMELIORATIONS.md](AMELIORATIONS.md)).
  - **`BottomNav placement="fixed"`** colle la barre au bas de la fenêtre, et **`PageContainer reserve="bottom-nav"`** réserve la place qu'elle occupe. Huit dépôts (sept apps et le squelette) recopiaient la même règle CSS avec la même réserve à côté. Défauts inchangés : rien ne bouge pour qui ne le demande pas.
  - **`pwa-screenshots`** (nouveau bin) : les deux captures du manifeste — `narrow` 540×1170 et `wide` 1280×720 — prises sur le build servi par `vite preview`, ou sur une app déjà servie (`--url`, données réelles), avec un module `--prepare` pour mettre l'écran dans l'état voulu par l'interface. Trois scripts faisaient la même chose (squelette, mister-miss-koh, showroom). **`pwaBaseOptions` lit ensuite `public/screenshots/` et déclare les entrées au manifeste, aux tailles lues dans les fichiers** : rien à écrire.
  - **`pwaBaseOptions` sans catalogue** : les couleurs du manifeste sont lues dans `src/index.css` (`--dwc-primary`, `--dwc-bg`) après l'explicite et le catalogue ; sans aucune source, un avertissement nomme les trois remèdes au lieu de laisser sortir un manifeste que Chrome refuse d'installer.
  - **`definePwaPlaywrightConfig`** : `overrides.use` complète le `use` calculé au lieu de le remplacer — le squelette perdait `baseURL` en fixant sa locale.
  - **`apps-catalog`** : `devPort` sur chaque app, unique (5201–5299 ; 1420 pour miss-ticket-pwa ; 5240 réservé au squelette), `devPortOf(id)`, `freeDevPort()` pour le générateur. `pwa-doctor` signale (info) un port déclaré qui n'est pas celui du catalogue.
  - **`pwa-bundle-budget --ratchet`** propose un budget resserré (mesure + 10 %) quand le build a maigri, et `--write` l'écrit dans `package.json` — un budget se posait un jour de surpoids et n'en bougeait plus.

## 4.2.1

### Patch Changes

- 7c42fee: `pwa-doctor` — le contrôle `liens-famille` reconnaît maintenant la coquille
  d'une application **sans routeur**.

  Trois apps du parc basculent d'écran sur un état, sans `<Routes>` ni
  `<Outlet>` : `miss-dice`, `miss-ticket-pwa`, `mister-puzzle`. Cherchée à ces
  marqueurs seuls, leur coquille n'existait pas, et le contrôle leur reprochait
  éternellement une place qu'elles tiennent. Il prend désormais aussi ce que
  l'**entrée** monte : `main.tsx` rend `<App />`, et ce composant-là est la
  coquille, routeur ou pas.

  Il suit l'**import**, pas l'export : `export default App` ne porte pas de nom
  exportable, et c'est la forme de deux des trois.

- 4e00325: Maturités du catalogue relevées au 06/09/2026. Elles décident du badge affiché
  par `FamilyApps` dans chaque application et de l'ordre de tri de la vitrine.

  | Vers       | Applications                                                                |
  | ---------- | --------------------------------------------------------------------------- |
  | **stable** | `mister-doc`, `mister-molkky`, `miss-dice`, `miss-badminton`, `mister-qowa` |
  | **beta**   | `mister-family-map`, `miss-supatool`, `miss-supaboss`, `mister-miss-koh`    |
  | **alpha**  | `miss-carbook`, `mister-footcoach`, `miss-ticket-pwa`                       |

  `mister-quota` était déjà en `alpha` : rien à changer.

  Six applications gardent la leur : `miss-contraction`, `miss-genius`,
  `miss-uwh`, `mister-cim10`, `mister-puzzle` (stable) et `miss-lookhouse` (beta).

## 4.2.0

### Minor Changes

- 4454ccd: Les gardes du parc deviennent effectifs : le docteur en CI, la spec a11y jouée, pgTAP partout, un audit sans page refusé.

  Relevé du 05/09/2026 ([AMELIORATIONS.md](AMELIORATIONS.md)) : `pwa-doctor` ne tournait que sur le squelette, une application sur vingt ; la spec `@a11y` du gabarit et du squelette n'était jamais exécutée parce que `pwa-ci.yml` ne jouait que `@critical` et que Playwright rend « No tests found » avec un code 0 ; les onze assertions pgTAP du squelette ne tournaient nulle part ; et un audit Lighthouse en `NO_FCP` passait vert sans catégorie accessibilité.
  - **`pwa-ci.yml`** : entrée `run-doctor` (opt-in en 4.x, défaut `true` à la prochaine majeure) qui lance `pwa-doctor` après le build, et `doctor-strict` ; `e2e-grep` vaut désormais `@critical|@a11y` par défaut, et **un filtre qui ne trouve aucun test fait échouer le job**. Le nom de l'artefact de rapport ne porte plus le filtre (`|` y est interdit).
  - **`pwa-lighthouse.yml`** : le rapport est relu après l'audit ; un `runtimeError` ou l'absence de score accessibilité fait échouer le job.
  - **`pwa-supabase-test.yml`** (nouveau réutilisable) : les tests pgTAP sur une pile Supabase jetable du runner, migrations depuis zéro, aucun secret — promu de `miss-lookhouse`, seule application à le faire.
  - **`pwa-pgtap`** (nouveau bin) : les mêmes fichiers joués contre la base liée, sans Docker — promu de `mister-miss-koh`, avec ses trois pièges écrits (colonne `(line)`, grants sur la table et la séquence, plan exact).
  - **`pwa-doctor`** : quatre lectures de plus — un déploiement Pages écrit à la main (sans le réutilisable, donc sans repli SPA ni `required-env`), une spec e2e que le filtre de CI ne joue jamais, l'absence de `version.json` (`versionPlugin`), et deux informations (budget sans `mainChunkKb`, accès directs à `localStorage` sans `versioned-store`). `spa-404` ne compte plus comme défaut ce que `pwa-deploy.yml@v4` ajoute au déploiement.
  - **`probe-sites`** : un lien profond qui rend le corps d'`index.html` est une coquille, quel que soit l'identifiant de l'élément racine (cim10 était un faux positif).

- 4454ccd: `LoginForm mode="otp"` : la connexion par lien, sans champ mot de passe.

  Les deux applications du parc qui ont écrit un écran de compte en septembre 2026 (miss-carbook, mister-miss-koh) passent par `signInWithOtp` ; le composant ne connaissait que le mot de passe. En mode `otp`, le formulaire ne rend qu'un champ e-mail (`autoComplete="email"`) et un bouton « Recevoir un lien », dans les sept langues du dictionnaire (`auth.otpTitle`, `auth.sendLink`) ; `onSubmit` reçoit `{ email, password: '' }` — le type ne change pas, l'appelant fait `signInWithOtp({ email, emailRedirectTo })`.

  Deux réglages sans lesquels le lien ne ramène nulle part, écrits dans la documentation du module : `flowType: 'pkce'` dès que l'application route par `#` (le flux implicite met le jeton dans le fragment, là où le routeur lit la route), et la liste d'URL autorisées du projet, qui ne contient que `http://localhost:3000` à la création.

## 4.1.0

### Minor Changes

- bce3b0e: Le catalogue connaît **dix-neuf** applications : `miss-supatool` et
  `mister-miss-koh` y entrent, avec leur palette.

  Elles consommaient le paquet depuis leur naissance sans y figurer : elles
  n'apparaissaient dans le `<FamilyApps>` d'aucune de leurs sœurs. C'est le geste
  que `create-lg-pwa-app` laisse délibérément à la main, et ces deux-là sont nées
  avant lui.

  `apps-catalog.js` et `themes.js` étant publiés, la montée est ce qui fait
  apparaître les deux nouvelles cartes chez les dix-sept autres.

- 730eea9: **Règle famille** : le lien **code source** et le lien **m'offrir un café** sont
  visibles **sur le premier écran** et **sur À propos / Réglages**. Pas l'un ou
  l'autre.

  `pwa-doctor` la vérifie (`liens-famille`), et accepte les deux façons de la
  tenir : `<AppFooter>` rendu dans la coquille **hors des `<Routes>`** — la
  réponse du socle, un seul endroit pour tous les écrans —, ou le pied de page
  rendu sur l'accueil **et** sur À propos / Réglages.

  Le contrôle dépouille les routes avant de conclure : un `<AppFooter>` écrit dans
  un `element={…}` ne vaut que pour cette route-là. Sans ce dépouillement, douze
  apps sur dix-neuf passaient à tort.

  Relevé du 05/09/2026 : **sept apps sur dix-neuf** tiennent la règle.

## 4.0.1

### Patch Changes

- f728f3e: `pwa-doctor` ne compte plus comme un défaut le commentaire qui met en garde contre ce défaut.

  Deux contrôles lisaient le fichier comme du texte plat : `secrets: inherit` dans les workflows, et `'fr-FR'` codé en dur dans les sources. Un `ci.yml` qui explique « pas de `secrets: inherit` ici » était donc signalé, et un module i18n qui documente pourquoi le parc ne doit plus figer sa locale l'était aussi. Un contrôle qu'on ne peut pas expliquer sans le déclencher pousse à ne rien expliquer.

  Les commentaires YAML (`#`), de bloc et de ligne sont retirés avant la recherche. Le motif de bloc est tempéré : la forme paresseuse enjambe les fins de commentaire et avalerait le fichier entier depuis son premier bloc de documentation.

  Les deux cas sont sortis du squelette `pwa-starter-kit`, premier consommateur écrit pour être exemplaire — c'est exactement le rôle qu'on attend de lui.

## 4.0.0

### Major Changes

- Le socle s'appelle désormais `@mister-guiiug/dev-pwa-config` — dépôt, paquet et étiquette mobile `v4`.

  Le produit a toujours été une PWA ; seul le nom du paquet disait « wpa ». Renommer un paquet npm n'est pas une redirection : c'est une nouvelle publication sous un autre nom, d'où cette majeure. Ce qui change pour une app, et rien d'autre :
  - `package.json` : `@mister-guiiug/dev-wpa-config@^3` → `@mister-guiiug/dev-pwa-config@^4` ;
  - tous les imports, `extends` et `@import` : même remplacement de nom ;
  - `.github/workflows/*.yml` : `mister-guiiug/dev-wpa-config/…@v3` → `mister-guiiug/dev-pwa-config/…@v4` — **obligatoire**, GitHub ne redirige pas les `uses:` d'un dépôt renommé (« repository not found ») ;
  - `renovate.json` : `github>mister-guiiug/dev-pwa-config//renovate/default.json`.

  L'ancien paquet reste publié en 3.34.0 et n'évoluera plus. Aucune API, aucun sous-chemin, aucun composant ne change dans cette version.

## 3.34.0

### Minor Changes

- `required-env` : le déploiement s'arrête sur une variable vide, au lieu de publier

  Le réutilisable `pwa-deploy.yml@v3` prend une entrée `required-env` — des noms
  de variables, un par ligne, qui doivent être NON VIDES après `build-env`. La
  vérification tombe **avant le pre-build** (donc avant les migrations) et avant
  le build, en nommant ce qui manque.

  `build-env` ne contrôlait que la FORME : quand `vars.VITE_X` n'existe pas, la
  ligne vaut `VITE_X=`, elle passe, et le build reçoit une chaîne vide. C'est
  ainsi qu'une app du parc est en ligne avec `apiKey: undefined`, CI verte.

  N'y lister que les variables **sans repli** : une `VITE_SENTRY_DSN` absente fait
  taire l'observabilité sans rien casser, et un garde bruyant finit désactivé.

  Le gabarit `templates/github-workflows/deploy.yml` est réécrit avec : il disait
  jusqu'ici de ranger les `VITE_*` « via `secrets` », c'est-à-dire l'inverse de la
  règle du README — Vite les copie dans le bundle, le secret n'y masque que les
  journaux de CI.

  Entrée facultative : les appelants existants ne changent pas de comportement.

- fcd7098: `pwa-doctor` relève trois écarts de plus sur les secrets et les variables :
  `secrets: inherit` dans un caller (le workflow appelé reçoit tout le trousseau),
  une `VITE_*` rangée en secret (Vite la copie dans le bundle : le secret masque
  les journaux, pas la valeur), et un `.env.example` absent ou incomplet au regard
  des `VITE_*` que le code lit. Le README porte la règle : la question n'est pas
  « est-ce sensible ? » mais « le navigateur le voit-il ? ».
- 8a17756: `SponsorProvider` : le lien de soutien se déclare une fois, et se retire

  Nouveau sous-export `react/sponsor` (`SponsorProvider`, `useSponsorUrl`), et
  `SPONSOR_HANDLE` + `sponsorUrl(handle)` au catalogue. `AppFooter` portait sa
  propre copie en dur de l'URL Buy Me a Coffee : changer le catalogue ne changeait
  pas le pied de page. Les deux composants lisent désormais la même source, avec
  trois niveaux — prop, contexte, famille — et `null` veut dire « pas de lien ».

  Aucune rupture : une app qui ne fait rien obtient exactement ce qu'elle rendait.

## 3.33.0

### Minor Changes

- 2733cc1: `react/app-header` et `react/page-container` — le troisième côté du cadre, et
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

- 38bd4f3: La couche auth : `react/auth-provider`, `react/login-form`, `react/mfa-challenge`

  Le socle avait le **port** (`auth/index`, `auth/supabase`, `auth/mfa`,
  `auth/errors-fr`), un instantané React (`react/use-auth`) et une garde
  (`react/auth-gate`). Aucune des six apps n'avait adopté `useAuth`, et
  `CAMPAGNE.md` notait que migrer `AuthGate` entraînerait « tout le port ». Vu
  depuis les apps, il manquait trois pièces — et elles les avaient toutes
  écrites, chacune de son côté :

  | pièce                                                    | exemplaires                                      |
  | -------------------------------------------------------- | ------------------------------------------------ |
  | un contexte `signIn` / `signOut` / `session` / `loading` | uwh 161 l., footcoach 62, doc 218, lookhouse 119 |
  | un formulaire e-mail + mot de passe                      | uwh 64, footcoach 58, doc 166, lookhouse 170     |
  | un défi MFA                                              | uwh 60, doc 142                                  |

  **`AuthProvider` / `useAuthContext`** — le contrat de footcoach, le plus
  simple, rebâti sur le port : le client est créé une fois par adaptateur, les
  actions rendent `{ ok, error }` et jamais une exception, la session arrive par
  l'évènement du service. Sans adaptateur : mode local, `signed-out`, chaque
  action rend `{ ok: false, error: { code: 'local-mode' } }`.

  **`LoginForm`** — présentationnel : `onSubmit({ email, password })`, `busy`,
  `error` (une chaîne déjà traduite, dans un `role="alert"` à part), `mode`
  `signin` / `signup`, et deux emplacements pour ce qui diffère entre les apps :
  `children` (des champs de plus) et `footer` (passkey, mot de passe oublié).

  **`MfaChallenge`** — promu de mister-doc : TOTP avec le clavier numérique et
  `one-time-code`, code de secours et déconnexion **seulement** si l'appelant
  les fournit.

  Le dictionnaire gagne le groupe `auth` — quatorze libellés, sept langues.
  `components.css` habille les deux formulaires ; le showroom porte leurs
  fiches ; la table d'équivalences compte `AuthContext.tsx`, `LoginPage.tsx`,
  `LoginScreen.tsx` et `MfaChallenge.tsx`.

- 9a0dbe9: `pwa-bundle-budget` — un budget de bundle pour les seize apps

  `miss-uwh` (`check-bundle-budget.mjs`, 60 l.) additionne le poids **gzip**
  de tout le JS émis et échoue au-delà d'un total ; `mister-qowa`
  (`check-bundle.mjs`, 25 l.) borne le poids **brut** du chunk principal. Deux
  mesures pour la même intention — et le commentaire d'uwh raconte trois
  montées de version où la mesure a changé une décision. Deux apps sur seize
  l'avaient ; les quatorze autres grossissent sans le savoir.

  Un bin, comme `pwa-icons` :

  ```json
  "scripts": { "build": "tsc -b && vite build && pwa-bundle-budget" },
  "bundleBudget": { "totalGzipKb": 255, "mainChunkKb": 300 }
  ```

  Les deux mesures sont gardées, parce qu'elles ne disent pas la même chose :
  le total gzip est ce que l'utilisateur télécharge, le chunk principal ce
  qu'il attend avant le premier rendu. Le budget se lit dans `package.json` —
  il doit être relu dans une PR, pas dans un script `npm` que personne
  n'ouvre — et un budget sans aucune borne n'échoue jamais en silence : il le
  dit. Tous les dépassements sont rendus d'un coup.

  `measureBundle`, `checkBudget` et `readBudget` sont exportés et testés ; le
  script ne mesure rien quand on l'importe.

- 95df13c: `format` : les quatre règles que cinq apps réécrivaient par-dessus

  Le module est adopté — genius, uwh, lookhouse, supaboss, quota l'importent.
  Chacune garde pourtant un `format.ts` de 50 à 80 lignes, et chacune explique
  en en-tête ce qu'elle y ajoute. Quatre règles, dont une écrite deux fois :
  - **`formatSigned(value, options)`** — « + » explicite, signe moins
    typographique (U+2212, qu'`Intl` ne produit pas), et un mot pour zéro.
    `miss-uwh` (`formatSignedEuro`) et `miss-genius` (`formatDelta`) l'avaient
    chacune écrite ; elles diffèrent sur zéro — rien pour un solde nul, « = »
    pour un delta nul —, d'où `zero`. En devise (`currency`), en nombre, ou par
    un rendu injecté (`format: abs => …`).
  - **`decimals`** sur `formatNumber` et `formatCurrency` — un mot pour
    `minimumFractionDigits` + `maximumFractionDigits`. C'est le réglage du club
    qu'uwh honorait dans `formatEuro`, et que `formatCurrency` ne prenait pas.
  - **`formatPercentage(…, 'auto')`** — une décimale sous 10 %, aucune
    au-dessus : la règle de supaboss (« 7,5 % » lisible, « 42 % » sans faux
    « ,0 »). Des options en 2ᵉ place aussi : `{ decimals: 'auto' }`.
  - **`formatRelativeTime(date, { never })`** — un mot pour une date absente,
    parce qu'une mesure jamais faite n'est pas « il y a 0 seconde »
    (supaboss). Au passage, `null` et `undefined` sont une absence : l'ancienne
    forme les convertissait en 1970 et rendait « il y a 56 ans ». Les formes
    positionnelles historiques ne bougent pas.

  La date courte numérique de supaboss (`30/08/2026 16:05`) était déjà là :
  `formatDateTime(d, { dateStyle: 'short', timeStyle: 'short' })`.

- 25e88db: `id` — `createId`, `createUuid`, `isUuid`

  Le besoin le plus banal qui soit, et **deux cent cinquante sites d'appel** dans
  quatre apps : `miss-uwh` (`createId` + `createUuid`, 99), `mister-footcoach`
  (75), `bac-sable` (`newId`, 46), `miss-genius` (`createId`, 30 — la copie de
  celui d'uwh, à la lettre). Et le paquet le réécrivait lui-même : `sync-queue`
  et `react/use-offline-queue` portaient chacun leur `newId()` avec le même
  repli sur `crypto.randomUUID`. Les deux importent désormais d'ici.

  `createUuid` est celui d'uwh, le seul des quatre à avoir le repli v4
  **complet** — bits de version et de variante posés, ce qu'une colonne `uuid`
  Postgres exige. `createId(prefix)` rend `id_3f9a2c1b`. `isUuid` valide la
  forme.

  Ce qui n'est PAS promu : `genId` de footcoach (compteur + horodatage, une
  autre promesse) et `generateSecureId` de `security`, qui est un jeton
  imprévisible sans repli — son commentaire, qui évoquait `randomUUID`, était
  périmé et le dit maintenant.

- 10e3f9a: Les libellés du socle en sept langues, et `offlineMessage` sur `useActionGuard`

  `react/labels` ne portait que `fr` et `en`, et **retombait en silence sur le
  français** pour toute autre locale. Or la famille en parle sept :
  `miss-contraction` (7), `miss-dice` (6), `mister-qowa` (5), `miss-badminton`
  (3). Huit fichiers-pont dans sept apps — `AppUpdatesProvider` × 2 (le même
  fichier à 82 %), `AppLabelsProvider`, `SocleLabels`, `SocleProviders`,
  `SocleLabelsBridge`, `useNetworkGuard` × 2 — n'existaient que pour surcharger
  ce que le socle ne savait pas dire. `miss-badminton` surchargeait jusqu'au
  français « pour que le repli devienne inatteignable ».

  Les 54 libellés existent désormais en `es`, `de`, `it`, `pt` et `nl`, avec la
  terminologie déjà en production dans ces apps (« Más tarde », « Neu laden »,
  « Riprova », « Tentar novamente », « Herladen »). Le test de parité couvre les
  sept dictionnaires : une clé absente dans l'un d'eux fait échouer `npm test`.

  **`labelsFor(locale)`** : une étiquette régionale retombe sur sa langue avant
  de retomber sur le français — `pt-BR` donne du portugais, ce que
  `createI18n` peut transmettre tel quel.

  **`useActionGuard({ online: true, offlineMessage })`** : le motif « hors
  ligne » ne pouvait venir que des libellés du paquet. `mister-puzzle` et
  `mister-qowa` enveloppaient le hook dans un `useNetworkGuard` de trente à
  cinquante lignes pour lui redonner sa phrase — et puzzle, qui écrit son i18n
  à la main sans `LabelsProvider`, ne peut être servi par aucune langue de plus.
  Une prop, comme `message` sur une vérification injectée.

- 18599fc: Les petites demandes écrites dans les apps : `Badge` `size`, `useFullscreen`, `cn`

  Le tri de `GISEMENTS.md` a relevé, dans les commentaires des apps, ce que le
  socle ne leur donnait pas. Trois demandes tiennent chacune dans dix lignes :
  - **`Badge` gagne un axe de taille** — `xs` / `sm` / `md` (`md` est l'ancien
    et seul rendu). `mister-doc` gardait ses pastilles de calendrier hors du
    paquet parce que « `size="xs"` n'a pas d'équivalent : le socle n'a pas d'axe
    de taille ».
  - **`react/use-fullscreen`** — le plein écran natif : `supported`, `active`
    (suit `fullscreenchange`), `enter` / `exit` / `toggle` qui ne lèvent jamais.
    `miss-badminton` (62 l.) et `mister-molkky` (44 l.) portaient le même bouton ;
    le paquet promeut le hook, le bouton reste à l'app.
  - **`cn`** — joint des classes (chaînes, tableaux, objets `{ classe:
condition }`). `miss-genius` et `miss-uwh` en portaient la même copie de
    cinq lignes, à la lettre.

  Deux autres demandes de la même liste avaient **déjà leur réponse** dans le
  socle, et sont documentées comme telles dans `GISEMENTS.md` : le GIF dans
  `IMAGE_ACCEPTED_TYPES` est refusé par une décision écrite dans le module
  même (la liste est un plancher, on l'élargit au site d'appel), et les canaux
  temps réel orphelins sont refermés depuis 3.24.0 — le contournement de
  carbook survit à un défaut qui n'existe plus.

- 7482ff3: `pwa-doctor` — la checklist du parc, lue sur un dépôt. Un lint voit le code ;
  il ne voit pas qu'un manifeste est lié à la racine de l'origine (l'app ne
  s'installe pas), qu'un `renovate.json` étend un préréglage inexistant, qu'une
  app routée par chemin n'a pas de `404.html`. Ce bin lit le dépôt (fichiers du
  gabarit), les workflows (Lighthouse, nettoyage, keep-alive Supabase, e2e,
  `@v3`) et le build (`dist/` : manifeste sous le site, PNG 512, maskable, `id`,
  langue, icône iOS, `theme-color` par schéma, CSP, Open Graph, canonique,
  `404.html`), et rend trois verdicts — défaut, dette, info — avec le geste à
  chaque ligne. Code 1 sur un défaut ; `--strict` refuse aussi les dettes. Les
  lectures pures d'un site (`scripts/site-readers.mjs`) sont publiées avec lui.
- 42c9af9: `react/card` — `Card` et `CardHeader`, la surface que dix apps avaient

  Le socle avait `Button`, `Field`, `Badge`, `Sheet`, `Stat`… et pas de carte.
  Dix apps sur dix-sept en avaient une, aucune du paquet : `Card.tsx` dans
  `miss-genius` et `miss-uwh` — **le même fichier**, au préfixe de variable
  près (`--mg-surface` contre `--uwh-surface`) —, dans `mister-footcoach`
  (avec `CardHeader`, 23 importateurs) et `mister-qowa` ; et une classe `.card`
  écrite à la main dans six feuilles de style de plus.

  Le contrat est celui de footcoach, le plus complet : `Card` (`as`, `padding`)
  et `CardHeader` (`title`, `subtitle`, `action`, `as` pour le niveau de titre).
  `components.css` l'habille sous `[data-dwc="card"]` sur `--dwc-surface`,
  `--dwc-border`, `--dwc-radius` — exactement les variables que les copies
  nommaient chacune à sa façon.

  Une carte est une surface, pas un contrôle : l'action va dans `action`, sur
  un élément focusable, jamais en `onClick` sur le `div`. Quatre tests, une
  fiche au showroom, une entrée dans la table d'équivalences.

- 6ede81d: Repli SPA `404.html` — `spaFallbackPlugin()` et le déploiement réutilisable

  GitHub Pages n'a pas de repli SPA : rafraîchir `/miss-contraction/a-propos`,
  ou ouvrir un lien partagé, sert sa page « File not found », pas l'app. Mesuré
  le 02/09/2026 sur les sites publiés : **quatre apps à routage par chemin**
  (contraction, footcoach, badminton, family-map) étaient dans ce cas, et trois
  autres (carbook, molkky, dice) avaient chacune écrit la même correction chez
  elles — le plugin de dice et celui de molkky sont identiques à la ligne près.

  Deux réponses, pour deux chemins de déploiement :
  - **`pwa-deploy.yml`** copie `index.html` en `404.html` après le build, s'il
    manque. Les apps déployées par le workflow réutilisable sont couvertes **sans
    changer une ligne**, dès que `v3` suit cette version.
  - **`spaFallbackPlugin()`** dans `vite-pwa-base`, pour `vite preview`, un autre
    hébergeur ou un déploiement écrit à la main — et pour que carbook, molkky et
    dice retirent leur copie.

  Inoffensif pour une app qui route par `#` : GitHub ne voit jamais le chemin,
  le fichier ne sert jamais. Le service worker masquait déjà le défaut après la
  première visite ; il restait entier pour un lien ouvert à froid.

### Patch Changes

- c72903a: Le relevé d'adoption ne prend plus un fichier pour une façade parce qu'il
  importe n'importe quoi du socle : il faut qu'il importe un symbole LIBÉRATEUR
  du besoin, ou réexporte depuis le paquet. L'`AppHeader.tsx` de miss-uwh, qui
  prend `Button` au socle et reste un en-tête écrit à la main, passait pour
  adopté — avec quatorze autres copies. Le relevé passe de 19 à 34.

  Deux sondes de dépôt (non publiées) : `scripts/probe-sites.mjs` lit les sites
  publiés (manifeste, CSP, Open Graph, repli 404, poids du JS initial) ;
  `scripts/dead-exports.mjs` relève les exports que personne n'appelle. Leurs
  trouvailles du 02/09/2026 sont classées dans `PARC.md`.

- 7a9af4a: Renovate hébergé par le socle. Aucun des dix-huit dépôts n'avait jamais reçu
  une PR de Renovate : treize apps étendaient un préréglage dans un dépôt
  `.github` qui n'existe pas, et l'application n'était pas installée. Le
  préréglage vit désormais dans `renovate/default.json` (les apps l'étendent par
  `github>mister-guiiug/dev-wpa-config//renovate/default.json`), et
  `.github/workflows/renovate.yml` fait tourner Renovate auto-hébergé le samedi
  matin sur tous les dépôts du compte qui portent une configuration — jamais le
  miroir `mister-family-map`. Il faut un secret `RENOVATE_TOKEN` ; sans lui le
  workflow le dit et s'arrête.
- 8c6194b: Trois workflows réutilisables de plus — `cleanup-runs`, `pwa-supabase-migrate`, `pwa-worker-deploy`

  `.github/workflows` est le dossier le plus recopié de la famille, et le mieux
  outillé pour ne pas l'être : `pwa-ci`, `pwa-deploy`, `pwa-lighthouse` sont
  appelables et adoptés partout. Restaient trois trous, mesurés le 02/09/2026 :
  - **`cleanup-runs.yml` — 73 lignes, douze copies identiques.** Le socle avait
    le même fichier, mais en `workflow_dispatch` seulement : chaque dépôt devait
    l'héberger. Il déclare `workflow_call` ; une copie tombe à dix lignes. Les
    entrées passent par `env:` au lieu d'être interpolées dans le JavaScript.
  - **`pwa-supabase-migrate.yml` — quatre copies, 35 à 143 lignes**
    (lookhouse, uwh, doc, carbook) autour de la même paire `supabase link` +
    `supabase db push`, avec la même concurrence « on ne coupe pas une migration
    en vol ». Une fois, avec le déploiement optionnel des Edge Functions.
  - **`pwa-worker-deploy.yml` — deux copies** (genius, supaboss) du même
    `wrangler deploy`, avec la même décision : sans secret Cloudflare, on
    n'échoue pas, le Worker est optionnel.

  Et un rappel que le README ne portait pas : **`pwa-supabase-keepalive.yml`
  existait, réutilisable, et aucune des huit apps Supabase ne l'appelait** —
  `miss-carbook` dort depuis le 29/08 et ne se déploie plus. Il figure
  désormais dans la table des workflows, à côté de la migration.

  `test/workflows.test.mjs` verrouille ce qu'un appelant est en droit
  d'attendre : `workflow_call` déclaré, actions référencées par `@v3` (un
  chemin relatif vise le checkout de l'appelant), jamais `secrets: inherit`,
  et le `404.html` du déploiement Pages écrit entre le build et l'artefact.

  Outillage de la famille, hors paquet npm : les apps le reçoivent quand `v3`
  suit cette version.

## 3.32.1

### Patch Changes

- 602cfb9: `apply-rulesets` n'assemble plus de ligne de commande

  CodeQL le signalait depuis le 24/08 (`js/indirect-command-line-injection`,
  alerte 8, gravité moyenne) : le nom de dépôt venu de `process.argv` descendait
  jusqu'à `execSync`, en traversant une chaîne de commande.

  ```
  node scripts/apply-rulesets.mjs 'x; commande'
  ```

  `execSync` reçoit une ligne de commande, donc un interpréteur : tout ce qui s'y
  retrouve peut en sortir. `execFileSync` prend un exécutable et un **tableau**
  d'arguments, passés tels quels au processus — il n'y a plus de chaîne à
  découper, donc plus rien à échapper. **La classe entière de défaut disparaît**,
  pas seulement ce cas-ci.

  L'outil valide en outre son argument contre le catalogue. Ce n'est pas la
  correction — c'en est une seconde, utile à autre chose : une faute de frappe
  partait jusqu'ici en requête et rendait un 404 attrapé par le `try`, donc un
  `✗` au milieu d'une sortie verte. C'est exactement la panne que l'en-tête du
  script raconte — `miss-ticket` pour `miss-ticket-pwa` — et elle laissait croire
  un ruleset appliqué.

  Outillage de développement du dépôt : rien de publié ne change.

- 5e8f896: ESLint ignore `.claude/worktrees`

  Un agent lancé en `isolation: worktree` checkoute **l'arbre entier du dépôt**
  sous `.claude/worktrees/<nom>/`. Personne ne le voit : git masque le dossier
  par `.git/info/exclude`, donc `git status` reste vide. ESLint, lui, ne lit pas
  `.gitignore` — il descend dedans et lint la copie.

  Le résultat est un angle mort exact :

  ```
  $ git status          # rien à signaler
  $ npm run lint        # ✖ 65 problems (47 errors, 18 warnings)
  ```

  Sur `miss-contraction`, **les 47 erreurs venaient toutes de la copie** : son
  propre code en avait zéro. On cherche longtemps un défaut dans du code qu'on ne
  lit pas. Quatre dépôts de la famille en traînaient cinq, pour 2,3 Go.

  L'ignore est étroit à dessein. `.claude` en entier couperait aussi ce qu'un
  dépôt y écrit à la main et versionne — `launch.json`, `skills/` — alors que
  seul `worktrees` est engendré par la machine. `test/configs.test.mjs` le
  vérifie par l'API d'ESLint, à travers `eslint-react` (la seule config que les
  apps importent), et refuse un ignore qui déborderait.

  Prettier n'a pas besoin de ce correctif : depuis la 3.x il honore `.gitignore`.
  Une ligne `.claude/worktrees/` **versionnée** dans le `.gitignore` de chaque
  dépôt le couvre, et rend au passage visible ce que `.git/info/exclude` cachait.

- 966a5b0: `apply-rulesets` exigeait un check qui n'existe pas

  Trois défauts, trouvés en relevant les `check-runs` réels des dix-neuf dépôts
  avant d'appliquer quoi que ce soit.

  **Le préfixe `ci / ` manquait.** Les seize apps appellent le workflow
  réutilisable depuis un job nommé `ci` : GitHub enregistre donc
  `ci / Format · Lint · Type · Test · Build`. Le script exigeait
  `Format · Lint · Type · Test · Build` tout court — un contexte qui n'est jamais
  rapporté sous ce nom. Appliqué tel quel, il aurait **gelé toutes les PR des
  seize apps**, sans recours autre que modifier le ruleset. C'est exactement la
  panne que l'en-tête du script décrit, et qu'il portait encore.

  **`mister-family-map` est un MIROIR.** `npm run mirror` y fait littéralement
  `git push --force <remote> refs/heads/main:refs/heads/main`. Le ruleset
  standard le casserait deux fois : `non_fast_forward` refuse le forçage, la
  règle `pull_request` refuse le push direct. Il ne reçoit donc plus que la règle
  `deletion` — la relecture a lieu sur sa source, `bac-sable`.

  **`mister-quota` a sa propre CI.** Une matrice Node (`20.x`, `22.x`), et un job
  `package desktop` conditionné à `refs/tags/v*`, donc jamais exécuté sur une PR.
  Exiger celui-là aurait produit le même gel.

  `.github` est retiré de la liste : le dépôt n'existe pas (404), et son entrée
  produisait une croix avalée par le `try` — au milieu d'une sortie verte.

  Outillage de développement du dépôt : rien de publié ne change.

- a0e80b6: `apply-rulesets` : contournement admin, à travers une PR seulement

  Le ruleset s'appliquait à tout le monde, administrateurs compris — aucune PR ne
  pouvait être fusionnée tant qu'un check restait en attente ou qu'un fil de
  discussion ouvert par un robot de relecture n'était pas résolu.

  Le rôle admin peut désormais contourner, avec `bypass_mode: 'pull_request'` et
  non `'always'`. Les deux ne rendent pas la même chose :
  - `always` — le porteur peut aussi **pousser directement sur `main`**. C'est
    précisément le trou que ce ruleset existe pour fermer.
  - `pull_request` — tout continue de passer par une PR ; le porteur peut en
    revanche fusionner sans attendre.

  Le commentaire de la règle dit ce que le ruleset garantit : « qu'aucun commit
  n'atterrit sur `main` sans passer par une PR ». Le mode `pull_request` préserve
  exactement cette garantie, et ne lève que la gêne.

  Le miroir n'en reçoit pas : sa seule règle est `deletion`, et un contournement
  n'y servirait qu'à supprimer `main`.

## 3.32.0

### Minor Changes

- 7ae05eb: `AppFooter` gagne `after`, et `linkComponent` cesse d'interdire ce qu'il recommande

  **Les deux corrections viennent d'une migration réelle**, pas d'une revue.

  **`after` — le troisième emplacement.** La 3.31.0 ajoutait `children` et
  `links` en pensant couvrir le pied de page de miss-contraction, son tableau de
  besoins à l'appui. La migration a buté sur le quatrième élément : son numéro
  n'est pas `version` mais `deploymentVersion`, de la forme `1.2.3+1756…`, et
  `AppVersion` passe par `formatVersion`, qui **supprime le `+buildId`**. Or
  c'est lui, et lui seul, qui permet de vérifier qu'un déploiement a pris — sans
  lui, deux bundles différents affichent la même chaîne.

  `version` n'était donc pas un remplacement, et aucune combinaison de `children`
  et `links` ne place un paragraphe **en dernier** ; un `order` CSS aurait menti à
  l'ordre de lecture. `after` rend sous les liens et le numéro.

  Deux emplacements conçus depuis un tableau de besoins en couvraient trois sur
  quatre. C'est en migrant qu'on l'a su.

  **`linkComponent` était typé `ComponentType<Record<string, unknown>>`**, qui
  refuse tout composant à prop obligatoire — donc précisément le `Link` de
  react-router et son `to`, l'usage que sa propre documentation recommande.
  **Cinq apps portaient la même conversion**, avec le même commentaire : « c'est
  l'usage documenté du socle ». Un type qui interdit ce que sa documentation
  recommande est un défaut du type. Il devient `ComponentType<any>`, et les cinq
  casts peuvent partir.

  Aucun changement de comportement : `after` est optionnel, et l'élargissement
  d'un type n'invalide aucun appel existant.

## 3.31.0

### Minor Changes

- 7eb2cc2: `AppFooter` et `BottomNav` : répondre aux deux refus argumentés

  Deux apps de la famille refusaient de migrer, et **avaient écrit pourquoi dans
  leur propre fichier**. Ce sont les deux dernières dettes du relevé, et les deux
  seules argumentées. Leurs demandes sont ici.

  **`AppFooter` gagne `children` et `links`.** L'en-tête de
  `miss-contraction/src/react/components/layout/AppFooter.tsx` dresse le tableau :
  sur ses quatre éléments, le pied de page du socle n'en couvrait qu'un.
  - `children`, rendu EN PREMIER — l'avertissement médical n'avait aucun
    emplacement. Le remplacer l'aurait sorti du repère de pied de page, et
    l'imbriquer était interdit (`<footer>` ne peut pas descendre d'un `<footer>`).
    Sur une app qu'on ouvre pendant un accouchement, « cet outil ne remplace pas
    un avis médical » n'est pas décoratif : c'était un blocage complet.
  - `links` — son lien « À propos » est un `Link` de routeur vers `/a-propos`,
    quand `repoUrl` rend un `<a target=_blank>` vers GitHub. Ce composant ne
    dépend d'aucun routeur et ne peut pas en fabriquer un, mais il peut en
    accueillir.

  **`BottomNav` gagne `trailing` et `item.className`.** La dernière ligne de son
  `BottomNav.tsx` est une demande textuelle : « À DEMANDER AU SOCLE si la
  migration doit un jour aboutir : un emplacement libre en fin de barre
  (`trailing`), et une accroche d'habillage par élément. »
  - `trailing` — sa cinquième cellule n'est pas une destination : c'est un
    `<button>` qui ouvre le tiroir de l'app. Le bouton « Plus » interne lui
    ressemble mais fait autre chose (il déplie _son_ tiroir d'onglets en
    surnombre) : même balisage, autre mécanique.
  - `item.className` — son appel maternité est un bouton d'action, pas un onglet.
    `key` ne descend pas dans le DOM, et un sélecteur sur le `href` ne tiendrait
    pas : les chemins sont traduits dans sept langues.

  Les quatre ajouts sont **additifs** : les six apps qui importent déjà ces
  composants ne changent pas d'un pixel, et un test l'exige pour chacun. Sept
  tests neufs, quatre garanties vérifiées par mutation.

### Patch Changes

- 81f86fe: Le plus gros doublon du parc n'était pas compté

  `testing/pwa-register.js` annonce dans son en-tête, depuis sa promotion, qu'il
  répond au **plus gros doublon du parc** : douze dépôts portaient ce double de
  `virtual:pwa-register` écrit à la main, sous trois noms de fichier différents.

  `EQUIVALENTS` n'avait aucune ligne pour lui. La plus grosse duplication connue
  du dépôt n'a donc jamais figuré dans le chiffre qu'on publie.

  **Il n'a pas été trouvé à la main.** `scripts/adoption-candidates.mjs`, ajouté
  ici, compare ce que les apps _déclarent_ à ce que le paquet _exporte_ — et l'a
  sorti en tête, avec neuf apps. La table est écrite à la main, entrée par
  entrée ; c'est sa force et c'est son plafond : vingt-six besoins pour cent
  trente-huit sous-chemins. Ce qu'elle ignore, personne ne le voit.

  L'outil sort du bruit par construction — `CATEGORIES` y apparaît pour le
  tableau de score du yahtzee de miss-dice. Sa sortie est une liste de choses à
  aller lire, pas un relevé.

  **Et le défaut n°1 survivait dans le README.** `adoptionTable` cherchait un
  symbole portant le _nom du besoin_ : dix des vingt-sept clés n'étant le nom
  d'aucun export, leur colonne « Importé par » affichait zéro par construction.
  `testing/pwa-register` s'annonçait `0 / 17` alors que cinq apps importent
  `swStub` — cinq migrations réussies, affichées comme n'existant pas, dans le
  document qui sert à convaincre. Deux autres lignes étaient fausses au passage :
  `useTheme` (2 → 10) et `applyUpdate` (4 → 8).

  Une règle d'acquittement ne vaut que si tout ce qui la lit l'applique.

  La dette passe de 2 à **11**, et c'est le but : elle était fausse à 2.

  Rien de publié ne change : outillage de développement du dépôt.

- 19819cc: Relevé d'adoption : trois des cinq dettes restantes n'existaient pas

  Le relevé annonçait cinq doublons. En les ouvrant un par un, **trois étaient
  des artefacts de l'instrument** — et l'un d'eux révèle un défaut qui pouvait
  aussi mentir dans l'autre sens.

  **`.claude` n'était pas ignoré.** Le balayage descendait dans les worktrees
  d'agent : 98 fichiers source sous `miss-contraction/.claude`, 298 sous
  `mister-footcoach`, 116 sous `mister-qowa` — du code de branches non
  fusionnées. miss-contraction était comptée en dette sur `useI18n` pour un
  `src/hooks/useI18n.ts` qui n'existe que là, donc dans aucune version de l'app.
  Le tort symétrique est le dangereux : un worktree qui importe le paquet
  ACQUITTE un besoin que `main` ne couvre pas. Vérifié — aucune app n'était dans
  ce cas ce jour-là, mais rien ne l'en empêchait.

  **`storage.ts` était devenu cent pour cent faux positifs.** La ligne était déjà
  signalée comme la plus faible de la table, « conservée pour le vrai positif ».
  Ce vrai positif était mister-cim10 — et il a migré. Restaient un adaptateur
  `Storage` pour `zustand/persist` (mister-molkky) et de la persistance métier
  (miss-contraction), ni l'un ni l'autre n'étant une sauvegarde.

  La supprimer aurait perdu le rappel. Le besoin `backup` se détecte désormais
  par ce que l'app **déclare** (`exports: ['createBackup', …]`) plutôt que par le
  nom de ses fichiers : zéro détection sur le parc — le même chiffre que la
  suppression, sans jeter ce qu'elle jetait. C'est la leçon des trois homonymes
  (`Navbar.tsx`, `theme.ts`, `storage.ts`) appliquée au lieu d'être seulement
  écrite.

  **Les formes d'import : sept modules passaient pour morts.** Le relevé ne
  connaissait que l'import nommé et le `@import` CSS. Or la couche outillage ne
  s'importe presque jamais comme ça — un `prettier.config` réexporte, un
  `setup.ts` importe pour l'effet de bord, un `tsconfig` hérite en JSON. Sept
  sous-chemins étaient comptés à ZÉRO consommateur :

  | sous-chemin           | vrai compte | forme                     |
  | --------------------- | ----------- | ------------------------- |
  | `/prettier`           | 16 / 17     | `export { default } from` |
  | `/eslint-react`       | 16 / 17     | réexportation             |
  | `/vitest-setup`       | 15 / 17     | `import '…'`              |
  | `/tsconfig-app-react` | 15 / 17     | `"extends"`               |
  | `/tsconfig-node`      | 15 / 17     | `"extends"`               |
  | `/lint-staged`        | 14 / 17     | réexportation             |
  | `/commitlint`         | 3 / 17      | réexportation             |

  Le README affirmait « la couche outillage est adoptée » : c'était vrai, et
  l'instrument affichait zéro. Un module qu'on ne sait pas mesurer passe pour
  mort — et c'est ce chiffre qui décide quoi promouvoir ensuite.

  La lecture des `tsconfig` est ancrée sur `extends`, pas sur le nom du paquet :
  `miss-dice` le cite deux fois dans des **commentaires** (« Inlined from … »),
  ayant recopié le contenu au lieu de l'étendre. Le compter serait exactement
  l'inverse de la vérité.

  Le balayage vit maintenant dans `scripts/adoption-scan.mjs`, testable — comme
  `adoption-equivalents.mjs` et `migrate-plan.mjs` avant lui. Les trois défauts
  corrigés ici vivaient dans du code que rien ne pouvait exercer.

  Rien de publié ne change : outillage de développement du dépôt.

- c761c3c: « Forcer la mise à jour » pouvait emmener chez la voisine, et casser les quinze autres

  Défaut signalé en usage : « si on ouvre plusieurs apps et qu'on clique sur
  forcer la mise à jour, des fois on bascule sur la page d'accueil d'une **autre
  app** que celle en cours ».

  **La cause tient en une ligne de spécification.** Les seize apps de la famille
  sont publiées sous `https://mister-guiiug.github.io/<app>/` — **une seule
  origine**. Or `getRegistrations()` et `caches.keys()` portent sur l'origine, pas
  sur l'application : depuis miss-dice, on voit les service workers et les caches
  des quinze autres, et on peut les détruire.

  Trois conséquences, toutes reproduites par des tests avant d'être corrigées.

  **1. On naviguait chez la voisine.** `controllingScope` finissait par
  `couvrantes[0] ?? scopes[0]`. Quand aucune portée ne couvre la page — le worker
  n'est pas encore installé, ou une voisine vient de le désinscrire — la seconde
  branche rendait une registration **arbitraire** de l'origine. `applyUpdate`
  naviguait alors vers `bustedUrl(portée d'une autre app)`. Le test rend
  littéralement `https://exemple.test/miss-carbook/?_t=…` depuis une page de
  miss-dice. Ne rien trouver rend maintenant `''`, et on reste chez soi.

  **2. On désinscrivait toute l'origine.** « Désinscrit tous les service
  workers » voulait dire _ceux des seize apps_. Réinitialiser miss-dice emportait
  la capacité hors ligne des quinze autres, en silence — et c'est ce qui produit
  ensuite la situation du point 1 chez la voisine. Seules les registrations qui
  couvrent la page courante sont désinscrites.

  **3. On effaçait le précache des voisines.** Workbox nomme ses caches
  `workbox-precache-v2-<portée>` et sa propre routine de nettoyage filtre sur
  `self.registration.scope` ; ce module ne le faisait pas. Tout cache dont le nom
  porte la portée d'une voisine est désormais épargné.

  **Le doute profite à la désinscription.** Une portée illisible ne prouve pas
  qu'on a affaire à une autre app, seulement qu'on ne sait pas — on n'épargne que
  ce qu'on peut prouver étranger. Laisser en place un worker qu'on n'a pas su
  lire rendrait au bouton le défaut qu'il existe pour corriger.

  Aucun changement d'API. Cinq tests neufs, quatre garanties vérifiées par
  mutation.

## 3.30.0

### Minor Changes

- 80b9172: `migrate-consumers` — l'outil qui écrit dans les dix-sept dépôts faisait deux
  choses qu'on ne lui demandait pas.

  **Il proposait de modifier un miroir.** `mister-family-map` est publié à la main
  depuis `elowner-ax/bac-sable` ; une PR y est interdite. L'auto-découverte le
  trouvait pourtant, puisqu'il déclare bien le paquet — et lancé avec `--write`,
  le script y écrivait une modification qu'un `npm run mirror` suivant aurait
  **écrasée en silence**, donc sans que personne ne la voie jamais.

  **Il alignait les peerDependencies sans qu'on le demande.** Anodin tant que le
  parc est homogène — il ne l'est pas. Sur `mister-quota`, seule app Electron et
  restée en arrière, « aligner le plancher du socle » proposait **cinq montées
  majeures** : React 18→19, Vite 5→8, TypeScript 5→6, Vitest 2→4, ESLint 8→9.
  Une migration de cadre complète, dans le même geste, et sans la nommer. C'est
  désormais `--peers`, un drapeau explicite.

  Les deux défauts ont la même forme : un outil qui fait PLUS que demandé, dans
  un geste qu'on croit sûr.

  La décision passe dans `scripts/migrate-plan.mjs` — le script est un outil dont
  le point d'entrée balaie les dossiers frères dès qu'on le charge, ce qu'il
  décide est de la donnée. Même séparation que `adoption-equivalents.mjs`, et
  c'est ce qui rend les deux gardes testables : elles sont vérifiées par mutation.

  ***

  **Note sur le numéro de version.** Ce changement porte sur de l'outillage de
  développement, absent de `files` et donc non publié : `patch` aurait suffi.
  Le `minor` est un choix délibéré, pour marquer que le comportement PAR DÉFAUT
  de `migrate-consumers` change — les `peerDependencies` ne suivent plus sans
  qu'on le demande. Quiconque relançait ce script en confiance doit le savoir.

### Patch Changes

- e603b97: La clé `'mc-theme'` revient dans la liste des clés de thème : elle était
  **valide**, et la correction de la 3.29.0 l'avait retirée à tort.

  `'mc-theme'` (tiret) est la clé de `miss-carbook` depuis avril 2026
  (`const KEY = 'mc-theme'`), et elle figure encore dans son `legacyKeys`.
  `'mc_theme'` (souligné) est celle de `miss-contraction`. **Deux apps, deux clés
  qui ne diffèrent que d'un caractère** — la première a été prise pour une
  coquille de la seconde.

  La liste en compte donc neuf, pas huit.

  L'erreur mérite d'être gardée parce qu'elle n'a pas la forme qu'on croyait. Le
  premier passage avait recopié une valeur sans la vérifier ; le second l'a
  « corrigée » sans la vérifier non plus, sur la foi d'un rapport de migration, et
  a supprimé une donnée juste. **Une valeur mesurée ne se corrige qu'en relisant
  la source.**

## 3.29.0

### Minor Changes

- e5e6964: **`vitest-setup` ne mocke plus `virtual:pwa-register` du tout.** La 3.28.0 avait
  rendu ce mock conditionnel — il tentait le module réel avant de retomber sur un
  stub muet — ce qui suffisait à débloquer les apps mais laissait la cause en
  place. Le repli n'était pas seulement inutile : il était **inatteignable**.

  Un `vi.mock` agit à l'exécution ; un module source qui écrit
  `import { registerSW } from 'virtual:pwa-register'` est refusé bien avant, à la
  **transformation** (`Failed to resolve import "virtual:pwa-register"`), ce
  module virtuel n'existant que dans un build servi par vite-plugin-pwa. Pour que
  la fabrique du mock soit seulement appelée, il faut donc que le spécificateur se
  résolve — c'est-à-dire qu'un `resolve.alias` le désigne — et dans ce cas
  `importOriginal()` réussit toujours. La branche muette ne pouvait s'exécuter que
  si le double lui-même levait à l'évaluation, où elle aurait **masqué** l'erreur.

  Ce qu'il faisait, en revanche, était réel : une fois `pwaRegisterAlias` posé, le
  spécificateur désigne le FICHIER `testing/pwa-register`, et le mock l'écrasait
  (`No "swStub" export is defined on the "virtual:pwa-register" mock`). Suivre la
  documentation rendait la fonctionnalité documentée inutilisable, et l'app
  retombait sur le faux témoin muet que ce double existe pour supprimer. Relevé
  par `mister-molkky` (#18), `miss-badminton` (#19) et `miss-dice` (#9), qui ont
  tous dû écrire un `vi.unmock('virtual:pwa-register')` en tête de chaque fichier
  de test. **Ce contournement peut être supprimé.**

  **Rien ne régresse dans le parc**, et c'est vérifié plutôt que supposé.
  Quinze des dix-sept apps posent l'alias : pour elles le mock n'était déjà plus
  qu'un passe-plat. Les deux autres ne peuvent pas en dépendre — `miss-lookhouse`
  n'importe jamais le module virtuel, et le seul importateur de `miss-contraction`
  (`src/main.tsx`) n'est atteint par aucun test. Une épreuve sous Vitest 4 donne
  les quatre cases : **avec** alias, les tests passent avec comme sans le mock
  (liaison vivante de `registerSW` comprise, donc `swStub.reset()` continue de
  renouveler l'identité) ; **sans** alias, ils échouent à la résolution dans les
  deux cas, avec le même message.

  `virtual:pwa-register/react` garde son mock : `pwaRegisterAlias` le capte aussi
  (les alias Vite s'appliquent par préfixe) mais le mène à un chemin inexistant,
  donc il n'écrase rien. C'est exactement la règle que verrouille le nouveau test
  de `test/pwa-register-stub.test.mjs` — non pas « pas de mock », mais « aucun
  mock dont l'alias fasse un fichier QUI EXISTE ». Il relève les appels réellement
  enregistrés en chargeant `vitest-setup` avec un faux `vitest`, plutôt que de
  relire le source, et il échoue bien dès qu'on remet l'ancien mock.

### Patch Changes

- 7a3cc22: `Button` et `useActionGuard` composent enfin.

  `useActionGuard` rend `disabledProps: { 'aria-disabled': true }` — c'est le
  motif que son en-tête documente. `ButtonProps` **retirait** `aria-disabled` de
  son type, au motif que `loading` le pose. Les deux modules du paquet ne
  composaient donc pas, et `mister-doc` (#45) a dû retomber sur `disabled` natif,
  qui retire le bouton du parcours clavier et empêche donc de **découvrir** le
  motif du blocage — exactement ce que le hook existe pour éviter.

  Pire, l'habillage suivait la même faille : `components.css` ne stylait que
  `:disabled`. Un bouton gardé avait donc **l'air actif tout en étant inerte**,
  le pire des deux mondes. C'est ce qui a fait retomber `bac-sable` (#23) sur
  `disabled` natif à son tour.

  Les deux raisons de bloquer se cumulent maintenant : le clic est neutralisé
  dans les deux cas, le focus est conservé dans les deux cas, et les deux sont
  habillées pareil — y compris dans le bloc de contraste forcé, où l'opacité ne
  signifie rien et où `GrayText` est le signal attendu.

- 90e9d3c: La liste des clés de thème de la famille était **fausse**, et c'est celle qu'on
  recopie dans `legacyKeys`.

  `theme-boot` et `react/use-theme` annonçaient tous deux `'mc-theme'` avec un
  **tiret**, là où `miss-contraction` écrit `'mc_theme'` avec un **souligné**. Une
  migration qui s'y serait fiée aurait posé un `legacyKeys` inopérant et perdu la
  préférence de chaque utilisatrice — exactement le bug que ces deux paragraphes
  existent pour empêcher.

  Il manquait aussi `'mb_theme'` et `'mm_theme'` : la mesure annonçait six clés,
  il y en a **huit**.

  Relevé en migrant `miss-contraction` (#26), qui a lu son propre code plutôt que
  la liste. Une liste de valeurs mesurées se revérifie quand on s'en sert : c'est
  de la donnée, pas de la prose.

- 5d1675d: Deux défauts que l'adoption du hors-connexion par trois apps a fait tomber le
  même jour.

  **`useActionGuard` gardait un motif figé.** Sa mémoïsation porte sur une
  signature du contenu de `checks` — parce qu'ils arrivent en littéral, donc avec
  une identité neuve à chaque rendu. Mais cette signature ne retenait que
  `[code, blocked]` : **`message` en était absent**. Une app dont les motifs
  suivent la langue sans passer par `LabelsProvider` gardait donc le texte de la
  langue précédente, indéfiniment — même `code`, même `blocked`, donc aucun
  recalcul.

  `mister-qowa`, `mister-molkky` et `mister-puzzle` l'ont contourné le même jour,
  deux d'entre elles en recalculant le motif hors du hook. Un contournement que
  trois apps trouvent séparément est un défaut du paquet, pas une particularité
  de chacune. Le test le reproduit **au re-rendu du même composant** : un montage
  neuf repart avec une mémoïsation vide et ne prouverait rien.

  **`ConnectionBanner` désalignait une icône.** `components.css` le posait en
  `display: block` avec `text-align: center`. Or son `label` accepte un nœud
  React, et la copie dont il est promu y passait une icône **suivie** d'un texte :
  l'icône se posait sur la ligne de base, et l'app devait remettre un
  `flex items-center justify-center gap-2` par-dessus. Il est désormais centré en
  `flex` — pour un enfant textuel unique, le cas de toutes les autres apps, le
  rendu est identique.

- ecd0d1d: `web-vitals` — l'en-tête affirmait une panne qui n'existait pas, et cette
  affirmation servait de justification d'adoption.

  Il écrivait qu'`onFID` avait été « RETIRÉ en v4.0 », que l'appel levait un
  `TypeError: onFID is not a function`, et que les quatre apps concernées
  « croient mesurer cinq métriques, en mesurent UNE ».

  **C'est faux.** `onFID` a été **déprécié** en v4 et retiré en **v5.0.0** ; les
  quatre verrous résolvent `web-vitals@4.2.4`, qui l'exporte toujours. Vérifié
  deux fois en migrant `mister-cim10` (#29) — `typeof onFID === 'function'` sous
  Node, et en rejouant la séquence exacte dans un navigateur :
  `registered: ['CLS','FID','FCP','LCP','TTFB']`, `threw: null`.

  **Le vrai défaut était ailleurs**, et il ne se voyait pas dans les imports. Le
  `getRating` de ces copies porte un `case 'CLS'` puis un `default: return 'good'`
  : **quatre métriques sur cinq étaient notées « bonnes » quelle que soit leur
  valeur**, un LCP à dix secondes compris. Une mesure fausse coûte plus qu'une
  mesure absente, parce qu'on s'y fie.

  Le remplacement `onFID` → `onINP` reste juste — FID est sortie des Core Web
  Vitals en mars 2024, et ces copies ne relevaient jamais INP. C'est son motif qui
  était faux. `CAMPAGNE.md` et la table des exports du README sont corrigés en
  conséquence : l'erreur y avait été recopiée.

## 3.28.0

### Minor Changes

- 73aae28: Deux défauts que la migration `sw-update` de six apps a fait tomber. Tous deux
  rendaient MUET quelque chose qui devait parler.

  **Le mode `autoUpdate` n'avait aucune histoire — trois apps sur dix-sept y
  sont.** `vite-plugin-pwa` se coupe en deux sur `registerType` : la branche
  `prompt` est le **seul** appelant d'`onNeedRefresh`, la branche `auto` n'appelle
  qu'`onNeedReload`. `connect()` ne passait pas ce dernier, si bien qu'en
  `autoUpdate` le bandeau du paquet ne pouvait **jamais** s'allumer : une app qui
  adoptait `UpdatePromptBanner` y posait un composant invisible.

  Le fournir change en outre ce que fait le plugin — sa documentation dit « useful
  to fully control the reload flow » : sans rappel il recharge seul, avec il rend
  la main. C'est le seul moyen de différer un rechargement qui tomberait au
  mauvais moment ; `miss-contraction`, qu'on utilise pendant un accouchement, est
  exactement dans ce cas. Le relais reste **optionnel** (`?.`), sans quoi le
  simple fait de passer par ce paquet désactiverait le rechargement automatique
  pour tout le monde — c'est ce que le second test verrouille.

  **Le double de test muet écrasait le pilotable.** `vitest-setup` posait un
  `vi.mock('virtual:pwa-register')` inconditionnel, résolu **à travers** le
  `resolve.alias` que la documentation de `testing/pwa-register` prescrit : les
  deux désignaient le même module, et le muet gagnait. Une app qui suivait la doc
  à la lettre obtenait donc `No "swStub" export is defined on the
"virtual:pwa-register" mock`, puis retombait sur le faux témoin que ce double
  existe pour supprimer. Relevé par `mister-molkky` (#18), qui a dû ajouter un
  `vi.unmock` dans chaque fichier de test.

  La fabrique tente désormais le module réel d'abord : s'il se résout, c'est qu'un
  alias le désigne et on le rend tel quel ; sinon on retombe sur le muet, qui
  reste le bon défaut pour une app qui ne teste pas son bandeau. **Vérifié de bout
  en bout** sur la suite de `mister-molkky` — ses quatre tests passent sans le
  `vi.unmock`, et échouent sur le message d'origine dès qu'on remet l'ancienne
  version.

### Patch Changes

- 601a20c: Deux choses que ce paquet affirmait et que `vite-plugin-pwa` contredit. Les
  deux ont été trouvées en migrant, pas en relisant.

  **`onRegistered` était mort, et silencieusement.** Le plugin écrit
  `if (onRegisteredSW) onRegisteredSW(…); else onRegistered?.(…)` — or `connect()`
  lui passait **toujours** un `onRegisteredSW`. Le rappel déprécié n'avait donc
  aucune chance d'être appelé, et le relais ajouté pour lui ne servait à rien :
  une app qui migrait son `onRegistered` vers ce hook perdait sa journalisation
  d'enregistrement sans un mot. La règle du plugin est désormais reproduite un
  cran plus haut — le moderne s'il est fourni, l'ancien sinon, jamais les deux.
  Vérifié par mutation.

  **Le motif `registerSW={import.meta.env.PROD ? registerSW : undefined}` ne
  protège de rien, et le README ne le recommande plus.** En développement,
  `vite-plugin-pwa` sert déjà un patron **entièrement inerte**
  (`dist/client/dev/register.js` : `registerSW()` rend une fonction asynchrone
  vide, rien n'est enregistré), sauf si l'app active `devOptions` — ce qu'aucune
  app du parc ne fait.

  Et il nuit : **Vitest pose `PROD` à faux**, donc le câblage réel devient
  intestable. Deux apps ont dû intercaler un composant qui reprend `registerSW`
  en prop pour contourner un garde superflu. La page dit maintenant de ne pas le
  poser, et pourquoi.

## 3.27.0

### Minor Changes

- 5e4a628: `update-prompt-banner` / `vitest-base` — la seconde sortie, le « prêt hors
  ligne », et l'alias que dix dépôts recopiaient.

  Une relecture des trois adoptions du bandeau (miss-carbook #17, miss-genius #14,
  mister-puzzle #16) a listé cinq manques. **Deux étaient déjà comblés** par la
  vague précédente et ne sont rappelés ici que pour clore le compte : `snoozeKey`
  est une prop du bandeau et d'`AppUpdates` depuis la 3.26.0 (#95), et `title`
  accepte un `ReactNode` depuis la même version (#99) — l'icône Sparkles que
  miss-genius avait perdue est donc reposable sans rien attendre. Restaient trois
  manques réels.

  **1. UNE SEULE SORTIE.** `mister-puzzle` offrait « Plus tard (24 h) », persistée,
  ET « Ignorer », le temps de la session. Le bandeau n'en rendait qu'une, et la
  migration a fait disparaître la seconde : `secondaryActions="both"` la rend.

  Le bouton historique NE BOUGE PAS. `[data-dwc="update-banner-dismiss"]` désigne
  toujours le même bouton, à la même place, avec la même action ; `'both'` ne fait
  qu'ajouter le suivant sous `[data-dwc="update-banner-ignore"]`. Deux apps
  habillent ce sélecteur dans leur CSS (miss-carbook, miss-genius) : opter pour
  deux sorties ne leur décoiffe rien. Sans report à offrir (`snoozeHours` à 0),
  `'both'` se comporte exactement comme `'auto'` — deux boutons qui écartent tous
  deux pour la session ne diraient rien de plus.

  Un libellé était nécessaire : `update.snooze` et `update.dismiss` valent TOUS
  DEUX « Plus tard » (« Later » en anglais). Chacun est juste tant qu'il est seul à
  l'écran ; côte à côte, ils ne diraient plus lequel persiste. D'où `update.ignore`
  (« Ignorer » / « Dismiss »), ajouté **sans toucher** aux deux autres : aucune app
  existante ne change d'affichage.

  **2. RIEN NE RENDAIT `offlineReady`.** Le hook l'expose depuis toujours ;
  `miss-genius` gardait pour ça un `OfflineReadyNotice` à elle. `showOfflineReady`
  le fait rendre par le bandeau, avec la précédence que cette app avait écrite :
  tant qu'une version attend, le message hors ligne se tait — y compris une fois le
  bandeau de mise à jour écarté, sans quoi l'écartement ferait surgir l'autre.

  Le relevé du 31/08/2026 dit qu'UNE SEULE app du parc affiche ce message ; les
  cinq autres qui touchent `offlineReady` ont un `onOfflineReady() {}` vide ou un
  `console.log`. La 3.26.0 avait refusé le composant pour cette raison. Ce qui
  change l'arbitrage, ce n'est pas le décompte — c'est la forme retenue : une prop
  sur le bandeau existant, sans nouveau composant ni nouveau fichier, dont le coût
  est nul pour les seize apps qui ne la posent pas.

  L'interrupteur ne s'appelle pas `offlineReady` : l'état du hook porte déjà ce nom
  sur les mêmes props, et l'écraserait à chaque rendu.

  **3. LE STUB ÉTAIT PUBLIÉ, PAS L'ALIAS.** `testing/pwa-register` existe depuis la
  3.26.0, mais le poser demandait encore de recopier un
  `fileURLToPath(import.meta.resolve(…))` — et cette forme-là fait résoudre un
  sous-chemin d'export depuis le `vitest.config.ts` de l'app, ce qui échoue sous un
  gestionnaire de paquets qui n'aplatit pas `node_modules` et sous les runtimes où
  `import.meta.resolve` est asynchrone. `vitest-base` exporte désormais
  `pwaRegisterAlias`, qui résout depuis le paquet :

  ```ts
  resolve: { alias: { ...pwaRegisterAlias } }
  ```

  Vérifié dans les deux sens sur une app jetable, paquet installé depuis son
  tarball : avec l'alias, un module source qui écrit
  `import { registerSW } from 'virtual:pwa-register'` se monte et le bandeau
  s'affiche ; sans lui, et malgré le `vi.mock` de `vitest-setup`, le test meurt sur
  `Failed to resolve import "virtual:pwa-register"`. Ce piège est maintenant décrit
  en tête de `vitest-setup` — là où on le rencontre, et non dans un chapitre plus
  loin.

  Deux pièges documentés au passage : l'alias va dans `vitest.config.ts` et JAMAIS
  dans `vite.config.ts` (le build servirait le double aux navigateurs, et l'app
  n'enregistrerait plus aucun service worker) ; et `virtual:pwa-register/react`
  n'est pas couvert alors que l'entrée le capte quand même, les alias Vite
  s'appliquant par préfixe. Aucune app du parc ne l'importe.

- 655f7d7: `format` — la devise liée à `createFormatters` survit enfin aux options.

  **Le défaut.** `formatCurrency` reconnaît des options à la place de la devise
  depuis #100. `createFormatters(…).currency` les lui transmettait telles quelles,
  donc à cette place — et `formatCurrency` retombait alors sur son propre défaut,
  `'EUR'`, sans jamais voir la devise que la fabrique avait liée :

  ```js
  const fmt = createFormatters('fr-FR', { currency: 'USD' });
  fmt.currency(1234); // « 1 234,00 $US »
  fmt.currency(1234, { maximumFractionDigits: 0 }); // « 1 234 € »  ← USD perdu
  ```

  Un montant en dollars s'affichait EN EUROS. Aucune erreur, aucun avertissement,
  le symbole ment simplement sur le montant — c'est très exactement le défaut que
  ce module reproche aux copies qu'il remplace, et le seul de la famille où le
  silence produit une valeur fausse plutôt qu'un format inchangé.

  Les options sont désormais reconnues à cette place, puis réappliquées PAR-DESSUS
  la devise liée. `{ currency: … }` passé dans les options l'emporte toujours,
  comme partout ailleurs dans le module.

  **`currency()` gagne une 3ᵉ place.** `fmt.currency(1234, 'GBP', { … })` : un
  code explicite ET des options. La forme était ignorée en silence, faute d'être
  transmise.

  **Ce que le `.d.ts` taisait.** La signature annonçait `code?: string`, si bien
  que la forme qui marchait déjà au runtime était refusée à la compilation
  (`TS2345`). Elle accepte maintenant les deux places, et la prose de
  `formatCurrency` mentionne enfin sa 4ᵉ position — locale et devise nommées,
  options par-dessus — que seule la signature laissait deviner et qu'aucun test ne
  couvrait.

  Correctif vérifié par mutation : rétablir la transmission directe fait tomber le
  test qui nomme la devise liée.

### Patch Changes

- 52ab159: `similarity` — l'en-tête dit désormais qu'une de ses deux provenances ne pourra
  jamais l'importer.

  Le cœur métier de `miss-lookhouse` (`src/domain/`, dont son anti-doublons) est
  **recopié vers des Supabase Edge Functions** par un script de build. Ce code
  tourne donc aussi sous Deno, qui ne sait pas résoudre un paquet publié sur un
  registre privé — la limite déjà constatée chez `mister-doc`, mais qui porte ici
  sur **tout un dossier** : `scoring`, `similarity`, `clustering`, `priceHistory`,
  `normalize`, `text` et `imageHash` sont dans le même cas.

  Le corollaire mérite d'être écrit plutôt que redécouvert : un module tiré d'un
  code qui franchit la frontière Deno est un module que son donneur ne récupérera
  pas. Ça ne l'invalide pas — l'autre provenance l'importe — mais ça se sait
  d'avance, et ça évite d'inscrire une app dans un lot d'adoption qu'elle ne peut
  pas tenir.

- 04b4639: `image` — décoder n'est pas accepter, et c'est enfin écrit.

  **L'écart.** `compressImageToMaxBytes` documente le GIF (« les GIF animés
  deviennent une image fixe ») pendant que `IMAGE_ACCEPTED_TYPES`, dans le MÊME
  fichier, le refuse. L'adoption de `miss-carbook` (#16) l'a relevé : le module
  sait traiter un format que son propre validateur rejette par défaut.

  **L'arbitrage : le défaut ne bouge pas.** Élargir la liste ici la changerait pour
  tout le monde. `bac-sable` appelle `validateImageFile(file)` **sans option**,
  sous un `accept="image/jpeg,image/png,image/webp"` et un message qui annonce
  « Formats acceptés : JPEG, PNG, WebP » — un défaut plus permissif lui ferait
  accepter en silence ce que son propre écran refuse, et la régression partirait
  telle quelle vers le miroir public `mister-family-map`. `mister-puzzle`, lui,
  liste déjà `'image/gif'` explicitement : le défaut élargi ne lui apporterait
  qu'un doublon. Une régression réelle contre zéro gain.

  Ce qui manquait n'était donc pas la permission, c'était la RAISON. Elle est
  maintenant dans l'en-tête de `image.js`, dans `image.d.ts` — la surface que les
  trois apps TypeScript lisent réellement dans leur éditeur, et qui ne disait rien
  — et dans un test qui empêche qu'on « corrige » l'incohérence en déplaçant le
  défaut.

  **Un correctif au passage.** Le message d'échec de lecture disait « Essayez un
  autre fichier (JPEG, PNG, WebP ou GIF) » : il PROMETTAIT à l'utilisateur final un
  format que le défaut de ce module refuse, et qu'une app comme `bac-sable` refuse
  à l'écran. Ce module ne connaît pas la liste de son appelant ; il ne nomme plus
  que le plancher, que toute app accepte par construction — « Essayez une photo
  JPEG ou PNG. »

## 3.26.0

### Minor Changes

- 418a9e2: `format` — les options passées à la place de la locale ne sont plus avalées.

  **Le piège.** Huit fonctions ont la forme `(valeur, locale, options)`, mais
  `formatNumber(1234, { maximumFractionDigits: 0 })` est le réflexe naturel — et
  c'était un appel **silencieux** : `Intl` accepte n'importe quoi comme `locales`
  sans lever, l'objet passait pour une locale illisible, la locale par défaut
  reprenait la main, et **les options disparaissaient**. Aucune erreur, un format
  simplement inchangé, et un appelant convaincu d'avoir configuré quelque chose.

  Une locale est toujours une chaîne (ou un tableau de chaînes) : un objet à cette
  place ne peut être que des options. Elles sont désormais reconnues. Non ambigu,
  non cassant — la forme historique est verrouillée par un test, tableau de
  locales compris.

  **`formatCurrency` gagne des options.** Il n'en acceptait aucune : afficher un
  prix sans centimes était **impossible** sans réimplémenter la fonction. C'est ce
  que `miss-supaboss` demandait.

  **`dateStyle` et `timeStyle` remplacent les composantes** au lieu de s'y
  ajouter. `Intl` lève « Invalid option » quand ils côtoient `year`/`month`/`day`,
  que ce module posait par défaut : demander une date longue faisait donc échouer
  l'appel. Une migration l'avait rapporté comme « ça lève une TypeError » — le
  diagnostic était juste, la cause était ailleurs.

  Les deux correctifs sont vérifiés par mutation : retirer la reconnaissance ou
  l'exclusion fait tomber le test qui la nomme.

- e87fba6: Les manques que la vague des bandeaux de mise à jour a nommés. Huit apps ont
  migré vers `react/update-prompt-banner` le 30/08/2026 ; chacune a laissé derrière
  elle une ligne qu'elle a dû écrire à la main. Quatre sont comblées, toutes
  promues d'un code déjà éprouvé dans les apps. La cinquième est refusée, et c'est
  écrit.

  **`testing/pwa-register` — le double de `virtual:pwa-register`, PILOTABLE.** Le
  plus gros doublon du parc : **douze dépôts** portent ce fichier écrit à la main,
  sous trois noms différents, plus les douze `resolve.alias` qui vont avec. Le
  `vi.mock` de `vitest-setup` ne suffit pas — il agit à l'exécution, quand Vite a
  déjà refusé de transformer le module importateur — et il faut donc un vrai
  fichier. Mais les douze copies sont **muettes** : un `registerSW` qui n'appelle
  jamais `onNeedRefresh` prouve qu'un composant se monte, jamais qu'un bandeau peut
  s'afficher. C'est par ce trou qu'une app a vécu des mois avec une bannière montée
  sans `registerSW`, donc structurellement incapable d'apparaître, et c'est
  pourquoi les huit tests de bannière écrits pendant la vague ont tous dû
  refabriquer un double pilotable par-dessus le double muet — de quatre façons
  différentes.

  Le double publié pilote (`swStub.needRefresh()`), et il **lève** quand personne
  n'a injecté `registerSW` : la panne silencieuse devient un message. Son
  `reset()` renouvelle l'**identité** de `registerSW`, faute de quoi la `WeakMap`
  de `useUpdatePrompt` — qui existe pour ne pas doubler les écouteurs sous
  `StrictMode` — garderait `needRefresh` d'un test au suivant. C'est le piège que
  huit migrations ont rencontré chacune de leur côté.

  **`unregisterServiceWorkers` — la désinscription de développement.** Cinq apps
  la portent dans leur `register-sw.ts`, avec les mêmes lignes : sans elle, un
  worker resté d'une session précédente sert du cache périmé pendant qu'on code.
  Trois défauts communs aux cinq copies sont corrigés. Leur `.catch()` ne couvre
  que `getRegistrations()`, pas les `unregister()` lancés dans le `forEach` : une
  seule désinscription qui échoue devient un **rejet non capté**, pendant le
  démarrage de l'app. Aucune ne plafonne cette `getRegistrations()`, la même qui
  peut bloquer plusieurs secondes sur iOS en mode autonome. Et aucune ne rend rien,
  donc rien ne s'observe. La CONDITION (`import.meta.env.DEV`) reste dans l'app :
  ce paquet est aussi lu par `node --test`, qui n'a pas `import.meta.env`.

  **Les rappels d'enregistrement ne sont plus avalés.** `connect()` ne transmettait
  que `immediate`, `onNeedRefresh` et `onOfflineReady` : `mister-doc` et
  `mister-qowa` ont dû enrober `registerSW` dans une constante de module pour
  récupérer, l'un sa journalisation d'échec — sans laquelle une panne
  d'enregistrement est indiscernable d'une app à jour — l'autre sa revérification
  horaire. `onRegisterError`, `onRegisteredSW` et `onRegistered` sont désormais des
  options de `useUpdatePrompt`, de `UpdatePromptBanner` et d'`AppUpdates`. Elles
  sont lues à travers une référence : une fonction écrite en ligne ne
  ré-enregistre rien.

  **`snoozeKey` devient une prop.** `mister-puzzle` a dû verser son report en cours
  dans la clé du socle au chargement de son module, sinon la migration oubliait
  tout report actif — et le bandeau revenait aussitôt chez qui avait justement
  demandé le silence.

  **Un défaut trouvé en chemin.** `AppUpdates` lisait `snoozeHours` pour calculer
  son état, mais ne le passait pas au bandeau : celui-ci retombait sur `0`, donc
  sur « écarter pour la session ». Le report que le fournisseur tenait n'était
  atteignable par **aucun clic**.

  **Ce qui est refusé : rien ne rend `offlineReady`.** Le hook l'expose, aucun
  composant ne l'affiche, et une seule app du parc montre ce message. Le socle
  promeut ce que plusieurs apps ont convergé à écrire ; ici il n'y a pas de
  convergence à recueillir, rien qu'une intention. Le motif est écrit dans
  l'en-tête d'`update-prompt-banner` : le jour où une deuxième app l'écrit, les
  deux copies diront ce qui doit être partagé.

  `react/update-prompt-banner` sort de `SANS_TEST_DIRECT` : il a maintenant ses
  tests. Six garanties sont vérifiées **par mutation** — retirer la ligne fait
  tomber le test qui la nomme.

- 162d914: Thème — deux défauts que trois adoptions ont fait tomber le même jour.

  **Le script anti-FOUC causait le FOUC.** Sans valeur stockée, `themeBootSource`
  résolvait **toujours** contre `prefers-color-scheme`, en ignorant le
  `defaultTheme` qu'on lui passait. Or `useTheme` le respecte, lui : une app
  déclarant `defaultTheme: 'light'` obtenait un premier rendu **sombre** (le
  système), puis un basculement en clair (React) — exactement le scintillement que
  ce script existe pour supprimer, causé par le script lui-même. Et seulement chez
  les utilisateurs dont le système contredit le défaut de l'app, donc jamais chez
  celui qui l'a écrit. `system` continue de se résoudre par le système : c'est ce
  que le mot veut dire, et c'est le défaut.

  **Le catalogue de palettes n'est plus embarqué de force.** `theme-provider.js`
  importait statiquement `themes.js` — 22 ko, dix-sept palettes — alors que les
  **quatre** apps du parc qui montent `ThemeProvider` ne passent **aucun `appId`**,
  pour lequel la résolution rendait `null`. +15,6 ko bruts mesurés sur
  `miss-carbook`, pour zéro variable peinte. La résolution par `appId` devient
  paresseuse, et une nouvelle prop **`palette`** permet de fournir la palette
  directement : synchrone, sans frame non peinte, et sans tirer les seize autres.

  Aucune rupture : `appId` continue de fonctionner, `palette` l'emporte quand les
  deux sont donnés. Cinq tests, dont un qui interdit le retour de l'import
  statique — la source est la seule façon d'observer un import, un module chargé
  ne distinguant plus le statique du paresseux résolu.

- 231f7e9: `title` accepte un nœud React, et la bannière d'installation ne peut plus
  nommer sa région `[object Object]`.

  **Deux migrations ont perdu une icône le même jour, pour la même raison** :
  `miss-genius` sur le bandeau de mise à jour (une icône Sparkles), `mister-doc`
  sur **six** dialogues. Les deux rapports contenaient la même phrase — « `title`
  est typé `string` ». Il s'élargit à `ReactNode` sur `Sheet`, `ConfirmDialog`,
  `EmptyState`, `ErrorBoundary`, `UpdatePromptBanner` et `PwaInstallPrompt`.

  **Et un piège que l'élargissement aurait ouvert en silence.** Le titre est rendu
  comme ENFANT partout — sauf dans `PwaInstallPrompt`, qui le passait AUSSI en
  `aria-label`. Un nœud React y aurait donné **`[object Object]` comme nom
  accessible** de la région, sans la moindre erreur de compilation. La bannière
  pointe désormais son titre rendu par `aria-labelledby`, ce qui marche pour les
  deux formes et garde le nom synchronisé avec ce qui est affiché.

  Vérifié par mutation : remettre `aria-label` fait tomber le test qui le nomme.
  Le test monte la bannière dans jsdom et émet `beforeinstallprompt`, faute de
  quoi le composant rend `null` — et des assertions d'absence sur une chaîne vide
  passeraient toutes en ne prouvant rien.

### Patch Changes

- 7cd2656: `react/bottom-nav` — l'en-tête disait faux sur une app, et taisait deux pièges
  d'adoption.

  **Le faux.** Il affirmait que « mister-puzzle a la même chose sous le nom
  `Navbar` ». Vérification faite en migrant : son `Navbar.tsx` est un **en-tête
  haut collant** — logo, progression, hamburger, menu de thème — et **ne porte
  aucune destination**. L'app n'a d'ailleurs aucun routeur : deux écrans, choisis
  par le hash de l'URL. `BottomNav` exige une liste statique de routes ; puzzle
  n'en a pas. L'affirmation venait d'une ressemblance de nom de fichier, jamais
  vérifiée, et elle a maintenu un dépôt sur une liste de migration pendant des
  semaines.

  Le relevé d'adoption portait la même erreur : `Navbar.tsx` est retiré de la
  table des équivalences, où il ne produisait que des faux positifs — un seul
  dépôt du parc porte ce nom, et c'est celui-là.

  **Les deux tacites**, chacun payé deux fois (mister-cim10, puis
  mister-footcoach) avant d'être écrit :
  - **brancher `Link`, pas `NavLink`** — `NavLink` redéclare son propre
    `aria-current` **après** l'étalement des props, ce qui donne deux sources de
    vérité pour l'état actif ; et `end` ne lui est pas transmis ;
  - **`currentPath` est obligatoire dès que le routeur a un `basename`** — le
    repli lit `window.location.pathname`, qui vaut `/mon-app/equipes` là où les
    `href` valent `/equipes` : **aucun onglet ne serait actif**, et seulement une
    fois déployé, jamais en développement.

- fc0593c: `components.css` — un même jeton ne porte plus deux replis différents.

  `--text-fluid-xs` retombait sur `0.8rem` à huit endroits et sur `0.75rem` sur
  les onglets de `BottomNav`. Sans conséquence pour les seize apps qui importent
  le preset — la variable y est définie — mais **une app qui ne le prend pas ne
  voit QUE les replis**, et obtenait donc deux tailles pour une seule intention.

  Le cas n'est pas théorique : `mister-quota`, en Electron sans Tailwind, vient de
  prendre la feuille seule. Sa migration a d'ailleurs montré que le motif
  d'abstention de cette app ne tenait pas — `components.css` ne contient ni
  `@apply`, ni `@tailwind`, ni `theme()`, et tous ses sélecteurs sont portés par
  `[data-dwc="…"]`, donc sans collision possible. Le README le dit maintenant, et
  précise que la feuille lit **huit variables de l'échelle fluide en plus des
  quinze jetons du contrat**, toutes avec repli.

  `test/components-css.test.mjs` garde la cohérence — sur les replis **scalaires**
  seulement. Les replis de couleur imbriquent `light-dark()`, `color-mix()` ou un
  second `var()` : les comparer demande un analyseur, pas une expression
  rationnelle, et une expression rationnelle qui les tronque comparerait des
  valeurs fausses. Un garde-fou étroit et exact vaut mieux qu'un large et menteur.

## 3.25.0

### Minor Changes

- c96ff88: `image` — le module est enfin testable, et deux défauts que trois adoptions ont
  mis au jour sont corrigés.

  **La même option, deux défauts différents.** `stripImageMetadata` lisait
  `IMAGE_MAX_DIMENSION` (2048) quand `compressImageToMaxBytes` codait `2560` en
  dur, sous le même nom d'option `maxDimension`. La divergence est désormais
  **intentionnelle et nommée** : `IMAGE_COMPRESS_START_DIMENSION` est exportée, et
  son en-tête dit pourquoi elle dépasse le plafond d'affichage — viser un budget
  d'octets autorise à partir plus haut, et l'unifier silencieusement à 2048
  dégraderait les photos de `miss-carbook`, dont la compression est promue ici. Un
  test empêche qu'on les « corrige » en les rapprochant.

  **Le DOM est isolé derrière deux coutures.** `render` et `encode` sont
  injectables, et la géométrie devient une fonction pure exportée, `fitWithin`.
  Ces fonctions n'avaient aucun test au-delà de leur partie pure — non par oubli,
  mais parce que `createImageBitmap` est absent de jsdom : simuler un canvas
  aurait donné des tests ne prouvant que leur propre bouchon. La décision — quelle
  taille, quelle qualité, quand s'arrêter — se vérifie maintenant sans lui, en
  18 tests. Le dessin reste hors de portée, et c'est écrit.

  `fitWithin` publie les trois garanties qui étaient jusqu'ici implicites : jamais
  d'agrandissement, plancher à 1 px sur chaque côté (une bande 1 × 5000 arrondit
  sa petite dimension à 0, et un canvas de largeur nulle fait échouer `toBlob`
  sans rien dire), rapport d'aspect conservé.

  `compressImageToMaxBytes` accepte en outre une horloge `now`, pour que le
  `lastModified` produit soit stable en test.

  **En-tête corrigé.** Il affirmait que la contribution de `mister-puzzle` était
  « couverte par les deux précédentes ». Sa migration (#15) a prouvé le
  contraire : sa sortie doit être une **chaîne** (Firebase RTDB ne stocke pas de
  binaire) et son budget se compte en **caractères de base64**, pas en octets. Le
  dernier maillon reste légitimement chez elle.

  Aucune rupture : les appels existants gardent leur comportement, les coutures
  sont facultatives.

### Patch Changes

- 4dfc23e: La table « Exports npm » du README documente enfin **les 137 sous-chemins
  publiés**, contre 62 auparavant. Les 75 manquants n'étaient pas des modules
  mineurs : `security`, `markdown`, `similarity`, `haptics`, `audio`, `speech`,
  `rate-limit`, `geocode-ban`, `image`, les trois transports `push/*`, sept hooks
  React promus d'apps de la famille et quatre composants d'interface — dont 22
  sans aucune mention ailleurs dans la page.

  C'est la leçon `sparkline` à l'échelle du tiers du paquet : ce module est resté
  inutilisé non parce qu'il manquait, mais parce qu'il était introuvable. Les
  relevés d'adoption comptaient donc des doublons pour du code que les apps ne
  pouvaient pas découvrir.

  `test/package-surface.test.mjs` empêche la dérive de revenir : publier un
  sous-chemin sans l'inscrire dans la table fait échouer `npm test`. Seule la
  présence de la ligne est vérifiée, pas son contenu.

  Le journal de campagne consigne par ailleurs ce que les quatre migrations
  `ical` ont appris — dont la **limite du paquet** : il ne franchit pas la
  frontière Deno, car GitHub Packages exige un jeton même en lecture et le
  constructeur distant de Supabase ne l'a pas. Pour du code qui tourne chez
  l'hébergeur, l'adoption utile est la référence écrite, pas l'import.

- 6469c21: `react/use-wake-lock` a enfin ses tests, et les angles morts de la suite
  deviennent des décisions déclarées.

  **Ce que la campagne a payé pour l'apprendre.** Le hook a été promu de deux
  apps, publié, et importé par personne pendant des semaines — sans qu'aucun test
  ne l'ouvre jamais. Quand trois apps l'ont adopté le 30/08/2026, l'une d'elles
  portait dans sa copie un défaut que le paquet corrigeait **sans le prouver** :
  pas d'écoute de `visibilitychange`, donc l'écran s'éteignait en pleine
  contraction après un simple aller-retour dans une autre app. Une autre laissait
  fuir une demande de verrou encore en vol au démontage.

  Le hook du paquet était juste sur les deux points ; rien ne garantissait qu'il
  le reste. Huit tests le garantissent maintenant — la ré-acquisition au retour au
  premier plan, le relâchement d'une demande arrivée après le démontage, le
  silence quand l'API manque ou refuse, et le fait qu'inactif il ne demande rien
  (c'est ce qui porte le réglage « garder l'écran allumé » des apps). Les deux
  garanties centrales sont vérifiées **par mutation** : retirer la ligne
  correspondante du hook fait tomber le test qui la nomme, et lui seul.

  **Onze modules n'étaient ouverts par aucun test.** `test/package-surface.test.mjs`
  les fait maintenant apparaître : chacun est inscrit dans une liste nommée avec
  sa raison — API absente de Node (Web Audio, DeviceMotion, caméra, gestes
  tactiles), enveloppe fine dont le socle est déjà testé, ou transport exigeant un
  SDK complet. Publier un nouveau module sans test force désormais à venir écrire
  la sienne. Un second test empêche l'inverse : une exemption qui survit au test
  qu'on a fini par écrire cacherait la suivante.

## 3.24.0

### Minor Changes

- 985418c: **`./ical`** — l'agenda que quatre apps avaient écrit chacune de son côté.

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

- 2af307c: Promotion de fonctionnalités issues des apps de la famille (P0/P1/P2).

  Nouveaux modules racine : `haptics` (API Vibration, patterns gradués),
  `audio` (synthèse WebAudio, presets sonores), `speech` (synthèse vocale),
  `image` (validation, suppression des métadonnées, compression sous budget),
  `rate-limit` (limiteur côté client, horloge injectable), `geocode-ban`
  (géocodage Base Adresse Nationale), `dates` (arithmétique pure, ISO local).

  Nouveaux sous-chemins React : `use-long-press`, `use-feedback` (son +
  vibration), `use-wake-lock`, `use-pull-to-refresh`, `use-keyboard-shortcuts`,
  `use-shake`, `use-async`, `use-undoable-state`, `segmented-control`,
  `connection-banner` (avec styles opt-in dans `components.css`).

  Extensions : `format` gagne `formatCount`, `formatUsage`, `formatDuration` ;
  `security` gagne `sanitizeUserText`, `sanitizeSingleLine`, `isSafeHttpUrl`
  (et `sanitizeInput` retire désormais les caractères de contrôle) ; `backend`
  gagne `classifyBackendError` ; `react/use-media-query` gagne
  `usePrefersHighContrast`.

- 01a8ca0: `/xlsx` : `buildXlsx` écrit plusieurs onglets, et l'en-tête du module cesse de
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

### Patch Changes

- f79f20f: Trois finitions relevées par la campagne d'adoption du 30 août. Chacune avait
  obligé une migration à poser un contournement chez elle.

  `components.css` réduisait le mouvement du seul `sheet-panel` sous
  `prefers-reduced-motion`, alors que `confirm-panel` et `toast` portent la même
  entrée `dwc-rise` : une alerte et un message surgissaient malgré le réglage
  système. mister-puzzle (#14) avait dû reposer la règle côté app.

  Le commentaire du mode mono-action de `ConfirmDialog` présentait le `flex: 1` du
  bouton unique comme le rendu que mister-puzzle et mister-cim10 dessinaient à la
  main. C'est faux pour mister-cim10, dont l'alerte était compacte et alignée à
  droite — sa migration (#27) a dû poser un écart local. Le commentaire dit
  désormais le vrai, et rappelle qu'une identité d'app se reprend en deux lignes
  de CSS non « layered ».

  Le `.d.ts` de l'écran de secours ne déclarait pas toutes les props réellement
  acceptées : miss-supaboss (#30) avait dû passer la référence de corrélation en
  spread commenté. Aucun changement de comportement, le type dit ce que le code
  fait déjà.

- eeba262: `realtime/supabase` : deux abonnements à la même table ne se marchent plus
  dessus, et une tentative qui échoue ne fuit plus un canal.

  Le transport nommait son canal `dwc:<schema>:<table>` — **sans le filtre**.
  Trois comportements de `@supabase/realtime-js` 2.107.0 se combinaient alors en
  un échec parfaitement muet : `RealtimeClient.channel(sujet)` REND le canal déjà
  enregistré sous ce sujet au lieu d'en créer un ; `RealtimeChannel.subscribe()`
  ne fait RIEN sur un canal qui n'est pas `closed` — pas d'erreur, pas de rappel ;
  et `removeChannel()` est asynchrone, si bien que le canal sortant reste
  enregistré, en état `leaving`, le temps de l'aller-retour serveur. Deux
  abonnements à la même table avec des filtres différents — un fil de
  commentaires par candidat et un journal par espace de travail, cas d'école —
  recevaient donc le même canal : le second y greffait ses écouteurs, son
  `subscribe()` ne faisait rien, la promesse de `connect()` ne se résolvait
  **jamais**, et l'écran restait muet sans qu'aucune erreur ne le dise. Le
  démontage-remontage de React dans un même commit produisait exactement le même
  silence.

  Le sujet porte maintenant le filtre — pour rester lisible dans une trace ou
  dans `getChannels()` — **et** un numéro monotone, interne au module, renouvelé
  à chaque tentative : la lisibilité et l'unicité sont deux besoins distincts, et
  deux abonnements rigoureusement identiques doivent coexister aussi.
  `channelName` remplace la part lisible sans figer le sujet, sans quoi un nom en
  dur réintroduirait la collision.

  Second défaut, même diagnostic : une tentative qui échouait **avant**
  `SUBSCRIBED` ne donnait aucune poignée de fermeture à l'appelant — il ne
  pouvait donc pas nettoyer, et le canal restait dans `client.channels` pour
  toujours, un de plus à chaque montage (deux par montage en développement).
  `CHANNEL_ERROR`, `TIMED_OUT`, une levée pendant l'abonnement, et désormais un
  `CLOSED` mort-né — qui laissait jusqu'ici la promesse en suspens pour toujours,
  sans erreur ni tentative suivante — retirent le canal du client avant de
  rejeter.

  Diagnostic établi pendant la migration de miss-carbook (mister-guiiug/miss-carbook#14),
  qui a dû contourner côté app : un client factice qui suffixait le sujet d'un
  compteur de module et gardait un `Set` de canaux orphelins à refermer au
  démontage. Ce contournement peut être retiré de `useRealtimeTable.ts` dès cette
  version publiée — le socle tient les deux garanties.

  En revanche, `catchUp` n'applique **toujours pas** le `filter` de l'abonnement,
  et ce n'est pas corrigé ici : le rattrapage interroge la table sur la seule
  colonne curseur, et réappliquer un filtre PostgREST demanderait d'en interpréter
  la grammaire (`eq`, `in`, `neq`…) pour un résultat qui resterait approximatif.
  La limite est en revanche écrite noir sur blanc — en-tête du module, `.d.ts` et
  README —, parce qu'elle est un piège de sécurité **fonctionnelle** : là où la
  RLS laisse passer plusieurs espaces, le rattrapage fait entrer des lignes d'un
  autre espace que celui écouté, sans erreur, et seulement au retour d'une veille.

  Les tests posent un client Supabase factice fidèle aux trois comportements
  ci-dessus — un faux complaisant validerait le bogue au lieu de le montrer.
  Six d'entre eux échouaient sur le code précédent.

## 3.23.0

### Minor Changes

- 55bc947: `ConfirmDialog` : mode mono-action pour les alertes — `cancelLabel={null}`
  (et non `undefined`, qui garde le repli « Annuler ») retire le bouton
  Annuler. Le rôle `alertdialog` est conservé, le focus initial va sur
  l'action unique, Échap et le voile valent un « OK » (`onConfirm`, garde
  `loading` comprise), et le libellé par défaut devient « OK »
  (`labels.confirm.ok`, surchargeable). `onCancel` devient optionnel ; en
  deux-actions, rien ne change. Sous `components.css`, le bouton unique prend
  toute la rangée (`:only-child`, aucun nouveau jeton).

  Besoin remonté par trois apps pendant la campagne `components.css`, qui
  n'avaient pas pu migrer leurs boîtes d'alerte face aux deux boutons
  inconditionnels : l'`ErrorModal` de mister-puzzle, le mode « alert » du
  `DialogProvider` de mister-cim10, et la boîte d'erreur de miss-carbook.
  Les détails techniques dépliables de miss-carbook (+ bouton copier) restent
  applicatifs : les passer en `children`.

- 672a77e: `/pdf` : l'encodeur honore vraiment le WinAnsi que la fonte déclare. Le
  texte passait en Latin-1 : tout point de code > 0xFF devenait « ? » — y
  compris €, ’, “ ”, —, –, …, œ, ™, que CP1252 place pourtant sur les
  positions 0x80–0x9F. Une table de transcodage Unicode → CP1252 couvre ces
  27 caractères ; le reste (émoji, grec…) devient toujours « ? », et une
  paire de substitution n'en produit qu'un seul.

### Patch Changes

- 4a2469f: `Sheet` et `ConfirmDialog` : le clic sur le voile ferme vraiment. Les deux
  composants écoutaient le clic sur la racine avec une garde
  `target === currentTarget`, mais le voile (`sheet-backdrop` /
  `confirm-backdrop`) est un enfant qui recouvre toute la racine (`inset: 0`
  dans `components.css`) : en navigateur, c'est LUI la cible du clic, la garde
  échouait, et rien ne se fermait jamais. Invisible en jsdom — pas de
  hit-testing, les tests dispatchaient sur la racine — le bug a été mesuré en
  vrai navigateur par deux apps pendant la campagne `components.css`
  (mister-footcoach#25, mister-molkky#14). Le gestionnaire accepte désormais
  deux cibles, la racine OU le voile : les apps qui ont posé la rustine
  `[data-dwc='sheet-backdrop'] { pointer-events: none; }` — chez elles le clic
  traverse et atterrit sur la racine — ferment toujours, et pourront retirer
  la rustine. Un clic dans le panneau ne ferme toujours pas ; la garde
  `loading` du `ConfirmDialog` (deux-actions comme mono-action) est inchangée.

## 3.22.0

### Minor Changes

- 4234789: Appairage : codes courts + QR, promus de mister-qowa, mister-molkky et
  miss-ticket-pwa. `/pairing` (pur) : alphabets nommés (`numeric`,
  `crockford32` avec correction des confusions, `antiConfusion`),
  `generateCode` (aléa crypto injectable, tirage par rejet sans biais),
  `normalizeCode` (les confusions ne sortent plus de l'alphabet), et
  `buildDeepLink`/`parseDeepLink` pour les liens `schéma:action?clé=valeur`.
  `/qr` : `qrToDataUrl`/`qrToSvg` par la peer optionnelle `qrcode`, chargée
  paresseusement, erreur explicite si elle manque.
  `/react/use-qr-scanner` : le cycle de vie caméra de la peer optionnelle
  `qr-scanner` — câblage dans un effet, arrêt et destruction garantis.
- de552ba: Authentification : le port `auth/` et ses adaptateurs, promus de cinq implémentations Supabase Auth indépendantes — mister-doc (la référence MFA : assurance aal1/aal2, enrôlement TOTP, erreurs traduites), miss-uwh (needsMfa + purge locale à la déconnexion), miss-lookhouse et miss-carbook (le même câblage getSession/onAuthStateChange recopié, drapeaux de montage contre la réponse périmée), mister-molkky (session anonyme avec repli silencieux quand le projet la désactive), et l'adaptateur local de bac-sable qui prouve le contrat en quatre méthodes.
  - `auth/` : machine d'état de session (`loading` → `signed-out` | `signed-in` | `needs-mfa`), hydratations numérotées (une réponse périmée ne s'applique jamais), lecture MFA best-effort (l'échec hors-ligne ne verrouille pas), aucune notion de rôle métier (voir `react/use-action-guard`).
  - `auth/supabase` : adaptateur v2 à client injecté (peer optionnelle) — mot de passe, lien magique/OTP, inscription avec `needsConfirmation`, anonyme avec le repli de molkky, erreurs rendues `{ code, message }`.
  - `auth/mfa` : TOTP fidèle à `mister-doc/backend/mfa.ts` — enrôlement (qr_code/secret/uri tels que Supabase les donne, nettoyage des facteurs abandonnés), défi, facteurs. Pas de codes de récupération : ceux de doc sont des RPC applicatives, pas une API Supabase.
  - `auth/errors-fr` : carte française des erreurs, fusion doc (sous-chaînes) + carbook (codes stables), repli configurable.
  - `react/use-auth` (useSyncExternalStore, sans Provider) et `react/auth-gate` (garde non stylée loading/fallback/mfa/children, avec le `bypass` du mode local : la sécurité réelle est la RLS).

- f9677c3: `components.css` : habiller les graphiques minuscules, et faire de la frontière d'erreur montée à la racine un vrai écran de secours.

  **`[data-dwc='sparkline' | 'bars' | 'gauge']`** — les composants de `/react/sparkline` rendent la géométrie, jamais la couleur : sans habillage, les barres (hauteur en %) et la jauge s'effondrent faute de boîte. L'habillage pose les dimensions par défaut, l'encre de marque via `currentColor` (recolorer = une règle `color` de l'app), et rend l'alternative textuelle de `describeSeries` lue-mais-pas-vue sans dépendre d'un utilitaire `sr-only` que l'app a pu purger. En contraste forcé, barres et jauge — qui n'existaient que par leurs aplats, comme le squelette — reçoivent l'encre système.

  **`[data-dwc='error-boundary']` à la racine** — trois apps (mister-footcoach, miss-carbook, mister-puzzle) recopient le même bloc, à l'octet près : l'écran blanc évité doit être un **écran** centré, pas une bannière perdue en haut de page. La règle `:where(#root) > …` reprend leurs choix (plein écran, centré, cadre et fond de danger retirés — pleine page, ils crieraient plus fort que le message) sans toucher au rendu de la frontière posée au milieu d'une page. La référence à citer au support (`error-boundary-reference`) est enfin habillée : discrète, et copiable d'un geste (`user-select: all`).

  Tout reste dans le contrat : `@layer components`, les quinze variables `--dwc-*` et rien d'autre, un repli sur chaque `var()` — les garde-fous de `test/components-css.test.mjs` en témoignent.

- 58ec7f9: `createI18n` : `storageKey` devient optionnel (défaut `'dwc_locale'`).

  Le constat vient de deux copies locales du module (mister-cim10, miss-ticket-pwa) : trois lignes d'écart, dont la seule réelle est la clé localStorage. Une clé obligatoire n'était donc pas une protection, c'était le dernier prétexte à copier.

  Le défaut suit la convention des clés du paquet (`dwc_theme`, `dwc_app_version`, `dwc_error_log`). Les apps de la famille partagent une même origine GitHub Pages, donc un même `localStorage` : sous la clé partagée, la langue choisie suit l'utilisateur d'une app à l'autre — et une valeur étrangère aux `locales` de l'app est ignorée, comme avant. Pour isoler une app, ou pour reprendre une copie locale **sans perdre le choix déjà stocké**, on passe sa clé (motif famille : `'<app>_locale'`) ; c'est documenté dans le type et le JSDoc.

  Aucune rupture : `storageKey` était requis par le type, les huit apps déjà sur le module le passent donc toutes explicitement, et le défaut ne joue qu'en son absence. Un test le verrouille : la clé par défaut est lue au démarrage et écrite au changement de langue.

- a679fbf: Exports PDF et Excel — promus de mister-doc, où ils tournent en production.

  **`./pdf`** — `mister-doc/src/lib/pdf.ts` fabriquait déjà un vrai binaire `application/pdf` sans bibliothèque : A4 portrait, Helvetica, repère haut-gauche comme à l'écran, et surtout une table `xref` dont les offsets sont relevés sur les octets réellement écrits — ce qui rend le fichier ouvrable par les lecteurs stricts, pas seulement les tolérants. Deux changements à la promotion : `downloadPdf` passe par `downloadBlob` (`./download`), et `buildPdf([])` rend une page vide au lieu de lever — le repli que les deux consommateurs d'origine recopiaient chacun.

  **`./xlsx`** — `mister-doc/src/lib/xlsx.ts` et ses tests : un vrai classeur Office Open XML (archive ZIP « stored », CRC32 calculé, parties XML minimales, date figée donc export déterministe), avec des cellules numériques réellement typées — donc sommables — et l'en-tête en gras. C'est le fichier que l'utilisateur demande quand il dit « en Excel », et que le CSV `excel-fr` ne remplace pas.

  Qui attend ces modules : miss-contraction pour l'export du suivi à présenter à la maternité, mister-cim10 pour ses relevés de codage, mister-footcoach pour l'export RGPD des données des joueuses, et miss-uwh — qui produit son bilan comptable en chargeant SheetJS par CDN, et pourra s'en passer.

- af36a2d: Persistance versionnée et IndexedDB : les deux moitiés du stockage local que le parc réécrivait.

  **`./versioned-store`** — PROMU des jumeaux `miss-uwh` et `miss-genius` (enveloppe versionnée + `runMigrations` indexé par version source + validation zod, copiés-collés à la virgule près), avec l'idée qui leur manquait, prise à `miss-badminton` : une copie de côté AVANT toute transformation. La règle du module est unique : version d'après, donnée invalide, JSON tronqué — l'original est copié sous `{clé}.backup-…` (clés déterministes, donc bornées) avant le repli sur le seed. C'est l'inverse exact du contre-exemple `miss-lookhouse`, où une version inconnue JETAIT les données. La validation est injectée (`schema.parse`) — le socle ne prend pas la dépendance zod ; les migrations ne transforment que la donnée, le magasin tient le compte des versions, et une migration réussie est persistée pour ne tourner qu'une fois. S'appuie sur `createStore` de `./storage`, se compose avec `./backup` (l'enveloppe et ses copies partent en valeurs brutes).

  **`./idb`** — PROMU de `mister-molkky` (les deux object-stores : `kv` pour les valeurs, `blobs` pour les avatars), `miss-badminton` (`onblocked` : une mise à niveau bloquée par un autre onglet se dégrade au lieu d'attendre pour toujours) et `mister-doc` (best-effort : toute erreur avalée, jamais bloquant) — le même wrapper réécrit CINQ fois. Même philosophie que `./storage` : lire rend le `fallback`, écrire rend `false`, rien ne lève jamais — y compris quand `open` LÈVE (navigation privée Firefox) ou qu'une valeur refuse le clonage structuré. `available()` éprouve une vraie ouverture, pas la présence de l'API ; les écritures attendent `transaction.oncomplete`, le commit qui promet la durabilité ; et le nom de base est l'isolation, comme le préfixe de `createStore` — seize apps partagent l'origine. Testé contre une implémentation réelle (`fake-indexeddb`), pas un mock du wrapper.

- d485571: Synchro : la fabrique de client Supabase, et la file d'écritures hors-ligne qui manquait au socle.

  **`./supabase-client`** — PROMU de **5 apps** (miss-uwh, miss-lookhouse, mister-molkky, mister-doc, bac-sable) qui réécrivent la même fabrique avec de petites divergences — et c'est dans les divergences que sont les défauts. La doctrine anti-écran-blanc d'abord : « l'init au chargement du module tuait l'app avant `createRoot()` », commentaire retrouvé **mot pour mot** dans miss-carbook et mister-puzzle, sur deux backends. Ici rien ne s'exécute à l'import : configuration jugée par `missingConfig` (`./backend`, `SUPABASE_ENV_KEYS` se passe tel quel à un `requires`), SDK (~120 Ko, peer optionnelle) importé dynamiquement au premier `getClient()` — c'est la **promesse** qui est gardée, deux appels concurrents ne créent qu'un client —, options `auth` passables (`persistSession`, `flowType: 'pkce'`…), et `fetch` corrélé optionnel via `./correlation` (le motif du bac-sable).

  **`./sync-queue`** — le chemin **montant**, absent du socle (`realtime/` ne couvre que la descente). PROMU de miss-uwh (la référence : file persistante, drain sérialisé, backoff + jitter, lettres mortes) ; la copie de miss-lookhouse, « inspirée du syncQueue de miss-uwh », avait **perdu le retrait exponentiel** en route — la preuve que ça devait monter au socle — et mister-puzzle montrait le même besoin côté Firebase : le module est agnostique, `process` injecté. Le `Store` (`./storage`) injecté est la source de vérité, relu à chaque tour ; retrait par identifiant, jamais `slice(1)` ; lettre morte au lieu d'une tête bloquante (`defaultShouldRetry` de `react/net` fait la politique) ; rejeu auto-programmé via `backoffDelay` de `./realtime` — réutilisé, pas dupliqué ; fusion par entité (`keyOf`) ; plafond visible (`enqueue` rend `null`).

  `react/use-offline-queue` reste la variante React ; son en-tête renvoie désormais vers `sync-queue` (comportement inchangé).

### Patch Changes

- ffa6da0: Déclarer les peers optionnelles que le code promettait déjà : `@sentry/react` et `firebase`.

  `react/observability.js` lazy-importe `@sentry/react` et se documente « peer optionnelle » depuis sa promotion ; `realtime/firebase.js` et `push/firebase.js` ouvrent sur « Peer OPTIONNEL : `firebase` ». Aucun des trois n'était déclaré dans `package.json` : un `npm ls`, un audit de graphe ou un outil de renouvellement ne pouvaient pas savoir que ces modules attendent quelque chose — ni dans quelle plage.

  `@sentry/react` entre en `>=8.0.0` (le module n'appelle que `init` et `captureException`, stables depuis longtemps ; les apps mesurées sont en `^8.45.0`) et `firebase` en `>=9.0.0` (l'API injectée — `onSnapshot`, `getToken` — est la forme modulaire de la v9 ; les apps sont en `^11`/`^12`). Les deux sont `optional: true` : rien n'est installé ni exigé chez qui n'utilise pas ces transports.

  `firebase` est déclaré bien que jamais importé par le paquet — les objets sont **injectés** (`onSnapshot`, `messaging`, `getToken`…), précisément pour que le paquet ne décide pas de la version à la place de l'app. La déclaration optionnelle ne change rien à ça : elle dit seulement, au bon endroit, la plage avec laquelle ces adaptateurs savent travailler.

- b68c407: README : documenter `sparkline` et `secure-storage`, et nommer le piège `formatPercentage`.

  Deux modules publiés n'avaient **aucune** section dans « Utilisation » — zéro occurrence de `sparkline` (et `/react/sparkline`) comme de `secure-storage` dans tout le README. Un module qu'on ne trouve pas dans la doc est un module qu'on recopie : chacun reçoit sa section au format des voisines — quoi, API, exemple, limites. Celle de `sparkline` montre `describeSeries` (l'alternative textuelle, rédigée en français) ; celle de `secure-storage` reprend les avertissements de l'en-tête du module, parce qu'un coffre qui tait ce qu'il ne protège pas est pire qu'aucun coffre : pas de parade au XSS actif, et phrase oubliée = données irrécupérables.

  Le guide de migration gagne le piège `formatPercentage` : le socle attend une **proportion** (`0,42` → « 42 % », convention `Intl`), les copies locales attendaient l'échelle 0–100 (cas réel : `miss-contraction`). Le remplacement à l'identique compile, puis affiche « 4 200 % » — le guide donne le grep, les deux corrections, et le symptôme qui trahit un appel oublié.

## 3.21.1

### Patch Changes

- 835dac8: `components.css` : une boîte de confirmation ouverte depuis une feuille couvre enfin l'écran.

  `ConfirmDialog` est `position: fixed; inset: 0; z-index: 60`, et on l'ouvre le plus souvent **depuis** une feuille — donc à l'intérieur de `sheet-panel`. Son voile se repliait alors sur les dimensions de la feuille au lieu de couvrir l'écran, et son `z-index` restait prisonnier du panneau : la boîte s'affichait en transparence, par-dessus le formulaire. Mesuré sur `miss-uwh` : 480 × 634 au lieu de 1280 × 720.

  La cause n'est pas dans `ConfirmDialog` mais dans l'animation d'entrée des panneaux. `dwc-rise` portait `animation-fill-mode: both`, qui **retient** la valeur d'arrivée après la fin ; une transformation retenue reste une transformation, même réduite à l'identité, et un `transform` autre que `none` fait de l'élément le bloc conteneur de ses descendants `position: fixed`. Le panneau laissait `matrix(1, 0, 0, 1, 0, 0)` derrière lui, à demeure.

  `sheet-panel`, `confirm-panel` et `toast` passent donc à `backwards`. Aucun changement visible : `dwc-rise` n'ayant pas d'image-clé `to`, son état d'arrivée est déjà l'état naturel de l'élément — il n'y a rien à retenir, et rien ne saute à la fin. Le panneau retombe à `transform: none`, le voile à 1280 × 720.

  Une app qui redonne sa propre animation d'entrée aux panneaux en CSS non « layered » écrase cette règle et rouvre la brèche : utiliser `backwards` là aussi. Le détail est commenté sur `@keyframes dwc-rise`, et un garde-fou refuse désormais tout `both`/`forwards` dans le fichier.

## 3.21.0

### Minor Changes

- bebb1f1: Deuxième vague : géographie, garde d'action, sauvegarde, dump d'échec E2E, et la campagne outillée.

  **`./geo`** — PROMU de mister-family-map : haversine, validation, boîte englobante avec l'antiméridien géré, `formatDistance` français. Le socle en avait besoin lui-même : les tests de `./similarity` fabriquaient une distance approximative à la main — ils utilisent désormais la vraie.

  **`./react/use-action-guard`** — PROMU de miss-supaboss : un bouton bloqué qui dit POURQUOI. Codes stables (`offline`, puis vos vérifications ordonnées), texte traduit via les labels, `aria-disabled` plutôt que `disabled` (le bouton reste focusable, le motif reste découvrable), `wrap()` qui rend l'action inerte. Les rôles sont injectés — ils appartiennent aux apps.

  **`./backup`** — la moitié « sauvegarde » que la promotion de `storage` n'avait pas traitée. Export daté et identifié, valeurs BRUTES (un blob chiffré n'est pas du JSON et doit survivre), import qui valide TOUT avant la première écriture, et refus d'une sauvegarde d'une autre app — le pire échec étant le silencieux.

  **`playwright-base`** — `dumpAppState` + `rethrowWithState`, promus du try/catch qui a fermé le bug des doublons après trois échecs aveugles en CI. URL, titre, clés du stockage (pas les valeurs), état applicatif à la demande ; ne lève jamais.

  **La campagne** — `CAMPAGNE.md` (le mode d'emploi complet, gardes-fous compris) et `scripts/console-audit.mjs` : chaque `console.error`/`warn` orphelin, avec un nom de journal proposé — l'audit s'arrête où le jugement commence. La carte du codemod apprend `geo` ; `useActionGuard` en est volontairement absent, sa signature ayant changé à la promotion.

## 3.20.0

### Minor Changes

- 988d317: Exports Markdown, JSON et vCard — et un modèle de colonnes partagé.

  **`./columns`** — la déclaration de colonnes est désormais commune au CSV, au Markdown et au JSON : une déclaration, trois formats, le même contenu. `toJson` traite d'une seule façon ce que `JSON.stringify` traite de deux (`undefined` disparaît d'un objet mais devient `null` dans un tableau ; `NaN` et `Infinity` deviennent `null` sans prévenir).

  **`./markdown`** — tableaux qui restent des tableaux : la barre verticale est échappée (sinon elle coupe la ligne en colonnes), le retour à la ligne devient `<br>` (sinon il termine le tableau), et les colonnes sont alignées dans la SOURCE — un tableau Markdown est lu tel quel autant qu'il est rendu. Plus `toMarkdownList` pour ce qu'un tableau à dix colonnes rend illisible sur un téléphone.

  **`./vcard`** — vCard 4.0 (RFC 6350), avec les quatre règles qu'on découvre en production : CRLF et non LF, `FN` obligatoire, les cinq caractères à échapper, et surtout **le pliage compté en OCTETS** (§3.2) qui ne doit jamais couper un caractère en deux. Un pliage naïf coupe les accents en mojibake — pour des noms français, ce n'est pas un cas limite.

- 36c9b4b: Sept chantiers, tirés du relevé d'adoption des dix-sept apps.

  **Le constat d'abord** : sur les 23 besoins que les apps recopient encore — 130 fichiers — **aucun ne manquait au socle**. Ce n'est pas un problème de modules, c'en est un d'adoption. Deux chantiers s'en occupent, cinq ajoutent ce qui manque vraiment.

  **Adoption.** `scripts/adopt.mjs` remplace un fichier recopié par l'import du socle, app par app — essai à blanc par défaut, et refus explicite quand l'app a ajouté ses propres symboles à côté (`ListSkeleton`, `ToastViewport`, `formatPercent` : quatre cas réels détectés). La dette est désormais engendrée en tête du README par `npm run sync`, avec sa partition migration / promotion.

  **`./csv`** — construire un CSV, pas seulement le télécharger. Échappement RFC 4180 (le guillemet se double), dialecte `excel-fr` (point-virgule, virgule décimale, BOM), lecture caractère par caractère. Huit apps produisent des tableaux.

  **`./similarity`** — promu du `dedupe` de mister-family-map (Sørensen–Dice sur bigrammes), avec le verdict EXPLIQUÉ que miss-lookhouse appelle « scoring explicable ». La distance est injectée : kilomètres, écart de prix, différence de dates.

  **`./backend`** — promu de la sélection de family-map. Les ports de domaine ne se généralisent pas ; la mécanique autour, si : repli local obligatoire, migration port par port, et couverture rapportée.

  **`./realtime`** + `realtime/supabase`, `realtime/firebase`, `realtime/local` — NEUF ASSUMÉ. Six apps annoncent du temps réel, aucune n'est lisible depuis cette session. Le port porte ce que la plateforme impose : retrait exponentiel dispersé, rattrapage borné après coupure, sonde au réveil de l'onglet.

  **`./sparkline`** + `react/sparkline` — courbe, barres, jauge en SVG calculé, sans dépendance, avec l'alternative textuelle produite d'office. Un trou (`null`) n'est jamais un zéro.

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
