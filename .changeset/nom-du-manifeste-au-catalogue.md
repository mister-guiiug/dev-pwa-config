---
'@mister-guiiug/dev-pwa-config': minor
---

**Le nom du manifeste se lit au catalogue. Sans lui, huit applications se sont
installées sous leur identifiant de dépôt.**

`pwaBaseOptions({ id })` rendait `name: name ?? shortName ?? id`. Une app qui
ne passait pas `name` — c'est-à-dire toute app fidèle à la promesse « le
manifeste sort entier de `pwaBaseOptions({ id })` » — obtenait donc son SLUG.
Sur un téléphone, le raccourci de l'écran d'accueil lit `short_name` : les
gens ont eu **« mister-settle »** et **« mister-doc »** écrits sous l'icône.

Le catalogue connaissait pourtant le nom depuis toujours ; il n'était lu que
pour les couleurs. Il l'est maintenant aussi pour le nom, dans le même ordre
que le reste : **l'explicite, puis le catalogue, puis l'identifiant**.

```js
pwaBaseOptions({ id: 'miss-uwh' }); // name et short_name : « Miss UWH »
pwaBaseOptions({ id: 'miss-uwh', name: 'Autre' }); // l'explicite gagne
pwaBaseOptions({ id: 'miss-uwh', shortName: 'UWH' }); // renseigne les deux
```

**Et le dernier recours s'annonce.** Une app hors catalogue et sans `name`
reçoit désormais un avertissement au build, qui dit ce qu'on VERRA plutôt que
ce qui manque : « le raccourci installé affichera _app-inconnue_ sous l'icône ».
C'est le seul défaut du parc qui ne se voyait qu'une fois l'application
installée — il a vécu dans huit dépôts jusqu'au 09/09/2026.

**Ce que ça change pour les apps.** Celles qui passent `name` : rien. Celles
qui n'en passent pas et figurent au catalogue : leur manifeste porte enfin leur
nom, à leur prochaine construction — vérifier au passage que le catalogue dit
bien ce qu'on veut voir sous l'icône, puisque c'est lui qui fait foi.
