import { createElement as h } from 'react';
import { bars, describeSeries, project, toPolyline } from '../sparkline.js';

/**
 * Trois graphiques minuscules — courbe, barres, jauge.
 *
 * Non stylés : cibler `[data-dwc="sparkline"]`, `[data-dwc="bars"]`,
 * `[data-dwc="gauge"]`. Les couleurs viennent de `currentColor` et des tokens
 * du thème, pas d'une palette codée en dur : un graphique qui ne suit pas le
 * thème sombre est un rectangle blanc au milieu de la nuit.
 *
 * TOUS PORTENT LEUR ALTERNATIVE TEXTUELLE, calculée par `describeSeries`. Le
 * SVG est `aria-hidden` et la description vit dans un élément voisin : c'est
 * la seule façon d'être lu pareil par tous les lecteurs d'écran, `<title>`
 * dans un SVG restant inégalement supporté.
 */

/** @param {object} props */
export function Sparkline(props) {
  const {
    values,
    width = 120,
    height = 32,
    label = 'évolution',
    unit,
    format,
    baseline,
    showLast = true,
    className,
    ...rest
  } = props;

  const chart = project(values, { width, height, baseline, ...rest });
  const description = describeSeries(values, { label, unit, format, ...rest });

  return h(
    'span',
    { className, 'data-dwc': 'sparkline' },
    h(
      'svg',
      {
        width,
        height,
        viewBox: `0 0 ${width} ${height}`,
        'aria-hidden': 'true',
        focusable: 'false',
        preserveAspectRatio: 'none',
      },
      // Une série trouée donne PLUSIEURS traits : une ligne qui traverse le
      // trou raconterait une mesure qui n'existe pas.
      chart.segments.map((segment, index) =>
        segment.length === 1
          ? h('circle', {
              key: index,
              cx: segment[0].x,
              cy: segment[0].y,
              r: 1.5,
              fill: 'currentColor',
            })
          : h('polyline', {
              key: index,
              points: toPolyline(segment),
              fill: 'none',
              stroke: 'currentColor',
              'stroke-width': 1.5,
              'stroke-linecap': 'round',
              'stroke-linejoin': 'round',
            })
      ),
      showLast && chart.last
        ? h('circle', {
            cx: chart.last.x,
            cy: chart.last.y,
            r: 2,
            fill: 'currentColor',
            'data-dwc': 'sparkline-last',
          })
        : null
    ),
    h(
      'span',
      { 'data-dwc': 'sparkline-text', className: 'sr-only' },
      description
    )
  );
}

/** @param {object} props */
export function BarChart(props) {
  const {
    values,
    label = 'répartition',
    unit,
    format,
    className,
    ...rest
  } = props;
  const computed = bars(values, rest);
  const description = describeSeries(values, { label, unit, format, ...rest });

  return h(
    'span',
    { className, 'data-dwc': 'bars' },
    computed.map(bar =>
      h('span', {
        key: bar.index,
        'data-dwc': 'bars-bar',
        'data-missing': bar.missing ? 'true' : undefined,
        // La hauteur en pourcentage : la mise en page décide de l'espace, le
        // composant décide de la proportion.
        style: { height: `${(bar.ratio * 100).toFixed(2)}%` },
      })
    ),
    h('span', { 'data-dwc': 'bars-text', className: 'sr-only' }, description)
  );
}

/**
 * Une jauge : où en est `value` entre `min` et `max`.
 *
 * `role="meter"` et non `progressbar` : une jauge dit un NIVEAU (quota
 * consommé, batterie), pas l'avancement d'une tâche. Les lecteurs d'écran
 * annoncent les deux différemment, et c'est celui-là que veulent
 * mister-quota et miss-uwh.
 */
export function Gauge(props) {
  const {
    value,
    min = 0,
    max = 100,
    label = 'niveau',
    format = v => String(v),
    unit = '',
    className,
  } = props;

  const span = max - min || 1;
  const ratio = Math.max(0, Math.min(1, (value - min) / span));
  const text = `${format(value)}${unit ? ` ${unit}` : ''}`;

  return h(
    'span',
    {
      className,
      'data-dwc': 'gauge',
      role: 'meter',
      'aria-valuenow': value,
      'aria-valuemin': min,
      'aria-valuemax': max,
      'aria-valuetext': text,
      'aria-label': label,
    },
    h('span', {
      'data-dwc': 'gauge-fill',
      style: { width: `${(ratio * 100).toFixed(2)}%` },
    })
  );
}
