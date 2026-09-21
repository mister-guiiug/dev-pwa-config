---
'@mister-guiiug/dev-pwa-config': minor
---

`speech` : laisser l'utilisateur choisir sa voix

`listVoices(lang)` rend les voix d'une langue, `onVoicesChanged(rappel)` prévient
quand elles arrivent (`getVoices()` est vide au premier appel), et
`speak(text, lang, { voiceName })` emploie celle qu'il a désignée.

C'est la seule réponse possible à une voix qui articule mal, car aucune API
n'expose la qualité d'une voix. Mesuré le 21/09/2026 : `Microsoft Hortense`,
première voix française de Windows et donc celle que `pickVoice` retient,
prononce « cinq » de travers dès qu'une ponctuation le précède — « Résultat : 5. »,
« Résultat: 5. » et « Résultat, 5. » sont fautifs, tandis que `Julie` et `Paul`,
même machine et mêmes phrases, sont justes. Aucune reformulation ne sauve le cas :
la virgule échoue comme les deux-points, or une énumération en demande.

Et l'utilisateur n'a aucun recours ailleurs : relevé sur Firefox 156, **les cinq
voix rendues portent `default: false`**, y compris celle du système. Le critère
`voice.default` de la 6.6.1 y est donc inerte, et changer la voix par défaut de
Windows ne modifie pas ce que lit l'application.

La préférence est retenue par `name` et non par `voiceURI` : sur une même
machine, Chrome rend `"Microsoft Hortense - French (France)"` là où Firefox rend
`"urn:moz-tts:sapi:Microsoft Hortense - French (France)?fr-FR"`. Une voix
inconnue ou d'une autre langue est ignorée au profit de `pickVoice` — jamais du
silence.
