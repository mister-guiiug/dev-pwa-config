---
'@mister-guiiug/dev-wpa-config': patch
---

README : documenter `sparkline` et `secure-storage`, et nommer le piège `formatPercentage`.

Deux modules publiés n'avaient **aucune** section dans « Utilisation » — zéro occurrence de `sparkline` (et `/react/sparkline`) comme de `secure-storage` dans tout le README. Un module qu'on ne trouve pas dans la doc est un module qu'on recopie : chacun reçoit sa section au format des voisines — quoi, API, exemple, limites. Celle de `sparkline` montre `describeSeries` (l'alternative textuelle, rédigée en français) ; celle de `secure-storage` reprend les avertissements de l'en-tête du module, parce qu'un coffre qui tait ce qu'il ne protège pas est pire qu'aucun coffre : pas de parade au XSS actif, et phrase oubliée = données irrécupérables.

Le guide de migration gagne le piège `formatPercentage` : le socle attend une **proportion** (`0,42` → « 42 % », convention `Intl`), les copies locales attendaient l'échelle 0–100 (cas réel : `miss-contraction`). Le remplacement à l'identique compile, puis affiche « 4 200 % » — le guide donne le grep, les deux corrections, et le symptôme qui trahit un appel oublié.
