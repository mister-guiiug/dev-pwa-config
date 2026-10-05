/*
 * Les fiches : extraits d'usage des composants et des hooks, arbres de
 * décision, et l'index cherchable du catalogue.
 *
 * Arbres de décision. Le showroom montrait chaque composant seul et ne disait
 * jamais lequel prendre quand deux conviennent. C'est pourtant là qu'on
 * hésite.
 *
 * Index cherchable. Vingt-trois entrées réparties sur six sections : sans
 * index, trouver `useOfflineMutationQueue` demandait de savoir qu'il
 * existait.
 */

import { etat } from './etat.js?v=542f37cc5d';
import { t } from './langue.js?v=d92afbcf3f';
import { attachCopy } from './presse-papier.js?v=8913ceeeb8';

var SNIPPETS = globalThis.SHOWROOM_SNIPPETS || {};
var CATALOGUE = globalThis.SHOWROOM_CATALOGUE || {};
var COMPONENTS = CATALOGUE.components || [];
var HOOKS = CATALOGUE.hooks || [];
var DECISIONS = CATALOGUE.decisions || [];

/**
 * Champ bilingue `{ fr, en }` du catalogue, dans la langue courante.
 *
 * Contrairement au reste de la page, le catalogue porte ses deux langues
 * côte à côte : il n'a pas de HTML source dont capturer le français, et un
 * objet unique rend la parité vérifiable par construction.
 */
function loc(field) {
  if (!field) return '';
  return field[etat.lang] !== undefined ? field[etat.lang] : field.fr;
}

function catalogueEntry(id) {
  for (var i = 0; i < COMPONENTS.length; i++) {
    if (COMPONENTS[i].id === id) return COMPONENTS[i];
  }
  return null;
}

/**
 * Écrit un texte dont les portions entre accents graves deviennent des
 * `<code>`. Par création de nœuds et non par `innerHTML` : le contenu vient
 * d'un fichier de données, autant ne pas ouvrir cette porte pour du balisage
 * qu'on peut produire directement.
 */
function richText(target, text) {
  String(text)
    .split('`')
    .forEach(function (part, i) {
      if (!part) return;
      if (i % 2) {
        var code = document.createElement('code');
        code.textContent = part;
        target.appendChild(code);
      } else {
        target.appendChild(document.createTextNode(part));
      }
    });
}

/**
 * Remplit chaque emplacement `data-snippet` : extrait d'usage, pièges,
 * note d'accessibilité.
 *
 * Les pièges ne sont pas des conseils — chacun décrit un défaut CONSTATÉ.
 * Ils vivaient jusqu'ici dans les commentaires de `components.css` et les
 * notes de version, c'est-à-dire partout sauf là où l'erreur se commet.
 */
export function renderComponentDocs() {
  document.querySelectorAll('[data-snippet]').forEach(function (slot) {
    var id = slot.dataset.snippet;
    var code = SNIPPETS[id];
    var entry = catalogueEntry(id);
    if (!code && !entry) return;
    slot.textContent = '';
    slot.id = 'doc-' + id;

    if (code) {
      var head = document.createElement('p');
      head.className = 'sr-snippet-head';
      head.textContent = t('ui.usage', 'Utilisation');
      // Un nom par bouton : vingt-cinq « Copier l’extrait » identiques ne
      // se distinguaient pas dans la liste des boutons.
      attachCopy(
        head,
        code,
        t('ui.copySnippetOf', 'Copier l’extrait de {name}').replace(
          '{name}',
          id
        )
      );

      var pre = document.createElement('pre');
      var el = document.createElement('code');
      el.textContent = code;
      pre.appendChild(el);

      slot.appendChild(head);
      slot.appendChild(pre);
    }

    if (!entry) return;

    var donts = loc(entry.donts) || [];
    if (donts.length) {
      var box = document.createElement('div');
      box.className = 'sr-pitfalls';

      var title = document.createElement('p');
      title.className = 'sr-pitfalls-head';
      title.textContent = t('ui.pitfalls', 'Pièges');
      var count = document.createElement('span');
      count.className = 'sr-computed';
      count.textContent = String(donts.length);
      title.appendChild(count);
      box.appendChild(title);

      var list = document.createElement('ul');
      donts.forEach(function (text) {
        var li = document.createElement('li');
        richText(li, text);
        list.appendChild(li);
      });
      box.appendChild(list);
      slot.appendChild(box);
    }

    var a11y = loc(entry.a11y);
    if (a11y) {
      var note = document.createElement('p');
      note.className = 'sr-a11y-note';
      var label = document.createElement('strong');
      label.textContent = t('ui.a11yNote', 'Accessibilité');
      note.appendChild(label);
      note.appendChild(document.createTextNode(' — '));
      richText(note, a11y);
      slot.appendChild(note);
    }
  });
}

export function renderDecisions() {
  var host = document.getElementById('decision-trees');
  if (!host) return;
  host.textContent = '';

  DECISIONS.forEach(function (tree) {
    var block = document.createElement('div');
    block.className = 'sr-tree';
    block.id = 'tree-' + tree.id;

    var q = document.createElement('h3');
    q.className = 'sr-subtitle sr-tree-q';
    q.textContent = loc(tree.question);
    block.appendChild(q);

    var list = document.createElement('ul');
    list.className = 'sr-tree-branches';

    tree.branches.forEach(function (branch) {
      var li = document.createElement('li');
      li.className = 'sr-branch';

      var when = document.createElement('p');
      when.className = 'sr-branch-when';
      when.textContent = loc(branch.when);
      li.appendChild(when);

      // La recommandation est un lien vers la fiche : « lequel » et
      // « comment » ne doivent pas demander de chercher.
      var use = document.createElement('a');
      use.className = 'sr-branch-use';
      use.href = '#doc-' + branch.target;
      use.textContent = branch.use;
      li.appendChild(use);

      var why = document.createElement('p');
      why.className = 'sr-branch-why';
      richText(why, loc(branch.why));
      li.appendChild(why);

      list.appendChild(li);
    });

    block.appendChild(list);
    host.appendChild(block);
  });
}

export function renderHooks() {
  var list = document.getElementById('hooks-list');
  if (!list) return;
  list.textContent = '';

  HOOKS.forEach(function (hook) {
    var item = document.createElement('li');
    item.className = 'sr-hook';

    var name = document.createElement('h3');
    name.className = 'sr-hook-name';
    name.textContent = hook.id;
    item.appendChild(name);

    var sigLabel = document.createElement('span');
    sigLabel.className = 'sr-hook-sig-label';
    sigLabel.textContent = t('ui.hooks.th.name', 'Signature');
    item.appendChild(sigLabel);

    var sig = document.createElement('code');
    sig.className = 'sr-hook-sig';
    sig.textContent = hook.signature;
    item.appendChild(sig);

    var what = document.createElement('p');
    richText(what, loc(hook.summary));
    item.appendChild(what);

    var dont = document.createElement('p');
    dont.className = 'sr-hook-dont';
    var label = document.createElement('span');
    label.className = 'sr-hook-dont-label';
    label.textContent = t('ui.hooks.th.dont', 'Piège');
    dont.appendChild(label);
    var pit = document.createElement('span');
    richText(pit, loc(hook.dont));
    dont.appendChild(pit);
    item.appendChild(dont);

    list.appendChild(item);
  });
}

var CAT_ORDER = ['primitive', 'feedback', 'pwa', 'shell', 'hook'];

/**
 * Libellé d'une catégorie. Un `switch` et non une table indexée : les clés
 * restent LITTÉRALES, donc vérifiables par le test de parité des
 * traductions, qui ne sait pas lire `t(TABLE[x][0])`.
 */
function catLabel(category) {
  switch (category) {
    case 'primitive':
      return t('ui.cat.primitive', 'Primitive');
    case 'feedback':
      return t('ui.cat.feedback', 'Retour utilisateur');
    case 'pwa':
      return t('ui.cat.pwa', 'PWA');
    case 'shell':
      return t('ui.cat.shell', 'Coque');
    case 'hook':
      return t('ui.cat.hook', 'Hook');
    default:
      return category;
  }
}

var catFilter = 'all';
etat.catQuery = '';

/** Composants et hooks dans un même jeu : on cherche une capacité. */
export function catalogueItems() {
  return COMPONENTS.map(function (c) {
    return {
      id: c.id,
      category: c.category,
      href: '#doc-' + c.id,
      meta: (loc(c.donts) || []).length,
      a11y: !!loc(c.a11y),
    };
  }).concat(
    HOOKS.map(function (h) {
      return {
        id: h.id,
        category: 'hook',
        href: '#hooks',
        meta: 0,
        a11y: false,
        summary: loc(h.summary),
      };
    })
  );
}

/**
 * Boutons de filtre. Séparés de la grille, et c'est le point : les
 * reconstruire à chaque clic détruisait le bouton sur lequel on venait
 * d'appuyer — au clavier, le focus repartait sur `<body>`, c'est-à-dire en
 * haut de la page. Ils ne se reconstruisent donc qu'au changement de langue ;
 * un clic ne fait plus que déplacer `aria-pressed`.
 */
export function renderCatalogueFilters() {
  var filters = document.getElementById('cat-filters');
  if (!filters) return;

  var items = catalogueItems();
  var kept = filters.querySelector('.sr-visually-hidden');
  filters.textContent = '';
  if (kept) filters.appendChild(kept);

  var buckets = [['all', t('ui.cat.all', 'Tout'), items.length]];
  CAT_ORDER.forEach(function (key) {
    var n = items.filter(function (i) {
      return i.category === key;
    }).length;
    if (n) buckets.push([key, catLabel(key), n]);
  });

  buckets.forEach(function (bucket) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'sr-cat-filter';
    button.dataset.cat = bucket[0];
    button.setAttribute('aria-pressed', String(catFilter === bucket[0]));
    button.textContent = bucket[1];
    var badge = document.createElement('span');
    badge.className = 'sr-computed';
    badge.textContent = String(bucket[2]);
    button.appendChild(badge);
    button.addEventListener('click', function () {
      catFilter = bucket[0];
      filters.querySelectorAll('.sr-cat-filter').forEach(function (other) {
        other.setAttribute(
          'aria-pressed',
          String(other.dataset.cat === catFilter)
        );
      });
      renderCatalogueIndex();
    });
    filters.appendChild(button);
  });
}

export function renderCatalogueIndex() {
  var grid = document.getElementById('cat-grid');
  var count = document.getElementById('cat-count');
  if (!grid || !count) return;

  var items = catalogueItems();
  var term = etat.catQuery.trim().toLowerCase();
  var shown = items.filter(function (item) {
    if (catFilter !== 'all' && item.category !== catFilter) return false;
    if (!term) return true;
    return (
      item.id.toLowerCase().indexOf(term) !== -1 ||
      (item.summary || '').toLowerCase().indexOf(term) !== -1
    );
  });

  grid.textContent = '';
  shown.forEach(function (item) {
    var li = document.createElement('li');
    var link = document.createElement('a');
    link.className = 'sr-cat-card';
    link.href = item.href;
    link.dataset.cat = item.category;

    var name = document.createElement('span');
    name.className = 'sr-cat-name';
    name.textContent = item.id;
    link.appendChild(name);

    var meta = document.createElement('span');
    meta.className = 'sr-cat-meta';
    meta.textContent = catLabel(item.category);
    if (item.meta) {
      meta.appendChild(
        document.createTextNode(
          ' · ' + item.meta + ' ' + t('ui.pitfalls', 'Pièges').toLowerCase()
        )
      );
    }
    link.appendChild(meta);

    li.appendChild(link);
    grid.appendChild(li);
  });

  count.textContent =
    shown.length === items.length
      ? t('ui.cat.total', '{n} entrées').replace('{n}', String(items.length))
      : t('ui.cat.shown', '{n} sur {total}')
          .replace('{n}', String(shown.length))
          .replace('{total}', String(items.length));
}
