import { createElement as h, Fragment } from 'react';
import { useLabels } from './labels-core.js';
import { isDev } from './dev-mode.js';
import { ConsentSettings } from './consent-banner.js';

/**
 * CE QUE LA MESURE D'AUDIENCE FAIT, DIT AU VISITEUR.
 *
 * LE RELEVÉ QUI L'A FAIT NAÎTRE — 16/09/2026, sur les vingt et une apps du
 * parc. Dix-huit mesurent après consentement. **Aucune ne dit ce qu'elle
 * mesure** : zéro passe `policyHref` au bandeau (les deux occurrences que
 * `git grep` rend sont des COMMENTAIRES expliquant pourquoi la prop est
 * absente). Le bandeau demandait donc un accord sans qu'aucun texte ne dise à
 * quoi. Un consentement éclairé suppose une information ; elle n'existait nulle
 * part.
 *
 * POURQUOI UN PANNEAU ET PAS UNE PAGE. Le routage du parc ne le permet pas :
 * neuf apps en `HashRouter`, sept en `BrowserRouter`, deux en
 * `createBrowserRouter`, et **trois sans aucun routeur** — `miss-dice`,
 * `miss-ticket-pwa`, `mister-puzzle`. Il n'y a pas d'URL à leur donner. Et
 * `mister-doc`, la seule app qui ait déjà une politique, l'a écrite en
 * DIALOGUE, pas en route : « il n'y a pas d'URL à mettre dans un lien », dit
 * son propre commentaire. Un composant se monte partout ; une route non.
 *
 * CE QUI EST ÉCRIT ICI EST MESURÉ, PAS SUPPOSÉ. Vérifié en navigateur sur
 * `miss-uwh` le 16/09/2026 : aucun script Google dans le DOM avant le clic,
 * `gtag/js?id=G-…` après, le cookie `_ga` posé par Google, et le choix rangé
 * sous `dwc_consent:/<app>/`, cloisonné par application depuis la 4.17.1. La
 * conservation de 14 mois a été posée le même jour sur les vingt propriétés
 * GA4 du compte, et relue une par une.
 *
 * DEUX CORRECTIONS DU 19/09/2026, ET LA PREMIÈRE EST UNE ERREUR DE FAIT.
 *
 * Ce panneau décrivait Google Analytics — « par Google Analytics », « un cookie
 * de Google », « Google, qui les traite pour le compte de l'éditeur » — dans
 * les SEPT locales. Il a été écrit le 16/09/2026 ; le parc est passé à PostHog
 * (nuage européen) le 19, et rien n'a suivi ces textes. Aucun visiteur ne l'a
 * lu : relevé du 19/09, ZÉRO des dix-sept applications ne monte ce panneau —
 * le bandeau demande donc un accord sans qu'aucun texte ne dise à quoi, ce
 * pour quoi ce composant avait justement été écrit. Le corriger AVANT de
 * l'adopter évite de publier sur dix-sept sites un destinataire faux.
 *
 * LA CONSERVATION N'A PLUS DE DÉFAUT. `RETENTION_DEFAUT` valait 14 mois, la
 * durée posée sur les propriétés GA4 ; elle ne décrit plus rien. Une durée non
 * fournie s'affiche maintenant comme une mention manquante — annoncer une
 * durée qu'on n'a pas vérifiée est exactement ce que le reste de ce fichier
 * refuse de faire pour le responsable du traitement.
 *
 * LES ERREURS, ET POURQUOI ELLES SONT UNE SECTION À PART. Depuis le 19/09/2026
 * dix-sept applications embarquent un DSN Sentry, et `initSentry` s'exécute au
 * chargement du module — AVANT toute question, donc hors du choix que le
 * bandeau recueille. Ce n'est pas un oubli de câblage : un rapport d'erreur
 * n'est pas une mesure d'audience, et les deux ne se traitent pas ensemble.
 * Mais cela signifie qu'un visiteur qui REFUSE la mesure envoie quand même un
 * rapport technique — message, pile, adresse de page, navigateur, adresse IP —
 * dès qu'une erreur survient. Le taire serait le seul vrai défaut.
 *
 * `errorBasis` est une mention d'EXPLOITANT, comme `controller` : à quel titre
 * ces rapports sont émis relève du responsable du traitement, pas du code.
 *
 * DEUX MENTIONS N'APPARTIENNENT PAS AU SOCLE : le responsable du traitement et
 * l'adresse où exercer ses droits. Elles dépendent de qui exploite l'app, pas
 * de ce que le code fait. Sans elles, le panneau affiche `[À compléter]` À
 * L'ÉCRAN plutôt que de se taire — c'est l'idiome de `exploitant.ts` de
 * `mister-doc`, dont le test refuse ce marqueur : un trou qu'on voit finit par
 * être comblé, un trou silencieux jamais. Les inventer publierait une
 * information juridique fausse, ce qui est pire que de ne rien publier.
 *
 * IL NE DÉCIDE RIEN. Le panneau informe ; le choix se fait au bandeau, et se
 * reprend par `ConsentSettings`, qui le rappelle. Deux surfaces de décision
 * demanderaient de les tenir à l'équilibre l'une de l'autre — même taille,
 * même contraste, même coût au clic — sous peine de refaire par la mise en
 * page ce que le bandeau évite par construction.
 *
 * Non stylé : cibler `[data-dwc="privacy-notice"]`.
 */

/**
 * @deprecated Vestige de GA4 : quatorze mois était la conservation posée sur
 * les vingt propriétés Google du compte. Le parc mesure avec PostHog depuis le
 * 19/09/2026, et ce chiffre ne décrit plus rien. Il n'est plus le DÉFAUT du
 * panneau — une durée non fournie s'affiche désormais comme une mention
 * manquante, au lieu d'annoncer au visiteur une durée qui n'est pas la sienne.
 */
export const RETENTION_DEFAUT = 14;

/**
 * LES SEPT FORMES DU MARQUEUR, en un seul motif.
 *
 * Le marqueur est traduit — un visiteur néerlandophone ne doit pas lire
 * « [À compléter] ». Mais un test qui veut vérifier « aucune mention ne manque »
 * devrait alors charger les sept dictionnaires. Ce motif lui évite ça, et un
 * test du socle vérifie qu'il couvre bien les sept : ajouter une locale sans
 * l'ajouter ici rend la suite rouge.
 */
export const MARQUEUR_MOTIF =
  /^\[(À compléter|To complete|Zu ergänzen|Por completar|Da completare|Aan te vullen|A preencher)\]$/;

let prevenu = false;

/**
 * @param {{ controller?: import('react').ReactNode,
 *   contact?: string, retentionMonths?: number,
 *   sentryDsn?: string, errorBasis?: import('react').ReactNode,
 *   posthogKey?: string, posthogHost?: string, loader?: () => Promise<unknown>,
 *   scope?: string,
 *   className?: string, settingsClassName?: string,
 *   title?: import('react').ReactNode }} props
 */
export function PrivacyNotice(props = {}) {
  const {
    controller,
    contact,
    retentionMonths,
    sentryDsn,
    errorBasis,
    posthogKey,
    posthogHost,
    loader,
    gtmContainerId,
    scope,
    className,
    settingsClassName,
    title,
  } = props;

  const labels = useLabels('privacy');

  // Un avertissement UNE FOIS, pas à chaque rendu : ce composant vit dans un
  // pied de page, il se rend à chaque navigation.
  if (isDev && !prevenu && (!controller || !contact)) {
    prevenu = true;
    console.warn(
      '[dwc] PrivacyNotice : `controller` et/ou `contact` manquent. Le panneau ' +
        'affiche « ' +
        labels.missing +
        ' » à leur place — ce sont des mentions que seul ' +
        "l'exploitant peut fournir, et les inventer publierait une information " +
        'juridique fausse.'
    );
  }

  const absent = labels.missing;
  const lignes = [
    [labels.what, labels.whatText],
    [labels.basis, labels.basisText],
    [labels.recipient, labels.recipientText],
    [
      labels.retention,
      Number.isFinite(retentionMonths)
        ? labels.retentionText.replaceAll('{months}', String(retentionMonths))
        : absent,
    ],
    [labels.stored, labels.storedText],
    // LA SECTION « ERREURS » NE S'AFFICHE QUE S'IL Y A UN DSN — même règle que
    // le bandeau, qui ne pose pas la question sans identifiant de mesure :
    // annoncer un envoi qui n'a pas lieu est une information fausse, au même
    // titre que taire celui qui a lieu.
    ...(sentryDsn
      ? [
          [labels.errors, labels.errorsText],
          [labels.errorsBasis, errorBasis || absent],
        ]
      : []),
    [labels.controller, controller || absent],
    [
      labels.rights,
      labels.rightsText.replaceAll('{contact}', contact || absent),
    ],
  ];

  return h(
    'section',
    {
      // `region` nommée : atteignable à la tabulation et annoncée, sans piéger
      // le focus — le panneau n'interrompt rien.
      role: 'region',
      'aria-label': typeof title === 'string' ? title : labels.title,
      'data-dwc': 'privacy-notice',
      className,
    },
    h('h2', { 'data-dwc': 'privacy-notice-title' }, title ?? labels.title),
    h(
      'dl',
      { 'data-dwc': 'privacy-notice-list' },
      ...lignes.map(([terme, texte], i) =>
        h(
          Fragment,
          { key: i },
          h('dt', { 'data-dwc': 'privacy-notice-term' }, terme),
          h('dd', { 'data-dwc': 'privacy-notice-detail' }, texte)
        )
      )
    ),
    // La sortie, au même endroit que l'information : elle ne rend rien tant
    // qu'aucun choix n'a été fait, le bandeau étant alors à l'écran.
    h(ConsentSettings, {
      posthogKey,
      posthogHost,
      loader,
      gtmContainerId,
      scope,
      className: settingsClassName,
    })
  );
}

export default PrivacyNotice;
