---
'@mister-guiiug/dev-wpa-config': patch
---

Fiabilisation du cycle de vie (refs, publication, doc) — aucun changement d'API.

- **Reusables & templates** : toutes les refs internes `@v1` → `@v3`. Les tags
  majeurs `v1`/`v2` sont gelés (publish.yml n'avance que le major courant), donc
  `firebase-deploy@v1`/`supabase-migrate@v1` servaient du code pré-3.0.0. Nouveau
  garde-fou `test/workflow-refs.test.mjs` : échec CI si une ref interne ne suit
  plus le tag majeur de `package.json`.
- **publish.yml** : crée désormais une **GitHub Release** par tag (notes = section
  correspondante du `CHANGELOG.md`).
- **pwa-deploy.yml** : secret `FIREBASE_SERVICE_ACCOUNT_KEY` passé via `env:` (plus
  d'interpolation inline dans `run:`) ; actions Pages `upload-pages-artifact@v5` /
  `deploy-pages@v5`.
- **renovate.json** : configuration autonome — l'ancien préset partagé
  `github>mister-guiiug/.github//renovate/default.json` pointe sur un dépôt
  inexistant (Renovate était inopérant).
- **tsconfig-strict-plus** : retrait de `noUncheckedIndexedAccess` redondant (déjà
  porté par la base depuis 3.0.0).
- **README** : refs `@v3`, flux de release changesets, table des 14 consommateurs,
  exports 3.4.0 documentés (`vite-csp`, `react/i18n`, `tsconfig-strict-plus`,
  `react/observability`, `react/update-prompt-banner`), checklist d'adoption, badges.
- **templates/.npmrc** : ligne `_authToken=${NODE_AUTH_TOKEN}` (aligne le template
  sur les 14 apps consommatrices).
