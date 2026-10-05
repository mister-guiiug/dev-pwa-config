/*
 * Comparaison clair / sombre : la palette courante dans les deux schémas,
 * et deux apps côte à côte, écart par rôle compris. Le focus porté par
 * l'URL (`?focus=`) se pose ici aussi.
 */

import {
  etat,
  PAIR_A_KEY,
  PAIR_B_KEY,
  paramOr,
  root,
  syncUrl,
  themes,
  write,
} from './etat.js?v=542f37cc5d';
import { t } from './langue.js?v=d92afbcf3f';
import { ROLES, themeById, themeDisplayName } from './communs.js?v=9f5191d160';
import { scrollBehavior } from './navigation.js?v=bed0b21921';
import { attachCopy } from './presse-papier.js?v=8913ceeeb8';
import { swatchDot } from './controles.js?v=f6572eb5d8';
import { catalogueItems } from './fiches.js?v=7a128b2142';
import {
  paintPalette,
  paletteForTheme,
  readGenericPalettes,
} from './palettes.js?v=1de85c623a';

export function renderCompare() {
  var host = document.getElementById('compare');
  if (!host) return;
  host.textContent = '';

  var theme = etat.currentTheme;
  // Le thème générique n'a pas de palette propre : ses valeurs vivent dans
  // showroom.css. On lit alors les deux schémas depuis la feuille elle-même.
  var palettes = { light: theme.light, dark: theme.dark };
  if (theme.usesCssDefaults) {
    palettes = readGenericPalettes();
  }

  ['light', 'dark'].forEach(function (scheme) {
    var palette = palettes[scheme];
    if (!palette) return;

    var panel = document.createElement('div');
    panel.className = 'sr-compare-panel';
    paintPalette(panel, palette, scheme);

    var title = document.createElement('p');
    title.className = 'sr-compare-title';
    title.textContent =
      scheme === 'light'
        ? t('ui.scheme.light', 'Clair')
        : t('ui.scheme.dark', 'Sombre');
    panel.appendChild(title);

    ROLES.forEach(function (role) {
      var value = palette[role[0]];
      if (!value) return;
      var line = document.createElement('div');
      line.className = 'sr-compare-line';
      line.appendChild(swatchDot(value));
      var name = document.createElement('code');
      name.textContent = role[1].replace('--ds-', '');
      var hex = document.createElement('span');
      hex.className = 'sr-computed';
      hex.textContent = value;
      line.appendChild(name);
      line.appendChild(hex);
      attachCopy(
        line,
        value,
        t('ui.copyTokenIn', 'Copier {value} ({token}, {panel})')
          .replace('{value}', value)
          .replace('{token}', role[1])
          .replace('{panel}', title.textContent)
      );
      panel.appendChild(line);
    });

    host.appendChild(panel);
  });
}

function fillPairSelect(select, selected) {
  if (!select) return;
  var previous = select.value;
  select.textContent = '';
  themes.forEach(function (theme) {
    var option = document.createElement('option');
    option.value = theme.id;
    option.textContent = t('theme.' + theme.id + '.name', theme.name);
    select.appendChild(option);
  });
  var want = selected || previous;
  if (want && themeById(want)) select.value = want;
  else if (themes[1]) select.value = themes[1].id;
  else if (themes[0]) select.value = themes[0].id;
}

export function setupPairCompare() {
  var a = document.getElementById('pair-a');
  var b = document.getElementById('pair-b');
  if (!a || !b) return;
  if (!etat.pairA) etat.pairA = themes[1] ? themes[1].id : 'generic';
  if (!etat.pairB) {
    etat.pairB = themes[2]
      ? themes[2].id
      : themes[0]
        ? themes[0].id
        : 'generic';
  }
  fillPairSelect(a, etat.pairA);
  fillPairSelect(b, etat.pairB);
  etat.pairA = a.value;
  etat.pairB = b.value;
  function onChange() {
    etat.pairA = a.value;
    etat.pairB = b.value;
    write(PAIR_A_KEY, etat.pairA);
    write(PAIR_B_KEY, etat.pairB);
    renderPairCompare();
    syncUrl();
  }
  if (!a.dataset.bound) {
    a.dataset.bound = '1';
    a.addEventListener('change', onChange);
    b.addEventListener('change', onChange);
  }
}

/** Deux apps côte à côte dans le schéma courant (pas clair/sombre). */
export function renderPairCompare() {
  var host = document.getElementById('compare-pair');
  if (!host) return;
  host.textContent = '';
  var scheme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  var generics = null;
  [etat.pairA, etat.pairB].forEach(function (id) {
    var theme = themeById(id);
    if (!theme) return;
    var palette = theme.usesCssDefaults
      ? (generics || (generics = readGenericPalettes()))[scheme]
      : theme[scheme] || theme.dark || theme.light;
    if (!palette) return;
    var panel = document.createElement('div');
    panel.className = 'sr-compare-panel';
    paintPalette(panel, palette, scheme);
    if (theme.radius) {
      panel.style.setProperty('--ds-radius', theme.radius);
      panel.style.setProperty('--dwc-radius', theme.radius);
    }
    var title = document.createElement('p');
    title.className = 'sr-compare-title';
    title.textContent = t('theme.' + theme.id + '.name', theme.name);
    panel.appendChild(title);
    ROLES.forEach(function (role) {
      var value = palette[role[0]];
      if (!value) return;
      var line = document.createElement('div');
      line.className = 'sr-compare-line';
      line.appendChild(swatchDot(value));
      var name = document.createElement('code');
      name.textContent = role[1].replace('--ds-', '');
      var hex = document.createElement('span');
      hex.className = 'sr-computed';
      hex.textContent = value;
      line.appendChild(name);
      line.appendChild(hex);
      attachCopy(
        line,
        value,
        t('ui.copyTokenIn', 'Copier {value} ({token}, {panel})')
          .replace('{value}', value)
          .replace('{token}', role[1])
          .replace('{panel}', title.textContent)
      );
      panel.appendChild(line);
    });
    host.appendChild(panel);
  });
  renderPairDiff();
}

/** Table des seuls rôles qui diffèrent entre App A et App B. */
function renderPairDiff() {
  var table = document.getElementById('compare-diff');
  var sameNote = document.getElementById('compare-diff-same');
  var headA = document.getElementById('compare-diff-a');
  var headB = document.getElementById('compare-diff-b');
  if (!table) return;
  var scheme = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  var themeA = themeById(etat.pairA);
  var themeB = themeById(etat.pairB);
  var palA = paletteForTheme(themeA, scheme);
  var palB = paletteForTheme(themeB, scheme);
  if (headA) headA.textContent = themeDisplayName(themeA);
  if (headB) headB.textContent = themeDisplayName(themeB);
  var tbody = table.querySelector('tbody');
  tbody.textContent = '';
  if (!palA || !palB) {
    if (sameNote) {
      sameNote.hidden = false;
      sameNote.textContent = t(
        'ui.compare.missing',
        'Palette indisponible pour l’une des deux apps.'
      );
    }
    return;
  }
  var diffs = 0;
  var same = 0;
  var extras = [];
  if (themeA.radius !== themeB.radius) {
    extras.push(['radius', themeA.radius || '—', themeB.radius || '—']);
  }
  ROLES.forEach(function (role) {
    var a = palA[role[0]] || '';
    var b = palB[role[0]] || '';
    if (!a && !b) return;
    if (a === b) {
      same += 1;
      return;
    }
    diffs += 1;
    var tr = document.createElement('tr');
    var c0 = document.createElement('td');
    var code = document.createElement('code');
    code.textContent = role[0];
    c0.appendChild(code);
    var c1 = document.createElement('td');
    if (a) {
      c1.appendChild(swatchDot(a));
      c1.appendChild(document.createTextNode(' ' + a));
    } else c1.textContent = '—';
    var c2 = document.createElement('td');
    if (b) {
      c2.appendChild(swatchDot(b));
      c2.appendChild(document.createTextNode(' ' + b));
    } else c2.textContent = '—';
    tr.appendChild(c0);
    tr.appendChild(c1);
    tr.appendChild(c2);
    tbody.appendChild(tr);
  });
  extras.forEach(function (row) {
    diffs += 1;
    var tr = document.createElement('tr');
    row.forEach(function (cell, i) {
      var td = document.createElement('td');
      if (i === 0) {
        var code = document.createElement('code');
        code.textContent = cell;
        td.appendChild(code);
      } else td.textContent = cell;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  if (sameNote) {
    if (!diffs) {
      sameNote.hidden = false;
      sameNote.textContent = t(
        'ui.compare.allSame',
        'Aucun écart sur les rôles sémantiques dans ce schéma.'
      );
    } else {
      sameNote.hidden = false;
      sameNote.textContent = t(
        'ui.compare.hiddenSame',
        '{n} rôles identiques masqués'
      ).replace('{n}', String(same));
    }
  }
}

/**
 * Deep-link `?focus=ShareButton` : scroll + surbrillance temporaire.
 * Accepte un id DOM, un id de composant (`doc-…`) ou une app (`app-…`).
 */
export function applyFocusFromUrl() {
  var focus = paramOr('focus', '');
  if (!focus) return;
  var candidates = [focus, 'doc-' + focus, 'app-' + focus];
  var target = null;
  for (var i = 0; i < candidates.length; i++) {
    target = document.getElementById(candidates[i]);
    if (target) break;
  }
  if (!target) {
    var items = catalogueItems();
    for (var j = 0; j < items.length; j++) {
      if (items[j].id.toLowerCase() === focus.toLowerCase()) {
        target = document.getElementById(items[j].href.slice(1));
        break;
      }
    }
  }
  if (!target) return;
  target.classList.add('sr-focus-flash');
  target.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
  window.setTimeout(function () {
    target.classList.remove('sr-focus-flash');
  }, 1800);
  try {
    var url = new URL(location.href);
    url.searchParams.delete('focus');
    history.replaceState(null, '', url);
  } catch {
    /* file:// */
  }
}
