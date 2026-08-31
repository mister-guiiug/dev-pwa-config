---
'@mister-guiiug/dev-wpa-config': patch
---

Deux choses que ce paquet affirmait et que `vite-plugin-pwa` contredit. Les
deux ont été trouvées en migrant, pas en relisant.

**`onRegistered` était mort, et silencieusement.** Le plugin écrit
`if (onRegisteredSW) onRegisteredSW(…); else onRegistered?.(…)` — or `connect()`
lui passait **toujours** un `onRegisteredSW`. Le rappel déprécié n'avait donc
aucune chance d'être appelé, et le relais ajouté pour lui ne servait à rien :
une app qui migrait son `onRegistered` vers ce hook perdait sa journalisation
d'enregistrement sans un mot. La règle du plugin est désormais reproduite un
cran plus haut — le moderne s'il est fourni, l'ancien sinon, jamais les deux.
Vérifié par mutation.

**Le motif `registerSW={import.meta.env.PROD ? registerSW : undefined}` ne
protège de rien, et le README ne le recommande plus.** En développement,
`vite-plugin-pwa` sert déjà un patron **entièrement inerte**
(`dist/client/dev/register.js` : `registerSW()` rend une fonction asynchrone
vide, rien n'est enregistré), sauf si l'app active `devOptions` — ce qu'aucune
app du parc ne fait.

Et il nuit : **Vitest pose `PROD` à faux**, donc le câblage réel devient
intestable. Deux apps ont dû intercaler un composant qui reprend `registerSW`
en prop pour contourner un garde superflu. La page dit maintenant de ne pas le
poser, et pourquoi.
