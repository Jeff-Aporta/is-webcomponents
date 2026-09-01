/**
 * <is-ag-grid> — Data grid avanzado (estilo ag-grid.com en vanilla web component).
 *
 * Reimplementación mayor basada en el motor datagrid-core (migrada del
 * mimicus-react @Jeff-Aporta). Soporta:
 *   - Columnas declaradas (field/header/type/width/align/sortable/resizable/pinned/flex/hide).
 *   - Multi-sort (clic en header, shift+clic para añadir a la cadena).
 *   - Reorder por drag, resize por drag, hide/show via HeaderMenu.
 *   - Filtros por columna (text/number/date/set) con FilterPopover.
 *   - Quick filter global.
 *   - Selección (single/multiple) con checkbox en header, shift+click rango.
 *   - Paginación con tamaño configurable.
 *   - Virtual scroll de filas (rowWindow del core).
 *   - Grouping con agregación (sum/avg/min/max/count/first/last).
 *   - Density (compact/normal/comfortable).
 *   - Edición inline (prompt legacy `editable: true`).
 *   - Export CSV con BOM (sólo seleccionadas si hay selección).
 *   - Persistencia de estado (api.serializeState / loadState).
 *   - Navegación por teclado (arrow / home / end / pgup / pgdn / space / enter / esc).
 *   - API retrocompatible: g.api.goToPage, setFilter, setQuickFilter, refresh, etc.
 *
 * Atributos
 *   rows                  JSON array o <script type="application/json">.
 *   columns               JSON array o <script type="application/json">.
 *   get-row-id            nombre de la propiedad a usar como id (default `id`).
 *   page-size, page-size-options, pagination
 *   height (vía CSS, sobreescribible)
 *   row-selection         single | multiple  (default: multiple si selectable, else none)
 *   selectable            checkbox por fila
 *   density               compact | normal | comfortable  (default: normal)
 *   virtual               siempre true (este componente siempre virtualiza)
 *   quick-filter
 *   group-by              lista CSV de colId iniciales
 *   remember-state        persiste cambios en sessionStorage (storage-key derivado)
 *   storage-key           override del key anterior
 *   toolbar               "true" | "false" muestra la toolbar (default true)
 *   theme                 auto | light | dark (default auto)
 *
 * Tokens CSS
 *   --is-grid-row-h       alto en px/rem (default 2.5rem)
 *   --is-grid-header-bg
 *   --is-grid-stripe
 *   --is-grid-accent-row
 *   --is-grid-row-hover
 *   --is-grid-selected
 *   --is-grid-selected-bar
 *
 * Eventos
 *   is-sort-change        detail: { column, direction }
 *   is-filter-change      detail: { column, op, value }
 *   is-quick-filter       detail: { value }
 *   is-cell-click         detail: { row, column, value }
 *   is-cell-edit          detail: { row, column, oldValue, newValue }
 *   is-row-select         detail: { rows: [...] }
 *   is-action             detail: { row, action, column }
 *   is-page-change        detail: { page, pageSize }
 *   is-column-reorder     detail: { colId, toIndex }
 *   is-column-resize      detail: { colId, width }
 *   is-column-pin         detail: { colId, side }
 *   is-column-hide        detail: { colId }
 *   is-state-saved        detail: { json }
 *   is-state-loaded       detail: { columns, sortModel, ... }
 *
 * API
 *   grid.rows             array vivo (read-only)
 *   grid.columns          column defs (read-only)
 *   grid.api.getState()   GridState (snapshot)
 *   grid.api.getRows() / getAllRows() / getDisplayedRows()
 *   grid.api.goToPage(n) / setPage(n) / setPageSize(n)
 *   grid.api.setQuickFilter(text) / setFilter(colId, op, value) / clearFilter(colId)
 *   grid.api.setFilterModel(model) / setSortModel(model)
 *   grid.api.toggleSort(colId, additive)
 *   grid.api.pinColumn(colId, side) / hideColumn(colId, hide?)
 *   grid.api.resizeColumn(colId, width) / autosizeColumn(colId)
 *   grid.api.reorderColumn(colId, toIndex)
 *   grid.api.setRowGroupCols(colIds) / addRowGroupCol / removeRowGroupCol
 *   grid.api.toggleGroup(groupId) / expandAllGroups() / collapseAllGroups()
 *   grid.api.getSelectedRows() / selectAll() / clearSelection()
 *   grid.api.setSelection(ids)
 *   grid.api.setDensity('compact')
 *   grid.api.exportCSV(filename?, opts?)
 *   grid.api.serializeState() / loadState(json)
 *   grid.api.refresh()
 */

import { ElementBase } from '../../core/element-base.js';
import {
  getComponentPrefs, removeComponentPrefs, replaceComponentPrefs,
} from '../_shared/prefs.js';
import { escapeHtml } from '../_shared/dom-utils.js';
import { adoptCss, defineElement, emit } from '../../core/element.js';
import { hasSlotted } from '../_shared/dom-utils.js';
import '../media/icon.js';
import '../forms/checkbox.js';
import '../forms/select.js';
import '../forms/option.js';
import './datagrid-core/index.js';

import {
  ColumnType,
  Density,
  SelectionMode,
  PinSide,
  HeaderCheckboxState,
  DEFAULT_PAGE_SIZE,
  DEFAULT_HEADER_HEIGHT,
  DENSITY_ROW_HEIGHT,
  toggleRowSelection as toggleRowSelectionCore,
  selectAll as selectAllCore,
  clearSelection as clearSelectionCore,
  headerCheckboxState as headerCheckboxStateCore,
  rowWindow,
  columnLayout,
  colWindow,
  applyFlex,
  orderedForLayout,
  resolveColumns,
  rowsToCsv,
  createGridModel,
  getCellValue,
  formatCellValue,
  cellText,
  toColumnDefs,
  groupHeaderRows,
  createServerSideDatasource,
  createFakeLista,
} from './datagrid-core/index.js';
import type { ColumnDef, GridApi, RowData } from './datagrid-core/types.js';
const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <style>
    :host { display: block; }
  </style>
  <div class="mim-dg" part="root" data-density="normal">
    <header class="mim-dg__toolbar" part="toolbar" role="toolbar">
      <slot name="header-extra"></slot>
      <span class="mim-dg__toolbar-spacer"></span>
      <label class="mim-dg__quick">
        <is-icon icon="mdi:magnify"></is-icon>
        <is-input class="mim-dg__quick-input" type="search" placeholder="Buscar…" aria-label="Búsqueda rápida"></is-input>
      </label>
      <div class="mim-dg__density" role="group" aria-label="Densidad">
        <is-button variant="plain" pill class="mim-dg__density-btn" data-density="compact" title="Compacta" aria-label="Compacta">
          <is-icon icon="mdi:view-headline"></is-icon>
        </is-button>
        <is-button variant="plain" pill class="mim-dg__density-btn is-active" data-density="normal" title="Normal" aria-label="Normal">
          <is-icon icon="mdi:view-sequential"></is-icon>
        </is-button>
        <is-button variant="plain" pill class="mim-dg__density-btn" data-density="comfortable" title="Cómoda" aria-label="Cómoda">
          <is-icon icon="mdi:view-stream"></is-icon>
        </is-button>
      </div>
      <is-button variant="plain" color="neutral" class="mim-dg__tool-btn mim-dg__columns-btn" title="Columnas" aria-label="Columnas">
        <is-icon icon="mdi:view-column-outline"></is-icon>
      </is-button>
      <is-button variant="plain" color="neutral" class="mim-dg__tool-btn mim-dg__reset-btn" title="Reiniciar personalización" aria-label="Reiniciar personalización" hidden>
        <is-icon icon="mdi:backup-restore"></is-icon>
      </is-button>
      <is-button variant="plain" color="neutral" class="mim-dg__tool-btn mim-dg__export-btn" title="Exportar CSV">
        <is-icon icon="mdi:file-delimited-outline"></is-icon>
        <span class="mim-dg__tool-btn-label">CSV</span>
      </is-button>
    </header>

    <div class="mim-dg__group-panel" part="group-panel">
      <span class="mim-dg__group-panel-label">Agrupar:</span>
      <span class="mim-dg__group-chips"></span>
      <span class="mim-dg__group-hint">arrastra una columna aquí</span>
      <div class="mim-dg__group-panel-actions">
        <is-button variant="plain" pill class="mim-dg__group-panel-btn" data-action="expand-all" title="Expandir todos" aria-label="Expandir todos">
          <is-icon icon="mdi:unfold-more-horizontal"></is-icon>
        </is-button>
        <is-button variant="plain" pill class="mim-dg__group-panel-btn" data-action="collapse-all" title="Plegar todos" aria-label="Plegar todos">
          <is-icon icon="mdi:unfold-less-horizontal"></is-icon>
        </is-button>
      </div>
    </div>

    <div class="mim-dg__main">
      <div class="mim-dg__viewport" part="viewport" role="grid" tabindex="0">
        <div class="mim-dg__group-header" part="group-header"></div>
        <div class="mim-dg__header-row" part="header"></div>
        <div class="mim-dg__body" part="body"></div>
      </div>

      <aside class="mim-dg__sidebar" part="sidebar" hidden>
        <div class="mim-dg__panel" part="tool-panel" hidden></div>
        <div class="mim-dg__sidebar-tabs" role="tablist" aria-orientation="vertical">
          <is-button variant="plain" pill class="mim-dg__sidebar-tab" role="tab" data-panel="columns" aria-selected="false" title="Columnas">
            <is-icon icon="mdi:view-column-outline"></is-icon><span>Columnas</span>
          </is-button>
          <is-button variant="plain" pill class="mim-dg__sidebar-tab" role="tab" data-panel="filters" aria-selected="false" title="Filtro">
            <is-icon icon="mdi:filter-outline"></is-icon><span>Filtro</span>
          </is-button>
        </div>
      </aside>
    </div>

    <footer class="mim-dg__footer" part="footer">
      <span class="mim-dg__count" part="count"></span>
      <span class="mim-dg__footer-spacer"></span>
      <label class="mim-dg__page-size">
        Filas:
        <is-select class="mim-dg__page-size-select" aria-label="Filas por página">
          <is-option value="25">25</is-option>
          <is-option value="50">50</is-option>
          <is-option value="100">100</is-option>
          <is-option value="200">200</is-option>
        </is-select>
      </label>
      <is-button variant="plain" pill class="mim-dg__pager-btn" data-action="page-prev" aria-label="Anterior">
        <is-icon icon="mdi:chevron-left"></is-icon>
      </is-button>
      <span class="mim-dg__pager-info"></span>
      <is-button variant="plain" pill class="mim-dg__pager-btn" data-action="page-next" aria-label="Siguiente">
        <is-icon icon="mdi:chevron-right"></is-icon>
      </is-button>
    </footer>
  </div>
`;

const LEGACY_OP_MAP = {
  contains: 'contains',
  eq: 'equals',
  neq: 'notEqual',
  gt: 'gt',
  gte: 'gte',
  lt: 'lt',
  lte: 'lte',
  starts: 'startsWith',
  ends: 'endsWith',
};

const TEXT_OP_LABELS = {
  contains: 'Contiene',
  notContains: 'No contiene',
  equals: 'Igual a',
  notEqual: 'Distinto de',
  startsWith: 'Empieza con',
  endsWith: 'Termina con',
  blank: 'Vacío',
  notBlank: 'No vacío',
};

const NUM_OP_LABELS = {
  eq: '=', neq: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤',
  inRange: 'Entre', blank: 'Vacío', notBlank: 'No vacío',
};

const DATE_OP_LABELS = {
  eq: 'Igual a', before: 'Antes de', after: 'Después de', inRange: 'Entre',
};

const HEADER_MENU_ICONS = {
  sortAsc: 'mdi:sort-ascending',
  sortDesc: 'mdi:sort-descending',
  sortRemove: 'mdi:sort-variant-remove',
  filter: 'mdi:filter-outline',
  pinLeft: 'mdi:pin',
  pinRight: 'mdi:pin',
  unpin: 'mdi:pin-off-outline',
  autosize: 'mdi:arrow-expand-horizontal',
  group: 'mdi:group',
  ungroup: 'mdi:ungroup',
  hide: 'mdi:eye-off-outline',
};

export class IsAgGrid extends ElementBase {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
    'header-height': '--is-grid-header-h',
    'header-bg': { prop: '--is-grid-header-bg', onlyColorValues: true },
    'stripe-color': { prop: '--is-grid-stripe', onlyColorValues: true },
    'row-hover': { prop: '--is-grid-row-hover', onlyColorValues: true },
    'selected-color': { prop: '--is-grid-selected', onlyColorValues: true },
    };

  static TEMPLATE = TEMPLATE;
  static get observedAttributes(): string[] {
    return [
      'rows', 'columns', 'get-row-id',
      'page-size', 'page-size-options', 'pagination',
      'row-selection', 'selectable', 'density',
      'quick-filter', 'group-by',
      'remember-state', 'storage-key',
      'toolbar', 'theme',
      ...IsAgGrid.styleAttrNames,
    ];
  }

  /**
   * El motor. Es `null` hasta que `connectedCallback` lo crea, y todo el
   * fachada publica lo comprueba antes de usarlo (`#api?.` o un `return`
   * temprano); sin el tipo, el campo quedaba en `never[]` y sus 40 metodos
   * no existian para el compilador.
   */
  #api: GridApi | null = null;
  /** true si filas/columnas llegaron por `api.setRows/setColumns` antes del init. */
  #externalData = false;
  #rawRows: RowData[] = [];
  #rawColumns: ColumnDef[] = [];
  #getRowId: ((row: RowData, index: number) => string) | null = null;
  #pageSize = DEFAULT_PAGE_SIZE;
  #pageSizeOptions = [25, 50, 100, 200];
  #showToolbar = true;
  #rememberState = false;
  #storageKey = '';
  #density = Density.NORMAL;
  #isPaginated = false;
  #page = 0;
  /** Forma legada `{ colId, op, value }`. */
  #currentFilter: Record<string, unknown> | null = null;
  #currentSelectionMode = SelectionMode.NONE;
  #viewport!: HTMLElement;
  #headerRow!: HTMLElement;
  #body!: HTMLElement;
  #countEl!: HTMLElement;
  #pagerInfo!: HTMLElement;
  #pageSizeSelect!: HTMLElement;
  #densityBtns!: NodeListOf<HTMLElement>;
  #toolbar!: HTMLElement;
  #groupPanel!: HTMLElement;
  #groupChips!: HTMLElement;
  #headerMenuEl!: HTMLElement;
  #filterPopoverEl!: HTMLElement;
  #scrollTop = 0;
  #lastRangeFrom: string | null = null;
  #focusRow = -1;
  #ro!: ResizeObserver;
  #unsubscribe: (() => void) | null = null;
  #stateLoaded = false;

  constructor() {
    super();
    this.initShadow();
    adoptCss(this.shadowRoot!, import.meta.url);
    ensureFloatingStyles();
    this.#cacheRefs();
    this.#bindStaticEvents();
  }

  #cacheRefs() {
    const root = this.shadowRoot!;
    this.#viewport = root.querySelector<HTMLElement>('.mim-dg__viewport')!;
    this.#headerRow = root.querySelector<HTMLElement>('.mim-dg__header-row')!;
    this.#body = root.querySelector<HTMLElement>('.mim-dg__body')!;
    this.#countEl = root.querySelector<HTMLElement>('.mim-dg__count')!;
    this.#pagerInfo = root.querySelector<HTMLElement>('.mim-dg__pager-info')!;
    this.#pageSizeSelect = root.querySelector<HTMLElement>('.mim-dg__page-size-select')!;
    this.#densityBtns = root.querySelectorAll<HTMLElement>('.mim-dg__density-btn');
    this.#toolbar = root.querySelector<HTMLElement>('.mim-dg__toolbar')!;
    this.#groupPanel = root.querySelector<HTMLElement>('.mim-dg__group-panel')!;
    this.#groupChips = root.querySelector<HTMLElement>('.mim-dg__group-chips')!;
  }

  #bindStaticEvents() {
    // Quick filter
    const qf = this.shadowRoot!.querySelector<HTMLElement>('.mim-dg__quick-input');
    qf.addEventListener('input', () => {
      if (!this.#api) return;
      this.#api.setQuickFilter(qf.value);
      emit(this, 'is-quick-filter', { value: qf.value });
    });

    // Density
    this.#densityBtns.forEach((btn: HTMLElement) => {
      btn.addEventListener('click', () => {
        const d = btn.dataset.density;
        if (d) this.setAttribute('density', d);
      });
    });

    // Export CSV
    this.shadowRoot!.querySelector<HTMLElement>('.mim-dg__export-btn').addEventListener('click', () => {
      this.api.exportCSV();
    });

    // Panel lateral de columnas
    this.shadowRoot!.querySelector<HTMLElement>('.mim-dg__columns-btn').addEventListener('click', () => {
      this.#toggleSidePanel('columns');
    });
    this.shadowRoot!.querySelector<HTMLElement>('.mim-dg__sidebar-tabs').addEventListener('click', (e) => {
      const tab = e.target.closest('[data-panel]');
      if (tab) this.#toggleSidePanel(tab.dataset.panel);
    });
    this.shadowRoot!.querySelector<HTMLElement>('.mim-dg__panel').addEventListener('is-change', (e) => {
      const item = e.target.closest('[data-col-id]');
      if (!item) return;
      this.#api?.hideColumn(item.dataset.colId, !e.detail.checked);
      this.#render();
      this.#renderBody();
      this.#renderColumnsPanel();
    });

    // Reiniciar personalización persistida
    this.shadowRoot!.querySelector<HTMLElement>('.mim-dg__reset-btn').addEventListener('click', () => {
      this.api.resetPersistedState();
    });

    // Footer pagination
    this.shadowRoot!.querySelector<HTMLElement>('.mim-dg__footer').addEventListener('click', (e) => {
      // Los controles son <is-button>: el click se retarget al host, así que
      // buscar `button` no encuentra nada.
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'page-prev') this.#goToPage(this.#page - 1);
      if (action === 'page-next') this.#goToPage(this.#page + 1);
    });
    this.#pageSizeSelect.addEventListener('change', () => {
      this.#api?.setPageSize(Number(this.#pageSizeSelect.value));
    });

    // Viewport scroll
    this.#viewport.addEventListener('scroll', () => {
      this.#scrollTop = this.#viewport.scrollTop;
      this.#renderBody();
    });

    // Viewport keyboard
    this.#viewport.addEventListener('keydown', (e) => this.#onKeyDown(e));

    // Viewport click delegation (sort, action, edit)
    this.#viewport.addEventListener('click', (e) => this.#onViewportClick(e));

    // Group panel (chips + expand/collapse). El ungroup vive aquí: el chip
    // está fuera de #viewport, así que #onViewportClick nunca lo ve.
    this.#groupPanel.addEventListener('click', (e) => {
      if (!this.#api) return;
      const ungroup = e.target.closest('[data-act="ungroup"]');
      if (ungroup) {
        e.preventDefault();
        e.stopPropagation();
        const colId = ungroup.dataset.colId;
        if (colId) this.#api.removeRowGroupCol(colId);
        return;
      }
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      if (btn.dataset.action === 'expand-all') this.#api.expandAllGroups();
      if (btn.dataset.action === 'collapse-all') this.#api.collapseAllGroups();
    });
    let dropActive = false;
    this.#groupPanel.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.#groupPanel.classList.add('is-over');
    });
    this.#groupPanel.addEventListener('dragleave', () => {
      this.#groupPanel.classList.remove('is-over');
    });
    this.#groupPanel.addEventListener('drop', (e) => {
      e.preventDefault();
      this.#groupPanel.classList.remove('is-over');
      const colId = e.dataTransfer?.getData('application/x-is-col-id');
      if (colId) this.#api?.addRowGroupCol(colId);
    });

    // Resize
    this.#ro = new ResizeObserver(() => { if (this.#api) this.#renderBody(); });
    this.#ro.observe(this.#viewport);

    // Header resize pointerdown (delegated)
    this.#headerRow.addEventListener('pointerdown', (e) => {
      if (!this.#api) return;
      const resizer = e.target.closest('.mim-dg__resizer');
      if (!resizer) return;
      e.preventDefault();
      e.stopPropagation();
      const colId = resizer.dataset.colId;
      const col = this.#api.getColumns().find((c) => c.colId === colId);
      if (!col) return;
      const startX = e.clientX;
      const startW = col.width;
      const onMove = (ev) => {
        this.#api?.resizeColumn(colId, startW + (ev.clientX - startX));
      };
      const onUp = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        const w = this.#api?.getColumns().find((c) => c.colId === colId)?.width;
        if (w != null) emit(this, 'is-column-resize', { colId, width: w });
      };
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
    });

    // Drag handle for column reorder
    this.#headerRow.addEventListener('dragstart', (e) => {
      const head = e.target.closest('.mim-dg__head-cell');
      if (!head) return;
      const colId = head.dataset.colId;
      if (!colId) return;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/x-is-col-id', colId);
      e.dataTransfer.setData('text/plain', colId);
    });
    this.#headerRow.addEventListener('dragover', (e) => {
      const head = e.target.closest('.mim-dg__head-cell');
      if (!head) return;
      if (!e.dataTransfer.types.includes('application/x-is-col-id')) return;
      e.preventDefault();
    });
    this.#headerRow.addEventListener('drop', (e) => {
      if (!this.#api) return;
      const head = e.target.closest('.mim-dg__head-cell');
      if (!head) return;
      const sourceColId = e.dataTransfer.getData('application/x-is-col-id');
      const targetColId = head.dataset.colId;
      if (!sourceColId || !targetColId || sourceColId === targetColId) return;
      e.preventDefault();
      const cols = this.#api.getColumns();
      const toIndex = cols.findIndex((c) => c.colId === targetColId);
      if (toIndex >= 0) this.#api.reorderColumn(sourceColId, toIndex);
      emit(this, 'is-column-reorder', { colId: sourceColId, toIndex });
    });
  }

  async onConnected() {
    await this.#readData();
    this.#syncPageSize();
    this.#syncAttrs();
    this.#initModel();
    this.#stateLoaded = false;
    if (this.#rememberState) {
      const key = this.#storageKey || this.#defaultStorageKey();
      const saved = getComponentPrefs('is-ag-grid', key);
      if (saved && this.#api) this.#api.loadState(saved);
    }
    this.#render();
    this.#renderBody();
    this.#bindModelSubscription();
  }

  onDisconnected() {
    this.#ro?.disconnect();
    this.#unsubscribe?.();
  }

  async onAttributeChanged(name: string, _oldVal: string | null, newVal: string | null) {
    if (name === 'rows' || name === 'columns' || name === 'get-row-id') {
      await this.#readData();
      this.#initModel();
      this.#render();
    } else if (name === 'page-size-options') {
      this.#syncPageSize();
      this.#render();
    } else if (name === 'page-size') {
      this.#pageSize = Number(newVal) || DEFAULT_PAGE_SIZE;
      this.#api?.setPageSize(this.#pageSize);
    } else if (name === 'pagination') {
      this.#isPaginated = this.hasAttribute('pagination');
      this.#api?.getState(); // no-op, but ensures state.sync
      this.#render();
    } else if (name === 'density') {
      this.#density = newVal || Density.NORMAL;
      this.#render();
    } else if (name === 'quick-filter') {
      this.#api?.setQuickFilter(newVal || '');
    } else if (name === 'group-by') {
      const cols = (newVal || '').split(',').map((s: string) => s.trim()).filter(Boolean);
      this.#api?.setRowGroupCols(cols);
    } else if (name === 'row-selection' || name === 'selectable') {
      this.#syncSelectionMode();
      this.#render();
    } else if (name === 'toolbar') {
      this.#showToolbar = newVal !== 'false';
      this.#toolbar.style.display = this.#showToolbar ? '' : 'none';
    } else if (name === 'remember-state' || name === 'storage-key') {
      this.#syncStatePersistence();
    }
  }

  #syncAttrs() {
    const mode = this.getAttribute('row-selection');
    if (mode === 'single') this.#currentSelectionMode = SelectionMode.SINGLE;
    else if (mode === 'multiple') this.#currentSelectionMode = SelectionMode.MULTIPLE;
    else if (this.hasAttribute('selectable')) this.#currentSelectionMode = SelectionMode.MULTIPLE;
    else this.#currentSelectionMode = SelectionMode.NONE;

    this.#isPaginated = this.hasAttribute('pagination');
    this.#showToolbar = this.getAttribute('toolbar') !== 'false';
    this.#density = this.getAttribute('density') || Density.NORMAL;
    this.#rememberState = this.hasAttribute('remember-state');
    this.#storageKey = this.getAttribute('storage-key') || '';
    this.#toolbar.style.display = this.#showToolbar ? '' : 'none';
    this.#syncStatePersistence();
  }

  #syncStatePersistence() {
    this.#rememberState = this.hasAttribute('remember-state');
    this.#storageKey = this.getAttribute('storage-key') || '';
    // Sin persistencia no hay nada que reiniciar: el botón sobra.
    const resetBtn = this.shadowRoot?.querySelector<HTMLElement>('.mim-dg__reset-btn');
    if (resetBtn) resetBtn.hidden = !this.#rememberState;
  }

  /** `serializeState()` del core devuelve JSON string; en prefs el snapshot se
   *  guarda como objeto para no anidar un string dentro del JSON raíz. */
  static #parseState(raw) {
    if (raw && typeof raw === 'object') return raw;
    try { return JSON.parse(raw); } catch { return null; }
  }

  /** Snapshot completo bajo `localStorage['is-webcomponents']['is-ag-grid'][key]`.
   *  Se reemplaza entero (no merge): un merge dejaría columnas o filtros que
   *  ya no existen en el estado nuevo. */
  #persistState() {
    if (!this.#api) return;
    const key = this.#storageKey || this.#defaultStorageKey();
    const raw = this.#api.serializeState();
    const state = IsAgGrid.#parseState(raw);
    if (!state) return;
    replaceComponentPrefs('is-ag-grid', key, state);
    emit(this, 'is-state-saved', { key, state });
  }

  #defaultStorageKey() {
    return `is-ag-grid:${this.id || this.getAttribute('name') || 'session'}`;
  }

  async #readData() {
    // Si el consumidor ya empujó filas/columnas vía api (p.ej. catalogo-gen
    // en connectedCallback), no pisarlas con scripts vacíos del host.
    if (this.#externalData) {
      this.#getRowId = this.getAttribute('get-row-id');
      return;
    }
    const scripts = [...this.children].filter((c) => c.tagName === 'SCRIPT' && /json/i.test(c.type || ''));
    const rowsAttr = this.getAttribute('rows');
    const colsAttr = this.getAttribute('columns');
    const fetchScript = async (s) => {
      if (!s) return null;
      if (s.src) {
        try {
          const res = await fetch(s.src);
          return await res.json();
        } catch { return null; }
      }
      try { return JSON.parse(s.textContent); } catch { return null; }
    };
    const parsedCols = colsAttr
      ? JSON.parse(colsAttr)
      : (scripts[0] && !scripts[0].src ? JSON.parse(scripts[0].textContent) : null);
    const parsedRows = rowsAttr
      ? JSON.parse(rowsAttr)
      : (scripts[1]
          ? await fetchScript(scripts[1])
          : (scripts[0] ? await fetchScript(scripts[0]) : null));
    const looksLikeColDef = (x) => x && typeof x === 'object' && 'field' in x && !('id' in x);
    const looksLikeRow = (x) => x && typeof x === 'object' && ('id' in x || !('field' in x));
    this.#rawColumns = Array.isArray(parsedCols) && parsedCols.every(looksLikeColDef) ? parsedCols : [];
    if (!this.#rawColumns.length && Array.isArray(parsedCols) && parsedCols.every(looksLikeRow)) {
      this.#rawColumns = [];
    }
    const rowsArr = Array.isArray(parsedRows) ? parsedRows : [];
    this.#rawRows = rowsArr.filter((r) => r && typeof r === 'object' && !('field' in r));
    if (!this.#rawRows.length && rowsArr.length) this.#rawRows = rowsArr;
    this.#getRowId = this.getAttribute('get-row-id');
  }

  #syncPageSize() {
    const opts = (this.getAttribute('page-size-options') || this.#pageSizeOptions.join(','))
      .split(',').map((s: string) => Number(s.trim())).filter((n: number) => Number.isFinite(n) && n > 0);
    this.#pageSizeOptions = opts.length ? opts : [DEFAULT_PAGE_SIZE];
    this.#pageSizeSelect.replaceChildren(...this.#pageSizeOptions.map((o: string) => {
      const opt = document.createElement('is-option');
      opt.value = String(o);
      opt.textContent = String(o);
      return opt;
    }));
    const ps = Number(this.getAttribute('page-size')) || DEFAULT_PAGE_SIZE;
    this.#pageSize = this.#pageSizeOptions.includes(ps) ? ps : this.#pageSizeOptions[0];
    this.#pageSizeSelect.value = String(this.#pageSize);
  }

  #syncSelectionMode() {
    const mode = this.getAttribute('row-selection');
    if (mode === 'single') this.#currentSelectionMode = SelectionMode.SINGLE;
    else if (mode === 'multiple') this.#currentSelectionMode = SelectionMode.MULTIPLE;
    else if (this.hasAttribute('selectable')) this.#currentSelectionMode = SelectionMode.MULTIPLE;
    else this.#currentSelectionMode = SelectionMode.NONE;
  }

  #initModel() {
    this.#api?.getState(); // dummy
    this.#api = createGridModel({
      rows: this.#rawRows,
      columns: this.#rawColumns,
      getRowId: this.#getRowId
        ? (row) => row?.[this.#getRowId]
        : undefined,
      pagination: this.#isPaginated,
      pageSize: this.#pageSize,
      density: this.#density,
      rowGroupCols: this.#resolveRowGroupCols(),
      selectionMode: this.#currentSelectionMode,
    });
  }

  #getAttrList(attr) {
    const v = this.getAttribute(attr);
    if (!v) return [];
    return v.split(',').map((s: string) => s.trim()).filter(Boolean);
  }

  /**
   * Prioridad para agrupar al cargar:
   *   1. atributo group-by="col1,col2"
   *   2. columnas con `rowGroup: true` en los defs
   */
  #resolveRowGroupCols() {
    const attr = this.#getAttrList('group-by');
    if (attr.length) return attr;
    return this.#rawColumns
      .filter((c) => c && c.rowGroup === true)
      .map((c) => c.field)
      .filter(Boolean);
  }

  #bindModelSubscription() {
    this.#unsubscribe?.();
    if (!this.#api) return;
    this.#unsubscribe = this.#api.subscribe((_state, reason) => {
      // Selección: pintar clases/checkbox in-place. Un #renderBody completo
      // recreaba is-icon en cada clic → flickering visible en catalogo-gen.
      if (reason === 'selection') {
        this.#paintSelection();
        this.#paintHeaderCheckbox();
        return;
      }
      this.#renderBody();
      this.#renderHeader();
      this.#renderHeaderMenu();
      this.#renderFooter();
      this.#renderGroupPanel();
      if (this.#rememberState) this.#persistState();
    });
  }

  /** Actualiza is-selected / checkbox sin destruir el DOM de filas. */
  #paintSelection() {
    if (!this.#api || !this.#body) return;
    const state = this.#api.getState();
    for (const row of this.#body.querySelectorAll<HTMLElement>('.mim-dg__row[data-row-kind="leaf"]')) {
      const id = row.dataset.rowId;
      const selected = state.selection.has(id);
      row.classList.toggle('is-selected', selected);
      row.setAttribute('aria-selected', selected ? 'true' : 'false');
      const cb = row.querySelector<HTMLElement>('.mim-dg__checkbox');
      if (!cb) continue;
      cb.classList.toggle('mim-dg__checkbox--all', selected);
      cb.classList.toggle('mim-dg__checkbox--none', !selected);
      const icon = cb.querySelector<HTMLElement>('is-icon');
      if (icon) icon.setAttribute('icon', selected ? 'mdi:checkbox-marked' : 'mdi:checkbox-blank-outline');
    }
  }

  /** Solo el checkbox del header (all / some / none). */
  #paintHeaderCheckbox() {
    if (!this.#api || !this.#headerRow) return;
    if (this.#currentSelectionMode === SelectionMode.NONE) return;
    const state = this.#api.getState();
    const checks = state.displayRows.length === 0
      ? HeaderCheckboxState.NONE
      : headerCheckboxStateCore(state.selection, state.pageRows);
    const cell = this.#headerRow.querySelector<HTMLElement>('.mim-dg__cell--check .mim-dg__checkbox');
    if (!cell) return;
    cell.classList.remove('mim-dg__checkbox--all', 'mim-dg__checkbox--some', 'mim-dg__checkbox--none');
    const cls = checks === HeaderCheckboxState.ALL
      ? 'all'
      : checks === HeaderCheckboxState.SOME
        ? 'some'
        : 'none';
    cell.classList.add(`mim-dg__checkbox--${cls}`);
    const iconName = checks === HeaderCheckboxState.ALL
      ? 'mdi:checkbox-marked'
      : checks === HeaderCheckboxState.SOME
        ? 'mdi:minus-box'
        : 'mdi:checkbox-blank-outline';
    const icon = cell.querySelector<HTMLElement>('is-icon');
    if (icon) icon.setAttribute('icon', iconName);
  }

  /* ── Render ───────────────────────────────────────────────────────────── */

  #render() {
    if (!this.#api) return;
    this.#renderHeader();
    this.#renderBody();
    this.#renderFooter();
    this.#renderGroupPanel();
    this.#renderDensity();
  }

  #renderHeader() {
    if (!this.#api) return;
    const state = this.#api.getState();
    const layout = orderedForLayout(state.columns);
    const flat = [...layout.left, ...layout.center, ...layout.right];
    const check = this.#currentSelectionMode !== SelectionMode.NONE;
    const checkWidth = check ? 44 : 0;
    const available = Math.max(0, this.#viewport.clientWidth - checkWidth);
    const withFlex = applyFlex(flat, available);
    const totalWidth = withFlex.reduce((s, c) => s + c.width, 0) + checkWidth;
    const headerH = this.#headerHeight();

    const showSelected = this.#currentSelectionMode !== SelectionMode.NONE;
    const checks = state.displayRows.length === 0
      ? HeaderCheckboxState.NONE
      : headerCheckboxStateCore(state.selection, state.pageRows);

    const html = [];
    if (showSelected) {
      html.push(`<div class="mim-dg__head-cell mim-dg__cell--check is-pinned is-pinned-left" role="columnheader" style="width:44px;flex:0 0 44px;position:sticky;left:0;z-index:4;height:${headerH}px">`);
      if (this.#currentSelectionMode === SelectionMode.MULTIPLE) {
        const icon = checks === HeaderCheckboxState.ALL
          ? 'mdi:checkbox-marked'
          : (checks === HeaderCheckboxState.SOME ? 'mdi:minus-box' : 'mdi:checkbox-blank-outline');
        html.push(`<button class="mim-dg__checkbox mim-dg__checkbox--${checks}" type="button" aria-label="Seleccionar todo" data-act="toggle-all"><is-icon icon="${icon}"></is-icon></button>`);
      }
      html.push('</div>');
    }

    let leftX = checkWidth;
    let rightX = 0;
    for (const c of [...withFlex].reverse()) {
      if (c.pinned === PinSide.RIGHT) {
        rightX += c.width;
        c.__stickRight = `${rightX}px`;
      }
    }
    let tempLeft = checkWidth;
    for (const c of withFlex) {
      if (c.pinned === PinSide.LEFT) {
        c.__stickLeft = `${tempLeft}px`;
        tempLeft += c.width;
      }
    }

    for (const col of withFlex) {
      const idx = state.sortModel.findIndex((s) => s.colId === col.colId);
      const dir = idx >= 0 ? state.sortModel[idx].dir : null;
      const sortIdx = idx >= 0 ? idx + 1 : null;
      const isFiltered = state.filterModel[col.colId] != null;
      const isGrouped = state.rowGroupCols.includes(col.colId);
      const pinnedCls = col.pinned === 'left'
        ? ' is-pinned is-pinned-left'
        : col.pinned === 'right'
          ? ' is-pinned is-pinned-right'
          : '';
      const sortCls = col.sortable ? ' is-sortable' : '';
      const sortedCls = dir ? ' is-sorted' : '';
      const stickStyle = col.__stickLeft
        ? `position:sticky;left:${col.__stickLeft};z-index:3;`
        : col.__stickRight
          ? `position:sticky;right:${col.__stickRight};z-index:3;`
          : '';
      const icon = dir === 'asc' ? 'mdi:arrow-up' : dir === 'desc' ? 'mdi:arrow-down' : null;
      html.push(`<div class="mim-dg__head-cell mim-dg__cell--${col.align}${sortCls}${sortedCls}${pinnedCls}" role="columnheader" data-col-id="${col.colId}" draggable="${col.sortable !== false ? 'true' : 'false'}" style="width:${col.width}px;height:${headerH}px;${stickStyle}" aria-sort="${dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none'}">
        <span class="mim-dg__head-label">${escapeHtml(col.headerName)}</span>
        ${isFiltered ? '<is-icon icon="mdi:filter" class="mim-dg__filter-icon"></is-icon>' : ''}
        ${icon ? `<is-icon icon="${icon}" class="mim-dg__sort-icon"></is-icon>` : ''}
        ${sortIdx != null && state.sortModel.length > 1 ? `<span class="mim-dg__sort-order">${sortIdx}</span>` : ''}
        <button class="mim-dg__head-menu-btn" type="button" aria-label="Menú de columna" data-act="header-menu" data-col-id="${col.colId}">
          <is-icon icon="mdi:dots-vertical"></is-icon>
        </button>
        ${col.resizable ? `<span class="mim-dg__resizer" role="separator" aria-orientation="vertical" data-col-id="${col.colId}"></span>` : ''}
      </div>`);
    }
    this.#headerRow.style.width = `${totalWidth}px`;
    this.#headerRow.style.height = `${headerH}px`;
    this.#headerRow.innerHTML = html.join('');
  }

  #renderBody() {
    if (!this.#api) return;
    const state = this.#api.getState();
    const layout = orderedForLayout(state.columns);
    const flat = [...layout.left, ...layout.center, ...layout.right];
    const check = this.#currentSelectionMode !== SelectionMode.NONE;
    const checkWidth = check ? 44 : 0;
    const available = Math.max(0, this.#viewport.clientWidth - checkWidth);
    const withFlex = applyFlex(flat, available);
    const totalWidth = withFlex.reduce((s, c) => s + c.width, 0) + checkWidth;
    const rowH = this.#rowHeight();
    const headerH = this.#headerHeight();
    const viewportH = Math.max(0, this.#viewport.clientHeight - headerH);
    const dataRows = this.#isPaginated ? state.pageDisplayRows : state.displayRows;
    const win = rowWindow(dataRows.length, rowH, this.#scrollTop, viewportH);
    const visible = dataRows.slice(win.startIndex, win.endIndex);

    const html = [];
    html.push(`<div class="mim-dg__rows" style="transform:translateY(${win.topPad}px);width:${totalWidth}px">`);
    for (let i = 0; i < visible.length; i++) {
      const dr = visible[i];
      const absIdx = win.startIndex + i;
      if (dr.kind === 'group') {
        const aggCols = withFlex.filter((c) => c.aggFunc && !c.hide);
        const aggFrag = aggCols.map((c) => {
          const v = dr.agg[c.colId];
          if (v == null) return '';
          return `<span class="mim-dg__group-agg"><b>${escapeHtml(c.headerName)}:</b> ${escapeHtml(formatValueSafe(c, v))}</span>`;
        }).join('');
        html.push(`<div class="mim-dg__row mim-dg__group-row" role="row" data-row-id="${escapeHtml(dr.id)}" data-row-kind="group" data-row-index="${absIdx}" style="height:${rowH}px">
          <div class="mim-dg__group-cell" style="padding-left:${8 + dr.level * 18}px">
            <is-icon icon="${dr.expanded ? 'mdi:chevron-down' : 'mdi:chevron-right'}" class="mim-dg__group-chevron"></is-icon>
            <span class="mim-dg__group-label">${escapeHtml(dr.label)}</span>
            <span class="mim-dg__group-count">(${dr.count.toLocaleString()})</span>
            ${aggFrag}
          </div>
        </div>`);
      } else {
        const node = dr.node;
        const selected = state.selection.has(node.id);
        const focused = this.#focusRow === absIdx;
        const cells = [];
        if (check) {
          const icon = selected ? 'mdi:checkbox-marked' : 'mdi:checkbox-blank-outline';
          cells.push(`<div class="mim-dg__cell mim-dg__cell--check is-pinned is-pinned-left" role="gridcell" style="width:44px;flex:0 0 44px;position:sticky;left:0;z-index:2"><span class="mim-dg__checkbox mim-dg__checkbox--${selected ? 'all' : 'none'}"><is-icon icon="${icon}"></is-icon></span></div>`);
        }
        let tempLeft = checkWidth;
        let rightX = 0;
        for (const c of [...withFlex].reverse()) {
          if (c.pinned === PinSide.RIGHT) {
            rightX += c.width;
            c.__stickRight = `${rightX}px`;
          }
        }
        for (const c of withFlex) {
          if (c.pinned === PinSide.LEFT) {
            c.__stickLeft = `${tempLeft}px`;
            tempLeft += c.width;
          }
        }
        for (const col of withFlex) {
          const stickStyle = col.__stickLeft
            ? `position:sticky;left:${col.__stickLeft};z-index:1;`
            : col.__stickRight
              ? `position:sticky;right:${col.__stickRight};z-index:1;`
              : '';
          const inner = this.#renderCellContent(col, node.data);
          const style = col.cellStyle ? cellStyleToString(col.cellStyle) : '';
          const cls = col.align === 'right' ? 'mim-dg__cell--right' : col.align === 'center' ? 'mim-dg__cell--center' : '';
          cells.push(`<div class="mim-dg__cell ${cls}" role="gridcell" data-col-id="${col.colId}" data-row-id="${escapeHtml(node.id)}" style="width:${col.width}px;${stickStyle}${style}">${inner}</div>`);
        }
        const rowCls = `${selected ? 'is-selected' : ''}${focused ? ' is-focused' : ''}${node.index % 2 ? ' is-odd' : ''}`;
        html.push(`<div class="mim-dg__row ${rowCls}" role="row" data-row-id="${escapeHtml(node.id)}" data-row-kind="leaf" data-row-index="${absIdx}" style="height:${rowH}px" aria-selected="${selected}">${cells.join('')}</div>`);
      }
    }
    html.push('</div>');
    this.#body.style.height = `${win.totalHeight}px`;
    this.#body.style.width = `${totalWidth}px`;
    this.#body.innerHTML = html.join('');
  }

  #renderCellContent(col, row) {
    const value = getCellValue(col, { data: row, id: row?.id, index: row?.index ?? 0 });
    const t = col.type;
    if (t === ColumnType.BOOLEAN) {
      return `<span class="mim-dg-bool mim-dg-bool--${value ? 'on' : 'off'}" aria-checked="${!!value}">${value ? '✓' : ''}</span>`;
    }
    if (t === 'date') {
      return escapeHtml(formatDate(value, col));
    }
    if (t === 'number') {
      return escapeHtml(formatNumber(value, col));
    }
    if (t === 'currency') {
      return escapeHtml(formatCurrency(value, col));
    }
    if (t === 'link' && value) {
      return `<a class="mim-dg-link" href="${escapeHtml(value)}" target="_blank" rel="noopener">${escapeHtml(value)}</a>`;
    }
    if (t === 'enum' || t === 'badge') {
      const c = col.def.enumColors?.[value];
      const color = c || 'var(--is-accent)';
      return `<span class="mim-dg-tag" style="--c:${escapeHtml(color)}">${escapeHtml(value ?? '')}</span>`;
    }
    if (t === 'tags' && Array.isArray(value)) {
      return value.map((v) => `<span class="mim-dg-pill">${escapeHtml(v)}</span>`).join('');
    }
    if (t === 'actions') {
      const acts = col.def.actions || [];
      return acts.map((a) => `<button class="mim-dg__action" type="button" data-action="${escapeHtml(a.value)}" title="${escapeHtml(a.label || a.value)}"><is-icon icon="${escapeHtml(a.icon || 'mdi:dots-horizontal')}"></is-icon></button>`).join('');
    }
    return escapeHtml(value == null ? '' : String(value));
  }

  /** Abre/cierra el panel lateral. El markup del `<aside>` ya existía pero
   *  nacía `hidden` y sin handlers: sin esto las columnas ocultas no se podían
   *  restaurar desde la UI. */
  #openSidePanel(panel) {
    const body = this.shadowRoot!.querySelector<HTMLElement>('.mim-dg__panel');
    if (body && !body.hidden && body.dataset.panel === panel) return;
    this.#toggleSidePanel(panel);
  }

  #toggleSidePanel(panel) {
    const sidebar = this.shadowRoot!.querySelector<HTMLElement>('.mim-dg__sidebar');
    const body = this.shadowRoot!.querySelector<HTMLElement>('.mim-dg__panel');
    if (!sidebar || !body) return;
    const same = !body.hidden && body.dataset.panel === panel;
    sidebar.hidden = false;
    body.hidden = same;
    body.dataset.panel = panel;
    for (const tab of this.shadowRoot!.querySelectorAll<HTMLElement>('.mim-dg__sidebar-tab')) {
      tab.setAttribute('aria-selected', String(!same && tab.dataset.panel === panel));
    }
    if (!body.hidden && panel === 'columns') this.#renderColumnsPanel();
  }

  #closeSidePanel() {
    const body = this.shadowRoot!.querySelector<HTMLElement>('.mim-dg__panel');
    if (body) body.hidden = true;
    for (const tab of this.shadowRoot!.querySelectorAll<HTMLElement>('.mim-dg__sidebar-tab')) {
      tab.setAttribute('aria-selected', 'false');
    }
  }

  #renderColumnsPanel() {
    const body = this.shadowRoot!.querySelector<HTMLElement>('.mim-dg__panel');
    if (!body || !this.#api) return;
    const cols = this.#api.getState().columns;
    body.innerHTML = `
      <h3 class="mim-dg__panel-title">Columnas</h3>
      <div class="mim-dg__panel-list">
        ${cols.map((c) => `
          <label class="mim-dg__panel-item" data-col-id="${escapeHtml(c.colId)}">
            <is-checkbox ${c.hide ? '' : 'checked'}></is-checkbox>
            <span>${escapeHtml(c.headerName ?? c.colId)}</span>
          </label>`).join('')}
      </div>`;
  }

  #renderFooter() {
    if (!this.#api) return;
    const state = this.#api.getState();
    const total = state.totalRows;
    const sel = state.selection.size;
    const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
    const usePaging = this.#isPaginated || total > state.pageSize;
    const from = usePaging ? (state.page * state.pageSize + 1) : 1;
    const to = usePaging ? Math.min(total, (state.page + 1) * state.pageSize) : total;
    this.#countEl.innerHTML = `${formatNumberRaw(from)}–${formatNumberRaw(to)} de ${formatNumberRaw(total)}${sel > 0 ? ` <span class="mim-dg__count-sel">· ${formatNumberRaw(sel)} seleccionadas</span>` : ''}`;
    this.#pagerInfo.textContent = `${state.page + 1} / ${pageCount}`;
    const prev = this.shadowRoot!.querySelector<HTMLElement>('[data-action="page-prev"]');
    const next = this.shadowRoot!.querySelector<HTMLElement>('[data-action="page-next"]');
    if (prev) prev.disabled = state.page <= 0;
    if (next) next.disabled = state.page >= pageCount - 1;
    this.#page = state.page;
  }

  #renderDensity() {
    this.shadowRoot!.querySelectorAll<HTMLElement>('.mim-dg__density-btn').forEach((btn: HTMLElement) => {
      btn.classList.toggle('is-active', btn.dataset.density === this.#density);
    });
    this.shadowRoot!.querySelector<HTMLElement>('.mim-dg').dataset.density = this.#density;
  }

  #renderGroupPanel() {
    if (!this.#api) return;
    const state = this.#api.getState();
    const cols = this.#api.getColumns();
    const chips = state.rowGroupCols.map((colId) => {
      const col = cols.find((c) => c.colId === colId);
      if (!col) return '';
      return `<span class="mim-dg__group-chip" data-col-id="${colId}"><is-icon icon="mdi:drag" class="mim-dg__group-chip-grip"></is-icon><span class="mim-dg__group-chip-label">${escapeHtml(col.headerName)}</span><button class="mim-dg__group-chip-x" type="button" data-act="ungroup" data-col-id="${colId}" aria-label="Quitar agrupación"><is-icon icon="mdi:close"></is-icon></button></span>`;
    });
    const arrows = state.rowGroupCols.map(() => '<span class="mim-dg__group-chip-arrow">›</span>');
    const interleaved = [];
    for (let i = 0; i < chips.length; i++) {
      if (i > 0) interleaved.push(arrows[i - 1] || '');
      interleaved.push(chips[i]);
    }
    this.#groupChips.innerHTML = interleaved.join('');
    this.#groupPanel.querySelector<HTMLElement>('.mim-dg__group-hint').style.display = state.rowGroupCols.length ? 'none' : '';
  }

  /* ── Header menu (1 menú por columna, posicionado absoluto) ───────────── */

  #renderHeaderMenu() {
    this.#headerMenuEl?.remove();
    this.#headerMenuEl = null;
  }

  #openHeaderMenu(col, buttonEl) {
    if (!this.#api) return;
    this.#closeHeaderMenu();
    const state = this.#api.getState();
    const idx = state.sortModel.findIndex((s) => s.colId === col.colId);
    const dir = idx >= 0 ? state.sortModel[idx].dir : null;
    const isGrouped = state.rowGroupCols.includes(col.colId);
    const r = buttonEl.getBoundingClientRect();
    const menu = document.createElement('div');
    menu.className = 'mim-dg__menu';
    menu.setAttribute('role', 'menu');
    menu.style.left = `${r.left}px`;
    menu.style.top = `${r.bottom}px`;
    const items = [];
    if (col.sortable) {
      items.push(this.#menuItem('Ordenar ascendente', HEADER_MENU_ICONS.sortAsc, () => this.#setSort(col.colId, 'asc')));
      items.push(this.#menuItem('Ordenar descendente', HEADER_MENU_ICONS.sortDesc, () => this.#setSort(col.colId, 'desc')));
      if (dir) items.push(this.#menuItem('Quitar orden', HEADER_MENU_ICONS.sortRemove, () => this.#clearSort(col.colId)));
      items.push(this.#menuSep());
    }
    if (col.filterType) {
      items.push(this.#menuItem('Filtrar…', HEADER_MENU_ICONS.filter, () => this.#openFilterPopover(col, buttonEl)));
      items.push(this.#menuSep());
    }
    if (col.pinned !== 'left') items.push(this.#menuItem('Fijar a la izquierda', HEADER_MENU_ICONS.pinLeft, () => this.#pinColumn(col.colId, 'left')));
    if (col.pinned !== 'right') items.push(this.#menuItem('Fijar a la derecha', HEADER_MENU_ICONS.pinRight, () => this.#pinColumn(col.colId, 'right')));
    if (col.pinned) items.push(this.#menuItem('No fijar', HEADER_MENU_ICONS.unpin, () => this.#pinColumn(col.colId, null)));
    items.push(this.#menuSep());
    items.push(this.#menuItem('Autoajustar ancho', HEADER_MENU_ICONS.autosize, () => this.#api.autosizeColumn(col.colId)));
    if (col.enableRowGroup) {
      items.push(this.#menuItem(isGrouped ? 'Quitar agrupación' : 'Agrupar por esta columna', isGrouped ? HEADER_MENU_ICONS.ungroup : HEADER_MENU_ICONS.group, () => {
        if (isGrouped) this.#api.removeRowGroupCol(col.colId);
        else this.#api.addRowGroupCol(col.colId);
      }));
    }
    items.push(this.#menuItem('Ocultar columna', HEADER_MENU_ICONS.hide, () => this.#hideColumn(col.colId)));
    menu.innerHTML = items.join('');
    this.#wireMenuItemHandlers(menu);
    document.body.appendChild(menu);
    this.#headerMenuEl = menu;
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', this.#closeOnOutside, true);
      document.addEventListener('keydown', this.#closeOnEscape, true);
    });
  }

  #menuItem(label, icon, onClick) {
    return `<button class="mim-dg__menu-item" type="button" role="menuitem" data-act="menu-item" data-cb="${this.#registerMenuCallback(onClick)}"><is-icon icon="${icon}"></is-icon>${escapeHtml(label)}</button>`;
  }

  #menuSep() {
    return '<div class="mim-dg__menu-sep"></div>';
  }

  #menuCallbacks = new Map<string, () => void>();
  #menuCbCounter = 0;
  #registerMenuCallback(fn) {
    const id = `cb${this.#menuCbCounter++}`;
    this.#menuCallbacks.set(id, fn);
    return id;
  }
  #wireMenuItemHandlers(menuEl) {
    menuEl.querySelectorAll<HTMLElement>('[data-cb]').forEach((el: HTMLElement) => {
      const fn = this.#menuCallbacks.get(el.dataset.cb);
      if (fn) el.addEventListener('click', fn);
    });
  }

  #closeHeaderMenu = () => {
    this.#headerMenuEl?.remove();
    this.#headerMenuEl = null;
    document.removeEventListener('mousedown', this.#closeOnOutside, true);
    document.removeEventListener('keydown', this.#closeOnEscape, true);
  };

  #closeOnOutside = (e) => {
    if (!this.#headerMenuEl) return;
    if (this.#headerMenuEl.contains(e.target)) return;
    if (e.target.closest('.mim-dg__head-menu-btn')) return;
    this.#closeHeaderMenu();
  };

  #closeOnEscape = (e) => {
    if (e.key === 'Escape') this.#closeHeaderMenu();
  };

  /* ── Filter popover ───────────────────────────────────────────────────── */

  #openFilterPopover(col, buttonEl) {
    if (!this.#api) return;
    this.#closeHeaderMenu();
    this.#closeFilterPopover();
    const state = this.#api.getState();
    const existing = state.filterModel[col.colId] || null;
    const r = buttonEl.getBoundingClientRect();
    const pop = document.createElement('div');
    pop.className = 'mim-dg__filter';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', `Filtrar ${col.headerName}`);
    pop.style.left = `${r.left}px`;
    pop.style.top = `${r.bottom}px`;
    const ft = col.filterType || 'text';
    pop.innerHTML = this.#filterPopoverHTML(col, ft, existing);
    document.body.appendChild(pop);
    this.#filterPopoverEl = pop;
    // wire events
    const opSel = pop.querySelector<HTMLElement>('[data-role="op"]');
    const valInput = pop.querySelector<HTMLElement>('[data-role="val"]');
    const valTo = pop.querySelector<HTMLElement>('[data-role="val-to"]');
    const setSel = pop.querySelector<HTMLElement>('[data-role="set"]');
    const setSearch = pop.querySelector<HTMLElement>('[data-role="set-search"]');
    const applyBtn = pop.querySelector<HTMLElement>('[data-act="apply"]');
    const clearBtn = pop.querySelector<HTMLElement>('[data-act="clear"]');
    if (setSearch) {
      setSearch.addEventListener('input', () => {
        const q = setSearch.value.toLowerCase();
        pop.querySelectorAll<HTMLElement>('[data-set-val]').forEach((el: HTMLElement) => {
          el.style.display = el.dataset.setVal.toLowerCase().includes(q) ? '' : 'none';
        });
      });
    }
    if (setSel) {
      setSel.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-set-val]');
        if (!btn) return;
        const v = btn.dataset.setVal;
        if (v === '__all__') {
          pop.querySelectorAll<HTMLElement>('[data-set-checkbox]').forEach((el: HTMLElement) => el.dataset.checked = 'true');
        } else if (v === '__none__') {
          pop.querySelectorAll<HTMLElement>('[data-set-checkbox]').forEach((el: HTMLElement) => el.dataset.checked = 'false');
        } else {
          const cb = btn.querySelector<HTMLElement>('[data-set-checkbox]');
          cb.dataset.checked = cb.dataset.checked === 'true' ? 'false' : 'true';
          const icon = cb.querySelector<HTMLElement>('is-icon');
          icon.setAttribute('icon', cb.dataset.checked === 'true' ? 'mdi:checkbox-marked' : 'mdi:checkbox-blank-outline');
        }
      });
    }
    const apply = () => {
      const filter = this.#buildFilterFromPopover(col, pop);
      if (filter) this.#api.setFilter(col.colId, filter);
      else this.#api.setFilter(col.colId, null);
      emit(this, 'is-filter-change', { column: col.colId, op: filter?.op, value: filter?.value });
      this.#closeFilterPopover();
    };
    const clear = () => {
      this.#api.setFilter(col.colId, null);
      emit(this, 'is-filter-change', { column: col.colId, op: null, value: null });
      this.#closeFilterPopover();
    };
    if (applyBtn) applyBtn.addEventListener('click', apply);
    if (clearBtn) clearBtn.addEventListener('click', clear);
    [valInput, valTo].forEach((inp: HTMLElement) => {
      if (!inp) return;
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') apply(); });
    });
    requestAnimationFrame(() => {
      document.addEventListener('mousedown', this.#closePopoverOutside, true);
      document.addEventListener('keydown', this.#closePopoverEscape, true);
    });
    valInput?.focus();
  }

  #filterPopoverHTML(col, ft, existing) {
    if (ft === 'text') {
      const op = existing?.type === 'text' ? existing.op : 'contains';
      const val = existing?.type === 'text' ? existing.value : '';
      return `
        ${opSelectHTML(TEXT_OP_LABELS, op)}
        <is-input class="mim-dg__filter-field" data-role="val" placeholder="Valor…" value="${escapeHtml(val)}"></is-input>
        ${FILTER_ACTIONS_HTML}`;
    }
    if (ft === 'number') {
      const nf = existing?.type === 'number' ? existing : null;
      const op = nf?.op || 'eq';
      const val = nf?.value != null ? String(nf.value) : '';
      const to = nf?.to != null ? String(nf.to) : '';
      return `
        ${opSelectHTML(NUM_OP_LABELS, op)}
        <is-input class="mim-dg__filter-field" data-role="val" type="number" placeholder="Valor…" value="${escapeHtml(val)}"></is-input>
        ${op === 'inRange' ? `<is-input class="mim-dg__filter-field" data-role="val-to" type="number" placeholder="Hasta…" value="${escapeHtml(to)}"></is-input>` : ''}
        ${FILTER_ACTIONS_HTML}`;
    }
    if (ft === 'date') {
      const df = existing?.type === 'date' ? existing : null;
      const op = df?.op || 'eq';
      const val = df?.value || '';
      const to = df?.to || '';
      return `
        ${opSelectHTML(DATE_OP_LABELS, op)}
        <is-input class="mim-dg__filter-field" data-role="val" type="date" value="${escapeHtml(val)}"></is-input>
        ${op === 'inRange' ? `<is-input class="mim-dg__filter-field" data-role="val-to" type="date" value="${escapeHtml(to)}"></is-input>` : ''}
        ${FILTER_ACTIONS_HTML}`;
    }
    if (ft === 'set') {
      const sf = existing?.type === 'set' ? existing.values : null;
      const allValues = uniqueValuesSafe(this.#api.getAllRows(), col);
      const selected = sf ? new Set(sf) : new Set(allValues);
      return `
        <is-input class="mim-dg__filter-field" data-role="set-search" placeholder="Buscar valores…"></is-input>
        <div class="mim-dg__filter-actions-row">
          <is-button class="mim-dg__filter-link" data-set-val="__all__" variant="text">Todo</is-button>
          <is-button class="mim-dg__filter-link" data-set-val="__none__" variant="text">Nada</is-button>
        </div>
        <div class="mim-dg__filter-set" data-role="set">
          ${allValues.map((v) => `<label class="mim-dg__filter-set-item" data-set-val="${escapeHtml(v)}"><is-checkbox data-set-checkbox ${selected.has(v) ? 'checked' : ''}></is-checkbox><span>${escapeHtml(v || '(vacío)')}</span></label>`).join('')}
        </div>
        ${FILTER_ACTIONS_HTML}`;
    }
    return '';
  }

  #buildFilterFromPopover(col, pop) {
    const op = pop.querySelector<HTMLElement>('[data-role="op"]')?.value;
    const val = pop.querySelector<HTMLElement>('[data-role="val"]')?.value;
    const valTo = pop.querySelector<HTMLElement>('[data-role="val-to"]')?.value;
    const ft = col.filterType || 'text';
    if (ft === 'text') {
      if (!val && op !== 'blank' && op !== 'notBlank') return null;
      return { type: 'text', op, value: val || '' };
    }
    if (ft === 'number') {
      if (op === 'blank' || op === 'notBlank') return { type: 'number', op, value: null };
      const num = val === '' ? null : Number(val);
      if (num === null && op !== 'inRange') return null;
      const to = valTo === '' ? null : Number(valTo);
      return { type: 'number', op, value: num, to };
    }
    if (ft === 'date') {
      if (!val && op !== 'inRange') return null;
      return { type: 'date', op, value: val || '', to: valTo || '' };
    }
    if (ft === 'set') {
      const allValues = uniqueValuesSafe(this.#api.getAllRows(), col);
      const selected = [...pop.querySelectorAll<HTMLElement>('[data-set-checkbox]')]
        .filter((cb: HTMLElement) => cb.dataset.checked === 'true')
        .map((cb: HTMLElement) => cb.closest('[data-set-val]').dataset.setVal);
      if (selected.length === allValues.length) return null;
      return { type: 'set', values: selected };
    }
    return null;
  }

  #closeFilterPopover() {
    this.#filterPopoverEl?.remove();
    this.#filterPopoverEl = null;
    document.removeEventListener('mousedown', this.#closePopoverOutside, true);
    document.removeEventListener('keydown', this.#closePopoverEscape, true);
  }

  #closePopoverOutside = (e) => {
    if (!this.#filterPopoverEl) return;
    if (this.#filterPopoverEl.contains(e.target)) return;
    this.#closeFilterPopover();
  };

  #closePopoverEscape = (e) => { if (e.key === 'Escape') this.#closeFilterPopover(); };

  #setSort(colId, dir) {
    if (!this.#api) return;
    const others = this.#api.getState().sortModel.filter((s) => s.colId !== colId);
    this.#api.setSortModel(dir ? [...others, { colId, dir }] : others);
    emit(this, 'is-sort-change', { column: colId, direction: dir });
  }

  #clearSort(colId) {
    if (!this.#api) return;
    const others = this.#api.getState().sortModel.filter((s) => s.colId !== colId);
    this.#api.setSortModel(others);
    emit(this, 'is-sort-change', { column: colId, direction: null });
  }

  #pinColumn(colId, side) {
    if (!this.#api) return;
    this.#api.pinColumn(colId, side);
    emit(this, 'is-column-pin', { colId, side });
  }

  #hideColumn(colId) {
    if (!this.#api) return;
    this.#api.hideColumn(colId, true);
    emit(this, 'is-column-hide', { colId });
  }

  #goToPage(p) {
    if (!this.#api) return;
    this.#api.setPage(p);
    emit(this, 'is-page-change', { page: this.#api.getState().page + 1, pageSize: this.#api.getState().pageSize });
  }

  /* ── Event handlers ───────────────────────────────────────────────────── */

  #onViewportClick(e) {
    if (!this.#api) return;
    const state = this.#api.getState();
    const allRows = this.#isPaginated ? state.pageDisplayRows : state.displayRows;

    // Header menu button
    const menuBtn = e.target.closest('[data-act="header-menu"]');
    if (menuBtn) {
      e.stopPropagation();
      const colId = menuBtn.dataset.colId;
      const col = this.#api.getColumns().find((c) => c.colId === colId);
      if (col) this.#openHeaderMenu(col, menuBtn);
      return;
    }

    // Toggle-all
    const toggleAll = e.target.closest('[data-act="toggle-all"]');
    if (toggleAll) {
      e.stopPropagation();
      const s = state;
      const all = headerCheckboxStateCore(s.selection, s.pageRows);
      const next = all === HeaderCheckboxState.ALL ? clearSelectionCore() : selectAllCore(s.pageRows);
      this.#api.setSelection(next);
      emit(this, 'is-row-select', { rows: this.api.getSelectedRows() });
      return;
    }

    // Header sort
    const head = e.target.closest('.mim-dg__head-cell');
    if (head && !e.target.closest('.mim-dg__head-menu-btn, .mim-dg__resizer')) {
      const colId = head.dataset.colId;
      const col = this.#api.getColumns().find((c) => c.colId === colId);
      if (col && col.sortable) {
        const additive = (e.ctrlKey || e.metaKey || e.shiftKey) && this.#currentSelectionMode === SelectionMode.MULTIPLE;
        this.#api.toggleSort(colId, additive);
        const dir = this.#api.getState().sortModel.find((s) => s.colId === colId)?.dir || null;
        emit(this, 'is-sort-change', { column: colId, direction: dir });
      }
      return;
    }

    // Group row toggle
    const groupRow = e.target.closest('.mim-dg__group-row');
    if (groupRow) {
      const id = groupRow.dataset.rowId;
      this.#api.toggleGroup(id);
      return;
    }

    // Row selection + cell click + edit + action
    const row = e.target.closest('.mim-dg__row[data-row-kind="leaf"]');
    if (row) {
      const rowId = row.dataset.rowId;
      const node = this.#api.getAllRows().find((n) => n.id === rowId);
      if (!node) return;

      // Action button?
      const actionBtn = e.target.closest('[data-action]');
      if (actionBtn) {
        const colId = this.#api.getColumns().find((c) => c.def.actions?.some((a) => a.value === actionBtn.dataset.action))?.colId;
        const col = this.#api.getColumns().find((c) => c.colId === colId);
        const act = col?.def.actions?.find((a) => a.value === actionBtn.dataset.action);
        emit(this, 'is-action', { row: node.data, column: col, action: act?.value });
        return;
      }

      // Selection
      if (this.#currentSelectionMode !== SelectionMode.NONE) {
        const orderedIds = this.#api.getDisplayedRows().map((n) => n.id);
        const next = toggleRowSelectionCore(
          state.selection,
          node.id,
          this.#currentSelectionMode,
          {
            additive: e.ctrlKey || e.metaKey,
            range: e.shiftKey,
            rangeFrom: this.#lastRangeFrom || undefined,
            orderedIds,
          },
        );
        if (!e.shiftKey) this.#lastRangeFrom = node.id;
        this.#api.setSelection(next);
        emit(this, 'is-row-select', { rows: this.api.getSelectedRows() });
      }

      // Cell click
      const cell = e.target.closest('.mim-dg__cell[data-col-id]');
      if (cell) {
        const colId = cell.dataset.colId;
        const col = this.#api.getColumns().find((c) => c.colId === colId);
        const value = node.data?.[colId];
        if (col?.def.editable) {
          const oldValue = value;
          const newValue = window.prompt(`Editar ${col.headerName}`, oldValue ?? '');
          if (newValue != null && String(newValue) !== String(oldValue ?? '')) {
            const parsed = parseMaybeNumber(newValue, col);
            node.data[colId] = parsed;
            emit(this, 'is-cell-edit', { row: node.data, column: col, oldValue, newValue: parsed });
            this.#api.setRows([...this.#rawRows]); // notifica al store
          }
        }
        emit(this, 'is-cell-click', { row: node.data, column: col, value });
      }
    }
  }

  #onKeyDown(e) {
    if (!this.#api) return;
    const state = this.#api.getState();
    const dataRows = this.#isPaginated ? state.pageDisplayRows : state.displayRows;
    const leafRows = this.#isPaginated ? state.pageRows : state.displayedRows;
    const last = dataRows.length - 1;
    const rowH = this.#rowHeight();
    const viewportH = Math.max(0, this.#viewport.clientHeight - this.#headerHeight());
    const move = (idx: number) => {
      const c = Math.max(0, Math.min(last, idx));
      this.#focusRow = c;
      const top = c * rowH;
      const bottom = top + rowH;
      if (top < this.#scrollTop) this.#viewport.scrollTop = top;
      else if (bottom > this.#scrollTop + viewportH) this.#viewport.scrollTop = bottom - viewportH;
      this.#renderBody();
      e.preventDefault();
    };
    const pageStep = Math.max(1, Math.floor(viewportH / rowH) - 1);
    if (e.key === 'ArrowDown') move(this.#focusRow + 1);
    else if (e.key === 'ArrowUp') move(this.#focusRow < 0 ? 0 : this.#focusRow - 1);
    else if (e.key === 'Home') move(0);
    else if (e.key === 'End') move(last);
    else if (e.key === 'PageDown') move(this.#focusRow + pageStep);
    else if (e.key === 'PageUp') move(this.#focusRow - pageStep);
    else if ((e.key === ' ' || e.key === 'Enter') && this.#focusRow >= 0) {
      const dr = dataRows[this.#focusRow];
      if (dr?.kind === 'group') this.#api.toggleGroup(dr.id);
      else if (dr?.kind === 'leaf' && this.#currentSelectionMode !== SelectionMode.NONE) {
        this.#lastRangeFrom = dr.node.id;
        const orderedIds = leafRows.map((n) => n.id);
        const next = toggleRowSelectionCore(state.selection, dr.node.id, this.#currentSelectionMode, { additive: true, orderedIds });
        this.#api.setSelection(next);
        emit(this, 'is-row-select', { rows: this.api.getSelectedRows() });
      }
      e.preventDefault();
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a' && this.#currentSelectionMode === SelectionMode.MULTIPLE) {
      this.#api.setSelection(selectAllCore(leafRows));
      emit(this, 'is-row-select', { rows: this.api.getSelectedRows() });
      e.preventDefault();
    } else if (e.key === 'Escape' && state.selection.size) {
      this.#api.setSelection(clearSelectionCore());
      emit(this, 'is-row-select', { rows: [] });
    }
  }

  /* ── Helpers ──────────────────────────────────────────────────────────── */

  /** Resuelve longitudes CSS (`40`, `40px`, `2.5rem`, `1.5em`) a px. */
  #cssLengthPx(prop, fallback) {
    const raw = getComputedStyle(this).getPropertyValue(prop).trim();
    if (!raw) return fallback;
    const n = parseFloat(raw);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    if (raw.endsWith('rem')) {
      const rootFs = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
      return n * rootFs;
    }
    if (raw.endsWith('em')) {
      const fs = parseFloat(getComputedStyle(this).fontSize) || 16;
      return n * fs;
    }
    return n; // px o unitless → px
  }

  #rowHeight() {
    return this.#cssLengthPx(
      '--is-grid-row-h',
      DENSITY_ROW_HEIGHT[this.#density] ?? DENSITY_ROW_HEIGHT[Density.NORMAL],
    );
  }

  #headerHeight() {
    return this.#cssLengthPx('--is-grid-header-h', DEFAULT_HEADER_HEIGHT);
  }

  /* ── Public API ───────────────────────────────────────────────────────── */

  get rows() { return this.#rawRows.slice(); }
  get columns() { return this.#rawColumns.slice(); }

  get api() {
    const self = this;
    return {
      getState: () => self.#api?.getState() ?? null,
      setRows: (rows) => {
        self.#rawRows = Array.isArray(rows) ? rows : [];
        self.#externalData = true;
        self.#api?.setRows(self.#rawRows);
      },
      setColumns: (defs) => {
        self.#rawColumns = Array.isArray(defs) ? defs : [];
        self.#externalData = true;
        self.#api?.setColumnDefs(self.#rawColumns);
      },
      getRows: () => self.#api?.getAllRows().map((n) => n.data) ?? [],
      getAllRows: () => self.#api?.getAllRows().map((n) => n.data) ?? [],
      getDisplayedRows: () => self.#api?.getDisplayedRows().map((n) => n.data) ?? [],
      goToPage: (n: number) => { if (self.#api) self.#goToPage(n - 1); }, // legacy 1-based
      setPage: (n) => self.#api?.setPage(n),
      setPageSize: (n) => self.#api?.setPageSize(n),
      setQuickFilter: (s) => {
        const v = String(s ?? '');
        const input = self.shadowRoot?.querySelector<HTMLElement>('.mim-dg__quick-input');
        if (input) input.value = v;
        self.#api?.setQuickFilter(v);
      },
      /** Legacy: (field, op, value) where op ∈ { contains, eq, neq, gt, gte, lt, lte, starts, ends }.
       *  New: (colId, filter | null). Se detecta por el tipo del segundo arg. */
      setFilter: (colIdOrField, opOrFilter, valueMaybe: string) => {
        if (!self.#api) return;
        const colId = colIdOrField;
        // Si el segundo arg es un objeto/null → nueva API core.
        if (opOrFilter === null || opOrFilter === undefined || typeof opOrFilter === 'object') {
          self.#api.setFilter(colId, opOrFilter ?? null);
          return;
        }
        // Legacy text-only.
        const normOp = LEGACY_OP_MAP[opOrFilter] || opOrFilter;
        if (valueMaybe === undefined || valueMaybe === null || valueMaybe === '') {
          self.#api.setFilter(colId, null);
        } else {
          self.#api.setFilter(colId, { type: 'text', op: normOp, value: String(valueMaybe) });
        }
      },
      /** Nueva: (colId, filter | null). */
      setFilterModel: (model) => {
        if (!self.#api) return;
        for (const [colId, f] of Object.entries(model || {})) self.#api.setFilter(colId, f);
      },
      clearFilter: (field) => self.#api?.setFilter(field, null),
      setSortModel: (model) => self.#api?.setSortModel(model),
      toggleSort: (colId, additive) => self.#api?.toggleSort(colId, additive),
      pinColumn: (colId, side) => self.#api?.pinColumn(colId, side),
      hideColumn: (colId, hide = true) => self.#api?.hideColumn(colId, hide),
      openColumnsPanel: () => self.#openSidePanel('columns'),
      closeSidePanel: () => self.#closeSidePanel(),
      resizeColumn: (colId, width) => self.#api?.resizeColumn(colId, width),
      autosizeColumn: (colId) => self.#api?.autosizeColumn(colId),
      reorderColumn: (colId, toIndex) => self.#api?.reorderColumn(colId, toIndex),
      setRowGroupCols: (colIds) => self.#api?.setRowGroupCols(colIds),
      addRowGroupCol: (colId) => self.#api?.addRowGroupCol(colId),
      removeRowGroupCol: (colId) => self.#api?.removeRowGroupCol(colId),
      toggleGroup: (groupId) => self.#api?.toggleGroup(groupId),
      expandAllGroups: () => self.#api?.expandAllGroups(),
      collapseAllGroups: () => self.#api?.collapseAllGroups(),
      getSelectedRows: () => {
        if (!self.#api) return [];
        const sel = self.#api.getState().selection;
        return self.#api.getAllRows().filter((n) => sel.has(n.id)).map((n) => n.data);
      },
      selectAll: () => {
        if (!self.#api) return;
        if (self.#currentSelectionMode !== SelectionMode.MULTIPLE) return;
        self.#api.setSelection(selectAllCore(self.#api.getDisplayedRows()));
      },
      clearSelection: () => self.#api?.setSelection(clearSelectionCore()),
      setSelection: (ids) => self.#api?.setSelection(new Set(ids)),
      setDensity: (d) => {
        if (Object.values(Density).includes(d)) self.setAttribute('density', d);
      },
      exportCSV: (filename = 'grid.csv', opts = {}) => {
        if (!self.#api) return;
        const state = self.#api.getState();
        const sep = opts.separator || ',';
        const onlySelected = opts.onlySelected ?? state.selection.size > 0;
        const csv = rowsToCsv(state.columns, state.displayedRows, {
          separator: sep,
          onlySelected,
          selection: state.selection,
        });
        const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      },
      serializeState: () => self.#api?.serializeState() ?? null,
      loadState: (json) => {
        if (!self.#api) return;
        self.#api.loadState(json);
        emit(self, 'is-state-loaded', self.#api.getState());
      },
      refresh: () => {
        if (!self.#api) return;
        self.#api.setRows([...self.#rawRows]);
      },
      resetPersistedState: () => {
        removeComponentPrefs('is-ag-grid', self.#storageKey || self.#defaultStorageKey());
        if (!self.#api) return;
        self.#initModel();
        self.#render();
        emit(self, 'is-state-reset', { key: self.#storageKey || self.#defaultStorageKey() });
      },
    };
  }

  /* ── Attribute setters/getters (boolean) ──────────────────────────────── */

  get density() { return this.#density; }
  set density(v) {
    if (Object.values(Density).includes(v)) this.setAttribute('density', v);
    else this.removeAttribute('density');
  }

  get pagination() { return this.#isPaginated; }
  set pagination(v) { this.setBooleanAttr('pagination', v); }

  get selectable() { return this.hasAttribute('selectable'); }
  set selectable(v) { this.setBooleanAttr('selectable', v); }

  get toolbar() { return this.#showToolbar; }
  set toolbar(v) { this.setBooleanAttr('toolbar', v); }

  get rememberState() { return this.#rememberState; }
  set rememberState(v) { this.setBooleanAttr('remember-state', v); }
}

/* ── Helpers (módulo, no clase) ─────────────────────────────────────────── */

function formatNumberRaw(n) {
  return Number.isFinite(n) ? n.toLocaleString() : '0';
}

function formatValueSafe(col, value: string) {
  if (value == null || value === '') return '';
  if (col.type === 'number') return Number.isFinite(value) ? String(value) : '';
  if (col.type === 'boolean') return value ? '✓' : '';
  if (col.type === 'date') {
    const d = value instanceof Date ? value : new Date(String(value));
    return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10);
  }
  return String(value);
}

function formatDate(value: string, col) {
  if (value == null || value === '') return '';
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return String(value);
  const locale = col.def.format || 'es-CO';
  const style = col.def.dateFormat || 'medium';
  try {
    return new Intl.DateTimeFormat(locale, { dateStyle: style }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

function formatNumber(value, col) {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const decimals = col.def.decimals ?? 2;
  const locale = col.def.format || 'es-CO';
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(n);
  } catch {
    return n.toFixed(decimals);
  }
}

function formatCurrency(value, col) {
  if (value == null || value === '') return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  const locale = col.def.format || 'es-CO';
  const currency = col.def.currency || 'COP';
  const decimals = col.def.decimals ?? 0;
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: decimals,
      minimumFractionDigits: decimals,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(decimals)}`;
  }
}

function parseMaybeNumber(value, col) {
  if (col?.type === 'number') {
    const n = Number(value);
    return Number.isFinite(n) ? n : value;
  }
  return value;
}

function cellStyleToString(style) {
  if (!style || typeof style !== 'object') return '';
  return Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';');
}

function uniqueValuesSafe(rows, col) {
  const set = new Set();
  for (const n of rows) set.add(cellText(col, n));
  return [...set].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

/** Menú/filtro se montan en document.body (fuera del shadow) — CSS global único. */
const FLOATING_STYLE_ID = 'is-ag-grid-floating-styles';
const FLOATING_CSS = /* css */ `
.mim-dg__menu,
.mim-dg__filter {
  position: fixed;
  z-index: 10050;
  min-width: 12.5rem;
  max-width: min(22rem, calc(100vw - 1rem));
  max-height: min(70vh, 28rem);
  overflow: auto;
  margin: 0;
  padding: 0.3rem;
  border: 1px solid var(--is-border, #2a3140);
  border-radius: var(--is-radius, 10px);
  background: var(--is-bg-elev, #12151a);
  color: var(--is-text, #e6edf3);
  box-shadow: 0 18px 48px rgb(0 0 0 / 45%), 0 0 0 1px color-mix(in srgb, var(--is-accent, #1e90ff) 12%, transparent);
  font: 0.82rem/1.35 var(--is-font-sans, system-ui, sans-serif);
}
.mim-dg__menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  font: inherit;
  padding: 0.4rem 0.55rem;
  border-radius: 6px;
  cursor: pointer;
}
.mim-dg__menu-item:hover,
.mim-dg__menu-item:focus-visible {
  background: color-mix(in srgb, var(--is-accent, #1e90ff) 16%, transparent);
  color: var(--is-accent, #1e90ff);
  outline: none;
}
.mim-dg__menu-item is-icon { flex: 0 0 auto; }
.mim-dg__menu-sep {
  height: 1px;
  margin: 0.3rem 0.35rem;
  background: var(--is-border-soft, #3a4252);
}
.mim-dg__filter {
  padding: 0.65rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}
.mim-dg__filter-field,
.mim-dg__filter select,
.mim-dg__filter input {
  width: 100%;
  font: inherit;
  color: var(--is-text, #e6edf3);
  background: var(--is-bg-soft, #0e1116);
  border: 1px solid var(--is-border, #2a3140);
  border-radius: 6px;
  padding: 0.35rem 0.5rem;
}
.mim-dg__filter-actions,
.mim-dg__filter-actions-row {
  display: flex;
  gap: 0.4rem;
  justify-content: flex-end;
  flex-wrap: wrap;
}
.mim-dg__filter-btn,
.mim-dg__filter-link {
  font: inherit;
  font-size: 0.78rem;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid var(--is-border, #2a3140);
  background: transparent;
  color: inherit;
  padding: 0.3rem 0.65rem;
}
.mim-dg__filter-btn:hover,
.mim-dg__filter-link:hover {
  background: color-mix(in srgb, var(--is-accent, #1e90ff) 14%, transparent);
  color: var(--is-accent, #1e90ff);
}
.mim-dg__filter-btn[data-act="apply"] {
  background: color-mix(in srgb, var(--is-accent, #1e90ff) 22%, transparent);
  border-color: color-mix(in srgb, var(--is-accent, #1e90ff) 45%, var(--is-border, #2a3140));
  color: var(--is-accent, #1e90ff);
  font-weight: 700;
}
.mim-dg__filter-set {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 12rem;
  overflow: auto;
  border: 1px solid var(--is-border-soft, #3a4252);
  border-radius: 6px;
  padding: 0.25rem;
}
.mim-dg__filter-set-item {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.25rem 0.35rem;
  border-radius: 4px;
  cursor: pointer;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  width: 100%;
}
.mim-dg__filter-set-item:hover {
  background: color-mix(in srgb, var(--is-accent, #1e90ff) 12%, transparent);
}
`;

function ensureFloatingStyles() {
  if (typeof document === 'undefined') return;
  if (document.getElementById(FLOATING_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = FLOATING_STYLE_ID;
  style.textContent = FLOATING_CSS;
  document.head.appendChild(style);
}

defineElement('is-ag-grid', IsAgGrid, 'IsAgGrid');
