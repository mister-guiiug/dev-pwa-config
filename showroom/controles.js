/*
 * Contrôles d'accessibilité, mesurés sur la page : la taille des cibles
 * tactiles, et le contraste WCAG de chaque paire de couleurs, avec la
 * correction proposée. Les couleurs sont lues telles que le navigateur les
 * calcule, fond effectif compris.
 */

import { t } from './langue.js?v=d92afbcf3f';
import { scrollBehavior } from './navigation.js?v=bed0b21921';
import { attachCopy } from './presse-papier.js?v=8913ceeeb8';
import { BADGE_TONES, BUTTON_VARIANTS } from './primitives.js?v=65b65fa9c3';

// `getComputedStyle` ne résout PAS les custom properties : la valeur revient
// telle qu'écrite (`#6d28d9`), jamais en `rgb()`. On gère donc l'hex d'abord
// — sinon `#0f172a` se laisserait lire comme trois nombres bidon.
//
// Retourne `{ rgb: [r, g, b], a }`, l'alpha étant indispensable : les fonds
// teintés du design system sont des `color-mix(… , transparent)`.
function parseColor(value) {
  var raw = String(value).trim();

  var short = raw.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (short) {
    return {
      rgb: [1, 2, 3].map(function (i) {
        return parseInt(short[i] + short[i], 16);
      }),
      a: 1,
    };
  }

  var long = raw.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (long) {
    return {
      rgb: [1, 2, 3].map(function (i) {
        return parseInt(long[i], 16);
      }),
      a: 1,
    };
  }

  var fn = raw.match(/^rgba?\(([^)]+)\)$/i);
  if (fn) {
    var parts = fn[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    if (parts.length >= 3 && parts.slice(0, 3).every(Number.isFinite)) {
      return {
        rgb: parts.slice(0, 3),
        a: parts.length > 3 && Number.isFinite(parts[3]) ? parts[3] : 1,
      };
    }
  }

  // `color-mix()` revient en `color(srgb r g b / a)`, canaux 0→1.
  var srgb = raw.match(/^color\(srgb\s+([^)]+)\)$/i);
  if (srgb) {
    var chans = srgb[1]
      .split(/[\s/]+/)
      .filter(Boolean)
      .map(Number);
    if (chans.length >= 3 && chans.slice(0, 3).every(Number.isFinite)) {
      return {
        rgb: chans.slice(0, 3).map(function (v) {
          return Math.round(v * 255);
        }),
        a: chans.length > 3 && Number.isFinite(chans[3]) ? chans[3] : 1,
      };
    }
  }

  return null;
}

function parseRgb(value) {
  var color = parseColor(value);
  return color ? color.rgb : null;
}

/**
 * Couleur de fond RÉELLEMENT perçue derrière un élément.
 *
 * Ne pas se contenter du premier fond non transparent : les fonds teintés du
 * design system (`color-mix(…, transparent)`) sont SEMI-transparents. Les
 * comparer tels quels revient à mesurer une couleur contre elle-même — le
 * ratio sort à 1,00:1 et le contrôle ne détecte plus rien. On empile donc
 * les couches jusqu'à la première opaque, puis on les compose.
 */
function effectiveBackground(el) {
  var layers = [];
  for (var node = el; node; node = node.parentElement) {
    var color = parseColor(getComputedStyle(node).backgroundColor);
    if (!color || color.a === 0) continue;
    layers.push(color);
    if (color.a >= 1) break;
  }

  var base = layers.pop() ?? { rgb: [255, 255, 255], a: 1 };
  var out = base.rgb;
  while (layers.length) {
    var top = layers.pop();
    out = out.map(function (under, i) {
      return Math.round(top.rgb[i] * top.a + under * (1 - top.a));
    });
  }
  return 'rgb(' + out.join(', ') + ')';
}

function luminance(rgb) {
  var c = rgb.map(function (v) {
    var s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

export function contrastRatio(a, b) {
  var ra = parseRgb(a);
  var rb = parseRgb(b);
  if (!ra || !rb) return null;
  var la = luminance(ra);
  var lb = luminance(rb);
  var hi = Math.max(la, lb);
  var lo = Math.min(la, lb);
  return (hi + 0.05) / (lo + 0.05);
}

var TARGET_MIN = 44;

// Ce qu'on mesure : les commandes réellement tapables, groupées par type.
var TARGET_GROUPS = [
  [
    'Button — toutes tailles',
    '#button-matrix [data-dwc="button"]',
    'ui.a11y.group.buttons',
  ],
  ['Champs de saisie', '[data-dwc="field-control"]', 'ui.a11y.group.fields'],
  [
    'Fermeture de feuille',
    '[data-dwc="sheet-close"]',
    'ui.a11y.group.sheetClose',
  ],
  [
    'Actions de bannière',
    '[data-dwc="error-banner-retry"]',
    'ui.a11y.group.bannerActions',
  ],
  ['Cartes famille', '[data-dwc="family-app"]', 'ui.a11y.group.familyCards'],
  [
    'Liens de pied de page',
    '[data-dwc="footer-source"]',
    'ui.a11y.group.footerLinks',
  ],
];

export function row(cells) {
  var tr = document.createElement('tr');
  cells.forEach(function (cell, i) {
    var el = document.createElement(i === 0 ? 'th' : 'td');
    if (i === 0) el.scope = 'row';
    if (cell && typeof cell === 'object') {
      el.textContent = cell.text;
      if (cell.className) el.className = cell.className;
      if (cell.color) el.style.color = cell.color;
    } else {
      el.textContent = cell;
    }
    tr.appendChild(el);
  });
  return tr;
}

export function headRow(labels) {
  var thead = document.createElement('thead');
  var tr = document.createElement('tr');
  labels.forEach(function (label) {
    var th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    tr.appendChild(th);
  });
  thead.appendChild(tr);
  return thead;
}

export function measureTargets() {
  var table = document.getElementById('a11y-target');
  if (!table) return;
  table.textContent = '';
  table.appendChild(
    headRow([
      t('ui.a11y.control', 'Commande'),
      t('ui.a11y.measured', 'Mesurées'),
      t('ui.a11y.minHeight', 'Hauteur min.'),
      t('ui.a11y.verdict', 'Verdict'),
    ])
  );
  var tbody = document.createElement('tbody');

  TARGET_GROUPS.forEach(function (group) {
    var nodes = [...document.querySelectorAll(group[1])].filter(function (n) {
      // Un élément masqué mesure 0 : il fausserait le minimum.
      return n.getClientRects().length > 0;
    });
    if (!nodes.length) return;
    var min = Math.min(
      ...nodes.map(function (n) {
        return n.getBoundingClientRect().height;
      })
    );
    var ok = min >= TARGET_MIN - 0.5;
    tbody.appendChild(
      row([
        t(group[2], group[0]),
        String(nodes.length),
        { text: min.toFixed(1) + ' px', className: 'sr-computed' },
        {
          text: ok
            ? t('ui.a11y.pass', '✓ ≥ 44 px')
            : t('ui.a11y.fail', '✗ sous le seuil'),
          color: ok ? 'var(--sr-ink-success)' : 'var(--sr-ink-danger)',
        },
      ])
    );
  });

  table.appendChild(tbody);
}

function toHex(rgb) {
  return (
    '#' +
    rgb
      .map(function (v) {
        return Math.max(0, Math.min(255, Math.round(v)))
          .toString(16)
          .padStart(2, '0');
      })
      .join('')
  );
}

/**
 * Couleur la plus PROCHE de l'originale qui tienne le seuil, obtenue par
 * recherche dichotomique sur un mélange vers le noir ou vers le blanc.
 *
 * Conserver la teinte compte : proposer « mets du noir » ferait passer le
 * test en détruisant l'identité de l'app.
 */
function nudge(from, against, threshold) {
  var source = parseColor(from);
  var other = parseColor(against);
  if (!source || !other) return null;

  // On s'éloigne de la couleur d'en face : elle est claire → on fonce.
  var target = luminance(other.rgb) > 0.35 ? [0, 0, 0] : [255, 255, 255];
  var mix = function (amount) {
    return source.rgb.map(function (channel, i) {
      return channel * (1 - amount) + target[i] * amount;
    });
  };

  // Même poussé à fond, le mélange ne suffit pas : inutile de proposer.
  if (contrastRatio(toHex(mix(1)), against) < threshold) return null;

  var low = 0;
  var high = 1;
  for (var i = 0; i < 20; i += 1) {
    var mid = (low + high) / 2;
    if (contrastRatio(toHex(mix(mid)), against) >= threshold) high = mid;
    else low = mid;
  }
  return toHex(mix(high));
}

/**
 * Que corriger, et vers quoi.
 *
 * Le texte d'abord : c'est le moins invasif. Mais du blanc sur une couleur
 * de marque — le cas le plus fréquent — ne se rattrape PAS en touchant au
 * texte : il est déjà à l'extrême. Il faut alors foncer le fond, et le dire.
 */
function suggestFix(fg, bg, threshold) {
  var text = nudge(fg, bg, threshold);
  if (text) return { role: 'text', color: text };
  var back = nudge(bg, fg, threshold);
  if (back) return { role: 'background', color: back };
  return null;
}

export function swatchDot(color) {
  var dot = document.createElement('span');
  dot.className = 'sr-inline-swatch';
  dot.style.background = color;
  dot.setAttribute('aria-hidden', 'true');
  return dot;
}

function contrastRow(label, fg, bg, threshold, element) {
  var ratio = contrastRatio(fg, bg);
  if (!ratio) return null;
  var ok = ratio >= threshold;

  var tr = row([
    label,
    { text: ratio.toFixed(2) + ':1', className: 'sr-computed' },
    threshold.toFixed(1) + ':1',
    {
      text: ok
        ? t('ui.a11y.ok', '✓ conforme')
        : t('ui.a11y.ko', '✗ insuffisant'),
      color: ok ? 'var(--sr-ink-success)' : 'var(--sr-ink-danger)',
    },
  ]);

  // Les deux couleurs en cause, à côté du libellé : un ratio seul ne dit pas
  // QUOI corriger.
  var head = tr.firstChild;
  head.prepend(swatchDot(bg));
  head.prepend(swatchDot(fg));

  if (!ok) {
    var fix = suggestFix(fg, bg, threshold);
    var cell = tr.lastChild;
    if (fix) {
      var hint = document.createElement('span');
      hint.className = 'sr-fix';
      hint.textContent =
        (fix.role === 'text'
          ? t('ui.a11y.suggestText', 'texte')
          : t('ui.a11y.suggestBg', 'fond')) +
        ' → ' +
        fix.color;
      cell.appendChild(hint);
      attachCopy(
        cell,
        fix.color,
        t(
          'ui.a11y.copyFixFor',
          'Copier la couleur proposée pour {label}'
        ).replace('{label}', label)
      );
    }
    // Cliquer la ligne va voir l'élément mesuré et le met en évidence :
    // un constat qu'on ne peut pas localiser ne se corrige pas.
    if (element) {
      // Un vrai bouton dans la ligne, et non la ligne entière en
      // `role="button"` : une ligne de tableau qui se dit bouton perd sa
      // sémantique de tableau, et elle contenait déjà un bouton de copie
      // (axe : nested-interactive).
      tr.classList.add('sr-row-locatable');
      var locate = function () {
        element.scrollIntoView({
          block: 'center',
          behavior: scrollBehavior(),
        });
        element.dataset.srHighlight = '';
        setTimeout(function () {
          delete element.dataset.srHighlight;
        }, 2200);
      };
      var bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'sr-locate';
      bouton.textContent = t('ui.a11y.locate', 'Localiser');
      bouton.setAttribute(
        'aria-label',
        t('ui.a11y.locateFor', 'Localiser sur la page : {label}').replace(
          '{label}',
          label
        )
      );
      bouton.addEventListener('click', locate);
      if (tr.firstElementChild) tr.firstElementChild.appendChild(bouton);
    }
  }

  return tr;
}

export function measureContrast() {
  var table = document.getElementById('a11y-contrast');
  if (!table) return;
  table.textContent = '';
  table.appendChild(
    headRow([
      t('ui.a11y.pair', 'Paire'),
      t('ui.a11y.ratio', 'Ratio'),
      t('ui.a11y.threshold', 'Seuil AA'),
      t('ui.a11y.verdict', 'Verdict'),
    ])
  );
  var tbody = document.createElement('tbody');

  function push(label, el, threshold) {
    if (!el) return;
    var styles = getComputedStyle(el);
    var line = contrastRow(
      label,
      styles.color,
      effectiveBackground(el),
      threshold,
      el
    );
    if (line) tbody.appendChild(line);
  }

  BUTTON_VARIANTS.forEach(function (variant) {
    push(
      'Button ' + variant[0],
      document.querySelector(
        '#button-matrix [data-variant="' +
          variant[0] +
          '"][data-size="md"]:not([disabled])'
      ),
      4.5
    );
  });

  BADGE_TONES.forEach(function (tone) {
    push(
      'Badge ' + tone[0],
      document.querySelector(
        '#badge-matrix [data-tone="' + tone[0] + '"][data-variant="soft"]'
      ),
      4.5
    );
  });

  push(
    t('ui.a11y.mutedOnSurface', 'Texte atténué sur surface'),
    document.querySelector('.sr-note'),
    4.5
  );

  table.appendChild(tbody);
}
