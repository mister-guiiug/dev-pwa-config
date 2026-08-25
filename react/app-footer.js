import { useLabels } from './labels.js';
import { createElement as h } from 'react';
import { Icon } from './icons-context.js';

/**
 * Footer famille : lien code source (GitHub) + lien sponsor (Buy Me a Coffee).
 * Liens externes sécurisés (`target=_blank` + `rel=noopener noreferrer`).
 * Non stylé : cibler `[data-dwc="app-footer"]` en CSS du projet.
 *
 * @param {{ repoUrl?: string, sponsorUrl?: string, sourceLabel?: string,
 *   sponsorLabel?: string, className?: string }} props
 */
export function AppFooter(props) {
  const {
    repoUrl,
    sponsorUrl = 'https://buymeacoffee.com/mister.guiiug',
    sourceLabel,
    sponsorLabel,
    className,
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
      : null
  );
}
