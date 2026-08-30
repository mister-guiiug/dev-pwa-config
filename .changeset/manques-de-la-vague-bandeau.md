---
'@mister-guiiug/dev-wpa-config': minor
---

Les manques que la vague des bandeaux de mise à jour a nommés. Huit apps ont
migré vers `react/update-prompt-banner` le 30/08/2026 ; chacune a laissé derrière
elle une ligne qu'elle a dû écrire à la main. Quatre sont comblées, toutes
promues d'un code déjà éprouvé dans les apps. La cinquième est refusée, et c'est
écrit.

**`testing/pwa-register` — le double de `virtual:pwa-register`, PILOTABLE.** Le
plus gros doublon du parc : **douze dépôts** portent ce fichier écrit à la main,
sous trois noms différents, plus les douze `resolve.alias` qui vont avec. Le
`vi.mock` de `vitest-setup` ne suffit pas — il agit à l'exécution, quand Vite a
déjà refusé de transformer le module importateur — et il faut donc un vrai
fichier. Mais les douze copies sont **muettes** : un `registerSW` qui n'appelle
jamais `onNeedRefresh` prouve qu'un composant se monte, jamais qu'un bandeau peut
s'afficher. C'est par ce trou qu'une app a vécu des mois avec une bannière montée
sans `registerSW`, donc structurellement incapable d'apparaître, et c'est
pourquoi les huit tests de bannière écrits pendant la vague ont tous dû
refabriquer un double pilotable par-dessus le double muet — de quatre façons
différentes.

Le double publié pilote (`swStub.needRefresh()`), et il **lève** quand personne
n'a injecté `registerSW` : la panne silencieuse devient un message. Son
`reset()` renouvelle l'**identité** de `registerSW`, faute de quoi la `WeakMap`
de `useUpdatePrompt` — qui existe pour ne pas doubler les écouteurs sous
`StrictMode` — garderait `needRefresh` d'un test au suivant. C'est le piège que
huit migrations ont rencontré chacune de leur côté.

**`unregisterServiceWorkers` — la désinscription de développement.** Cinq apps
la portent dans leur `register-sw.ts`, avec les mêmes lignes : sans elle, un
worker resté d'une session précédente sert du cache périmé pendant qu'on code.
Trois défauts communs aux cinq copies sont corrigés. Leur `.catch()` ne couvre
que `getRegistrations()`, pas les `unregister()` lancés dans le `forEach` : une
seule désinscription qui échoue devient un **rejet non capté**, pendant le
démarrage de l'app. Aucune ne plafonne cette `getRegistrations()`, la même qui
peut bloquer plusieurs secondes sur iOS en mode autonome. Et aucune ne rend rien,
donc rien ne s'observe. La CONDITION (`import.meta.env.DEV`) reste dans l'app :
ce paquet est aussi lu par `node --test`, qui n'a pas `import.meta.env`.

**Les rappels d'enregistrement ne sont plus avalés.** `connect()` ne transmettait
que `immediate`, `onNeedRefresh` et `onOfflineReady` : `mister-doc` et
`mister-qowa` ont dû enrober `registerSW` dans une constante de module pour
récupérer, l'un sa journalisation d'échec — sans laquelle une panne
d'enregistrement est indiscernable d'une app à jour — l'autre sa revérification
horaire. `onRegisterError`, `onRegisteredSW` et `onRegistered` sont désormais des
options de `useUpdatePrompt`, de `UpdatePromptBanner` et d'`AppUpdates`. Elles
sont lues à travers une référence : une fonction écrite en ligne ne
ré-enregistre rien.

**`snoozeKey` devient une prop.** `mister-puzzle` a dû verser son report en cours
dans la clé du socle au chargement de son module, sinon la migration oubliait
tout report actif — et le bandeau revenait aussitôt chez qui avait justement
demandé le silence.

**Un défaut trouvé en chemin.** `AppUpdates` lisait `snoozeHours` pour calculer
son état, mais ne le passait pas au bandeau : celui-ci retombait sur `0`, donc
sur « écarter pour la session ». Le report que le fournisseur tenait n'était
atteignable par **aucun clic**.

**Ce qui est refusé : rien ne rend `offlineReady`.** Le hook l'expose, aucun
composant ne l'affiche, et une seule app du parc montre ce message. Le socle
promeut ce que plusieurs apps ont convergé à écrire ; ici il n'y a pas de
convergence à recueillir, rien qu'une intention. Le motif est écrit dans
l'en-tête d'`update-prompt-banner` : le jour où une deuxième app l'écrit, les
deux copies diront ce qui doit être partagé.

`react/update-prompt-banner` sort de `SANS_TEST_DIRECT` : il a maintenant ses
tests. Six garanties sont vérifiées **par mutation** — retirer la ligne fait
tomber le test qui la nomme.
