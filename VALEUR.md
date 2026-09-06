# La valeur, vue de l'utilisateur — dix-neuf chantiers classés (06/09/2026)

_Sixième analyse du parc, après [CAMPAGNE.md](CAMPAGNE.md), [GISEMENTS.md](GISEMENTS.md),
[PARC.md](PARC.md), [STRATEGIE.md](STRATEGIE.md) et [AMELIORATIONS.md](AMELIORATIONS.md).
Les cinq premières regardaient vers l'intérieur : duplication, conformité,
adoption, dette. Celle-ci pose une seule question, tournée vers l'extérieur :
**qu'est-ce qu'un utilisateur de chacune des dix-neuf applications ne peut pas
faire aujourd'hui, et devrait pouvoir faire ?** Tous les chiffres ont été
relevés le 06/09/2026 au soir sur les copies de travail tirées le jour même
(`git pull` sur les vingt-deux dépôts), sur l'API GitHub, sur les dix-huit
sites publiés et, pour trois d'entre eux, sur leur backend. Ce qui n'a pas pu
l'être est marqué « non vérifié » et repris en § 5._

## 0. Le verdict, en dix lignes

**La question est bien posée, mais sa réponse n'est pas « ajouter ».** Le parc
vu de dehors est sain : dix-huit sites répondent, servent leur coquille sur un
lien profond, un manifeste en français, un `version.json`. Ce qui reste n'est
plus structurel, c'est fonctionnel — et **les sept premiers chantiers de ce
classement n'ajoutent aucune fonction : ils tiennent des promesses déjà
faites.** Une application stable dit à sa lectrice d'exporter une sauvegarde
avant de changer de téléphone et n'a aucun bouton pour le faire ; une autre
synchronise deux appareils en écrasant les parties de l'un ; une troisième
laisse n'importe qui effacer n'importe quel puzzle, y compris ceux qu'elle
liste en public.

**Personne ne peut nous le dire.** Zéro issue ouverte sur vingt-deux dépôts,
ce n'est pas du silence : sept applications stables sur dix n'ont pas de
« Signaler un problème », et la seule application bêta qui l'affiche envoie
vers un dépôt dont les issues sont désactivées — un 404. Ce document est donc
la seule liste de souhaits qui existe, et c'est sa limite.

**La portée est déclarée, pas mesurée.** Le classement pondère par maturité
comme demandé. Mais trois sites seulement mesurent leur audience (Google
Analytics sur contraction, cim10 et carbook), et la base de mister-puzzle,
classée stable, contient **quatre puzzles**. Là où la mesure contredit la
déclaration, le rang le dit.

**Et un faux positif à moi, instructif.** Trois faits concordants, une mémoire
et une analyse antérieure disaient que mister-qowa tournait sans configuration
Firebase en production. Le littéral dans le chunk chargé à la demande dit le
contraire. Le chantier n'existe pas ; la leçon est en § 1.

> **CE DOCUMENT A ÉTÉ RECTIFIÉ LE 06/09/2026 AU SOIR, APRÈS EXÉCUTION.** Les
> dix-neuf chantiers ont été lancés le jour même ; **onze constats sur
> dix-neuf fiches se sont révélés faux ou périmés**, et la cause vaut plus que
> la liste — voir le **§ 6**, qui les recense un par un. Les fiches concernées
> portent une ligne « **Rectifié le 06/09** » ; rien n'a été effacé, pour que
> l'écart entre ce que l'analyse croyait et ce que l'exécution a trouvé reste
> lisible.

## 1. Ce que le relevé mesure

### Les instruments

| Instrument                    | Ce qu'il lit                                                                                                                                                                                                                                                      | Laissé où                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Une sonde de capacités        | 32 motifs (export, import, impression, partage, écriture hors ligne, annulation, suppression de compte, notifications, magasin versionné…) sur le code produit des 19 apps et du squelette, hors tests, scripts et docs ; compte des **fichiers**, pas des lignes | `D:/tmp/valeur-probe.mjs`, hits dans `valeur-probe-hits.json` |
| Cinq lectures par application | README, `docs/`, routeur, écrans, types, persistance, `package.json` de chaque app ; capacités **PRÉSENT/ABSENT** avec le fichier ; manques **constatés** (promis par un document et absents du code) séparés des **hypothèses** (attendus du domaine)            | ce document, § 2                                              |
| Les sites publiés             | `scripts/probe-sites.mjs --json` : statut, manifeste, repli sur lien profond, JS initial ; puis, à la main, le **bundle** des douze apps à backend (URL Supabase, projet Firebase), en suivant les `import()` dynamiques sur deux niveaux                         | `D:/tmp/probe-sites.json`                                     |
| Les backends                  | Les six projets Supabase déployés (`/rest/v1/` → 401 = vivant), les journaux des `keep-alive`, la base RTDB de puzzle **en clés seulement** (`?shallow=true`, rien conservé)                                                                                      | —                                                             |
| GitHub                        | `vars`, `secrets`, derniers runs par workflow, issues ouvertes et **activées**, `issues/new?template=bug.yml` en HTTP                                                                                                                                             | —                                                             |
| Les analyses précédentes      | Ce qui est fait (étapes 1 à 5 d'AMELIORATIONS.md, toutes exécutées le 06/09), ce qui est écarté (STRATEGIE.md § 9, AMELIORATIONS.md § 5), ce qui reste (F4, F7, F8, T12, T13, T15)                                                                                | —                                                             |

### Ce que les instruments ont mal vu — et comment on l'a su

- **Mister Qowa « déployé sans Firebase ».** Le dépôt n'a ni `vars` ni
  secret, son `deploy.yml` ne passe aucun `build-env`, le source lit
  `import.meta.env.VITE_FIREBASE_*`, `assets/index-*.js` ne contient aucune
  clé, et PARC.md (02/09) comme la mémoire de ce poste le disaient déjà. Quatre
  faits concordants, tous vrais, et la conclusion fausse : **`.env.production`
  est versionné depuis le 08/06/2026** (`.gitignore` porte `!.env.production`),
  Vite le charge au build, et le littéral — `apiKey:"AIza…"`,
  `projectId:"mister-qowa"`, `databaseURL:"…europe-west1…"` — vit dans
  `assets/app-*.js`, chunk chargé à la demande **deux niveaux d'`import()`
  sous l'entrée**. L'absence dans trois
  canaux ne prouve rien sur le quatrième, et une initialisation paresseuse ne
  laisse rien dans le chunk d'entrée. PARC.md s'y est trompé de la même façon ;
  la mémoire du poste est corrigée.
- **Des zéros muets.** Trois relevés d'adoption (« 0 `AppFooter` dans les 19
  apps », « 0 versionnage local », « 0 usage hors ligne dans molkky ») sont
  sortis de boucles à chemins **relatifs**, lancées en parallèle d'une commande
  qui avait changé de répertoire. `grep` a rendu 0 sans erreur visible. Tout
  zéro a été rejoué en chemins absolus ; les vrais chiffres sont ci-dessous. Un
  zéro est le résultat le plus suspect d'une sonde.
- **La sonde de capacités compte des mots.** `suppr_compte` trouvait 4 apps :
  2 réelles (doc, family-map), supaboss supprime des comptes _Supabase gérés_,
  quota des comptes _de services IA_. `notifications` en trouvait 3 : il y en a
  4 (le Web Push de doc n'emploie aucun des mots guettés). Le motif `i18n`
  rendait 0/20 alors que le catalogue en compte 11 : motif faux, écarté.
  `historique` et `annulation` matchent trop large (`history`, `restore`) et
  ne sont cités nulle part. `donnees_demo` et `onboarding` situent un ordre de
  grandeur (7 et 8 sur 20), pas une liste d'écrans. `garde_non_sauve` (0/20)
  n'est pas un manque : ces apps enregistrent à chaque geste.
- **Ce que personne ne voit : l'usage.** Aucune source ne dit combien de
  personnes ouvrent une app. La maturité du catalogue est une déclaration du
  propriétaire ; elle sert de poids parce que c'est ce que le barème demande.

### Le parc, en ce qui compte ici

| App               | Maturité | Backend           | « Signaler »  | Export           | Import      | Écrit hors ligne                | Supprimer son compte | Données versionnées |
| ----------------- | -------- | ----------------- | ------------- | ---------------- | ----------- | ------------------------------- | -------------------- | ------------------- |
| miss-contraction  | stable   | local             | non (maison)  | **non**          | **non**     | oui                             | s.o.                 | **non**             |
| miss-genius       | stable   | local             | oui           | oui              | oui         | oui                             | s.o.                 | oui                 |
| miss-uwh          | stable   | supabase          | oui           | oui              | oui         | oui (file)                      | non                  | oui                 |
| mister-cim10      | stable   | local             | non           | oui              | oui         | oui                             | s.o.                 | **non**             |
| mister-puzzle     | stable   | firebase          | non           | oui              | non         | oui (file)                      | s.o.                 | serveur             |
| mister-doc        | stable   | supabase          | oui           | oui              | oui (admin) | **non** (lecture seule)         | oui                  | serveur             |
| miss-badminton    | stable   | local             | non           | oui              | oui         | oui                             | s.o.                 | oui                 |
| miss-dice         | stable   | local             | non           | oui (CSV)        | non         | oui                             | s.o.                 | oui                 |
| mister-molkky     | stable   | supabase (opt-in) | non           | oui              | oui         | oui                             | non                  | **non**             |
| mister-qowa       | stable   | firebase          | non           | oui              | oui         | solo seulement                  | non                  | **non**             |
| miss-lookhouse    | beta     | supabase          | oui           | oui              | oui         | oui (file)                      | non                  | oui (maison)        |
| miss-supaboss     | beta     | api               | oui           | oui (chiffré)    | oui         | non (par choix)                 | admin                | serveur             |
| miss-supatool     | beta     | api               | oui → **404** | oui (rapport)    | non         | non (par nature)                | s.o.                 | non                 |
| mister-family-map | beta     | supabase partiel  | non           | partiel (`.ics`) | non         | local oui, supabase non         | oui                  | non                 |
| mister-miss-koh   | beta     | supabase          | oui           | **non**          | **non**     | oui                             | non                  | oui                 |
| miss-carbook      | alpha    | supabase          | non           | oui (zip)        | non         | **non** (« ne fonctionne pas ») | non                  | serveur             |
| mister-footcoach  | alpha    | local / supabase  | oui           | partiel          | non         | local oui, supabase non         | non                  | **non**             |
| miss-ticket-pwa   | alpha    | firebase          | non           | non              | non         | non (par choix)                 | non                  | non                 |
| mister-quota      | alpha    | desktop (SQLite)  | non           | oui              | oui (CSV)   | oui                             | s.o.                 | oui                 |

« Données versionnées » : un schéma avec numéro de version et chaîne de
migration (magasin versionné du socle, ou équivalent maison), c'est-à-dire ce
qui permet à une mise à jour de changer le modèle sans jeter ce que
l'utilisateur a saisi.

## 2. Le classement

Le barème, dans l'ordre : perte évitée, portée pondérée par maturité,
profondeur (impossible → possible), autonomie de l'utilisateur ; le coût ne
départage qu'à valeur égale.

| #   | Chantier                                                             | Apps (maturité)                                                            | Couche                       | Ce que l'utilisateur gagne                                                     | Coût                   |
| --- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------ | ---------------------- |
| V1  | Miss Contraction : la sauvegarde promise n'existe pas                | contraction (stable)                                                       | application                  | changer de téléphone sans perdre le journal des contractions                   | 1 j                    |
| V2  | Mister Mölkky : la synchro cloud écrase des parties                  | molkky (stable)                                                            | application                  | jouer sur deux téléphones sans perdre les parties de l'un                      | 1,5 j                  |
| V3  | Mister Puzzle : n'importe qui peut effacer n'importe quel puzzle     | puzzle (stable — 4 puzzles en base)                                        | application (règles)         | un puzzle familial ne disparaît pas parce qu'un inconnu a trouvé son code      | 1 j                    |
| V4  | Le canal de retour : « Signaler un problème » partout, et qui marche | 7 stables + supatool (beta)                                                | apps + dépôt + docteur       | pouvoir dire ce qui manque, avec version, écran et navigateur                  | 1 j + 1 min            |
| V5  | Mister Doc : la politique de confidentialité servie avec ses trous   | doc (stable)                                                               | application (texte)          | savoir qui traite ses données de planning, et sur quelle base                  | 1 h                    |
| V6  | Deux apps stables dont le garde anti-pause est cassé                 | uwh, molkky (stable)                                                       | dépôt (propriétaire)         | le direct et la synchro ne s'arrêtent pas un lundi de vacances                 | 30 min                 |
| V7  | La connexion par lien atterrit-elle ? (non vérifié)                  | doc, uwh (stable), lookhouse (beta), footcoach (alpha)                     | projet Supabase              | le chemin de connexion par défaut fonctionne                                   | 5 min à vérifier       |
| V8  | Écrire hors ligne : le squelette d'abord, Mister Doc ensuite (F7)    | doc (stable) ; carbook, footcoach, family-map ; naissances                 | squelette + socle, puis apps | poser une garde sans réseau et la voir partir plus tard                        | 1,5 j + 2 j            |
| V9  | Supprimer son compte (F4)                                            | uwh, molkky, qowa (stable), lookhouse, koh, carbook, footcoach, ticket-pwa | squelette, puis apps         | le droit à l'effacement sans écrire au mainteneur                              | 1 j + 0,5 j/app        |
| V10 | Une mise à jour ne perd jamais les données locales                   | cim10, molkky (stable), family-map, footcoach, ticket-pwa                  | applications (socle prêt)    | la prochaine évolution du modèle ne vide pas l'app                             | 0,5 j/app              |
| V11 | Mister CIM-10 : chercher un code, retrouver un compte-rendu          | cim10 (stable)                                                             | application                  | coder un terme absent du CR ; reprendre le dossier d'hier                      | 1 j                    |
| V12 | Annuler plutôt que confirmer                                         | toutes ; d'abord molkky, badminton, lookhouse, koh                         | socle + squelette, puis apps | une suppression par erreur se rattrape                                         | 1 j + 0,5 j/app        |
| V13 | Mister & miss Koh : ce qui suit le compte, et ce qui reste à l'écran | koh (beta)                                                                 | application                  | l'anti-spoiler est le même sur le téléphone et la tablette ; partager une note | 2 j                    |
| V14 | Miss Lookhouse : une source réelle                                   | lookhouse (beta)                                                           | application + collecteur     | la veille veille, sans coller des URL à la main                                | 2–3 j (sous condition) |
| V15 | Miss UWH : le bilan de l'AG en fichier, et transmis                  | uwh (stable)                                                               | application (socle `pdf`)    | envoyer le bilan au bureau depuis le téléphone                                 | 1 j                    |
| V16 | Miss Badminton : des joueurs, pas des noms                           | badminton (stable)                                                         | application                  | retrouver tous ses matchs contre X ; renommer sans perdre l'historique         | 1,5 j                  |
| V17 | Mister Family Map : l'export promis, la bascule de thème             | family-map (beta, miroir)                                                  | application                  | tenir la page « mentions » ; lire la carte la nuit                             | 0,5 j + 0,5 h          |
| V18 | Miss Genius : montrer un scénario à quelqu'un                        | genius (stable)                                                            | application                  | partager le résultat du simulateur, ou l'imprimer                              | 0,5 j                  |
| V19 | Les quatre alphas : ce qui les sépare d'un premier utilisateur       | carbook, footcoach, ticket-pwa, quota (alpha)                              | applications                 | (voir la fiche)                                                                | ≈ 6 j cumulés          |

Trois chantiers sont des **reprises** d'AMELIORATIONS.md, reclassées sur l'axe
fonctionnel et nommées comme telles : V8 (F7), V9 (F4), V10 (la note de
GISEMENTS.md sur `versioned-store`). V7 reprend le geste laissé au
propriétaire par l'étape 5. Le reste est nouveau.

---

### V1 — Miss Contraction : la sauvegarde promise n'existe pas

- **Constat mesuré.** `README.md` § « Sauvegarde et export », ligne 71 :
  « Export JSON — téléchargement ou partage natif de l'historique et des
  réglages ». `src/i18n.ts:199` : un bandeau récurrent, tous les sept jours,
  « Pensez à exporter une sauvegarde (Partager / Exporter) avant un changement
  de téléphone ». Dans `src/` : aucun `downloadText`, `createObjectURL`,
  `Blob(` — le seul import de `dev-pwa-config/download` sert à nommer le PDF
  (`midwifePdf.ts`). `e2e/export-import-navigation.spec.ts:49-62` : le test
  « export – télécharge un fichier JSON » est enveloppé dans
  `if (await exportButton.isVisible(...))` et **passe à vide** quand le bouton
  n'existe pas. Persistance : `localStorage` nu, clés `mc_contractions_v1`,
  `mc_settings_v1`, sans schéma ni chaîne de migration (`src/storage.ts`).
- **Couche.** Application ; le squelette montre le motif exact
  (`notes-file.ts`, `versioned-store.import()` avec confirmation).
- **Apps concernées.** miss-contraction (stable).
- **Ce que ça donne.** Changer de téléphone — ou le perdre en salle de
  naissance — sans perdre le journal ; un fichier que l'on peut envoyer à la
  sage-femme, dans une app dont tout l'écran « message » est fait pour
  transmettre.
- **Coût.** 1 j : magasin versionné (migration 0→1 lisant les clés `mc_*_v1`),
  export et import dans les réglages, Web Share du fichier, et le test e2e
  rendu **inconditionnel**.
- **Preuve d'achèvement.** Un e2e qui exporte, efface, réimporte et retrouve
  les contractions ; un test unitaire qui charge un `mc_contractions_v1`
  d'aujourd'hui et le lit dans le nouveau magasin ; le bandeau qui pointe vers
  un bouton qui existe.
- **Ce que ça écarte.** Un compte ou une synchro : le README promet qu'aucune
  donnée ne quitte l'appareil, et c'est une propriété de l'app.
- **Rang.** Perte évitée maximale — des données de santé sur un seul appareil,
  dans les heures où on n'a pas la tête à ça — sur une app stable, avec
  l'autonomie en prime. Premier sans discussion.

### V2 — Mister Mölkky : la synchro cloud écrase des parties

- **Constat mesuré.** `docs/cloud-sync.md:8` : « This is a **last-write-wins**
  implementation » ; ligne 59 : « Two devices editing simultaneously: last to
  push wins ». `src/cloudSync.ts:2` le répète, ligne 63 : `upsert` du blob
  entier. La fonction est opt-in, sur authentification anonyme. Le nombre
  d'utilisateurs qui l'ont activée n'est pas lisible de l'extérieur (RLS).
- **Couche.** Application.
- **Apps concernées.** mister-molkky (stable).
- **Ce que ça donne.** Jouer une partie sur le téléphone du jardin et une autre
  sur celui de la maison, et garder les deux.
- **Coût.** 1,5 j : fusion par identifiant (union des parties, des joueurs et
  des modèles ; à identifiant égal, le plus récent gagne), à la place du blob.
- **Preuve d'achèvement.** Un test « deux appareils, deux parties chacun →
  quatre parties après synchro » ; un test d'intégration contre la base liée.
- **Ce que ça écarte.** Un CRDT complet ; désactiver la synchro.
- **Rang.** Perte de données sur une app stable dont le multi-appareils est
  l'argument du catalogue. Sous V1 parce que la fonction est opt-in : la
  portée réelle est plus étroite.

### V3 — Mister Puzzle : n'importe qui peut effacer n'importe quel puzzle

- **Constat mesuré.** `database.rules.json` : `puzzles/.read: true` — tout
  l'arbre est lisible ; `$roomCode/.write: "!data.exists() || newData.val() === null"`
  — création **et suppression** sans aucune condition ; chaque champ est
  modifiable dès que le parent existe. Aucun compte (README). Le tiroir de
  navigation liste les puzzles publics avec leur code. Vérifié en ligne, en
  clés seulement : **4 puzzles** lisibles sans authentification, et un puzzle
  marqué privé rendu avec tous ses champs. Photos en base64 dans la base ;
  aucun export réimportable.
- **Couche.** Application — règles de sécurité et un propriétaire.
- **Apps concernées.** mister-puzzle (stable).
- **Ce que ça donne.** Des mois de progression et de photos qui ne
  disparaissent pas parce qu'un inconnu a trouvé le code dans la liste
  publique, ou qu'un enfant a appuyé au mauvais endroit sur un autre appareil.
- **Coût.** 1 j : authentification anonyme Firebase (`createdBy = auth.uid`),
  suppression réservée au créateur, puzzles privés sortis de la lecture
  globale (index séparé des publics), et une suite de tests de règles comme
  `rules-tests/` de qowa.
- **Preuve d'achèvement.** Le test de règles « un autre uid ne peut pas
  écrire `null` » ; la liste publique toujours servie.
- **Ce que ça écarte.** Des comptes Google : le README construit tout sur
  l'absence d'inscription, et c'est ce qui fait marcher les médiathèques et les
  écoles.
- **Rang.** Par la nature de la perte : totale, sans sauvegarde, à la portée
  de tous. Mais **quatre puzzles en base** — c'est le premier endroit où la
  mesure contredit la maturité déclarée. Un lecteur qui pèse la fréquence
  plutôt que la nature passera V3 sous V4 ; les deux se tiennent.

### V4 — Le canal de retour : « Signaler un problème » partout, et qui marche

- **Constat mesuré.** 0 issue ouverte sur les 22 dépôts. `AppFooter issues`
  (socle 4.4.0) est posé sur 8 apps ; **absent sur 7 stables sur 10** :
  contraction (pied de page maison), cim10, puzzle, badminton, dice, molkky,
  qowa (le codemod de l'étape 5 l'a raté : import entre guillemets doubles).
  miss-supatool l'affiche (`App.tsx:89`) et
  `github.com/mister-guiiug/miss-supatool/issues/new?template=bug.yml` répond
  **404** : les issues du dépôt sont désactivées (`has_issues: false` ;
  ticket-pwa aussi). Trois sites ont Google Analytics (contraction, cim10,
  carbook) ; aucun autre ne mesure quoi que ce soit.
- **Couche.** Sept applications, un réglage de dépôt, un contrôle du docteur.
- **Apps concernées.** contraction, cim10, puzzle, badminton, dice, molkky,
  qowa (stable) ; supatool (beta).
- **Ce que ça donne.** Un utilisateur peut dire ce qui lui manque, et le dire
  avec la version, le commit, l'écran et le navigateur déjà remplis. Et ce
  document cesse d'être la seule liste de souhaits.
- **Coût.** 0,5 j pour sept PR d'une ligne (contraction et cim10 à la main :
  pied de page maison) ; 1 min du propriétaire pour activer les issues sur
  supatool et ticket-pwa ; 0,5 j pour un contrôle `pwa-doctor` : `issues`
  posé ⇒ `has_issues` vrai (l'API est disponible en CI).
- **Preuve d'achèvement.** `issues/new?template=bug.yml` répond 200 sur les 19
  dépôts ; le lien vérifié dans un e2e, comme sur le squelette.
- **Ce que ça écarte.** Un formulaire de retour maison avec son backend.
- **Rang.** Portée maximale — sept stables. Pas de perte évitée, donc sous les
  trois premiers ; au-dessus de tout le reste parce que sans lui, les quinze
  chantiers suivants restent des hypothèses.
- **Rectifié le 06/09.** Trois des sept apps l'avaient déjà : **miss-dice**
  (PR #29, fusionnée à 15:10, avant même que la passe commence),
  **mister-cim10** (PR #48) et **mister-molkky**, dont les issues n'ont jamais
  eu besoin d'être activées. Et **la preuve d'achèvement était fausse** :
  `issues/new?template=bug.yml` répond **302 vers `/login`** pour une requête
  anonyme sur un dépôt sain — mes « 200 » venaient du `-L` qui suivait
  jusqu'à la page de connexion. Le signal qui discrimine est le **404**, celui
  que rendaient supatool et ticket-pwa, dont les issues étaient désactivées et
  ont été ouvertes pendant la passe. La preuve à citer est donc
  `has_issues: true`, plus la présence de `bug.yml` dans le dépôt `.github`.

### V5 — Mister Doc : la politique de confidentialité servie avec ses trous

- **Constat mesuré.** Le bundle publié contient
  `templatePlaceholder: " [À compléter] "`,
  `controllerBody: "[À compléter : nom de l'établissement / du …"`,
  `Base légale : [À compléter — p. ex. exécution d'une miss…`.
  `src/features/legal/PrivacyPolicy.tsx:7-8` l'annonce : « des PLACEHOLDERS
  que l'exploitant doit renseigner. Ne pas publier tel quel ». L'app traite
  des plannings nominatifs de médecins, avec comptes, 2FA et passkeys.
- **Couche.** Application — quatre valeurs de texte, geste du propriétaire.
- **Apps concernées.** mister-doc (stable).
- **Ce que ça donne.** L'utilisateur sait qui traite ses données et sur quelle
  base ; l'exploitant est en règle.
- **Coût.** 1 h pour les quatre valeurs ; 30 min pour un test qui refuse la
  chaîne « À compléter » dans le bundle.
- **Preuve d'achèvement.** Le test ; le site ne contient plus la chaîne.
- **Ce que ça écarte.** Retirer la page.
- **Rang.** Exposition certaine, sur une app stable de santé ; ce n'est pas
  une perte de données, donc sous V4.
- **Rectifié le 06/09.** **Déjà fait**, et fusionné par le propriétaire
  (PR #65) pendant la passe : le point de configuration unique
  (`src/features/legal/exploitant.ts`, cinq valeurs obligatoires) et le test
  qui refuse « [À compléter] » — dans la configuration, dans tout le catalogue
  i18n parcouru récursivement, et dans la page rendue en deux langues. Le
  `main` de mister-doc est **rouge exprès** tant que les valeurs ne sont pas
  posées, ce qui est le comportement voulu ; le déploiement, lui, n'en dépend
  pas et a bien eu lieu.

### V6 — Deux apps stables dont le garde anti-pause est cassé

- **Constat mesuré.** Workflow `Supabase keep-alive`, dernier run du 04/09 :
  **miss-uwh** échoue sur « `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
  manquants » — le dépôt n'a ni `vars` ni ces secrets (seulement le jeton, le
  mot de passe et l'identifiant de projet), l'URL est codée dans le bundle ;
  **mister-molkky** échoue sur « HTTP 404 — vérifier la table `keep_alive` ».
  Les deux projets répondent aujourd'hui (`/rest/v1/` → 401). Supabase Free met
  un projet en pause après sept jours sans activité ; le direct et la synchro
  de molkky, la synchro et la connexion d'uwh s'arrêteraient **en silence**.
- **Couche.** Dépôt et SQL — propriétaire.
- **Apps concernées.** miss-uwh, mister-molkky (stable).
- **Ce que ça donne.** Rien de visible tant que tout va bien ; tout, le jour
  où le projet s'endort.
- **Coût.** 15 min chacune : uwh, deux `vars` passées dans le slot `secrets:`
  du réutilisable (PARAMETRAGE.md § 2) ; molkky, `keep-alive.sql` du socle.
  Puis `gh workflow run`, pas le prochain cron.
- **Preuve d'achèvement.** Un run vert : « SELECT keep_alive → 200 ».
- **Ce que ça écarte.** Un plan payant.
- **Rang.** Perte potentielle totale, non réalisée ; propriétaire ; deux
  stables.

### V7 — La connexion par lien atterrit-elle ? (non vérifié)

- **Constat mesuré.** La connexion par lien est devenue le chemin par défaut
  le 06/09 sur lookhouse (#69), uwh (#80), doc (#64) et footcoach (#52).
  AMELIORATIONS.md, « Ce qui reste, et à qui » : l'adresse de chaque app doit
  être dans la liste d'URL autorisées de son projet Supabase, un projet neuf
  n'autorisant que `http://localhost:3000` ; « le lien part et n'arrive nulle
  part ». Le jeton disponible ne voit que les projets de koh et molkky : **ni
  vérifiable, ni réfutable d'ici**.
- **Couche.** Projet Supabase — propriétaire.
- **Apps concernées.** doc, uwh (stable), lookhouse (beta), footcoach (alpha).
- **Ce que ça donne.** Le bouton « Recevoir un lien » mène quelque part.
- **Coût.** 5 min pour vérifier — s'envoyer un lien depuis chaque site ;
  10 min par projet si c'est à poser.
- **Preuve d'achèvement.** Quatre liens reçus qui ouvrent l'app connectée.
- **Ce que ça écarte.** Remettre le mot de passe par défaut.
- **Rang.** Conditionnel : si c'est cassé, le chemin de connexion par défaut
  de deux stables est mort et ce chantier passe deuxième ; si c'est bon, il
  disparaît. Placé ici parce que la vérification coûte cinq minutes.

### V8 — Écrire hors ligne : le squelette d'abord, Mister Doc ensuite (F7)

- **Constat mesuré.** Une file d'écritures hors ligne existe dans uwh et
  lookhouse (maison, sur `sync-queue` du socle), puzzle (file de pièces) et
  koh (notes et favoris resynchronisés). Elle **manque** dans doc — lecture
  seule hors ligne, cache IndexedDB et bandeau (`idbCache.ts`,
  `OfflineBanner.tsx`) —, carbook (« hors connexion, l'application ne
  fonctionne pas », `OfflineBanner.tsx:9-16`), footcoach et family-map en mode
  Supabase, et dans le squelette. Côté socle, `react/use-offline-queue` et
  `react/sync-status-badge` ont **zéro adoptant**.
- **Couche.** Squelette + socle (assemblage du port des notes sur la file et
  le badge), puis doc.
- **Apps concernées.** doc (stable) ; carbook, footcoach (alpha) et family-map
  (beta) par le motif ; toute naissance.
- **Ce que ça donne.** Un médecin en salle de garde sans réseau pose une garde
  et la voit partir plus tard ; un conflit d'occupant est tranché au rejeu et
  **dit**, pas perdu.
- **Coût.** 1,5 j squelette (port → file, badge d'état, e2e « ajouté hors
  ligne, présent après reconnexion ») ; 2 j doc, parce qu'un créneau a un seul
  occupant et que deux médecins hors ligne peuvent le prendre.
- **Preuve d'achèvement.** L'e2e hors ligne du squelette ; sur doc, un test
  « affectation hors ligne puis conflit → notification, rien de perdu ».
- **Ce que ça écarte.** Un cache hors ligne en lecture seule (doc l'a) ; un
  CRDT.
- **Rang.** Profondeur maximale sur une stable, et un motif qui part dans
  chaque naissance ; mais le besoin en salle de garde est une hypothèse, pas
  un constat — sous les certitudes.
- **Rectifié le 06/09.** Le comptage d'adoption était faux, et de la même
  façon que le « `FamilyApps` à un adoptant » d'août : **`sync-queue` a trois
  adoptants** (miss-uwh, miss-lookhouse et mister-doc), **`sync-status-badge`
  en a un** (mister-doc) ; seul `use-offline-queue` est à zéro. Surtout, les
  deux `syncQueue.ts` que je citais comme « le motif écrit à la main deux
  fois » **importent déjà `createSyncQueue` du socle** : ce n'est pas une
  duplication, c'est une adoption. Ce qui manquait au squelette n'était donc
  pas la file, c'était **le branchement d'un port dessus** — un chantier plus
  petit, et mieux placé.

### V9 — Supprimer son compte (F4)

- **Constat mesuré.** Présent : mister-doc (RPC `anonymize_doctor`,
  `PrivacyCard.tsx`), mister-family-map (port `requestAccountDeletion`,
  `ProfilePage.tsx:62-71`) — F4 disait « aucune app ne l'offre », c'était
  faux. Absent : uwh (`wipeLocal` purge le miroir local seulement), molkky
  (anonyme, blob cloud non effaçable), lookhouse, koh (README : « reste à
  faire »), carbook (le README renvoie « au fournisseur »), footcoach (spec
  § 21.2), qowa (compte Google et historique Firestore), ticket-pwa, et le
  squelette (`signOut` seul).
- **Couche.** Squelette d'abord — migration `delete_my_account()`, carte
  « Zone dangereuse », assertion pgTAP « plus une ligne » —, puis apps.
- **Apps concernées.** uwh, molkky, qowa (stable) ; lookhouse, koh (beta) ;
  carbook, footcoach, ticket-pwa (alpha).
- **Ce que ça donne.** Le droit à l'effacement sans écrire au mainteneur.
- **Coût.** 1 j squelette avec sa preuve — dont la vérification, **non faite
  ici**, qu'une fonction `security definer` peut effacer dans `auth.users` sur
  un projet hébergé ; 0,5 j par app Supabase ; qowa : `deleteUser` et purge
  Firestore.
- **Preuve d'achèvement.** pgTAP « après suppression, plus une ligne dans
  `profiles`, `notes`, `user_roles` » ; un e2e par app.
- **Ce que ça écarte.** La suppression par e-mail.
- **Rang.** Impossible → possible sur huit apps dont trois stables, et une
  obligation ; pas de perte évitée.
- **Rectifié le 06/09 — LA RÉSERVE EST FERMÉE.** L'hypothèse écrite dans
  AMELIORATIONS.md depuis le 05/09 — « qu'une fonction `security definer`
  appartenant à `postgres` puisse effacer dans `auth.users` sur un projet
  hébergé, documenté par Supabase mais **non vérifié ici** » — est **prouvée
  quatre fois**, par quatre chantiers indépendants, et la quatrième preuve est
  la bonne :

  | Où               | Ce qui a été mesuré                                                                                                                                 |
  | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
  | miss-lookhouse   | pile locale du runner : 22 lignes avant, plus une après ; `rolsuper(postgres)` faux                                                                 |
  | pwa-starter-kit  | `aclexplode` sur `relacl` : le droit vient d'un **grant explicite ou de la propriété**, ni l'un ni l'autre n'étant un privilège de superutilisateur |
  | miss-uwh         | `has_table_privilege(postgres, auth.users, DELETE)` vrai, `rolsuper` faux, table possédée par `supabase_auth_admin`                                 |
  | **miss-carbook** | **sonde en lecture seule sur un projet HÉBERGÉ** : mêmes droits, RLS active sans FORCE et sans politique, `authenticated` sans `DELETE`             |

  Le repli par anonymisation n'a donc été livré nulle part, et n'a pas à
  l'être. Le point à retenir, écrit par le squelette : **ce droit est un
  `GRANT` de la plateforme, donc révocable sans préavis** — d'où l'assertion
  qui le mesure, pour l'apprendre ce jour-là et non par le premier utilisateur
  qui demande son effacement.

  **La portée exacte, à ne pas surinterpréter** — mister-footcoach a eu raison
  d'insister : l'**effet** (« plus une ligne ») est établi sur des piles
  **jetables**, et le **mécanisme** (les droits qui le rendent possible) sur un
  projet **hébergé**. Personne, sur ce parc, n'a encore effacé un compte
  hébergé par cette voie. C'est assez pour livrer, ce n'est pas assez pour
  cesser de mesurer : chaque suite garde l'assertion qui nomme la source du
  droit, et non celle qui se contente de constater le succès.

### V10 — Une mise à jour ne perd jamais les données locales

- **Constat mesuré.** Persistance **sans** schéma ni migration : cim10
  (`localStorage` nu, une migration de clés unique), molkky (`zustand/persist`,
  clés `mm_*`, sans version), footcoach (`JSON.stringify` de tout l'état,
  `AppContext.tsx:413-430`), family-map (`createStore('mfm_')`, non
  versionné), ticket-pwa, supatool. **Avec** : genius, uwh, koh (magasin
  versionné du socle), badminton (`mb_data_version`, zod, copie `*_invalid_*`),
  dice (`{ v, state }`), lookhouse (`{ v, data }`), puzzle (`schemaVersion`
  côté serveur). Contraction est réglée par V1. AMELIORATIONS.md comptait 485
  appels directs à `localStorage`.
- **Couche.** Applications — le socle est prêt (`versioned-store`, copie de
  côté avant toute perte).
- **Apps concernées.** cim10, molkky (stable) ; family-map (beta) ; footcoach,
  ticket-pwa (alpha).
- **Ce que ça donne.** La prochaine évolution du modèle ne vide pas l'app ;
  une donnée illisible est mise de côté, pas jetée.
- **Coût.** 0,5 j par app : la migration 0→1 lit les clés d'aujourd'hui.
- **Preuve d'achèvement.** Un test par app qui charge un instantané des clés
  actuelles et retrouve tout.
- **Ce que ça écarte.** IndexedDB partout (badminton l'a fait ; ce n'est pas
  la question).
- **Rang.** Perte latente, invisible tant qu'un modèle ne change pas — et
  molkky en change (`docs/cloud-sync.md` prévoit des champs). Milieu.
- **Rectifié le 06/09.** Faux **à un cinquième** pour mister-molkky :
  `mm_match` portait bien `version: 3` **et** sa chaîne de migrations 0 → 3.
  Le défaut réel était sur les **quatre autres** clés (`mm_players`,
  `mm_settings`, `mm_sync`, les modèles), en `version: 1` **sans `migrate`** —
  le cas où `zustand/persist` ne garde rien. Le chantier reste juste, son
  constat était trop large. Le message du commit hérité le disait déjà : il
  aurait fallu le lire avant d'écrire la fiche.

### V11 — Mister CIM-10 : chercher un code, retrouver un compte-rendu

- **Constat mesuré.** Le README utilisateur présente comme livrées dix
  fonctions que sa propre section technique (ligne 212, « Fonctionnalités
  reportées ») et `docs/context.md` classent « Reporté » : dictée, recherche
  manuelle de code, sessions nommées, favoris, annuler/rétablir, surlignage,
  réordonnancement, historique des cinq derniers CR, raccourci, et l'appel réel
  à l'OMS (`// TODO` dans `handleAnalyze`, alors que `src/lib/oms.ts` existe et
  que les réglages laissent choisir le mode). L'aide en ligne (`HelpPage.tsx`)
  ne promet rien de tout cela — vérifié. Deux de ces dix sont ce qu'un DIM
  attend d'abord : **chercher un code par libellé** (aujourd'hui : un filtre
  sur les suggestions du CR) et **retrouver le dossier d'hier** (`LS_KEYS.
SESSIONS` réservé, inutilisé).
- **Couche.** Application.
- **Apps concernées.** mister-cim10 (stable).
- **Ce que ça donne.** Coder un séjour dont le terme n'est pas dans le
  compte-rendu ; reprendre un dossier.
- **Coût.** 1 j — la recherche par trigrammes est déjà dans `analyzer.ts`,
  l'historique est cinq sessions nommées ; 0,5 h pour remettre le README au
  vrai.
- **Preuve d'achèvement.** Un e2e « taper "diabète", choisir E11, exporter » ;
  un test du magasin d'historique ; un README sans fonction fantôme.
- **Ce que ça écarte.** Brancher l'OMS (elle renvoie du CIM-11) ; remplacer
  le dictionnaire d'échantillon de 147 codes — un référentiel complet est une
  décision de licence, pas un chantier.
- **Rang.** Stable, professionnels de santé, promesse écrite ; pas de perte
  évitée.
- **Rectifié le 06/09 — LE MODE OMS N'EST PAS CASSÉ.** J'écrivais qu'un
  `// TODO` dans `HomePage.handleAnalyze` laissait le réglage `api`/`both`
  sans effet, et que l'écran ne disait pas que l'OMS rend du CIM-11. Les deux
  sont faux, et l'étaient déjà : il n'y a **aucun `// TODO` dans `src/`**,
  `suggestFromOms` est appelé depuis la **PR #31**, et l'écran affiche
  « CIM-11 » en français et en anglais — badge, modes et réglages. Il n'y a
  donc pas de réglage qui ne fait rien. Les deux fonctions réellement
  manquantes (chercher un code par libellé, retrouver un dossier) l'étaient
  bien, et sont livrées.

### V12 — Annuler plutôt que confirmer

- **Constat mesuré.** `ConfirmDialog` du socle : 14 apps. `useUndoableState`
  du socle : **0**. Annulation après suppression d'un enregistrement : nulle
  part — contraction a un bandeau maison de 30 s après _enregistrement_
  (`Banners.tsx`, `UNDO_MS`), pas après suppression ; badminton, molkky et
  dice annulent un _coup_, pas une ligne d'historique. Suppression logique
  sans écran de restauration : koh (`deleted_at`), family-map (`deletedAt`).
  uwh l'a (écran Audit). Le `toast` du socle n'a pas d'action.
- **Couche.** Socle (`toast` avec action et délai), squelette (supprimer une
  note → « Annulé » huit secondes), puis apps.
- **Apps concernées.** Toutes ; d'abord molkky et badminton (historique),
  lookhouse (une recherche porte des critères longs à ressaisir), koh et
  family-map (une vue « corbeille » sur la suppression logique qui existe
  déjà).
- **Ce que ça donne.** Une suppression par erreur se rattrape, sans dialogue
  préalable à chaque geste.
- **Coût.** 1 j socle + squelette ; 0,5 j par app.
- **Preuve d'achèvement.** Le test du toast ; un e2e « supprimer, annuler,
  présent » sur le squelette.
- **Ce que ça écarte.** Une corbeille généralisée.
- **Rang.** Perte évitée petite (une ligne), portée large ; confort.
- **Rectifié le 06/09.** Deux choses. Le squelette l'avait **déjà** (PR #14,
  fusionnée pendant la passe). Et **le socle n'était pas un préalable** : je
  plaçais le chantier sur `react/toast`, alors que les `ToastProvider` des
  apps acceptent déjà un `ReactNode` et une durée par appel — un bouton dans
  la notification suffit. L'action livrée au socle (PR #218) reste utile,
  elle porte le libellé en sept langues et l'habillage ; elle n'était pas
  bloquante. Corollaire découvert au passage : `components.css` n'habillait
  pas `footer-issues`, posé par la 4.4.0 — noir sur violet nuit, contraste
  1,08, **huit apps en production** (PR #220, fusionnée).

### V13 — Mister & miss Koh : ce qui suit le compte, et ce qui reste à l'écran

- **Constat mesuré.** Les notes vivent sur le serveur ; favoris et épisodes
  vus vivent dans le magasin local (`useAppStore.ts`, README l'assume) :
  l'anti-spoiler n'est donc pas le même d'un appareil à l'autre. Partage d'une
  note par lien révocable et profil : tables `share_links`, fonction à jeton
  et politiques **prêtes et testées**, écrans absents (README « Ce qui reste à
  faire » ; `NotesScreen.tsx:14-16` : « il ne partage rien »). Ni export ni
  import.
- **Couche.** Application.
- **Apps concernées.** mister-miss-koh (beta).
- **Ce que ça donne.** Marquer un épisode vu sur le téléphone et le retrouver
  sur la tablette ; envoyer une note à un ami sans lui divulgâcher la suite.
- **Coût.** 1 j (favoris et vus dans une table personnelle, repli local
  conservé) + 1 j (les deux écrans sur l'existant).
- **Preuve d'achèvement.** Les pgTAP existants plus « vu sur A, lu sur B » ;
  un e2e du lien de partage.
- **Ce que ça écarte.** Les résumés d'épisodes (écartés par nature : faits
  tabulaires seulement).
- **Rang.** Beta ; profondeur réelle ; pas de perte.
- **Rectifié le 06/09.** **Aucune migration n'était nécessaire** :
  `user_favorites`, `watched_episodes`, `profiles` et `handle_is_available`
  existent depuis la migration **0003**, avec leur politique « chacun les
  siens » depuis la **0004**. Il ne manquait que le câblage — rien à appliquer
  côté Supabase. Et **le partage de note a été livré par le propriétaire
  pendant la passe** (PR #22), qui a corrigé à la racine un défaut que
  l'exécution avait trouvé de son côté : `get_shared_note` joignait `profiles`
  en jointure **interne** alors que rien ne crée de profil à l'inscription —
  un lien valide n'ouvrait rien.

### V14 — Miss Lookhouse : une source réelle

- **Constat mesuré.** README : moteur d'ingestion générique et _dry-run_
  livrés, **aucune source réelle câblée** ; l'entrée est manuelle (URL, JSON,
  bookmarklet). Le collecteur `TestHome` (dépôt isolé, connecteur WordPress
  REST livré et testé) est la source évidente ; le risque juridique — droit
  _sui generis_ des bases, conditions des portails — est documenté et non
  tranché.
- **Couche.** Application et collecteur.
- **Apps concernées.** miss-lookhouse (beta).
- **Ce que ça donne.** La veille veille.
- **Coût.** 2–3 j pour un connecteur d'agence sur WordPress REST, **à
  condition** d'une décision écrite sur la base juridique — sans elle, le
  chantier n'existe pas.
- **Preuve d'achèvement.** Un run d'ingestion planifié qui ajoute des annonces
  réelles, dédoublonnées, avec leur historique de prix.
- **Ce que ça écarte.** Scraper les portails (README et mémoire du parc : non).
- **Rang.** C'est la raison d'être de l'app ; beta, coût élevé, condition
  préalable : milieu bas.

### V15 — Miss UWH : le bilan de l'AG en fichier, et transmis

- **Constat mesuré.** README ligne 31 : « exports PDF/CSV/Excel pour
  l'assemblée générale » ; ligne 253, plus honnête : « PDF (impression) » —
  c'est `window.print()` (`BilanScreen.tsx:133`). Aucun partage (`navigator.
share` absent de `src/`). XLSX, CSV, iCal, attestation : présents. Les
  échéances de licences et d'assurances sont calculées et affichées, jamais
  notifiées hors de l'app.
- **Couche.** Application — le socle a `pdf` (`buildPdf`, `downloadPdf`) et
  `shareOrCopy` ; contraction montre le motif dans `midwifePdf.ts`.
- **Apps concernées.** miss-uwh (stable).
- **Ce que ça donne.** Le trésorier envoie le bilan au bureau depuis le
  téléphone, en un fichier, sans dialogue d'impression.
- **Coût.** 1 j.
- **Preuve d'achèvement.** Un test du PDF (le texte du bilan s'y trouve) ; un
  e2e du bouton.
- **Ce que ça écarte.** L'OCR des justificatifs (README, hors budget).
- **Rang.** Stable ; confort ; promesse tenue à moitié.

### V16 — Miss Badminton : des joueurs, pas des noms

- **Constat mesuré.** `docs/context.md` — le cahier des charges — demande
  « créer des profils d'utilisateurs » et « suivre les statistiques des
  joueurs » ; livré : une liste de noms pour l'autocomplétion
  (`PlayerNamesSchema`), un classement et des confrontations recalculés à la
  volée depuis l'historique ; pas de recherche par joueur. Rive imposé par le
  même document, aucun `.riv` livré. Le README ne décrit aucune fonction
  produit.
- **Couche.** Application.
- **Apps concernées.** miss-badminton (stable).
- **Ce que ça donne.** Retrouver « tous mes matchs contre X » ; renommer un
  joueur sans perdre son historique.
- **Coût.** 1,5 j — entité joueur avec identifiant, migration des noms
  (badminton a déjà son versionnage).
- **Preuve d'achèvement.** Le test de migration noms → profils ; un e2e du
  filtre par joueur.
- **Ce que ça écarte.** Tournois et poules : hypothèse, demandée par personne.
- **Rang.** Stable ; confort ; promesse du cahier des charges.

### V17 — Mister Family Map : l'export promis, la bascule de thème

- **Constat mesuré.** `LegalPage.tsx:46` promet à l'utilisateur d'« exporter
  ses contributions » — aucun export dans `ProfilePage` ni
  `MyContributionsPage`. Les jetons `[data-theme='dark']` existent en CSS,
  aucun `ThemeProvider` n'est monté (`main.tsx`, `RootLayout.tsx`). Un seul
  port a un adaptateur Supabase (`PlaceRepository`), les dix autres restent
  locaux (README « Restes à faire »). Miroir : toute PR va sur `bac-sable`,
  jamais sur le miroir.
- **Couche.** Application.
- **Apps concernées.** mister-family-map (beta).
- **Ce que ça donne.** Tenir la page « mentions » ; lire la carte la nuit.
- **Coût.** 0,5 j (export JSON des contributions) + 0,5 h (le fournisseur de
  thème) ; les adaptateurs Supabase, 3 j, seulement si l'app ouvre au public.
- **Preuve d'achèvement.** Un e2e d'export ; la bascule visible.
- **Ce que ça écarte.** `event_occurrences` (noté dans `DATA-MODEL.md`, sans
  demande).
- **Rang.** Beta ; une promesse écrite, mais petite.

### V18 — Miss Genius : montrer un scénario à quelqu'un

- **Constat mesuré.** Export et import JSON présents ; ni partage, ni
  impression, ni lien. Le cœur de l'app — « quelle note au prochain contrôle
  pour atteindre X » — se montre à un parent ou à un professeur en tendant le
  téléphone. Le README § 12 annonce synchro, CSV, badges et Rive : feuille de
  route, pas promesse à l'utilisateur.
- **Couche.** Application — `shareOrCopy` et `pdf` du socle.
- **Apps concernées.** miss-genius (stable).
- **Ce que ça donne.** Partager un scénario en texte (Web Share), ou
  l'imprimer.
- **Coût.** 0,5 j.
- **Preuve d'achèvement.** Un e2e du bouton ; un test du texte partagé.
- **Ce que ça écarte.** Comptes et synchro : l'app est locale par nature.
- **Rang.** Aucun document ne le demande : hypothèse, donc bas malgré la
  maturité.

### V19 — Les quatre alphas : ce qui les sépare d'un premier utilisateur

Une fiche par app vaudrait quatre fiches pour zéro utilisateur ; le barème les
met dernières. Ce que chacune porte, pour mémoire :

- **miss-carbook** — l'export ZIP n'est pas réimportable (aucune restauration
  après suppression d'un dossier), aucune lecture hors ligne d'un dossier déjà
  ouvert (en concession, sans réseau), pas de suppression de compte (V9), pas
  de corbeille dans un dossier où plusieurs personnes écrivent ; le README
  promet JSON/CSV depuis la comparaison. Déploie à nouveau depuis le 02/09.
- **mister-footcoach** — `localStorage` brut sans version (V10), aucun import,
  aucune feuille de match imprimable ; sa propre spec (§ 21.2) liste rappels
  J-1, abonnement iCal, RGPD, photos.
- **miss-ticket-pwa** — aucun historique des sessions (l'app oublie tout dès
  qu'une session s'arrête), pas de push alors que le cas d'usage est
  « surveiller une file » ; issues désactivées.
- **mister-quota** — les connecteurs Cursor et Claude sont **factices**
  (`TODO: replace with real HTTP call`) : la collecte automatique annoncée
  n'existe pas ; export sans import symétrique. Application Electron, hors
  parc PWA.

Coût cumulé ≈ 6 j ; preuves par app, comme ci-dessus.

**Rectifié le 06/09**, sur miss-carbook et mister-quota :

- **L'export JSON/CSV depuis la comparaison EXISTE.** `CompareTab.tsx` porte
  `exportJson` et `exportCsv`, câblés à deux boutons dédiés, avec leur
  `toCsv()`. Le README disait vrai ; le bouton ZIP est une autre fonction,
  ailleurs (Réglages → Données). Rien n'a été livré sur ce point.
- **Le README de carbook ne parlait pas de suppression de compte.** « Passer
  par le fournisseur » n'apparaît que dans un bloc développeur sur
  _Authentication → Providers_. Il n'y avait pas de phrase à corriger : une
  section « Vos données, et comment partir » a été **ajoutée**.
- **mister-quota n'a aucun `node --test`.** Ses huit fichiers de test tournent
  tous sous Vitest. Le « `node --test` et Vitest y coexistent » venait d'une
  lecture trop rapide de son `package.json`.

## 3. Ce qu'on ne propose pas, et pourquoi

- **Réparer le Firebase de qowa.** Il est configuré (§ 1). Ce qui reste vrai :
  App Check n'est pas activé en production (`app.ts:54` le journalise, le
  README le liste) — une question d'abus, pas de fonction ; à surveiller.
- **Rien pour le générateur.** Il livre ce que le squelette contient et le
  construit avant de publier ; sa valeur fonctionnelle est celle du squelette.
  Un détail : `pwa-starter-kit/package.json` dit `0.1.0` sous l'étiquette
  `v1.2.0` — une app engendrée naît en `0.1.0`, ce qui est juste ; le site du
  squelette, lui, se dit `0.1.0`.
- **« Nouveautés » après mise à jour (F8), un jeu de démonstration et un
  partage à la naissance.** Vrais, petits, et sans demande ; après V8, V9 et
  V12, qui sont ce qu'une naissance doit porter.
- **Réécrire les README** de dice (deux fichiers cités qui n'existent plus,
  le jeu Pig absent), badminton (aucune fonction décrite), genius (arborescence
  périmée) : de la documentation, pas de la valeur — sauf quand le README
  promet une fonction absente, et ces cas-là sont dans V1, V11, V15, V17.
- **L'egress de supaboss** (le fournisseur n'a pas d'API), **la reprise
  d'une migration** de supatool (les clés ne doivent pas survivre à l'onglet).
- **Mesurer l'audience partout.** Trois sites ont Google Analytics ; en
  poser quinze de plus est une décision de vie privée du propriétaire, pas un
  chantier de valeur. Ce que le classement gagnerait à savoir est en § 5.
- **Ce qui était déjà écarté** — routage par chemin, ADR rétro-écrites, couche
  auth par campagne, `--backend`, gabarits dans le générateur, paquet npm,
  organisation, monodépôt, portail — le reste.

## 4. Réserves de mesure

- **V7 n'est ni vérifié ni réfuté.** Le jeton disponible ne voit pas les
  projets de doc, uwh, lookhouse et footcoach ; s'envoyer un lien depuis
  chaque site est la seule preuve, et elle prend cinq minutes.
- **La portée est déclarée.** La maturité vient du catalogue ; aucune app ne
  publie de compteur, trois ont Google Analytics (contraction, cim10,
  carbook) que seul le propriétaire peut lire. Puzzle : quatre puzzles en
  base. Molkky : le nombre d'utilisateurs de la synchro cloud est derrière la
  RLS. Qowa : l'historique Firestore n'est pas lisible anonymement. Si les
  chiffres GA de contraction et cim10 sont faibles, V1 et V11 descendent ; ils
  ne disparaissent pas.
- **Les hypothèses sont des hypothèses.** Le besoin hors ligne d'un médecin en
  salle de garde (V8), le partage d'un scénario (V18), les profils de
  badminton au-delà du cahier des charges (V16) : personne ne les a demandés.
  V4 est le seul moyen de le savoir.
- **La sonde de capacités** compte des fichiers portant des mots ; ses faux
  positifs et négatifs connus sont en § 1. Les comptages « démo » et
  « onboarding » n'ont pas servi au classement.
- **V9 suppose** qu'une fonction `security definer` appartenant à `postgres`
  peut effacer dans `auth.users` sur un projet hébergé ; c'est ce que
  l'assertion pgTAP doit prouver avant toute publication (réserve déjà écrite
  dans AMELIORATIONS.md, toujours ouverte).
- **Les coûts** sont ceux d'une personne connaissant le parc, hors imprévu de
  chaîne d'outils ; la journée du 06/09 en a compté quatre.
- **Le relevé lit les copies de travail** tirées le 06/09 au soir. Trois
  dépôts n'ont été que fetchés (contraction : cinq modifications locales d'une
  autre session ; ticket et claude-skills sur une branche). Pour contraction,
  ces modifications ne touchent que trois specs e2e visuelles et un script ;
  les quatre constats de V1 (README, bandeau, absence de code d'export, test
  conditionnel) ont été relus sur `origin/main` et y sont identiques.

### Ajoutées le 06/09 au soir, apprises en exécutant

- **CE DOCUMENT VIEILLIT EN HEURES, PAS EN SEMAINES.** Il a été relevé sur des
  copies de travail tirées à un instant donné, et le propriétaire fusionne en
  minutes — quatre-vingts secondes pour miss-lookhouse, quatre minutes pour
  mister-footcoach. Six constats étaient **déjà périmés au moment où je les
  écrivais**, et un septième l'est devenu pendant l'exécution. Toute reprise
  de ce document commence par `git fetch` et une comparaison, jamais par le
  texte. Un agent a failli détruire une PR fusionnée pendant son travail en
  faisant `git reset --soft origin/main` : il l'a vu au `git status`.
- **La « preuve d'achèvement » d'un chantier peut être fausse elle aussi.**
  Celle de V4 demandait un `200` que GitHub ne rend jamais anonymement. Une
  preuve se vérifie avant d'être exigée.
- **Le piège du port de test est plus étroit que je ne l'ai dit.** Le socle
  force `reuseExistingServer: !CI && !preview` : une app en `preview: true`
  échoue **bruyamment** sur `--strictPort` au lieu de tester silencieusement
  une autre application. Le cas silencieux est réel — il a frappé
  mister-qowa et mister-quota, sur le **5173**, pas le 4173 — mais il ne
  concerne que les dépôts sans `preview`.
- **Les e2e désactivés cachent des tests morts.** Là où `run-e2e: false`,
  l'exécution a trouvé 4 specs mortes sur 9 (mister-molkky, cause : la locale
  — Chromium se présente en `en-US` et l'app suit `navigator.language`), 5
  tests qui ne pouvaient pas échouer (mister-cim10) et 2 specs mobiles
  pourries (miss-badminton). Un chiffre de couverture e2e ne vaut rien sans
  savoir si la suite est jouée.
- **La couverture n'est pas identique Linux/Windows**, contrairement au
  commentaire de `vitest.config.ts` de mister-footcoach qui justifie sa
  tolérance zéro : jusqu'à 0,39 point d'écart au même commit, et des totaux
  d'unités différents — donc pas un arrondi.
- **Ce que le relevé ne pouvait pas voir : les gardes ne s'exécutaient pas.**
  Quatre des cinq bins du socle ne lançaient `run()` que si
  `import.meta.url === pathToFileURL(process.argv[1]).href` ; sous le lien
  symbolique que npm pose dans `.bin`, la comparaison est fausse et le module
  sort **0** sans rien faire. Toute mention de `pwa-doctor` ou de
  `pwa-bundle-budget` « en CI », ici comme dans AMELIORATIONS.md, décrivait
  donc un décor. Corrigé par la PR #219 du socle, fusionnée le soir même ; conséquence mesurée avant
  fusion : côté docteur rien ne casse, côté budget **deux apps sont déjà
  au-dessus de leur borne** — dont miss-carbook, dont le build de déploiement
  pèse ≈ 524 kB pour 505 déclarés, l'écart venant du chunk `supabase` qui
  n'apparaît que si les variables sont fournies.

## 5. Le premier geste

**V1.** Miss Contraction a une lectrice qui, à un moment précis, voudra
retrouver ses contractions sur un autre téléphone ; l'app le lui promet
depuis des mois et ne peut pas. Une journée : le magasin versionné avec sa
migration des clés `mc_*_v1`, export et import dans les réglages sur le motif
du squelette, Web Share du fichier, et le test e2e rendu inconditionnel —
celui qui aurait dû rougir.

Dans la première heure : lire `src/storage.ts` et `SettingsView.tsx` ; écrire
le test qui charge un `mc_contractions_v1` réel dans le nouveau magasin, et le
voir échouer ; retirer le `if` de `export-import-navigation.spec.ts:55`.

Et, pendant que la journée tourne, les cinq minutes de V7 et les trente de
V6 : elles ne coûtent rien et peuvent tout changer.

---

## 6. Ce que l'exécution a démenti — bilan du 06/09/2026 au soir

Les dix-neuf chantiers ont été lancés le jour même de l'analyse, un agent par
dépôt. Ce qui suit n'est pas la liste de ce qui a été livré (elle est dans les
PR) mais **la liste de ce que ce document affirmait à tort**, parce que c'est
la partie réutilisable.

### Onze constats faux ou périmés

| Fiche | Ce que j'écrivais                                                                                 | Ce qui était vrai                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| V4    | miss-dice, mister-cim10 et mister-molkky n'ont pas de canal de retour                             | dice l'avait (PR #29, fusionnée à 15:10, **avant la passe**), cim10 aussi (#48), et les issues de molkky n'ont jamais été fermées |
| V4    | preuve : `issues/new?template=bug.yml` répond **200**                                             | il répond **302 vers `/login`** sur un dépôt sain ; mes 200 venaient du `-L`. Le signal est le **404**                            |
| V5    | mister-doc sert « [À compléter] »                                                                 | déjà corrigé et fusionné (#65) **pendant** la passe                                                                               |
| V8    | `sync-queue`, `use-offline-queue`, `sync-status-badge` : zéro adoptant                            | 3, 0 et 1. Et les deux `syncQueue.ts` cités **importent déjà** le module du socle                                                 |
| V9    | « hypothèse non vérifiée » qu'une fonction `security definer` efface dans `auth.users`            | **prouvée quatre fois**, dont une sur projet hébergé                                                                              |
| V10   | mister-molkky persiste sans version                                                               | `mm_match` portait `version: 3` et sa chaîne ; le défaut était sur les **quatre autres** clés                                     |
| V11   | le mode OMS de cim10 ne fait rien (`// TODO`)                                                     | aucun `// TODO` ; `suggestFromOms` appelé depuis #31 ; l'écran dit déjà « CIM-11 »                                                |
| V12   | le squelette confirme au lieu d'annuler                                                           | déjà livré et fusionné (#14) pendant la passe                                                                                     |
| V12   | le chantier passe par `react/toast` du socle                                                      | les `ToastProvider` des apps acceptent déjà un `ReactNode` et une durée : le socle n'était pas bloquant                           |
| V13   | migration SQL à écrire pour les favoris                                                           | tables et politiques existent depuis **0003/0004** ; il manquait le câblage                                                       |
| V19   | carbook n'exporte pas en JSON/CSV depuis la comparaison, et son README renvoie « au fournisseur » | l'export **existe** (`CompareTab.tsx`) et le README ne parlait pas de suppression de compte                                       |

Deux erreurs de méthode s'y ajoutent, décrites en § 4 : le piège du port de
test est plus étroit que je ne l'ai dit, et mister-quota n'a aucun
`node --test`.

### La cause, et ce qu'elle impose

**Le parc bouge plus vite que le document qui le décrit.** Six constats
étaient périmés à l'écriture, un septième l'est devenu pendant l'exécution.
La règle qui en sort tient en une ligne : _toute reprise de cette analyse
commence par un `git fetch` et une comparaison, jamais par le texte._ Aucun
agent n'a re-livré du déjà fusionné, parce que la consigne « vérifie avant de
refaire, et si le constat est faux, dis-le et arrête-toi » était explicite —
c'est le garde-fou qui a le mieux payé de la journée.

### Ce que l'exécution a trouvé et que l'analyse n'avait pas vu

Neuf défauts, tous absents de ce document, tous trouvés en exécutant :

- **miss-contraction** — le bandeau d'annulation s'affiche à **chaque
  chargement** (`lastCountRef` part de 0) : ouvrir l'app proposait d'annuler un
  enregistrement qu'on n'avait pas fait, et « Annuler » supprime une vraie
  contraction. Il masquait en outre le rappel de sauvegarde trente secondes
  après chaque chargement — donc V1 ne tenait pas sans le corriger.
- **miss-uwh** — `function digest(text, unknown) does not exist` : en mode
  Supabase, **clôturer ou rouvrir une saison échouait systématiquement**
  (`search_path = public` alors que la plateforme pose `pgcrypto` dans
  `extensions`). Trouvé parce que les migrations ont tourné pour de vrai.
- **miss-lookhouse** — le workflow `Supabase migrations` a échoué à ses **huit
  exécutions depuis juin 2026** ; le dépôt n'a ni secret ni variable. La PR
  fusionnée y a mis en ligne une carte « Zone dangereuse » qui appelle une
  fonction inexistante : elle échoue proprement, mais elle promet.
- **miss-carbook** — le build de déploiement pèse **≈ 524 kB pour 505
  déclarés**, sur `main` déjà, et rien ne le mesurait.
- **le socle** — `components.css` n'habillait pas `footer-issues`, posé par la
  4.4.0 : contraste **1,08**, huit apps en production (PR #220, fusionnée).
- **mister-qowa** — un commentaire de `firestore.rules` annonçait que le compte
  « s'efface » au-dessus d'un `allow update, delete: if false;` inchangé.
- **miss-ticket-pwa** — l'effet de notifications compare une session **à
  elle-même** : les alertes « page d'achat atteinte » et « erreur » ne partent
  jamais.
- **miss-genius** — contraste **2,35:1** sur le message d'état du tableau de
  bord, et le même défaut sur deux autres écrans.
- **mister-miss-koh** — `get_shared_note` joignait `profiles` en jointure
  **interne** alors que rien ne crée de profil à l'inscription : un lien de
  partage valide n'ouvrait rien. Corrigé à la racine par le propriétaire (#22).

Le motif est constant : **ce sont des défauts qui ne se voient qu'à
l'exécution** — au premier vrai build, à la première vraie migration, au
premier rendu en thème sombre. Aucune relecture ne les aurait trouvés, et
c'est la meilleure raison de préférer une passe qui livre à une analyse qui
décrit.

### Le dernier chantier, rentré après coup

**mister-family-map** (via `bac-sable`, PR #43) est revenu après l'écriture de
ce bilan. Il ne dément aucun constat — les trois de V17, V10 et V12 tenaient —
mais il ajoute une correction et un défaut, tous deux dans l'esprit de ce qui
précède.

- **Une phrase fausse écrite par l'exécution elle-même.** La corbeille livrée
  annonçait « rien n'est effacé tant que vous ne supprimez pas votre compte ».
  C'est faux : sur cette app, la suppression de compte **anonymise**, elle
  n'efface pas. Corrigé à l'écran **et** dans la page « Mentions », qui n'en
  disait rien. Le tableau du § 1 range donc family-map en « oui » pour la
  suppression de compte ; il faut lire « anonymisation », comme mister-doc.
- **Un défaut générique du parc, révélé par le magasin unique.** La
  synchronisation entre onglets est passée de 8/8 à 8 échecs sur 16 : le
  message d'un onglet à l'autre ne portait qu'une clé, et rien n'ordonne
  l'écriture d'un onglet avec l'arrivée du message dans l'autre. Le défaut
  **préexistait** — il ne se voyait pas tant que la valeur tenait en 20
  octets ; elle en fait 11 000 sous magasin versionné. Trois hypothèses
  écartées **par la mesure** avant la bonne, une sonde au point d'appel exact
  du receveur : `brut AVANT = ABSENT`. Le message porte désormais la valeur.
- **Et le nom du fichier d'export utilisait `toISOString()`** : à 23 h 30 à
  Paris, il portait la date du lendemain. `dateSlug` du socle le règle — le
  même piège dort partout où une app nomme un fichier avec une date.

Cela clôt la passe : **les dix-neuf chantiers ont été instruits**, V14 mis à
part, qui reste suspendu à une décision juridique.
