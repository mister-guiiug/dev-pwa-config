---
'@mister-guiiug/dev-pwa-config': minor
---

Les trois gestes communs sont instrumentés — installation, mise à jour, partage.

Le parc mesurait ses vues de page et rien d'autre. L'entonnoir « visite →
interaction » créé d'office par PostHog restait donc à **zéro**, et pour une
raison structurelle : son étape 2 vise `$autocapture`, que l'ADR 0012 a coupée
parce qu'elle enregistre le texte des éléments cliqués — sur `mister-cim10`, des
libellés de diagnostic. Aucune application n'appelait `trackEvent`.

**LE LEVIER N'EST PAS DANS LES APPLICATIONS.** Trois gestes sont COMMUNS aux
dix-neuf : installer, mettre à jour, partager. Les instrumenter dans le socle
les donne à toutes d'un coup, du même nom et au même endroit — là où dix-neuf
instrumentations à la main auraient donné dix-neuf vocabulaires.

### Trois noms, et le détail dans les propriétés

| événement      | propriétés                                                                       |
| -------------- | -------------------------------------------------------------------------------- |
| `installation` | `etape` (`proposee`, `acceptee`, `refusee`, `reportee`), `methode`, `plateforme` |
| `maj`          | `etape` (`proposee`, `appliquee`, `reportee`)                                    |
| `partage`      | `resultat` (`shared`, `copied`, `cancelled`, `failed`)                           |

Dix-neuf applications partagent un projet : une liste d'événements courte est ce
qui le garde lisible, et PostHog ventile par propriété aussi bien que par
événement. `GESTES` et `ETAPES` sont exportés — une application qui instrumente
un geste qui lui est propre suit la même forme au lieu d'inventer la sienne.

### Ce que ces événements répondent, et que rien ne disait

- **L'invite d'installation marche-t-elle ?** `proposee` est une IMPRESSION, pas
  un geste, et elle est indispensable : sans dénominateur, un taux
  d'acceptation ne se calcule pas. Le parc a consacré une campagne entière à
  cette invite sans jamais savoir si elle convertissait.
- **Les gens prennent-ils les mises à jour ?** Le parc a choisi
  `registerType: 'prompt'` plutôt qu'`autoUpdate` — un déploiement ne recharge
  plus la page sous les doigts de l'utilisatrice. Le prix de ce choix est
  qu'une version peut n'être jamais prise, et personne ne le savait.
- **Combien de partages retombent sur le presse-papiers ?** Le `share` du socle
  ne sait partager que du texte ; cette limite se mesure désormais au lieu de se
  supposer.

### Trois pièges, et le test de chacun

- **L'impression ne part qu'une fois.** `StrictMode` monte deux fois : sans
  garde par `ref`, `proposee` doublerait et tout taux d'acceptation serait
  divisé par deux, sans qu'aucune alerte ne le signale.
- **Le clic ne vaut pas installation.** La boîte native s'ouvre, et c'est elle
  qui décide : l'issue vient de `promptInstall()`, pas du clic. Compter sur le
  clic gonflerait le taux de moitié.
- **`maj/appliquee` part AVANT `update()`.** La mise à jour recharge le
  document ; PostHog met en file et vide par lots, et le rechargement emporte la
  file. Un événement posé après ne partirait jamais.

### Et la règle qui ne se négocie pas

**Aucune valeur libre.** Le partage n'envoie ni titre, ni texte, ni URL : ils
portent le contenu de l'utilisateur. Un test l'affirme en cherchant ces valeurs
dans l'événement sérialisé — instrumenter à la main ne servirait à rien si
c'était pour reconstituer le risque au nom duquel `autocapture` a été coupée.

Rien ne part sans consentement, et c'est également testé : les trois composants
ignorent tout du consentement, c'est `trackEvent` qui refuse.

Poids mesuré sur le squelette : **+0,4 kB gzip**, préchargé compris.
