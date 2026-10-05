/*
 * Les scènes : un état complet de la page (thème, schéma, langue, densité,
 * paire comparée, inspection, section, ancre), enregistré sous un nom,
 * rejoué, ou partagé par lien.
 */

import {
  APP_KEY,
  etat,
  LANG_KEY,
  PAIR_A_KEY,
  PAIR_B_KEY,
  paramOr,
  SCENES_KEY,
  SCHEME_KEY,
  setOrDrop,
  syncUrl,
  write,
} from './etat.js?v=542f37cc5d';
import { applyLang, LANGS, t } from './langue.js?v=d92afbcf3f';
import { applyDensity, themeById } from './communs.js?v=9f5191d160';
import { copyText } from './presse-papier.js?v=8913ceeeb8';
import {
  applyScheme,
  applyTheme,
  pushRecent,
  setInspect,
  setSectionFocus,
  syncSchemeInputs,
} from './habillage.js?v=39c29a9e63';
import { renderGenerated } from './rendu.js?v=82aa0a4420';

etat.activeSceneId = '';

function slugifyScene(name) {
  var s = String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return s || 'scene';
}

function readScenes() {
  try {
    var raw = localStorage.getItem(SCENES_KEY);
    var list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function writeScenes(list) {
  write(SCENES_KEY, JSON.stringify(list.slice(0, 12)));
}

function captureSceneState() {
  return {
    app: etat.currentTheme.id,
    scheme: etat.currentScheme,
    lang: etat.lang,
    density: etat.currentDensity,
    pair: etat.pairA && etat.pairB ? etat.pairA + ',' + etat.pairB : '',
    inspect: etat.inspectOn ? '1' : '',
    section: etat.sectionFocus || '',
    hash: (location.hash || '').replace(/^#/, ''),
  };
}

function applySceneState(state) {
  if (!state || typeof state !== 'object') return;
  if (state.lang && LANGS.indexOf(state.lang) !== -1) {
    etat.lang = state.lang;
    write(LANG_KEY, etat.lang);
    applyLang(etat.lang);
  }
  if (state.density) etat.currentDensity = applyDensity(state.density);
  if (state.scheme) {
    etat.currentScheme = state.scheme;
    write(SCHEME_KEY, etat.currentScheme);
  }
  if (state.app) {
    var theme = themeById(state.app);
    etat.currentTheme = theme;
    write(APP_KEY, theme.id);
    pushRecent(theme.id);
  }
  if (state.pair && state.pair.indexOf(',') !== -1) {
    var parts = state.pair.split(',');
    etat.pairA = parts[0] || etat.pairA;
    etat.pairB = parts[1] || etat.pairB;
    write(PAIR_A_KEY, etat.pairA);
    write(PAIR_B_KEY, etat.pairB);
  }
  applyScheme(etat.currentScheme, etat.currentTheme);
  syncSchemeInputs(etat.currentScheme, etat.currentTheme);
  applyTheme(etat.currentTheme);
  setInspect(state.inspect === '1');
  setSectionFocus(state.section || '');
  if (state.hash) {
    var el = document.getElementById(state.hash);
    if (el) el.scrollIntoView({ block: 'start' });
  }
  renderGenerated();
  syncUrl();
}

function sceneUrl(scene) {
  var url = new URL(location.href);
  var st = scene.state || {};
  url.searchParams.set('scene', scene.id);
  url.searchParams.set('app', st.app || 'generic');
  url.searchParams.set('scheme', st.scheme || 'system');
  if (st.lang) url.searchParams.set('lang', st.lang);
  else url.searchParams.delete('lang');
  setOrDrop(url, 'density', st.density === 'comfort' ? '' : st.density || '');
  setOrDrop(url, 'pair', st.pair || '');
  setOrDrop(url, 'inspect', st.inspect || '');
  setOrDrop(url, 'section', st.section || '');
  url.hash = st.hash ? '#' + st.hash : '';
  return url.toString();
}

function renderScenes() {
  var list = document.getElementById('sr-scene-list');
  if (!list) return;
  list.textContent = '';
  var scenes = readScenes();
  if (!scenes.length) {
    var empty = document.createElement('li');
    empty.textContent = t(
      'ui.scenes.empty',
      'Aucune scène enregistrée sur cet appareil.'
    );
    list.appendChild(empty);
    return;
  }
  scenes.forEach(function (scene) {
    var li = document.createElement('li');
    if (scene.id === etat.activeSceneId)
      li.setAttribute('aria-current', 'true');
    var main = document.createElement('div');
    var title = document.createElement('p');
    title.className = 'sr-scene-title';
    title.textContent = scene.name;
    main.appendChild(title);
    var meta = document.createElement('div');
    meta.className = 'sr-scene-meta';
    ['app', 'scheme', 'section'].forEach(function (key) {
      if (!scene.state || !scene.state[key]) return;
      var chip = document.createElement('span');
      chip.className = 'sr-scene-chip';
      chip.textContent = key + ' · ' + scene.state[key];
      meta.appendChild(chip);
    });
    main.appendChild(meta);
    li.appendChild(main);
    var actions = document.createElement('div');
    actions.className = 'sr-scene-actions';
    var open = document.createElement('button');
    open.type = 'button';
    open.className = 'sr-app-link';
    open.textContent = t('ui.scenes.apply', 'Ouvrir');
    open.addEventListener('click', function () {
      etat.activeSceneId = scene.id;
      applySceneState(scene.state);
      renderScenes();
    });
    var copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'sr-app-link';
    copy.textContent = t('ui.scenes.copy', 'Copier le lien');
    copy.addEventListener('click', function () {
      copyText(sceneUrl(scene)).then(function () {
        copy.textContent = t('ui.copied', 'Copié');
        window.setTimeout(function () {
          copy.textContent = t('ui.scenes.copy', 'Copier le lien');
        }, 1200);
      });
    });
    var del = document.createElement('button');
    del.type = 'button';
    del.className = 'sr-app-link';
    del.textContent = t('ui.scenes.delete', 'Supprimer');
    del.addEventListener('click', function () {
      writeScenes(
        readScenes().filter(function (s) {
          return s.id !== scene.id;
        })
      );
      if (etat.activeSceneId === scene.id) etat.activeSceneId = '';
      renderScenes();
      syncUrl();
    });
    actions.appendChild(open);
    actions.appendChild(copy);
    actions.appendChild(del);
    li.appendChild(actions);
    list.appendChild(li);
  });
}

export function setupScenes() {
  var dialog = document.getElementById('sr-scenes');
  var openBtn = document.getElementById('sr-scenes-open');
  var saveBtn = document.getElementById('sr-scene-save');
  var nameInput = document.getElementById('sr-scene-name');
  if (!dialog || !openBtn) return;
  function openScenes() {
    renderScenes();
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    if (nameInput) nameInput.focus();
  }
  openBtn.addEventListener('click', openScenes);
  if (saveBtn && nameInput) {
    saveBtn.addEventListener('click', function () {
      var name = nameInput.value.trim();
      if (!name) {
        nameInput.focus();
        return;
      }
      var id = slugifyScene(name);
      var scenes = readScenes().filter(function (s) {
        return s.id !== id;
      });
      scenes.unshift({ id: id, name: name, state: captureSceneState() });
      writeScenes(scenes);
      etat.activeSceneId = id;
      nameInput.value = '';
      renderScenes();
      syncUrl();
    });
  }
  var fromUrl = paramOr('scene', '');
  if (fromUrl) etat.activeSceneId = fromUrl;
}
