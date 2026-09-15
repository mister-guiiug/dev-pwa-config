---
'@mister-guiiug/dev-pwa-config': minor
---

**`react/consent-banner` : la pièce qui DEMANDE le consentement.**

`analytics.js` sait honorer un accord depuis sa promotion — l'état par défaut y
est `denied`, et le tag Google n'est pas injecté tant que rien n'est accordé.
Mais rien, nulle part, ne posait la question. Relevé sur les vingt et une
applications du parc le 15/09/2026 : **zéro** appelle `initAnalytics`, **zéro**
appelle `usePageViews`, et `react/` ne contenait aucun composant de
consentement. Le garde-fou était écrit, la porte n'avait pas de sonnette.

`ConsentBanner` se monte en une ligne et se charge du reste : il appelle
`initAnalytics` si l'application ne l'a pas fait, rejoue le choix mémorisé, et
ne pose la question que s'il n'y en a pas.

```tsx
<ConsentBanner
  gaMeasurementId={import.meta.env.VITE_GA_MEASUREMENT_ID}
  policyHref="/confidentialite"
/>
```

**Quatre décisions, et aucune n'est cosmétique.**

**Sans identifiant, pas de bandeau.** Dix des vingt et une apps partiront sans
`VITE_GA_MEASUREMENT_ID` : leur faire poser la question serait du bruit, et un
bruit qui use le consentement des suivantes.

**Le choix est relu au montage.** C'est le piège que ce module referme :
`initAnalytics` repart TOUJOURS de `denied`, donc sans rejeu explicite, un
visiteur qui a accepté hier ne serait plus mesuré aujourd'hui — et rien ne le
signalerait. Le test qui le couvre est le seul de la suite à rougir quand on
retire ce rejeu, contre-épreuve à l'appui.

**Refuser coûte un clic, comme accepter.** Les deux boutons sont dans le même
conteneur, sans écran intermédiaire — un test l'éprouve par
`refuser.parentElement === accepter.parentElement`, ce qui interdit le « gérer
mes préférences » qui rendrait le refus plus coûteux.

**Le refus est mémorisé.** Un refus qu'on redemande à chaque visite n'est pas un
refus. `clearConsentChoice` existe pour le lien « modifier mon choix » d'une
page de confidentialité.

Le bandeau est une `region`, pas une boîte modale : il ne piège pas le focus et
n'interrompt pas la lecture. Obtenir un consentement en bloquant l'application
est précisément la figure que le RGPD appelle un « dark pattern ».

Non stylé — cibler `[data-dwc="consent-banner"]`. Libellés en sept langues.

`PARAMETRAGE.md` gagne au passage la section **D bis** : `VITE_GA_MEASUREMENT_ID`
et `VITE_GTM_CONTAINER_ID` n'y figuraient pas, ce qui explique une partie de
l'adoption nulle — le module existait, la marche à suivre pour l'alimenter
n'était écrite nulle part d'opérationnel. Une propriété par site, jamais
partagée : c'est ce qui rend le suivi indépendant.
