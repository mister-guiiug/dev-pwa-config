import { createElement as h } from 'react';
import { FamilyApps } from './family-apps.js';
import { AppFooter } from './app-footer.js';
import { PwaInstallPrompt } from './pwa-install-prompt.js';

/**
 * Le bloc « à propos famille » : installation PWA, grille des sœurs, pied.
 *
 * PROMU, PAS INVENTÉ. L'`AboutScreen` du squelette assemblait déjà
 * `PwaInstallPrompt` + `FamilyApps` (`showSource={false}`) + `AppFooter`.
 * `mister-settle` a le même enchaînement. `showSource={false}` EST LA RÈGLE
 * dès que `AppFooter` suit : sinon « Code source » et le café apparaissent
 * deux fois.
 *
 * `children` porte l'intro métier (carte titre / tagline) AVANT la grille.
 *
 * @param {{
 *   currentAppId: string,
 *   repoUrl?: string,
 *   sponsorUrl?: string|null,
 *   showInstall?: boolean,
 *   showRepoLinks?: boolean,
 *   groupBy?: 'category'|'maturity',
 *   issues?: boolean|object,
 *   className?: string,
 *   children?: import('react').ReactNode,
 * }} props
 */
export function FamilyAbout(props) {
  const {
    currentAppId,
    repoUrl,
    sponsorUrl,
    showInstall = true,
    showRepoLinks = true,
    groupBy = 'category',
    issues = true,
    className,
    children,
  } = props;

  if (!currentAppId) {
    throw new Error('FamilyAbout: `currentAppId` est requis.');
  }

  return h(
    'div',
    { 'data-dwc': 'family-about', className },
    showInstall ? h(PwaInstallPrompt) : null,
    children ?? null,
    h(FamilyApps, {
      currentAppId,
      repoUrl,
      sponsorUrl,
      showSource: false,
      showRepoLinks,
      groupBy,
    }),
    h(AppFooter, { repoUrl, sponsorUrl, issues })
  );
}
