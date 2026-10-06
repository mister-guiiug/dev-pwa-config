/*
 * La recherche de l'en-tête (Ctrl+K, ou « / ») : une seule commande pour
 * trouver une section, un composant, un hook ou une app. Elle s'appuie sur
 * `command.js`, la copie exacte du module du paquet.
 */

import {
  attachCommandCombobox,
  filterCommandItems,
} from './command.js?v=822f1c9e81';
import { etat, root, syncUrl } from './etat.js?v=542f37cc5d';
import { t } from './langue.js?v=d92afbcf3f';
import { ROLES } from './communs.js?v=0f95ffd5f1';
import { focusDestination } from './navigation.js?v=1ee0f765a8';
import { catalogueItems } from './fiches.js?v=7a128b2142';
import { APPS, renderAppGrid, renderViewChip } from './vitrine.js?v=54052755aa';

/* Recherche unifiée. Ctrl+K (⌘K) et « / » y amènent le curseur.
   Sections, composants, apps — et filtre de la vitrine Apps. */
export function setupCommand() {
  var input = document.getElementById('sr-cmd');
  var list = document.getElementById('sr-cmd-list');
  if (!input || !list) return;

  function kinds() {
    return {
      section: t('ui.cmd.section', 'Section'),
      component: t('ui.cmd.component', 'Composant'),
      app: t('ui.cmd.app', 'Application'),
      filter: t('ui.cmd.filter', 'Filtrer'),
      token: t('ui.cmd.token', 'Token'),
      action: t('ui.cmd.action', 'Action'),
    };
  }

  function index() {
    var out = [];
    document.querySelectorAll('.sr-rail a[href^="#"]').forEach(function (a) {
      var label = (a.textContent || '').replace(/\s+/g, ' ').trim();
      var href = a.getAttribute('href');
      if (label && href)
        out.push({ kind: 'section', label: label, href: href });
    });
    catalogueItems().forEach(function (item) {
      out.push({ kind: 'component', label: item.id, href: item.href });
    });
    APPS.forEach(function (item) {
      out.push({
        kind: 'app',
        label: item.name || item.id,
        href: '#app-' + item.id,
      });
    });
    var styles = getComputedStyle(root);
    ROLES.forEach(function (role) {
      var value = styles.getPropertyValue(role[1]).trim();
      out.push({
        kind: 'token',
        label: role[1] + (value ? ' · ' + value : ''),
        href: '#couleurs',
        token: role[1],
        value: value,
        search: (
          role[0] +
          ' ' +
          role[1] +
          ' ' +
          role[2] +
          ' ' +
          value
        ).toLowerCase(),
      });
      if (value) {
        out.push({
          kind: 'action',
          label: t('ui.cmd.copyToken', 'Copier {token}').replace(
            '{token}',
            role[1]
          ),
          copy: value,
          search: (role[0] + ' ' + role[1] + ' copy copier').toLowerCase(),
        });
      }
    });
    return out;
  }

  function go(hit) {
    if (hit.copy) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(hit.copy).catch(function () {});
      }
      return;
    }
    if (hit.filter != null) {
      etat.appQuery = hit.filter;
      renderAppGrid();
      renderViewChip();
      syncUrl();
      focusDestination(document.getElementById('apps'));
      return;
    }
    var href = hit.href;
    if (href.charAt(0) === '#') {
      var target = document.getElementById(href.slice(1));
      if (target) {
        focusDestination(target);
        if (history.replaceState) {
          var url = new URL(location.href);
          url.hash = href;
          history.replaceState(null, '', url);
        }
      } else {
        location.hash = href;
      }
    } else {
      location.href = href;
    }
  }

  attachCommandCombobox({
    input: input,
    list: list,
    idPrefix: 'sr-cmd-hit',
    emptyLabel: t('ui.cmd.empty', 'Aucun résultat'),
    emptyClass: 'sr-cmd-empty',
    getItems: function (query) {
      var term = query.trim();
      var hits = filterCommandItems(index(), query, { limit: 7 });
      hits.unshift({
        kind: 'filter',
        label: t('ui.cmd.filterApps', 'Apps contenant « {q} »').replace(
          '{q}',
          term
        ),
        filter: term,
        href: '#apps',
      });
      return hits;
    },
    renderItem: function (hit, i, selected) {
      var labels = kinds();
      var li = document.createElement('li');
      li.id = 'sr-cmd-hit-' + i;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(selected));
      var kind = document.createElement('span');
      kind.className = 'sr-cmd-kind';
      kind.textContent = labels[hit.kind] || hit.kind;
      var name = document.createElement('span');
      name.textContent = hit.label;
      li.appendChild(kind);
      li.appendChild(name);
      return li;
    },
    onSelect: go,
  });
}
