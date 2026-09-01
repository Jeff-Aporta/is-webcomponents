/**
 * Popovers del data grid: menú de columna, panel de columnas, panel de filtros,
 * menús de densidad y exportación.
 *
 * Viven en el top layer (Popover API) para que no los recorte el scroller del
 * grid, y se colocan con computePosition.
 */

import { computePosition } from './position.js';
import { AGGREGATION_FNS, operatorNeedsInput } from './grid-types.js';

const SUPPORTS_POPOVER = typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype;

export function createPopover(className: string) {
  const el = document.createElement('div');
  el.className = `pop ${className}`;
  el.hidden = true;
  if (SUPPORTS_POPOVER) el.popover = 'manual';
  return el;
}

export function showPopover(el, anchor, placement = 'bottom-end') {
  el.hidden = false;
  if (SUPPORTS_POPOVER && !el.matches(':popover-open')) {
    try { el.showPopover(); } catch { /* ya abierto */ }
  }
  positionPopover(el, anchor, placement);
}

export function positionPopover(el: HTMLElement, anchor, placement = 'bottom-end') {
  if (el.hidden || !anchor) return;
  const result = computePosition({
    anchor,
    popupEl: el,
    placement,
    distance: 4,
    flip: true,
    shift: true,
    strategy: 'fixed',
    boundary: 'viewport',
  });
  if (!result) return;
  Object.assign(el.style, { top: `${result.top}px`, left: `${result.left}px` });
}

export function hidePopover(el) {
  if (!el) return;
  if (SUPPORTS_POPOVER && el.matches(':popover-open')) {
    try { el.hidePopover(); } catch { /* noop */ }
  }
  el.hidden = true;
}

/** Lista de acciones: [{ label, icon, action, disabled, checked, separator }] */
export function renderMenu(el, items) {
  const frag = document.createDocumentFragment();
  for (const item of items) {
    if (!item) continue;
    if (item.separator) {
      const hr = document.createElement('div');
      hr.className = 'pop-sep';
      frag.appendChild(hr);
      continue;
    }
    const btn = document.createElement('is-button');
    btn.variant = 'plain';
    btn.className = 'pop-item';
    btn.dataset.action = item.action;
    if (item.value != null) btn.dataset.value = String(item.value);
    if (item.disabled) btn.setAttribute('disabled', '');
    if (item.checked) btn.setAttribute('data-checked', '');
    const icon = document.createElement('span');
    icon.className = 'pop-icon';
    icon.setAttribute('aria-hidden', 'true');
    if (item.icon) icon.innerHTML = item.icon;
    const label = document.createElement('span');
    label.className = 'pop-label';
    label.textContent = item.label;
    btn.append(icon, label);
    frag.appendChild(btn);
  }
  el.replaceChildren(frag);
}

/* ── Panel de columnas ────────────────────────────────────────────────── */

export function renderColumnsPanel(el, { columns, isVisible, search: string = '' }) {
  el.replaceChildren();
  const head = document.createElement('div');
  head.className = 'pop-head';
  const search_ = document.createElement('is-input');
  search_.type = 'search';
  search_.className = 'pop-search';
  search_.placeholder = 'Buscar columna';
  search_.setAttribute('aria-label', 'Buscar columna');
  search_.value = search;
  head.appendChild(search_);
  el.appendChild(head);

  const list = document.createElement('div');
  list.className = 'pop-list';
  const needle = search.trim().toLowerCase();
  for (const col of columns) {
    if (col.hideable === false) continue;
    if (needle && !String(col.headerName).toLowerCase().includes(needle)) continue;
    const row = document.createElement('label');
    row.className = 'pop-check';
    const cb = document.createElement('is-checkbox');
    cb.dataset.field = col.field;
    if (isVisible(col.field)) cb.setAttribute('checked', '');
    const label = document.createElement('span');
    label.textContent = col.headerName;
    row.append(cb, label);
    list.appendChild(row);
  }
  el.appendChild(list);

  const foot = document.createElement('div');
  foot.className = 'pop-foot';
  const showAll = document.createElement('is-button');
  showAll.variant = 'plain';
  showAll.className = 'pop-btn';
  showAll.dataset.action = 'show-all';
  showAll.textContent = 'Mostrar todo';
  const hideAll = document.createElement('is-button');
  hideAll.variant = 'plain';
  hideAll.className = 'pop-btn';
  hideAll.dataset.action = 'hide-all';
  hideAll.textContent = 'Ocultar todo';
  foot.append(showAll, hideAll);
  el.appendChild(foot);
}

/* ── Panel de filtros ────────────────────────────────────────────────── */

export function renderFilterPanel(el: HTMLElement, { columns, model }) {
  el.replaceChildren();
  const items = model.items.length ? model.items : [];
  const list = document.createElement('div');
  list.className = 'filter-list';

  items.forEach((item, i: string) => {
    const col = columns.find((c) => c.field === item.field) || columns[0];
    const op = (col?.operators || []).find((o) => o.value === item.operator) || col?.operators?.[0];
    const row = document.createElement('div');
    row.className = 'filter-row-form';
    row.dataset.index = String(i);

    const logic = document.createElement('div');
    logic.className = 'filter-logic';
    if (i === 0) {
      logic.textContent = 'Donde';
    } else if (i === 1) {
      const sel = document.createElement('select');
      sel.className = 'filter-logic-select';
      sel.setAttribute('aria-label', 'Operador lógico');
      for (const value of ['and', 'or']) {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = value === 'and' ? 'Y' : 'O';
        opt.selected = (model.logicOperator || 'and') === value;
        sel.appendChild(opt);
      }
      logic.appendChild(sel);
    } else {
      logic.textContent = (model.logicOperator || 'and') === 'or' ? 'O' : 'Y';
    }
    row.appendChild(logic);

    const del = document.createElement('is-button');
    del.variant = 'plain';
    del.pill = true;
    del.className = 'filter-del';
    del.dataset.action = 'remove-filter';
    del.setAttribute('aria-label', 'Quitar filtro');
    del.textContent = '×';
    row.appendChild(del);

    const colSel = document.createElement('is-select');
    colSel.className = 'filter-col';
    colSel.setAttribute('aria-label', 'Columna');
    for (const c of columns.filter((c) => c.filterable !== false && c.type !== 'actions')) {
      const opt = document.createElement('is-option');
      opt.value = c.field;
      opt.textContent = c.headerName;
      if (c.field === item.field) opt.setAttribute('selected', '');
      colSel.appendChild(opt);
    }
    row.appendChild(colSel);

    const opSel = document.createElement('is-select');
    opSel.className = 'filter-op';
    opSel.setAttribute('aria-label', 'Operador');
    for (const o of col?.operators || []) {
      const opt = document.createElement('is-option');
      opt.value = o.value;
      opt.textContent = o.label;
      if (o.value === item.operator) opt.setAttribute('selected', '');
      opSel.appendChild(opt);
    }
    row.appendChild(opSel);

    row.appendChild(filterValueInput(col, op, item));
    list.appendChild(row);
  });

  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'pop-empty';
    empty.textContent = 'Sin filtros';
    list.appendChild(empty);
  }

  el.appendChild(list);

  const foot = document.createElement('div');
  foot.className = 'pop-foot';
  const addFilter = document.createElement('is-button');
  addFilter.variant = 'plain';
  addFilter.className = 'pop-btn';
  addFilter.dataset.action = 'add-filter';
  addFilter.textContent = '+ Añadir filtro';
  const clearFilters = document.createElement('is-button');
  clearFilters.variant = 'plain';
  clearFilters.className = 'pop-btn';
  clearFilters.dataset.action = 'clear-filters';
  clearFilters.textContent = 'Limpiar';
  foot.append(addFilter, clearFilters);
  el.appendChild(foot);
}

/** El input del valor depende del tipo de columna y del operador. */
export function filterValueInput(col, op, item) {
  const wrap = document.createElement('div');
  wrap.className = 'filter-value';
  if (op && !operatorNeedsInput(op)) {
    wrap.innerHTML = '<span class="filter-novalue">—</span>';
    return wrap;
  }

  const type = op?.inputType || col?.type;
  if (type === 'boolean') {
    const sel = document.createElement('is-select');
    sel.className = 'filter-input';
    sel.setAttribute('aria-label', 'Valor');
    for (const [value, label] of [['', 'cualquiera'], ['true', 'sí'], ['false', 'no']]) {
      const opt = document.createElement('is-option');
      opt.value = value;
      opt.textContent = label;
      if (String(item.value ?? '') === value) opt.setAttribute('selected', '');
      sel.appendChild(opt);
    }
    wrap.appendChild(sel);
    return wrap;
  }

  if (type === 'select' && Array.isArray(col?.valueOptions) && !op?.multiple) {
    const sel = document.createElement('is-select');
    sel.className = 'filter-input';
    sel.setAttribute('aria-label', 'Valor');
    const blank = document.createElement('is-option');
    blank.value = '';
    blank.textContent = 'cualquiera';
    sel.appendChild(blank);
    for (const raw of col.valueOptions) {
      const value = typeof raw === 'object' ? raw.value : raw;
      const label = typeof raw === 'object' ? raw.label : raw;
      const opt = document.createElement('is-option');
      opt.value = String(value);
      opt.textContent = String(label);
      if (String(item.value ?? '') === String(value)) opt.setAttribute('selected', '');
      sel.appendChild(opt);
    }
    wrap.appendChild(sel);
    return wrap;
  }

  const input = document.createElement('is-input');
  input.className = 'filter-input';
  input.setAttribute('aria-label', 'Valor');
  input.type = op?.multiple || op?.range ? 'text' : (type === 'number' ? 'number' : type === 'date' ? 'date' : type === 'dateTime' ? 'datetime-local' : 'text');
  input.placeholder = op?.multiple ? 'a, b, c' : op?.range ? '10 - 20' : 'Valor';
  input.value = Array.isArray(item.value) ? item.value.join(', ') : (item.value ?? '');
  wrap.appendChild(input);
  return wrap;
}

/* ── Menú de agregación por columna ───────────────────────────────────── */

export function aggregationItems(col, current) {
  const out = [{ label: 'Sin agregación', action: 'aggregate', value: '', checked: !current }];
  for (const [key, fn] of Object.entries(AGGREGATION_FNS)) {
    if (fn.types && !fn.types.includes(col.type)) continue;
    out.push({ label: fn.label, action: 'aggregate', value: key, checked: current === key });
  }
  return out;
}
