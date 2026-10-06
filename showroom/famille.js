/*
 * La démo FamilyApps : la grille des apps sœurs, rendue ici avec des
 * pastilles peintes et sans icône distante. La page ne fait aucune requête
 * réseau.
 */

import { t } from './langue.js?v=d92afbcf3f';
import {
  DEMO_APPS,
  maturityLabel,
  SVG_NS,
  themeById,
} from './communs.js?v=0f95ffd5f1';

function svg(width, height, viewBox, children) {
  var el = document.createElementNS(SVG_NS, 'svg');
  el.setAttribute('width', width);
  el.setAttribute('height', height);
  el.setAttribute('viewBox', viewBox);
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('fill', 'none');
  el.setAttribute('stroke', 'currentColor');
  el.setAttribute('stroke-width', '2');
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  children.forEach(function (d) {
    var path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    el.appendChild(path);
  });
  return el;
}

export function renderFamilyApps() {
  var list = document.getElementById('family-app-list');
  if (!list) return;
  // Rejoué à chaque changement de langue : sans remise à zéro, chaque
  // bascule ajoutait trois cartes de plus à la démo.
  list.textContent = '';

  DEMO_APPS.forEach(function (entry) {
    var theme = themeById(entry[0]);
    var maturity = entry[1];

    var link = document.createElement('a');
    link.href = 'https://github.com/mister-guiiug/' + theme.id;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.dataset.dwc = 'family-app';
    // Comme le composant : le nom accessible est le texte de la carte, et
    // l'ouverture dans un nouvel onglet passe en description (WCAG 2.5.3).
    link.title = t('ui.opensInNewTab', 'Ouvre un nouvel onglet');

    // Chemin de repli du composant : initiale du nom quand l'icône distante
    // n'est pas chargée (le showroom reste hors ligne).
    var icon = document.createElement('span');
    icon.setAttribute('aria-hidden', 'true');
    icon.dataset.dwc = 'family-app-icon';
    icon.textContent = theme.name.charAt(0);
    link.appendChild(icon);

    var body = document.createElement('span');
    body.dataset.dwc = 'family-app-body';

    var head = document.createElement('span');
    head.dataset.dwc = 'family-app-head';

    var name = document.createElement('span');
    name.dataset.dwc = 'family-app-name';
    name.textContent = theme.name;
    head.appendChild(name);

    var badge = document.createElement('span');
    badge.dataset.dwc = 'maturity';
    badge.dataset.maturity = maturity;
    badge.textContent = maturityLabel(maturity);
    head.appendChild(badge);

    body.appendChild(head);

    var desc = document.createElement('span');
    desc.dataset.dwc = 'family-app-desc';
    desc.textContent = theme.tagline;
    body.appendChild(desc);

    link.appendChild(body);

    var arrow = document.createElement('span');
    arrow.setAttribute('aria-hidden', 'true');
    arrow.dataset.dwc = 'family-app-arrow';
    arrow.appendChild(
      svg(14, 14, '0 0 24 24', [
        'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6',
        'M15 3h6v6',
        'M10 14 21 3',
      ])
    );
    link.appendChild(arrow);

    var li = document.createElement('li');
    li.appendChild(link);
    list.appendChild(li);
  });
}
