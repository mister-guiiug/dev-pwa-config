# Monter le parc à ESLint 10

_Dossier instruit le 03/09/2026. Tout ce qui suit a été mesuré ou éprouvé dans un bac à sable, jamais déduit d'un fichier de métadonnées._

> **ACHEVÉ LE 12/09/2026 — le socle ET le squelette sont en ESLint 10, et la
> preuve est un job vert.**
>
> `pwa-starter-kit` a reçu les trois gestes par ses PR **#20** (socle en
> `^4.10.0`) et **#21** (Node 26.2.0, Prettier 3.9.6, ESLint 10). Son `main`
> (`79e5966`) déclare `eslint@^10.10.0` et `@eslint/js@^10.0.1`, porte
> l'override de `jsx-a11y`, et son lockfile a résolu exactement ce que la recette
> annonçait : **eslint 10.10.0, `@eslint/js` 10.0.1, `jsx-a11y` 6.10.2 conservé,
> socle 4.10.0**.
>
> Ce qui le prouve n'est pas une déclaration mais **le job « Le squelette,
> construit sur ce paquet », passé au vert sur `main`** — exécution 591, tête
> `73fd17d`. Ses onze étapes passent, dont la sixième, « Installer le squelette
> SUR le paquet empaqueté », qui portait l'`ERESOLVE` depuis la fusion de #248,
> puis « Lint · types · tests » et « Build, budget de poids et diagnostic
> strict ». C'est la garde de ce dépôt qui l'atteste, sur le paquet empaqueté ici.
>
> **L'alarme du bloc « CORRECTION DU 12/09 » est donc levée** : une app née du
> générateur naît désormais en ESLint 10, et le point 4 de « L'ordre des
> opérations » est enfin vrai. Restent les apps du parc, et elles seules.
>
> **`jsx-a11y` n'a toujours pas republié** — vérifié au registre le 12/09/2026 :
> `latest` vaut encore **6.10.2**, et sa peer `eslint` encore
> `^3 || … || ^9`. L'override reste donc nécessaire, et `scripts/plafonds.mjs`
> dira le jour où il cesse de l'être.
>
> _Ce qui suit est l'histoire de cette montée : les deux erreurs que ce dossier
> portait, puis une troisième. C'est gardé parce que c'est ce qui explique la
> recette ; l'état, c'est ce qui précède._

---

> **PASSE EXÉCUTÉE LE 10/09/2026 — socle et squelette. Deux choses que ce
> dossier disait, et qui étaient fausses.**
>
> **1. Le socle ne peut pas ouvrir la porte seul.** L'ordre des opérations
> ci-dessous commençait par « le socle d'abord, publier », en promettant
> qu'« une app qui n'a pas encore migré doit continuer d'installer le socle sans
> rien changer ». C'est vrai d'un `npm ci` — le lockfile fige la 9 — et **faux
> d'un `npm install`**, le geste même par lequel une app monte de version : la
> plage élargie autorise la 10, npm prend donc la plus haute, et bute sur le
> plafond de `jsx-a11y`. `ERESOLVE`, installation refusée. Constaté sur
> `pwa-starter-kit` par le job « Le squelette, construit sur ce paquet »
> (run 34521501702), qui a refusé la première tentative — et bien fait.
>
> **2. L'override est INERTE si l'app ne déclare pas `eslint` elle-même.**
> C'est le point que personne n'avait vu, et il change la recette. `$eslint`
> désigne la plage que le PROJET RACINE déclare en dépendance directe : sans
> déclaration, il ne renvoie à rien et l'override ne s'applique pas. Or le
> squelette — comme toute app née de lui — ne déclarait pas `eslint`, le laissant
> s'installer par la peer du socle. Vérifié : override seul → `ERESOLVE` ;
> override **plus** `eslint` et `@eslint/js` déclarés → installation propre.
>
> **La recette corrigée tient donc en TROIS gestes, et deux dépôts dans la même
> version** — le § « La recette, éprouvée » ci-dessous les porte.
>
> **Ce que la passe a livré, et prouvé.** Le socle élargit ses deux peers et
> tourne lui-même en `eslint@10.10.0` / `@eslint/js@10.0.1` : installation sans
> `--legacy-peer-deps`, lint vert, 1363 tests verts sur Node 22 et 24. Le
> squelette, installé sur le paquet candidat avec les trois gestes, passe
> **lint (ESLint 10), `tsc -b`, ses 28 tests, son build, son budget de poids et
> `pwa-doctor --strict` — 0 défaut, 0 dette, 0 info**. Les dix
> `no-useless-assignment` du socle étaient déjà corrigés ; le squelette n'en
> avait aucun, et les deux autres règles entrantes ne mordent nulle part.
>
> **Restent les apps** : celles qui déclarent `eslint` elles-mêmes (comme
> `bac-sable`) ne voient rien tant qu'elles ne montent pas ; celles qui s'en
> remettent à la peer du socle ont besoin des trois gestes. `scripts/plafonds.mjs`
> dira le jour où `jsx-a11y` republie et rend l'override inutile.
>
> **CORRECTION DU 12/09/2026 — « socle ET squelette » est trompeur.** Le
> squelette a été ÉPROUVÉ le 10/09, dans le job « Le squelette, construit sur ce
> paquet », qui l'installe depuis `main` sur le paquet candidat. Il n'a pas été
> MODIFIÉ : son `package.json` n'a jamais porté ESLint 10 — dix commits le
> touchent, aucun ne le fait. Il est resté en `^9.39.4`, et la campagne du
> 12/09 l'y a épinglé explicitement, comme les dix-huit apps.
>
> Conséquence à ne pas perdre de vue : `pwa-starter-kit` est le gabarit vivant
> du générateur, donc **toute app née depuis naît en ESLint 9, hors support**.
> Le point 4 de « L'ordre des opérations » ci-dessous affirme que « le point 1 y
> pourvoit déjà » : c'est faux tant que la PR sur le squelette n'est pas
> fusionnée. C'est par lui que doit commencer la montée des consommateurs.
>
> **Levé le jour même** : le squelette a été modifié par #20 puis #21, et le job
> de ce dépôt est passé au vert. Voir le bloc d'ouverture.

## Pourquoi maintenant

`npm install` l'annonce à chaque installation du socle :

> npm warn deprecated eslint@9.39.5: This version is no longer supported.

ESLint 9 est sorti du support, ESLint 10.9.1 est publié. Le parc — le socle et
ses dix-sept dépôts — est sur la 9. _(Vrai le 03/09. Depuis le 12/09, le socle et
le squelette sont en 10 ; ce constat ne vaut plus que pour les apps.)_

## Le blocage apparent, et ce qu'il vaut

Un seul paquet de la chaîne refuse ESLint 10 :

| Paquet                        | Version    | Plage `eslint` déclarée     |
| ----------------------------- | ---------- | --------------------------- |
| `typescript-eslint`           | 8.69.0     | `^8.57 \|\| ^9 \|\| ^10` ✅ |
| `eslint-plugin-react-hooks`   | 7.1.1      | jusqu'à `^10` ✅            |
| `eslint-plugin-react-refresh` | 0.5.6      | `^9 \|\| ^10` ✅            |
| `@eslint/js`                  | 10.0.1     | `^10` (monte avec ESLint)   |
| **`eslint-plugin-jsx-a11y`**  | **6.10.2** | **s'arrête à `^9`** ❌      |

`eslint-plugin-jsx-a11y` n'a pas été publié depuis le **26 octobre 2024** : ce
n'est pas un retard de quelques semaines qu'on attend en patientant.

**Mais le blocage est déclaratif, pas réel.** Monté dans un bac à sable avec
ESLint 10.9.1, le plugin fonctionne : sur un composant écrit pour le prendre en
défaut, ses règles se déclenchent toutes —

```
4:5  warning  jsx-a11y/click-events-have-key-events
4:5  warning  jsx-a11y/no-static-element-interactions
5:7  warning  jsx-a11y/alt-text
6:7  warning  jsx-a11y/anchor-is-valid
```

Le plugin lit l'AST et rend des messages ; rien dans ESLint 10 ne lui manque.
C'est sa déclaration de compatibilité qui n'a pas suivi, pas son code.

## Ce qu'ESLint 10 change, et ce que ça coûte ici

| Rupture                                       | Le parc                                                    |
| --------------------------------------------- | ---------------------------------------------------------- |
| Node ≥ 20.19 / 22.13 / 24                     | ✅ `.nvmrc` épingle 26.2.0 ; la CI d'ici joue 22 ET 26.2.0 |
| `.eslintrc` supprimé                          | ✅ tout le parc est en flat config                         |
| Commentaires `eslint-env` → erreurs           | ✅ aucun dans le parc                                      |
| API de règles retirée (`context.getCwd()`, …) | ✅ le socle n'écrit aucune règle                           |
| `eslint:recommended` : trois règles de plus   | ⚠️ **le seul vrai coût** — voir ci-dessous                 |

`no-unassigned-vars`, `no-useless-assignment` et `preserve-caught-error`
entrent dans `recommended`. Mesuré en installant réellement ESLint 10 :

| Dépôt          | Nouvelles erreurs | Lesquelles                      |
| -------------- | ----------------- | ------------------------------- |
| dev-pwa-config | **7**             | `no-useless-assignment`, toutes |
| miss-uwh       | **2**             | `no-useless-assignment`         |
| miss-dice      | **0**             | —                               |

Une seule règle mord, et toujours sur le même motif : une variable initialisée
puis réaffectée dans un `try`, dont la valeur de départ n'est jamais lue.

```js
let fallback = 'absent';           // ← jamais lu : le try assigne dans tous les cas
try {
  fallback = isAppShell(await …) ? 'coquille' : 'page GitHub';
} catch {
  fallback = 'injoignable';
}
```

La règle a raison : l'initialisation ne sert à rien. Elle se corrige en
déclarant `let fallback;` — une ligne par occurrence, sans changement de
comportement. Sept dans le socle : `auth/index.js`, `image.js`,
`playwright-base.js`, `react/share-button.js`, `scripts/fetch-metrics.mjs`,
`scripts/probe-sites.mjs`, `version.js`.

## La recette, éprouvée

Elle tient en **trois gestes**, et l'installation se fait **proprement** — sans
`--legacy-peer-deps`, qui masquerait les vrais conflits à venir.

**1. Le socle élargit ses peers** (`package.json`) :

```json
"peerDependencies": {
  "eslint": "^9.39.4 || ^10.0.0",
  "@eslint/js": "^9.39.4 || ^10.0.0"
}
```

Les deux plages, pas seulement la 10 : une app qui déclare `eslint@^9.39.4`
elle-même continue d'installer le socle sans rien changer. Celle qui ne déclare
rien, en revanche, se verra proposer la 10 par npm — d'où les deux gestes
suivants, **dans la même version**.

**2. L'app DÉCLARE `eslint` et `@eslint/js`** — c'est ce geste qui manquait à ce
dossier, et sans lui le troisième ne fait rien :

```json
"devDependencies": {
  "eslint": "^10.10.0",
  "@eslint/js": "^10.0.1"
}
```

**3. L'app lève la déclaration périmée de jsx-a11y** :

```json
"overrides": {
  "eslint-plugin-jsx-a11y": { "eslint": "$eslint" }
}
```

`$eslint` renvoie à la version que l'app déclare **au geste 2** : l'override ne
fige rien, il dit « ce plugin suivra ma version d'ESLint ». Sans déclaration
directe, `$eslint` ne renvoie à rien et l'override est inerte — c'est
exactement ce qui a fait échouer la première tentative sur le squelette. Le jour
où jsx-a11y publie une version compatible, la ligne se retire sans autre
changement, et `scripts/plafonds.mjs` le dira.

Éprouvé pour de bon le 10/09/2026 sur `pwa-starter-kit`, installé sur le paquet
candidat : `npm install` résout sans forcer (`eslint 10.10.0`, `@eslint/js
10.0.1`, `jsx-a11y 6.10.2`), puis lint, types, tests, build, budget et
`pwa-doctor --strict` passent tous.

**Et en vigueur depuis le 12/09/2026** : le squelette porte ces gestes sur son
`main`, et son lockfile a résolu les mêmes versions que l'essai annonçait. La
recette n'est donc plus une proposition — c'est ce que le gabarit fait.

## L'ordre des opérations

**Corrigé le 10/09/2026**, après l'échec de la première tentative : ce n'est pas
« le socle, puis une app pilote ». Le socle seul casse les apps qui ne déclarent
pas `eslint`.

1. ~~**Le socle ET le squelette, dans la même version**~~ — **FAIT.** Peers
   élargies ici par #248 et la 4.10.0 publiée ; les gestes 2 et 3 posés sur le
   squelette par #20 et #21. Le job « Le squelette, construit sur ce paquet »
   installe le squelette sur le paquet candidat : il a refusé la CI tant que les
   deux n'étaient pas d'accord, et il est vert depuis qu'ils le sont. C'est lui
   qui a rendu l'ordre impossible à ignorer, et lui qui atteste la fin.
2. **Les apps qui ne déclarent pas `eslint`**, une PR chacune : les gestes 2 et 3.
   Ce sont elles qui cassent au prochain `npm install`, et elles seules. Attention
   au recensement : la campagne du 12/09 a épinglé des apps en `^9.39.4`
   explicitement, ce qui les fait passer au point 3 — se fier à leur
   `package.json`, pas à ce dossier.
3. **Les apps qui déclarent déjà `eslint@^9.39.4`** : rien ne presse, elles
   montent quand elles veulent, avec les mêmes gestes 2 et 3 — pour elles le
   geste 2 est une simple montée de plage, la déclaration existant déjà.
   `bac-sable` en est — vérifié le 12/09 : `eslint@^9.39.4`,
   `@eslint/js@^9.39.4`, aucun override.
4. ~~**Le gabarit** et la checklist du README~~ — **FAIT par le point 1.** Le
   squelette étant le gabarit vivant, une app qui en naît naît maintenant en
   ESLint 10. Ce point était faux entre le 10 et le 12/09, et le bloc
   « CORRECTION DU 12/09 » dit pourquoi.

## Ce qui peut mal tourner

- **jsx-a11y peut ne jamais être republié.** L'override tient tant que le
  plugin fonctionne ; le jour où une version d'ESLint casse vraiment son code,
  il faudra le remplacer. Deux ans sans publication est un signal — la question
  du remplacement se posera, mais elle ne bloque pas cette montée.
- **`npm audit` peut râler** sur une dépendance transitive du plugin ancien.
  Rien de constaté aujourd'hui.
- **Les trois nouvelles règles sont mesurées sur trois dépôts**, pas dix-huit :
  le chiffre par app se lit en montant, il n'y a pas de surprise de nature à
  attendre — seulement, peut-être, quelques occurrences de plus.

## Ce qui n'est PAS proposé

Passer par `--legacy-peer-deps` en CI : ça ferait taire tous les conflits de
peers du parc, pas seulement celui-ci, et le prochain vrai conflit passerait
inaperçu. L'override nomme le paquet, la raison et la portée.
