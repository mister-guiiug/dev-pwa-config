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
 * @param {{ repoUrl?: string, sponsorUrl?: string, sourceLabel?: string,
 *   sponsorLabel?: string, className?: string,
 *   version?: boolean | import('./app-version.js').AppVersionProps }} props
 */
export function AppFooter(props) {
  const {
    repoUrl,
    sponsorUrl = 'https://buymeacoffee.com/mister.guiiug',
    sourceLabel,
    sponsorLabel,
    className,
    version,
  } = props;

  const labels = useLabels('footer');

  const ext = { target: '_blank', rel: 'noopener noreferrer' };

  return h(
    'footer',
    { className, 'data-dwc': 'app-footer' },
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
