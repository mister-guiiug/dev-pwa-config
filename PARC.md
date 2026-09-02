# Le parc vu de dehors

_Troisième analyse, 02/09/2026 au soir. Les deux premières ([CAMPAGNE.md](CAMPAGNE.md), [GISEMENTS.md](GISEMENTS.md)) lisaient le code des apps : ce qu'elles importent du socle, ce qu'elles réécrivent à côté. Celle-ci lit ce qu'elles ÉMETTENT — les seize sites publiés, les dépôts et leurs dépendances, les exports que personne n'appelle._

## Pourquoi regarder ailleurs

Un défaut de production n'existe dans aucun dépôt. Le manifeste de miss-ticket-pwa est correct dans `public/` ; c'est le LIEN vers lui, `/manifest.json`, qui pointe la racine de l'origine `mister-guiiug.github.io` et non le sous-chemin de l'app — 404, l'app ne s'installe pas, et aucun lint ne le voit. Renovate est configuré dans treize dépôts ; il n'a jamais ouvert une PR, parce que le préréglage qu'ils étendent vit dans un dépôt `.github` qui n'existe pas. Le relevé d'adoption comptait dix-neuf copies ; il y en a trente-quatre, parce que sa règle de façade acquittait tout fichier qui importe n'importe quoi du socle.

Trois sondes nouvelles, chacune laissée sous forme d'instrument pour que la mesure se refasse :

| Sonde                                  | Instrument                                                | Ce qu'elle lit                                                                                                                                                               |
| -------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Les sites publiés                      | `node scripts/probe-sites.mjs [app…] [--json]`            | `index.html` (langue, `theme-color`, CSP, icône iOS, Open Graph, canonique), le manifeste, `robots`/`sitemap`/`version.json`, le repli 404, le poids TRANSFÉRÉ du JS initial |
| Les exports morts                      | `node scripts/dead-exports.mjs [--all] [app…]`            | Un export jamais cité ailleurs (MORT) ; un export utilisé dans son seul fichier (SUPERFLU)                                                                                   |
| L'adoption, sans le mensonge de façade | `npm run measure-adoption` (règle corrigée dans cette PR) | Un fichier n'est une façade que s'il importe LE symbole libérateur du besoin, ou réexporte depuis le paquet                                                                  |
| Les dépendances, l'hygiène, la qualité | `npm outdated`, `gh pr list`, `scripts/console-audit.mjs` | Versions, fichiers de dépôt, workflows, `fr-FR` figés, `console.*`, densité de tests                                                                                         |

## Le classement

Le rendement est le nombre d'apps ou d'utilisateurs touchés, rapporté au coût. Les chantiers 1 à 3 sont des défauts — quelqu'un en souffre aujourd'hui. Les autres sont des dettes.

| #   | Chantier                                          | Mesure du 02/09                                                                                           | Où                        | Coût   |
| --- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------- | ------ |
| 1   | Réveiller Renovate                                | 0 PR jamais ouverte sur 18 dépôts ; 13 configs étendent un dépôt inexistant ; supabase-js de 2.45 à 2.112 | compte GitHub + 13 apps   | faible |
| 2   | Rendre les apps installables                      | ticket-pwa : manifeste 404 ; lookhouse : aucun PNG ; `lang: en` ×3 ; sans `id` ×6 ; sans maskable ×3      | 8 apps                    | faible |
| 3   | La dette d'adoption réelle : 34 copies, pas 19    | AppHeader 6, id 5, LoginForm 5, ErrorBoundary 3, Card 3, AuthProvider 3, MfaChallenge 2…                  | 12 apps (après la 3.33.0) | moyen  |
| 4   | `pwa-doctor` : la checklist du parc en un `bin`   | Chaque défaut de cette page a été trouvé à la main ; aucun ne l'aurait été deux fois                      | socle                     | moyen  |
| 5   | Poids initial : carbook 432 kB, budgets partout   | `charts` 94 kB et `supabase` 50 kB préchargés au démarrage ; `pwa-bundle-budget` a 0 adoptant             | carbook, puis 15 apps     | faible |
| 6   | SEO et partage : quatre sites sans `pwaSeoPlugin` | ¬og:image ¬canonical ¬sitemap : lookhouse, supaboss, qowa (+ family-map sans og:image) ; CSP absente ×2   | 4 apps                    | faible |
| 7   | Repli 404 : quatre apps routées par chemin        | badminton, contraction, footcoach, family-map servent la page 404 de GitHub sur un lien profond           | livré par `v3` (3.33.0)   | nul    |
| 8   | Les deux dépôts hors socle : lookhouse et qowa    | ¬lighthouse ¬cleanup ¬renovate ¬editorconfig (+ ¬a11y pour lookhouse, ¬nvmrc)                             | 2 apps (+ supaboss)       | faible |
| 9   | Locale figée : 88 `fr-FR` en dur                  | carbook 28, uwh 17, bac-sable 9, contraction 8, footcoach 6                                               | 15 apps                   | moyen  |
| 10  | Code mort : 64 exports morts, 104 superflus       | doc 10, contraction 9, molkky 8, uwh 7, footcoach 6 ; le motif `*_LABELS` jamais lu                       | 15 apps                   | faible |
| 11  | Journal : 38 `console.error/warn` orphelins       | `createLogger` a un adoptant sur dix-sept                                                                 | 13 apps                   | moyen  |
| 12  | Densité de tests : carbook 5 par kloc sur 25 kloc | badminton 5,6 ; supaboss 5,7 — contre contraction 47 et footcoach 39                                      | 3 apps                    | élevé  |
| 13  | `autoUpdate` : recharger en pleine saisie         | contraction, lookhouse, ticket-pwa                                                                        | 3 apps                    | faible |

Non retenus, parce que rien ne le réclame : le JSON-LD (1/16), `llms.txt` (1/16), `version.json` (1/16 — inoffensif sans `react/version`), `SECURITY.md` et `CONTRIBUTING.md` (0/17 : le parc est à un seul mainteneur), le `<meta name="color-scheme">` (1/16).

---

## 1. Réveiller Renovate

**Ce qu'on voit.** Aucun des dix-huit dépôts n'a jamais reçu une PR de Renovate ni de Dependabot ; le tableau de bord (« Dependency Dashboard ») n'existe nulle part. Treize `renovate.json` d'apps étendent `github>mister-guiiug/.github//renovate/default.json` ; le dépôt `mister-guiiug/.github` répond 404 — le préréglage n'a jamais existé, ou a disparu (le 01/09, l'application des rulesets l'a déjà retiré de sa liste pour la même raison). Le socle a une configuration autonome et correcte ; lui non plus n'a rien reçu. Conclusion la plus simple : l'application Renovate n'est pas installée sur le compte. On ne peut pas le vérifier avec le jeton de ce poste (l'API des installations exige un jeton d'app) ; le propriétaire le voit dans _Settings → Applications_.

**La dérive que ça produit** — tout est au même `vite` 8.0.0 parce que la montée d'août l'a posé à la main, et rien n'a bougé depuis :

| Paquet                  | Le plus ancien       | Le plus récent      | Écart                                                            |
| ----------------------- | -------------------- | ------------------- | ---------------------------------------------------------------- |
| `@supabase/supabase-js` | 2.45.0 (molkky)      | 2.112.3 (bac-sable) | 67 mineures                                                      |
| `firebase`              | 11.0.0 (puzzle)      | 12.12.0 (qowa)      | 1 majeure                                                        |
| `@playwright/test`      | 1.49.1 (×8)          | 1.62.1              | 13 mineures                                                      |
| `vite`                  | 5.4.11 (quota)       | 8.2.2 (bac-sable)   | 3 majeures                                                       |
| `react`                 | 18.3.1 (quota)       | 19.2.8              | 1 majeure                                                        |
| socle, `npm outdated`   | 29 paquets en retard | dont 5 majeures     | changesets 3, eslint 10, @eslint/js 10, commitlint 21, sentry 10 |

**Comment.** Deux gestes, tous deux au propriétaire du compte : installer l'app Renovate sur l'organisation (ou vérifier qu'elle l'est), et donner un corps au préréglage. Pour le second, deux voies : créer le dépôt `mister-guiiug/.github` avec `renovate/default.json` (zéro PR d'app, le nom attendu existe enfin), ou héberger le préréglage dans le socle (`renovate/default.json`, référence `github>mister-guiiug/dev-wpa-config//renovate/default.json`) et repointer les treize apps — treize PR d'une ligne, mais le préréglage vit avec le reste des conventions. Je recommande la seconde : le socle est déjà l'endroit où les conventions se lisent et se testent. Le préréglage doit reprendre ce que le `renovate.json` du socle fait déjà bien : mineures et patchs npm groupés, peers élargis, actions groupées, le samedi matin.

## 2. Rendre les apps installables

**Ce qu'on voit**, sur les seize sites, par la sonde :

| App            | Défaut                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| ticket-pwa     | `<link rel="manifest" href="/manifest.json">` : la racine de l'ORIGINE, 404. Le fichier existe sous `/miss-ticket-pwa/manifest.json`. **Pas installable.** Pas d'icône iOS non plus. |
| lookhouse      | Deux icônes SVG `sizes: any`, aucun PNG : iOS et les lanceurs Android n'en font pas une icône ; pas de captures                                                                      |
| cim10          | `lang: en` sur une app française ; pas de `maskable` ; pas d'`id`                                                                                                                    |
| footcoach      | `lang: en` ; pas d'`id`                                                                                                                                                              |
| puzzle         | `lang: en` ; pas de `maskable` ; pas d'`id`                                                                                                                                          |
| carbook        | Pas d'`id` ; pas d'icône iOS (« Sur l'écran d'accueil » prend une capture d'écran à la place)                                                                                        |
| family-map     | Pas d'`id` ; pas de captures                                                                                                                                                         |
| qowa, supaboss | Pas de captures (l'interface d'installation « riche » de Chrome ne s'affiche pas)                                                                                                    |

`id` manque six fois : sans lui, changer `start_url` un jour crée une SECONDE app installée à côté de la première. `lang: en` trois fois : c'est la langue que le manifeste du gabarit `vite-plugin-pwa` pose par défaut, et que personne n'a relue.

**Comment.** Le socle a déjà la réponse pour douze de ces lignes : `pwaManifest()` de `vite-pwa-base` pose `id`, `lang`, les icônes `any` + `maskable` et les captures. Les apps fautives construisent leur manifeste à la main. C'est une adoption, pas un développement — sauf ticket-pwa (un `href` à corriger dans `index.html`, une ligne) et lookhouse (générer les PNG : `pwa-icons` du socle le fait depuis le SVG). Après chaque correction, la sonde relit le site : c'est à ça qu'elle sert.

## 3. La dette d'adoption réelle

**Ce qu'on voit.** La règle de la façade disait : un fichier qui porte le nom guetté (`AppHeader.tsx`) mais qui importe le paquet est une adoption. Or l'`AppHeader.tsx` de miss-uwh importe `Button` du socle — et reste un en-tête écrit à la main. Corrigée (un fichier n'est une façade que s'il importe un symbole LIBÉRATEUR du besoin, ou réexporte depuis le paquet), la règle donne :

| Besoin                 | Compté hier | Réel   | Apps                                       |
| ---------------------- | ----------- | ------ | ------------------------------------------ |
| `AppHeader`            | 2           | 6      | genius, uwh, footcoach, doc, carbook, qowa |
| `id`                   | 5           | 5      | —                                          |
| `LoginForm`            | 1           | 5      | uwh, footcoach, doc, carbook, lookhouse    |
| `ErrorBoundary`        | 0           | 3      | caché entièrement                          |
| `Card`                 | 3           | 3      | —                                          |
| `AuthProvider`         | 3           | 3      | —                                          |
| `PageContainer`        | 2           | 2      | —                                          |
| `useFullscreen`        | 2           | 2      | —                                          |
| `MfaChallenge`         | 0           | 2      | caché entièrement                          |
| `Badge`                | 0           | 1      | caché                                      |
| `UpdatePromptBanner`   | 0           | 1      | caché                                      |
| `testing/pwa-register` | 1           | 1      | —                                          |
| **Total**              | **19**      | **34** |                                            |

Quinze copies étaient invisibles ; quatre besoins n'apparaissaient pas du tout. Ce n'est pas un détail de comptage : `ErrorBoundary` et `UpdatePromptBanner` sont exactement les composants que la campagne d'août croyait adoptés partout.

**Comment.** Le correctif de la règle est dans cette PR (`scripts/adoption-scan.mjs`, `estFacade`, deux tests). La campagne d'alignement de la 3.33.0 — qui attend le feu vert pour publier — porte donc sur trente-quatre copies dans douze apps, pas dix-neuf. `npm run adopt-plan -- <app>` les liste par app, avec le sous-chemin à importer.

## 4. `pwa-doctor` : la checklist du parc en un `bin`

**Ce qu'on voit.** Tout ce que cette page relève a été trouvé avec des `curl`, des `grep` et des `ls` écrits pour la journée. La sonde des sites et le relevé des exports morts sont maintenant des scripts ; le reste — la matrice d'hygiène ci-dessous — est encore un one-liner :

| App         | Manque                                                                                 |
| ----------- | -------------------------------------------------------------------------------------- |
| lookhouse   | lighthouse, `cleanup-runs`, `renovate.json`, `.editorconfig`, `.nvmrc`, spec a11y, CSP |
| qowa        | lighthouse, `cleanup-runs`, `renovate.json`, `.editorconfig`, CSP                      |
| supaboss    | lighthouse, `cleanup-runs`, spec a11y, `robots.txt`, `sitemap.xml`                     |
| contraction | spec a11y                                                                              |
| doc         | `.editorconfig`                                                                        |
| puzzle      | e2e absent de la CI                                                                    |
| 8 apps      | `pwa-supabase-keepalive` : zéro appelant (carbook en a payé le prix, GISEMENTS § État) |
| 17 apps     | `bundleBudget` dans `package.json` : zéro                                              |

**Comment.** Un `bin` publié, `pwa-doctor`, qui lit un dépôt et dit ce qui manque et comment le poser — en trois familles : les FICHIERS attendus (`.lighthouserc.json`, `.editorconfig`, `.nvmrc`, `renovate.json`, `e2e/a11y.spec.ts`, `bundleBudget`), les WORKFLOWS attendus (lighthouse, cleanup, keepalive si `supabase` est une dépendance, e2e dans `ci.yml`), et l'`index.html` + le manifeste du build s'il existe (les lectures pures de `probe-sites` s'y appliquent telles quelles : `htmlMarkers`, `manifestSummary`). Sortie : une ligne par manque, avec le geste — pas un score. Le socle a déjà les briques : `check-bundle-budget` pour la forme d'un `bin`, `workflows.test.mjs` pour les attentes sur les workflows, `probe-sites` pour le HTML. Un jour de travail ; il aurait vu 2, 6, 8 et 13 sans qu'on les cherche.

## 5. Poids initial : carbook, puis des budgets partout

**Ce qu'on voit** — le JS transféré (gzip) au premier chargement, scripts de module et `modulepreload` :

| App         | kB  | App        | kB  | App       | kB  | App        | kB           |
| ----------- | --- | ---------- | --- | --------- | --- | ---------- | ------------ |
| carbook     | 432 | family-map | 182 | supaboss  | 149 | cim10      | 124          |
| puzzle      | 267 | uwh        | 180 | lookhouse | 144 | footcoach  | 120          |
| contraction | 238 | badminton  | 178 | qowa      | 131 | dice       | 94           |
| doc         | 205 | molkky     | 158 | genius    | 129 | ticket-pwa | 5 (coquille) |

Carbook, le détail : `vendor` 152 kB, `charts` 94 kB, `react-vendor` 55 kB, `supabase` 50 kB, `index` 45 kB, `validation` 17 kB, `router` 14 kB — TOUT en `modulepreload`, donc tout avant le premier rendu. Les graphiques ne servent pas sur l'écran d'accueil ; Supabase non plus tant qu'on n'est pas connecté (le `supabase-client` du socle est paresseux pour cette raison précise — carbook a le sien, cf. § 3).

**Comment.** Pour carbook : sortir `charts` et `supabase` du chemin critique (`lazy()` sur les écrans qui les montrent ; ne pas les mettre dans `manualChunks` préchargés). Objectif raisonnable : passer sous 250 kB. Pour les seize : poser `bundleBudget` dans `package.json` à partir de la mesure ci-dessus (+ 10 %, pour qu'il alerte sans crier), et `pwa-bundle-budget` dans `ci.yml` après le build — le `bin` existe depuis la 3.33.0, zéro adoptant.

## 6. SEO et partage

**Ce qu'on voit.** Lookhouse, supaboss et qowa n'ont ni `og:image`, ni `canonical`, ni `sitemap.xml` (supaboss et qowa n'ont pas non plus de `robots.txt`) ; family-map a la canonique mais pas l'image. C'est la signature d'une absence : `pwaSeoPlugin` produit les quatre. Douze apps l'ont. Par ailleurs `theme-color` ne suit le schéma clair/sombre que sur cinq sites (cim10, footcoach, puzzle, badminton, molkky) : l'option `themeColor: { light, dark }` de `vite-pwa-base` est adoptée à cinq sur seize, la barre d'adresse mobile reste claire sur les onze autres en mode sombre. Et deux sites n'ont pas de CSP : lookhouse et qowa — les deux mêmes qu'au § 8.

**Comment.** Quatre PR d'adoption de `pwaSeoPlugin` (un import et un objet), onze de `themeColor` (deux couleurs). C'est le `pwa-doctor` du § 4 qui devrait les réclamer, pas cette page.

## 7. Repli 404 — livré, à vérifier

**Ce qu'on voit.** Sur un lien profond, badminton, contraction, footcoach et family-map servent la page 404 de GitHub : ce sont les quatre apps routées par chemin (`BrowserRouter`) sans `404.html`. Carbook, molkky et dice l'ont déjà ; les neuf autres routent par `#`.

**Comment.** Rien à écrire : `pwa-deploy.yml` copie `index.html` en `404.html` depuis GISEMENTS § 1, et la 3.33.0 déplacera `v3`. Le geste qui reste est de VÉRIFIER après publication — `node scripts/probe-sites.mjs miss-badminton` doit dire `404→coquille`. Family-map se déploie depuis bac-sable ; même vérification, même sonde.

## 8. Les deux dépôts hors socle

Lookhouse et qowa sont les seuls dépôts où presque tout manque à la fois (§ 4, tableau) : nés hors du gabarit — lookhouse en juillet avec ses propres workflows, qowa sur Firebase — ils n'ont jamais été passés au gabarit `pwa-deploy` / `pwa-ci`. Ce sont aussi les deux sans CSP et sans `pwaSeoPlugin`. Un seul chantier pour les deux : les remettre sur les workflows réutilisables, `renovate.json` et `.lighthouserc.json` du gabarit. Supaboss suit (lighthouse, cleanup, a11y). Contrainte qowa : rien sous `functions/`, aucun déploiement déclenché.

## 9. Locale figée

Quatre-vingt-huit `'fr-FR'` en dur dans le code de quinze apps (hors tests) : carbook 28, uwh 17, bac-sable 9, contraction 8, footcoach 6, puzzle 5, doc 4, lookhouse 3. Le socle a `setDefaultLocale` et sept langues depuis GISEMENTS § 2 ; chaque `toLocaleDateString('fr-FR')` est un endroit où l'app restera française quand le reste parlera la langue du navigateur. Codemod possible pour la forme `toLocale*('fr-FR', …)` → `format*()` ; jugement humain pour `Intl.*` construits à la main. Carbook d'abord, parce qu'il porte un tiers du total.

## 10. Code mort

Soixante-quatre exports morts et cent quatre exports superflus dans quinze apps (`dead-exports.mjs`). Trois motifs se répètent :

- **Les tables `*_LABELS` jamais lues** — footcoach 6 (`MATCH_STATUS_LABELS`, `ATTENDANCE_STATUS_LABELS`…), uwh 5 (`MEMBER_ROLE_LABELS`…) : des libellés déclarés dans `types/`, et l'interface qui en a réécrit d'autres à côté. C'est la forme la plus coûteuse du code mort : deux vérités pour un même libellé.
- **Les couches abandonnées** — molkky `idbGet/idbSet/idbDel`, `runMigrations` (la persistance a changé, l'ancienne est restée) ; doc `WEEKDAY_SHORT`, `monthLabel`, `HNC_LABEL`, `LEAVE_LABEL` (dates et libellés remplacés par le socle, jamais retirés) ; contraction `useUndo`, `BreathGuide`, `ChartWithTrend`, `IntensityEditPopup` (des écrans entiers).
- **Les hooks orphelins** — badminton `useLongPress` (le même que GISEMENTS refusait de promouvoir, pour cette raison), puzzle `getOfflineQueueForRoom`.

Le retrait est mécanique app par app (`node scripts/dead-exports.mjs --all mister-doc` liste tout) ; les cent quatre superflus ne demandent que de retirer le mot `export`. Réserve : un nom consommé par un outil externe (build, manifeste) passe pour mort — le verdict se lit avant de s'appliquer. La réserve s'est vérifiée le jour même : `collectSite` de miss-lookhouse n'avait aucun importateur dans `src/` et faisait tourner la collecte dans une Edge Function Deno, par la copie du cœur (`supabase/functions/_shared/core`). L'outil lit désormais `supabase/functions`, `functions`, `server`, `scripts` et `e2e` comme citations.

## 11. Journal

Trente-huit `console.error` / `console.warn` orphelins dans treize apps (ticket-pwa 6, uwh 6, puzzle 5, molkky 4, qowa 4) ; `createLogger` du socle a un adoptant, bac-sable. `scripts/console-audit.mjs` propose un nom de logger par fichier ; le reste est un jugement par ligne (« échec » de quoi ?). Campagne à mener app par app, en commençant par celles qui ont un backend (uwh, ticket-pwa, qowa) : c'est là qu'un journal corrélé sert.

## 12. Densité de tests

| App         | Tests | Lignes | Tests / kloc |
| ----------- | ----- | ------ | ------------ |
| contraction | 384   | 8 206  | 46,8         |
| footcoach   | 525   | 13 354 | 39,3         |
| dice        | 182   | 6 532  | 27,9         |
| …           |       |        |              |
| supaboss    | 42    | 7 350  | 5,7          |
| badminton   | 51    | 9 027  | 5,6          |
| **carbook** | 130   | 25 481 | **5,1**      |

La plus grosse app du parc est la moins testée, et c'est celle dont le déploiement est bloqué depuis le 29/08 sans que personne n'ait été prévenu. Pas de chantier socle ici — un chantier d'app, coûteux, à décider en connaissance de cause : carbook porte un moteur (workspaces, assistant, synchronisation) que 130 tests ne couvrent pas.

## 13. `autoUpdate`

Contraction, lookhouse et ticket-pwa enregistrent le service worker en `registerType: 'autoUpdate'` : une nouvelle version recharge la page quand elle est prête — au milieu d'une saisie de contraction, le cas d'usage même de l'app. Les treize autres passent par `prompt` et `UpdatePromptBanner` (le commentaire de mister-doc explique le choix). Trois PR d'une ligne, plus le bandeau.

---

## Réserves de mesure

- La sonde lit la PRODUCTION : ce qui est fusionné mais pas déployé n'y est pas. Carbook ne se déploie plus depuis le 29/08 (Supabase en pause) ; son site est celui du 28.
- Le poids « transféré » est le `Content-Length` servi par GitHub Pages en gzip ; Brotli ferait moins. Les chunks chargés après le premier rendu (`import()`) ne sont pas comptés — c'est voulu.
- `mister-quota` n'a pas de site (app Electron) ; la sonde l'exclut par le catalogue.
- Le relevé des exports morts lit le mot entier dans `src/`, tests compris ; il ne voit ni les chaînes de `lazy(() => import())` ni les consommateurs externes.
- L'installation de Renovate n'est pas vérifiable d'ici (jeton d'app requis) ; l'absence totale de PR sur dix-huit dépôts, y compris le socle dont la configuration est valide, est l'indice le plus fort.

## Ce que cette PR livre

- `scripts/probe-sites.mjs` + tests des lectures pures ;
- `scripts/dead-exports.mjs` + tests ;
- la règle de façade corrigée dans `scripts/adoption-scan.mjs` (`estFacade`) + deux tests — et le relevé passe de 19 à 34 ;
- cette page.

Rien n'est publié dans le paquet : trois outils de dépôt et un document. La 3.33.0 attend toujours le feu vert.

---

## État au soir du 02/09/2026 — les treize chantiers

La 3.33.0 est publiée, les dix-sept apps sont sur `^3.33.0`, et aucune PR
n'est restée ouverte.

| #   | Chantier            | Fait                                                                                                                                                    | Reste                                                                                          |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| 1   | Renovate            | Préréglage `renovate/default.json` + `renovate.yml` auto-hébergé (#157) ; les dix-sept apps l'étendent                                                  | Le secret `RENOVATE_TOKEN` sur le socle — sans lui le workflow le dit et s'arrête              |
| 2   | Installabilité      | Vérifié en production sur les seize sites : manifeste sous le site, PNG 512 et maskable, `id`, `lang: fr`, icône iOS partout sauf carbook (non déployé) | Captures pour lookhouse, qowa, family-map                                                      |
| 3   | Dette d'adoption    | Règle de façade corrigée (#156) : le relevé dit 34 copies, et les modules qui les remplacent sont publiés                                               | L'adoption elle-même, app par app (`npm run adopt-plan -- <app>`)                              |
| 4   | `pwa-doctor`        | Bin publié (#158, #159) ; il a servi de contrôle après chaque correction                                                                                | Le poser en `postbuild --strict` app par app                                                   |
| 5   | Poids               | carbook : 432 → 146 kB de JS initial gzip                                                                                                               | Le mesuré en production attend le déblocage de carbook ; budgets `bundleBudget` sur les autres |
| 6   | SEO et partage      | Vérifié en production : Open Graph et canonique sur lookhouse, supaboss, qowa ; `theme-color` par schéma sur quinze sites ; CSP partout sauf family-map | `og:image` pour family-map (miroir)                                                            |
| 7   | Repli 404           | `v3` déplacé par la publication : badminton, contraction et footcoach servent la coquille sur un lien profond (mesuré)                                  | family-map : le miroir n'a pas été régénéré depuis le 29/08                                    |
| 8   | Dépôts hors gabarit | lookhouse, qowa, supaboss remis sur le gabarit ; puzzle : e2e en CI, quatre tests réparés et deux en `fixme` documenté                                  | Keep-alive sur uwh, doc, footcoach, lookhouse : il leur manque les secrets `VITE_SUPABASE_*`   |
| 9   | Locale figée        | 71 appels dans dix apps passent par `getDefaultLocale()`                                                                                                | —                                                                                              |
| 10  | Code mort           | 50 exports morts retirés, 6 fichiers supprimés, une centaine dé-exportés                                                                                | —                                                                                              |
| 11  | Journal             | 36 `console.error/warn` passent par `createLogger` dans treize apps                                                                                     | —                                                                                              |
| 12  | Tests carbook       | `scoringAlgorithm.test.ts`, 14 cas                                                                                                                      | Le reste du moteur (assistant, synchronisation)                                                |
| 13  | `autoUpdate`        | contraction, lookhouse, ticket-pwa en `prompt` + `AppUpdates` du socle                                                                                  | —                                                                                              |

**Le seul défaut de production qui subsiste, et qui ne se corrige pas d'ici :**
miss-carbook ne se déploie plus depuis le 29/08. Son `deploy.yml` a `needs:
migrate`, et la migration répond `project is paused` — un administrateur doit
réveiller le projet depuis le tableau de bord Supabase. Le site public est
donc celui du 28/08 : ni le `id` du manifeste, ni l'icône iOS, ni les 146 kB
n'y sont encore.

Ce que la journée a appris à l'outillage : la règle de façade (§ 3), les
citations hors `src/` (§ 10), et qu'un heredoc de ce poste mange les
antislashs — les codemods s'écrivent dans des fichiers, pas en ligne de
commande. Et qu'un test peut figer une limite plutôt qu'un contrat : trois
apps affirmaient « le socle ne livre que fr et en », ce qui a rendu leur CI
rouge le jour où la limite est tombée.
