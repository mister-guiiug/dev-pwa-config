import { createElement as h, useId } from 'react';
import { useLabels } from './labels-core.js';
import { useConsentChoice } from './consent-banner.js';

/**
 * LA MESURE D'AUDIENCE, DANS L'ÉCRAN DE RÉGLAGES — son état, et le retrait.
 *
 * LE RELEVÉ QUI L'A FAIT NAÎTRE — 29/09/2026, audit de la page « À propos » du
 * hub. Dix-huit applications mesurent avec PostHog après consentement, et
 * AUCUNE ne permet de revenir sur son choix : `ConsentSettings` et
 * `PrivacyNotice` existaient depuis la 4.17, et n'étaient montés nulle part.
 * Il ne restait que l'expiration à treize mois ou l'effacement des données du
 * site. L'article 7.3 du RGPD demande que retirer son consentement soit aussi
 * simple que le donner : c'était impossible.
 *
 * POURQUOI UN COMPOSANT DE PLUS, ET PAS `ConsentSettings` TEL QUEL. Celui-ci
 * est un lien de pied de page : il ne rend RIEN tant qu'aucun choix n'est fait,
 * et s'efface au clic. Posé dans un écran de réglages, sous un titre, il
 * laissait un titre orphelin, puis un trou — et le bandeau qu'il rappelait
 * revenait souvent hors de la vue, en fin de flux. Cette section porte son
 * titre, dit ce qui est mesuré, dit l'état dans les trois cas, et reste en
 * place.
 *
 * LA RÈGLE : L'ACCORD NE SE DONNE QU'AU BANDEAU ; LE RETRAIT SE FAIT ICI, EN
 * UN CLIC.
 *
 *  - Accepté : « Retirer mon consentement » refuse SUR PLACE — la collecte
 *    s'arrête, le refus est mémorisé et daté, et la question n'est PAS reposée.
 *    Un clic pour accepter au bandeau, un clic pour retirer ici : c'est la
 *    symétrie que demande l'article 7.3.
 *  - Refusé : « Modifier mon choix » rouvre la question AU BANDEAU, qui vient
 *    à l'écran et prend le focus. On ne pose pas ici un second bouton
 *    « Accepter » : ce serait une seconde surface de décision à tenir à
 *    l'équilibre du bandeau — même taille, même contraste, même coût au clic
 *    — ce que `ConsentSettings` refuse déjà pour la même raison. La CNIL
 *    elle-même propose de « réafficher l'interface de recueil ».
 *  - Pas encore répondu : aucun bouton. Le bandeau est à l'écran en train de
 *    poser la question.
 *
 * UN SEUL BOUTON, DONT LE LIBELLÉ CHANGE. Après « Retirer », React garde le même
 * nœud et ne change que son texte : le focus reste où l'utilisateur l'a mis,
 * et l'état, en `role="status"`, annonce le changement au lecteur d'écran. Deux
 * boutons distincts auraient laissé tomber le focus sur `<body>`.
 *
 * SANS IDENTIFIANT DE MESURE, RIEN — titre compris. Il n'y a rien à mesurer,
 * donc rien à régler : même règle que le bandeau.
 *
 * `posthogKey` ET `loader` SONT À PASSER, LES MÊMES QU'AU BANDEAU. Le hook
 * initialise la mesure si personne ne l'a fait, et l'ordre des effets entre
 * deux branches de l'arbre n'est pas une garantie : sans `loader`, un visiteur
 * arrivé directement sur les réglages ferait charger un spécificateur que le
 * navigateur ne sait pas résoudre, et plus rien ne partirait.
 *
 * Non stylé, sinon la cible tactile du bouton : cibler
 * `[data-dwc="consent-section"]`.
 *
 * @param {{ posthogKey?: string, posthogHost?: string,
 *   loader?: () => Promise<unknown>, appName?: string, scope?: string,
 *   maxAgeDays?: number, purposeVersion?: number, className?: string,
 *   headingLevel?: 2|3|4|5|6, title?: import('react').ReactNode,
 *   description?: import('react').ReactNode }} props
 */
export function ConsentSection(props = {}) {
  const {
    posthogKey,
    posthogHost,
    loader,
    appName,
    scope,
    maxAgeDays,
    purposeVersion,
    className,
    headingLevel,
    title,
    description,
  } = props;

  const labels = useLabels('consent');
  const titreId = useId();
  const { choice, configured, refuse, reset } = useConsentChoice({
    posthogKey,
    posthogHost,
    loader,
    appName,
    scope,
    maxAgeDays,
    purposeVersion,
  });

  if (!configured) return null;

  // Le niveau suit l'écran qui l'accueille : une section de réglages sous un
  // `<h1>` n'est pas au même rang qu'un bloc dans une carte déjà titrée.
  const niveau = [2, 3, 4, 5, 6].includes(Number(headingLevel))
    ? Number(headingLevel)
    : 2;

  const etat =
    choice === 'granted'
      ? labels.sectionGranted
      : choice === 'denied'
        ? labels.sectionDenied
        : labels.sectionPending;

  return h(
    'section',
    {
      'aria-labelledby': titreId,
      'data-dwc': 'consent-section',
      'data-choice': choice ?? undefined,
      className,
    },
    h(
      `h${niveau}`,
      { id: titreId, 'data-dwc': 'consent-section-title' },
      title ?? labels.title
    ),
    h(
      'p',
      { 'data-dwc': 'consent-section-text' },
      description ?? labels.sectionText
    ),
    // `status` : le changement d'état est annoncé, l'état initial ne l'est
    // pas — il se lit avec le reste de l'écran.
    h('p', { role: 'status', 'data-dwc': 'consent-section-state' }, etat),
    choice === null
      ? null
      : h(
          'button',
          {
            type: 'button',
            'data-dwc': 'consent-section-action',
            'data-action': choice === 'granted' ? 'withdraw' : 'manage',
            onClick: choice === 'granted' ? refuse : reset,
          },
          choice === 'granted' ? labels.withdraw : labels.manage
        )
  );
}

export default ConsentSection;
