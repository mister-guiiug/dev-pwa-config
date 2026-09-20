# Gisements — ce que les apps écrivent et que le socle n'a pas

`CAMPAGNE.md` regarde dans un sens : ce que le paquet exporte et que les apps
recopient encore. Ce document regarde dans l'autre : **ce que plusieurs apps
écrivent chacune de leur côté, et que le paquet n'exporte pas**. Le premier
mesure une dette ; le second cherche des chantiers.

Analyse du 02/09/2026, sur les dix-sept apps clonées à côté du socle
(`bac-sable` compris, `mister-family-map` exclu : c'est son miroir).

> **Élagué le 06/09/2026.** Les dix chantiers de ce relevé ont été livrés le
> jour même, en dix PR fusionnées dans la 3.33.0 — leurs fiches détaillées
> (« ce qu'on voit », « la forme », le coût) ont donc quitté ce document. Elles
> restent lisibles dans l'historique, et le CHANGELOG dit ce qui est entré.
> Ce qui suit est ce qui sert encore : **la méthode**, les **refus avec leur
> raison**, et les **leçons**.

## La méthode, et ce qu'elle vaut

Quatre sources, aucune ne suffit seule.

**Un instrument** — `node scripts/promotion-candidates.mjs`. Le symétrique
d'`adoption-candidates` : les noms déclarés par au moins deux apps que le
paquet n'exporte pas (410 noms de surface), regroupés par déclaration nommée
(106 groupes) et par nom de fichier (ce qui rattrape les `export default`).
Chaque exemplaire porte son nombre d'importateurs — un zéro est un cadavre,
pas un doublon — et chaque groupe sa similarité (Jaccard sur les lignes
normalisées) : 1,00 est une copie littérale, 0,05 un homonyme. **Il ne décide
rien** ; il dit par où commencer à lire.

**La lecture.** Une trentaine de fichiers ouverts, parce que l'instrument
compare des noms et que les noms mentent : `colors.ts` existe dans quatre apps
et désigne quatre choses ; `notifications.ts` dans trois, et trois métiers
différents.

**Les apps elles-mêmes.** Une source que personne n'exploitait : les
commentaires où une app écrit noir sur blanc ce que le socle ne lui donne pas
— « candidate à une évolution du socle », « le socle n'en rend qu'une », « le
dictionnaire du socle ne couvre pas l'espagnol ». Une trentaine de mentions
dans douze apps. **C'est la liste de souhaits, écrite par les demandeurs, et
elle dormait dans le code.**

Et une mesure sur les sites publiés, parce qu'un gisement peut aussi être un
défaut que trois apps ont corrigé et que quatre autres subissent.

### Comment classer

Le rang est un rapport : ce que le chantier retire ou répare, sur ce qu'il
coûte. Le coût compte **tout** ce qu'un module doit livrer pour être adopté
— code, `.d.ts`, tests, `components.css`, libellés, README, showroom — parce
que la leçon `sparkline` (un module sans doc n'a aucun adoptant) ne se
rediscute pas.

## Ce que le relevé du 02/09 a donné

Dix chantiers, dix PR sur le socle, toutes fusionnées dans la **3.33.0** :
repli SPA `404.html` (#145), libellés en sept langues (#146), `react/card`
(#147), `id` (#148), quatre workflows réutilisables (#149), `react/app-header`
et `react/page-container` (#150), la couche auth (#151), `format` (#152),
le bin `pwa-bundle-budget` (#153), et les petites demandes écrites par les apps.

**Deux corrections que la journée a apportées à ce document même**, et qui
valent plus que la liste : le socle ne recopiait pas son repli `randomUUID`
trois fois mais deux — la troisième était un commentaire périmé —, et deux des
« petites demandes » avaient déjà leur réponse dans le code du socle, l'une par
une décision écrite, l'autre par un correctif livré. **La liste de souhaits des
apps se lit avec le CHANGELOG à côté.**

### La moitié périmée de la liste de souhaits

Trois demandes trouvées dans les apps avaient **déjà été exaucées**, et les
apps ne le savaient pas : le message « prêt hors ligne » de `miss-genius`
(`showOfflineReady`, 3.27), la seconde sortie et la clé de report de
`mister-puzzle` (`secondaryActions`, `snoozeKey`, 3.26–3.27), la
journalisation d'un échec d'enregistrement chez `mister-doc`
(`onRegisterError`, 3.26).

C'est la règle de `CONTRIBUTING.md` — « promouvoir sans migrer, c'est ne pas
avoir fini » — vue de l'autre bout : le socle a livré, la demande est restée
écrite dans l'app, et le code de contournement avec elle.

## Ce qu'on ne fait pas, et pourquoi

- **`Modal`** (`badminton`, `molkky`, 5 importateurs) — c'est `Sheet` : titre,
  fermeture, piège de focus, Échap, voile. Ce qui diffère est l'habillage
  (centré sur grand écran), et c'est l'affaire de `components.css`. Adoption.
- **Les écrans de réglages** — onze apps en ont un, de 142 à 728 lignes, et
  tous ont les mêmes rubriques (export, import, réinitialisation, mise à jour
  forcée, version, autres apps). Mais la COMPOSITION est métier, et les
  briques existent déjà (`ThemeToggle`, `AppVersion`, `FamilyApps`,
  `ConfirmDialog`, `downloadText`). Seuls `badminton`, `molkky` et `uwh` ont
  un `Section`/`Toggle` local : trop peu, trop tôt. À surveiller.
- **L'onboarding** — six apps, trois natures : tutoriel de premier lancement
  (`badminton`, `molkky`), assistant de configuration (`uwh`, `supaboss`,
  `carbook`), bulle d'aide (`badminton`). Rien de commun au-delà d'un drapeau
  « vu », que `use-local-storage` couvre.
- **`colors`** — quatre homonymes. Le seul concept partagé, une palette
  catégorielle stable (`uwh`, `doc`, `genius`), tient en un tableau et un
  modulo. À surveiller si un quatrième apparaît.
- **Le centre de notifications** — `uwh`, `doc`, `footcoach`, `lookhouse`
  ont chacun une liste « lu / tout marquer lu / non lus », sur une table
  `notifications` qui a **trois formes** (`user_id` ou `doctor_id`, `read` ou
  `read_at`). Second temps : un port d'abord, comme pour `auth`, une UI
  ensuite.
- **Les gabarits SQL** — `profiles` + `handle_new_user` + `touch_updated_at`
  - `is_admin` reviennent dans `bac-sable`, `carbook`, `doc`. Le paquet ne
    franchit ni Deno ni Postgres ; il pourrait livrer des fichiers à copier. La
    valeur n'existe qu'à la naissance d'une app : à écrire quand la prochaine
    naît, pas avant.
- **`ExportBundleSchema` / `appDataSchema` / les sept `storage.ts`** — la
  vraie réponse est `versioned-store`, que `miss-genius` a déjà prise pour son
  import. Adoption, et le retrait de `backup` (zéro adoptant) est une décision
  à écrire, pas un module à promouvoir.
- **`env.ts`** — trois homonymes (validation zod, échec rapide, drapeaux
  Firebase). `bac-sable` recopie `resolveBackendKind` : adoption.
- **Le reste du balayage** est de l'adoption, pas de la promotion, et
  `adoption-candidates` le voit déjà : `getSupabase` recopié dans quatre apps
  malgré `supabase-client`, `InstallPrompt` dans deux malgré
  `pwa-install-prompt`, `RiveScene` dans deux malgré `react/rive`,
  `translate` dans trois malgré `createI18n`, et `generate-pwa-icons` dans
  **onze** malgré le bin `pwa-icons`.
- **`xlsx` : lire** — `miss-uwh` charge SheetJS depuis un CDN pour l'import.
  L'app elle-même reconnaît que c'est « un autre métier » que d'écrire un
  classeur qu'on maîtrise. **Non retenu**, et écrit ici pour que la question
  ne revienne pas.

## Les cadavres croisés en route

`TOURNAMENT_STATUS_LABELS` — déclaré dans `miss-uwh` (`domain.ts:324`) et
`mister-footcoach` (`types/index.ts:76`), utilisé dans aucun. Le balayage le
sortait comme un doublon ; c'est le même fossile dans deux dépôts jumeaux.

## L'autre moitié, pour mémoire

Ce document cherche ce qui manque au socle. Le tri du 02/09 dans
`CAMPAGNE.md` a montré l'inverse chez `mister-molkky` : cinq modules du socle
le nomment comme source, et il n'en avait réadopté aucun. **`miss-dice` est
dans le même cas, en plus grand** : `useKeyboardRoll`, `useSpeak`,
`useShakeToRoll`, `useInstallPrompt`, `useReducedMotion`, `useTheme`,
`useSound`, `useI18n` — huit hooks locaux dont le socle exporte l'équivalent,
deux promus depuis cette app même. Une app qui donne un module ne le réadopte
pas toute seule ; c'est la règle, pas l'exception.

## Le relevé du 20/09/2026 — et ce qu'une migration a trouvé que le relevé n'avait pas vu

Trois relevés de lecture sur les vingt et une apps, plus les instruments. Ce
qui en est sorti est parti dans la **6.3.0** (#326) : `BottomNav navigate` et
`items[].load`, `react/use-retry-when-online` (promu de mister-miss-koh),
`isTransientMessage` (miss-uwh et mister-doc portaient le motif au caractère
près), et deux dettes du docteur — `prefetch-routes`, `nav-attente`.

**LA LEÇON DU JOUR EST DANS L'AUTRE SENS.** Le plus gros gisement était déjà
dans le paquet : `react/use-prefetch` (intention, inactivité, visibilité, garde
`saveData` et 2g) existait depuis longtemps, avec **zéro adoptant**, zéro
mention au README et une ligne au showroom — pendant que **treize apps**
écrivaient leur `requestIdleCallback` à la main, dont dix le 20/09 au matin,
quelques heures avant ce relevé. Un module que personne ne trouve n'existe pas.
Avant d'écrire un candidat à la promotion, **lire le CHANGELOG à côté du code
de l'app** : le toast à action (4.5.0) était périmé dans les en-têtes de
`useUndoToast` (bac-sable) et `useUndo` (koh), qui annonçaient tous deux « le
socle n'a pas d'action ».

**CE QUE LES MIGRATIONS ONT FAIT REMONTER**, et qu'aucun balayage ne voyait —
ce sont des manques constatés en butant dessus, la source la plus précise :

- **L'accès SYNCHRONE au client Supabase.** `createSupabaseClientFactory`
  n'expose que `getClient(): Promise`. miss-carbook a dû renoncer (38
  importateurs, 179 appels, des abonnements dans des effets), mister-doc a
  migré ses 87 sites en `await` mais a gardé deux gardes locales pour tenir des
  contrats synchrones, et mister-settle contourne par un `Proxy` **dont le
  désabonnement est inopérant**. Un accesseur synchrone quand le SDK est fourni
  statiquement, ou un `client: () => Promise<Client>` accepté par l'adaptateur.
- **« Le silence du réseau n'est pas une déconnexion ».** `auth/supabase` et
  `auth/index` traduisent tout évènement sans session en `signed-out` sans
  regarder le stockage ; hors ligne, Supabase en émet un au bout d'une
  demi-minute. miss-lookhouse garde la contre-mesure chez elle, mesurée en
  production. Candidat n° 1.
- **Un hook de forme ACTION.** `useAsync(fn, key)` charge au montage ;
  mister-qowa a besoin de `{ busy, error, setError, run }` avec conversion
  d'erreur. Émuler l'un avec l'autre demande une `fn` inerte, une clé
  incrémentée et un spinner au montage : contorsion. À poser à côté, pas à la
  place.
- **`react/login-form` ne couvre aucun des écrans de connexion du parc** —
  trois modes à bascule (lien, mot de passe, inscription), carte « lien
  envoyé », garde hors ligne. miss-carbook et miss-lookhouse ont migré la
  plomberie et **gardé leur formulaire**. Le composant est présentationnel et
  mono-mode : ou il grandit, ou il se documente comme tel.
- **`react/rive` ne voit pas un `.riv` manquant.** `@rive-app/react-canvas`
  ne lève pas, il émet `LoadError` que l'enveloppe ne remonte pas : la frontière
  d'erreur ne verrait rien, canvas vide au lieu du repli. badminton et molkky
  gardent tous deux leur sonde des quatre octets `RIVE`.
- **`react/i18n` ne franchit pas mister-qowa** : catalogues PLATS (`resolvePath`
  parcourt des objets imbriqués), 74 valeurs sur 291 qui sont des FONCTIONS
  (ordinaux, gabarits), langues chargées à la demande (`createI18n` veut un
  `Record` synchrone : +21,6 kB dans le morceau d'entrée, au-dessus du budget)
  et un `tStatic` hors React. Quatre manques nommés, pas une réticence.
- **`react/page-container`** n'a que des paliers fixes (28/36/48/64 rem) là où
  badminton et molkky ont des paliers progressifs par point de rupture, et son
  `reserve` ne connaît que `bottom-nav`. Deux refus motivés, pas des oublis.
- Plus petits, même nature : `use-keyboard-shortcuts` ne filtre pas les
  modificateurs (Ctrl+R serait intercepté), `ToastProvider` n'a pas d'`onDismiss`
  pour une app qui tient sa file dans son magasin, `use-action-guard` ignore les
  rôles et le drapeau « donnée en lecture seule » de miss-supaboss.

**ET UN CADAVRE DE PLUS** : le `RiveScene` de mister-molkky n'est importé par
aucune vue et aucun `.riv` n'existe dans le dépôt — à retirer, pas à migrer.

## La leçon

L'instrument a trouvé les gisements par volume (`Card`, `id`, les en-têtes) ;
la lecture a trouvé ceux par nature (la couche auth, `format`) ; **les
commentaires des apps ont trouvé les plus précis** — une prop, une option, un
type MIME — parce qu'ils ont été écrits au moment exact où quelqu'un a buté
sur le manque. Et la mesure sur les sites publiés a trouvé le seul qui soit
un défaut en production.

Aucune des quatre sources ne voyait les trois autres. Le prochain relevé les
prendra toutes.
