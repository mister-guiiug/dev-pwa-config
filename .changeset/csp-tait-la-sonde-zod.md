---
'@mister-guiiug/dev-pwa-config': patch
---

`cspPlugin` fait taire la sonde `new Function` de zod

**Seize apps du parc journalisent une violation de CSP à chaque visite**, et
c'est notre propre politique qui la provoque :

```
Content-Security-Policy : les paramètres de la page ont empêché
l'exécution d'une « eval » JavaScript (script-src)          util.js:229
```

Rien ne casse. `allowsEval` (`zod/v4/core/util.js`) tente `new Function("")`
dans un `try/catch` pour savoir s'il peut compiler un chemin de parsing rapide ;
`script-src` sans `'unsafe-eval'` refuse, zod retombe sur le chemin lent. Le
commentaire de zod le dit lui-même : « strict CSPs report the caught
`new Function` as a `securitypolicyviolation` even though the throw is
swallowed ». Le remède est fourni par zod : `config({ jitless: true })`.

**Et ça ne coûte aucune performance.** Mesuré : sous CSP, `allowsEval` rend
déjà `false`, donc le compilateur ne tourne jamais. `jitless` ne retire que la
question, pas une capacité.

**Le placement est tout le problème, et c'est pourquoi ça vit ici.** La sonde
part à la CONSTRUCTION du premier `z.object()` — mesuré : importer zod n'en
déclenche aucune. Or ces schémas sont des constantes de module : un `z.config()`
posé dans le corps de `main.tsx` arriverait APRÈS, les imports étant évalués
avant le corps de celui qui les importe. Il faudrait le poser dans chacun des
quarante et un fichiers qui construisent un schéma, sur treize dépôts. Un alias
de build (`/^zod$/` → un module d'amorce qui appelle `config` puis réexporte
zod à l'identique) le fait une fois, et personne ne peut l'oublier.

**Au build seulement** : en développement, l'alias sortirait zod du
pré-bundling de Vite et le ferait servir en une centaine de modules bruts. Ce
qui est corrigé ici, ce sont les sites déployés.

Vérifié dans un vrai navigateur, deux builds de la même page, même CSP, seul le
bundle change :

```
sans : 1 violation script-src, à la ligne de allowsEval
avec : 0 violation — et le schéma accepte et refuse les mêmes valeurs
```

Sans zod installé, ou avec un manifeste d'une forme imprévue, aucun alias n'est
posé et le build ne change pas.
