/*
 * La checklist d'adoption : pour une app choisie, ce qu'elle a déjà pris du
 * paquet et ce qui lui reste, lu dans le relevé d'adoption.
 */

import { etat } from './etat.js?v=542f37cc5d';
import { t } from './langue.js?v=d92afbcf3f';
import { themeById, themeDisplayName } from './communs.js?v=0f95ffd5f1';
import { copyText } from './presse-papier.js?v=8913ceeeb8';

var ADOPTION_CHECKS = [
  { symbol: 'ThemeProvider', href: '#hooks' },
  { symbol: 'EmptyState', href: '#composants' },
  { symbol: 'ShareButton', href: '#composants', alts: ['shareOrCopy'] },
  { symbol: 'BottomNav', href: '#composants' },
  { symbol: 'LoginForm', href: '#composants' },
  { symbol: 'ToastProvider', href: '#composants', alts: ['useToast'] },
  { symbol: 'ConfirmDialog', href: '#composants' },
  { symbol: 'ConsentBanner', href: '#composants' },
];

function checklistAppId() {
  var select = document.getElementById('apps-checklist-app');
  return (select && select.value) || '';
}

function adoptionEntry(appId) {
  var data = globalThis.SHOWROOM_ADOPTION;
  if (!data || !data.apps) return null;
  return data.apps[appId] || null;
}

function checkStatus(entry, check) {
  if (!entry) return 'ko';
  var symbols = entry.symbols || [];
  var kept = entry.kept || [];
  var names = [check.symbol].concat(check.alts || []);
  for (var i = 0; i < names.length; i += 1) {
    if (symbols.indexOf(names[i]) !== -1) return 'ok';
  }
  for (var k = 0; k < kept.length; k += 1) {
    if (names.indexOf(kept[k].exported) !== -1) return 'kept';
  }
  return 'ko';
}

export function renderChecklist() {
  var host = document.getElementById('apps-checklist');
  var select = document.getElementById('apps-checklist-app');
  var list = document.getElementById('apps-checklist-list');
  var summary = document.getElementById('apps-checklist-summary');
  if (!host || !select || !list) return;
  var data = globalThis.SHOWROOM_ADOPTION;
  if (!data || !data.measured) {
    host.hidden = true;
    return;
  }
  host.hidden = false;
  var ids = Object.keys(data.apps || {}).sort();
  var previous = select.value;
  select.textContent = '';
  ids.forEach(function (id) {
    var opt = document.createElement('option');
    opt.value = id;
    var theme = themeById(id);
    opt.textContent = theme ? themeDisplayName(theme) : id;
    select.appendChild(opt);
  });
  if (previous && ids.indexOf(previous) !== -1) select.value = previous;
  else if (ids.indexOf(etat.currentTheme.id) !== -1)
    select.value = etat.currentTheme.id;
  else if (ids.length) select.value = ids[0];

  var entry = adoptionEntry(select.value);
  list.textContent = '';
  var ok = 0;
  var keptN = 0;
  var ko = 0;
  ADOPTION_CHECKS.forEach(function (check) {
    var status = checkStatus(entry, check);
    if (status === 'ok') ok += 1;
    else if (status === 'kept') keptN += 1;
    else ko += 1;
    var li = document.createElement('li');
    var mark = document.createElement('span');
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = status === 'ok' ? '✓' : status === 'kept' ? '·' : '×';
    var label = document.createElement('a');
    label.href = check.href;
    label.textContent = check.symbol;
    var badge = document.createElement('span');
    badge.className =
      status === 'ok'
        ? 'sr-check-ok'
        : status === 'kept'
          ? 'sr-check-kept'
          : 'sr-check-ko';
    badge.textContent =
      status === 'ok'
        ? t('ui.check.present', 'présent')
        : status === 'kept'
          ? t('ui.check.kept', 'équivalent local')
          : t('ui.check.absent', 'absent');
    li.appendChild(mark);
    li.appendChild(label);
    li.appendChild(badge);
    list.appendChild(li);
  });
  if (summary) {
    summary.textContent = t(
      'ui.check.summary',
      '{ok} présents · {kept} locaux · {ko} absents'
    )
      .replace('{ok}', String(ok))
      .replace('{kept}', String(keptN))
      .replace('{ko}', String(ko));
  }
}

export function setupChecklist() {
  var select = document.getElementById('apps-checklist-app');
  var copy = document.getElementById('apps-checklist-copy');
  if (select && !select.dataset.bound) {
    select.dataset.bound = '1';
    select.addEventListener('change', renderChecklist);
  }
  if (copy && !copy.dataset.bound) {
    copy.dataset.bound = '1';
    copy.addEventListener('click', function () {
      var entry = adoptionEntry(checklistAppId());
      var gaps = ADOPTION_CHECKS.filter(function (check) {
        return checkStatus(entry, check) !== 'ok';
      }).map(function (check) {
        var st = checkStatus(entry, check);
        return (
          check.symbol +
          ' — ' +
          (st === 'kept'
            ? t('ui.check.kept', 'équivalent local')
            : t('ui.check.absent', 'absent'))
        );
      });
      var text = gaps.length
        ? gaps.join('\n')
        : t('ui.check.none', 'Aucun écart sur cette checklist.');
      copyText(text).then(function () {
        copy.textContent = t('ui.copied', 'Copié');
        window.setTimeout(function () {
          copy.textContent = t('ui.check.copy', 'Copier les écarts');
        }, 1200);
      });
    });
  }
  renderChecklist();
}
