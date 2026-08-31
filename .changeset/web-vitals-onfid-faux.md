---
'@mister-guiiug/dev-wpa-config': patch
---

`web-vitals` — l'en-tête affirmait une panne qui n'existait pas, et cette
affirmation servait de justification d'adoption.

Il écrivait qu'`onFID` avait été « RETIRÉ en v4.0 », que l'appel levait un
`TypeError: onFID is not a function`, et que les quatre apps concernées
« croient mesurer cinq métriques, en mesurent UNE ».

**C'est faux.** `onFID` a été **déprécié** en v4 et retiré en **v5.0.0** ; les
quatre verrous résolvent `web-vitals@4.2.4`, qui l'exporte toujours. Vérifié
deux fois en migrant `mister-cim10` (#29) — `typeof onFID === 'function'` sous
Node, et en rejouant la séquence exacte dans un navigateur :
`registered: ['CLS','FID','FCP','LCP','TTFB']`, `threw: null`.

**Le vrai défaut était ailleurs**, et il ne se voyait pas dans les imports. Le
`getRating` de ces copies porte un `case 'CLS'` puis un `default: return 'good'`
: **quatre métriques sur cinq étaient notées « bonnes » quelle que soit leur
valeur**, un LCP à dix secondes compris. Une mesure fausse coûte plus qu'une
mesure absente, parce qu'on s'y fie.

Le remplacement `onFID` → `onINP` reste juste — FID est sortie des Core Web
Vitals en mars 2024, et ces copies ne relevaient jamais INP. C'est son motif qui
était faux. `CAMPAGNE.md` et la table des exports du README sont corrigés en
conséquence : l'erreur y avait été recopiée.
