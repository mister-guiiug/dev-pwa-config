---
'@mister-guiiug/dev-wpa-config': minor
---

`title` accepte un nœud React, et la bannière d'installation ne peut plus
nommer sa région `[object Object]`.

**Deux migrations ont perdu une icône le même jour, pour la même raison** :
`miss-genius` sur le bandeau de mise à jour (une icône Sparkles), `mister-doc`
sur **six** dialogues. Les deux rapports contenaient la même phrase — « `title`
est typé `string` ». Il s'élargit à `ReactNode` sur `Sheet`, `ConfirmDialog`,
`EmptyState`, `ErrorBoundary`, `UpdatePromptBanner` et `PwaInstallPrompt`.

**Et un piège que l'élargissement aurait ouvert en silence.** Le titre est rendu
comme ENFANT partout — sauf dans `PwaInstallPrompt`, qui le passait AUSSI en
`aria-label`. Un nœud React y aurait donné **`[object Object]` comme nom
accessible** de la région, sans la moindre erreur de compilation. La bannière
pointe désormais son titre rendu par `aria-labelledby`, ce qui marche pour les
deux formes et garde le nom synchronisé avec ce qui est affiché.

Vérifié par mutation : remettre `aria-label` fait tomber le test qui le nomme.
Le test monte la bannière dans jsdom et émet `beforeinstallprompt`, faute de
quoi le composant rend `null` — et des assertions d'absence sur une chaîne vide
passeraient toutes en ne prouvant rien.
