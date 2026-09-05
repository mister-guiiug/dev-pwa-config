# Changesets setup template

[Changesets](https://github.com/changesets/changesets) gère le bump de version
et le changelog de manière coordonnée. Recommandé pour `dev-pwa-config` (paquet
publié sur GitHub Packages).

## Installation

```bash
npm install --save-dev @changesets/cli
npx changeset init
```

Puis remplacer `.changeset/config.json` par celui de ce template (`access: restricted` pour GitHub Packages).

## Workflow

```bash
# À chaque PR introduisant un changement utilisateur :
npx changeset
# → choisir patch / minor / major + écrire le résumé
# → commit le fichier .changeset/*.md créé

# Avant publish :
npx changeset version
# → bump package.json + génère CHANGELOG.md à partir des changesets
git add . && git commit -m "chore: release"
git tag v$(node -p "require('./package.json').version")
git push --follow-tags
# → workflow publish.yml démarre
```

## Avantages vs `npm version`

- Coordonne les bumps entre plusieurs paquets (utile si on ajoute un futur `eslint-config-react-mister-guiiug` séparé).
- Génère un changelog formaté avec les contributeurs et liens PR.
- Permet d'accumuler plusieurs changements par PR avant un release groupé.
