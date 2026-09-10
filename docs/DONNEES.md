<!--
  Cette page est une PARTIE du manuel du socle : le README ne pouvait plus la
  porter. Il faisait 3 719 lignes et 252 kB — le plus gros fichier du paquet
  publié, devant `components.css` — et servait à la fois de vitrine, d'index et
  de manuel de 151 sous-chemins. On n'y trouvait plus rien.

  Les pages du manuel vivent dans `docs/`, le README oriente. Chaque page reste
  la SOURCE de ce qu'elle dit : rien n'a été résumé, réécrit ni raccourci au
  passage — les titres et leurs ancres sont ceux d'avant, pour que les liens
  déjà écrits ailleurs continuent de tomber juste.
-->

# Données, backend et formats

_Manuel du socle `@mister-guiiug/dev-pwa-config` — la persistance, la synchronisation, l’authentification, la carte et les formats d’export. Retour au
[README](../README.md)._

### Persistance locale (`/storage`, `/versioned-store`, `/idb`, `/backup`)

Quatre couches, une par besoin — et les en-têtes des modules se renvoient les
uns aux autres :

- **`/storage`** — une préférence, un réglage : `createStore(prefix)` absorbe
  les quatre façons dont `localStorage` lève, le préfixe isole les apps du
  domaine partagé.
- **`/versioned-store`** — **l'instantané complet d'une app**. Le besoin le
  plus recopié du parc après l'accès au stockage : miss-uwh et miss-genius en
  portaient deux copies jumelles (enveloppe versionnée + migrations + zod), et
  miss-lookhouse montrait le piège inverse — version inconnue, données jetées.
- **`/idb`** — du volume, des `Blob` (avatars, historiques sans plafond),
  réécrit cinq fois dans le parc. Best-effort : rien ne lève jamais.
- **`/backup`** — le filet : tout le magasin dans un fichier, et retour.
  Un coffre (`/secure-storage`) complète pour les secrets.

```ts
import { createVersionedStore } from '@mister-guiiug/dev-pwa-config/versioned-store';
import { appDataSchema } from './schema';

const store = createVersionedStore({
  store: 'monapp_', // ou un Store existant de /storage
  version: 2,
  migrations: {
    // Indexées par version SOURCE ; chacune monte d'UN cran, le magasin
    // tient le compte. La 0 reçoit les données d'avant l'enveloppe.
    0: data => ({ ...(data as object), periodes: [] }),
    1: data => remapIds(data),
  },
  validate: data => appDataSchema.parse(data), // injectée — zod reste chez l'app
  seed: () => createInitialData(),
});

const data = store.load(); // migré, validé, persisté — jamais une exception
store.save(next); // false si le stockage a refusé
const json = store.export(); // fichier réimportable par store.import(json)
```

Ce que `load()` promet : **jamais de destruction silencieuse**. Version
d'après, donnée invalide, JSON tronqué — l'original est copié sous
`{clé}.backup-…` (clés déterministes, donc bornées) AVANT le repli sur le
seed. `clear()` efface l'instantané **et** ses copies.

```ts
import { createIdb } from '@mister-guiiug/dev-pwa-config/idb';

const idb = createIdb('mister-molkky'); // le nom EST l'isolation
await idb.set('history', matches); // false si refusé, ne lève jamais
const history = await idb.get('history', []);
await idb.setBlob('avatar:j1', file); // les Blob ne passent pas par JSON
```

### Corrélation, journal et écran de crash (`/correlation`, `/logger`)

Le socle portait déjà quatre canaux d'observabilité — frontière d'erreur,
journal local, relais Sentry, télémétrie — qui décrivaient le même incident
**sans jamais pouvoir être rapprochés**. Le ticket dit « ça a planté », Sentry
montre une trace, GA montre une session, le serveur montre une requête en
erreur : rien ne dit que c'est le même événement. Un identifiant y remédie.

```ts
import { installCorrelation } from '@mister-guiiug/dev-pwa-config/correlation';
import { installObservability } from '@mister-guiiug/dev-pwa-config/react/observability';

await installObservability({ dsn: import.meta.env.VITE_SENTRY_DSN });
const { sessionId, fetch: tracedFetch } = await installCorrelation({
  analytics: true, // opt-in : associe l'identifiant au profil analytique
});
```

Après cet appel, le **même** identifiant apparaît dans :

| Canal              | Ce qu'il porte                                    |
| ------------------ | ------------------------------------------------- |
| Erreurs et Sentry  | `correlationSessionId` en contexte de session     |
| Requêtes sortantes | `X-Correlation-Id` (par requête) + `X-Session-Id` |
| Télémétrie GA4     | propriété `correlation_session_id`                |
| Écran de crash     | la référence que l'utilisateur peut citer         |

`ObservabilityBoundary` affiche la référence automatiquement ; `reference: false`
la retire, `reference: '…'` la remplace.

**Pas de contexte asynchrone implicite.** Le navigateur n'a pas d'équivalent
d'`AsyncLocalStorage` : une « corrélation courante » en variable de module
serait fausse dès deux requêtes concurrentes — un identifiant trompeur est pire
qu'un identifiant absent. L'identifiant de session est donc implicite (il ne
change pas) et celui de requête explicite : `withCorrelation` en produit un par
appel et le rend à ses observateurs.

```ts
import { createLogger } from '@mister-guiiug/dev-pwa-config/logger';

const log = createLogger('favoris');
log.warn('quota atteint', { count: 51 });
// → fil d'Ariane : favoris.warn « quota atteint » { count: 51, correlationId }
```

Le journal n'est **pas** un second système : chaque ligne finit dans le fil
d'Ariane de `breadcrumb`, donc dans l'erreur remontée — mêmes masquages, même
transport, rien à vider séparément.

### Export PDF (`@mister-guiiug/dev-pwa-config/pdf`)

Un vrai binaire `application/pdf`, sans bibliothèque — promu de mister-doc, où
il produit les plannings mensuels et les compteurs d'équipe. Page A4 portrait,
Helvetica / Helvetica-Bold (fontes standard, rien à embarquer), repère
**haut-gauche** comme à l'écran, et une table `xref` dont les offsets sont
relevés sur les octets réellement écrits : le fichier s'ouvre dans les
lecteurs stricts, pas seulement dans les tolérants.

```ts
import {
  PAGE,
  PdfContent,
  buildPdf,
  downloadPdf,
} from '@mister-guiiug/dev-pwa-config/pdf';

const page = new PdfContent();
page.fillRect(34, 64, PAGE.w - 68, 20, [0.42, 0.12, 0.42]); // bandeau
page.text(40, 78, 9.5, 'Compteurs — Juillet', { bold: true, color: [1, 1, 1] });
page.line(34, 90, PAGE.w - 34, 90, 0.8, 0.55);
downloadPdf(buildPdf([page]), 'compteurs-juillet.pdf');
```

Une page par `PdfContent` ; `buildPdf([])` rend une page vide plutôt qu'un
binaire invalide. Le texte est encodé WinAnsi (CP1252) : Latin-1, **plus** la
ponctuation typographique et quelques lettres transcodées sur 0x80–0x9F (`€`,
`’`, `“ ”`, `—`, `–`, `…`, `œ`, `™`…). Hors de là (émoji, grec…), le
caractère devient `?`. Pas d'images, pas de compression, pas d'autres
fontes — des tableaux qui s'ouvrent et s'impriment partout.

### Export Excel (`@mister-guiiug/dev-pwa-config/xlsx`)

Là où le dialecte `excel-fr` de `./csv` règle l'**ouverture** en colonnes,
`./xlsx` règle le **type** des cellules : les nombres sont réellement typés —
donc sommables dans le tableur — et l'en-tête est en gras. Promu de
mister-doc : un vrai classeur Office Open XML (archive ZIP « stored », CRC32
calculé, parties XML minimales), sans dépendance — là où charger SheetJS par
CDN fait venir une bibliothèque entière d'un domaine tiers pour écrire un
tableau.

```ts
import { buildXlsx, downloadXlsx } from '@mister-guiiug/dev-pwa-config/xlsx';

const bytes = buildXlsx({
  name: 'Compteurs Juillet', // assaini : ≤ 31 caractères, sans \ / ? * [ ] :
  header: ['Médecin', 'Heures'],
  rows: [
    ['Alice', 12],
    ['Bob', 7],
  ],
});
downloadXlsx(bytes, 'compteurs-juillet.xlsx');
```

**Plusieurs onglets** : passer un tableau. Les noms sont assainis _puis_
dédoublonnés (Excel refuse le classeur entier si deux onglets portent le même
nom, casse comprise), et `header` est facultatif — une feuille de bilan n'a
qu'un titre sur une cellule, des lignes vides et des lignes de deux colonnes.
Chaque ligne porte la longueur qu'elle a ; rien n'est aligné sur l'en-tête.

```ts
const bytes = buildXlsx([
  { name: 'Bilan', rows: [['BILAN 2025-2026'], [], ['Recettes', 1234.5]] },
  { name: 'Compte', header: ['Date', 'Libellé', 'Montant'], rows: journal },
  { name: 'Evolution', header: ['Saison', 'Solde'], rows: parSaison },
]);
```

L'export est **déterministe** (date d'archive figée) : mêmes feuilles, mêmes
octets — et un objet seul rend exactement les mêmes octets que le tableau
d'un élément. Des chaînes et des nombres, un seul style ; pas de formules, pas
de dates typées, pas de largeurs de colonnes, pas de lecture.

### Agenda iCalendar (`@mister-guiiug/dev-pwa-config/ical`)

Un `.ics` (RFC 5545) qui s'importe dans Google Agenda, Outlook et Apple
Calendar — promu de **quatre** générateurs écrits séparément (`bac-sable`,
`mister-footcoach`, `miss-uwh`, `mister-doc`), dont aucun ne pliait ses lignes
correctement et dont deux n'écrivaient pas de `DTSTAMP`.

```ts
import { ICAL_MIME, toIcalendar } from '@mister-guiiug/dev-pwa-config/ical';
import { downloadText } from '@mister-guiiug/dev-pwa-config/download';

const ics = toIcalendar(
  [
    // Une DATE seule → journée entière ; le DTEND part au lendemain.
    { uid: 'ag-2026', summary: 'Assemblée générale', start: '2026-01-31' },
    // Une heure SANS fuseau → flottante : 10 h reste 10 h en déplacement.
    {
      uid: 'match-12',
      summary: 'vs FC Rivale',
      start: '2026-05-10T10:00',
      durationMinutes: 120,
      location: 'Stade, 1 rue X',
      status: 'CONFIRMED',
    },
    // Un `Date` → un INSTANT, écrit en UTC.
    {
      uid: 'sortie-3',
      summary: 'Sortie',
      start: new Date(),
      durationMinutes: 90,
    },
  ],
  { name: 'Saison 2026', uidDomain: 'mon-app' }
);
downloadText(ics, 'saison-2026.ics', ICAL_MIME);
```

**La date choisit sa nature**, et c'est le seul réglage qui compte : une date
ISO donne une journée entière, un horodatage sans décalage une heure
**flottante** (18 h là où on la lit), un `Date` ou un horodatage avec décalage
un **instant** UTC. Les trois se lisent à la longueur de la valeur produite.

Quatre pièges sont traités d'office : le `DTEND` d'une journée entière est
**exclusif** (un événement du 31 janvier finit le 1er février) ; le pliage se
compte en **octets** — c'est `foldLine` de `./vcard`, même texte de RFC, donc
pas de mojibake sur les accents ; `DTSTAMP` est obligatoire, unique pour tout
le fichier et **injectable** (`{ dtstamp }`) pour un export testable ; et
`URL` n'est pas une valeur texte, donc jamais échappée.

Pour un **flux d'abonnement** servi par une fonction serveur, les options
`method: 'PUBLISH'`, `timeZone: 'Europe/Paris'` et `refreshInterval: 'PT1H'`
écrivent l'en-tête attendu (`X-WR-TIMEZONE`, `REFRESH-INTERVAL` **et**
`X-PUBLISHED-TTL`, que les clients n'honorent pas tous pareil) ; les
événements observés portent `transparent: true`, sans quoi un mois
d'abonnement affiche un agenda entièrement occupé. `toIcalEvent` rend un
`VEVENT` seul quand la composition est faite ailleurs.

Pas de `RRULE`, pas de `VALARM`, pas de `VTIMEZONE` : aucune des quatre apps
n'en émet — la récurrence est dépliée en occurrences par le domaine, en
amont. `unfoldLines` et `unescapeText` suffisent à relire ce qu'on a écrit.

### Coffre local chiffré (`/secure-storage`)

`localStorage` part dans les sauvegardes, se synchronise, et se lit d'une
ligne par n'importe quel script de la page : un jeton d'accès y est en clair.
Promu de `miss-supaboss` (184 lignes en production qui chiffrent des PAT),
`createVault()` range des secrets **chiffrés au repos** : AES-256-GCM, clé
dérivée d'une phrase secrète (PBKDF2-SHA-256, 210 000 itérations) et gardée
**en mémoire seule**. Web Crypto suffit — aucune dépendance, navigateurs et
Node ≥ 19.

```ts
import { createVault } from '@mister-guiiug/dev-pwa-config/secure-storage';

const vault = createVault({ prefix: 'app_vault_' });
await vault.enable('phrase choisie par l’utilisateur'); // une fois
await vault.setItem('pat', token); // chiffre, puis range

// …session suivante :
if (await vault.unlock(saisie)) {
  const pat = await vault.getItem<string>('pat');
}
```

`enable` / `unlock` / `lock` / `disable` tiennent le cycle de vie,
`encrypt`/`decrypt` exposent le chiffrement brut, `keys()` liste les entrées.
Le nombre d'itérations est **persisté et relu** : relever la constante dans
une version future ne rend pas illisibles les coffres existants. `createVault`
rend une **instance** — deux coffres peuvent coexister (jetons, brouillon…)
sans partager leur phrase — et le stockage passe par `./storage`, qui absorbe
déjà les quatre façons dont `localStorage` lève.

**Ce que ça protège, et ce que ça ne protège pas** — l'en-tête du module
l'énonce avant l'API, et il faut le redire ici :

- ✔ la fuite **passive** : sauvegarde ou synchronisation du stockage, lecture
  par un script tiers, appareil perdu ou revendu ;
- ✘ un **XSS actif** pendant une session déverrouillée : le script appelle
  `decrypt` comme le ferait l'app. Le chiffrement au repos n'est **pas** une
  parade au XSS, et rien de ce qui vit dans la page ne l'est ;
- ✘ la **phrase oubliée** : les données sont **irrécupérables** — c'est le
  prix d'une clé qui n'est stockée nulle part. Le dire à l'utilisateur avant
  qu'il choisisse sa phrase, pas après.

Autrement dit : ceci élève le coût d'une fuite de stockage ; cela ne remplace
ni une CSP, ni un jeton à courte durée de vie, ni un secret côté serveur.

### Client Supabase (`/supabase-client`)

Cinq apps (miss-uwh, miss-lookhouse, mister-molkky, mister-doc, le bac-sable)
réécrivent la même fabrique : lire `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`,
créer le client une fois, le garder. Et deux apps portent **mot pour mot** le
même commentaire — « l'init au chargement du module tuait l'app avant
`createRoot()` » : variable manquante, exception dans le chunk d'entrée, écran
blanc sans diagnostic, Lighthouse mort en NO_FCP. La fabrique applique donc la
doctrine : **rien ne s'exécute à l'import** — ni lecture bloquante, ni SDK, ni
`createClient`.

```ts
// src/lib/supabase.ts — l'intégralité du fichier qu'une app garde
import { createSupabaseClientFactory } from '@mister-guiiug/dev-pwa-config/supabase-client';

export const supabase = createSupabaseClientFactory({
  env: import.meta.env,
  auth: { flowType: 'pkce' }, // fusionné sur persistSession + autoRefreshToken
  correlated: true, // X-Correlation-Id + X-Session-Id sur chaque requête
});

// …plus tard, au premier usage réel :
const client = await supabase.getClient();
```

| Décision                         | Pourquoi                                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `getClient()` asynchrone         | `@supabase/supabase-js` (~120 Ko, peer **optionnelle**) est importé dynamiquement au premier appel — hors du bundle initial, le motif de mister-molkky |
| La promesse est gardée           | deux `await` concurrents ne créent qu'**un** client (et une seule connexion realtime, qui compte dans le quota du projet)                              |
| Rejet **nommé** si mal configuré | `getClient()` rejette en citant les variables manquantes — tard, là où une ErrorBoundary sait l'afficher                                               |
| `missingConfig` fait foi         | même juge que `./backend` : `SUPABASE_ENV_KEYS` se passe tel quel au `requires` d'un `createBackendSelector`, qui retombe en local proprement          |
| `correlated`                     | enveloppe le `fetch` du client via `./correlation` : le journal serveur et l'erreur client désignent le même incident                                  |

Le client obtenu s'**injecte** ensuite tel quel dans `realtime/supabase`
(descente) et dans le `process` d'une file `sync-queue` (montée) : une app n'a
besoin que d'un client.

### File d'écritures hors-ligne (`/sync-queue`)

Le chemin **montant** de la synchronisation — `realtime/` est le descendant.
Promu de miss-uwh (la référence : file persistante, drain sérialisé, lettres
mortes) ; la copie « inspirée » de miss-lookhouse avait **perdu le retrait
exponentiel** en route — la preuve qu'une file recopiée diverge — et
mister-puzzle montrait le même besoin côté Firebase : le module est donc
**agnostique du transport**, `process` est injecté.

```ts
import { createSyncQueue } from '@mister-guiiug/dev-pwa-config/sync-queue';
import { createStore } from '@mister-guiiug/dev-pwa-config/storage';

const queue = createSyncQueue({
  store: createStore('uwh_sync_'), // la persistance ET la source de vérité
  process: op => repository.apply(op), // Supabase, Firebase, HTTP — au choix
  keyOf: op => (op.id ? `${op.kind}:${op.id}` : null),
  onChange: ({ pending, dead }) => badge.update(pending, dead),
});

queue.start(); // draine, puis rejoue à chaque retour en ligne
queue.enqueue(op); // → l'entrée, ou `null` si le plafond est atteint
```

Ce que la file garantit — et que les copies rataient :

- **aucune écriture perdue** : le `Store` est relu à chaque tour, l'élément
  traité est retiré **par identifiant** — jamais `slice(1)` sur un instantané ;
  quand le stockage refuse (quota, mode privé), la session continue en mémoire ;
- **pas de tête bloquante** : un rejet durable (RLS, 4xx hors 408/429 — la
  politique est `defaultShouldRetry` de `react/net`) part en **lettre morte**,
  consultable (`deadLetters()`) et rejouable (`requeueDead()`), et la file
  continue ;
- **le rejeu se reprogramme seul** : retrait exponentiel dispersé —
  `backoffDelay` de `./realtime`, le même que la reconnexion — sans attendre un
  évènement `online` qui ne vient jamais quand c'est le serveur qui tousse ;
- **une entité, une opération** : `keyOf` fusionne les écritures en attente sur
  la même entité, seule la dernière part (upsert idempotent) ;
- **pas de croissance sans fin** : au-delà de `maxQueueSize`, `enqueue` rend
  `null` — refuser visiblement vaut mieux que jeter en silence.

`react/use-offline-queue` reste la variante **React** (un composant qui re-rend
au fil de la file) ; `sync-queue` est la version hors-React, plus complète,
pour une couche backend ou un service de synchronisation.

### Temps réel (`/realtime`, `/realtime/supabase`)

Le chemin **descendant** : recevoir ce que les autres ont changé, et savoir
quand on ne le reçoit plus. `createChannel` est le port — reconnexion à retrait
exponentiel dispersé, rattrapage du trou laissé par la coupure, sonde au réveil
de l'onglet ; `realtime/supabase`, `realtime/firebase` et `realtime/local` sont
les adaptateurs, comme `MapProvider` l'est pour Leaflet et MapLibre.

```ts
import { createChannel } from '@mister-guiiug/dev-pwa-config/realtime';
import { supabaseRealtimeTransport } from '@mister-guiiug/dev-pwa-config/realtime/supabase';

const transport = supabaseRealtimeTransport({
  client: supabase, // celui de l'app — jamais un second
  table: 'comments',
  filter: `candidate_id=eq.${id}`,
});

const canal = createChannel({ ...transport, onMessage: apply });
void canal.start();
```

**Deux abonnements à la même table ne se marchent plus dessus.** Le sujet du
canal valait `dwc:<schema>:<table>`, sans le filtre. Or `client.channel(sujet)`
REND le canal déjà enregistré sous ce sujet, `subscribe()` ne fait RIEN sur un
canal qui n'est pas `closed`, et `removeChannel()` est asynchrone. Un fil de
commentaires par candidat et un journal par espace de travail recevaient donc
le même canal : le second restait muet, sans la moindre erreur. Le sujet porte
maintenant le filtre — pour la lisibilité en débogage — et un numéro monotone —
pour l'unicité, y compris entre deux abonnements identiques. `channelName`
renomme la part lisible ; le numéro, lui, ne se retire pas.

**Une tentative qui échoue est refermée.** Avant `SUBSCRIBED`, l'appelant n'a
aucune poignée de fermeture : si le canal n'est pas retiré ici, il reste dans
`client.channels` pour toujours — un canal orphelin par montage, et React en
monte deux en développement. Un `CHANNEL_ERROR`, un `TIMED_OUT`, un `CLOSED`
mort-né ou une levée pendant l'abonnement retirent désormais le canal avant de
rejeter.

> ⚠ **`catchUp` n'applique pas `filter`.** L'abonnement est filtré côté
> serveur, le rattrapage ne l'est pas : il interroge la table sur la seule
> colonne curseur. Là où la RLS laisse passer plusieurs espaces — le cas
> **normal** d'une app multi-espaces —, le rattrapage fait entrer des lignes
> d'un **autre** espace que celui écouté, sans qu'aucune erreur ne le dise. La
> RLS tient : ce n'est pas une fuite, c'est un mélange, et il ne se voit qu'au
> retour d'une veille. Soit l'app refiltre ce que `catchUp` rend, soit elle ne
> câble que `connect` et recharge l'écran avec **sa** requête — déjà filtrée —
> à chaque retour à `live`.

### Carte (`@mister-guiiug/dev-pwa-config/map`)

Deux axes **indépendants**, qu'on confond souvent :

| Axe                  | Choix                                          | Où il se fait                          |
| -------------------- | ---------------------------------------------- | -------------------------------------- |
| **Moteur de rendu**  | Leaflet (DOM) · MapLibre GL (WebGL)            | le sous-chemin importé                 |
| **Source de tuiles** | OpenStreetMap raster · style vectoriel · autre | l'option `tiles` passée à l'adaptateur |

OpenStreetMap n'est pas un moteur : c'est une **source de tuiles**, utilisable
par les deux moteurs. Un seul adaptateur est embarqué dans le bundle : celui
dont on importe le sous-chemin.

> **Avec MapLibre, gardez `pwaSeoPlugin()` dans vos plugins Vite** : il sort
> `/map/maplibre` du pré-bundling, qui ne sait pas interpréter le suffixe
> `?worker&url` par lequel l'adaptateur résout le worker MapLibre. Sans cette
> exclusion, `vite dev` échoue au démarrage — alors que le build de
> production, lui, fonctionne. Rien à ajouter si le plugin est déjà là.

```ts
// 1. Choisir le moteur PAR L'IMPORT (l'autre n'est jamais embarqué)
import { createMapLibreMapProvider } from '@mister-guiiug/dev-pwa-config/map/maplibre';
// import { createLeafletMapProvider } from '@mister-guiiug/dev-pwa-config/map/leaflet';
import { osmRasterTiles } from '@mister-guiiug/dev-pwa-config/map';
import 'maplibre-gl/dist/maplibre-gl.css'; // ou 'leaflet/dist/leaflet.css'

const provider = createMapLibreMapProvider({ tiles: osmRasterTiles() });
await provider.mount(container, { center: { lat: 46.6, lng: 2.4 }, zoom: 6 });
provider.setMarkers([
  { id: 'p1', coordinates: { lat: 45.78, lng: 4.85 }, label: 'Parc' },
]);
```

`mount()` **rejette** si le moteur est indisponible (WebGL absent, style
injoignable) : prévoyez toujours un repli (liste, message). Une tuile en échec
n'est jamais fatale — la carte reste manipulable, seul le fond manque.

Le moteur est chargé **paresseusement, au montage** : les modules restent
importables côté serveur (SSR) et le poids n'est téléchargé que si une carte
s'affiche réellement.

**`onViewportChange` ne dit que les DÉPLACEMENTS ; la vue initiale part par
`onReady`.** Les deux adaptateurs annonçaient d'abord la vue de départ par
`onViewportChange`, et une carte qui finit de s'initialiser n'a rien déplacé.
La confusion faisait de la carte un second écrivain de l'état qu'elle reflète :
un écran qui recopie le centre dans un formulaire voyait la saisie de
l'utilisateur écrasée dès que l'initialisation se terminait après elle — ce qui
n'arrive que sur une machine lente, donc jamais en développement.

```ts
await provider.mount(container, {
  center: { lat: 46.6, lng: 2.4 },
  zoom: 6,
  // Une seule fois, quand la carte est prête : de quoi amorcer un zoom.
  onReady: viewport => setZoom(viewport.zoom),
  // Ensuite, et seulement ensuite : ce que l'utilisateur déplace.
  onViewportChange: viewport => setCenter(viewport.center),
});
```

#### Regroupement de marqueurs

```ts
import {
  clusterByGrid,
  clustersToMarkers,
  isClusterId,
} from '@mister-guiiug/dev-pwa-config/map';

const clusters = clusterByGrid(
  places.map(p => ({ id: p.id, coordinates: p.coordinates, item: p })),
  zoom
);
provider.setMarkers(clustersToMarkers(clusters, input => input.item.name));
// Au clic : un identifiant de groupe n'est pas un identifiant d'élément.
onMarkerClick: id => {
  if (!isClusterId(id)) openPlace(id);
};
```

#### Intégration Vite (CSP + cache) — à ne pas oublier

```ts
import {
  mapCspDirectives,
  mapTileRuntimeCaching,
  osmRasterTiles,
} from '@mister-guiiug/dev-pwa-config/map';

const tiles = osmRasterTiles();
const map = mapCspDirectives(tiles);

cspPlugin({
  dev: command === 'serve',
  // MapLibre charge les tuiles par `fetch` (connect-src), Leaflet par <img>
  // (img-src) : déclarer les DEUX rend la CSP valable quel que soit le moteur.
  connectSrc: ["'self'", ...map.connectSrc, ...autresHotes],
  imgSrc: ["'self'", 'data:', 'blob:', ...map.imgSrc],
});

VitePWA({ workbox: { runtimeCaching: [mapTileRuntimeCaching(tiles)] } });
```

#### Styles des marqueurs

Les adaptateurs posent trois classes, **sans styles imposés** — à habiller côté
app : `.dwc-map-marker` (le bouton, focusable au clavier), `.dwc-map-pin` (point
seul), `.dwc-map-cluster` (groupe, contient le nombre).

#### Pièges pris en charge par le paquet

- **Worker MapLibre introuvable en production.** MapLibre 6 résout son worker
  par une URL calculée à l'exécution, que le bundler n'émet pas : 404 et carte
  morte en prod, alors que tout marche en `dev`. L'adaptateur impose l'URL d'un
  asset réellement empaqueté (`setWorkerUrl` + `?worker&url`).
- **Clé d'API dans le code.** `vectorTiles()` refuse une URL de style portant
  `api_key` / `access_token` : un secret n'a rien à faire dans un client.
- **Tuiles vectorielles avec Leaflet.** Refus explicite plutôt qu'écran vide.

### Authentification (`@mister-guiiug/dev-pwa-config/auth`)

Cinq apps portent chacune leur intégration Supabase Auth — mister-doc (la
référence MFA), miss-uwh, miss-lookhouse, miss-carbook, mister-molkky — et
quatre recopient exactement le même câblage : `getSession()` initial,
ré-hydratation par `onAuthStateChange`, désabonnement au démontage. Le module
promeut ce câblage en **port + adaptateurs**, comme `realtime/` et `push/` :

| Sous-chemin            | Rôle                                                                                   |
| ---------------------- | -------------------------------------------------------------------------------------- |
| `/auth`                | le PORT : machine d'état `loading` → `signed-out` \| `signed-in` \| `needs-mfa`        |
| `/auth/supabase`       | adaptateur Supabase v2 à **client injecté** (peer optionnelle)                         |
| `/auth/stored-session` | la session lue dans le stockage, sans appel réseau (démarrage hors ligne)              |
| `/auth/mfa`            | TOTP : enrôlement (QR/secret/uri), défi, facteurs — fidèle à mister-doc                |
| `/auth/errors-fr`      | erreurs Auth en français (fusion doc + carbook, codes **et** sous-chaînes)             |
| `/react/use-auth`      | le hook (`useSyncExternalStore`) — deux composants, un client, aucun Provider          |
| `/react/auth-gate`     | la garde non stylée `loading`/`fallback`/`mfa`/`children` (généralise uwh + lookhouse) |

Bout en bout :

```tsx
import { createClient } from '@supabase/supabase-js';
import { createAuthClient } from '@mister-guiiug/dev-pwa-config/auth';
import { supabaseAuthAdapter } from '@mister-guiiug/dev-pwa-config/auth/supabase';
import { frAuthError } from '@mister-guiiug/dev-pwa-config/auth/errors-fr';
import { useAuth } from '@mister-guiiug/dev-pwa-config/react/use-auth';
import { AuthGate } from '@mister-guiiug/dev-pwa-config/react/auth-gate';

const supabase = createClient(url, anonKey); // LE client de l'app — jamais un second
const adapter = supabaseAuthAdapter({ client: supabase });
const auth = createAuthClient({
  adapter,
  // Chaque évènement brut : c'est là que miss-uwh purge les données locales
  // à la déconnexion (appareil partagé).
  onEvent: event => {
    if (event === 'SIGNED_OUT') wipeLocal();
  },
});

function App() {
  return (
    <AuthGate
      client={auth}
      loading={<Spinner />}
      fallback={<LoginPage />}
      mfa={<MfaChallenge />}
      bypass={!IS_SUPABASE} // mode local : on laisse passer, la sécurité réelle est la RLS
    >
      <Routes />
    </AuthGate>
  );
}

function LoginPage() {
  const { status } = useAuth(auth); // { status, session, user }
  const signIn = async () => {
    const res = await adapter.signInWithPassword({ email, password });
    if (!res.ok) setError(frAuthError(res.error)); // « E-mail ou mot de passe incorrect. »
  };
  // Variantes : adapter.signInWithOtp({ email, emailRedirectTo }) — le lien
  // magique de carbook ; adapter.signUp(...) rend `needsConfirmation` quand la
  // confirmation e-mail retient la session ; adapter.signInAnonymously() ne
  // LÈVE jamais quand le projet la désactive (repli de molkky) : `{ ok: false }`.
}
```

Les effets d'une connexion reviennent **par `onAuthStateChange`** : les
variantes `signIn*` restent des méthodes de l'adaptateur, le port n'a pas à
les connaître. Le port ferme trois pièges que les copies géraient à moitié :
la réponse `getSession` **périmée** qui écrase un évènement plus récent
(chaque hydratation porte un numéro, seule la plus récente s'applique), la
lecture MFA **hors-ligne** (un échec vaut « pas de défi », jamais un verrou),
et la déconnexion **sans évènement** (`signOut` relit la session après coup).

MFA TOTP (opt-in, plan gratuit, sans SMS) :

```ts
import { createTotpMfa } from '@mister-guiiug/dev-pwa-config/auth/mfa';

const totp = createTotpMfa({ client: supabase });

// Enrôlement (Réglages) : QR + secret + uri, TELS QUE Supabase les donne.
const { factorId, qrCode, secret } = await totp.enrollTotp();
// <img src={qrCode} /> — data URL SVG : la CSP doit autoriser `img-src data:`
await totp.confirmEnrollment(factorId, code); // facteur vérifié, session aal2

// Au login, quand la garde affiche `mfa` (statut `needs-mfa`) :
await totp.challengeTotp(code); // Supabase émet MFA_CHALLENGE_VERIFIED → signed-in
```

Les erreurs de `/auth/mfa` gardent le **message Supabase d'origine** :
`frAuthError(e)` les traduit à l'affichage. Le nettoyage des enrôlements
abandonnés (facteurs non vérifiés) est fait avant chaque `enrollTotp`,
comme dans mister-doc.

**Les limites, assumées.**

- **Pas de rôles.** La promotion d'`useActionGuard` l'a montré : les rôles ne
  se généralisent pas (fiche médecin chez doc, dix rôles de club chez uwh,
  rôles de démo chez bac-sable). Le port s'arrête à « qui est connecté » ;
  « qui a le droit » reste à l'app, outillé par `react/use-action-guard`.
- **Pas de codes de récupération.** Ceux de mister-doc sont des RPC
  **applicatives** (table + fonctions SQL de l'app), pas une API Supabase
  Auth : les embarquer imposerait un schéma.
- **La garde n'est pas la sécurité.** `AuthGate` ordonne des écrans ; elle se
  contourne dans l'inspecteur. La sécurité réelle est côté serveur, dans les
  politiques **RLS** — uwh et lookhouse l'écrivent en toutes lettres.

### Appairage — codes courts + QR (`/pairing`, `/qr`, `/react/use-qr-scanner`)

Trois apps font « rejoindre un autre appareil » par un code court, chacune
avec son alphabet, son tirage et son parseur : le PIN numérique de
mister-qowa, le code 6 caractères de mister-molkky, l'appairage
`missticket:pair?…` de miss-ticket-pwa. Le socle unifie le tout en pur
(`/pairing`) et isole les deux peers **optionnelles**, chargées
paresseusement : `qrcode` (génération, `/qr`) et `qr-scanner` (scan,
`/react/use-qr-scanner`) — jamais dans le bundle initial, et une erreur
explicite (pas un import cassé) quand la peer manque.

**Rejoindre une partie** (mister-qowa, mister-molkky) — l'hôte affiche un
code et son QR, l'invité tape ou scanne :

```ts
import {
  generateCode,
  normalizeCode,
} from '@mister-guiiug/dev-pwa-config/pairing';
import { qrToDataUrl } from '@mister-guiiug/dev-pwa-config/qr';

// Hôte : 6 caractères sans 0/O ni 1/I (défaut `antiConfusion`) ; un PIN
// chiffré se tire avec { alphabet: 'numeric' }. Aléa crypto, tirage sans
// biais, `random` injectable pour les tests.
const code = generateCode(6);
const qr = await qrToDataUrl(`${location.origin}/join?code=${code}`, {
  width: 240,
});

// Invité : la saisie se normalise au fil de l'eau — majuscules, confusions
// corrigées vers l'alphabet, blancs et séparateurs écartés.
input.value = normalizeCode(input.value, { maxLength: 6 });
```

**Appairer un appareil** (miss-ticket-pwa) — un lien profond
`schéma:action?clé=valeur` porté par le QR, sans schéma codé en dur :

```ts
import {
  buildDeepLink,
  parseDeepLink,
} from '@mister-guiiug/dev-pwa-config/pairing';

const lien = buildDeepLink('missticket', 'pair', { token, id: desktopId });
// → 'missticket:pair?token=…&id=…'

const lu = parseDeepLink(scanné, { scheme: 'missticket', action: 'pair' });
if (lu) pair(lu.params.token, lu.params.id); // sinon null : pas la forme
```

**Scanner** (mister-molkky) — le hook porte le cycle de vie caméra : le
scanner se câble dans un effet une fois la `<video>` montée (au clic, la ref
est encore nulle — le bug d'origine), et l'arrêt + la destruction sont
garantis au nettoyage — pas de caméra ni de lampe torche qui reste allumée.

```tsx
import { useQrScanner } from '@mister-guiiug/dev-pwa-config/react/use-qr-scanner';

const { videoRef, scanning, error, start, stop } = useQrScanner({
  onScan: texte => rejoindre(normalizeCode(texte, { maxLength: 6 })),
});

return scanning ? (
  <video ref={videoRef} playsInline muted />
) : (
  <button type="button" onClick={start}>
    Scanner le QR
  </button>
);
```

Les peers sont déclarées dans `peerDependenciesMeta` : une app qui ne fait
pas d'appairage n'installe rien ; une app qui génère sans scanner n'installe
que `qrcode`.
