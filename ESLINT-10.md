# Monter le parc à ESLint 10

_Dossier instruit le 03/09/2026. Tout ce qui suit a été mesuré ou éprouvé dans un bac à sable, jamais déduit d'un fichier de métadonnées._

> **CE QUE LA PREMIÈRE TENTATIVE A DÉMENTI — 10/09/2026.** L'étape 1 a été
> jouée pour de vrai, et elle a échoué : élargir les peers du socle en
> `^9.39.4 || ^10.0.0` **casse l'installation d'une app qui n'a pas encore
> l'override**. La recette ci-dessous le disait sans le mesurer — « une app qui
> n'a pas encore migré doit continuer d'installer le socle sans rien changer »
> est vrai d'un `npm ci` (le lockfile fige la 9) et **faux d'un `npm install`**,
> c'est-à-dire du geste même par lequel une app monte de version.
>
> Le mécanisme, relevé sur le job « Le squelette, construit sur ce paquet »
> (run 34521501702) : la plage élargie autorise la 10, npm prend donc la plus
> haute — `eslint@10.10.0` — puis bute sur `eslint-plugin-jsx-a11y@6.10.2`, qui
> plafonne à `^9`. `ERESOLVE`, installation refusée. npm ne revient pas en
> arrière pour choisir la 9 : il prend le plus haut, puis vérifie.
>
> **Qui casse, et qui ne casse pas.** Une app qui déclare `eslint` elle-même
> (`"eslint": "^9.39.4"` en devDependencies, ce que fait `bac-sable`) n'est pas
> touchée : npm résout SA plage. Cassent celles qui s'en remettent à la peer du
> socle — dont `pwa-starter-kit`, le squelette, donc **le modèle de toute
> application à naître**.
>
> **Ce que cela change pour ce dossier.** L'élargissement des peers n'est pas un
> geste que le socle peut poser seul : il n'est publiable qu'AVEC l'override
> côté consommateur, dans la même passe. Les peers ont donc été laissées en
> `^9.39.4` ; ce qui a été gardé du chantier est ce qui vaut dans les deux cas :
> les dix `no-useless-assignment` sont corrigés (`recommended` d'ESLint 10 les
> fera entrer sans rien coûter le jour venu), les deux autres règles entrantes
> ont été vérifiées à zéro occurrence, et `scripts/plafonds.mjs` surveille
> désormais le plafond au lieu de l'oublier.
>
> **L'ordre des opérations en sort corrigé** : ce n'est pas « le socle, puis une
> app pilote, puis les seize autres », c'est **le socle ET le squelette dans la
> même version**, puis les apps qui ne déclarent pas `eslint` elles-mêmes, puis
> le reste. Le socle seul ne peut pas ouvrir cette porte.

## Pourquoi maintenant

`npm install` l'annonce à chaque installation du socle :

> npm warn deprecated eslint@9.39.5: This version is no longer supported.

ESLint 9 est sorti du support, ESLint 10.9.1 est publié. Le parc — le socle et
ses dix-sept dépôts — est sur la 9.

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

| Rupture                                       | Le parc                                           |
| --------------------------------------------- | ------------------------------------------------- |
| Node ≥ 20.19 / 22.13 / 24                     | ✅ Node 22 partout (`.nvmrc`, runners en 22.23.2) |
| `.eslintrc` supprimé                          | ✅ tout le parc est en flat config                |
| Commentaires `eslint-env` → erreurs           | ✅ aucun dans le parc                             |
| API de règles retirée (`context.getCwd()`, …) | ✅ le socle n'écrit aucune règle                  |
| `eslint:recommended` : trois règles de plus   | ⚠️ **le seul vrai coût** — voir ci-dessous        |

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

Elle tient en deux gestes, et l'installation se fait **proprement** — sans
`--legacy-peer-deps`, qui masquerait les vrais conflits à venir.

**1. Le socle élargit ses peers** (`package.json`) :

```json
"peerDependencies": {
  "eslint": "^9.39.4 || ^10.0.0",
  "@eslint/js": "^9.39.4 || ^10.0.0"
}
```

Les deux plages, pas seulement la 10 : une app qui n'a pas encore migré doit
continuer d'installer le socle sans rien changer.

**2. Chaque app lève la déclaration périmée de jsx-a11y** :

```json
"overrides": {
  "eslint-plugin-jsx-a11y": { "eslint": "$eslint" }
}
```

`$eslint` renvoie à la version que l'app installe elle-même : l'override ne fige
rien, il dit « ce plugin suivra ma version d'ESLint ». Le jour où jsx-a11y
publie une version compatible, la ligne se retire sans autre changement.

Vérifié dans un bac à sable : avec ces deux gestes, `npm install` résout sans
forcer (`eslint 10.9.1`, `@eslint/js 10.0.1`, `jsx-a11y 6.10.2`) et le lint
tourne, règles a11y comprises.

## L'ordre des opérations

1. **Le socle d'abord** : corriger ses sept `no-useless-assignment`, élargir les
   deux peers, publier. Tant qu'il déclare `^9` seul, aucune app ne peut monter
   proprement.
2. **Une app pilote** — miss-dice, qui n'a aucune erreur nouvelle et le plus
   petit code : l'override, la montée d'`eslint` et `@eslint/js`, la CI verte.
3. **Les seize autres**, une PR chacune, en corrigeant au passage les
   `no-useless-assignment` du dépôt.
4. **Le gabarit** (`templates/`) et la checklist du README, pour que le prochain
   projet naisse en 10.

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
