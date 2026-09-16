---
'@mister-guiiug/dev-pwa-config': minor
---

`placement="fixed"` sur `UpdatePromptBanner` et `ConsentBanner` : la place, enfin demandable.

**Le bandeau de mise à jour.** Le socle le plaçait déjà, mais seulement sous `:root:has([data-dwc='bottom-nav'][data-placement='fixed'])` : il fallait une barre basse, du socle, **et** déclarée. Relevé du 16/09/2026 : cinq apps sur vingt remplissaient cette condition. Les autres recevaient une boîte habillée **posée dans le flux**, en fin de document — et six ont réécrit le placement à la main (miss-badminton, miss-carbook, miss-contraction, miss-dice sous un `className`, mister-miss-koh, mister-molkky), avec des `z-index` allant de 25 à 9999.

**Le bandeau de consentement n'avait, lui, aucune position du tout.** `position: static`, donc en fin de flux, là où les apps le montent — c'est-à-dire sous le pied de page. Mesuré en production sur `mister-cim10`, en 375 × 812 : boîte de 753 à 891 px pour une fenêtre de 812, recouverte par la barre basse dont le bord haut est à 756. Le bandeau qui **demande** le consentement était sous la ligne de flottaison et derrière la navigation.

La prop dit la même chose que celle de `BottomNav`, et le même mot. Elle ne dépend d'aucune barre — c'était tout le problème — mais elle en tient compte s'il y en a une, le plancher venant de `--_dwc-bottom-clearance`.

**Pas de mode « en haut », et c'est le corpus qui l'a tranché** : les six placements maison relevés collent le bandeau en bas, sans exception. Seul `miss-dice` place son bandeau de consentement en haut, dans sa propre feuille — son CSS n'étant pas « layered », il garde la main.

**La question passe devant.** Les deux bandeaux visent le même bas d'écran. Un empilement demanderait la hauteur de celui du dessous, que CSS ne connaît pas : tout décalage serait un nombre magique, faux dès que le message passe à la ligne. La précédence, elle, est exacte, et c'est déjà l'idiome du composant — `update-prompt-banner.js` fait taire le « prêt hors ligne » dès qu'une version attend. Même raisonnement d'un cran au-dessus : le consentement est transient par construction, le bandeau de mise à jour revient à la vérification suivante.

**`box-sizing: border-box` sur les surfaces flottantes.** Le socle ne posait aucun `box-sizing`, comptant sur le préréglage de l'app. Sur une page qui n'en a pas, `width` s'ajoute au `padding`, les trois côtés posés se sur-contraignent, `margin-inline: auto` rend un `-10px` et le bandeau sort de l'écran — mesuré sur un banc d'essai sans préréglage. Sous un préréglage, la ligne ne change rien.
