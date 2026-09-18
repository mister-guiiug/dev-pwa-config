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

/** Ce que Google conserve des données détaillées, en mois. */
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
 *   posthogKey?: string, posthogHost?: string, loader?: () => Promise<unknown>,
 *   scope?: string,
 *   className?: string, settingsClassName?: string,
 *   title?: import('react').ReactNode }} props
 */
export function PrivacyNotice(props = {}) {
  const {
    controller,
    contact,
    retentionMonths = RETENTION_DEFAUT,
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
      labels.retentionText.replaceAll('{months}', String(retentionMonths)),
    ],
    [labels.stored, labels.storedText],
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
