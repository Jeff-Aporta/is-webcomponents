import { adoptCss } from '../_shared/adopt-css.js';

/**
 * <is-data-grid> — Tabla de datos con sort, selección, paginación y filtro.
 *
 * Props JS: columns [{ field, headerName, sortable?, width? }], rows [object]
 * Attrs: selectable, page-size (default 10), filterable
 * Props: selectedRows (array of row objects), selectedIndices
 * Events: is-sort, is-select, is-page-change
 * CSS parts: table, thead, tbody, pagination
 */

(() => {
  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base" class="base">
      <div part="toolbar" class="toolbar" hidden>
        <input part="filter" class="filter" type="search" placeholder="Filtrar…" aria-label="Filtrar" />
      </div>
      <div class="scroller">
        <table part="table" class="table">
          <thead part="thead" class="thead"></thead>
          <tbody part="tbody" class="tbody"></tbody>
        </table>
      </div>
      <div part="pagination" class="pagination" hidden>
        <button type="button" class="page-btn" data-page="prev" aria-label="Anterior">‹</button>
        <span class="page-info"></span>
        <button type="button" class="page-btn" data-page="next" aria-label="Siguiente">›</button>
      </div>
    </div>
  `;

  const OBSERVED = ['selectable', 'page-size', 'filterable'];

  class IsDataGrid extends HTMLElement {
    static get observedAttributes() { return OBSERVED; }

    #thead;
    #tbody;
    #toolbar;
    #filterInput;
    #pagination;
    #pageInfo;
    #mounted = false;
    #columns = [];
    #rows = [];
    #sortField = null;
    #sortDir = null; // 'asc' | 'desc' | null
    #page = 0;
    #selected = new Set(); // indices in #rows (source indices)
    #filterText = '';

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));
      this.#thead = shadow.querySelector('.thead');
      this.#tbody = shadow.querySelector('.tbody');
      this.#toolbar = shadow.querySelector('.toolbar');
      this.#filterInput = shadow.querySelector('.filter');
      this.#pagination = shadow.querySelector('.pagination');
      this.#pageInfo = shadow.querySelector('.page-info');

      this.#thead.addEventListener('click', this.#onHeaderClick);
      this.#tbody.addEventListener('change', this.#onBodyChange);
      this.#tbody.addEventListener('click', this.#onBodyClick);
      this.#filterInput.addEventListener('input', this.#onFilter);
      this.#pagination.addEventListener('click', this.#onPageClick);
    }

    connectedCallback() {
      this.#mounted = true;
      if (!this.hasAttribute('page-size')) this.setAttribute('page-size', '10');
      this.#syncToolbar();
      this.#render();
    }

    attributeChangedCallback(name, oldVal, newVal) {
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'filterable') this.#syncToolbar();
      if (name === 'page-size') this.#page = 0;
      this.#render();
    }

    get columns() { return this.#columns; }
    set columns(v) {
      this.#columns = Array.isArray(v) ? v.slice() : [];
      this.#page = 0;
      if (this.#mounted) this.#render();
    }

    get rows() { return this.#rows; }
    set rows(v) {
      this.#rows = Array.isArray(v) ? v.slice() : [];
      this.#selected.clear();
      this.#page = 0;
      if (this.#mounted) this.#render();
    }

    get pageSize() {
      const n = Number(this.getAttribute('page-size'));
      return Number.isFinite(n) && n > 0 ? Math.floor(n) : 10;
    }
    set pageSize(v) { this.setAttribute('page-size', String(Math.max(1, Number(v) || 10))); }

    get selectable() { return this.hasAttribute('selectable'); }
    set selectable(v) { this.toggleAttribute('selectable', !!v); }

    get filterable() { return this.hasAttribute('filterable'); }
    set filterable(v) { this.toggleAttribute('filterable', !!v); }

    get selectedIndices() { return [...this.#selected].sort((a, b) => a - b); }
    set selectedIndices(arr) {
      this.#selected = new Set((arr || []).map(Number).filter(n => n >= 0 && n < this.#rows.length));
      if (this.#mounted) this.#render();
      this.#emitSelect();
    }

    get selectedRows() { return this.selectedIndices.map(i => this.#rows[i]); }
    set selectedRows(arr) {
      const set = new Set(arr || []);
      this.#selected = new Set();
      this.#rows.forEach((row, i) => {
        if (set.has(row) || [...set].some(r => r === row)) this.#selected.add(i);
      });
      // match by shallow field equality if object refs differ
      if (!this.#selected.size && arr?.length) {
        this.#rows.forEach((row, i) => {
          if (arr.some(r => r && row && JSON.stringify(r) === JSON.stringify(row))) this.#selected.add(i);
        });
      }
      if (this.#mounted) this.#render();
      this.#emitSelect();
    }

    #emit(name, detail = {}) {
      this.dispatchEvent(new CustomEvent(name, { detail, bubbles: true, composed: true }));
    }

    #emitSelect() {
      this.#emit('is-select', {
        selectedIndices: this.selectedIndices,
        selectedRows: this.selectedRows
      });
    }

    #syncToolbar() {
      this.#toolbar.hidden = !this.filterable;
    }

    #filteredIndices() {
      const q = this.#filterText.trim().toLowerCase();
      const idxs = this.#rows.map((_, i) => i);
      if (!q || !this.filterable) return idxs;
      const fields = this.#columns.map(c => c.field).filter(Boolean);
      return idxs.filter(i => {
        const row = this.#rows[i];
        return fields.some(f => {
          const v = row?.[f];
          return v != null && String(v).toLowerCase().includes(q);
        }) || Object.values(row || {}).some(v => typeof v === 'string' && v.toLowerCase().includes(q));
      });
    }

    #sortedIndices(indices) {
      if (!this.#sortField || !this.#sortDir) return indices;
      const field = this.#sortField;
      const dir = this.#sortDir === 'asc' ? 1 : -1;
      return indices.slice().sort((a, b) => {
        const va = this.#rows[a]?.[field];
        const vb = this.#rows[b]?.[field];
        if (va == null && vb == null) return 0;
        if (va == null) return 1;
        if (vb == null) return -1;
        if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
        return String(va).localeCompare(String(vb), undefined, { numeric: true }) * dir;
      });
    }

    #pageSlice(indices) {
      const size = this.pageSize;
      const totalPages = Math.max(1, Math.ceil(indices.length / size));
      if (this.#page >= totalPages) this.#page = totalPages - 1;
      if (this.#page < 0) this.#page = 0;
      const start = this.#page * size;
      return {
        pageRows: indices.slice(start, start + size),
        total: indices.length,
        totalPages,
        page: this.#page
      };
    }

    #render() {
      this.#renderHeader();
      const filtered = this.#filteredIndices();
      const sorted = this.#sortedIndices(filtered);
      const { pageRows, total, totalPages, page } = this.#pageSlice(sorted);
      this.#renderBody(pageRows);
      this.#renderPagination(total, totalPages, page);
    }

    #renderHeader() {
      const tr = document.createElement('tr');
      if (this.selectable) {
        const th = document.createElement('th');
        th.className = 'col-check';
        th.innerHTML = `<input type="checkbox" class="check-all" aria-label="Seleccionar todo" />`;
        tr.appendChild(th);
      }
      for (const col of this.#columns) {
        const th = document.createElement('th');
        th.setAttribute('part', 'th');
        if (col.width) th.style.width = typeof col.width === 'number' ? `${col.width}px` : col.width;
        const sortable = col.sortable !== false;
        th.dataset.field = col.field || '';
        if (sortable && col.field) {
          th.classList.add('sortable');
          th.tabIndex = 0;
          th.setAttribute('role', 'columnheader');
          let mark = '';
          if (this.#sortField === col.field) {
            mark = this.#sortDir === 'asc' ? ' ▲' : this.#sortDir === 'desc' ? ' ▼' : '';
            th.dataset.sort = this.#sortDir || '';
          }
          th.textContent = (col.headerName || col.field || '') + mark;
        } else {
          th.textContent = col.headerName || col.field || '';
        }
        tr.appendChild(th);
      }
      this.#thead.replaceChildren(tr);

      const checkAll = this.#thead.querySelector('.check-all');
      if (checkAll) {
        const filtered = this.#filteredIndices();
        const allSelected = filtered.length > 0 && filtered.every(i => this.#selected.has(i));
        const some = filtered.some(i => this.#selected.has(i));
        checkAll.checked = allSelected;
        checkAll.indeterminate = some && !allSelected;
        checkAll.addEventListener('change', () => {
          if (checkAll.checked) filtered.forEach(i => this.#selected.add(i));
          else filtered.forEach(i => this.#selected.delete(i));
          this.#render();
          this.#emitSelect();
        });
      }
    }

    #renderBody(pageIndices) {
      const frag = document.createDocumentFragment();
      if (!pageIndices.length) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = this.#columns.length + (this.selectable ? 1 : 0) || 1;
        td.className = 'empty';
        td.textContent = 'Sin datos';
        tr.appendChild(td);
        frag.appendChild(tr);
      } else {
        for (const idx of pageIndices) {
          const row = this.#rows[idx];
          const tr = document.createElement('tr');
          tr.dataset.index = String(idx);
          if (this.#selected.has(idx)) tr.setAttribute('data-selected', '');
          if (this.selectable) {
            const td = document.createElement('td');
            td.className = 'col-check';
            td.innerHTML = `<input type="checkbox" class="row-check" aria-label="Seleccionar fila" ${this.#selected.has(idx) ? 'checked' : ''} />`;
            tr.appendChild(td);
          }
          for (const col of this.#columns) {
            const td = document.createElement('td');
            td.setAttribute('part', 'td');
            const v = row?.[col.field];
            td.textContent = v == null ? '' : String(v);
            tr.appendChild(td);
          }
          frag.appendChild(tr);
        }
      }
      this.#tbody.replaceChildren(frag);
    }

    #renderPagination(total, totalPages, page) {
      const show = total > this.pageSize || totalPages > 1;
      this.#pagination.hidden = !show;
      const from = total ? page * this.pageSize + 1 : 0;
      const to = Math.min(total, (page + 1) * this.pageSize);
      this.#pageInfo.textContent = `${from}–${to} / ${total}`;
      const prev = this.#pagination.querySelector('[data-page="prev"]');
      const next = this.#pagination.querySelector('[data-page="next"]');
      if (prev) prev.disabled = page <= 0;
      if (next) next.disabled = page >= totalPages - 1;
    }

    #cycleSort(field) {
      if (this.#sortField !== field) {
        this.#sortField = field;
        this.#sortDir = 'asc';
      } else if (this.#sortDir === 'asc') {
        this.#sortDir = 'desc';
      } else if (this.#sortDir === 'desc') {
        this.#sortField = null;
        this.#sortDir = null;
      } else {
        this.#sortDir = 'asc';
      }
      this.#page = 0;
      this.#emit('is-sort', { field: this.#sortField, direction: this.#sortDir });
      this.#render();
    }

    #onHeaderClick = (e) => {
      const th = e.target.closest('th.sortable');
      if (!th || e.target.closest('input')) return;
      const field = th.dataset.field;
      if (field) this.#cycleSort(field);
    };

    #onBodyChange = (e) => {
      const input = e.target.closest('.row-check');
      if (!input) return;
      const tr = input.closest('tr');
      const idx = Number(tr?.dataset.index);
      if (!Number.isFinite(idx)) return;
      if (input.checked) this.#selected.add(idx);
      else this.#selected.delete(idx);
      this.#render();
      this.#emitSelect();
    };

    #onBodyClick = (e) => {
      if (!this.selectable) return;
      if (e.target.closest('input')) return;
      const tr = e.target.closest('tr[data-index]');
      if (!tr) return;
      const idx = Number(tr.dataset.index);
      if (this.#selected.has(idx)) this.#selected.delete(idx);
      else this.#selected.add(idx);
      this.#render();
      this.#emitSelect();
    };

    #onFilter = () => {
      this.#filterText = this.#filterInput.value;
      this.#page = 0;
      this.#render();
    };

    #onPageClick = (e) => {
      const btn = e.target.closest('[data-page]');
      if (!btn || btn.disabled) return;
      const dir = btn.dataset.page;
      if (dir === 'prev') this.#page -= 1;
      else if (dir === 'next') this.#page += 1;
      this.#emit('is-page-change', { page: this.#page, pageSize: this.pageSize });
      this.#render();
    };
  }

  if (!customElements.get('is-data-grid')) {
    customElements.define('is-data-grid', IsDataGrid);
  }
  if (typeof window !== 'undefined') window.IsDataGrid = IsDataGrid;
})();
