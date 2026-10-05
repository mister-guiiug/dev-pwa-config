/*
 * Le bac à sable.
 *
 * Les matrices montrent des combinaisons CHOISIES. Celle qu'on cherche n'y
 * est pas forcément, et c'est le moment où l'on quitte la doc pour aller
 * lire la source.
 *
 * Chaque composant décrit ses props réglables, le DOM qu'il produit et
 * l'appel React correspondant — les trois au même endroit, pour qu'ajouter
 * une prop ne puisse pas en oublier une des deux autres.
 */

import { etat } from './etat.js?v=542f37cc5d';
import { t } from './langue.js?v=d92afbcf3f';
import { attr, dwc, jsx, SVG_NS } from './communs.js?v=9f5191d160';
import { copyButton } from './presse-papier.js?v=8913ceeeb8';
import { scheduleScrollLabels } from './tableaux.js?v=ab72120a8e';

var PG_COMPONENTS = [
  {
    id: 'Button',
    props: [
      {
        name: 'variant',
        values: ['primary', 'secondary', 'outline', 'ghost', 'danger'],
      },
      { name: 'size', values: ['sm', 'md', 'lg'], def: 'md' },
      { name: 'loading', bool: true },
      { name: 'disabled', bool: true },
      { name: 'block', bool: true },
      { name: 'iconOnly', bool: true },
    ],
    build: function (p) {
      var label = t('ui.pg.save', 'Enregistrer');
      var b = dwc('button', 'button', {
        type: 'button',
        'data-variant': p.variant,
        'data-size': p.size,
        'data-block': p.block,
      });
      if (p.iconOnly) {
        b.dataset.iconOnly = '';
        // Sans libellé visible, le libellé accessible n'est pas optionnel.
        b.setAttribute('aria-label', t('ui.button.add', 'Ajouter'));
      }
      if (p.loading) {
        b.dataset.loading = '';
        b.setAttribute('aria-busy', 'true');
        b.disabled = true;
        b.appendChild(dwc('span', 'button-spinner', { 'aria-hidden': 'true' }));
      }
      if (p.disabled) b.disabled = true;
      if (p.iconOnly) b.appendChild(plusIcon());
      else b.appendChild(document.createTextNode(label));
      return b;
    },
    code: function (p) {
      var label = t('ui.pg.save', 'Enregistrer');
      return jsx(
        'Button',
        [
          attr('variant', p.variant),
          attr('size', p.size),
          p.block && 'block',
          p.loading && 'loading',
          p.disabled && 'disabled',
          p.iconOnly && 'iconOnly',
          p.iconOnly && attr('aria-label', t('ui.button.add', 'Ajouter')),
          'onClick={save}',
        ],
        p.iconOnly ? '<Plus size={18} aria-hidden="true" />' : label
      );
    },
    note: function (p) {
      if (p.iconOnly)
        return t(
          'ui.pg.note.iconOnly',
          '`iconOnly` impose `aria-label` — il est ajouté à l’extrait ci-dessus : sans lui, le bouton n’aurait aucun nom accessible.'
        );
      if (p.loading)
        return t(
          'ui.pg.note.loading',
          '`loading` pose `aria-busy` ET désactive : c’est ce qui empêche la double soumission.'
        );
      return '';
    },
  },
  {
    id: 'Badge',
    props: [
      {
        name: 'tone',
        values: ['brand', 'success', 'warning', 'danger', 'info', 'muted'],
        def: 'muted',
      },
      { name: 'variant', values: ['soft', 'outline'] },
    ],
    build: function (p) {
      var s = dwc('span', 'badge', {
        'data-tone': p.tone,
        'data-variant': p.variant,
      });
      s.textContent = t('ui.pg.badge', 'À jour');
      return s;
    },
    code: function (p) {
      return jsx(
        'Badge',
        [attr('tone', p.tone), attr('variant', p.variant)],
        t('ui.pg.badge', 'À jour')
      );
    },
    note: function () {
      return t(
        'ui.pg.note.badge',
        'Le ton dit une INTENTION ; la teinte vient du thème de l’application.'
      );
    },
  },
  {
    id: 'Field',
    props: [
      { name: 'hint', bool: true, def: true },
      { name: 'error', bool: true },
      { name: 'multiline', bool: true },
    ],
    build: function (p) {
      var wrap = dwc('div', 'field', { 'data-invalid': p.error });
      var label = dwc('label', 'field-label', { for: 'pg-field' });
      label.textContent = t('ui.pg.amount', 'Montant');
      wrap.appendChild(label);

      var control = dwc(p.multiline ? 'textarea' : 'input', 'field-control', {
        id: 'pg-field',
        'data-multiline': p.multiline,
        'aria-invalid': p.error ? 'true' : false,
      });
      // En erreur, l'aide RESTE référencée : la retirer masque la consigne
      // au pire moment.
      var described = [];
      if (p.hint) described.push('pg-field-hint');
      if (p.error) described.push('pg-field-error');
      if (described.length)
        control.setAttribute('aria-describedby', described.join(' '));
      if (!p.multiline) control.value = '42,00';
      else control.textContent = '42,00';
      wrap.appendChild(control);

      if (p.hint) {
        var hint = dwc('p', 'field-hint', { id: 'pg-field-hint' });
        hint.textContent = t('ui.pg.hint', 'En euros, deux décimales.');
        wrap.appendChild(hint);
      }
      if (p.error) {
        var err = dwc('p', 'field-error', { id: 'pg-field-error' });
        err.textContent = t('ui.pg.error', 'Le montant doit être positif.');
        wrap.appendChild(err);
      }
      return wrap;
    },
    code: function (p) {
      // `multiline` est une prop de TextField, pas un autre composant.
      return jsx('TextField', [
        attr('label', t('ui.pg.amount', 'Montant')),
        p.hint && attr('hint', t('ui.pg.hint', 'En euros, deux décimales.')),
        p.error &&
          attr('error', t('ui.pg.error', 'Le montant doit être positif.')),
        p.multiline && 'multiline',
        'value={amount}',
        'onChange={e => setAmount(e.target.value)}',
      ]);
    },
    note: function (p) {
      if (p.hint && p.error)
        return t(
          'ui.pg.note.field',
          'aria-describedby référence l’aide ET l’erreur — les copies locales remplaçaient l’une par l’autre.'
        );
      return '';
    },
  },
  {
    id: 'Stat',
    props: [
      { name: 'trend', values: ['none', 'up', 'down'] },
      { name: 'icon', bool: true },
    ],
    build: function (p) {
      var fig = dwc('figure', 'stat', {});
      // L'icône dans le libellé, comme le composant : plus d'en-tête.
      var label = dwc('figcaption', 'stat-label', {});
      label.textContent = t('ui.pg.members', 'Adhérents');
      if (p.icon) {
        var icon = dwc('span', 'stat-icon', { 'aria-hidden': 'true' });
        icon.appendChild(plusIcon());
        label.appendChild(icon);
      }
      fig.appendChild(label);

      var value = dwc('p', 'stat-value', {});
      value.textContent = '128';
      fig.appendChild(value);

      if (p.trend !== 'none') {
        var delta = dwc('p', 'stat-delta', { 'data-trend': p.trend });
        delta.textContent = p.trend === 'up' ? '+12' : '−12';
        var hidden = dwc('span', 'stat-trend-label', {});
        // La flèche et la couleur ne disent rien à un lecteur d'écran.
        hidden.textContent =
          p.trend === 'up'
            ? t('ui.pg.up', 'en hausse')
            : t('ui.pg.down', 'en baisse');
        delta.appendChild(hidden);
        fig.appendChild(delta);
      }
      return fig;
    },
    code: function (p) {
      return jsx('Stat', [
        attr('label', t('ui.pg.members', 'Adhérents')),
        'value={128}',
        p.trend !== 'none' && attr('delta', p.trend === 'up' ? '+12' : '−12'),
        p.trend !== 'none' && attr('trend', p.trend),
        p.trend !== 'none' &&
          attr(
            'trendLabel',
            p.trend === 'up'
              ? t('ui.pg.up', 'en hausse')
              : t('ui.pg.down', 'en baisse')
          ),
        p.icon && 'icon={<Users size={16} aria-hidden="true" />}',
      ]);
    },
    note: function (p) {
      if (p.trend !== 'none')
        return t(
          'ui.pg.note.stat',
          '`trendLabel` est lu par les lecteurs d’écran : la flèche et la couleur ne suffisent pas.'
        );
      return '';
    },
  },
  {
    id: 'Skeleton',
    props: [
      { name: 'lines', values: ['1', '3', '5'], def: '3' },
      { name: 'radius', values: ['sm', 'md', 'lg', 'full'], def: 'md' },
    ],
    build: function (p) {
      var group = dwc('div', 'skeleton-group', {
        role: 'status',
        'aria-live': 'polite',
      });
      var label = dwc('span', 'skeleton-label', {});
      label.textContent = t('ui.pg.loading', 'Chargement des écritures');
      group.appendChild(label);
      for (var i = 0; i < Number(p.lines); i++) {
        var bar = dwc('span', 'skeleton', {
          'data-radius': p.radius,
          'aria-hidden': 'true',
        });
        bar.style.height = '0.9rem';
        // Dernière barre plus courte : c'est ce que fait le composant.
        bar.style.width = i === Number(p.lines) - 1 ? '60%' : '100%';
        group.appendChild(bar);
      }
      return group;
    },
    code: function (p) {
      return jsx('SkeletonGroup', [
        attr('label', t('ui.pg.loading', 'Chargement des écritures')),
        'lines={' + p.lines + '}',
        attr('radius', p.radius),
      ]);
    },
    note: function () {
      return t(
        'ui.pg.note.skeleton',
        'Le libellé est annoncé UNE fois, par le conteneur — pas une fois par barre.'
      );
    },
  },
];

function plusIcon() {
  var s = document.createElementNS(SVG_NS, 'svg');
  s.setAttribute('width', '18');
  s.setAttribute('height', '18');
  s.setAttribute('viewBox', '0 0 24 24');
  s.setAttribute('fill', 'none');
  s.setAttribute('stroke', 'currentColor');
  s.setAttribute('stroke-width', '2');
  s.setAttribute('stroke-linecap', 'round');
  s.setAttribute('aria-hidden', 'true');
  var path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', 'M12 5v14M5 12h14');
  s.appendChild(path);
  return s;
}

// État par composant : revenir sur Button doit retrouver ses réglages.
//
// `def` porte la valeur PAR DÉFAUT DU COMPOSANT, qui n'est pas toujours la
// première de la liste : `size` s'ordonne sm → lg mais vaut `md`. Sans ça, le
// premier extrait qu'on copie n'est pas l'appel par défaut.
var pgState = {};
etat.pgCurrent = 'Button';
PG_COMPONENTS.forEach(function (spec) {
  var state = {};
  spec.props.forEach(function (prop) {
    if (prop.bool) state[prop.name] = prop.def === true;
    else state[prop.name] = prop.def || prop.values[0];
  });
  pgState[spec.id] = state;
});

function pgSpec() {
  for (var i = 0; i < PG_COMPONENTS.length; i++) {
    if (PG_COMPONENTS[i].id === etat.pgCurrent) return PG_COMPONENTS[i];
  }
  return PG_COMPONENTS[0];
}

var pgCodeText = '';

/** Rejoue l'aperçu et l'extrait ; les commandes, elles, ne bougent pas. */
function pgPaint() {
  var spec = pgSpec();
  var props = pgState[spec.id];
  var stage = document.getElementById('pg-stage');
  var code = document.getElementById('pg-code');
  if (!stage || !code) return;

  stage.textContent = '';
  stage.appendChild(spec.build(props));

  pgCodeText = spec.code(props);
  code.querySelector('code').textContent = pgCodeText;

  var note = code.querySelector('.sr-pg-note');
  var text = spec.note ? spec.note(props) : '';
  note.textContent = text;
  note.hidden = !text;
  // L'extrait change de longueur et de composant : son nom et son état
  // défilant aussi.
  scheduleScrollLabels();
}

export function renderPlayground() {
  var controls = document.getElementById('pg-controls');
  var code = document.getElementById('pg-code');
  var stageHead = document.getElementById('pg-stage-head');
  if (!controls || !code) return;

  controls.textContent = '';
  code.textContent = '';

  var pick = document.createElement('p');
  pick.className = 'sr-control';
  var pickLabel = document.createElement('label');
  pickLabel.htmlFor = 'pg-component';
  pickLabel.textContent = t('ui.pg.component', 'Composant');
  var select = document.createElement('select');
  select.id = 'pg-component';
  PG_COMPONENTS.forEach(function (spec) {
    var option = document.createElement('option');
    option.value = spec.id;
    option.textContent = spec.id;
    select.appendChild(option);
  });
  select.value = etat.pgCurrent;
  select.addEventListener('change', function () {
    etat.pgCurrent = select.value;
    renderPlayground();
  });
  pick.appendChild(pickLabel);
  pick.appendChild(select);
  controls.appendChild(pick);

  var spec = pgSpec();
  var props = pgState[spec.id];

  spec.props.forEach(function (prop) {
    var id = 'pg-' + spec.id + '-' + prop.name;
    var wrap = document.createElement('p');
    wrap.className = prop.bool ? 'sr-control sr-control--bool' : 'sr-control';

    var input;
    if (prop.bool) {
      input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = !!props[prop.name];
      input.addEventListener('change', function () {
        props[prop.name] = input.checked;
        pgPaint();
      });
    } else {
      input = document.createElement('select');
      prop.values.forEach(function (value) {
        var option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        input.appendChild(option);
      });
      input.value = props[prop.name];
      input.addEventListener('change', function () {
        props[prop.name] = input.value;
        pgPaint();
      });
    }
    input.id = id;

    var label = document.createElement('label');
    label.htmlFor = id;
    label.textContent = prop.name;

    // Case à cocher : commande d'abord, libellé ensuite — l'ordre visuel
    // attendu, et le seul qui laisse la cible cliquable au bon endroit.
    if (prop.bool) {
      wrap.appendChild(input);
      wrap.appendChild(label);
    } else {
      wrap.appendChild(label);
      wrap.appendChild(input);
    }
    controls.appendChild(wrap);
  });

  if (stageHead) stageHead.textContent = t('ui.pg.preview', 'Aperçu');

  var head = document.createElement('p');
  head.className = 'sr-snippet-head';
  head.textContent = t('ui.usage', 'Utilisation');
  // Getter et non valeur : le bouton survit aux changements de props.
  head.appendChild(
    copyButton(
      function () {
        return pgCodeText;
      },
      t('ui.copySnippetOf', 'Copier l’extrait de {name}').replace(
        '{name}',
        etat.pgCurrent
      )
    )
  );
  var pre = document.createElement('pre');
  pre.appendChild(document.createElement('code'));
  var note = document.createElement('p');
  note.className = 'sr-pg-note';

  code.appendChild(head);
  code.appendChild(pre);
  code.appendChild(note);

  pgPaint();
}
