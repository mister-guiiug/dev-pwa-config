---
'@mister-guiiug/dev-pwa-config': patch
---

`speech` : la voix par DÉFAUT du système gagne dans sa langue

**Régression de la 6.6.0, et c'est moi qui l'ai introduite.** `pickVoice`
prenait la PREMIÈRE voix de `getVoices()` correspondant à la langue. Elle
imposait donc une voix là où les applications laissaient auparavant le moteur
prendre celle du système — sans que personne l'ait demandé.

Le défaut était invisible sur la machine où la fonction a été écrite : sa voix
par défaut (`Microsoft Hortense`) est **aussi la première de la liste**. Il ne
se voit que là où les deux diffèrent.

Or `voice.default` est le choix **explicite** de l'utilisateur dans ses
réglages système, tandis que l'ordre de `getVoices()` n'est spécifié nulle
part — il varie par navigateur et par plateforme.

## La règle, désormais

1. **La langue est la seule contrainte dure.** Aucune voix qui la parle →
   `null`, et le moteur décide depuis `utterance.lang`. Inchangé.
2. **Dans la langue, `voice.default` gagne.**
3. La région (`fr-FR` contre `fr-CA`) ne départage qu'ensuite : mieux vaut la
   voix qu'on a choisie avec un accent d'ailleurs qu'une voix qu'on n'a pas
   choisie.

Une voix par défaut d'une AUTRE langue ne compte pas — la langue reste
au-dessus.

Trois tests neufs, dont la contre-épreuve : rétablir « la première qui
correspond » en fait tomber deux.
