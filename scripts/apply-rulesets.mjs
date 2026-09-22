#!/usr/bin/env node
/**
 * Applique le ruleset standard "main protection" sur les repos de la famille
 * miss-* / mister-*. Idempotent : crée si absent, met à jour sinon.
 *
 * LA LISTE DES DÉPÔTS EST LUE SUR LE COMPTE, plus dans le catalogue. Elle a
 * été écrite à la main (elle en oubliait neuf, et nommait `miss-ticket` un
 * dépôt qui s'appelle `miss-ticket-pwa`), puis dérivée du catalogue — ce qui
 * corrigeait les fautes de frappe mais laissait un trou plus large : LE
 * CATALOGUE NE DÉCRIT QUE LES PWA DE LA FAMILLE. Au relevé du 05/09/2026, six
 * dépôts publics sur vingt-quatre n'avaient donc AUCUNE protection — dont deux
 * PWA nées après la dernière mise à jour du catalogue (`miss-supatool`,
 * `mister-miss-koh`) et quatre projets hors périmètre (Rust, C#, Python,
 * extension VS Code). Un dépôt neuf naissait sans protection et rien ne le
 * disait.
 *
 * PUBLICS ET NON ARCHIVÉS SEULEMENT. Un dépôt privé sur un compte personnel
 * sans GitHub Pro répond **403** à l'API des rulesets (vérifié sur
 * `miss-ticket`) : l'y inclure produirait une croix permanente. Un dépôt
 * archivé est en lecture seule.
 *
 * LE CONTEXTE DE CHECK DÉPEND DU DÉPÔT. Toutes les apps exposent le même job
 * (« Format · Lint · Type · Test · Build », via le workflow réutilisable), mais
 * `dev-pwa-config` a les siens. Exiger un check qui ne s'exécute jamais laisse
 * chaque PR éternellement « en attente » — ce qui était le cas ici.
 *
 * Prérequis : `gh auth login` avec scope `repo` + `admin:repo_hook`.
 *
 * Usage :
 *   node scripts/apply-rulesets.mjs                 # tous les repos
 *   node scripts/apply-rulesets.mjs miss-carbook    # repo unique
 *   node scripts/apply-rulesets.mjs --dry-run       # preview sans modif
 *   node scripts/apply-rulesets.mjs --force         # passe outre le garde-fou
 *                                                   # des checks (cf. plus bas)
 *   node scripts/apply-rulesets.mjs --audit         # N'ÉCRIT RIEN : relit les
 *                                                   # rulesets EN VIGUEUR et sort
 *                                                   # en échec si l'un exige un
 *                                                   # contexte que plus aucun job
 *                                                   # ne produit (cf. plus bas)
 */
import { execFileSync } from 'node:child_process';
import { GITHUB_OWNER } from '../apps-catalog.js';
// Les deux règles de NOMMAGE vivent à part, et sont éprouvées par
// `test/rulesets-contextes.test.mjs` : ce fichier-ci appelle `gh` au
// chargement, donc il ne s'importe pas dans un test.
import { indiceMatrice, jamaisHorsPROuverte } from './rulesets-contextes.mjs';

const OWNER = GITHUB_OWNER;
const SELF = 'dev-pwa-config';

/**
 * MIROIRS : `main` y arrive par `git push --force`, jamais par une PR.
 *
 * `mister-family-map` est publié depuis le dépôt privé `bac-sable` par
 * `npm run mirror`, qui fait littéralement
 * `git push --force <remote> refs/heads/main:refs/heads/main`. Le ruleset
 * standard le casserait DEUX FOIS : `non_fast_forward` refuse le forçage, et
 * la règle `pull_request` refuse tout push direct. On n'y protège donc que
 * contre la SUPPRESSION — la relecture, elle, a lieu sur la source.
 */
const MIRRORS = new Set(['mister-family-map']);

/**
 * PUBLICATION AUTOMATIQUE : un workflow du dépôt POUSSE lui-même sur `main`.
 *
 * `parc-dashboard` se relève chaque nuit — `releve.yml` reconstruit
 * `index.html` et `historique.json`, puis fait `git commit` + `git push` sous
 * l'identité `github-actions[bot]`. Or ce robot n'a AUCUN contournement : la
 * règle `pull_request` refuserait ce push, et le relevé s'éteindrait.
 *
 * ET IL S'ÉTEINDRAIT EN SILENCE. C'est déjà arrivé, sur un autre dépôt :
 * `dev-pwa-config / Showroom metrics` a échoué chaque nuit du 02/09 au 13/09
 * 2026 avec `GH013 … Changes must be made through a pull request`, pendant que
 * la vitrine continuait d'afficher des mesures figées. **Un job nocturne rouge
 * dans un dépôt à CI verte ne se voit pas** — douze jours pour s'en apercevoir.
 * Ce Set existe pour que la même panne ne soit pas reposée à la main.
 *
 * ON NE RETIRE QUE `pull_request`, PAS LE RESTE. Le push nocturne est une
 * avance rapide ordinaire (`git push` nu, vérifié : aucun `--force`), donc
 * `non_fast_forward` ne le gêne pas et continue de refuser une réécriture
 * d'historique. Ces dépôts gardent donc DEUX protections, là où le laisser
 * hors du passage en masse — l'état constaté le 23/09/2026 — n'en laissait
 * aucune.
 *
 * Pas de `required_status_checks` non plus : il n'a de sens qu'avec une règle
 * `pull_request`, puisqu'il garde l'entrée d'une PR.
 */
const AUTO_PUBLIE = new Set(['parc-dashboard']);

/**
 * Contextes exigés d'un dépôt — UN SEUL ENDROIT.
 *
 * Le défaut de `CHECKS` vise les applications, qui rapportent toutes
 * `ci / Format · Lint · Type · Test · Build`. Un dépôt qui n'accueille pas de
 * PR n'exige aucun check : ni un miroir, ni un dépôt qui se publie lui-même —
 * `required_status_checks` n'a de sens qu'avec une règle `pull_request`, dont
 * il garde l'entrée.
 *
 * SANS CETTE EXCEPTION, `parc-dashboard` SE FAISAIT REFUSER pour la mauvaise
 * raison : le défaut lui prêtait le contexte des apps, que sa CI ne rapporte
 * pas (elle rend `build`, `deploy`, `report-build-status`, `Règles du
 * relevé`). Le garde le sauvait donc par accident — et `--force` aurait levé
 * ce sauvetage-là en même temps que le reste.
 *
 * Le calcul vivait en DEUX exemplaires, dont un seul connaissait les miroirs.
 * Une troisième copie aurait fini par diverger.
 */
function contextesPour(repo) {
  if (MIRRORS.has(repo) || AUTO_PUBLIE.has(repo)) return [];
  return CHECKS[repo] ?? CHECKS.default;
}

/**
 * CONTOURNEMENT : le rôle admin, et SEULEMENT à travers une pull request.
 *
 * `bypass_mode: 'pull_request'` et non `'always'`, parce que les deux ne
 * rendent pas la même chose :
 *
 *   `always`       — le porteur du rôle peut aussi POUSSER DIRECTEMENT sur
 *                    `main`. C'est précisément le trou que ce ruleset existe
 *                    pour fermer.
 *   `pull_request` — tout continue de passer par une PR ; le porteur peut en
 *                    revanche fusionner sans attendre qu'un check soit vert ou
 *                    qu'un fil de discussion soit résolu.
 *
 * Le commentaire de la règle `pull_request` ci-dessous dit ce que ce ruleset
 * garantit : « qu'aucun commit n'atterrit sur main sans passer par une PR ».
 * Le mode `pull_request` préserve exactement cette garantie-là, et lève la
 * seule gêne réelle — une PR bloquée par un check en attente ou un fil laissé
 * ouvert par un robot de relecture.
 *
 * `actor_id: 5` est le rôle ADMIN (1 lecture, 2 triage, 3 écriture,
 * 4 maintenance, 5 admin). Les dépôts appartiennent à un compte utilisateur,
 * pas à une organisation : `Team` et `OrganizationAdmin` n'y existent pas.
 *
 * LE MIROIR N'EN REÇOIT PAS. Sa seule règle est `deletion` ; un contournement
 * n'y servirait qu'à supprimer `main`, ce que personne ne veut faire par
 * accident.
 */
const BYPASS = [
  { actor_id: 5, actor_type: 'RepositoryRole', bypass_mode: 'pull_request' },
];

/**
 * Tous les dépôts PUBLICS et non archivés du compte, lus sur GitHub.
 *
 * Aucune liste à tenir : un dépôt créé demain est protégé au prochain passage,
 * sans que personne ait à penser à l'inscrire quelque part. C'est la seule
 * forme qui résiste au temps — les deux précédentes (liste à la main, puis
 * catalogue) ont chacune laissé des dépôts dehors sans le dire.
 *
 * Le fichier `.github` du compte, s'il existe un jour, entrera de lui-même :
 * son entrée avait dû être retirée le 01/09 parce qu'elle produisait un 404
 * avalé par le `try`, donc une croix au milieu d'une sortie verte.
 */
function reposDuCompte() {
  const out = execFileSync(
    'gh',
    [
      'repo',
      'list',
      OWNER,
      '--limit',
      '200',
      '--no-archived',
      '--visibility',
      'public',
      '--json',
      'name',
      '--jq',
      '.[].name',
    ],
    { encoding: 'utf8' }
  );
  return out.split('\n').filter(Boolean).sort();
}

const REPOS = reposDuCompte();

/**
 * Checks exigés, par dépôt. UN CONTEXTE QUI NE S'EXÉCUTE JAMAIS BLOQUE TOUT :
 * la PR reste éternellement « en attente », et personne ne peut la débloquer
 * sans toucher au ruleset. Chaque nom ci-dessous est relevé sur les
 * `check-runs` réels de `main`, pas deviné.
 *
 * LE PRÉFIXE `ci / ` EST INDISPENSABLE, ET IL MANQUAIT. Les seize apps
 * appellent le workflow réutilisable depuis un job nommé `ci` : GitHub
 * enregistre donc `ci / Format · Lint · Type · Test · Build`. Exiger
 * `Format · Lint · Type · Test · Build` tout court, comme ce fichier le
 * faisait, aurait gelé toutes leurs PR — exactement la panne que son propre
 * en-tête décrit. Le socle, lui, définit ses jobs en ligne : ses contextes
 * n'ont pas de préfixe, et c'était déjà juste.
 *
 * `mister-quota` a sa propre CI : une matrice Node, et un job `package
 * desktop` conditionné à `refs/tags/v*` — donc JAMAIS exécuté sur une PR. Il
 * n'a jamais figuré parmi les contextes exigés, et ne figure pas davantage
 * dans le `needs:` du portail qu'il a reçu : un job sauté y compterait comme
 * rouge, et il est sauté sur CHAQUE PR.
 *
 * DEUX DÉPÔTS N'EXIGENT PLUS QU'UN SEUL CONTEXTE, « Toute la CI est verte ».
 * C'est un job d'agrégation, sans matrice ni version dans son nom, qui `needs:`
 * les autres et rougit si l'un d'eux ne l'est pas. Il existe parce qu'un nom
 * matriciel porte un numéro de version DANS une protection de branche : le
 * relever fait disparaître le contexte exigé, et une PR qui attend un contexte
 * disparu ne rougit pas — elle reste en attente, pour toujours.
 */
const CHECKS = {
  // Le second job a été RENOMMÉ le 05/09/2026 : la fixture jetable
  // « Consumer subpath resolution » est remplacée par le squelette, qui est un
  // vrai consommateur. Un contexte exigé qui disparaît gèle toutes les PR du
  // dépôt — d'où l'ordre : fusionner d'abord (par le contournement admin, qui
  // existe pour ce cas), laisser la CI de `main` produire le nouveau contexte,
  // puis relancer ce script.
  //
  // UN SEUL CONTEXTE, ET IL NE PORTE PLUS DE NUMÉRO DE VERSION. Un job
  // matriciel ne rapporte pas son `name:` : il en rapporte un PAR ENTRÉE,
  // suffixé de la valeur de matrice. `validate` a gagné sa matrice le
  // 10/09/2026 (#247) — `In-repo config parse` a cessé d'exister au profit de
  // `(Node 22)` et `(Node 24)`, puis `(Node 26.2.0)` le 12/09 (#251) — et le
  // ruleset a continué d'exiger le nom nu : toutes les PR du dépôt sont
  // restées BLOCKED du 10 au 13/09, franchies au seul contournement admin.
  //
  // Exiger les deux noms matriciels réparait l'instance et gardait la classe :
  // le numéro de Node était DANS le contexte, donc le prochain relèvement
  // refaisait la panne. `ci.yml` porte désormais `tout-vert`, un job sans
  // matrice ni version qui `needs:` les deux autres et rougit si l'un d'eux
  // n'est pas vert. Le contrat tient en un nom stable, et la matrice peut
  // bouger sans que personne touche à une protection de branche.
  //
  // L'ORDRE DE BASCULE N'EST PAS NÉGOCIABLE, pour la même raison que ci-dessus :
  // un `pull_request` exécute le workflow de SA branche, donc une PR partie
  // d'un `main` sans `tout-vert` ne produirait pas ce contexte et gèlerait.
  // Fusionner d'abord, laisser la CI de `main` produire le nom, relancer
  // ensuite. Appliquer avant la fusion gèlerait toutes les PR suivantes — et
  // le garde ne le verrait pas : depuis qu'il lit aussi les PR récentes, il
  // observe `tout-vert` sur la PR qui l'introduit, ce qui ne dit rien de
  // `main`.
  [SELF]: ['Toute la CI est verte'],
  // Ce dépôt portait la même fragilité, et ARMÉE : son ruleset exigeait
  // `typecheck · test · build (20.x)` et `(22.x)`, deux noms matriciels, quand
  // son `.nvmrc` dit 26.2.0 depuis son #22. L'alignement de la matrice sur le
  // `.nvmrc` — qui viendra — aurait fait sauter les deux contextes d'un coup.
  // Il a reçu le même portail (mister-quota#25), au même nom, et n'exige plus
  // que lui.
  //
  // SON `needs:` EXCLUT `package desktop`, délibérément : ce job est
  // conditionné à `refs/tags/v*`, donc toujours SAUTÉ en PR. L'y inclure
  // rendrait le portail rouge sur chaque PR, puisqu'un job sauté y compte comme
  // rouge. C'est la raison pour laquelle ce dépôt figure ici et non dans
  // `CHECKS.default`.
  'mister-quota': ['Toute la CI est verte'],

  // Les quatre dépôts HORS PWA. Chaque nom est relevé sur une PR RÉELLE (ou,
  // à défaut de PR fusionnée, sur le job d'un `ci.yml` déclenché par
  // `pull_request` et sans `if:`), jamais sur les seuls check-runs de `main` :
  // `mister-commitia` y expose aussi « Bundle Windows (MSI/NSIS) », qui vient
  // de `release.yml` sur un tag et ne s'exécuterait JAMAIS en PR. L'exiger
  // gèlerait toutes ses PR — la panne exacte que l'en-tête décrit.
  'mister-commitia': [
    'Tests mc-core (ubuntu-latest)',
    'Tests mc-core (windows-latest)',
    // Apostrophe DROITE (U+0027), comme le nom du job. Écrite en typographique
    // (U+2019), la chaîne ne correspond à aucun check : GitHub attendrait un
    // contexte qui n'arrive jamais, et toutes les PR de ce dépôt gèleraient.
    "Qualité (fmt, clippy, chaîne d'appro)",
  ],
  // Le générateur n'a ni build ni dépendance au socle — c'est sa propriété
  // principale, puisqu'il doit s'installer là où aucun `.npmrc` n'existe.
  'create-lg-pwa-app': [
    'Format et tests',
    'Engendrer une application depuis le squelette',
  ],
  'mister-gphotos': ['build-and-test'],
  'vscode-sops-diff': ['build'],
  'mister-claude-skills': ['validate'],

  // AUCUN check : ce dépôt ne porte que des fichiers communautaires, il n'a
  // pas de CI et n'en aura pas. Le ruleset y garde tout son sens — PR
  // obligatoire, pas de `push --force`, pas de suppression — mais exiger un
  // contexte y gèlerait chaque PR pour toujours.
  '.github': [],

  /**
   * UN JOB EXISTE, MAIS IL N'EST PAS EXIGÉ — c'est un choix, pas un oubli.
   *
   * `mister-guiiug.github.io` sert la racine de l'origine : `robots.txt`,
   * `sitemap.xml` et la page qui lie les applications, engendrés AU MOMENT DE
   * PUBLIER par son workflow `pages.yml` (rien n'est commité). Sur une PR, le
   * job « Construire le site » tourne comme simple vérification.
   *
   * L'EXIGER RENDRAIT UNE PR DE LA PAGE D'ACCUEIL OTAGE DE VINGT AUTRES SITES :
   * ce job lit le catalogue sur le réseau et SONDE chaque application — une
   * seule en panne, et il échoue. C'est voulu au moment de publier (rien n'est
   * déployé, Pages garde la version précédente), pas pour bloquer une
   * relecture. Lui laisser le défaut le faisait en outre REFUSER par le garde,
   * puisqu'il ne rapporte pas le contexte des applications.
   */
  'mister-guiiug.github.io': [],

  default: ['ci / Format · Lint · Type · Test · Build'],
};

/**
 * Les noms de check RÉELLEMENT observés sur la branche par défaut du dépôt.
 *
 * POURQUOI CE GARDE-FOU. Depuis que la liste des dépôts est lue sur le compte,
 * un dépôt neuf reçoit `CHECKS.default` — la convention des PWA — sans que
 * personne l'ait décidé. Sur un dépôt qui n'a pas cette CI, GitHub attendrait
 * un contexte qui n'arrive jamais et TOUTES ses PR gèleraient, sans message
 * lisible. C'est la panne que l'en-tête de ce fichier raconte depuis le
 * début ; l'énumération automatique en a fait un risque permanent, alors elle
 * doit venir avec sa vérification.
 *
 * LES PR RÉCENTES SONT LUES AUSSI, et c'est ce qui rend le garde utilisable.
 * `main` ne porte que les checks déclenchés par `push` ; un check qui ne
 * s'exécute que sur `pull_request` n'y figure pas, le garde refusait donc à
 * tort et la parade était `--force`. Or `--force` ne désarme pas un contexte,
 * il les désarme TOUS : la seule issue laissée à un refus légitime était aussi
 * celle qui laissait passer un nom faux. Observer les deux endroits supprime
 * ce faux refus, donc le réflexe qui le contournait.
 */
function checksSurRef(repo, ref) {
  const noms = new Set();
  for (const [chemin, filtre] of [
    [`commits/${ref}/check-runs?per_page=100`, '.check_runs[].name'],
    // Les `statuses` de l'API v3 : ce ne sont pas des check-runs, mais un
    // ruleset les exige sous le même nom de « contexte ». `miss-contraction`
    // en expose un (`commits`), et lui seul.
    [`commits/${ref}/status`, '.statuses[].context'],
  ]) {
    try {
      const out = execFileSync(
        'gh',
        ['api', `repos/${OWNER}/${repo}/${chemin}`, '--jq', filtre],
        { encoding: 'utf8' }
      );
      for (const n of out.split('\n').filter(Boolean)) noms.add(n);
    } catch {
      // Référence sans check, ou dépôt sans droit de lecture : rien à ajouter.
    }
  }
  return noms;
}

/**
 * Rend TROIS ensembles, et la séparation n'est pas cosmétique : elle est ce qui
 * distingue un check légitimement réservé aux PR d'un job qui n'a pas encore
 * atterri. Voir `jamaisHorsPROuverte`.
 */
function checksObserves(repo) {
  const defaut = checksSurRef(repo, 'HEAD');
  const fermees = new Set();
  const ouvertes = new Set();
  try {
    const out = execFileSync(
      'gh',
      [
        'api',
        `repos/${OWNER}/${repo}/pulls?state=all&sort=updated&direction=desc&per_page=10`,
        // Concaténation plutôt qu'interpolation jq : `"\(…)"` traverserait mal
        // la chaîne JS, qui mangerait l'antislash avant que jq ne le voie.
        '--jq',
        '.[] | .state + " " + .head.sha',
      ],
      { encoding: 'utf8' }
    );
    for (const ligne of out.split('\n').filter(Boolean)) {
      const [etat, sha] = ligne.split(' ');
      // Une PR fusionnée est `closed` : les deux se valent ici, seul compte le
      // fait qu'elle ne soit plus en vol.
      const cible = etat === 'open' ? ouvertes : fermees;
      for (const n of checksSurRef(repo, sha)) cible.add(n);
    }
  } catch {
    // Dépôt sans aucune PR : la branche par défaut seule fait foi.
  }
  const toutes = new Set([...defaut, ...fermees, ...ouvertes]);
  return { defaut, fermees, ouvertes, toutes };
}

function rulesetFor(repo) {
  const contexts = contextesPour(repo);
  const base = {
    name: 'Protect main',
    target: 'branch',
    enforcement: 'active',
    conditions: {
      ref_name: { include: ['~DEFAULT_BRANCH'], exclude: [] },
    },
  };

  // Un miroir n'accueille pas de PR : il reçoit un `push --force` depuis sa
  // source. On garde la seule règle qui ne gêne pas la publication.
  if (MIRRORS.has(repo)) return { ...base, rules: [{ type: 'deletion' }] };

  // Un dépôt qui se publie lui-même pousse sur `main` depuis un workflow, sous
  // une identité sans contournement : la règle `pull_request` l'éteindrait.
  // Les deux autres ne le gênent pas — son push est une avance rapide.
  if (AUTO_PUBLIE.has(repo)) {
    return {
      ...base,
      bypass_actors: BYPASS,
      rules: [{ type: 'deletion' }, { type: 'non_fast_forward' }],
    };
  }

  return {
    ...base,
    bypass_actors: BYPASS,
    rules: [
      { type: 'deletion' },
      { type: 'non_fast_forward' },
      {
        type: 'pull_request',
        parameters: {
          // Zéro approbation exigée : le dépôt n'a qu'un mainteneur, en exiger
          // une le bloquerait complètement. Ce que la règle garantit ici, c'est
          // qu'aucun commit n'atterrit sur `main` sans passer par une PR — donc
          // sans CI, et sans trace de relecture. `require_code_owner_review`
          // deviendra utile le jour où il y aura un second mainteneur.
          required_approving_review_count: 0,
          dismiss_stale_reviews_on_push: true,
          require_code_owner_review: false,
          require_last_push_approval: false,
          required_review_thread_resolution: true,
        },
      },
      ...(contexts.length
        ? [
            {
              type: 'required_status_checks',
              parameters: {
                strict_required_status_checks_policy: false,
                required_status_checks: contexts.map(context => ({ context })),
              },
            },
          ]
        : []),
    ],
  };
}

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');
const AUDIT = args.includes('--audit');
const onlyRepo = args.find(a => !a.startsWith('--'));

/**
 * UN NOM DE DÉPÔT SE CHOISIT DANS LE CATALOGUE, il ne s'invente pas.
 *
 * Deux raisons, et la seconde n'était pas la première trouvée. La visible :
 * une faute de frappe partait en requête et rendait un 404 attrapé par le
 * `try`, donc un `✗` au milieu d'une sortie par ailleurs verte — c'est
 * exactement la panne que l'en-tête raconte (`miss-ticket` pour
 * `miss-ticket-pwa`), et elle laissait croire un ruleset appliqué.
 *
 * La sérieuse : cet argument descendait jusqu'à une commande. Le `gh` du
 * dessous ne construit plus de chaîne — c'est là le vrai correctif — mais un
 * outil qui n'accepte que des valeurs connues ne dépend pas de cette
 * promesse-là.
 */
if (onlyRepo && !REPOS.includes(onlyRepo)) {
  console.error(
    `Dépôt inconnu : « ${onlyRepo} ».
Publics et non archivés sur ${OWNER} : ${REPOS.join(', ')}`
  );
  process.exit(1);
}

const targets = onlyRepo ? [onlyRepo] : REPOS;

/**
 * Appelle `gh` SANS PASSER PAR UN SHELL.
 *
 * `execSync` reçoit une ligne de commande, donc un interpréteur : tout ce qui
 * s'y retrouve — ici le nom de dépôt venu de `process.argv` — peut en sortir.
 * `node scripts/apply-rulesets.mjs 'x/../../y; commande'` exécutait ce qui
 * suivait le point-virgule. CodeQL l'a signalé
 * (`js/indirect-command-line-injection`, alerte 8), et il avait raison même
 * pour un outil qu'un seul mainteneur lance à la main : la ligne de commande
 * ne devrait jamais être le format de transport d'un argument.
 *
 * `execFileSync` prend un exécutable et un TABLEAU d'arguments, passés tels
 * quels au processus. Il n'y a plus de chaîne à découper, donc plus rien à
 * échapper — la classe entière de défaut disparaît, pas seulement ce cas-ci.
 */
function gh(path, method = 'GET', body = null) {
  const argv = ['api', '-X', method];
  if (body) argv.push('-H', 'Content-Type: application/json', '--input', '-');
  argv.push(path);

  if (DRY_RUN && method !== 'GET') {
    console.log(`[dry-run] gh ${argv.join(' ')}`);
    if (body) console.log(`         body: ${JSON.stringify(body, null, 2)}`);
    return null;
  }
  return execFileSync('gh', argv, {
    input: body ? JSON.stringify(body) : undefined,
    encoding: 'utf8',
  });
}

/**
 * AUDIT : confronter les rulesets EN VIGUEUR aux checks réellement rapportés.
 *
 * POURQUOI CE MODE EXISTE. Le garde ci-dessus ne s'exécute qu'au moment où ce
 * script écrit ; il ne protège donc que l'instant de l'écriture. Le 05/09/2026
 * il a laissé passer `In-repo config parse` À JUSTE TITRE — le job s'appelait
 * bien ainsi. Le 10/09, ce job a gagné une matrice dans `ci.yml` et le contexte
 * a changé de nom ; personne n'a relancé ce script, et rien ne le demandait.
 * Le ruleset a continué d'exiger un nom que plus aucun job ne produisait :
 * toutes les PR du dépôt sont restées BLOCKED trois jours, franchies au seul
 * contournement admin, sans un message nulle part.
 *
 * LE DÉFAUT N'ÉTAIT PAS DANS LE GARDE, IL ÉTAIT DANS SA DATE. Un ruleset juste
 * le jour où on le pose pourrit dès que le workflow change, et rien ne relie
 * une modification de `.github/workflows/` à une réexécution d'ici. Ce mode
 * coupe ce lien manquant : il ne lit pas `CHECKS` — la table peut avoir raison
 * pendant que le ruleset a tort — mais bien ce que GitHub applique, et il sort
 * en échec.
 *
 * RIEN NE LE LANCE ENCORE, et il faut le dire plutôt que le laisser croire :
 * en l'état c'est un outil qu'on invoque à la main, donc le même oubli reste
 * possible, simplement diagnosticable en une commande au lieu d'une enquête.
 * L'automatiser demande un arbitrage qui n'appartient pas à ce fichier : le
 * `GITHUB_TOKEN` d'Actions ne porte que le dépôt courant, balayer le parc
 * depuis ici exigerait donc un PAT en secret — un jeton d'administration de
 * vingt-cinq dépôts, pour un audit en lecture seule.
 *
 *   node scripts/apply-rulesets.mjs --audit          # tout le parc
 *   node scripts/apply-rulesets.mjs --audit <repo>   # un dépôt
 */
if (AUDIT) {
  let derives = 0;
  for (const repo of targets) {
    let vus = null; // relevé au plus une fois par dépôt, et seulement si besoin
    try {
      const rulesets = JSON.parse(
        gh(`repos/${OWNER}/${repo}/rulesets`) ?? '[]'
      );
      for (const meta of rulesets) {
        const rs = JSON.parse(gh(`repos/${OWNER}/${repo}/rulesets/${meta.id}`));
        const regle = (rs.rules ?? []).find(
          r => r.type === 'required_status_checks'
        );
        const exiges = (regle?.parameters?.required_status_checks ?? []).map(
          c => c.context
        );
        // Un ruleset sans check exigé ne peut pas geler : `.github` et le
        // miroir sont dans ce cas, délibérément.
        if (!exiges.length) continue;

        vus ??= checksObserves(repo);
        const absents = exiges.filter(c => !vus.toutes.has(c));
        if (!absents.length) {
          console.log(`✓ ${OWNER}/${repo} · ${exiges.length} contexte(s)`);
          continue;
        }
        derives++;
        console.error(
          `✗ ${OWNER}/${repo} — ruleset #${meta.id} « ${rs.name} » exige un contexte que rien ne rapporte :`
        );
        for (const c of absents) {
          console.error(`    · « ${c} »${indiceMatrice(c, vus)}`);
        }
      }
    } catch (e) {
      derives++;
      console.error(`✗ ${OWNER}/${repo} — ${e.message.split('\n')[0]}`);
    }
  }
  console.log(
    derives
      ? `\n❌ ${derives} dérive(s). Ces dépôts ont toutes leurs PR BLOCKED : corriger CHECKS puis relancer sans --audit.`
      : '\n✅ Aucun contexte exigé ne manque à l’appel.'
  );
  process.exit(derives ? 1 : 0);
}

for (const repo of targets) {
  const path = `repos/${OWNER}/${repo}/rulesets`;
  const ruleset = rulesetFor(repo);
  // Le journal dit ce que le ruleset FAIT : annoncer des checks à un miroir
  // qui n'en reçoit aucun, c'est se mentir à soi-même dans une sortie verte.
  const miroir = MIRRORS.has(repo);
  const contexts = contextesPour(repo);
  console.log(`\n→ ${OWNER}/${repo}`);
  console.log(
    miroir
      ? '  · MIROIR : suppression bloquée seulement (le push --force doit passer)'
      : AUTO_PUBLIE.has(repo)
        ? '  · PUBLICATION AUTOMATIQUE : pas de règle `pull_request`, son workflow pousse sur `main`'
        : `  · checks exigés : ${contexts.join(', ') || 'aucun'}`
  );

  if (contexts.length && !FORCE) {
    const vus = checksObserves(repo);
    const absents = contexts.filter(c => !vus.toutes.has(c));
    if (absents.length) {
      console.error(
        `  ✗ REFUSÉ — ces contextes ne sont rapportés par aucun job de ce dépôt :
${absents.map(c => `    · « ${c} »${indiceMatrice(c, vus)}`).join('\n')}
    Les exiger gèlerait toutes ses PR. Corriger CHECKS['${repo}'] (ou [] s'il n'a pas de CI).
    --force passe outre, mais il désarme le garde pour TOUS les contextes de ce dépôt.`
      );
      continue;
    }

    const enVol = jamaisHorsPROuverte(contexts, vus);
    if (enVol.length) {
      console.error(
        `  ✗ REFUSÉ — ces contextes n'existent que dans une PR ENCORE OUVERTE :
${enVol.map(c => `    · « ${c} »`).join('\n')}
    Une PR exécute le workflow de SA branche : ${OWNER}/${repo}@défaut ne porte pas
    encore ce job, donc l'exiger gèlerait toute PR ouverte ensuite. Fusionner
    d'abord, laisser la branche par défaut produire le contexte, puis relancer.`
      );
      continue;
    }
  }

  try {
    const list = JSON.parse(gh(path) ?? '[]');
    const existing = list.find(r => r.name === ruleset.name);
    if (existing) {
      console.log(`  · update ruleset #${existing.id}`);
      gh(`${path}/${existing.id}`, 'PUT', ruleset);
    } else {
      console.log(`  · create new ruleset`);
      gh(path, 'POST', ruleset);
    }
    console.log(`  ✓ done`);
  } catch (e) {
    console.error(`  ✗ ${e.message.split('\n')[0]}`);
  }
}

console.log('\n✅ Terminé.');
