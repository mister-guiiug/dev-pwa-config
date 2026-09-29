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

# Configurations et outillage

_Manuel du socle `@mister-guiiug/dev-pwa-config` — les fichiers de configuration qu’une app étend, et ce que la chaîne d’outils lui donne. Retour au
[README](../README.md)._

### `eslint.config.js`

```js
// Projet React
export { default } from '@mister-guiiug/dev-pwa-config/eslint-react';

// Projet non-React
export { default } from '@mister-guiiug/dev-pwa-config/eslint-base';
```

### `prettier.config.js`

```js
export { default } from '@mister-guiiug/dev-pwa-config/prettier';
```

### `tsconfig.app.json`

```jsonc
// Projet React
{
  "extends": "@mister-guiiug/dev-pwa-config/tsconfig-app-react",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.app.tsbuildinfo"
  },
  "include": ["src"]
}

// Projet non-React
{
  "extends": "@mister-guiiug/dev-pwa-config/tsconfig-app",
  "include": ["src"]
}
```

### `tsconfig.node.json`

```jsonc
{
  "extends": "@mister-guiiug/dev-pwa-config/tsconfig-node",
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.node.tsbuildinfo",
  },
  "include": ["vite.config.ts", "vitest.config.ts", "scripts/**/*.mjs"],
}
```

### `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { baseTestOptions } from '@mister-guiiug/dev-pwa-config/vitest-base';

export default defineConfig({
  plugins: [react()],
  test: baseTestOptions,
});
```

Le projet doit créer `src/test/setup.ts` (chargé par `setupFiles`). Contenu type :

```ts
import '@testing-library/jest-dom/vitest';
```

### `vitest.browser.config.ts` (Browser Mode opt-in)

Alternative à jsdom — exécute les tests dans un vrai navigateur via Playwright. Plus fidèle (vraies API DOM, pas de polyfills) mais plus lourd. Cohabite avec jsdom :

- `*.test.{ts,tsx}` → jsdom (rapide, isolation)
- `*.browser.test.{ts,tsx}` → vrai Chromium (fidélité visuelle/DOM)

```bash
npm install -D @vitest/browser playwright
npx playwright install chromium
```

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { baseBrowserTestOptions } from '@mister-guiiug/dev-pwa-config/vitest-browser-base';

export default defineConfig({
  plugins: [react()],
  test: baseBrowserTestOptions,
});
```

Lancer : `vitest --config vitest.browser.config.ts`

### `playwright.config.ts`

Recommandé — la factory (matrice 5 navigateurs, reporters multi-format,
snapshots par plateforme, `reducedMotion`, `webServer` déjà inclus) :

```ts
import { defineConfig, devices } from '@playwright/test';
import { definePwaPlaywrightConfig } from '@mister-guiiug/dev-pwa-config/playwright-base';

// devices est passé à la factory (le paquet n'importe pas @playwright/test).
export default defineConfig(
  definePwaPlaywrightConfig({
    devices,
    port: 5173, // optionnel
    // preview: true,                 // teste un BUILD de prod (build + preview)
    //                                // → service worker, minification, cache réels
    // testMatch: /.*\.spec\.ts$/,    // si convention .spec
    // extraProjects: [...],          // navigateurs additionnels
  })
);
```

Cas simple / legacy — spread de `basePlaywrightOptions` :

```ts
import { defineConfig, devices } from '@playwright/test';
import { basePlaywrightOptions } from '@mister-guiiug/dev-pwa-config/playwright-base';

export default defineConfig({
  ...basePlaywrightOptions,
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

### `vitest.config.ts` (coverage)

```ts
import { baseTestOptions, coveragePreset } from '@mister-guiiug/dev-pwa-config/vitest-base';

test: {
  ...baseTestOptions,
  coverage: {
    ...coveragePreset,
    include: ['src/domain/**'],        // scope au domaine critique
    thresholds: { statements: 65, branches: 80, functions: 70, lines: 65 },
  },
}
```

### `vite.config.ts` (SEO + analytics)

_Le référencement seulement : la mesure d'audience ne passe plus par ce plugin
(voir [Mesure d'audience](#mesure-daudience-mister-guiiugdev-pwa-configanalytics)).
Le même module est exporté sous `./vite-seo` et `./vite-pwa-base`._

```ts
import {
  pwaSeoPlugin,
  spaFallbackPlugin,
} from '@mister-guiiug/dev-pwa-config/vite-seo';

export default defineConfig({
  plugins: [
    react(),
    pwaSeoPlugin({
      basePath: '/mister-molkky/', // sinon VITE_BASE_PATH
      logoPath: '/logo.svg', // → __SEO_LOGO_URL__
      iconQuery: '?v=1.0.1', // → __PWA_ICON_QS__ (cache-busting)

      // Le script anti-FOUC, injecté en tête de <head>. `legacyKeys` migre la
      // préférence déjà enregistrée : SIX clés distinctes existent dans la
      // famille, et sans elles l'adoption la perd en silence.
      themeBoot: { storageKey: 'dwc_theme', legacyKeys: ['theme'] },

      // Deux <meta name="theme-color"> par schéma, qui remplacent celle de
      // l'index. Dix apps sur quinze gardaient une barre claire en sombre.
      themeColor: { light: '#0f766e', dark: '#0b1220' },

      // Des écrans PUBLICS servis en 200 (voir « Routes publiques »).
      routes: [
        {
          path: 'a-propos',
          title: 'À propos de Mister Mölkky, compteur de points',
          description:
            'Qui a fait l’app, ce qu’elle garde, comment la joindre.',
        },
      ],
    }),
    spaFallbackPlugin(), // 404.html = index.html, marqué noindex
  ],
});
```

Options : `siteName` (le nom pour `og:site_name` d'une app **hors catalogue** —
le nom du catalogue l'emporte), `sitemap` (défaut `true`), `robots` (défaut
**`false`**, voir plus bas), `outDir`, `changefreq`, `basePath`, `logoPath`,
`iconQuery`, `llms` (opt-in : `true` = auto catalogue, une chaîne = ce texte,
omis = rien), `themeBoot`, `themeColor`, `extraReplacements`, `jsonLd`,
`routes`, `servedContent`, `contentPages`, `ogImage`.

Variables d'environnement lues au build : `VITE_BASE_PATH`,
`VITE_PUBLIC_SITE_ORIGIN`, `PWA_SEO_PREVIOUS_STATE` et `PWA_SEO_CHANGED_FILE`
(voir « Plan de site, `lastmod` réel, IndexNow »). Le plugin est un
**sur-ensemble** des anciens plugins maison (mister-puzzle `vite-plugin-seo.ts`,
miss-carbook `htmlTrackingPlugin()`), désormais factorisés ici.

#### Ce que le plugin pose dans `index.html`

- **Les marqueurs** `__SEO_HOME_URL__` (l'URL d'accueil), `__SEO_LOGO_URL__` et
  `__PWA_ICON_QS__`, plus ceux d'`extraReplacements`.
- **Les balises texte qui manquent** : `og:type` (`website`), `og:site_name`
  (le nom du catalogue), `og:locale` (tiré de `<html lang>` : `fr` → `fr_FR`),
  `og:url` (la canonique), `og:title` (le `<title>`), `og:description` (la
  description), `twitter:card`, `twitter:title` et `twitter:description`. Une
  valeur écrite à la main n'est **jamais** remplacée — sauf `og:locale`,
  normalisé, parce que « fr » n'est pas le format `langue_TERRITOIRE`
  qu'attend Open Graph. Relevé du 29/09/2026 : six accueils n'avaient ni
  `og:site_name` ni `og:locale`.
- **L'image de partage.** Si le dossier public porte `og-image.jpg` (ou `.png`)
  — celle que dessine `npx pwa-og-image` —, les balises écrites à la main sont
  remplacées par le jeu complet : `og:image` (avec une empreinte de contenu,
  que les réseaux gardent en cache par URL), `og:image:type`, `:width`,
  `:height`, `:alt`, `twitter:card` en `summary_large_image` et
  `twitter:image`. `ogImage: 'autre.jpg'` change de fichier, `false` coupe.
- **Les données structurées**, dans `<head>` (voir ci-dessous). Rien n'est
  injecté si la page porte déjà un `application/ld+json` ; `jsonLd: false` les
  coupe, `jsonLd: { … }` surcharge des champs du `WebApplication`.
- **Le contenu servi**, au build seulement (voir plus bas).

#### Un seul graphe d'entités

L'éditeur de la famille est **un** nœud, déclaré par le hub sous l'`@id`
`https://mister-guiiug.github.io/#org`, et exporté par le catalogue :
`PUBLISHER` (`Organization`, nom « mister-guiiug », `alternateName`
« GuiiuG », logo, `sameAs` GitHub), `SITE_ID` (`…/#site`, le `WebSite` du parc)
et `INDEXNOW_KEY` (la clé IndexNow, publique). Relevé du 29/09/2026 :
l'éditeur était une `Person` sur les apps, une `Organization` sur le hub, une
autre `Organization` sur mister-puzzle, et aucune page ne partageait d'`@id`.

Le `WebApplication` injecté vit dans un `@graph`, avec le nœud `PUBLISHER`
complet :

- `@id` `<URL de l'app>#app` — les pages de contenu le désignent par `about` ;
- `author` et `publisher` → `{ "@id": "…/#org" }`, `isPartOf` →
  `{ "@id": "…/#site" }` ;
- `sameAs` : le dépôt **seulement** (l'accueil du parc est une autre entité,
  déjà reliée par `isPartOf`) ;
- `inLanguage` : les langues de l'interface relevées au catalogue
  (`languages`, par exemple `["fr", "en"]`), sinon `<html lang>` ;
- `featureList` : les fonctions du catalogue (`features`, trois à six) ;
- `screenshot` : les captures du **manifeste construit**, en URL absolues —
  reportées au build, une fois `vite-plugin-pwa` passé ;
- nom et catégorie tirés du catalogue, description, image et langue de la
  page, `offers` à 0 €, `isAccessibleForFree`, une `ViewAction`.

Pas de note ni d'avis : Google n'affiche la fiche enrichie d'une application
qu'avec une note, et en inventer une serait une donnée fausse.

#### Le contenu servi

Au build, le premier `<div id="…"></div>` VIDE du `<body>` (`app`, `root`,
`react-root`…) reçoit, dans cet ordre :

1. le `<title>` de la page en `<h1>`, et sa description ;
2. le texte de **`content/accueil.md`**, s'il existe ;
3. les liens vers les pages de contenu — une page anglaise porte `lang` et
   `hreflang="en"` ;
4. « **Dans la même catégorie** » : les apps sœurs du catalogue (même
   catégorie, web seulement, quatre au plus ; complétées par rotation sous
   deux, le titre devenant « À découvrir aussi ») ;
5. « **Code source sur GitHub** » (le `repoUrl` du catalogue) ;
6. le lien vers l'accueil du parc, et un `noscript`.

C'est ce que lit un robot qui n'exécute pas le JavaScript — au relevé du
29/09/2026, 32 à 52 mots par accueil, rien sur « pour qui », « comment ça
marche » ou « où vont mes données », et aucun lien vers une autre app. React
le remplace au premier rendu (`createRoot().render()` vide le conteneur) ;
d'ici là, le visiteur voit le nom de l'app plutôt qu'une page blanche. Pas de
script, un style en ligne ; un point de montage qui porte déjà du contenu n'est
pas touché ; `servedContent: false` coupe. Rien n'est injecté en développement.

**`content/accueil.md`** est écrit app par app, en Markdown court : `##` et
`###`, paragraphes, listes, gras, italique, liens. **Pas de `#`** — l'accueil a
déjà son titre, le `<h1>` tiré du `<title>` : un `#` fait échouer le build en
nommant le fichier. Un en-tête `---` en tête, même vide, est toléré et ignoré.
Le texte se lit aligné à gauche, avec ses puces.

#### Pages de contenu — le contrat avec les rédacteurs

Chaque `content/pages/<slug>.md` devient au build un fichier HTML
**statique** `<base>/<slug>.html` ; chaque `content/pages/en/<slug>.md`, un
fichier `<base>/en/<slug>.html`. Ils sont lus tels quels par tout robot,
entrent au plan de site et au contenu servi de l'accueil. Les fichiers qui
commencent par `_` et les `README.md` sont ignorés.

L'en-tête, une clé `clé: valeur` par ligne :

| Clé           | Rôle                                                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `title`       | **Obligatoire.** Le `<title>` (50 à 65 caractères).                                                                       |
| `description` | **Obligatoire.** La meta description (130 à 160 caractères).                                                              |
| `slug`        | Facultatif : sinon le nom du fichier. Minuscules ASCII et tirets ; ni `index`, ni `404`, ni `sw`, ni `offline`.           |
| `date`        | `AAAA-MM-JJ` : la publication. « Publié le … », `datePublished`, `article:published_time`.                                |
| `updated`     | `AAAA-MM-JJ`, facultatif : la dernière mise à jour DE FOND. « Mis à jour le … », `dateModified`, `article:modified_time`. |
| `answer`      | La réponse directe, 40 à 70 mots, sur UNE ligne, avec le chiffre clé. Des guillemets englobants sont retirés.             |
| `translation` | Sur une page ANGLAISE : le slug de la page française qu'elle traduit.                                                     |

```md
---
title: Règles du Mölkky : le jeu, le score et les pénalités
description: Les règles du Mölkky expliquées simplement… (130 à 160 caractères)
date: 2026-09-25
updated: 2026-09-29
answer: Le premier joueur à atteindre exactement 50 points gagne ; une quille seule vaut son numéro, plusieurs valent leur nombre, et dépasser 50 ramène à 25. Trois lancers ratés de suite éliminent le joueur.
---

# Règles du Mölkky

Paragraphe, **gras**, _italique_, `code`, [lien](https://…) ou [page sœur](autre.html).

## Section

- une liste à un niveau

## Questions fréquentes

### Combien de joueurs ?

Réponse.

## Sources

- [Fédération française de Mölkky](https://…) : le règlement officiel.
```

La page anglaise, `content/pages/en/molkky-rules.md`, porte le même en-tête
plus `translation: regles-du-molkky` ; sa FAQ se lit sous
`## Frequently asked questions`, ses sources sous `## References`.

**Le Markdown reconnu** est volontairement court : titres `#` à `###`,
paragraphes, listes, gras, italique, code, liens `https:`, `mailto:`, ancres,
ou vers une autre page de l'app (`autre.html`, `en/autre.html`,
`../autre.html`). Tout est échappé, aucun HTML ne passe. La FAQ se lit dans
`## Questions fréquentes` (ou `## Frequently asked questions`) : chaque `###`
est une question. La section `## Sources` (ou `## References`) est rendue à
part — plus petite, les longues URL coupées —, ses URL nues deviennent des
liens, et ses liens sont repris en `citation`.

**Ce que le gabarit ajoute** : l'en-tête de l'app (icône, nom), le fil
d'Ariane, sous le titre la **signature** « Publié le 25 septembre 2026 · Mis à
jour le 29 septembre 2026 · par mister-guiiug » (le nom mène à
`https://mister-guiiug.github.io/a-propos.html` ; en anglais « Published … ·
Updated … · by … ») puis le bloc « **En bref.** » (« In short. ») tiré
d'`answer` ; l'encadré « Ouvrir <App> », « À lire aussi » (les autres pages de
la même langue), « **Dans la même catégorie** » avant le pied de page, une CSP
stricte, et les données structurées : `Article` (`datePublished`,
`dateModified` = `updated`, sinon `date`, `abstract` = `answer`, `author` et
`publisher` → `#org`, `about` → `<app>#app`, `isPartOf` → `#site`),
`BreadcrumbList`, `FAQPage`, et le nœud `Organization`. Open Graph : `og:locale`
`fr_FR` ou `en_US`, `article:published_time`, `article:modified_time`, et un
`og:image:alt` qui décrit la page. La langue (`lang`, `inLanguage`) est celle de
la PAGE, plus celle de l'accueil.

**Traductions.** Une page française et sa traduction portent toutes deux
`<link rel="alternate">` `hreflang="fr"`, `hreflang="en"` et `x-default` (la
française) — **réciproques par construction** — et un lien visible vers l'autre
langue. Rien sans traduction : un `hreflang` n'a de sens qu'entre des URL
distinctes.

**Ce qui fait échouer le build, en nommant le fichier** : un en-tête
incomplet, deux `#`, un slug invalide ou déjà pris dans sa langue, une `date`
ou un `updated` qui n'est pas une date, une `translation` qui ne désigne aucune
page française, deux pages anglaises qui traduisent la même.

**Pourquoi `.html` dans l'URL** : le service worker répond `index.html` à
toute navigation SAUF aux chemins à extension (`NAVIGATE_FALLBACK_DENY_FILES`)
— une page en `/regles/` serait remplacée par l'app chez qui l'a déjà ouverte.
`contentPages: 'autre/dossier'` change de dossier, `false` coupe.

#### Plan de site, `lastmod` réel, IndexNow

Le plan de site (`<base>/sitemap.xml`) liste l'accueil, les routes publiques
et les pages de contenu — françaises et anglaises — **effectivement écrites**.

**`lastmod` ne vaut plus le jour du build.** Relevé du 29/09/2026 : toutes les
URL du parc changeaient de `lastmod` à chaque déploiement, et la publication du
hub signalait les 41 URL à IndexNow à chaque passage. Le plugin calcule
désormais une **empreinte** par URL — pour l'accueil : titre, description,
contenu servi et JSON-LD hors valeurs volatiles ; pour une page : sa source et
son en-tête ; pour une route : son chemin et ses textes — et publie
`<base>/seo-state.json` (`{ url: { hash, lastmod } }`). Au déploiement
suivant :

- `PWA_SEO_PREVIOUS_STATE` désigne l'état publié la fois d'avant :
  `pwa-deploy.yml` le récupère (`curl`) avant le build ;
- une empreinte inchangée reprend son ancien `lastmod` ; une empreinte
  nouvelle ou changée prend le jour du build ;
- une page qui porte `updated` ou `date` : **cette date éditoriale prime** ;
- sans état précédent, tout est « modifié » et daté du jour — le
  comportement d'avant.

La liste des URL nouvelles ou modifiées est écrite dans `seo-changed.json`,
**hors** du site publié : `PWA_SEO_CHANGED_FILE`, sinon
`node_modules/.cache/pwa-seo/seo-changed.json`. `pwa-deploy.yml` la passe au
job **`indexnow`** : après le déploiement, il attend que la clé
(`https://mister-guiiug.github.io/<clé>.txt`) puis chaque URL répondent 200 —
Bing enregistre sinon un « Page Fetch Failed » — et fait **un** envoi groupé.
Rien n'est envoyé hors de `mister-guiiug.github.io` ni pour une liste vide ; un
échec ne fait jamais échouer le déploiement. L'entrée `indexnow: false` le
coupe. Un déploiement écrit à la main pose les deux variables lui-même.

#### Routes publiques en 200

GitHub Pages n'a pas de repli SPA en 200 : `/<app>/a-propos` répondait **404**
(le `404.html` est servi avec ce statut), et l'option `routes` mettait au plan
de site des URL qu'aucun moteur ne pouvait indexer. Chaque route (`'a-propos'`,
ou `{ path, title, description }`) devient désormais un fichier
`<base>/<path>.html` : l'`index.html` construit, avec son `<title>`, sa
description, sa canonique **sans extension**, son `og:url`, son `og:title`,
son `og:description` — et son contenu servi, sans le texte propre à l'accueil.
GitHub Pages sert `/<base>/<path>` depuis ce fichier, en 200 ; le routeur de la
SPA affiche ensuite l'écran. Seulement des écrans servis à froid : un chemin
derrière une connexion n'a rien à y faire.

Refusés au build, en nommant la route : un chemin hors du motif (minuscules
ASCII, tirets, segments séparés par `/` — pas de requête `?…`), réservé
(`index`, `404`, `sw`, `offline`), en double, en collision avec une page de
contenu, `en` quand il y a des pages anglaises, ou un dossier du build
(`assets`).

#### `404.html`, `robots.txt`, `llms.txt`

- **`404.html`** (`spaFallbackPlugin`, et la copie de `pwa-deploy.yml`) porte
  `<meta name="robots" content="noindex">` ; ses balises `robots` écrites à la
  main et sa canonique sont retirées — une page `noindex` qui désigne une
  canonique envoie deux signaux contraires. Demandé tel quel,
  `/<app>/404.html` répondait 200 avec la canonique de l'accueil.
- **`robots.txt`** n'est plus écrit par défaut (`robots: false`) : il n'est
  lu qu'à la racine d'une origine, et c'est `mister-guiiug.github.io` qui
  déclare les plans de site de tout le parc. `robots: true` pour une app
  servie à la racine d'un domaine.
- **`llms.txt`** reste opt-in (`llms: true` ou une chaîne) : Google ne s'en
  sert pas.

#### Ce que le docteur en vérifie

`pwa-doctor` lit les pages comme le build les lit (`contentPageFiles`, le
dossier de l'option `contentPages`) :

| Contrôle             | Niveau | Ce qui le déclenche                                                                                    |
| -------------------- | ------ | ------------------------------------------------------------------------------------------------------ |
| `seo-content-pages`  | dette  | aucune page publiable (un README seul ne compte plus) ; muet avec `contentPages: false`                |
| `seo-content-date`   | dette  | une page sans `date`, ou une `date` / un `updated` dans le futur                                       |
| `seo-content-answer` | dette  | une page sans `answer`, ou une réponse hors de 30 à 80 mots                                            |
| `seo-faq-visible`    | défaut | un `FAQPage` écrit à la main dans `index.html` dont une question n'apparaît pas dans le HTML servi     |
| `seo-hreflang`       | défaut | deux langues vers la même URL, une traduction qui ne désigne pas en retour, ou orpheline               |
| `seo-entity`         | info   | un JSON-LD écrit à la main dont l'auteur n'est pas l'`@id` de la famille                               |
| `seo-runtime-title`  | info   | `src/` réécrit `document.title` sans reprendre le titre statique (heuristique : voir `pwa-doctor.mjs`) |

Et, sur les sites publiés, `node scripts/probe-sites.mjs --seo` (outil du
dépôt) affiche par app les longueurs du titre et de la description, les types
JSON-LD, les mots du contenu servi, le statut des pages de contenu (et `en/`)
et la présence des `hreflang`.

### Mesure d'audience (`@mister-guiiug/dev-pwa-config/analytics`)

Le tag était posé, la mesure n'existait pas. Mesure sur les seize apps, avant
ce module : neuf portaient les marqueurs `__ANALYTICS_*__` (que `pwaSeoPlugin`
ne traite plus, et que le parc a retirés en septembre 2026), trois avaient
recopié un extrait `gtag` en dur, sept n'avaient rien — et **aucune**
n'envoyait le moindre événement ni la moindre vue de page après le chargement
initial.

**La voie courte : monter le bandeau, et rien d'autre.** `ConsentBanner` appelle
`initAnalytics` lui-même s'il le faut, rejoue le choix mémorisé et pose la
question quand il n'y en a pas. Une ligne par application.

```tsx
import { ConsentBanner } from '@mister-guiiug/dev-pwa-config/react/consent-banner';

<ConsentBanner
  posthogKey={import.meta.env.VITE_POSTHOG_KEY}
  policyHref="/confidentialite"
/>;
```

Sans `VITE_POSTHOG_KEY`, il ne rend **rien** : il n'y a rien à mesurer,
donc rien à demander. Une app peut donc le monter avant que l'identifiant
n'existe.

**La voie longue**, pour une app qui gère l'accord ailleurs (une CMP, un écran
de réglages) :

```ts
// main.tsx
import {
  initAnalytics,
  setAnalyticsConsent,
} from '@mister-guiiug/dev-pwa-config/analytics';

initAnalytics({ posthogKey: import.meta.env.VITE_POSTHOG_KEY });
// Rien n'est injecté ici : ni script, ni requête, ni cookie.

// …quand l'utilisateur accepte, où que ce soit dans l'app :
setAnalyticsConsent({ analytics: true }); // le tag est chargé à cet instant
```

⚠️ **Un accord ne survit pas tout seul.** `initAnalytics` repart toujours de
`denied` : au chargement suivant, l'accord d'hier doit être **rejoué** par un
`setAnalyticsConsent`, sinon le tag n'est jamais injecté et la mesure s'arrête
sans que rien ne le signale. `ConsentBanner` le fait ; une implémentation
maison doit y penser.

```tsx
// Une vue de page par navigation — PostHog n'en envoie qu'une par chargement de
// document, donc toute la navigation d'une PWA est invisible sans ce hook.
import { usePageViews } from '@mister-guiiug/dev-pwa-config/react/use-page-views';

usePageViews(useLocation().pathname);

// Et les événements métier :
trackEvent('partie_terminee', { score, duree_s });
```

Trois règles que le module tient à votre place :

- **Rien avant l'accord.** `trackEvent` et `trackPageView` renvoient `false`
  tant que `analytics_storage` n'est pas accordé, et le `<script>` n'est même
  pas créé. Les hooks peuvent donc être montés sans condition.
- **Chaque événement porte `app_name`**, déduit du chemin de base
  (`/mister-cim10/` → `mister-cim10`). Les sites du parc partagent une propriété
  PostHog : sans cette dimension, le total est lisible et le détail ne l'est plus.
  Pas `page_path`, dont la cardinalité finit dans « (other) ».
- **Une seule vue par navigation.** PostHog est configuré avec
  `capture_pageview: false`, pour que la page d'entrée passe par le même chemin
  que les autres au lieu d'être comptée deux fois.

`cspPlugin({ analytics: true })` autorise déjà les hôtes nécessaires :
`eu.i.posthog.com` pour l'ingestion, et `eu-assets.i.posthog.com` d'où
`posthog-js` charge sa configuration distante à chaque `init`. Aucun script en
ligne à hacher.

#### Les gestes communs sont DÉJÀ instrumentés

Trois gestes partent du socle, sans une ligne dans l'application : l'invite
d'installation (`installation`), le bandeau de mise à jour (`maj`) et le bouton
de partage (`partage`). Chacun porte une étape — `proposee`, `acceptee`,
`refusee`, `reportee`, `appliquee` — ce qui en fait des entonnoirs plutôt que
des compteurs : sans l'impression, un taux d'acceptation n'a pas de
dénominateur.

**Trois noms pour tout le parc, et c'est voulu.** Dix-neuf applications
partagent un projet : le détail vit dans les propriétés, pas dans le nom, sinon
la liste d'événements devient la première chose qu'on voit et la dernière qu'on
comprend. Une application qui instrumente un geste qui lui est propre suit la
même forme, et importe son vocabulaire :

```ts
import { GESTES, trackEvent } from '@mister-guiiug/dev-pwa-config/analytics';
```

⚠️ **Aucune valeur libre, jamais.** Les propriétés ne portent que des constantes
énumérées. Pas le texte d'un élément, pas une saisie, pas un identifiant que
l'utilisateur se partage — c'est la raison même pour laquelle `autocapture` est
coupée (ADR 0012) : elle enregistrerait des libellés de diagnostic sur
`mister-cim10`. Instrumenter à la main ne sert à rien si c'est pour reconstituer
le même risque.

### `vite-pwa` — options `VitePWA()` partagées

```ts
import { pwaBaseOptions } from '@mister-guiiug/dev-pwa-config/vite-pwa';

VitePWA(
  pwaBaseOptions({
    id: 'miss-uwh', // identifiant du dépôt : base, scope, et couleurs du thème
    name: 'Miss UWH — Bilan comptable',
    shortName: 'Miss UWH',
    description: 'Bilan comptable saisonnier d’un club de hockey subaquatique.',
    categories: ['finance', 'productivity', 'sports'],
    shortcuts: [{ name: 'Journal', url: '#/finances/journal' }],
  })
);
```

Relevé du 23/08/2026 sur les seize apps, avant ce module :

|                   |                                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `registerType`    | 10 en `prompt`, 4 en `autoUpdate`, 2 sans                                                                              |
| `runtimeCaching`  | 5 apps sur 16 en déclarent un                                                                                          |
| manifest          | 3 apps sans `display` ni `theme_color`                                                                                 |
| mise à jour du SW | **15 apps sur 16** recâblent `virtual:pwa-register` à la main, alors que `react/use-update-prompt` existe (1 adoptant) |

Trois défauts méritent d'être expliqués, parce qu'on pourrait les « améliorer »
à tort :

- **`registerType: 'prompt'`** — seul mode compatible avec `use-update-prompt` +
  `UpdatePromptBanner` que le paquet livre. En `autoUpdate`, l'app se recharge
  sous les doigts de l'utilisateur, parfois au milieu d'une saisie.
- **Aucune mise en cache d'API par défaut** — mettre en cache une réponse
  authentifiée expose les données d'un utilisateur au suivant sur un appareil
  partagé. Les origines à mettre en cache se déclarent (`apiOrigins`), et
  passent en `NetworkFirst` : une donnée périmée servie en ligne est un bug
  fonctionnel, pas une optimisation.
- **`theme_color` et `background_color` sont LUS dans `themes.js`** quand l'app
  y figure, plutôt que recopiés. Cinq manifests sur treize avaient divergé du
  relevé, sans qu'on puisse distinguer le choix délibéré de l'oubli. Une couleur
  passée explicitement l'emporte toujours — le choix reste possible, il devient
  écrit.
- **Les fichiers échappent au repli de navigation**
  (`NAVIGATE_FALLBACK_DENY_FILES`). Sans cette règle, le worker répond
  `index.html` à toute navigation dans sa portée. Relevé du 24/09/2026 : avec
  le worker installé, `…/sitemap.xml` rendait l'accueil de l'app, sur tout le
  parc. Une `navigateFallbackDenylist` passée dans `workbox` **s'ajoute** à la
  règle au lieu de la remplacer.

Une app qui écrit son `VitePWA()` sans `pwaBaseOptions` pose la règle
elle-même, en tête de sa propre liste :

```ts
import { NAVIGATE_FALLBACK_DENY_FILES } from '@mister-guiiug/dev-pwa-config/vite-pwa';

VitePWA({
  workbox: {
    navigateFallbackDenylist: [NAVIGATE_FALLBACK_DENY_FILES, /^\/api\//],
  },
});
```

Le module n'importe **pas** `vite-plugin-pwa` : il renvoie un objet d'options
ordinaire, que l'app passe à son propre `VitePWA()`.

> **`vite-pwa-base` ne contient rien de PWA** : ni manifest, ni service worker,
> ni stratégie de cache — c'est du SEO et de l'analytics. Il est désormais aussi
> exporté sous `./vite-seo`, qui dit ce qu'il fait. `./vite-pwa-base` reste
> valide tant que des apps l'importent.

### `vite-csp` — Content-Security-Policy par hash

```ts
import { pwaSeoPlugin } from '@mister-guiiug/dev-pwa-config/vite-pwa-base';
import { cspPlugin } from '@mister-guiiug/dev-pwa-config/vite-csp';

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
    pwaSeoPlugin({ siteName: 'Mister Puzzle' }),
    cspPlugin({
      dev: command === 'serve',
      connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co'],
      analytics: true, // ← si l'app mesure (ConsentBanner, PostHog)
    }),
    VitePWA({ ... }),
  ],
}));
```

`cspPlugin` doit venir **après** `pwaSeoPlugin` : il hashe le HTML final, donc
les scripts inline injectés en amont (le script anti-FOUC de `themeBoot`). Les
blocs JSON-LD ne sont pas exécutés : ils restent hors de `script-src`.

**`analytics: true` n'est pas cosmétique.** PostHog charge un `<script src>`
externe, que `default-src 'self'` bloque sans la moindre erreur de build.
Mesurer (`ConsentBanner`) sous `cspPlugin` sans cette option coupe donc
l'analytics **en silence**. L'option ajoute exactement les hôtes de PostHog
(`ANALYTICS_HOSTS` : `script` et `connect`).

**Ce qu'une CSP en `<meta>` ne peut pas faire.** La spécification exclut
`frame-ancestors`, `report-uri` et `sandbox` d'une politique délivrée par
balise : le navigateur les **ignore**. Le template `index.html` de ce paquet
portait `frame-ancestors 'none'` — une protection anti-clickjacking qui n'a
jamais existé, avec toute l'apparence du contraire. Le plugin **retire** désormais
ces trois directives et le signale, plutôt que de les relayer. Huit apps de la
famille en passaient une : échouer aurait cassé huit builds pour retirer
quelque chose que le navigateur ignorait déjà.

Pour protéger réellement du clickjacking, il faut un **en-tête HTTP** :

```jsonc
// firebase.json — pour les apps déployées sur Firebase Hosting
{
  "hosting": {
    "headers": [
      {
        "source": "**",
        "headers": [
          {
            "key": "Content-Security-Policy",
            "value": "frame-ancestors 'none'",
          },
        ],
      },
    ],
  },
}
```

**GitHub Pages ne permet aucun en-tête personnalisé** : les apps qui y sont
déployées n'ont pas de protection anti-clickjacking effective. C'est un fait à
connaître, pas à masquer derrière une directive inerte.

### Tests a11y (axe-core) — `playwright-a11y`

```ts
// e2e/a11y.spec.ts  (cf. templates/e2e/a11y.spec.ts ; npm i -D @axe-core/playwright)
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { expectNoA11yViolations } from '@mister-guiiug/dev-pwa-config/playwright-a11y';

test('@a11y accueil sans violation WCAG A/AA', async ({ page }) => {
  await page.goto('/');
  await expectNoA11yViolations(page, AxeBuilder, expect);
});
```

### Garde de l'écran d'entrée — `playwright-entree`

Trois fois en un mois, une pièce à effet de bord s'est retrouvée montée
**derrière la porte** d'une app : `registerSW` (aucun service worker enregistré
tant que l'accueil n'était pas franchi), `ConsentBanner` (quatre apps ne posaient
jamais la question), `usePageViews` (trois apps n'envoyaient aucune vue). À
chaque fois le composant était bien écrit, la CI verte, et le défaut trouvé
**en production**. Cette garde teste une PLACE, pas un composant.

```ts
// e2e/entree.spec.ts
import { test, expect } from '@playwright/test';
import { expectEcranEntreeCable } from '@mister-guiiug/dev-pwa-config/playwright-entree';

test('@critical l’écran d’entrée est câblé', async ({ page }) => {
  await expectEcranEntreeCable(page, expect, { url: '/mon-app/' });
});
```

Elle vérifie, sur l'écran d'entrée : la question du consentement est posée, une
vue de page part après l'accord, un service worker s'enregistre.

**Il faut un identifiant de mesure au build e2e**, sinon `ConsentBanner` ne rend
rien — il n'y a rien à demander — et les deux premières vérifications n'ont pas
d'objet. Poser une valeur factice dans le `.env` du mode e2e :

```sh
VITE_POSTHOG_KEY=phc_e2e00000000000000000000
```

Le trafic vers PostHog est intercepté par la garde elle-même : rien ne sort, et
aucun projet réel n'est touché. Elle lit `window.__DWC_MESURE`, que le socle
remplit au moment de l'appel, avant tout échange réseau. (La clé doit avoir la
forme d'une clé PostHog, `phc_` suivi d'au moins vingt caractères : sinon
`ConsentBanner` ne rend rien.)

Pour une app sans mesure, `{ consentement: false }` ne garde que le service
worker — et la vue de page devient invérifiable, ce que la garde refuse de
faire semblant de vérifier.

**Une app peut avoir PLUSIEURS portes.** `miss-uwh` en a deux — connexion et
onboarding — et corriger la première a laissé la seconde muette ; c'est la garde
qui l'a trouvée. Le remède qui tient : faire **déclarer sa vue par l'écran**
(`usePageViews('/connexion')` dans l'écran de connexion), plutôt que de recopier
au-dessus de la porte une condition qui devrait suivre chaque porte.

### `package.json` (icônes PWA)

```jsonc
{
  "scripts": {
    "icons": "pwa-icons --source public/favicon.svg --out public --maskable",
  },
}
```

### `commitlint.config.js`

```js
export { default } from '@mister-guiiug/dev-pwa-config/commitlint';
```

### `lint-staged.config.js`

```js
export { default } from '@mister-guiiug/dev-pwa-config/lint-staged';
```

### `src/test/setup.ts` (setup partagé)

```ts
import '@mister-guiiug/dev-pwa-config/vitest-setup';
// puis les mocks spécifiques au projet si besoin…
```

> ⚠️ **Permissions caller obligatoires.** Les reusable workflows héritent des permissions du caller (intersection only — le called ne peut pas en élever). Le bloc `permissions:` doit être déclaré au **niveau du caller**, sinon `pages: write` / `id-token: write` / `packages: read` manqueront et le job échouera en `startup_failure` ou se bloquera sur les actions publish/deploy.
