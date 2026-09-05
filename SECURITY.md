# Politique de sécurité

`@mister-guiiug/dev-pwa-config` est le socle commun de seize applications PWA de
la famille `miss-*` / `mister-*`. Une faille ici se propage à toutes : le
signalement mérite un canal, et ce dépôt n'en avait aucun.

## Signaler une vulnérabilité

**N'ouvrez pas d'issue publique.** Utilisez l'onglet
[Security → Report a vulnerability](https://github.com/mister-guiiug/dev-pwa-config/security/advisories/new)
du dépôt (GitHub Private Vulnerability Reporting), qui ouvre un fil privé avec
les mainteneurs.

Merci d'y indiquer :

- la version du paquet concernée (`npm ls @mister-guiiug/dev-pwa-config`) ;
- le sous-chemin en cause (`react/…`, `vite-csp`, un workflow réutilisable…) ;
- ce qu'un attaquant obtient concrètement ;
- de quoi reproduire — un dépôt minimal vaut mieux qu'une description.

Un accusé de réception sous **72 heures**, et un premier diagnostic sous une
semaine. Ce dépôt est maintenu par une seule personne : ces délais sont un
engagement de bonne foi, pas un contrat de support.

## Versions suivies

Seule la dernière version majeure publiée reçoit des correctifs. Les workflows
réutilisables sont consommés via un **tag majeur mobile** (`@v4`) : un correctif
publié atteint donc les dix-neuf dépôts consommateurs au tag suivant, sans
intervention de leur part.

## Périmètre

Entrent dans le périmètre :

- le code publié (tout ce qui figure dans `files` de `package.json`) ;
- les workflows réutilisables et les composite actions de `.github/` ;
- les templates destinés à être copiés dans les apps.

N'entrent pas dans le périmètre :

- le showroom (`showroom/`), page statique sans backend ni donnée ;
- les applications consommatrices — signalez-les sur leur propre dépôt ;
- les vulnérabilités des dépendances tierces sans chemin d'exploitation par ce
  paquet : signalez-les en amont, et ouvrez ici une issue publique ordinaire.

## Ce que ce paquet ne protège pas

Deux limites connues, écrites ici pour qu'elles ne soient pas redécouvertes
comme des failles :

- **Clickjacking sur GitHub Pages.** `frame-ancestors` ne fonctionne que dans un
  en-tête HTTP, et GitHub Pages n'en pose aucun. Les apps qui y sont déployées
  n'ont pas de protection effective. `cspPlugin` refuse d'ailleurs cette
  directive plutôt que d'en donner l'illusion (voir le README).
- **Journal d'erreurs local.** `react/observability` conserve les cinquante
  dernières erreurs dans `localStorage`, piles comprises. Tout script exécuté
  sur l'origine peut les lire : ne pas y placer de contexte sensible.
