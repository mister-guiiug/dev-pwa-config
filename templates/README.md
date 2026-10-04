# Gabarits du socle

**Ce dossier n’est plus la source de la composition d’une application.**

Une app naît de l’archive `pwa-starter-kit` (via `create-lg-pwa-app`). Les
fichiers de coquille (`ci.yml`, `index.html`, `main.tsx`, configs Vite/Vitest)
viennent du squelette — pas d’ici. Un gabarit qui double le squelette est un
troisième endroit où la même chose vieillit (STRATEGIE / AMELIORATIONS T12).

## Ce qui reste ici

| Chemin | Rôle |
| ------ | ---- |
| `github-workflows/deploy.yml` | Caller `pwa-deploy` documenté (vars / secrets nommés). Préférer `pwa-env sync` dès qu’un `config/env.manifest.json` existe. |
| `github-workflows/cleanup-runs.yml` | Ancien corps inline — le squelette appelle le réutilisable ; garder pour lecture historique. |
| `github-workflows/supabase-keepalive.yml` | Caller keep-alive. |
| `.editorconfig`, `.lighthouserc.json`, `.npmrc` | Fichiers figés que `pwa-doctor --fix` peut aussi poser. |
| `husky/`, `vscode/`, `e2e/a11y.spec.ts`, `changesets/`, `supabase/` | Options hors composition React. |
| `FUNDING.yml` | Gabarit financement. |

`ci.yml` et `index.html` ont été **retirés** : prendre ceux du squelette.
