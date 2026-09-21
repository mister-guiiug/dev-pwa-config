---
'@mister-guiiug/dev-pwa-config': minor
---

`speech` : l'annonce ne se fait plus couper la fin, et choisit sa voix

**Le défaut se signale toujours sur une VALEUR, et la valeur n'y est jamais
pour rien.** Un utilisateur d'Android a rapporté « sur le chiffre 5 l'annonce
est incorrecte ». Le 5 n'avait rien de particulier : il était seulement le
dernier mot. Ce qui sautait, c'était la FIN de la phrase — or la fin d'une
annonce est presque toujours la donnée utile, un score, un résultat.

Deux défauts de Chrome, tous deux dans ce module depuis sa promotion :

**1. Aucune référence n'était gardée sur l'utterance.** Un
`SpeechSynthesisUtterance` que plus rien ne référence peut être ramassé par le
ramasse-miettes **pendant qu'il parle** : le son s'arrête net. Le module en
tient désormais une jusqu'à `onend`/`onerror`, puis la relâche.

**2. `cancel()` puis `speak()` dans le même tour de boucle.** `cancel()` est
asynchrone : l'enchaînement fait avaler le début — parfois la totalité — de la
nouvelle phrase, et c'est nettement pire sur Android. On n'annule désormais
**que** s'il y a quelque chose à interrompre (`speaking || pending`), puis on
laisse 120 ms au moteur. Une annonce plus récente remplace celle qui attendait
encore son tour.

## `pickVoice` — nouveau, et ce qu'il refuse de faire

L'idée vient de `mister-molkky`, seule app du parc à choisir une voix plutôt
que de poser `utterance.lang` et d'espérer. Sa mécanique est reprise ; **son
repli ne l'est pas.** Elle retombait sur `voix[0]`, la première de la liste,
quelle que soit sa langue — c'est exactement ce qui fait lire du français par
une voix anglaise.

Trois niveaux ici, et le dernier est « aucune » :

1. l'étiquette exacte (`fr-FR`) ;
2. la même **langue** (`fr-CA` pour un `fr-FR` demandé) ;
3. `null` — le moteur décidera depuis `utterance.lang`, ce qu'il fait mieux
   qu'un choix arbitraire.

`getVoices()` rend un tableau **vide** au premier appel sur la plupart des
navigateurs : mesuré sur miss-dice, 0 voix juste après le chargement et 3 après
`voiceschanged`. Le module écoute donc cet évènement et relit sa liste — sans
quoi la toute première annonce d'une session partirait sans voix.

## Rien à changer chez les adoptants

`speak(text, lang)` garde sa signature et son contrat. Son `true` signifie
toujours « énoncé **planifié** » — simplement, avec le délai de reprise, il peut
partir au tour de boucle suivant.

Le sous-chemin `./speech` n'avait **aucun test** ; il en a neuf, dont les
contre-épreuves des deux défauts et du repli refusé.

## À faire côté applications

`miss-dice` porte une **copie locale** (`src/a11y/speech.ts`), corrigée le
21/09/2026 par mister-guiiug/miss-dice#90 ; elle peut disparaître au profit de
ce module. `mister-molkky` porte `src/tts.ts`, encore atteint par les deux
défauts. Ce sont les deux seules copies du parc au relevé du 21/09/2026.
