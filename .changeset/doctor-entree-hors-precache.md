---
'@mister-guiiug/dev-pwa-config': minor
---

`pwa-doctor` : nouveau contrôle **`entree-hors-precache`** (famille « build », niveau **défaut**). Il signale tout morceau JS que la page importe STATIQUEMENT au démarrage et que le service worker ne précache pas : hors ligne, ce fichier manque, l'import échoue et l'app ne démarre pas.

Relevé le 05/11/2026 en rechargeant la production hors ligne : mister-qowa, mister-settle et miss-ticket-pwa ne démarraient plus. Dix-huit apps publiées nomment leur morceau Sentry `assets/sentry.js` et l'excluent du précache (`globIgnores`). Chez ces trois-là, Rolldown y avait rangé React, et l'entrée commençait par `import{n}from"./sentry.js"`. Ni le docteur, ni le budget, ni les e2e ne l'avaient vu.

- **Ce qui est lu** : `dist/` après le build. On part du `<script type="module">` d'`index.html` et de ses `modulepreload`, on suit les imports statiques de fichier en fichier (`import … from`, `import "…"`, `export … from`, minifiés ou non), et on cherche chaque morceau atteint dans le manifeste Workbox de `sw.js` ou des scripts qu'il charge.
- **Ce qui n'est pas suivi** : les `import()`. C'est par eux que Sentry doit arriver, et ce qu'ils chargent peut rester hors précache.
- **Le message** nomme le fichier et la chaîne d'import qui l'amène au démarrage (`index.html → index-….js → sentry.js`). La piste : le motif `globIgnores` qui l'exclut, ou le regroupement (`manualChunks` / `advancedChunks`) qui y range du code de l'entrée.
- **Sans service worker**, ou quand son manifeste ne se lit pas, le contrôle ne dit rien. Il obéit à `pwaDoctor.refus` comme les autres.

**Les apps concernées passent au rouge.** C'est un défaut : il fait échouer `pwa-doctor`, avec ou sans `--strict`, partout où il tourne (`run-doctor: true` de `pwa-ci.yml`, `postbuild`). Vérifié sur la production des 22 apps publiées avec un service worker : les trois apps ci-dessus sont signalées, et aucune autre. Les quinze autres apps qui excluent `sentry.js` ne le chargent que par `import()`. Elles restent saines tant que Rolldown n'y range rien d'autre, et c'est ce que le contrôle surveille désormais.

`chunk-hors-precache` lit le même manifeste, désormais aussi dans les scripts que charge le worker.
