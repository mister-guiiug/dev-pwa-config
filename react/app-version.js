import { createElement as h } from 'react';
import { formatVersion } from '../version.js';
import { formatDate } from '../format.js';
import { useAppVersion } from './version.js';
import { useLabels } from './labels.js';

/**
 * Retire les `/` de fin, SANS expression régulière.
 *
 * `replace(/\/+$/, '')` faisait le même travail, et CodeQL l'a signalé à juste
 * titre : sur une chaîne de mille barres obliques suivies d'autre chose, le
 * moteur repart en arrière une fois par position. `repoUrl` est une prop, donc
 * une entrée de bibliothèque — l'appelant décide de ce qu'il y met. Un balayage
 * arrière est linéaire, et se lit aussi bien.
 */
function trimTrailingSlashes(value) {
  const url = String(value);
  let end = url.length;
  while (end > 0 && url[end - 1] === '/') end -= 1;
  return url.slice(0, end);
}

/**
 * Le numéro de version, affiché — et ce qu'il devient quand il bouge.
 *
 * OÙ ÇA MANQUAIT. `AppFooter` porte le lien source et le lien sponsor ; c'est
 * l'endroit où seize apps mettraient leur numéro, et aucune ne pouvait le
 * faire : rien ne l'apportait jusqu'au navigateur (voir `../version.js`).
 * Ce composant est le pendant visible de `versionPlugin`.
 *
 * TROIS ÉTATS, PAS UN. Le numéro qui tourne ; « mis à jour vers X » au premier
 * démarrage après une bascule réussie — la confirmation qu'aucun des cinq
 * modules de mise à jour ne savait donner ; et « version Y disponible » quand
 * un sondage a vu passer un déploiement. Les deux derniers ne s'affichent que
 * sous `VersionProvider`, qui seul les calcule.
 *
 * PAS DE COULEUR SEULE. Chaque état porte son TEXTE. L'annonce de disponibilité
 * est une région `status` : elle apparaît après coup, donc sans elle, un
 * lecteur d'écran ne la verrait jamais passer.
 *
 * RIEN À AFFICHER, RIEN D'AFFICHÉ. Sans version injectée, le composant rend
 * `null` plutôt qu'un « v » solitaire ou un « undefined ».
 *
 * Non stylé : cibler `[data-dwc="app-version"]`.
 *
 * @param {{ prefix?: string, label?: boolean|string, details?: boolean,
 *   updates?: boolean, repoUrl?: string, releaseUrl?: string,
 *   locale?: string, className?: string }} props
 */
export function AppVersion(props = {}) {
  const {
    prefix = '',
    label = true,
    details = false,
    updates = true,
    repoUrl,
    releaseUrl,
    locale,
    className,
  } = props;

  const state = useAppVersion();
  const labels = useLabels('version');

  const text = formatVersion(state.version, { prefix });
  if (!text) return null;

  const tagged = formatVersion(state.version, { prefix: 'v' });
  const href = releaseUrl
    ? releaseUrl.replaceAll('{version}', tagged)
    : repoUrl
      ? `${trimTrailingSlashes(repoUrl)}/releases/tag/${tagged}`
      : undefined;

  const value = href
    ? h(
        'a',
        {
          href,
          target: '_blank',
          rel: 'noopener noreferrer',
          'data-dwc': 'app-version-value',
          title: labels.release,
        },
        text
      )
    : h('span', { 'data-dwc': 'app-version-value' }, text);

  const built = state.buildTime
    ? labels.built.replaceAll('{date}', formatDate(state.buildTime, locale))
    : '';

  return h(
    'p',
    { className, 'data-dwc': 'app-version' },
    label
      ? h(
          'span',
          { 'data-dwc': 'app-version-label' },
          `${typeof label === 'string' ? label : labels.label} `
        )
      : null,
    value,
    details && (built || state.shortCommit)
      ? h(
          'span',
          { 'data-dwc': 'app-version-details', title: built || undefined },
          [built, state.shortCommit].filter(Boolean).join(' · ')
        )
      : null,
    updates && state.justUpdated
      ? h(
          'span',
          { 'data-dwc': 'app-version-updated' },
          labels.updated.replaceAll(
            '{version}',
            formatVersion(state.version, { prefix })
          )
        )
      : null,
    updates && state.updateAvailable
      ? h(
          'span',
          { 'data-dwc': 'app-version-available', role: 'status' },
          labels.available.replaceAll(
            '{version}',
            formatVersion(state.latest, { prefix })
          )
        )
      : null
  );
}
