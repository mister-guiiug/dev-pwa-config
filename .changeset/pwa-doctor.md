---
'@mister-guiiug/dev-wpa-config': minor
---

`pwa-doctor` — la checklist du parc, lue sur un dépôt. Un lint voit le code ;
il ne voit pas qu'un manifeste est lié à la racine de l'origine (l'app ne
s'installe pas), qu'un `renovate.json` étend un préréglage inexistant, qu'une
app routée par chemin n'a pas de `404.html`. Ce bin lit le dépôt (fichiers du
gabarit), les workflows (Lighthouse, nettoyage, keep-alive Supabase, e2e,
`@v3`) et le build (`dist/` : manifeste sous le site, PNG 512, maskable, `id`,
langue, icône iOS, `theme-color` par schéma, CSP, Open Graph, canonique,
`404.html`), et rend trois verdicts — défaut, dette, info — avec le geste à
chaque ligne. Code 1 sur un défaut ; `--strict` refuse aussi les dettes. Les
lectures pures d'un site (`scripts/site-readers.mjs`) sont publiées avec lui.
