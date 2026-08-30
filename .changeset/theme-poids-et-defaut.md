---
'@mister-guiiug/dev-wpa-config': minor
---

Thème — deux défauts que trois adoptions ont fait tomber le même jour.

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
