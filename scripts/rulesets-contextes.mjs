/**
 * Le raisonnement sur les NOMS DE CONTEXTE, séparé de la CLI qui interroge
 * GitHub.
 *
 * Ces deux fonctions sont pures, et c'est tout l'intérêt : elles portent les
 * deux règles qui, mal comprises, gèlent un dépôt entier — et `apply-rulesets`
 * ne peut pas s'importer dans un test sans appeler `gh` au chargement.
 *
 * Les deux pannes qu'elles décrivent ont réellement eu lieu, à cinq jours
 * d'intervalle, sur ce dépôt puis sur `mister-quota`.
 */

/**
 * UN JOB QUI GAGNE UNE MATRICE PERD SON NOM. GitHub ne rapporte alors plus
 * `Foo` mais un contexte par entrée — `Foo (22)`, `Foo (26.2.0)` — car il n'a
 * que la valeur de matrice pour les distinguer. Le nom nu cesse d'exister SANS
 * QUE RIEN NE LE DISE, et le ruleset qui l'exigeait gèle le dépôt : c'est
 * arrivé le 10/09/2026. Le message le nomme donc, plutôt que de laisser relire
 * un YAML pour comprendre pourquoi un nom pourtant « toujours là » ne
 * correspond à rien.
 */
export function indiceMatrice(contexte, vus) {
  const variantes = [...vus.toutes].filter(n => n.startsWith(`${contexte} (`));
  return variantes.length
    ? `\n      → ce job est devenu MATRICIEL ; exiger plutôt : ${variantes.map(v => `« ${v} »`).join(', ')}`
    : '';
}

/**
 * UN CONTEXTE VU SUR UNE PR N'EST PAS UN CONTEXTE VU SUR `main`, et confondre
 * les deux gèle un dépôt.
 *
 * Un `pull_request` exécute le workflow de SA branche. Un job introduit par une
 * PR ENCORE OUVERTE produit donc déjà son contexte — que le garde observe, et
 * accepte — alors que la branche par défaut ne le porte pas. L'exiger
 * maintenant gèle toute PR ouverte ENSUITE depuis cette branche, qui n'aura pas
 * le job pour le produire.
 *
 * Ce piège est NÉ DU CORRECTIF PRÉCÉDENT : élargir l'observation aux PR
 * récentes a supprimé un faux refus et introduit ce faux accord. Il s'est
 * présenté au passage suivant, en portant `tout-vert` sur `mister-quota`.
 *
 * LE DISCRIMINANT EST L'ÉTAT DE LA PR, pas le fait d'être une PR. Un check qui
 * ne tourne QUE sur `pull_request` (« Revue des dépendances ») a tourné sur les
 * PR déjà FERMÉES : il est donc connu hors d'une PR en vol, et passe. Un job
 * qui n'existe que dans une PR ouverte n'a, lui, jamais tourné ailleurs — c'est
 * le seul cas refusé, et il se lève en fusionnant.
 *
 * Un avertissement ne suffisait pas : la panne d'origine vient précisément d'un
 * garde qu'on contourne par réflexe.
 */
export function jamaisHorsPROuverte(contexts, vus) {
  return contexts.filter(
    c => vus.ouvertes.has(c) && !vus.defaut.has(c) && !vus.fermees.has(c)
  );
}
