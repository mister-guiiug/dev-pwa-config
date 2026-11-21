/**
 * LE SUIVI DES ERREURS DE POSTHOG — EN OPTION, APRÈS L'ACCORD, ET NETTOYÉ.
 *
 * Chargé par `analytics.js` à l'accord, et SEULEMENT quand l'app a fourni
 * `errorTrackingLoader` : une app qui ne suit pas ses erreurs ne le porte pas
 * dans son morceau principal (1,8 kB gzip, mesuré le 21/11/2026). C'est aussi
 * pourquoi ce module n'est pas réexporté par `analytics.js` : un import
 * statique, même inutilisé, le rangerait dans le morceau principal.
 *
 * LE CONSTAT (21/11/2026). Le projet PostHog du parc a la capture des
 * exceptions activée côté serveur (`autocapture_exceptions_opt_in`), et n'a
 * reçu AUCUN `$exception` en soixante jours. La raison est dans ce que les
 * applications chargent : `posthog-js/dist/module.slim.js` n'embarque pas les
 * classes du suivi des erreurs — c'est ce qui le fait peser moitié moins que
 * la build complète. Le réglage distant allumait une fonction absente du code.
 *
 * POURQUOI UN SECOND CHARGEUR, ET PAS UN IMPORT ICI. `posthog-js` est une pair
 * OPTIONNELLE : le socle ne peut pas importer en dur un de ses sous-chemins —
 * le build d'une app sans la pair échouerait —, et un spécificateur non
 * analysable ne serait pas émis par Vite. Même motif que `loader` : l'APP
 * écrit l'import, Vite émet le morceau, le socle l'appelle — à l'accord, pas
 * avant :
 *
 *     errorTrackingLoader={() =>
 *       import('posthog-js/dist/extension-bundles.js').then(
 *         m => m.ErrorTrackingExtensions
 *       )}
 *
 * Le chargeur peut aussi rendre le module entier : `ErrorTrackingExtensions`
 * y est lu. Le socle n'en garde que les DEUX classes du suivi des erreurs
 * (`exceptions`, `exceptionObserver`) : un `AllExtensions` passé par mégarde
 * n'allumerait ni l'enregistrement de session ni l'autocapture.
 *
 * `__extensionClasses` EST MARQUÉE `@internal` DANS LES TYPES DE POSTHOG-JS
 * (1.438). C'est par elle que leurs propres points d'entrée choisissent les
 * extensions embarquées ; rien ne garantit qu'elle garde son nom. Si elle le
 * perdait, `init` l'ignorerait sans rien dire et plus aucune erreur ne
 * partirait — le défaut « câblé mais muet » que ce parc traque. D'où la
 * vérification qui suit `init` : si l'instance n'a pas pris `exceptions` et
 * `exceptionObserver`, la console le dit (`test/analytics-erreurs.test.mjs`).
 *
 * RIEN NE PART SANS NETTOYAGE. `prepareSuiviErreurs` rend ensemble les
 * extensions, la capture et le `before_send` (`nettoieException`) : la capture
 * n'est jamais allumée sans lui.
 *
 * RIEN DE PLUS N'EST CAPTÉ que les erreurs non rattrapées et les promesses
 * rejetées sans `catch` (`OPTIONS_SUIVI_ERREURS`). Les `console.error`, non :
 * leur texte est ce que l'app journalise, objets compris — valeurs de
 * formulaire, réponses de serveur. Une erreur levée a un type et une pile ; un
 * journal n'a que du texte.
 */
export const OPTIONS_SUIVI_ERREURS = Object.freeze({
  capture_unhandled_errors: true,
  capture_unhandled_rejections: true,
  capture_console_errors: false,
});

/** Les marqueurs qui remplacent ce que le nettoyage retire. */
const MARQUE = Object.freeze({
  email: '[email]',
  nombre: '[nombre]',
  jeton: '[jeton]',
  uuid: '[uuid]',
  requete: '[requête]',
  fragment: '[fragment]',
  identifiants: '[identifiants]',
  texte: '[texte]',
  donnees: '[données]',
});

/** Au-delà, un message est tronqué : un message long porte des données. */
const MESSAGE_MAX = 500;

/**
 * Au-delà, l'ENTRÉE est coupée avant les motifs. posthog-js capte les
 * `$exception` sans troncature (`_noTruncate`) : un message de deux cent mille
 * caractères arriverait entier ici, et le nettoyage tourne dans le
 * gestionnaire d'erreur, sur le fil principal. Quatre fois la sortie suffit :
 * les marqueurs raccourcissent le texte, ils ne l'allongent pas.
 */
const ENTREE_MAX = 4 * MESSAGE_MAX;

/** Une URL absolue, jusqu'au premier blanc ou guillemet. */
const URL_ABSOLUE = /\b(?:blob:)?(?:https?|wss?|file):\/\/[^\s"'`<>]+/giu;
/** Une URL `data:` — son contenu est la donnée elle-même. */
const URL_DATA = /\bdata:[\w.+-]+\/[\w.+-]+[^\s"'`<>]*/giu;
/** Une requête hors d'une URL absolue (`/rest/v1/table?email=eq.…`). */
const REQUETE_RELATIVE = /\?[\w.%[\]-]+=[^\s#"'`<>]*/gu;
/**
 * BORNÉE, et ce n'est pas du style. Sans bornes, `[…]+@` repartait de chaque
 * caractère d'une longue suite sans `@` jusqu'au bout de la suite : un temps
 * QUADRATIQUE, mesuré à 0,9 s pour cinquante mille caractères et 26 s pour
 * deux cent mille. Les bornes sont celles des adresses réelles : soixante-
 * quatre caractères avant l'`@`, soixante-trois par libellé de domaine.
 */
const EMAIL =
  /[\p{L}\p{N}._%+-]{1,64}@[\p{L}\p{N}-]{1,63}(?:\.[\p{L}\p{N}-]{1,63}){0,8}\.\p{L}{2,63}/gu;
const UUID =
  /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/giu;
const JWT = /\beyJ[\w-]{4,}\.[\w-]{4,}(?:\.[\w-]*)?/gu;
const HEXA = /\b[0-9a-f]{20,}\b/giu;
const CANDIDAT_JETON = /[\w+=-]{20,}/gu;
/** Huit chiffres au moins, séparés ou non : téléphone, carte, date, IP. */
const SUITE_SEPAREE = /\+?\d(?:[ ./-]?\d){7,}/gu;
const SUITE = /\d{4,}/gu;
/**
 * Le texte entre guillemets. L'apostrophe simple n'ouvre qu'en début de mot :
 * dans « l'écran », elle est une élision, pas un guillemet.
 */
const ENTRE_GUILLEMETS = [
  /(")([^"\n]*)(")/gu,
  /(“)([^”\n]*)(”)/gu,
  /(«)([^»\n]*)(»)/gu,
  /(`)([^`\n]*)(`)/gu,
  /((?<![\p{L}\p{N}])')([^'\n]*)('(?![\p{L}\p{N}]))/gu,
];

/**
 * Un candidat est un jeton si l'un de ses morceaux — coupés aux `-` et `_` —
 * mêle lettres et chiffres sur seize caractères au moins. Le découpage épargne
 * les noms de morceaux de Vite (`SettingsScreen-B7AteW3E`) : « Failed to fetch
 * dynamically imported module » est l'erreur la plus courante d'une PWA après
 * un déploiement, et son nom de fichier est ce qui la rend lisible.
 */
function estUnJeton(candidat) {
  return candidat
    .split(/[-_]/u)
    .some(
      morceau =>
        morceau.length >= 16 && /\d/u.test(morceau) && /[a-z]/iu.test(morceau)
    );
}

/**
 * Une URL sans ses identifiants, sa requête ni son fragment — SAUF la route
 * d'un `HashRouter` : `#/depenses` EST l'écran où l'erreur s'est produite. Sa
 * requête à elle disparaît, et ses identifiants passent ensuite par les règles
 * des nombres et des jetons.
 *
 * LA ROUTE S'ARRÊTE AU PREMIER `?`, `#`, `&` OU `=`. Supabase, en flux
 * implicite, AJOUTE son fragment à l'adresse de retour : une app en
 * `HashRouter` reçoit `#/reset#access_token=…&refresh_token=…`. Une route
 * prise jusqu'au `?` gardait ce second fragment entier.
 */
function nettoieUrl(url) {
  const propre = url.replace(
    /^((?:blob:)?[a-z][\w+.-]*:\/\/)[^/?#@]*@/iu,
    `$1${MARQUE.identifiants}@`
  );
  const diese = propre.indexOf('#');
  const avant = diese < 0 ? propre : propre.slice(0, diese);
  const apres = diese < 0 ? '' : propre.slice(diese + 1);
  const point = avant.indexOf('?');
  let out = point < 0 ? avant : `${avant.slice(0, point)}?${MARQUE.requete}`;
  if (apres) {
    const route = /^\/[^?#&=]*/u.exec(apres);
    if (!route) out += `#${MARQUE.fragment}`;
    else {
      out += `#${route[0]}`;
      const reste = apres.slice(route[0].length);
      const second = reste.indexOf('#');
      const requete = second < 0 ? reste : reste.slice(0, second);
      if (requete) out += `?${MARQUE.requete}`;
      if (second >= 0) out += `#${MARQUE.fragment}`;
    }
  }
  return out;
}

/** Une URL absolue, privée de la ponctuation qui la suit dans une phrase. */
function nettoieUrlDansTexte(url) {
  const fin = /[).,;:!?\]]+$/u.exec(url);
  if (!fin) return nettoieUrl(url);
  return nettoieUrl(url.slice(0, fin.index)) + fin[0];
}

/**
 * NETTOIE UN TEXTE LIBRE — un message d'erreur, une URL — avant qu'il parte.
 *
 * LA RÈGLE DE L'ADR 0012, APPLIQUÉE À CE QUI N'EST PAS ÉNUMÉRABLE. Les
 * propriétés de mesure ne portent que des constantes ; un message d'erreur, lui,
 * est écrit par le navigateur ou par l'app, et il cite ce qu'il a sous la main :
 * l'URL de la requête qui a échoué, la valeur qui ne s'est pas analysée
 * (« "jean dupont" is not valid JSON »), l'adresse qu'un serveur a refusée.
 * Ce qui y ressemble à une donnée est remplacé par un marqueur :
 *
 *   - URL : requête → `?[requête]`, fragment → `#[fragment]` (la route d'un
 *     `HashRouter` reste), identifiants → `[identifiants]@`, `data:` →
 *     `data:[données]` ;
 *   - adresse électronique → `[email]` ;
 *   - UUID → `[uuid]` ; JWT, suite hexadécimale ou base64 longue → `[jeton]` ;
 *   - texte entre guillemets qui porte une espace ou dépasse quarante
 *     caractères → `[texte]` — le critère même de `avertitSiValeurLibre` : un
 *     nom de propriété (`'map'`) reste, une saisie non ;
 *   - quatre chiffres ou plus, ou huit séparés (téléphone, carte, date) →
 *     `[nombre]`.
 *
 * L'entrée est d'abord coupée à deux mille caractères (`ENTREE_MAX`), sans le
 * mot que la coupe tranche : un demi-jeton échapperait aux motifs. Puis le
 * résultat est tronqué à cinq cents. Le TYPE d'erreur et les cadres de pile ne
 * passent pas par ici : ils disent où, pas quoi.
 *
 * CE QU'IL NE PEUT PAS FAIRE : reconnaître un nom propre ou une phrase saisie
 * qu'un message citerait SANS guillemets. Il réduit le risque, il ne le supprime
 * pas — d'où le rappel, dans la documentation, que la mention de
 * confidentialité d'une app qui active les erreurs doit le dire.
 *
 * @param {string} texte
 * @returns {string}
 */
export function nettoieTexteLibre(texte) {
  if (typeof texte !== 'string' || texte === '') return texte;
  const entree =
    texte.length > ENTREE_MAX
      ? `${texte.slice(0, ENTREE_MAX).replace(/\S+$/u, '')}…`
      : texte;
  let out = entree
    .replace(URL_DATA, `data:${MARQUE.donnees}`)
    .replace(URL_ABSOLUE, nettoieUrlDansTexte)
    .replace(REQUETE_RELATIVE, `?${MARQUE.requete}`)
    .replace(EMAIL, MARQUE.email)
    .replace(UUID, MARQUE.uuid)
    .replace(JWT, MARQUE.jeton)
    .replace(HEXA, m => (/\d/u.test(m) && /[a-f]/iu.test(m) ? MARQUE.jeton : m))
    .replace(CANDIDAT_JETON, m => (estUnJeton(m) ? MARQUE.jeton : m));
  for (const motif of ENTRE_GUILLEMETS) {
    out = out.replace(motif, (tout, ouvre, dedans, ferme) => {
      const brut = dedans.trim();
      if (!/\s/u.test(brut) && brut.length <= 40) return tout;
      const marge = ouvre === '«' ? ' ' : '';
      return `${ouvre}${marge}${MARQUE.texte}${marge}${ferme}`;
    });
  }
  out = out.replace(SUITE_SEPAREE, MARQUE.nombre).replace(SUITE, MARQUE.nombre);
  return out.length > MESSAGE_MAX ? `${out.slice(0, MESSAGE_MAX)}…` : out;
}

/** Le chemin d'un fichier de pile, sans requête ni fragment. */
function sansRequete(url) {
  const coupe = url.search(/[?#]/u);
  return coupe < 0 ? url : url.slice(0, coupe);
}

function nettoieCadre(cadre) {
  if (!cadre || typeof cadre !== 'object') return cadre;
  const out = { ...cadre };
  for (const cle of ['filename', 'abs_path']) {
    if (typeof out[cle] === 'string') out[cle] = sansRequete(out[cle]);
  }
  return out;
}

function nettoieEntree(entree) {
  if (!entree || typeof entree !== 'object') return entree;
  const out = { ...entree };
  if (typeof out.value === 'string') out.value = nettoieTexteLibre(out.value);
  const cadres = out.stacktrace?.frames;
  if (Array.isArray(cadres)) {
    out.stacktrace = { ...out.stacktrace, frames: cadres.map(nettoieCadre) };
  }
  return out;
}

/**
 * UNE PROPRIÉTÉ QUI PORTE UNE ADRESSE, quel que soit son préfixe.
 *
 * POURQUOI UN MOTIF, ET PAS LA LISTE `$current_url`, `$referrer`. posthog-js
 * joint à CHAQUE événement les propriétés d'entrée de session
 * (`$session_entry_url`, `$session_entry_referrer`, `$session_entry_pathname`)
 * : l'adresse complète au début de la session, fragment compris, jusqu'à mille
 * caractères. Relevé le 21/11/2026 sur posthog-js 1.438.2, 1.445.4 et
 * 1.453.2 : après un retour d'auth Supabase (`?code=…`, ou
 * `#/reset#access_token=…`), `$current_url` partait propre et
 * `$session_entry_url` portait encore les jetons, toute la session durant. Les
 * propriétés de personne (`$initial_current_url`, `$initial_referrer`, dans
 * `$set_once`) ont la même forme. Le motif couvre les trois familles, et celles
 * qu'une version suivante ajouterait sous le même nom.
 */
const CLE_D_ADRESSE = /(?:_url|referrer|pathname)$/u;

/** Une copie de l'objet, ses propriétés d'adresse passées au nettoyage. */
function nettoieAdresses(objet) {
  if (!objet || typeof objet !== 'object' || Array.isArray(objet)) return objet;
  const out = { ...objet };
  for (const [cle, valeur] of Object.entries(out)) {
    if (typeof valeur === 'string' && CLE_D_ADRESSE.test(cle))
      out[cle] = nettoieTexteLibre(valeur);
  }
  return out;
}

/** Les propriétés de personne, là où posthog-js peut les poser. */
const PROPRIETES_DE_PERSONNE = ['$set', '$set_once'];

/**
 * LE `before_send` DES EXCEPTIONS — posé par `prepareSuiviErreurs`.
 *
 * Sur un `$exception`, rend une COPIE dont les messages sont passés par
 * `nettoieTexteLibre` : `$exception_list[].value` (chaque cause chaînée
 * comprise), `$exception_values`, `$exception_message`, ainsi que toute
 * propriété d'adresse (`CLE_D_ADRESSE`) — `$current_url`, `$referrer`,
 * `$pathname`, les `$session_entry_*` et les `$initial_*` —, y compris dans
 * `$set` et `$set_once`. Les cadres de pile gardent fichier, fonction, ligne
 * et colonne ; seule une requête dans leur nom de fichier disparaît. Les
 * `$exception_steps` — un fil d'Ariane en texte libre par construction, que le
 * socle n'active jamais — sont retirés.
 *
 * Tout autre événement est rendu TEL QUEL, même objet.
 *
 * @template T
 * @param {T} evenement
 * @returns {T}
 */
export function nettoieException(evenement) {
  const brut = /** @type {any} */ (evenement);
  if (!brut || brut.event !== '$exception') return evenement;
  const source = brut.properties;
  if (!source || typeof source !== 'object') return evenement;
  const props = nettoieAdresses(source);
  if (Array.isArray(props.$exception_list)) {
    props.$exception_list = props.$exception_list.map(nettoieEntree);
  }
  if (Array.isArray(props.$exception_values)) {
    props.$exception_values = props.$exception_values.map(v =>
      typeof v === 'string' ? nettoieTexteLibre(v) : v
    );
  }
  if (typeof props.$exception_message === 'string')
    props.$exception_message = nettoieTexteLibre(props.$exception_message);
  delete props.$exception_steps;
  const out = { ...brut, properties: props };
  // Dans les propriétés (`properties.$set`) comme à côté (`$set_once`, où
  // posthog-js range les `$initial_*`).
  for (const cible of [props, out]) {
    for (const cle of PROPRIETES_DE_PERSONNE) {
      if (cible[cle] !== undefined) cible[cle] = nettoieAdresses(cible[cle]);
    }
  }
  return /** @type {T} */ (out);
}

/**
 * Les deux classes du suivi des erreurs, lues dans ce que rend le chargeur —
 * `ErrorTrackingExtensions` lui-même, ou le module qui l'exporte —, ou `null`.
 *
 * Un import qui ÉCHOUE (réseau coupé) se tait, comme celui du module : la
 * mesure continue sans les erreurs. Un import qui RÉUSSIT sans rendre les deux
 * classes est une erreur de câblage — un export renommé, un mauvais chemin — et
 * il le dit : sinon rien ne partirait, et personne ne le saurait.
 */
async function importeExtensions(chargeur) {
  let mod;
  try {
    mod = await chargeur();
  } catch {
    return null;
  }
  const source =
    mod?.ErrorTrackingExtensions ??
    mod?.default?.ErrorTrackingExtensions ??
    mod;
  const exceptions = source?.exceptions;
  const exceptionObserver = source?.exceptionObserver;
  if (
    typeof exceptions === 'function' &&
    typeof exceptionObserver === 'function'
  )
    return { exceptions, exceptionObserver };
  console.warn(
    '[dev-pwa-config] `errorTrackingLoader` n’a rendu ni ' +
      '`ErrorTrackingExtensions` ni `{ exceptions, exceptionObserver }` : ' +
      'AUCUNE ERREUR NE PARTIRA. Attendu : `() => ' +
      "import('posthog-js/dist/extension-bundles.js')" +
      '.then(m => m.ErrorTrackingExtensions)`.'
  );
  return null;
}

/**
 * `__extensionClasses` est interne à posthog-js : si elle changeait de nom,
 * `init` l'ignorerait EN SILENCE. L'instance le dit — les extensions prises
 * deviennent ses propriétés `exceptions` et `exceptionObserver`.
 */
export function verifieSuiviErreurs(posthog) {
  if (posthog.exceptions && posthog.exceptionObserver) return;
  console.warn(
    '[dev-pwa-config] `errorTrackingLoader` est fourni, mais posthog-js n’a ' +
      'pas pris les extensions du suivi des erreurs : AUCUNE ERREUR NE ' +
      'PARTIRA. `__extensionClasses`, option interne de posthog-js, a ' +
      'peut-être changé de nom (voir `analytics-erreurs.js`).'
  );
}

/**
 * Ce que `analytics.js` ajoute aux options d'`init` quand l'app suit ses
 * erreurs, ou `null` si les extensions n'ont pas pu être obtenues — auquel cas
 * rien ne change : ni capture, ni `before_send`.
 *
 * Les trois vont ENSEMBLE, et c'est le point : la capture des exceptions n'est
 * jamais allumée sans le nettoyage qui la suit.
 *
 * @param {() => Promise<unknown>} chargeur L'`errorTrackingLoader` de l'app.
 * @returns {Promise<Record<string, unknown> | null>}
 */
export async function prepareSuiviErreurs(chargeur) {
  const extensions = await importeExtensions(chargeur);
  if (!extensions) return null;
  return {
    __extensionClasses: extensions,
    capture_exceptions: { ...OPTIONS_SUIVI_ERREURS },
    before_send: nettoieException,
  };
}
