---
'@mister-guiiug/dev-wpa-config': minor
---

`update-prompt-banner` / `vitest-base` — la seconde sortie, le « prêt hors
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
