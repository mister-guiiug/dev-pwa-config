import { createElement as h } from 'react';

/**
 * Chiffre-clé : libellé, valeur, variation optionnelle.
 *
 * Deux pièges d'accessibilité que les tableaux de bord de la famille
 * reproduisaient chacun de leur côté, et que ce composant ferme :
 *  - la valeur seule ne dit rien hors contexte → `<dl>`/`<dt>`/`<dd>` relie
 *    formellement le libellé à la valeur ;
 *  - la variation était signalée par la seule couleur (vert/rouge) →
 *    on préfixe une flèche ET on expose un libellé textuel.
 *
 * Non stylé : cibler `[data-dwc="stat"]` et `[data-trend]`.
 *
 * @param {{ label: string, value: import('react').ReactNode,
 *   delta?: import('react').ReactNode, trend?: 'up'|'down'|'flat',
 *   trendLabel?: string, icon?: import('react').ReactNode,
 *   className?: string }} props
 */
export function Stat(props = {}) {
  const { label, value, delta, trend, trendLabel, icon, className } = props;

  const arrow = { up: '↑', down: '↓', flat: '→' }[trend] ?? null;

  return h(
    'dl',
    { className, 'data-dwc': 'stat' },
    h(
      'div',
      { 'data-dwc': 'stat-head' },
      h('dt', { 'data-dwc': 'stat-label' }, label),
      icon
        ? h('span', { 'data-dwc': 'stat-icon', 'aria-hidden': 'true' }, icon)
        : null
    ),
    h('dd', { 'data-dwc': 'stat-value' }, value),
    delta !== undefined && delta !== null
      ? h(
          'dd',
          { 'data-dwc': 'stat-delta', 'data-trend': trend ?? 'flat' },
          arrow ? h('span', { 'aria-hidden': 'true' }, `${arrow} `) : null,
          delta,
          // Texte masqué : la tendance ne repose pas que sur la couleur.
          trendLabel
            ? h('span', { 'data-dwc': 'stat-trend-label' }, ` ${trendLabel}`)
            : null
        )
      : null
  );
}
