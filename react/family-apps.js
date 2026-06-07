import { createElement as h, useState } from 'react';
import { GithubIcon, CoffeeIcon, ExternalLinkIcon } from './icons.js';
import { FAMILY_APPS, SPONSOR_URL, otherApps } from '../apps-catalog.js';

// Liens externes sécurisés.
const EXT = { target: '_blank', rel: 'noopener noreferrer' };

const DEFAULT_MATURITY_LABELS = {
  alpha: 'Alpha',
  beta: 'Bêta',
  stable: 'Stable',
};

// Carte d'une application : icône (ou initiale en repli si l'icône échoue),
// nom + badge de maturité, description, flèche « lien externe ». Le lien entier
// est cliquable.
function AppCard({ item, maturityLabels }) {
  const [iconFailed, setIconFailed] = useState(false);

  const icon =
    item.iconUrl && !iconFailed
      ? h('img', {
          src: item.iconUrl,
          alt: '',
          width: 40,
          height: 40,
          loading: 'lazy',
          onError: () => setIconFailed(true),
          'data-dwc': 'family-app-icon',
        })
      : h(
          'span',
          { 'aria-hidden': 'true', 'data-dwc': 'family-app-icon' },
          item.name.charAt(0)
        );

  return h(
    'a',
    {
      href: item.appUrl,
      ...EXT,
      'data-dwc': 'family-app',
      'aria-label': `${item.name} (${maturityLabels[item.maturity]}) — nouvel onglet`,
    },
    icon,
    h(
      'span',
      { 'data-dwc': 'family-app-body' },
      h(
        'span',
        { 'data-dwc': 'family-app-head' },
        h('span', { 'data-dwc': 'family-app-name' }, item.name),
        h(
          'span',
          { 'data-dwc': 'maturity', 'data-maturity': item.maturity },
          maturityLabels[item.maturity]
        )
      ),
      h('span', { 'data-dwc': 'family-app-desc' }, item.description)
    ),
    h(
      'span',
      { 'aria-hidden': 'true', 'data-dwc': 'family-app-arrow' },
      h(ExternalLinkIcon)
    )
  );
}

/**
 * Met en avant, depuis une app de la famille : son code source (GitHub), le
 * sponsor (Buy Me a Coffee) et les AUTRES applications de la famille avec leur
 * badge de maturité. Non stylé : cibler les sélecteurs `[data-dwc="…"]`
 * (`family-apps`, `family-links`, `family-source`, `family-sponsor`,
 * `family-app-list`, `family-app`, `maturity[data-maturity]`) en CSS du projet.
 *
 * @param {{
 *   currentAppId: string,
 *   apps?: import('../apps-catalog').FamilyApp[],
 *   repoUrl?: string,
 *   sponsorUrl?: string,
 *   showSource?: boolean,
 *   showSponsor?: boolean,
 *   labels?: {
 *     source?: string, sponsor?: string, otherApps?: string,
 *     maturity?: Partial<Record<'alpha'|'beta'|'stable', string>>
 *   },
 *   className?: string,
 * }} props
 */
export function FamilyApps(props) {
  const {
    currentAppId,
    apps = FAMILY_APPS,
    repoUrl,
    sponsorUrl = SPONSOR_URL,
    showSource = !!repoUrl,
    showSponsor = true,
    labels = {},
    className,
  } = props;

  const maturityLabels = {
    ...DEFAULT_MATURITY_LABELS,
    ...(labels.maturity || {}),
  };
  const sourceLabel = labels.source ?? 'Code source';
  const sponsorLabel = labels.sponsor ?? 'M’offrir un café';
  const otherAppsLabel = labels.otherApps ?? 'Nos autres applications';

  // Réutilise le helper si on travaille sur le catalogue par défaut, sinon
  // filtre la liste fournie.
  const list =
    apps === FAMILY_APPS
      ? otherApps(currentAppId)
      : apps.filter(a => a.id !== currentAppId);

  const links = [];
  if (showSource && repoUrl) {
    links.push(
      h(
        'a',
        { key: 'source', href: repoUrl, ...EXT, 'data-dwc': 'family-source' },
        h(GithubIcon),
        h('span', null, sourceLabel)
      )
    );
  }
  if (showSponsor && sponsorUrl) {
    links.push(
      h(
        'a',
        {
          key: 'sponsor',
          href: sponsorUrl,
          ...EXT,
          'data-dwc': 'family-sponsor',
        },
        h(CoffeeIcon),
        h('span', null, sponsorLabel)
      )
    );
  }

  return h(
    'section',
    { className, 'data-dwc': 'family-apps', 'aria-label': otherAppsLabel },
    links.length ? h('div', { 'data-dwc': 'family-links' }, links) : null,
    h('h3', { 'data-dwc': 'family-apps-title' }, otherAppsLabel),
    h(
      'ul',
      { 'data-dwc': 'family-app-list' },
      list.map(item =>
        h('li', { key: item.id }, h(AppCard, { item, maturityLabels }))
      )
    )
  );
}
