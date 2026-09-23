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

```ts
import { pwaSeoPlugin } from '@mister-guiiug/dev-pwa-config/vite-pwa-base';

export default defineConfig({
  plugins: [
    react(),
    pwaSeoPlugin({
      siteName: 'Mister Puzzle',
      basePath: '/mister-puzzle/', // sinon VITE_BASE_PATH
      logoPath: '/logo.svg', // → __SEO_LOGO_URL__ (OG/Twitter/JSON-LD)
      iconQuery: '?v=1.0.1', // → __PWA_ICON_QS__ (cache-busting)
      posthogKey: 'phc_…', // ID explicite (sinon VITE_POSTHOG_KEY)
      llms: '# Mon app\n…', // génère dist/llms.txt

      // Le script anti-FOUC, injecté en tête de <head>. `legacyKeys` migre la
      // préférence déjà enregistrée : SIX clés distinctes existent dans la
      // famille, et sans elles l'adoption la perd en silence.
      themeBoot: { storageKey: 'dwc_theme', legacyKeys: ['theme'] },

      // Deux <meta name="theme-color"> par schéma, qui remplacent celle de
      // l'index. Dix apps sur quinze gardaient une barre claire en sombre.
      themeColor: { light: '#0f766e', dark: '#0b1220' },
    }),
  ],
});
```

**Le consentement précède le tag.** Les fragments PostHog sont désormais
précédés d'un `gtag('consent', 'default', …)` où tous les signaux sont `denied`.
C'est la seule position où le mode consentement de Google en tient compte : une
commande postérieure au chargement n'a pas d'effet rétroactif. `consent: false`
restaure le comportement d'avant, pour un déploiement qui gère le consentement
ailleurs (une CMP).

Placeholders remplacés dans `index.html` : `__ANALYTICS_HEAD__` (dans `<head>`),
`__ANALYTICS_BODY__` (début de `<body>`), `__SEO_HOME_URL__`, `__SEO_LOGO_URL__`,
`__PWA_ICON_QS__`. Génère `sitemap.xml` + `robots.txt` (+ `llms.txt` si `llms`).

**Données structurées, sans réglage.** Le plugin injecte dans `<head>` un
`WebApplication` schema.org : nom et catégorie tirés du catalogue
(`FAMILY_APPS`), description, image et langue tirées de l'`index.html`. Rien
n'est injecté si la page porte déjà un `application/ld+json`. `jsonLd: false` le
coupe ; `jsonLd: { … }` surcharge des champs. Le plan de site porte `lastmod`
(jour du build) ; `routes: ['a-propos', 'en/']` y ajoute des écrans PUBLICS.
Le `robots.txt` écrit dans `dist/` est ignoré des robots — un `robots.txt` n'est
lu qu'à la racine d'une origine ; c'est `mister-guiiug.github.io` qui déclare
les plans de site de tout le parc.

**Contenu servi, sans réglage.** Au build, le premier `<div id="…"></div>` VIDE
du `<body>` (`app`, `root`, `react-root`…) reçoit le titre de la page en `<h1>`,
sa description et un lien vers l'accueil du parc. C'est ce que lit un robot qui
n'exécute pas le JavaScript. React le remplace au premier rendu
(`createRoot().render()` vide le conteneur) ; d'ici là, le visiteur voit le nom
de l'app plutôt qu'une page blanche. Un point de montage qui porte déjà du
contenu n'est pas touché ; `servedContent: false` coupe l'injection. Rien n'est
injecté en développement.
Variables d'env de build : `VITE_POSTHOG_KEY`,
`VITE_PUBLIC_SITE_ORIGIN`, `VITE_BASE_PATH`. Le plugin est un **sur-ensemble** des
anciens plugins maison (mister-puzzle `vite-plugin-seo.ts`, miss-carbook
`htmlTrackingPlugin()`), désormais factorisés ici.

### Mesure d'audience (`@mister-guiiug/dev-pwa-config/analytics`)

Le tag était posé, la mesure n'existait pas. Mesure sur les seize apps : neuf
portent les marqueurs `__ANALYTICS_*__`, trois ont recopié un extrait `gtag` en
dur, sept n'ont rien — et **aucune** n'envoie le moindre événement ni la moindre
vue de page après le chargement initial.

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
      analytics: true, // ← si pwaSeoPlugin injecte PostHog
    }),
    VitePWA({ ... }),
  ],
}));
```

`cspPlugin` doit venir **après** `pwaSeoPlugin` : il hashe le HTML final, donc
les scripts inline injectés en amont.

**`analytics: true` n'est pas cosmétique.** PostHog charge un `<script src>`
externe, que `default-src 'self'` bloque sans la moindre erreur de build.
Activer les deux plugins sans cette option coupe donc l'analytics **en
silence**. L'option ajoute exactement les
hôtes que `pwaSeoPlugin` injecte (`script`, `img`, `connect`, `frame`).

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
VITE_POSTHOG_KEY=G-E2E0000000
```

Le trafic vers Google est intercepté par la garde elle-même : rien ne sort, et
aucune propriété réelle n'est touchée. Elle lit `dataLayer`, que `gtag` remplit
avant tout appel réseau.

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
