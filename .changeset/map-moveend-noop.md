---
'@mister-guiiug/dev-wpa-config': patch
---

Carte : un `moveend` qui ne déplace rien n'est plus annoncé comme un déplacement.

Les deux moteurs émettent `moveend` lors d'un **redimensionnement du conteneur** — Leaflet par `invalidateSize`, MapLibre par son observateur de taille — en rapportant le centre inchangé. Une app qui recopie `onViewportChange` dans un formulaire y voyait la saisie de l'utilisateur écrasée par le centre de départ, sans que personne n'ait bougé la carte.

Les adaptateurs mémorisent désormais la dernière vue annoncée, amorcée à la vue de montage, et ne relaient l'évènement que s'il dit autre chose. Nouveau prédicat `sameViewport(a, b)` dans `@mister-guiiug/dev-wpa-config/map`.

Complète le correctif de la 3.15.0, qui n'avait retiré que l'émission au chargement.
