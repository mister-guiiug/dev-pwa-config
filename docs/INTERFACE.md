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

# Interface : composants, styles et accessibilité

_Manuel du socle `@mister-guiiug/dev-pwa-config` — les composants React, leur habillage CSS, le catalogue famille et l’accessibilité. Retour au
[README](../README.md)._

### `src/index.css` (Tailwind 4)

```css
@import 'tailwindcss';
@import '@mister-guiiug/dev-pwa-config/tailwind-preset.css';

/* Tokens spécifiques au projet ici */
@theme {
  --color-brand: oklch(...);
}
```

Ce que l'import apporte exactement (et ce qu'il n'apporte pas) est visible dans
le [showroom](../README.md#showroom-du-design-system) : `npm run showroom`.

### Habillage des composants (`components.css`, opt-in)

Les composants `/react` ne posent que des attributs `data-dwc` : non stylés, par
construction. En pratique, **11 apps sur 13 ont fini par réécrire à la main les
mêmes 12 à 23 sélecteurs**, et **7 ont réimplémenté `EmptyState`** plutôt que
d'habiller celui du paquet. `components.css` ferme cet écart :

```css
@import 'tailwindcss';
@import '@mister-guiiug/dev-pwa-config/tailwind-preset.css';
@import '@mister-guiiug/dev-pwa-config/components.css'; /* ← opt-in */
```

Ce seul import donne déjà un rendu correct **en clair et en sombre**, sans
configuration : les replis passent par les couleurs système CSS (`Canvas`,
`CanvasText`, `GrayText`), qui suivent `color-scheme`.

**Aucune dépendance à Tailwind, et c'est vérifiable.** La feuille ne contient ni
`@apply`, ni `@tailwind`, ni `theme()` : un `@import` CSS suffit, y compris dans
une app qui n'a pas Tailwind du tout (`mister-quota`, en Electron, l'a prise à
ce titre). Elle lit bien huit variables de l'échelle fluide du preset
(`--text-fluid-*`, `--spacing-fluid-*`) **en plus** des quinze jetons du
contrat, mais toutes portent un repli — sans le preset, les tailles sont figées,
rien ne casse. Et comme tous ses sélecteurs sont portés par `[data-dwc="…"]`
(les deux règles sur `:root` ne posent que des variables privées `--_dwc-*`),
elle ne peut entrer en collision avec aucun style existant.

**Le plus simple : importer aussi `tokens.css`**, qui livre un jeu de valeurs
neutre pour les quinze variables du contrat, clair et sombre, au contraste
vérifié en CI (`test/tokens.test.mjs`) :

```css
@import 'tailwindcss';
@import '@mister-guiiug/dev-pwa-config/tailwind-preset.css';
@import '@mister-guiiug/dev-pwa-config/tokens.css'; /* ← valeurs par défaut */
@import '@mister-guiiug/dev-pwa-config/components.css';

/* Puis la teinte de l'app, deux lignes : */
:root {
  --dwc-primary: var(--color-primary);
  --dwc-primary-contrast: #fff;
}
```

`tokens.css` n'impose **aucune couleur de marque** : sa primaire est une ardoise
neutre, faite pour être remplacée. Il traite les trois états de thème — choix
clair, choix sombre, et réglage « système » qui ne pose aucun attribut — et
distingue deux filets : `--dwc-border` sépare (discret), `--dwc-border-strong`
désigne le contour d'un contrôle (3:1, WCAG 1.4.11).

Pour brancher le contrat sur les variables existantes de l'app plutôt que sur
les valeurs par défaut :

```css
:root {
  --dwc-surface: var(--uwh-surface);
  --dwc-surface-2: var(--uwh-surface-2);
  --dwc-text: var(--uwh-text);
  --dwc-text-soft: var(--uwh-text-soft);
  --dwc-border: var(--uwh-border);
  --dwc-border-strong: var(--uwh-border-strong);
  --dwc-primary: var(--color-primary);
  --dwc-primary-contrast: #fff;
  --dwc-primary-soft: var(--color-primary-soft);
  --dwc-success: var(--uwh-credit);
  --dwc-warning: var(--uwh-warn);
  --dwc-danger: var(--uwh-debit);
  --dwc-radius: var(--radius-card);
  --dwc-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
}
```

Les variables peuvent être définies n'importe où (`:root`, `@theme`,
`[data-theme='dark']`, `.dark`…) : la résolution passe par l'héritage, pas par
les couches.

**Rien n'est verrouillé.** Tout est en `@layer components`, la couche Tailwind
prévue pour ça : les utilitaires (`bg-primary`, `rounded-none`…) et tout CSS non
« layered » de l'app l'emportent. On garde la base, on la teinte, ou on écrase
au sélecteur près.

Trois promesses sont tenues par `test/components-css.test.mjs`, pas par la
bonne volonté : tout est confiné dans `@layer components`, chaque
`var(--dwc-*)` porte un repli, et la liste des variables lues ne dérive pas du
contrat documenté. Un quatrième test impose la **cible tactile de 2,75 rem** à
toutes les commandes — c'est le principal intérêt d'une base partagée, une
taille `sm` locale finissant toujours par passer sous le seuil.

#### N'importer que ce qu'on monte (4.10.0)

**Tailwind 4 n'élague PAS ce qui est écrit à la main dans `@layer components`.**
Mesuré le 10/09/2026 sur un build réel : une page qui n'utilise aucun composant
du paquet reçoit quand même **141 des 143 sélecteurs `[data-dwc]`** — 5,3 kB
gzip, 42,6 kB bruts. Le fichier entier part avec chaque application, quels que
soient les composants qu'elle monte.

Les mêmes règles sont donc aussi publiées **par composant**, engendrées depuis
`components.css` par `npm run sync` :

```css
@import 'tailwindcss';
@import '@mister-guiiug/dev-pwa-config/tailwind-preset.css';

/* Toujours en premier : variables de repli, focus, animations, contraste
   forcé, impression — ce que toutes les autres sections supposent. */
@import '@mister-guiiug/dev-pwa-config/components/base.css';

/* Puis un fichier par composant monté. */
@import '@mister-guiiug/dev-pwa-config/components/button.css';
@import '@mister-guiiug/dev-pwa-config/components/field.css';
@import '@mister-guiiug/dev-pwa-config/components/toast.css';
```

Mesure de l'écart, même build : **2,6 kB gzip** pour une app à onze sections sur
vingt-sept, contre 5,3 pour le fichier entier — 2,7 kB gzip et 26,7 kB bruts
qu'elle ne transfère ni ne parse. C'est modeste, et c'est dit tel quel : ce
n'est pas un chantier de performance, c'est la fin d'un gaspillage sans
contrepartie.

`components.css` **ne bouge pas** : il reste le fichier entier, et reste le
défaut recommandé pour une app qui monte l'essentiel du catalogue. Les morceaux
sont des DÉRIVÉS, jamais une seconde source — `test/components-css.test.mjs`
les recompose règle pour règle et refuse la moindre perte, et l'étape « les
fichiers engendrés sont à jour » de la CI refuse une découpe périmée.

#### Contraste forcé et impression

Deux rendus que personne ne regarde, et qui remplacent les couleurs sans
prévenir. Le fichier les traite ; les tests empêchent la récidive.

| Mode                                          | Ce qui casse par défaut                                                                                                                                                                                                                            | Ce que le fichier fait                                                                                                                                    |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Contraste forcé** (`forced-colors: active`) | `transparent` n'est **pas** remplacé : le bouton primaire perd son aplat et garde un contour invisible. `box-shadow` disparaît, le panneau modal se confond avec son voile. Le squelette et la pastille de synchro n'existaient que par leur fond. | Contour en `currentColor`, `outline` intérieur sur le panneau et le squelette, survol et état désactivé sur les paires système (`Highlight`, `GrayText`). |
| **Impression** (`@media print`)               | Les fonds sont supprimés, la couleur du texte non : un libellé en `--dwc-primary-contrast` s'imprime **blanc sur blanc**.                                                                                                                          | Texte sur aplat repassé en encre système, bannières d'installation et de mise à jour masquées, animations figées.                                         |

Aucun `forced-color-adjust: none` — figer nos teintes reviendrait à passer outre
le réglage de l'utilisateur. Un test le vérifie.

### Helpers React (`@mister-guiiug/dev-pwa-config/react`)

Hooks et composants PWA partagés (auparavant recopiés app par app). Livrés en
**JS + `.d.ts` sans build** (composants en `createElement`) : consommables tels
quels par Vite. Les composants sont **non stylés** — cibler les attributs
`[data-dwc="…"]` dans le CSS du projet.

```tsx
import {
  useLocalStorage,
  useInstallPrompt,
  useTheme,
  PwaInstallPrompt,
  AppFooter,
} from '@mister-guiiug/dev-pwa-config/react';
import { REPO_URL, SPONSOR_URL } from './links';

function Settings() {
  const { theme, setTheme, toggle } = useTheme(); // light | dark | system
  const [name, setName] = useLocalStorage('player', '');
  return (
    <>
      <button onClick={toggle}>Thème : {theme}</button>
      <PwaInstallPrompt className="install-banner" />
      <AppFooter repoUrl={REPO_URL} sponsorUrl={SPONSOR_URL} />
    </>
  );
}
```

#### Cinq façades, pour cesser de recâbler

Cinq domaines avaient leurs pièces mais aucun assemblage — et les apps
réécrivaient la jonction, ou l'oubliaient.

```tsx
// main.tsx — deux lignes que treize apps écrivaient à l'identique
await installObservability({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  webVitals: true, // erreurs ET performance, relayées au même endroit
  redactKeys: ['matricule'], // le contexte est masqué avant d'entrer dans localStorage
  context: { app: 'miss-genius', version: __APP_VERSION__ }, // joint à chaque erreur
  // `console: true` par défaut : les console.error/warn rejoignent le fil d'Ariane
});

<ObservabilityBoundary>
  {' '}
  {/* le câblage de recordError, tenu par le composant */}
  <ThemeProvider appId="miss-genius">
    {' '}
    {/* palette → variables → data-theme */}
    <IconsProvider
      icons={{ close: X, light: Sun, dark: Moon, system: Monitor }}
    >
      <AppUpdates registerSW={registerSW} checkEvery="1h">
        <App /> {/* le bandeau de mise à jour se pose seul */}
      </AppUpdates>
    </IconsProvider>
  </ThemeProvider>
</ObservabilityBoundary>;
```

```ts
// vite.config.ts — le script anti-FOUC cesse d'être recopié dans index.html
// `legacyKeys` migre la préférence déjà enregistrée : sans elles, adopter le
// socle la perd en silence (six clés distinctes existent dans la famille).
pwaSeoPlugin({
  themeBoot: { storageKey: 'dwc_theme', legacyKeys: ['theme'] },
  themeColor: { light: '#0f766e', dark: '#0b1220' },
});
```

#### Le contexte d'observabilité

Treize apps sur seize initialisent Sentry — et `setUser` / `setContext` /
`setTag` n'apparaissent que dans **six**. Les dix autres envoient des exceptions
nues : pas de version, pas de langue, pas de route. Une trace sans contexte se
trie mal et se reproduit encore plus mal.

```tsx
import {
  breadcrumb,
  setSessionContext,
} from '@mister-guiiug/dev-pwa-config/react/observability';
import { useRouteBreadcrumbs } from '@mister-guiiug/dev-pwa-config/react/use-route-breadcrumbs';

setSessionContext({ locale, theme: resolved }); // fusionné, appelable à tout moment
useRouteBreadcrumbs(useLocation().pathname); // « où était l'utilisateur ? »
breadcrumb('sync', 'file rejouée', { entrées: 12 });
```

Trois garanties, dans cet ordre d'importance :

- **Le fil d'Ariane ne quitte pas la mémoire.** Le journal d'erreurs vit dans
  `localStorage` ; un fil enregistre vingt fois plus d'événements, souvent
  porteurs de données saisies. Il est joint aux erreurs, et disparaît avec
  l'onglet.
- **Tout est masqué avant d'être écrit** — y compris les arguments d'un
  `console.warn('échec', { token })`, forme la plus courante des 59 appels
  mesurés : `redact` agit sur les clés, il voit donc l'objet, pas sa chaîne.
- **La console n'est jamais avalée.** `captureConsole` l'enveloppe ; la sortie
  d'origine est appelée dans tous les cas.

Ces trois pièces valent **sans Sentry** : elles enrichissent le journal local,
donc servent aussi aux trois apps sans transport.

#### Le pont vers `lucide-react`

`IconsProvider` prend un rôle à la fois — le bon contrat, mais qui ne dit rien à
une app qui a déjà cinquante-sept icônes (149 symboles distincts dans la
famille, adoption d'`IconsProvider` : **zéro**). `lucideIconSet` normalise le
jeu en une ligne, sans que le paquet dépende de `lucide-react` :

```tsx
import { X, Sun, Moon, Monitor } from 'lucide-react';
import { lucideIconSet } from '@mister-guiiug/dev-pwa-config/react/icons-lucide';

<IconsProvider
  icons={lucideIconSet(
    { close: X, light: Sun, dark: Moon, system: Monitor },
    { strokeWidth: 1.75 }
  )}
>
```

`aria-hidden` (une icône accompagne toujours un texte déjà nommé, sauf si vous
passez un `aria-label`), `focusable="false"`, et un poids de trait commun pour
que la croix du `Sheet` ait le même que ses voisines.

Chaque façade reste **facultative**, et chaque pièce reste utilisable seule :
`ThemeToggle` sans `ThemeProvider` monte son propre état, `UpdateButton` sans
`AppUpdates` s'enregistre lui-même, `Icon` sans `IconsProvider` rend le SVG
maison. Une app qui ne change rien ne voit aucune différence.

#### Mise à jour du service worker

`useUpdatePrompt` **a rejoint le barrel** : il n'importe plus
`virtual:pwa-register/react`, il reçoit `registerSW` en paramètre. Le module
s'importe donc partout — y compris dans un test Node ou un rendu serveur.

```tsx
import { registerSW } from 'virtual:pwa-register';
import { UpdatePromptBanner } from '@mister-guiiug/dev-pwa-config/react';

<UpdatePromptBanner
  registerSW={registerSW}
  snoozeHours={24}
  // Pour reprendre le report d'une bannière écrite à la main : sans elle, la
  // migration oublie tout report en cours et le bandeau revient aussitôt.
  snoozeKey="mon_app_update_snooze_until_ms"
  // Sans ce rappel, un enregistrement raté est indiscernable d'une app à jour.
  onRegisterError={error => log.error('serviceWorker', error)}
/>;
```

**Deux sorties au lieu d'une**, avec `secondaryActions="both"` : le report
persisté ET l'écartement pour la seule session. `mister-puzzle` offrait les deux
et a dû abandonner le second en migrant.

```tsx
<UpdatePromptBanner
  registerSW={registerSW}
  snoozeHours={24}
  secondaryActions="both" // « Recharger » · « Plus tard » · « Ignorer »
/>
```

Le bouton historique ne bouge pas : `[data-dwc="update-banner-dismiss"]` désigne
toujours le même, à la même place, avec la même action — `'both'` ne fait
qu'**ajouter** le suivant, sous `[data-dwc="update-banner-ignore"]`. Un habillage
CSS existant reste donc valable. Sans report à offrir (`snoozeHours` à 0),
`'both'` se comporte exactement comme `'auto'` : deux boutons qui écartent tous
deux pour la session ne diraient rien de plus.

**Le « prêt hors ligne »** — que `useUpdatePrompt` expose depuis toujours sans
que rien ne l'affiche — se rend avec `showOfflineReady`. Il sort sous
`[data-dwc="offline-ready"]`, et **jamais en même temps** que la mise à jour :
tant qu'une version attend, il se tait, y compris une fois le bandeau écarté.

```tsx
<UpdatePromptBanner registerSW={registerSW} showOfflineReady />
```

L'interrupteur ne s'appelle pas `offlineReady` parce que l'état du hook porte
déjà ce nom sur les mêmes props, et l'écraserait à chaque rendu.

**Sa place.** `components.css` habille le bandeau sans le placer — sauf sous
`BottomNav placement="fixed"` : la barre collée l'emmène au-dessus d'elle
(`position: fixed`, `z-index: 25` — entre la barre à 20 et l'en-tête à 30, sous
les toasts à 70), avec l'entrée `dwc-rise` et son extinction sous
`prefers-reduced-motion`. Les toasts suivent : ils surgissent au-dessus de la
barre, plus dessous. Rendu après `children`, le bandeau était sinon en flux tout
en bas du document, donc hors écran puis sous la barre : « Recharger » n'était
atteignable par personne (mister-miss-koh, 06/09/2026 — et le squelette). Sans
barre collée, rien ne bouge : le placer soi-même, comme onze apps le font
(`className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-md"`). En adoptant la
barre collée, **retirer ce placement maison** : les deux se cumuleraient.
L'empreinte de la barre — 4,5 rem plus la zone sûre — n'est écrite qu'une fois,
dans la variable privée `--_dwc-bottom-nav-reserve`, que lisent la réserve de
`PageContainer`, les toasts et le bandeau.

**Ne pas enregistrer du tout** ne demande aucune API : `registerSW` est
facultatif, et le hook s'en passe (`needRefresh` reste faux, `update()` et
`forceUpdate()` restent utilisables).

⚠️ **Mais ne posez PAS `registerSW={import.meta.env.PROD ? registerSW : undefined}`** —
ce motif, que cette page recommandait, ne protège de rien et coûte cher. En
développement, `vite-plugin-pwa` sert déjà un patron **entièrement inerte**
(`dist/client/dev/register.js` : `registerSW()` rend une fonction asynchrone
vide, et rien n'est enregistré), sauf si l'app active `devOptions` — ce
qu'aucune app du parc ne fait. Le garde est donc redondant en production comme
en développement.

Et il nuit : **Vitest pose `PROD` à faux**, donc le câblage réel devient
intestable, et deux apps (`miss-badminton`, `miss-dice`) ont dû intercaler un
composant qui reprend `registerSW` en prop pour contourner un garde superflu.
Relevé en migrant `mister-cim10` et `miss-ticket-pwa`. Ne le remettre que si
l'app active vraiment `devOptions`.

En développement, c'est plutôt l'inverse qu'on veut : **désinscrire** le worker
d'une session précédente, qui sert du cache périmé pendant qu'on code. Cinq apps
portaient ces lignes à la main ; la condition reste chez elles, la mécanique
vient du paquet.

```ts
import { unregisterServiceWorkers } from '@mister-guiiug/dev-pwa-config/sw-update';

export function registerServiceWorker(): void {
  if (import.meta.env.DEV) {
    void unregisterServiceWorkers();
    return;
  }
  registerSW({ immediate: true });
}
```

Le **bouton des réglages** — six apps en avaient un, avec six mécaniques
différentes — n'a besoin de rien : il sert justement quand aucune version n'a
encore été signalée.

```tsx
import { UpdateButton } from '@mister-guiiug/dev-pwa-config/react';

<UpdateButton showHint />;
```

Sous les deux, `applyUpdate` (également exporté seul, sans React, par
`@mister-guiiug/dev-pwa-config/sw-update`) : il active le worker en attente et
**attend `controllerchange`** avant de recharger — deux apps rechargeaient dans
la foulée, si bien que la page pouvait encore être servie par l'ancien worker.
Sans worker en attente, il bascule sur la purge du Cache Storage au lieu de ne
rien faire : c'est le « bouton mort » constaté sur mobile, que
`updateServiceWorker(true)` provoque à lui seul. `localStorage`,
`sessionStorage` et IndexedDB ne sont jamais touchés.

```ts
import { applyUpdate } from '@mister-guiiug/dev-pwa-config/sw-update';

await applyUpdate({
  hard: true,
  keepCache: name => name.startsWith('donnees-'),
});
```

> En test (jsdom), importer `@mister-guiiug/dev-pwa-config/vitest-setup` depuis
> `src/test/setup.ts` fournit le stub `matchMedia` et le mock
> `virtual:pwa-register/react`. Pour `virtual:pwa-register` lui-même, c'est
> `pwaRegisterAlias` qu'il faut poser — voir juste en dessous.

##### Prouver que le bandeau PEUT s'afficher

Un `vi.mock` **ne peut pas** servir ici : il agit à l'exécution, quand Vite a
déjà refusé de transformer le module importateur — `virtual:pwa-register`
n'existe que dans un build servi par vite-plugin-pwa. Il faut un fichier,
désigné par `resolve.alias`. Douze dépôts l'écrivaient à la main, et tous les
douze étaient **muets** : un `registerSW` qui n'appelle jamais `onNeedRefresh`
prouve qu'un composant se monte, jamais qu'un bandeau peut apparaître. C'est ce
trou qui a laissé une app vivre des mois avec une bannière montée sans
`registerSW`, donc structurellement incapable de s'afficher.

`vitest-setup` a longtemps posé un `vi.mock('virtual:pwa-register')` muet, qui
ne pouvait rendre aucun de ces services et qui **écrasait** le double une fois
l'alias posé (« No "swStub" export is defined on the "virtual:pwa-register"
mock »). Il est retiré depuis la 3.29.0 : les suites qui portaient un
`vi.unmock('virtual:pwa-register')` de contournement peuvent le supprimer.

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import {
  baseTestOptions,
  pwaRegisterAlias,
} from '@mister-guiiug/dev-pwa-config/vitest-base';

export default defineConfig({
  resolve: { alias: { ...pwaRegisterAlias } },
  test: baseTestOptions,
});
```

`pwaRegisterAlias` résout le double **depuis le paquet**, et non depuis le
`vitest.config.ts` de l'app : la forme précédente demandait à l'app de résoudre
un sous-chemin d'export, ce qui échoue sous un gestionnaire de paquets qui
n'aplatit pas `node_modules`, et sous les runtimes où `import.meta.resolve` est
asynchrone.

Deux pièges, une fois pour toutes :

- **Dans `vitest.config.ts`, jamais dans `vite.config.ts`.** Un alias vu par le
  build servirait le double aux navigateurs, et l'app n'enregistrerait plus
  aucun service worker.
- **`virtual:pwa-register/react` n'est pas couvert**, et l'entrée ci-dessus le
  capte quand même : les alias Vite s'appliquent par PRÉFIXE, donc le
  sous-chemin pointerait vers un fichier inexistant. Aucune app du parc ne
  l'importe — toutes passent `registerSW` à `useUpdatePrompt`, la forme
  impérative. Celle qui voudrait `useRegisterSW` doit fournir son propre double,
  sous une entrée plus spécifique placée **avant**.

```tsx
import { swStub } from '@mister-guiiug/dev-pwa-config/testing/pwa-register';

// `reset()` renouvelle l'IDENTITÉ de `registerSW` : `useUpdatePrompt` mémorise
// sa connexion par WeakMap, et un double unique garderait `needRefresh` d'un
// test au suivant.
beforeEach(() => swStub.reset());

it('affiche le bandeau quand une version attend', () => {
  render(<UpdateBanner />);
  expect(screen.queryByRole('status')).toBeNull();

  act(() => swStub.needRefresh()); // lève si personne n'a injecté `registerSW`

  expect(screen.getByRole('status')).toHaveAttribute(
    'data-dwc',
    'update-banner'
  );
});
```

Une app qui enrobe `registerSW` dans une constante de module — pour ajouter un
intervalle ou une journalisation — garde une identité que `reset()` ne peut pas
renouveler : ce cas-là demande un `vi.resetModules()`, ou un second fichier de
test.

#### La version : l'afficher, et savoir qu'elle a bougé

Les cinq modules ci-dessus pilotent une bascule de service worker **sans jamais
nommer une version** : le bandeau dit « Mise à jour disponible », pas laquelle,
et rien ne confirme après coup que la bascule a réussi. Symétriquement,
`installObservability` réclamait `context.version` — que le paquet ne savait pas
produire, faute de rien qui porte le numéro jusqu'au navigateur.

Une ligne dans `vite.config.ts` ferme les deux :

```ts
import { versionPlugin } from '@mister-guiiug/dev-pwa-config/vite-version';
import { cspPlugin } from '@mister-guiiug/dev-pwa-config/vite-csp';

export default defineConfig({
  // versionPlugin AVANT cspPlugin : les hash sont calculés sur le HTML final.
  plugins: [react(), versionPlugin(), cspPlugin()],
});
```

Le plugin lit la version du `package.json` de l'app (`VITE_APP_VERSION` la force,
`GITHUB_SHA` fournit le commit) et produit **trois sorties** : les `define`
`__APP_VERSION__` / `__APP_BUILD_TIME__` / `__APP_COMMIT__` pour le code de
l'app, un `globalThis.__DWC_BUILD__` posé dans le `<head>` — le seul chemin
qu'un module de `node_modules` puisse lire, un `define` ne l'atteignant pas — et
un `version.json` à la racine du build, servi aussi par `vite dev`. Il est exclu
du précache workbox : figé, il rendrait éternellement la version qui l'a figé.

Aucun secret n'entre dans le bundle : un numéro de version et un SHA de commit,
publics par construction, et le SHA n'est écrit que s'il existe.

Côté écran, le numéro se pose dans le pied de page :

```tsx
import { AppFooter } from '@mister-guiiug/dev-pwa-config/react';

<AppFooter
  repoUrl="https://github.com/mister-guiiug/mister-family-map"
  version
/>;
```

`version` est **opt-in** : absent, le pied de page rend exactement ce qu'il
rendait. Le `repoUrl` déjà donné sert alors de lien vers la release.

Pour les deux états que seul un fournisseur peut calculer — la confirmation
« mis à jour vers 3.14.0 » au premier démarrage après une bascule, et l'annonce
« version 3.15.0 disponible » quand un déploiement passe :

```tsx
import { VersionProvider } from '@mister-guiiug/dev-pwa-config/react';

<VersionProvider checkEvery="1h">
  <App />
</VersionProvider>;
```

Sans `checkEvery`, **aucune requête n'est émise**. Un rollback de déploiement ne
s'annonce pas comme une nouveauté : `justUpdated` ne se lève que sur une montée.
`VersionProvider` complète `AppUpdates` sans le remplacer — l'un sait qu'une
bascule est possible, l'autre sait vers quoi ; ni l'un ni l'autre ne recharge de
lui-même, c'est le rôle d'`applyUpdate`.

Enfin, `installObservability` n'a plus rien à recevoir : la version, la date de
compilation et le commit rejoignent seuls le contexte de session, et un
`context` explicite garde le dernier mot.

#### Libellés fr/en des composants

Onze libellés étaient codés en dur en français dans six composants. Ils vivent
désormais dans un dictionnaire, avec **trois niveaux** : la prop l'emporte, puis
le contexte, puis le français. Une app qui ne fait rien obtient exactement ce
qu'elle avait avant.

```tsx
import { LabelsProvider } from '@mister-guiiug/dev-pwa-config/react';
import { useI18n } from './i18n';

const { locale } = useI18n(); // le i18n de l'app, inchangé
<LabelsProvider locale={locale} overrides={{ sheet: { close: 'Retour' } }}>
  <App />
</LabelsProvider>;
```

Le contexte est **séparé de `createI18n`** à dessein : `createI18n` fabrique un
contexte isolé par app, que le paquet ne peut pas lire et dans lequel il n'a pas
à imposer ses clés. En revanche `I18nProvider` **pose lui-même**
`LabelsProvider` avec sa locale : le câblage manuel ci-dessus n'est plus
nécessaire (`labels: false` pour le désactiver). Il reste utile pour un
`overrides`, ou hors `createI18n`.

**Sept langues, et ce qu'elles pesaient (4.10.0).** Les sept dictionnaires
vivaient dans un unique objet littéral. Un objet littéral est UNE liaison :
aucun bundler ne peut en retirer six langues. Or quinze composants du paquet
appellent `useLabels` — `ErrorBanner`, `Sheet`, `ConfirmDialog`, `AppHeader`,
`BottomNav`, `ThemeToggle`… — donc **toute app qui montait un seul d'entre eux
embarquait les sept**, soit 6,2 kB gzip là où le français seul en pèse 1,8.

Chaque langue est désormais un module (`react/labels-fr` … `react/labels-nl`),
et le contexte vit dans `react/labels-core`, qui n'embarque que le français.
**Rien ne change à l'usage** : `react/labels` exporte toujours `LABELS`,
`labelsFor` et un `LabelsProvider` qui résout les sept langues synchronement —
aucun chargement différé n'a été introduit, les libellés d'un bouton ne peuvent
pas arriver après lui. Ce qui change est ce qu'une app PAIE : les composants
n'atteignent plus que le français.

Une app qui parle une seule autre langue peut n'embarquer que celle-là :

```tsx
import es from '@mister-guiiug/dev-pwa-config/react/labels-es';
import { LabelsProvider } from '@mister-guiiug/dev-pwa-config/react/labels-core';

<LabelsProvider dictionary={es}>
  <App />
</LabelsProvider>;
```

Le noyau ne résout que le français : lui passer `locale="es"` sans `dictionary`
rend le français **et le dit en développement** — le repli silencieux est le
défaut que la version à sept langues avait fermé, il n'est pas rouvert par la
petite porte. `createI18n`, lui, monte le provider complet : il reçoit la locale
de l'app et doit la résoudre pour de bon.

Pour l'accord en nombre, `plural` (exporté par `react/i18n`) s'appuie sur
`Intl.PluralRules` — le ternaire `n > 1` des apps donne « 0 éléments » en
français, ce qui est faux.

```ts
import { plural } from '@mister-guiiug/dev-pwa-config/react/i18n';

plural(0, { one: '{count} élément', other: '{count} éléments' }, 'fr');
// → « 0 élément »   (et « 0 items » en anglais)
```

#### Le formatage suit la langue choisie

**78 sites de formatage à locale figée** dans la famille : 27 constructions
`Intl.*('xx-XX', …)` et 51 appels `toLocale*('fr-FR')`. L'utilisateur bascule en
anglais, les libellés changent, les nombres et les dates restent français. La
cause n'était pas la négligence : le contexte rendait `{ locale, setLocale, t,
m, locales }` — la langue, mais aucun formateur. Le pont n'existait pas.

```tsx
const { t, locale, dir, fmt } = useI18n();

fmt.number(1234.5); // suit la locale courante, sans l'écrire
fmt.currency(12.5); // devise par app (`currency` dans createI18n)
fmt.date(d, { weekday: 'long' });
fmt.relative(then); // « il y a 3 jours »
fmt.bytes(1503238); // « 1,4 Mo » / « 1.4 MB »
fmt.list(['a', 'b', 'c']); // « a, b et c » / « a, b, and c »
fmt.plural(n, { one: '{count} but', other: '{count} buts' });
```

```ts
createI18n({
  messages,
  locales: ['fr', 'en'],
  fallbackLocale: 'fr',
  storageKey: 'app_locale',
  localeTags: { en: 'en-GB' }, // quand la région compte ; sinon `Intl` suffit
  currency: 'EUR',
});
```

Le provider pose aussi `<html lang>` **et `dir`** (absent partout : une locale
écrite de droite à gauche rendait la page en LTR), et appelle
`setDefaultLocale` : `format.js` formate alors dans la bonne langue **même
appelé sans locale**, depuis n'importe quel écran et sans qu'un seul appel soit
réécrit. Une app sans i18n garde `'fr-FR'`, exactement comme avant.

> `formatBytes` traduit désormais son unité (`1.4 MB` en anglais, au lieu du
> `1,4 Mo` figé) et sépare le nombre de l'unité par une espace fine insécable —
> le même séparateur que `formatNumber` produit déjà pour les milliers. Une
> comparaison de chaînes écrite avec une espace ordinaire échoue donc.

### Primitives d'interface

Ces neuf composants n'ont pas été inventés : ils ont été **extraits** de ce que
plusieurs apps avaient déjà réécrit chacune de leur côté. L'API reprend leur
convergence ; la version partagée referme les trous d'accessibilité que chaque
copie laissait passer.

| Composant                                      | Réécrit dans                                                      | Ce que la version partagée garantit en plus                                                                                                                                                                                                                                     |
| ---------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                                       | 4 apps, mêmes variantes `primary \| secondary \| ghost \| danger` | cible tactile 2,75 rem **à toutes les tailles**, `aria-busy` + désactivation pendant `loading` (anti double-clic), `type="button"` par défaut                                                                                                                                   |
| `TextField` / `SelectField` / `TextAreaField`  | 3 apps (deux fichiers identiques à la variable près)              | `aria-describedby` référence l'aide **et** l'erreur, au lieu de faire disparaître l'aide                                                                                                                                                                                        |
| `Skeleton` / `SkeletonGroup`                   | 3 apps                                                            | barres `aria-hidden`, `role="status"` + `aria-busy` porté par le conteneur seul                                                                                                                                                                                                 |
| `Sheet`                                        | 4 apps, ~20 écrans consommateurs                                  | piège de focus, focus **restitué** à la fermeture, scroll de fond restauré, safe-area iOS                                                                                                                                                                                       |
| `Stat`                                         | tableaux de bord de 10 apps                                       | `<dl>/<dt>/<dd>` relie le libellé à la valeur ; la tendance a une flèche **et** un libellé lu                                                                                                                                                                                   |
| `Badge`                                        | 4 apps, couleurs ad hoc                                           | axe `tone` sémantique (`brand \| success \| warning \| danger \| info \| muted`) × `variant` (`soft \| outline`)                                                                                                                                                                |
| `ConfirmDialog`                                | 7 apps, sept fichiers différents                                  | `role="alertdialog"` nommé par son titre, focus initial sur **Annuler** (une app le posait sur la suppression), `loading` pour une confirmation asynchrone ; `cancelLabel={null}` bascule en **mono-action** (alerte) : focus sur l'action unique, Échap et voile valent « OK » |
| `ToastProvider` / `ToastViewport` / `useToast` | 6 apps, six mécaniques                                            | régions vivantes montées en permanence et **sans rôle sur le message** (deux apps l'annonçaient deux fois), pile bornée, compte à rebours suspendu au survol, `action` pour **annuler plutôt que confirmer**                                                                    |
| `BottomNav`                                    | 7 apps                                                            | `<nav>` toujours nommé (3 ne l'étaient pas), onglet courant jamais distingué par la seule couleur (4 le faisaient), bouton « Plus » avec `aria-expanded`                                                                                                                        |

```tsx
import {
  Button,
  TextField,
  Sheet,
  Stat,
  Badge,
  SkeletonGroup,
} from '@mister-guiiug/dev-pwa-config/react';

<Button variant="danger" size="sm" loading={saving}>
  Supprimer
</Button>;
<TextField label="Email" hint="nom@domaine" error={errors.email} />;
<Badge tone="success" variant="soft">
  Payé
</Badge>;
<Stat
  label="Adhérents"
  value={128}
  delta="+12"
  trend="up"
  trendLabel="en hausse"
/>;
<SkeletonGroup label="Chargement des scores" lines={4} />;
<Sheet open={open} title="Ajouter une dépense" onClose={close}>
  …
</Sheet>;
```

```tsx
import {
  BottomNav,
  ConfirmDialog,
  ToastProvider,
  useToast,
} from '@mister-guiiug/dev-pwa-config/react';

// Une seule fois, au sommet de l'app.
<ToastProvider>…</ToastProvider>;

const toast = useToast();
toast.success('Fiche enregistrée');
toast.error('Envoi impossible'); // ne s'efface pas tout seul

// ANNULER PLUTÔT QUE CONFIRMER. `ConfirmDialog` est posé sur quatorze apps,
// `useUndoableState` sur aucune : quatorze demandent « êtes-vous sûr ? » avant
// de supprimer, pas une n'offre de revenir en arrière après. Le bouton porte
// « Annuler » dans les sept langues de `labels` (`action.label` pour un autre
// mot), agit puis referme, et la notification vit huit secondes AU MINIMUM —
// le temps de lire, de décider et d'atteindre le bouton. Passer `duration`
// l'emporte, et redevient votre responsabilité.
const supprimer = note => {
  const avant = notes;
  setNotes(notes.filter(n => n.id !== note.id));
  toast.show('Note supprimée', { action: { onAction: () => setNotes(avant) } });
};

<ConfirmDialog
  open={open}
  title="Supprimer la partie ?"
  message="Cette action est définitive."
  destructive
  loading={suppression}
  onConfirm={supprimer}
  onCancel={fermer}
/>;

// Alerte mono-action, en remplacement de `window.alert` : `cancelLabel={null}`
// (et non `undefined`) retire Annuler. Le focus va sur l'action unique, Échap
// et le voile valent « OK » (`onConfirm`), le défaut du libellé devient « OK ».
// Les détails techniques dépliables (façon miss-carbook) restent applicatifs :
// les passer en `children`.
<ConfirmDialog
  open={erreur !== null}
  title="Sauvegarde impossible"
  message={erreur}
  cancelLabel={null}
  onConfirm={fermer}
/>;

// Agnostique de routeur : `linkComponent` + `hrefProp` branchent react-router.
<BottomNav
  items={[
    { href: '/', label: 'Accueil', icon: <Home aria-hidden /> },
    { href: '/alertes', label: 'Alertes', badge: 3, badgeLabel: '3 non lues' },
  ]}
  currentPath={pathname}
  linkComponent={Link}
  hrefProp="to"
/>;
```

Non stylés par défaut, comme les autres : importer
[`components.css`](#habillage-des-composants-componentscss-opt-in) pour une base
prête à l'emploi, ou cibler `[data-dwc="button"][data-variant][data-size]` &
consorts.

### Graphiques minuscules (`/sparkline` + `/react/sparkline`)

Cinq apps ont des séries à montrer — historique de prix, consommation de
quotas, scénarios de moyennes — et une librairie de graphiques complète pèse
l'ordre de grandeur de MapLibre pour tracer douze points dans une carte de
réglages. Le module calcule des **coordonnées** ; le rendu tient en un
`<polyline>`.

`/sparkline` est la géométrie, sans React : `toPoints` (trois formes d'entrée
acceptées : `[1, 2, 3]`, `[{y}]`, `[{x, y}]`), `extent` (bornes), `project`
(mise à l'échelle dans une boîte), `toPolyline`, `bars` (proportions, la plus
haute à 100 %), et `describeSeries` — l'alternative textuelle.
`/react/sparkline` pose trois composants dessus : `Sparkline` (courbe),
`BarChart` (barres), `Gauge` (jauge, `role="meter"` : un **niveau** — quota,
batterie — pas l'avancement d'une tâche, que les lecteurs d'écran annoncent
autrement).

```tsx
import {
  Sparkline,
  BarChart,
  Gauge,
} from '@mister-guiiug/dev-pwa-config/react/sparkline';

<Sparkline values={[3, 5, null, 8, 6]} label="notes du trimestre" />;
<BarChart values={depensesParMois} label="dépenses" unit="€" />;
<Gauge value={82} max={100} label="quota IA consommé" unit="%" />;
```

Ce qui se calcule faux quand on l'écrit vite est traité dans le module : une
série **constante** donne un trait plat au milieu (pas une division par zéro),
un **trou** (`null`, `NaN`) coupe la ligne au lieu de la faire plonger — une
mesure manquante n'est pas un zéro — et l'axe Y ne part de zéro que si
`baseline: 'zero'` le demande (le zéro forcé est légitime pour un décompte,
mensonger pour un prix).

**`describeSeries` est l'alternative textuelle**, calculée ici parce que,
laissée au composant, elle n'est jamais écrite : « notes du trimestre :
4 points, de 3 à 6, minimum 3, maximum 8, en hausse, 1 mesure manquante. »
Les trois composants la portent d'office dans un élément voisin du SVG
(`aria-hidden` sur le dessin — `<title>` dans un SVG reste inégalement lu).
Elle est rédigée **en français** : une app anglophone la recompose à partir
des mêmes données.

Limites, assumées : pas d'axes, pas de légende, pas d'infobulles, pas de
valeurs négatives dans `bars` (une barre qui descend sous sa ligne de base
demande un axe, donc un autre outil). Couleurs par `currentColor` et jetons —
habillage prêt à l'emploi dans
[`components.css`](#habillage-des-composants-componentscss-opt-in)
(`[data-dwc="sparkline" | "bars" | "gauge"]`).

### Catalogue famille & `FamilyApps`

`apps-catalog` est la **source unique** des applications de la famille (id, nom,
description, `repoUrl`, `appUrl`, `iconUrl`). C'est de la **donnée pure** :
importable depuis une app, un script ou un test Node, sans dépendre de React.

Quatre facettes décrivent chaque app, et elles n'ont **pas le même statut** —
c'est la distinction qui rend le catalogue utilisable comme donnée :

| Champ      | Statut                  | Valeurs                                                |
| ---------- | ----------------------- | ------------------------------------------------------ |
| `maturity` | éditorial, obligatoire  | `alpha \| beta \| stable`                              |
| `category` | éditorial, obligatoire  | `sante \| sport \| jeux \| education \| outils \| dev` |
| `backend`  | **relevé** dans le code | `supabase \| firebase \| local \| api`, ou absent      |
| `platform` | fait                    | `web` (défaut) \| `desktop`                            |

`backend` est **laissé absent** quand la persistance n'a pas été relevée (une
seule app aujourd'hui, l'app Electron) : un filtre qui affiche « non relevé »
vaut mieux qu'une donnée devinée. `category` et `backend` sont des identifiants
ASCII stables — les libellés affichés vivent côté présentation, donc traduisibles.

Chaque app porte aussi son **`devPort`**, unique dans la famille (plage
5201–5299 ; 1420 pour miss-ticket-pwa ; **5240** réservé au squelette, hors
catalogue) : deux apps tournent côte à côte sur le même poste sans se disputer
le 5173 de Vite. `devPortOf(id)` le rend à `server.port` de `vite.config.ts`,
`freeDevPort()` donne le prochain libre à une app neuve, et `pwa-doctor`
signale un port déclaré qui n'est pas celui du catalogue.

```ts
import {
  FAMILY_APPS,
  otherApps,
  appById,
  sortApps, // 'curated' (défaut) | 'maturity' | 'name' — ne mute pas
  filterApps, // critères en ET ; tableau = OU à l'intérieur d'un critère
  countBy, // facette → { valeur: nombre }, clé '' pour les absentes
  SPONSOR_URL,
} from '@mister-guiiug/dev-pwa-config/apps-catalog';

// Les apps Supabase encore en bêta ou en alpha :
filterApps({ backend: 'supabase', maturity: ['alpha', 'beta'] });

// La recherche ignore les diacritiques : « molkky » trouve « Mölkky ».
filterApps({ query: 'molkky' });
```

Le composant `FamilyApps` (non stylé, attributs `[data-dwc="…"]`) met en avant,
depuis une app, son **code source** (GitHub), le **sponsor** (Buy Me a Coffee) et
la **grille des autres applications** avec leur badge de maturité (l'app courante
est automatiquement exclue) :

```tsx
import { FamilyApps } from '@mister-guiiug/dev-pwa-config/react';
import { REPO_URL } from './links';

// Carte source + sponsor + grille des autres apps :
<FamilyApps currentAppId="miss-dice" repoUrl={REPO_URL} />;

// Grille seule (si la page affiche déjà source/sponsor par ailleurs) :
<FamilyApps currentAppId="miss-dice" showSource={false} showSponsor={false} />;

// Vitrine : un lien vers le DÉPÔT sur chaque carte, les trois plus mûres
// seulement. `max` coupe APRÈS le tri.
<FamilyApps
  currentAppId="miss-dice"
  repoUrl={REPO_URL}
  showRepoLinks
  sort="maturity"
  max={3}
/>;
```

`showRepoLinks` est **opt-in** : sans lui, le DOM produit est exactement celui
des versions précédentes. Avec lui, chaque carte porte deux ancres **frères** —
l'application et son dépôt — jamais imbriquées : une ancre dans une ancre est
invalide, et un lecteur d'écran n'en annoncerait qu'une.

Chaque `<li data-dwc="family-app-item">` porte les facettes du catalogue
(`data-maturity`, `data-category`, `data-backend`, `data-platform`) : une app
peut teinter ses cartes par domaine, ou masquer une facette, en CSS seul.

Sélecteurs CSS à styliser côté app : `[data-dwc="family-apps"]`, `family-links`,
`family-source`, `family-sponsor`, `family-app-list`, `family-app-item`,
`family-app`, `family-app-repo`, et le badge
`[data-dwc="maturity"][data-maturity="alpha|beta|stable"]` (3 couleurs).

### Animations Rive (`@mister-guiiug/dev-pwa-config/react/rive`)

Wrapper [Rive](https://rive.app) **lazy** (le runtime ~100 ko + WASM reste hors
du bundle initial), respectant `prefers-reduced-motion` et l'accessibilité.
Standardise les animations interactives de la famille (états vides, mascottes,
micro-interactions) tout en gardant les budgets perf/a11y/Lighthouse.

```bash
npm install @rive-app/react-canvas   # peer OPTIONNELLE
```

```tsx
import { RiveAnimation } from '@mister-guiiug/dev-pwa-config/react/rive';

// Décorative (aria-hidden auto) + repli statique si mouvement réduit.
<RiveAnimation
  src="/animations/empty-state.riv"
  stateMachines="State Machine 1"
  fallback={<img src="/animations/empty-state.svg" alt="" />}
/>;

// Significative : fournir `ariaLabel` (rend role="img" + libellé).
<RiveAnimation src="/animations/trophy.riv" ariaLabel="Victoire !" />;
```

Conventions : `.riv` dans `public/animations/`, toujours prévoir un `fallback`
statique, `ariaLabel` uniquement si l'animation porte du sens (sinon
décorative).

**Le repli est le cas nominal, pas l'exception.** `find -name '*.riv'` renvoie
**zéro fichier** sur les seize dépôts, alors que trois apps déclarent un
runtime Rive — miss-badminton et mister-molkky (`@rive-app/react-canvas`),
miss-genius (`@rive-app/react-webgl2`) — et pointent vers des dossiers vides.
Le `fallback` s'affiche donc dans quatre situations : pendant le chargement, si
l'utilisateur réduit les animations, si le runtime n'est pas installé, et si le
fichier ou le rendu échoue. `onError` permet de remonter le troisième et le
quatrième cas plutôt que de les découvrir sur un écran vide :

```tsx
<RiveAnimation
  src="/animations/trophy.riv"
  loader={() => import('@rive-app/react-webgl2')}
  fallback={<img src="/animations/trophy.svg" alt="" />}
  onError={error => recordError(error, { animation: 'trophy' })}
/>
```

### Accessibilité (`@mister-guiiug/dev-pwa-config/react/a11y`)

Ces primitives ne sont pas nouvelles : elles étaient **enfermées** dans `Sheet`
et `ConfirmDialog`, via un hook interne. Mesure sur les seize apps : **38
`role="dialog"` / `alertdialog`** dans treize apps, et **trois** pièges de
focus. Les trente-cinq autres dialogues laissent Tab s'échapper derrière le
fond — et ne peuvent pas devenir des `Sheet`. D'où l'extraction.

```tsx
import {
  AnnouncerProvider,
  SkipLink,
  VisuallyHidden,
  useAnnouncer,
  useEscape,
  useFocusTrap,
  useScrollLock,
} from '@mister-guiiug/dev-pwa-config/react/a11y';

function MaModale({ open, onClose }) {
  const panel = useRef(null);
  useEscape(onClose, open);
  useScrollLock(open);
  useFocusTrap(panel, { active: open }); // le conteneur porte tabIndex={-1}
  return (
    <div ref={panel} tabIndex={-1} role="dialog" aria-labelledby="t">
      …
    </div>
  );
}
```

Une seule région d'annonce pour toute l'app, montée en permanence (les seize
apps totalisent **66** attributs `aria-live` posés au fil des écrans ; une
région insérée au moment du message n'est souvent pas annoncée) :

```tsx
<AnnouncerProvider>…</AnnouncerProvider>;

const announce = useAnnouncer();
announce('Fiche enregistrée'); // 'assertive' pour une erreur
```

`tokens.css` fournit désormais `.dwc-sr-only` — redéfini dans **cinq** feuilles
de style de la famille, absent des onze autres — `.dwc-skip-link`, et un bloc
`prefers-reduced-motion` (onze apps l'honorent chacune de leur côté ; le socle
n'en avait aucune trace).
