---
'@mister-guiiug/dev-pwa-config': minor
---

**Les sept langues ne voyagent plus ensemble : une app qui n'en parle qu'une ne
paie plus les six autres.**

Les sept dictionnaires de `react/labels` vivaient dans un unique objet
littéral. Un objet littéral est UNE liaison : aucun bundler ne peut en retirer
six langues, quelle que soit la finesse de son élagage. Or quinze modules
`react/` appellent `useLabels` — `ErrorBanner`, `Sheet`, `ConfirmDialog`,
`AppHeader`, `BottomNav`, `ThemeToggle`, `Toast`… — donc **toute application
qui montait un seul d'entre eux embarquait les sept langues**, y compris le
néerlandais dans une app qui ne parle que français.

Mesuré le 10/09/2026 : **4,9 kB gzip** entre ce que le chemin des composants
tire aujourd'hui (noyau + français, 3,8 kB) et ce qu'il tirait hier (8,8 kB).

Chaque langue est désormais un module — `react/labels-fr` … `react/labels-nl`,
huit nouveaux sous-chemins avec `react/labels-core`, qui porte le contexte et
le français seul. Les composants importent le noyau.

**Rien n'est retiré à personne, et rien ne devient asynchrone.** `react/labels`
exporte toujours `LABELS`, `labelsFor`, `mergeLabels`, `useLabels` et un
`LabelsProvider` qui résout les sept langues **synchronement** : les libellés
d'un bouton ne peuvent pas arriver après lui. `createI18n` monte ce provider
complet, comme avant — il reçoit la locale de l'app et doit la résoudre pour de
bon. Une app multilingue n'a donc rien à changer ; elle paie ce qu'elle
utilise, et c'est nouveau.

**La voie légère**, pour une app qui parle une seule autre langue :

```tsx
import es from '@mister-guiiug/dev-pwa-config/react/labels-es';
import { LabelsProvider } from '@mister-guiiug/dev-pwa-config/react/labels-core';

<LabelsProvider dictionary={es}>…</LabelsProvider>;
```

Le noyau ne résout que le français : lui passer `locale="es"` sans `dictionary`
rend le français **et le dit en développement**. Le repli silencieux est le
défaut que la version à sept langues avait fermé le 02/09 ; il n'est pas
rouvert par la petite porte.

Deux gardes tiennent le découpage : aucun composant ne peut réimporter
`./labels.js` (le test échoue en nommant le fichier fautif), et les sept
dictionnaires ne peuvent pas diverger d'une clé.
