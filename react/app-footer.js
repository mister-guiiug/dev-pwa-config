import { useLabels } from './labels.js';
import { createElement as h } from 'react';
import { Icon } from './icons-context.js';
import { AppVersion } from './app-version.js';

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
 * @param {{ repoUrl?: string, sponsorUrl?: string, sourceLabel?: string,
 *   sponsorLabel?: string, className?: string, children?: import('react').ReactNode,
 *   links?: import('react').ReactNode,
 *   version?: boolean | import('./app-version.js').AppVersionProps }} props
 */
export function AppFooter(props) {
  const {
    repoUrl,
    sponsorUrl = 'https://buymeacoffee.com/mister.guiiug',
    sourceLabel,
    sponsorLabel,
    className,
    children,
    links,
    version,
  } = props;

  const labels = useLabels('footer');

  const ext = { target: '_blank', rel: 'noopener noreferrer' };

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
    version
      ? h(AppVersion, {
          repoUrl,
          ...(typeof version === 'object' ? version : {}),
        })
      : null
  );
}
