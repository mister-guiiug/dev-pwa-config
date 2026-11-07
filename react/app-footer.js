import { DEFAULT_LABELS, useLabels } from './labels-core.js';
import { createElement as h } from 'react';
import { Icon } from './icons-context.js';
import { AppVersion } from './app-version.js';
import { useSponsorUrl } from './sponsor.js';
import {
  FEATURE_TEMPLATE,
  currentIssueReportMailto,
  currentIssueReportUrl,
  emailAddress,
  featureRequestUrl,
} from '../issue-report.js';

/**
 * L'ENVIRONNEMENT VITE, lu comme `PrivacyNotice` le lit (voir
 * `privacy-notice.js`) : Vite remplace `import.meta.env` jusque dans les
 * dépendances, en build comme en développement ; hors de Vite (Node, Vitest),
 * il n'y a rien et l'on rend `{}`. C'est pour ces tests-là que la prop `env`
 * existe.
 */
function envVite() {
  return (typeof import.meta !== 'undefined' && import.meta.env) || {};
}

/** `https://github.com/o/miss-dice/` → `miss-dice` : le nom de l'app au courrier. */
function nomDuDepot(repoUrl) {
  const segments = String(repoUrl ?? '')
    .split(/[?#]/)[0]
    .split('/')
    .filter(Boolean);
  return segments.at(-1) ?? '';
}

/**
 * Footer famille : lien code source (GitHub) + lien sponsor (Buy Me a Coffee).
 * Liens externes sécurisés (`target=_blank` + `rel=noopener noreferrer`).
 * Non stylé : cibler `[data-dwc="app-footer"]` en CSS du projet.
 *
 * `version` OPT-IN. C'est ici que le numéro se met — sous les deux liens, là où
 * l'utilisateur le cherche pour un rapport de bug. Absent, le pied de page rend
 * exactement ce qu'il rendait avant : aucune app existante ne change d'aspect.
 * Le `repoUrl` déjà donné sert alors aussi de lien vers la release.
 *
 * `children` ET `links` : DEUX EMPLACEMENTS DEMANDÉS PAR UNE APP QUI A REFUSÉ
 * DE MIGRER, et qui a écrit pourquoi dans son propre fichier. L'en-tête de
 * `miss-contraction/src/react/components/layout/AppFooter.tsx` dresse le
 * tableau : sur ses quatre éléments, ce composant n'en couvrait qu'un.
 *
 *   `children` — L'AVERTISSEMENT MÉDICAL. « Cet outil ne remplace pas un avis
 *   médical » n'a aucun emplacement ici, et sur une app qu'on ouvre pendant un
 *   accouchement, la phrase n'est pas décorative. Le remplacer par ce pied de
 *   page l'aurait SORTIE du repère de pied de page — or `<footer>` ne peut pas
 *   descendre d'un `<footer>`, donc l'imbriquer était interdit aussi. C'était
 *   un blocage complet, pas une préférence.
 *
 *   `links` — UNE DESTINATION INTERNE. Son lien « À propos et version » est un
 *   `Link` de routeur vers `/a-propos`. `repoUrl` rend un `<a target=_blank>`
 *   vers GitHub : on QUITTE l'app. Ce composant ne peut pas fabriquer un lien
 *   de routeur — il ne dépend d'aucun routeur, et c'est voulu — mais il peut
 *   laisser l'app en poser un.
 *
 * Les deux sont RENDUS AVANT les liens du socle : c'est la position qu'aucune
 * autre prop n'atteint. Additives, donc les six apps qui importent déjà ce
 * pied de page ne changent pas d'un pixel.
 *
 * `after` — LE TROISIÈME EMPLACEMENT, ET IL A FALLU UNE MIGRATION POUR LE
 * VOIR. La 3.31.0 ajoutait `children` et `links` en pensant couvrir le pied de
 * page de miss-contraction ; la migration a buté sur son quatrième élément.
 *
 * Son numéro n'est pas `version` mais `deploymentVersion`, de la forme
 * `1.2.3+1756…`, et `AppVersion` passe par `formatVersion`, qui **supprime le
 * `+buildId`**. Or c'est lui, et lui seul, qui permet de vérifier qu'un
 * déploiement a pris : sans lui, deux bundles différents affichent la même
 * chaîne. `version` n'était donc pas un remplacement, et aucune combinaison de
 * `children` et `links` ne place un paragraphe EN DERNIER — l'ordre visuel par
 * `order` CSS aurait menti à l'ordre de lecture.
 *
 * La leçon vaut d'être écrite : deux emplacements conçus depuis un tableau de
 * besoins en couvraient trois sur quatre. C'est en migrant qu'on l'a su.
 *
 * `issues` OUVRE AUSSI DEUX VOIES DE PLUS (07/11/2026). Le lien « Signaler un
 * problème » mène à `issues/new`, qui exige un compte GitHub : sur tout le
 * compte, aucune issue n'avait jamais été écrite par un utilisateur des apps,
 * dont les publics — médecins, trésoriers, parents — n'en ont pas. D'où :
 *
 *   « Signaler par e-mail » — le même contexte (app, version, écran,
 *   navigateur) dans un `mailto:`, adressé au contact que le dépôt déclare
 *   pour le panneau de confidentialité. Lu comme `PrivacyNotice` le lit : la
 *   prop `contact` l'emporte, puis `VITE_PRIVACY_CONTACT` ; `null` le retire.
 *   Sans adresse e-mail valide, le lien n'est pas rendu.
 *
 *   « Proposer une idée » — le gabarit `feature.yml` du dépôt `.github` du
 *   compte. `issues: { idea: false }` le retire ; il ne double jamais un
 *   signalement déjà pointé sur ce gabarit.
 *
 * Le lien GitHub garde son libellé et sa place : les e2e du parc le cherchent
 * par son nom exact.
 *
 * @param {{ repoUrl?: string, sponsorUrl?: string|null, sourceLabel?: string,
 *   sponsorLabel?: string, className?: string, children?: import('react').ReactNode,
 *   links?: import('react').ReactNode, after?: import('react').ReactNode,
 *   version?: boolean | import('./app-version.js').AppVersionProps,
 *   issues?: boolean | { template?: string, label?: string, idea?: boolean },
 *   contact?: string | null, env?: Record<string, unknown> }} props
 */
export function AppFooter(props) {
  const {
    repoUrl,
    // Plus de défaut ici : c'était une COPIE de `SPONSOR_URL`, et elle ne
    // suivait pas le catalogue. Le hook répond — prop, puis contexte, puis
    // famille — et `null` reste « pas de lien », comme avant.
    sponsorUrl: sponsorUrlProp,
    sourceLabel,
    sponsorLabel,
    className,
    children,
    links,
    after,
    version,
    issues,
    env = envVite(),
  } = props;

  const sponsorUrl = useSponsorUrl(sponsorUrlProp);
  // Sur le français : un dictionnaire d'app écrit avant le 07/11/2026 n'a pas
  // les quatre clés du courrier et de l'idée, et un lien sans libellé n'a pas
  // de nom accessible.
  const labels = { ...DEFAULT_LABELS.footer, ...useLabels('footer') };

  const ext = { target: '_blank', rel: 'noopener noreferrer' };
  const issuesObjet = typeof issues === 'object' && issues ? issues : {};

  // Le signalement : `issues/new` du dépôt, gabarit `bug.yml` du compte,
  // champs préremplis avec ce que la page sait (version, commit, écran,
  // navigateur). L'URL est posée au rendu pour un `<a>` honnête, puis
  // RECALCULÉE AU CLIC : la route change sans que le pied de page se rende.
  const issueOptions =
    issues && repoUrl
      ? {
          repoUrl,
          ...(issuesObjet.template ? { template: issuesObjet.template } : {}),
        }
      : null;
  const issuesLabel = issuesObjet.label || labels.issues;

  // Le courrier : `contact` (prop) puis `VITE_PRIVACY_CONTACT`, comme
  // `PrivacyNotice` ; `null` le retire. Seulement s'il y a un signalement : une
  // app sans `issues` n'a pas demandé de canal de retour.
  const contact =
    props.contact === null
      ? ''
      : emailAddress(props.contact ?? env.VITE_PRIVACY_CONTACT);
  const mailOptions =
    issueOptions && contact
      ? {
          to: contact,
          app: nomDuDepot(repoUrl),
          subject: labels.mailSubject.replaceAll('{app}', nomDuDepot(repoUrl)),
          intro: labels.mailIntro,
        }
      : null;
  // L'idée : le gabarit `feature.yml`, sauf si le signalement y pointe déjà.
  const ideaUrl =
    issueOptions &&
    issuesObjet.idea !== false &&
    issueOptions.template !== FEATURE_TEMPLATE
      ? featureRequestUrl({ repoUrl })
      : '';

  return h(
    'footer',
    { className, 'data-dwc': 'app-footer' },
    // Avant les liens : c'est là que va un avertissement, et c'est la seule
    // position qu'aucune autre prop n'atteint.
    children ?? null,
    links ?? null,
    repoUrl
      ? h(
          'a',
          { href: repoUrl, ...ext, 'data-dwc': 'footer-source' },
          h(Icon, { role: 'repo' }),
          h('span', null, sourceLabel ?? labels.source)
        )
      : null,
    sponsorUrl
      ? h(
          'a',
          { href: sponsorUrl, ...ext, 'data-dwc': 'footer-sponsor' },
          h(Icon, { role: 'sponsor' }),
          h('span', null, sponsorLabel ?? labels.sponsor)
        )
      : null,
    issueOptions
      ? h(
          'a',
          {
            href: currentIssueReportUrl(issueOptions),
            ...ext,
            'data-dwc': 'footer-issues',
            onClick: event => {
              event.currentTarget.href = currentIssueReportUrl(issueOptions);
            },
          },
          h(Icon, { role: 'issue' }),
          h('span', null, issuesLabel)
        )
      : null,
    // Juste après le lien GitHub : la même démarche, par un autre chemin. Pas
    // de `target` — un `mailto:` n'ouvre pas d'onglet, il ouvre la messagerie.
    // Recalculé au clic, comme le lien GitHub : la route a pu changer.
    mailOptions
      ? h(
          'a',
          {
            href: currentIssueReportMailto(mailOptions),
            'data-dwc': 'footer-mail',
            onClick: event => {
              event.currentTarget.href = currentIssueReportMailto(mailOptions);
            },
          },
          h(Icon, { role: 'mail' }),
          h('span', null, labels.issuesMail)
        )
      : null,
    ideaUrl
      ? h(
          'a',
          { href: ideaUrl, ...ext, 'data-dwc': 'footer-idea' },
          h(Icon, { role: 'idea' }),
          h('span', null, labels.idea)
        )
      : null,
    version
      ? h(AppVersion, {
          repoUrl,
          ...(typeof version === 'object' ? version : {}),
        })
      : null,
    // En dernier : ce que l'app veut sous les liens, et que `version` ne sait
    // pas rendre — un numéro de déploiement, une mention légale, une date.
    after ?? null
  );
}
