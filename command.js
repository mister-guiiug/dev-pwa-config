/**
 * Recherche / commande Ctrl+K — primitif vanilla partagé.
 *
 * PROMU, PAS INVENTÉ. Trois pages HTML du parc portaient la même mécanique :
 * showroom (combobox), parc-dashboard (combobox), mister-guiiug.github.io
 * (focus filtre). Ce module sort le commun ; le site fournit items et rendu.
 *
 * SANS DÉPENDANCE. Pas de `document` au chargement — tests Node possibles.
 */

/** @param {EventTarget | null | undefined} target */
export function isEditableTarget(target) {
  if (!target || typeof target !== 'object') return false;
  if ('closest' in target && typeof target.closest === 'function') {
    return Boolean(
      target.closest('input, textarea, select, [contenteditable="true"]')
    );
  }
  const tag = /** @type {{ tagName?: string }} */ (target).tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return Boolean(
    /** @type {{ isContentEditable?: boolean }} */ (target).isContentEditable
  );
}

/** @param {KeyboardEvent} event */
export function isCommandHotkey(event) {
  const mod = event.ctrlKey || event.metaKey;
  if (!mod || event.altKey || event.shiftKey) return false;
  return event.key === 'k' || event.key === 'K';
}

/** @param {KeyboardEvent} event */
export function isSlashHotkey(event) {
  if (event.key !== '/') return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  return !isEditableTarget(event.target);
}

/**
 * @param {number} active
 * @param {number} length
 * @param {1 | -1} delta
 */
export function moveActiveIndex(active, length, delta) {
  if (length <= 0) return -1;
  if (active < 0) return delta > 0 ? 0 : length - 1;
  return Math.max(0, Math.min(length - 1, active + delta));
}

/**
 * @param {{ search?: string, label?: string } | string} item
 * @param {string} query
 */
export function itemMatchesQuery(item, query) {
  const term = String(query ?? '')
    .trim()
    .toLowerCase();
  if (!term) return true;
  if (typeof item === 'string') return item.toLowerCase().includes(term);
  const hay = item.search ?? String(item.label ?? '').toLowerCase();
  return hay.includes(term);
}

/**
 * @template T
 * @param {T[]} items
 * @param {string} query
 * @param {{ limit?: number, match?: (item: T, query: string) => boolean }} [options]
 */
export function filterCommandItems(items, query, options = {}) {
  const match = options.match ?? itemMatchesQuery;
  const limit = options.limit;
  const out = [];
  for (const item of items) {
    if (!match(item, query)) continue;
    out.push(item);
    if (limit != null && out.length >= limit) break;
  }
  return out;
}

/**
 * @param {HTMLInputElement | HTMLTextAreaElement} input
 * @param {{ select?: boolean }} [options]
 */
export function focusCommandInput(input, options = {}) {
  if (!input) return;
  input.focus();
  if (options.select !== false && typeof input.select === 'function') {
    input.select();
  }
}

/**
 * @param {HTMLInputElement | HTMLTextAreaElement} input
 * @param {{
 *   slash?: boolean,
 *   select?: boolean,
 *   onOpen?: () => void,
 *   target?: Document | Window | HTMLElement,
 * }} [options]
 * @returns {() => void}
 */
export function bindSearchHotkeys(input, options = {}) {
  const {
    slash = true,
    select = true,
    onOpen,
    target = typeof document !== 'undefined' ? document : null,
  } = options;
  if (!input || !target) return () => {};

  const open = () => {
    focusCommandInput(input, { select });
    onOpen?.();
  };

  /** @param {KeyboardEvent} event */
  const onKeyDown = event => {
    if (isCommandHotkey(event)) {
      event.preventDefault();
      open();
      return;
    }
    if (slash && isSlashHotkey(event)) {
      event.preventDefault();
      open();
    }
  };

  target.addEventListener('keydown', onKeyDown);
  return () => target.removeEventListener('keydown', onKeyDown);
}

/**
 * Combobox ARIA : flèches / Entrée / Échap / blur.
 *
 * @template T
 * @param {{
 *   input: HTMLInputElement,
 *   list: HTMLElement,
 *   getItems: (query: string) => T[],
 *   onSelect: (item: T) => void,
 *   renderItem?: (item: T, index: number, selected: boolean) => HTMLElement,
 *   emptyLabel?: string | null,
 *   emptyClass?: string,
 *   idPrefix?: string,
 *   blurDelayMs?: number,
 *   hotkeys?: boolean,
 *   slash?: boolean,
 *   clearOnSelect?: boolean,
 * }} options
 */
export function attachCommandCombobox(options) {
  const {
    input,
    list,
    getItems,
    onSelect,
    renderItem,
    emptyLabel = null,
    emptyClass = 'cmd-empty',
    idPrefix = 'cmd-hit',
    blurDelayMs = 120,
    hotkeys = true,
    slash = true,
    clearOnSelect = true,
  } = options;

  /** @type {T[]} */
  let hits = [];
  let active = -1;
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let blurTimer;

  const close = () => {
    hits = [];
    active = -1;
    list.textContent = '';
    list.hidden = true;
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  };

  const syncActive = () => {
    list.querySelectorAll('[role="option"]').forEach((el, i) => {
      el.setAttribute('aria-selected', String(i === active));
    });
    if (active >= 0 && hits[active]) {
      input.setAttribute('aria-activedescendant', `${idPrefix}-${active}`);
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  };

  /** @param {T} item @param {number} index @param {boolean} selected */
  const defaultRender = (item, index, selected) => {
    const li = document.createElement('li');
    li.id = `${idPrefix}-${index}`;
    li.setAttribute('role', 'option');
    li.setAttribute('aria-selected', String(selected));
    const label =
      typeof item === 'string'
        ? item
        : String(
            /** @type {{ label?: string, name?: string }} */ (item).label ??
              /** @type {{ name?: string }} */ (item).name ??
              item
          );
    li.textContent = label;
    return li;
  };

  /** @param {T} item */
  const select = item => {
    close();
    if (clearOnSelect) input.value = '';
    onSelect(item);
  };

  const render = () => {
    list.textContent = '';
    if (!hits.length) {
      if (emptyLabel == null) {
        close();
        return;
      }
      const empty = document.createElement('li');
      empty.className = emptyClass;
      empty.setAttribute('role', 'presentation');
      empty.textContent = emptyLabel;
      list.appendChild(empty);
      list.hidden = false;
      input.setAttribute('aria-expanded', 'true');
      input.removeAttribute('aria-activedescendant');
      return;
    }

    const paint = renderItem ?? defaultRender;
    hits.forEach((item, i) => {
      const li = paint(item, i, i === active);
      if (!li.id) li.id = `${idPrefix}-${i}`;
      if (!li.getAttribute('role')) li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', String(i === active));
      li.addEventListener('mousedown', event => {
        event.preventDefault();
        select(item);
      });
      list.appendChild(li);
    });
    list.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    syncActive();
  };

  const refresh = () => {
    const query = input.value;
    if (!String(query).trim()) {
      close();
      return;
    }
    hits = getItems(query) ?? [];
    active = hits.length ? 0 : -1;
    render();
  };

  const onInput = () => refresh();

  /** @param {KeyboardEvent} event */
  const onKeyDown = event => {
    if (event.key === 'ArrowDown' && hits.length) {
      event.preventDefault();
      active = moveActiveIndex(active, hits.length, 1);
      render();
    } else if (event.key === 'ArrowUp' && hits.length) {
      event.preventDefault();
      active = moveActiveIndex(active, hits.length, -1);
      render();
    } else if (event.key === 'Enter') {
      const item = hits[active >= 0 ? active : 0];
      if (item) {
        event.preventDefault();
        select(item);
      }
    } else if (event.key === 'Escape') {
      close();
      input.blur();
    }
  };

  const onBlur = () => {
    blurTimer = setTimeout(close, blurDelayMs);
  };

  const onFocus = () => {
    if (blurTimer) clearTimeout(blurTimer);
  };

  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKeyDown);
  input.addEventListener('blur', onBlur);
  input.addEventListener('focus', onFocus);

  const disposeHotkeys = hotkeys
    ? bindSearchHotkeys(input, { slash })
    : () => {};

  return {
    close,
    refresh,
    dispose() {
      disposeHotkeys();
      input.removeEventListener('input', onInput);
      input.removeEventListener('keydown', onKeyDown);
      input.removeEventListener('blur', onBlur);
      input.removeEventListener('focus', onFocus);
      if (blurTimer) clearTimeout(blurTimer);
      close();
    },
    getActiveIndex: () => active,
    getHits: () => hits.slice(),
  };
}
