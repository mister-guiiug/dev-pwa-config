# Changesets

Ce dossier est géré par [Changesets](https://github.com/changesets/changesets).

Flux de release :

1. `npm run changeset` — décrire le changement et choisir le niveau de bump
   (patch / minor / major). Crée un fichier markdown dans ce dossier.
2. `npm run version-packages` — consomme les changesets : bumpe `package.json`
   et met à jour `CHANGELOG.md`.
3. Commit, puis `git tag vX.Y.Z && git push --tags` → le workflow `publish.yml`
   publie sur GitHub Packages **et** fait avancer le tag majeur mobile (`v1`).

Voir `templates/changesets/README.md` pour le détail.
