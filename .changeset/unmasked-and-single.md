---
'@mister-guiiug/dev-wpa-config': patch
---

fix(correlation) : l'identifiant arrivait masqué, et le câblage ne produisait rien

Deux défauts du module `/correlation`, invisibles aux tests et constatés en
faisant tourner une app réelle :

- **La clé était masquée.** `correlationContext()` renvoyait
  `correlationSessionId` — or le motif de `redact` couvre `session`. Dans le
  contexte des erreurs, donc dans Sentry, l'identifiant arrivait sous la forme
  `[masqué]` : exactement ce que le module est censé apporter, annulé. La clé
  devient `correlationId` (et la propriété de télémétrie `correlation_id`).
- **Le module était dupliqué.** `/correlation` et `/logger` importent
  `react/observability`, qui est exclu du pré-bundling. Un module pré-bundlé
  embarquant sa copie de ce qu'il importe, il existait DEUX contextes de
  session : celui que la corrélation renseignait n'était pas celui que les
  erreurs lisaient, et `installCorrelation()` ne produisait rien —
  silencieusement. Les deux sous-chemins rejoignent donc l'exclusion.

Règle générale qui en découle, écrite dans `vite-pwa-base.js` : **ce qui
importe un singleton exclu doit être exclu aussi.**

Deux tests de non-régression : l'identifiant survit à `redact`, et les
sous-chemins à état sont bien exclus.
