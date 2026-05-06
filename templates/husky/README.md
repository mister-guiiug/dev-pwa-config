# Husky setup template

## Installation côté projet consumer

```bash
npm install --save-dev husky lint-staged @commitlint/cli @commitlint/config-conventional
npx husky init
```

## Copier les hooks

```bash
cp <chemin-vers>/dev-wpa-config/templates/husky/pre-commit .husky/pre-commit
cp <chemin-vers>/dev-wpa-config/templates/husky/commit-msg .husky/commit-msg
chmod +x .husky/pre-commit .husky/commit-msg
```

## Créer les configs

`commitlint.config.js` :

```js
export { default } from '@mister-guiiug/dev-wpa-config/commitlint';
```

`lint-staged.config.js` :

```js
export { default } from '@mister-guiiug/dev-wpa-config/lint-staged';
```

## Activation auto à l'install

Ajouter dans `package.json` :

```jsonc
{
  "scripts": {
    "prepare": "husky"
  }
}
```

Husky s'installe automatiquement après `npm install`.
