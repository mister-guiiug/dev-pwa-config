/*
 * Contraste forcé.
 *
 * `components.css` repose entièrement sur des variables et des
 * `color-mix()`. En contraste forcé, le navigateur écrase tout ça — un
 * rendu que personne ne regarde jamais.
 *
 * La page en montre deux choses : l'état RÉEL du navigateur qui lit (seule
 * mesure non simulée), et une émulation côte à côte du avant / après.
 */

import { t } from './langue.js?v=d92afbcf3f';
import { dwc, schemeIcon } from './communs.js?v=9f5191d160';
import { headRow, row } from './controles.js?v=f6572eb5d8';

/**
 * Régressions constatées, et la règle qui les rattrape. L'ordre suit celui du
 * bloc `@media (forced-colors: active)` de `components.css`.
 *
 * Construit dans une FONCTION, et pas dans une constante : les clés restent
 * littérales — donc vérifiables par le test de parité des traductions — et
 * le tableau se réécrit au changement de langue.
 */
function fcRows() {
  return [
    [
      t('fc.row.button', 'Bouton primaire, pastille douce'),
      t(
        'fc.cause.transparent',
        '`transparent` n’est pas remplacé : l’aplat disparaît, le contour reste invisible.'
      ),
      'border-color: currentColor',
    ],
    [
      t('fc.row.sheet', 'Panneau modal'),
      t(
        'fc.cause.shadow',
        '`box-shadow` est supprimée et le voile devient opaque : les deux se confondent.'
      ),
      'outline: 1px solid CanvasText',
    ],
    [
      t('fc.row.skeleton', 'Squelette de chargement'),
      t(
        'fc.cause.fill',
        'Il n’existait que par sa couleur de fond, ramenée à `Canvas`.'
      ),
      'outline: 1px solid GrayText',
    ],
    [
      t('fc.row.sync', 'Pastille de synchro'),
      t(
        'fc.cause.dot',
        'Même cause. Les tons ne se distinguent plus — sans perte : l’état est écrit à côté.'
      ),
      'background: CanvasText',
    ],
    [
      t('fc.row.hover', 'Survol'),
      t(
        'fc.cause.filter',
        '`filter` n’est pas forcé : `brightness()` délave la palette choisie par l’utilisateur.'
      ),
      'background: Highlight',
    ],
    [
      t('fc.row.disabled', 'Bouton désactivé'),
      t(
        'fc.cause.opacity',
        '`opacity` n’est pas forcé non plus : le bouton reste lisible, donc trompeur.'
      ),
      'color: GrayText',
    ],
    [
      t('fc.row.nav', 'Onglet courant de la barre basse'),
      t(
        'fc.cause.tint',
        'Primaire et texte doux sont ramenés à la MÊME encre système : distinguer l’onglet actif par la couleur ne marche plus.'
      ),
      'border-block-start-color: Highlight',
    ],
  ];
}

/** Le même balisage dans les deux panneaux : l'écart doit venir du CSS. */
function fcDemo(host) {
  host.textContent = '';

  var primary = dwc('button', 'button', {
    type: 'button',
    'data-variant': 'primary',
    'data-size': 'sm',
  });
  primary.textContent = t('ui.pg.save', 'Enregistrer');

  var off = dwc('button', 'button', {
    type: 'button',
    'data-variant': 'primary',
    'data-size': 'sm',
  });
  off.textContent = t('ui.button.inactive', 'Inactif');
  off.disabled = true;

  var badge = dwc('span', 'badge', {
    'data-tone': 'success',
    'data-variant': 'soft',
  });
  badge.textContent = t('ui.pg.badge', 'À jour');

  var sync = dwc('span', 'sync-status', { 'data-status': 'synced' });
  sync.appendChild(document.createTextNode(t('ui.fc.synced', 'Synchronisé')));

  var skeleton = dwc('span', 'skeleton', { 'data-radius': 'md' });
  skeleton.style.height = '0.9rem';
  skeleton.style.width = '100%';

  var panel = dwc('div', 'sheet-panel', {});
  var title = dwc('p', 'sheet-title', {});
  title.textContent = t('ui.fc.panel', 'Panneau modal');
  panel.appendChild(title);

  var toast = dwc('div', 'toast', { 'data-tone': 'success' });
  var toastMsg = dwc('span', 'toast-message', {});
  toastMsg.textContent = t('ui.fc.toast', 'Enregistré');
  toast.appendChild(toastMsg);

  // La barre basse est la démonstration la plus nette du chapitre : son
  // onglet courant ne se distingue QUE par la couleur dans quatre apps sur
  // sept, et le forçage ramène les deux teintes à la même encre.
  // Deux panneaux (sans et avec correctifs) portent chacun cette barre :
  // deux repères de même nom ne se distinguent pas à la lecture d'écran.
  var corrige = host.closest('[data-fix]')?.getAttribute('data-fix') === 'on';
  var nav = dwc('nav', 'bottom-nav', {
    'aria-label': corrige
      ? t('ui.fc.navOn', 'Exemple : barre d’onglets, avec correctifs')
      : t('ui.fc.navOff', 'Exemple : barre d’onglets, sans correctifs'),
  });
  [
    [t('ui.fc.tab.home', 'Accueil'), true],
    [t('ui.fc.tab.settings', 'Réglages'), false],
  ].forEach(function (pair) {
    var tab = dwc(
      'span',
      'bottom-nav-item',
      pair[1] ? { 'data-current': '' } : {}
    );
    var label = dwc('span', 'bottom-nav-label', {});
    label.textContent = pair[0];
    tab.appendChild(label);
    nav.appendChild(tab);
  });

  var themeBtn = dwc('button', 'theme-toggle', {
    type: 'button',
    'data-theme-state': 'dark',
    'aria-label': t('ui.fc.theme', 'Thème : sombre'),
  });
  var themeIcon = dwc('span', 'theme-toggle-icon', { 'aria-hidden': 'true' });
  themeIcon.appendChild(schemeIcon('dark'));
  themeBtn.appendChild(themeIcon);

  [primary, off, badge, sync, skeleton, panel, toast, nav, themeBtn].forEach(
    function (node) {
      host.appendChild(node);
    }
  );
}

var fcQuery = null;

export function renderForcedColors() {
  document.querySelectorAll('[data-fc-demo]').forEach(fcDemo);

  var table = document.getElementById('fc-table');
  if (table) {
    table.textContent = '';
    // `headRow` rend un <thead> complet, pas une ligne.
    table.appendChild(
      headRow([
        t('ui.fc.th.what', 'Ce qui casse'),
        t('ui.fc.th.why', 'Pourquoi'),
        t('ui.fc.th.fix', 'Correctif livré'),
      ])
    );

    var tbody = document.createElement('tbody');
    fcRows().forEach(function (item) {
      var tr = row([item[0], item[1], '']);
      var fix = tr.lastChild;
      var code = document.createElement('code');
      code.textContent = item[2];
      fix.appendChild(code);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
  }

  var state = document.getElementById('fc-state');
  if (!state) return;
  if (!fcQuery && window.matchMedia) {
    fcQuery = window.matchMedia('(forced-colors: active)');
    // Le réglage peut changer sans recharger la page.
    fcQuery.addEventListener('change', renderForcedColors);
  }
  var active = fcQuery ? fcQuery.matches : false;
  state.dataset.active = active ? 'yes' : 'no';
  state.textContent = active
    ? t(
        'ui.fc.on',
        'Votre navigateur est en contraste forcé : toute cette page est déjà rendue par le vrai mode, émulation comprise.'
      )
    : t(
        'ui.fc.off',
        'Votre navigateur n’est pas en contraste forcé — les deux panneaux ci-dessous sont donc une reconstitution.'
      );
}
