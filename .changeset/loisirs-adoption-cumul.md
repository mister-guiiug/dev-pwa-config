---
'@mister-guiiug/dev-wpa-config': minor
---

Catégorie `loisirs`, et un relevé d'adoption qui ne s'efface plus lui-même.

**`loisirs` rejoint la taxonomie** (`CATEGORIES`, le type publié, les libellés fr et en de la vitrine). `mister-family-map` y passe : elle était rangée dans `outils` « faute de mieux », un pis-aller assumé à son ajout. Un test tient désormais la règle — toute catégorie du catalogue doit porter ses trois libellés, faute de quoi la facette affiche un identifiant brut sans que rien ne le signale.

**`npm run adoption` fusionne au lieu de remplacer.** Lancé sans les dépôts des apps clonés à côté, il écrivait `measured: 1` et effaçait le relevé des seize autres — 1187 lignes en une commande, sans un mot. Un relevé partiel n'est pas un relevé plus récent : c'est une vue partielle du même objet. Les apps mesurées écrasent leur propre entrée, les autres gardent la leur, et chaque entrée porte son `measuredAt`. `--replace` reste possible et refuse de réduire la couverture sans `--force`. La logique vit dans `scripts/adoption-merge.mjs`, éprouvée par six tests.

Le relevé passe ainsi à **17/17 apps**, pour la première fois complet.
