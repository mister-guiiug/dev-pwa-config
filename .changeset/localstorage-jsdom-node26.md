---
'@mister-guiiug/dev-pwa-config': patch
---

`vitest-setup` rend aux tests le `localStorage` de jsdom, que Node 26 masquait.

**Depuis le passage du parc à Node 26, les suites Vitest n'éprouvaient plus le
stockage du navigateur mais un secours en mémoire — sans qu'un mot soit dit.**

La chaîne, muette d'un bout à l'autre :

1. Node 26 pose lui-même `localStorage` sur `globalThis`. Sans
   `--localstorage-file` il se contente d'avertir (« ExperimentalWarning:
   localStorage is not available… ») et rend `undefined` — mais la PROPRIÉTÉ
   existe.
2. `populateGlobal` de Vitest ne recopie une clé de la fenêtre jsdom que si elle
   n'est pas déjà sur `globalThis` — sa garde est
   `if (k in global) return keysArray.includes(k)`, et ni `localStorage` ni
   `sessionStorage` ne figurent dans cette liste d'exceptions. Le vrai
   `Storage` n'arrivait donc plus.
3. `ensureStorage` voyait `undefined` et installait son secours : un objet
   adossé à une `Map`. Il honore l'INTERFACE (`getItem`, `setItem`, `length`,
   `key`) mais pas l'objet exotique — `Object.keys(localStorage)` rendait
   `['length','key','getItem','setItem','removeItem','clear']` au lieu des clés
   stockées, `{ ...localStorage }` et `localStorage.maClé` ne voyaient rien.

`ensureStorage` va désormais chercher le vrai là où l'environnement jsdom de
Vitest le laisse — `globalThis.jsdom.window` — et le préfère à tout le reste,
**y compris à un secours déjà en place** : dans un processus de travail réutilisé
d'un fichier de test au suivant, ce secours survivait à la fermeture de la
fenêtre et traînait les données du fichier précédent. Le secours reste pour les
environnements sans jsdom.

Rien à changer côté applications. Mesuré sur `miss-badminton` sous Node 26.2.0
réel : 93/93 avec ce seul correctif, sans rattrapage local (son échec
`expected [] to have a length of 1` venait de là — voir miss-badminton#50).
