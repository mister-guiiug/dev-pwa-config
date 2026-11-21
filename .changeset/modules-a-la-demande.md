---
'@mister-guiiug/dev-pwa-config': minor
---

`vite-pwa` : `isOnDemandSocleModule(id)` et `ON_DEMAND_SOCLE_MODULES`, les modules du socle chargés à la demande, qu'un morceau nommé ne doit pas avaler. À la sortie de 6.38.0, `analytics-erreurs.js` (1,8 kB gzip), importé par `import()` seulement, est tombé dans le `vendor` préchargé des quinze apps dont le `manualChunks` y range tout `node_modules` : chaque visiteur le téléchargeait au premier affichage, option activée ou non, et trois montées ont dépassé leur budget le même soir (mister-cim10, miss-uwh, mister-footcoach, 21/11/2026). Les trois s'en sont sorties par la même ligne, écrite chacune de son côté ; la liste vit désormais dans le socle, et le prochain module chargé à la demande y entre sans que les apps aient à changer.

`analytics` : le nettoyage des URL (`analytics-url.js`) est importé à l'accord, avec posthog-js, et plus statiquement : il ne sert que dans le `before_send` passé à `init`. Sans lui, rien n'est initialisé — l'URL d'entrée de session ne part jamais sans nettoyage. Gain mesuré sur mister-cim10 avec la ligne ci-dessous : 0,5 kB gzip de moins au `vendor` préchargé, en plus des 1,8 kB d'`analytics-erreurs.js`.

`pwa-doctor` : nouvelle dette `module-a-la-demande-precharge`, un module de `ON_DEMAND_SOCLE_MODULES` qu'un regroupement a rangé dans un morceau du démarrage (fermeture des imports statiques depuis la page). Lue dans les cartes de source : sans elles, le contrôle se tait.

Migration : une ligne, en tête du `manualChunks` des apps qui ont un fourre-tout (`return 'vendor'`), à la place de l'exclusion d'`analytics-erreurs` écrite à la main :

```ts
import { isOnDemandSocleModule } from '@mister-guiiug/dev-pwa-config/vite-pwa';

manualChunks(id) {
  if (isOnDemandSocleModule(id)) return;
  // …
}
```

Sans elle, rien ne casse : `pwa-doctor` signale la dette, et le budget du préchargé la paie. Les apps découpées par `codeSplitting.groups` sans fourre-tout ne sont pas concernées.
