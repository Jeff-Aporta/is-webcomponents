/**
 * Popovers del data grid: menú de columna, panel de columnas, panel de filtros,
 * menús de densidad y exportación.
 *
 * Viven en el top layer (Popover API) para que no los recorte el scroller del
 * grid, y se colocan con computePosition.
 */

import { computePosition } from './position.js';
import { AGGREGATION_FNS, operatorNeedsInput } from './grid-types.js';
import type { ColumnDef, FilterRule, Operator } from './grid-types.js';

const SUPPORTS_POPOVER = typeof HTMLElement !== 'undefined' && 'popover' in HTMLElement.prototype;

/** Popover: `div` con `.popover = 'manual'` cuando el navegador lo soporta. */
export type GridPopoverEl = HTMLElement & { popover?: string; showPopover?: () => void; hidePopover?: () => void };

export function createPopover(className: string): GridPopoverEl {
  const el = document.createElement('div') as GridPopoverEl;
  el.className = `pop ${className}`;
  el.hidden = true;
  if (SUPPORTS_POPOVER) el.popover = 'manual';
  return el;
}

export function showPopover(el: GridPopoverEl, anchor: HTMLElement | null, placement: string = 'bottom-end'): void {
  el.hidden = false;
  if (SUPPORTS_POPOVER && !el.matches(':popover-open')) {
    try { el.showPopover?.(); } catch { /* ya abierto */ }
  }
  positionPopover(el, anchor, placement);
}

export function positionPopover(el: HTMLElement, anchor: HTMLElement | null, placement: string = 'bottom-end'): void {
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

export function hidePopover(el: GridPopoverEl | null | undefined): void {
  if (!el) return;
  if (SUPPORTS_POPOVER && el.matches(':popover-open')) {
    try { el.hidePopover?.(); } catch { /* noop */ }
  }
  el.hidden = true;
}

/** Item de menú que se renderiza con `renderMenu`. */
export type MenuItem = {
  label?: string;
  icon?: string;
  action?: string;
  value?: string | number | null;
  disabled?: boolean;
  checked?: boolean;
  separator?: boolean;
};

export function renderMenu(el: HTMLElement, items: readonly MenuItem[]): void {
  const frag = document.createDocumentFragment();
  for (const item of items) {
    if (!item) continue;
    if (item.separator) {
      const hr = document.createElement('div');
      hr.className = 'pop-sep';
      frag.appendChild(hr);
      continue;
    }
    const btn = document.createElement('is-button') as HTMLElement & { variant?: string };
    btn.variant = 'plain';
    btn.className = 'pop-item';
    btn.dataset.action = item.action ?? '';
    if (item.value != null) btn.dataset.value = String(item.value);
    if (item.disabled) btn.setAttribute('disabled', '');
    if (item.checked) btn.setAttribute('data-checked', '');
    const icon = document.createElement('span');
    icon.className = 'pop-icon';
    icon.setAttribute('aria-hidden', 'true');
    if (item.icon) icon.innerHTML = item.icon;
    const label = document.createElement('span');
    label.className = 'pop-label';
    label.textContent = item.label ?? '';
    btn.append(icon, label);
    frag.appendChild(btn);
  }
  el.replaceChildren(frag);
}

/* ── Panel de columnas ────────────────────────────────────────────────── */

export type RenderColumnsPanelOpts = {
  columns: readonly ColumnDef[];
  isVisible: (field: string) => boolean;
  search?: string;
};

export function renderColumnsPanel(el: HTMLElement, { columns, isVisible, search: initialSearch = '' }: RenderColumnsPanelOpts): void {
  el.replaceChildren();
  const head = document.createElement('div');
  head.className = 'pop-head';
  const searchEl = document.createElement('is-input') as HTMLElement & { type?: string };
  searchEl.type = 'search';
  searchEl.className = 'pop-search';
  searchEl.setAttribute('placeholder', 'Buscar columna');
  searchEl.setAttribute('aria-label', 'Buscar columna');
  (searchEl as unknown as { value: string }).value = initialSearch;
  head.appendChild(searchEl);
  el.appendChild(head);

  const list = document.createElement('div');
  list.className = 'pop-list';
  const needle = initialSearch.trim().toLowerCase();
  for (const col of columns) {
    if (col.hideable === false) continue;
    if (needle && !String(col.headerName ?? '').toLowerCase().includes(needle)) continue;
    const row = document.createElement('label');
    row.className = 'pop-check';
    const cb = document.createElement('is-checkbox') as HTMLElement & { dataset: DOMStringMap };
    cb.dataset.field = col.field ?? '';
    if (isVisible(col.field ?? '')) cb.setAttribute('checked', '');
    const label = document.createElement('span');
    label.textContent = col.headerName ?? col.field ?? '';
    row.append(cb, label);
    list.appendChild(row);
  }
  el.appendChild(list);

  const foot = document.createElement('div');
  foot.className = 'pop-foot';
  const showAll = document.createElement('is-button') as HTMLElement & { variant?: string };
  showAll.variant = 'plain';
  showAll.className = 'pop-btn';
  showAll.dataset.action = 'show-all';
  showAll.textContent = 'Mostrar todo';
  const hideAll = document.createElement('is-button') as HTMLElement & { variant?: string };
  hideAll.variant = 'plain';
  hideAll.className = 'pop-btn';
  hideAll.dataset.action = 'hide-all';
  hideAll.textContent = 'Ocultar todo';
  foot.append(showAll, hideAll);
  el.appendChild(foot);
}

/* ── Panel de filtros ────────────────────────────────────────────────── */

export type FilterPanelModel = {
  items: FilterRule[];
  logicOperator?: 'and' | 'or';
};

export type RenderFilterPanelOpts = {
  columns: readonly ColumnDef[];
  model: FilterPanelModel;
};

export function renderFilterPanel(el: HTMLElement, { columns, model }: RenderFilterPanelOpts): void {
  el.replaceChildren();
  const items: FilterRule[] = model.items.length ? model.items : [];
  const list = document.createElement('div');
  list.className = 'filter-list';

  items.forEach((item: FilterRule, i: number) => {
    const col: ColumnDef | undefined = columns.find((c) => c.field === item.field) ?? columns[0];
    const op: Operator | undefined = (col?.operators ?? []).find((o) => o.value === item.operator) ?? col?.operators?.[0];
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
      for (const value of ['and', 'or'] as const) {
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

    const del = document.createElement('is-button') as HTMLElement & { variant?: string; pill?: boolean };
    del.variant = 'plain';
    del.pill = true;
    del.className = 'filter-del';
    del.dataset.action = 'remove-filter';
    del.setAttribute('aria-label', 'Quitar filtro');
    del.textContent = '×';
    row.appendChild(del);

    const colSel = document.createElement('is-select') as HTMLElement & { className: string };
    colSel.className = 'filter-col';
    colSel.setAttribute('aria-label', 'Columna');
    for (const c of columns.filter((c) => c.filterable !== false && c.type !== 'actions')) {
      const opt = document.createElement('is-option') as HTMLElement & { value: string; textContent: string };
      opt.value = c.field ?? '';
      opt.textContent = c.headerName ?? c.field ?? '';
      if (c.field === item.field) opt.setAttribute('selected', '');
      colSel.appendChild(opt);
    }
    row.appendChild(colSel);

    const opSel = document.createElement('is-select') as HTMLElement & { className: string };
    opSel.className = 'filter-op';
    opSel.setAttribute('aria-label', 'Operador');
    for (const o of col?.operators ?? []) {
      const opt = document.createElement('is-option') as HTMLElement & { value: string; textContent: string };
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
  const addFilter = document.createElement('is-button') as HTMLElement & { variant?: string };
  addFilter.variant = 'plain';
  addFilter.className = 'pop-btn';
  addFilter.dataset.action = 'add-filter';
  addFilter.textContent = '+ Añadir filtro';
  const clearFilters = document.createElement('is-button') as HTMLElement & { variant?: string };
  clearFilters.variant = 'plain';
  clearFilters.className = 'pop-btn';
  clearFilters.dataset.action = 'clear-filters';
  clearFilters.textContent = 'Limpiar';
  foot.append(addFilter, clearFilters);
  el.appendChild(foot);
}

/** El input del valor depende del tipo de columna y del operador. */
export function filterValueInput(col: ColumnDef | undefined, op: Operator | undefined, item: FilterRule): HTMLElement {
  const wrap = document.createElement('div');
  wrap.className = 'filter-value';
  if (op && !operatorNeedsInput(op)) {
    wrap.innerHTML = '<span class="filter-novalue">—</span>';
    return wrap;
  }

  const type = op?.inputType || col?.type;
  if (type === 'boolean') {
    const sel = document.createElement('is-select') as HTMLElement & { className: string };
    sel.className = 'filter-input';
    sel.setAttribute('aria-label', 'Valor');
    for (const [value, label] of [['', 'cualquiera'], ['true', 'sí'], ['false', 'no']]) {
      const opt = document.createElement('is-option') as HTMLElement & { value: string; textContent: string };
      opt.value = value;
      opt.textContent = label;
      if (String(item.value ?? '') === value) opt.setAttribute('selected', '');
      sel.appendChild(opt);
    }
    wrap.appendChild(sel);
    return wrap;
  }

  if (type === 'select' && Array.isArray(col?.valueOptions) && !op?.multiple) {
    const sel = document.createElement('is-select') as HTMLElement & { className: string };
    sel.className = 'filter-input';
    sel.setAttribute('aria-label', 'Valor');
    const blank = document.createElement('is-option') as HTMLElement & { value: string; textContent: string };
    blank.value = '';
    blank.textContent = 'cualquiera';
    sel.appendChild(blank);
    for (const raw of col.valueOptions) {
      const value = typeof raw === 'object' && raw !== null ? (raw as { value: unknown }).value : raw;
      const label = typeof raw === 'object' && raw !== null ? (raw as { label: unknown }).label : raw;
      const opt = document.createElement('is-option') as HTMLElement & { value: string; textContent: string };
      opt.value = String(value);
      opt.textContent = String(label);
      if (String(item.value ?? '') === String(value)) opt.setAttribute('selected', '');
      sel.appendChild(opt);
    }
    wrap.appendChild(sel);
    return wrap;
  }

  const input = document.createElement('is-input') as HTMLElement & { className: string; type?: string; placeholder?: string; value?: unknown };
  input.className = 'filter-input';
  input.setAttribute('aria-label', 'Valor');
  input.type = op?.multiple || op?.range ? 'text' : (type === 'number' ? 'number' : type === 'date' ? 'date' : type === 'dateTime' ? 'datetime-local' : 'text');
  input.placeholder = op?.multiple ? 'a, b, c' : op?.range ? '10 - 20' : 'Valor';
  input.value = Array.isArray(item.value) ? item.value.join(', ') : (item.value ?? '');
  wrap.appendChild(input);
  return wrap;
}

/* ── Menú de agregación por columna ───────────────────────────────────── */

export function aggregationItems(col: ColumnDef, current: string | null | undefined): MenuItem[] {
  const out: MenuItem[] = [{ label: 'Sin agregación', action: 'aggregate', value: '', checked: !current }];
  for (const [key, fn] of Object.entries(AGGREGATION_FNS)) {
    if (fn.types && !fn.types.includes(col.type ?? '')) continue;
    out.push({ label: fn.label, action: 'aggregate', value: key, checked: current === key });
  }
  return out;
}
