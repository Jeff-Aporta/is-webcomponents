import { adoptCss, defineElement, emit } from '../../core/element.js';
import { withStyleAttrs } from '../../core/attrs.js';

import { escapeHtml } from '../_shared/dom-utils.js';
import { AGGREGATION_FNS, LOGIC, filterTest, operatorNeedsInput, toDate } from '../_shared/grid-types.js';
import type { CellValue, ColumnDef, FilterRule, Operator, Row } from '../_shared/grid-types.js';

import {
  aggregateRows,
  aggregateTree,
  applyFilters,
  applySort,
  buildTree,
  cellValue,
  download,
  flattenTree,
  formattedValue,
  leavesOf,
  normalizeColumns,
  pivotData,
  resolveWidths,
  toDelimited,
  toSpreadsheetXml,
} from '../_shared/grid-data.js';
import {
  aggregationItems,
  createPopover,
  hidePopover,
  positionPopover,
  renderColumnsPanel,
  renderFilterPanel,
  renderMenu,
  showPopover,
} from '../_shared/grid-ui.js';
import '../actions/button.js';
import '../forms/input.js';
import '../forms/select.js';
import '../forms/option.js';
import '../forms/checkbox.js';

/* (Los tipos que dependen de `IsDataGrid` viven dentro del IIFE para evitar el
   problema de ordenación de declaraciones: las clases NO son hoisted como
   tipo en closures.) */

/**
 * <is-data-grid> — Tabla de datos con la superficie de MUI X Data Grid.
 *
 * Columnas: tipos string/number/date/dateTime/boolean/singleSelect/actions,
 * valueGetter, valueFormatter, renderCell, renderHeader, ancho fijo o flex,
 * resize, autosize, reorden por arrastre, visibilidad, anclaje izquierda y
 * derecha, grupos de cabecera anidados, colSpan y menú por columna.
 * Filas: id propio, alto fijo o por fila, densidad, anclaje arriba y abajo,
 * reorden, detail panel, tree data, agrupación con agregación y pivot.
 * Datos: multi-orden, filtros con Y/O, filtros de cabecera, quick filter,
 * paginación cliente o servidor, virtualización, carga incremental.
 * Edición: por celda o por fila, validación, portapapeles y undo/redo.
 * Salida: CSV, Excel (SpreadsheetML) e impresión.
 *
 * Props JS: columns, rows, pinnedRows, sortModel, filterModel, paginationModel,
 * rowSelectionModel, cellSelectionModel, columnVisibilityModel, pinnedColumns,
 * columnOrder, columnGroupingModel, rowGroupingModel, aggregationModel,
 * pivotModel, listViewColumn, hooks, localeText
 * Hooks: getRowId, getRowHeight, getRowClassName, getCellClassName,
 * getTreeDataPath, getDetailPanelContent, isRowSelectable, isCellEditable,
 * processRowUpdate, rowsLoader
 * Attrs: density, row-height, header-height, auto-height, pagination, page-size,
 * page-size-options, pagination-mode, row-count, sorting-mode, sorting-order,
 * filter-mode, selection-mode, checkbox-selection, cell-selection, editable,
 * edit-mode, show-toolbar, toolbar-tools, quick-filter, header-filters, hide-footer,
 * hide-footer-selected-count, virtualize, overscan, loading, loading-color,
 * list-view, tree-data, row-reorder, detail-height, tab-navigation, clipboard,
 * undo-redo, aggregation-position, disable-column-menu, disable-column-filter,
 * disable-column-sort, disable-column-resize, disable-column-reorder,
 * disable-multiple-sorting, disable-row-selection-on-click
 * Events: is-sort-change, is-filter-change, is-quick-filter, is-page-change,
 * is-select, is-cell-select, is-cell-click, is-cell-double-click, is-row-click,
 * is-row-double-click, is-edit-start, is-edit-stop, is-row-update,
 * is-column-resize, is-column-reorder, is-column-hide, is-column-pin,
 * is-density, is-detail-toggle, is-group-toggle, is-row-reorder, is-copy,
 * is-paste, is-undo, is-redo, is-rows-scroll-end, is-export
 * CSS parts: base, toolbar, toolbar-button, quick-filter, viewport, header,
 * header-row, header-cell, column-groups, header-filters, body, row, cell,
 * pinned-top, pinned-bottom, aggregation-row, detail-panel, overlay, footer,
 * pagination
 */

(() => {
  const DENSITY: Record<string, { row: number; header: number }> = {
    compact: { row: 36, header: 40 },
    standard: { row: 52, header: 52 },
    comfortable: { row: 67, header: 60 },
  };

  const ICONS: Record<string, string> = {
    asc: '▲', desc: '▼', menu: '⋮', filter: '⛃', columns: '☷', density: '≡',
    export: '⭳', search: '⌕', expand: '▸', collapse: '▾', drag: '⠿',
  };

  const TEXT = {
    noRows: 'Sin filas',
    noResults: 'Sin resultados',
    loading: 'Cargando…',
    quickFilter: 'Buscar…',
    columns: 'Columnas',
    filters: 'Filtros',
    density: 'Densidad',
    export: 'Exportar',
    groupColumn: 'Grupo',
    selected: (n: number) => `${n} seleccionada${n === 1 ? '' : 's'}`,
    total: (n: number) => `${n} fila${n === 1 ? '' : 's'}`,
    rowsPerPage: 'Filas por página',
    sortAsc: 'Ordenar ascendente',
    sortDesc: 'Ordenar descendente',
    unsort: 'Quitar orden',
    filterBy: 'Filtrar',
    filterAny: 'Cualquiera',
    rangeFrom: 'Desde',
    rangeTo: 'Hasta',
    hideColumn: 'Ocultar columna',
    manageColumns: 'Gestionar columnas',
    pinLeft: 'Anclar a la izquierda',
    pinRight: 'Anclar a la derecha',
    unpin: 'Desanclar',
    groupBy: 'Agrupar por esta columna',
    ungroup: 'Dejar de agrupar',
    autosize: 'Ajustar al contenido',
    csv: 'Descargar CSV',
    excel: 'Descargar Excel',
    print: 'Imprimir',
    compact: 'Compacta',
    standard: 'Estándar',
    comfortable: 'Cómoda',
  } as const;

  /** Se aceptan también los nombres de MUI (`linear-progress`, etc.). */
  const LOADING_VARIANTS: Record<string, string> = {
    skeleton: 'skeleton',
    progress: 'progress',
    linear: 'progress',
    'linear-progress': 'progress',
    spinner: 'spinner',
    circular: 'spinner',
    'circular-progress': 'spinner',
  };

  const TEMPLATE = document.createElement('template');
  TEMPLATE.innerHTML = /* html */ `
    <div part="base" class="base" data-density="standard">
      <div part="toolbar" class="toolbar" hidden>
        <slot name="toolbar-start"></slot>
        <div class="tool-search" hidden>
          <span class="tool-ico" aria-hidden="true">${ICONS.search}</span>
          <is-input type="search" class="quick" part="quick-filter" aria-label="Buscar"></is-input>
        </div>
        <span class="tool-gap"></span>
        <slot name="toolbar-end"></slot>
        <is-button variant="plain" color="neutral" class="tool" data-tool="columns" part="toolbar-button" aria-haspopup="dialog">
          <span aria-hidden="true">${ICONS.columns}</span><span class="tool-text"></span>
        </is-button>
        <is-button variant="plain" color="neutral" class="tool" data-tool="filters" part="toolbar-button" aria-haspopup="dialog">
          <span aria-hidden="true">${ICONS.filter}</span><span class="tool-text"></span><span class="badge" hidden></span>
        </is-button>
        <is-button variant="plain" color="neutral" class="tool" data-tool="density" part="toolbar-button" aria-haspopup="menu">
          <span aria-hidden="true">${ICONS.density}</span><span class="tool-text"></span>
        </is-button>
        <is-button variant="plain" color="neutral" class="tool" data-tool="export" part="toolbar-button" aria-haspopup="menu">
          <span aria-hidden="true">${ICONS.export}</span><span class="tool-text"></span>
        </is-button>
      </div>

      <div class="viewport" part="viewport" role="grid" tabindex="-1">
        <div class="head" part="header" role="rowgroup">
          <div class="group-rows" part="column-groups" hidden role="none"></div>
          <div class="head-row" part="header-row" role="row"></div>
          <div class="filter-head" part="header-filters" hidden role="row"></div>
        </div>
        <div class="pinned-top" part="pinned-top" role="rowgroup" hidden></div>
        <div class="body" part="body" role="rowgroup">
          <div class="rows" role="none"></div>
        </div>
        <div class="pinned-bottom" part="pinned-bottom" role="rowgroup" hidden></div>
        <div class="agg-row" part="aggregation-row" hidden role="row"></div>
      </div>

      <div class="overlay" part="overlay" hidden></div>

      <div part="footer" class="footer">
        <div class="foot-left">
          <span class="sel-count" hidden></span>
          <span class="row-count"></span>
        </div>
        <div class="pager" part="pagination" hidden>
          <label class="page-size">
            <span class="page-size-label"></span>
            <is-select class="page-size-select"></is-select>
          </label>
          <span class="page-info"></span>
          <is-button variant="plain" pill class="page-btn" data-page="first" aria-label="Primera página">«</is-button>
          <is-button variant="plain" pill class="page-btn" data-page="prev" aria-label="Página anterior">‹</is-button>
          <is-button variant="plain" pill class="page-btn" data-page="next" aria-label="Página siguiente">›</is-button>
          <is-button variant="plain" pill class="page-btn" data-page="last" aria-label="Última página">»</is-button>
        </div>
      </div>
    </div>
  `;

  const OBSERVED: readonly string[] = [
    'density', 'row-height', 'header-height', 'auto-height', 'page-size',
    'page-size-options', 'pagination', 'pagination-mode', 'row-count',
    'sorting-mode', 'sorting-order', 'filter-mode', 'selection-mode',
    'checkbox-selection', 'cell-selection', 'disable-row-selection-on-click',
    'disable-column-menu', 'disable-column-filter', 'disable-column-sort',
    'disable-column-resize', 'disable-column-reorder', 'disable-multiple-sorting',
    'edit-mode', 'editable', 'show-toolbar', 'toolbar-tools', 'quick-filter', 'header-filters',
    'hide-footer', 'hide-footer-selected-count', 'virtualize', 'overscan',
    'loading', 'loading-variant', 'list-view', 'tree-data', 'row-reorder',
    'detail-height', 'tab-navigation', 'clipboard', 'undo-redo',
    'aggregation-position', 'selectable', 'filterable',
  ];

  /** Tipos internos: viven aquí para poder usar `IsDataGrid` como tipo. */

  /** Acción por fila expuesta por `getActions`. */
  type RowAction = {
    label?: string;
    icon?: string;
    onClick?: (params: { id: CellValue; row: Row; api: IsDataGrid }) => void;
    showInMenu?: boolean;
    disabled?: boolean;
  };

  /** Foco del teclado. */
  type FocusArea =
    | { area?: undefined; id: CellValue; field: string }
    | { area: 'header'; field: string };

  /** Edición en curso. */
  type EditState = {
    id: CellValue;
    field: string;
    fields: string[];
    values: Record<string, CellValue>;
    errors: Record<string, string>;
  };

  /** Rango de celdas seleccionadas. */
  type CellRange = {
    start: { id: CellValue; field: string };
    end: { id: CellValue; field: string };
  };

  /** Nodo del árbol de filas. */
  type GridNode = {
    kind: 'leaf' | 'group';
    id: CellValue;
    row?: Row;
    children?: GridNode[];
    rows?: Row[];
    depth?: number;
    key?: CellValue;
    aggregates?: Record<string, { fn: string; value: CellValue }>;
    baseHeight?: number;
    height?: number;
    pinned?: 'top' | 'bottom';
    path?: readonly string[];
  };

  /** Salida del renderMenu (pop-item). */
  type MenuItem = {
    label?: string;
    icon?: string;
    action?: string;
    value?: string | number;
    checked?: boolean;
    disabled?: boolean;
    separator?: boolean;
  };

  /** Estado de redimensionado de columna. */
  type ResizeState = { field: string; startX: number; startWidth: number };

  /** Rango de celdas resuelto en índices. */
  type RangeBounds = {
    rows: [number, number];
    cols: [number, number];
    ids: string[];
    fields: string[];
  };

  /** Resultado de renderCell: una celda + span opcional. */
  type CellRender = { el: HTMLElement; spanCount: number };

  /** Entrada del modelo de orden. */
  type SortEntry = { field: string; sort: string | null };

  /** Parche de undo/redo. */
  type HistoryPatch = Array<{ id: CellValue; before: Row; after: Row }>;

  /** Pivot model. */
  type PivotModel = {
    rows: string[];
    columns: string[];
    values: Array<{ field: string; fn: string }>;
  };

  /** Detalle del evento de selección. */
  type RowSelectionDetail = {
    rowSelectionModel: CellValue[];
    selectedRows: Row[];
    selectedIndices: number[];
  };

  type CellSelectionDetail = { cellSelectionModel: CellRange | null };

  /** Modelo de paginación. */
  type PaginationModel = { page: number; pageSize: number };

  type PageChangeDetail = PaginationModel;

  /** Localización y etiquetas del componente. */
  type LocaleText = typeof TEXT & Record<string, string | ((n: number) => string)>;

  /** Hooks públicos del grid (lo que el consumidor puede inyectar). */
  type Hooks = {
    getRowId?: (row: Row) => CellValue;
    getRowHeight?: (row: Row) => number;
    getRowClassName?: (params: { row: Row; id: CellValue; index: number }) => string;
    getCellClassName?: (params: { value: CellValue; row: Row; id: CellValue; field: string }) => string;
    getTreeDataPath?: (row: Row) => readonly string[];
    getDetailPanelContent?: (params: { row: Row; id: CellValue }) => Node | string | { html?: string } | null;
    isRowSelectable?: (params: { row: Row; id: CellValue }) => boolean;
    isCellEditable?: (params: { row: Row; id: CellValue; field: string }) => boolean;
    processRowUpdate?: (row: Row, before: Row) => Promise<Row | void> | Row | void;
    rowsLoader?: (params: { start: number; api: IsDataGrid }) => Promise<Row[]> | void;
  };

  /** Hooks aplicados al elemento real: `this.#hooks`. */
  type ResolvedHooks = {
    getRowId?: (row: Row) => CellValue;
    getRowHeight?: (row: Row) => number;
    getRowClassName?: (params: { row: Row; id: CellValue; index: number }) => string;
    getCellClassName?: (params: { value: CellValue; row: Row; id: CellValue; field: string }) => string;
    getTreeDataPath?: (row: Row) => readonly string[];
    getDetailPanelContent?: (params: { row: Row; id: CellValue }) => Node | string | { html?: string } | null;
    isRowSelectable?: (params: { row: Row; id: CellValue }) => boolean;
    isCellEditable?: (params: { row: Row; id: CellValue; field: string }) => boolean;
    processRowUpdate?: (row: Row, before: Row) => Promise<Row | void> | Row | void;
    rowsLoader?: (params: { start: number; api: IsDataGrid }) => Promise<Row[]> | void;
  };

  /** Argumento del `getActions` que acepta el kit (forma más explícita). */
  type ActionParams = { row: Row; id: CellValue; colDef: ColumnDef };

  class IsDataGrid extends withStyleAttrs(HTMLElement) {
    /** Personalización por atributo (ver `core/attrs.ts`). */
    static styleAttrs = {
      radius: '--is-grid-radius',
      accent: { prop: '--is-grid-accent', onlyColorValues: true },
      'header-bg': { prop: '--is-grid-header-bg', onlyColorValues: true },
      'row-hover': { prop: '--is-grid-row-hover', onlyColorValues: true },
      height: '--is-grid-height',
      padding: '--is-grid-pad',
    };

    static get observedAttributes(): string[] {
      return [...OBSERVED, 'radius', 'accent', 'header-bg', 'row-hover', 'height', 'padding'];
    }

    /* DOM */
    #base!: HTMLElement;
    #toolbar!: HTMLElement;
    #quick!: HTMLElement;
    #viewport!: HTMLElement;
    #head!: HTMLElement;
    #groupRows!: HTMLElement;
    #headRow!: HTMLElement;
    #filterHead!: HTMLElement;
    #pinnedTop!: HTMLElement;
    #pinnedBottom!: HTMLElement;
    #body!: HTMLElement;
    #rowsEl!: HTMLElement;
    #aggRow!: HTMLElement;
    #overlay!: HTMLElement;
    #footer!: HTMLElement;
    #selCount!: HTMLElement;
    #rowCount!: HTMLElement;
    #pager!: HTMLElement;
    #pageInfo!: HTMLElement;
    #pageSizeSelect!: HTMLElement;
    #menu!: HTMLElement;
    #columnsPanel!: HTMLElement;
    #filterPanel!: HTMLElement;

    /* Estado declarado */
    #mounted = false;
    #rawColumns: ColumnDef[] = [];
    #cols: ColumnDef[] = [];
    #activeCols: ColumnDef[] = [];
    #rows: Row[] = [];
    #idCache = new WeakMap<object, CellValue>();
    #pinnedRowsModel: { top: Row[]; bottom: Row[] } = { top: [], bottom: [] };
    #sortModel: SortEntry[] = [];
    #filterModel: { items: FilterRule[]; logicOperator: string } = { items: [], logicOperator: LOGIC.AND };
    #quickValue = '';
    #visibility: Record<string, boolean> = {};
    #pinnedCols: { left: string[]; right: string[] } = { left: [], right: [] };
    #order: string[] | null = null;
    #widthOverrides: Record<string, number> = {};
    #groupingModel: string[] = [];
    #aggregationModel: Record<string, string> = {};
    #pivotModel: PivotModel | null = null;
    #pivot: { rows: Row[]; columns: ColumnDef[] } | null = null;
    #columnGroups: Array<Record<string, CellValue>> = [];
    #listViewColumn: Partial<ColumnDef> | null = null;
    #selection = new Set<CellValue>();
    #lastSelectedId: CellValue = null;
    #cellAnchor: { id: CellValue; field: string } | null = null;
    #cellRange: CellRange | null = null;
    #expanded = new Set<CellValue>();
    #detailOpen = new Set<CellValue>();
    #edit: EditState | null = null;
    #focus: FocusArea | null = null;
    #page = 0;
    #undoStack: HistoryPatch[] = [];
    #redoStack: HistoryPatch[] = [];
    #nodes: GridNode[] = [];
    #offsets = new Float64Array(1);
    #leafRows: Row[] = [];
    #footerAgg: Record<string, { fn: string; value: CellValue }> = {};
    #widths: Record<string, number> = {};
    #stickyLeft: Record<string, number> = {};
    #stickyRight: Record<string, number> = {};
    #totalWidth = 0;
    #available = 0;
    #renderedRange = { from: 0, to: 0 };
    #raf = 0;
    #scrollRaf = 0;
    #resizeState: ResizeState | null = null;
    #hooks: ResolvedHooks = {};
    #text: LocaleText = { ...TEXT };
    #ro: ResizeObserver | null = null;
    #reachedEnd = false;
    #openPop: string | null = null;
    #popAnchor: HTMLElement | null = null;
    #menuActions: RowAction[] | null = null;
    #menuActionRow: { id: CellValue; row: Row } | null = null;

    constructor() {
      super();
      const shadow = this.attachShadow({ mode: 'open' });
      adoptCss(shadow, import.meta.url);
      shadow.appendChild(TEMPLATE.content.cloneNode(true));

      // Todos estos elementos vienen de la plantilla que este mismo
      // componente acaba de clonar: si faltara alguno, el grid no existiria.
      // La afirmacion se hace aqui una vez, no en cada uno de sus usos.
      const $ = <T extends HTMLElement = HTMLElement>(sel: string): T =>
        shadow.querySelector<T>(sel)!;
      this.#base = $('.base');
      this.#toolbar = $('.toolbar');
      this.#quick = $('.quick');
      this.#viewport = $('.viewport');
      this.#head = $('.head');
      this.#groupRows = $('.group-rows');
      this.#headRow = $('.head-row');
      this.#filterHead = $('.filter-head');
      this.#pinnedTop = $('.pinned-top');
      this.#pinnedBottom = $('.pinned-bottom');
      this.#body = $('.body');
      this.#rowsEl = $('.rows');
      this.#aggRow = $('.agg-row');
      this.#overlay = $('.overlay');
      this.#footer = $('.footer');
      this.#selCount = $('.sel-count');
      this.#rowCount = $('.row-count');
      this.#pager = $('.pager');
      this.#pageInfo = $('.page-info');
      this.#pageSizeSelect = $('.page-size-select');

      this.#menu = createPopover('menu');
      this.#columnsPanel = createPopover('panel columns-panel');
      this.#filterPanel = createPopover('panel filter-panel');
      shadow.append(this.#menu, this.#columnsPanel, this.#filterPanel);

      this.#toolbar.addEventListener('click', this.#onToolbarClick);
      this.#quick.addEventListener('input', this.#onQuickInput);
      this.#head.addEventListener('click', this.#onHeadClick);
      this.#head.addEventListener('keydown', this.#onHeadKey);
      this.#head.addEventListener('pointerdown', this.#onHeadPointerDown);
      this.#head.addEventListener('dblclick', this.#onHeadDblClick);
      this.#headRow.addEventListener('dragstart', this.#onColDragStart);
      this.#headRow.addEventListener('dragover', this.#onColDragOver);
      this.#headRow.addEventListener('dragleave', this.#onColDragLeave);
      this.#headRow.addEventListener('drop', this.#onColDrop);
      this.#headRow.addEventListener('dragend', this.#onColDragEnd);
      this.#filterHead.addEventListener('change', this.#onHeaderFilterChange);
      this.#filterHead.addEventListener('input', this.#onHeaderFilterInput);
      this.#viewport.addEventListener('scroll', this.#onScroll, { passive: true });
      this.#viewport.addEventListener('click', this.#onBodyClick);
      this.#viewport.addEventListener('dblclick', this.#onBodyDblClick);
      this.#viewport.addEventListener('keydown', this.#onKeyDown);
      this.#viewport.addEventListener('focusin', this.#onFocusIn);
      this.#viewport.addEventListener('pointerover', this.#onBodyPointerOver);
      this.#viewport.addEventListener('copy', this.#onCopyEvent);
      this.#viewport.addEventListener('paste', this.#onPasteEvent);
      this.#rowsEl.addEventListener('dragstart', this.#onRowDragStart);
      this.#rowsEl.addEventListener('dragover', this.#onRowDragOver);
      this.#rowsEl.addEventListener('drop', this.#onRowDrop);
      this.#footer.addEventListener('click', this.#onFooterClick);
      this.#pageSizeSelect.addEventListener('is-change', this.#onPageSizeChange);
      this.#menu.addEventListener('click', this.#onMenuClick);
      this.#columnsPanel.addEventListener('change', this.#onColumnsPanelChange);
      this.#columnsPanel.addEventListener('input', this.#onColumnsPanelSearch);
      this.#columnsPanel.addEventListener('click', this.#onColumnsPanelClick);
      this.#filterPanel.addEventListener('click', this.#onFilterPanelClick);
      this.#filterPanel.addEventListener('change', this.#onFilterPanelChange);
      this.#filterPanel.addEventListener('is-change', this.#onFilterPanelChange);
      this.#filterPanel.addEventListener('input', this.#onFilterPanelInput);
    }

    connectedCallback(): void {
      super.connectedCallback();
      this.#mounted = true;
      this.#normalize();
      this.#syncChrome();
      this.#ro = new ResizeObserver(() => this.#onResize());
      this.#ro.observe(this.#viewport);
      addEventListener('pointerdown', this.#onDocPointerDown, true);
      this.#compute();
    }

    disconnectedCallback(): void {
      this.#mounted = false;
      this.#ro?.disconnect();
      if (this.#resizeState) this.#onResizeEnd();
      removeEventListener('pointerdown', this.#onDocPointerDown, true);
      cancelAnimationFrame(this.#raf);
      cancelAnimationFrame(this.#scrollRaf);
      this.#closePop();
    }

    attributeChangedCallback(name: string, oldVal: string | null, newVal: string | null): void {
      super.attributeChangedCallback(name, oldVal, newVal);
      if (!this.#mounted || oldVal === newVal) return;
      if (name === 'page-size' || name === 'pagination') this.#page = 0;
      if (name === 'editable') this.#normalize();
      this.#syncChrome();
      this.#refresh();
    }

    /* ── Modelos ─────────────────────────────────────────────────────── */

    get columns(): ColumnDef[] { return this.#rawColumns; }
    set columns(v: ColumnDef[] | null | undefined) {
      this.#rawColumns = Array.isArray(v) ? v.slice() : [];
      this.#order = null;
      this.#normalize();
      this.#refresh();
    }

    get rows(): Row[] { return this.#rows; }
    set rows(v: Row[] | null | undefined) {
      this.#rows = Array.isArray(v) ? v.slice() : [];
      this.#idCache = new WeakMap();
      this.#reachedEnd = false;
      this.#refresh();
    }

    get pinnedRows(): { top: Row[]; bottom: Row[] } { return this.#pinnedRowsModel; }
    set pinnedRows(v: { top?: Row[]; bottom?: Row[] } | null | undefined) {
      this.#pinnedRowsModel = { top: v?.top || [], bottom: v?.bottom || [] };
      this.#refresh();
    }

    get sortModel(): SortEntry[] { return this.#sortModel; }
    set sortModel(v: SortEntry[] | null | undefined) {
      this.#sortModel = (v || []).filter((s: SortEntry) => s?.field);
      this.#refresh();
    }

    get filterModel(): { items: FilterRule[]; logicOperator: string } { return this.#filterModel; }
    set filterModel(v: { items?: FilterRule[]; logicOperator?: string } | null | undefined) {
      this.#filterModel = {
        items: (v?.items || []).map((item: FilterRule) => ({ ...item })),
        logicOperator: v?.logicOperator === LOGIC.OR ? LOGIC.OR : LOGIC.AND,
      };
      this.#page = 0;
      this.#refresh();
    }

    get quickFilterValue(): string { return this.#quickValue; }
    set quickFilterValue(v: string | null | undefined) {
      this.#quickValue = String(v ?? '');
      const quick = this.#quick as unknown as { value: string };
      if (quick.value !== this.#quickValue) quick.value = this.#quickValue;
      this.#page = 0;
      this.#refresh();
    }

    get columnVisibilityModel(): Record<string, boolean> { return { ...this.#visibility }; }
    set columnVisibilityModel(v: Record<string, boolean> | null | undefined) {
      this.#visibility = { ...(v || {}) };
      this.#refresh();
    }

    get pinnedColumns(): { left: string[]; right: string[] } {
      return { left: [...this.#pinnedCols.left], right: [...this.#pinnedCols.right] };
    }
    set pinnedColumns(v: { left?: string[]; right?: string[] } | null | undefined) {
      this.#pinnedCols = { left: [...(v?.left || [])], right: [...(v?.right || [])] };
      this.#refresh();
    }

    get columnOrder(): string[] { return this.#visibleCols().map((c: ColumnDef) => c.field ?? ''); }
    set columnOrder(fields: string[] | null | undefined) {
      this.#order = Array.isArray(fields) ? fields.slice() : null;
      this.#refresh();
    }

    get columnGroupingModel(): Array<Record<string, CellValue>> { return this.#columnGroups; }
    set columnGroupingModel(v: Array<Record<string, CellValue>> | null | undefined) {
      this.#columnGroups = Array.isArray(v) ? v : [];
      this.#refresh();
    }

    get rowGroupingModel(): string[] { return [...this.#groupingModel]; }
    set rowGroupingModel(v: string[] | null | undefined) {
      this.#groupingModel = (v || []).filter(Boolean);
      this.#refresh();
    }

    get aggregationModel(): Record<string, string> { return { ...this.#aggregationModel }; }
    set aggregationModel(v: Record<string, string> | null | undefined) {
      this.#aggregationModel = { ...(v || {}) };
      this.#refresh();
    }

    get pivotModel(): PivotModel | null { return this.#pivotModel; }
    set pivotModel(v: PivotModel | null | undefined) {
      this.#pivotModel = v || null;
      this.#refresh();
    }

    get listViewColumn(): Partial<ColumnDef> | null { return this.#listViewColumn; }
    set listViewColumn(v: Partial<ColumnDef> | null | undefined) {
      this.#listViewColumn = v || null;
      this.#refresh();
    }

    get paginationModel(): PaginationModel {
      return { page: this.#page, pageSize: this.pageSize };
    }
    set paginationModel(v: { page?: number; pageSize?: number } | null | undefined) {
      if (v?.pageSize && v.pageSize !== this.pageSize) this.setAttribute('page-size', String(v.pageSize));
      this.#page = Math.max(0, Number(v?.page) || 0);
      this.#refresh();
    }

    get rowSelectionModel(): CellValue[] { return [...this.#selection]; }
    set rowSelectionModel(ids: Iterable<CellValue> | null | undefined) {
      this.#selection = new Set(ids || []);
      this.#refresh();
      this.#emitSelection();
    }

    get selectedRows(): Row[] {
      const byId = this.#rowIndex();
      return [...this.#selection].map((id: CellValue) => byId.get(id)).filter(Boolean) as Row[];
    }
    /** Compatibilidad con la versión previa basada en índices. */
    set selectedRows(list: Row[] | null | undefined) {
      const wanted = new Set<Row>(list || []);
      this.#selection = new Set();
      this.#rows.forEach((row, i: number) => {
        if (wanted.has(row)) this.#selection.add(this.#idOf(row, i));
      });
      this.#refresh();
      this.#emitSelection();
    }

    get selectedIndices(): number[] {
      const ids = this.#selection;
      return this.#rows.reduce<number[]>((acc, row, i) => {
        if (ids.has(this.#idOf(row, i))) acc.push(i);
        return acc;
      }, []);
    }
    set selectedIndices(list: number[] | null | undefined) {
      this.#selection = new Set((list || [])
        .map(Number)
        .filter((i: number) => i >= 0 && i < this.#rows.length)
        .map((i: number) => this.#idOf(this.#rows[i]!, i)));
      this.#refresh();
      this.#emitSelection();
    }

    get cellSelectionModel(): CellRange | null { return this.#cellRange; }
    set cellSelectionModel(v: CellRange | null | undefined) {
      this.#cellRange = v || null;
      this.#refresh();
    }

    get hooks(): Hooks { return this.#hooks; }
    set hooks(v: Hooks | null | undefined) {
      this.#hooks = { ...(v || {}) } as ResolvedHooks;
      this.#refresh();
    }

    get localeText(): LocaleText { return this.#text; }
    set localeText(v: Partial<LocaleText> | null | undefined) {
      this.#text = { ...TEXT, ...(v || {}) };
      this.#syncChrome();
      this.#refresh();
    }

    set getRowId(fn: Hooks['getRowId']) { this.#hooks.getRowId = fn; this.#refresh(); }
    set getRowHeight(fn: Hooks['getRowHeight']) { this.#hooks.getRowHeight = fn; this.#refresh(); }
    set getRowClassName(fn: Hooks['getRowClassName']) { this.#hooks.getRowClassName = fn; this.#refresh(); }
    set getCellClassName(fn: Hooks['getCellClassName']) { this.#hooks.getCellClassName = fn; this.#refresh(); }
    set getTreeDataPath(fn: Hooks['getTreeDataPath']) { this.#hooks.getTreeDataPath = fn; this.#refresh(); }
    set getDetailPanelContent(fn: Hooks['getDetailPanelContent']) { this.#hooks.getDetailPanelContent = fn; this.#refresh(); }
    set isRowSelectable(fn: Hooks['isRowSelectable']) { this.#hooks.isRowSelectable = fn; }
    set isCellEditable(fn: Hooks['isCellEditable']) { this.#hooks.isCellEditable = fn; }
    set processRowUpdate(fn: Hooks['processRowUpdate']) { this.#hooks.processRowUpdate = fn; }
    set rowsLoader(fn: Hooks['rowsLoader']) { this.#hooks.rowsLoader = fn; }

    /* ── Atributos ───────────────────────────────────────────────────── */

    get density(): string {
      const d = this.getAttribute('density');
      return d != null && DENSITY[d] ? d : 'standard';
    }
    set density(v: string) { this.setAttribute('density', v); }

    get rowHeight(): number {
      const n = Number(this.getAttribute('row-height'));
      return Number.isFinite(n) && n > 0 ? n : DENSITY[this.density].row;
    }
    set rowHeight(v: number) { this.setAttribute('row-height', String(v)); }

    get headerHeight(): number {
      const n = Number(this.getAttribute('header-height'));
      return Number.isFinite(n) && n > 0 ? n : DENSITY[this.density].header;
    }

    get pageSize(): number {
      const n = Number(this.getAttribute('page-size'));
      if (Number.isFinite(n) && n > 0) return Math.floor(n);
      return this.pageSizeOptions[0] ?? 25;
    }
    set pageSize(v: number) { this.setAttribute('page-size', String(Math.max(1, Number(v) || 10))); }

    get pageSizeOptions(): number[] {
      const list = String(this.getAttribute('page-size-options') || '10,25,50,100')
        .split(/[\s,]+/).map(Number).filter((n: number) => n > 0);
      return list.length ? list : [10, 25, 50, 100];
    }

    /** `page-size` sin `pagination` también pagina: así funcionaba la v1. */
    get pagination(): boolean {
      return this.hasAttribute('pagination') || this.hasAttribute('page-size');
    }
    set pagination(v: boolean) { this.toggleAttribute('pagination', !!v); }

    get paginationMode(): 'client' | 'server' {
      return this.getAttribute('pagination-mode') === 'server' ? 'server' : 'client';
    }
    get sortingMode(): 'client' | 'server' {
      return this.getAttribute('sorting-mode') === 'server' ? 'server' : 'client';
    }
    get filterMode(): 'client' | 'server' {
      return this.getAttribute('filter-mode') === 'server' ? 'server' : 'client';
    }

    get sortingOrder(): Array<string | null> {
      const list = String(this.getAttribute('sorting-order') || 'asc,desc,null')
        .split(/[\s,]+/).filter(Boolean)
        .map((s: string) => (s === 'null' || s === 'none' ? null : s));
      return list.length ? list : ['asc', 'desc', null];
    }

    get rowCount(): number | null {
      const n = Number(this.getAttribute('row-count'));
      return Number.isFinite(n) && n >= 0 && this.hasAttribute('row-count') ? n : null;
    }
    set rowCount(v: number) { this.setAttribute('row-count', String(v)); }

    get selectionMode(): 'none' | 'single' | 'multiple' {
      const v = this.getAttribute('selection-mode');
      if (v === 'none' || v === 'single' || v === 'multiple') return v;
      return this.checkboxSelection ? 'multiple' : 'single';
    }
    set selectionMode(v: 'none' | 'single' | 'multiple') { this.setAttribute('selection-mode', v); }

    get checkboxSelection(): boolean {
      return this.hasAttribute('checkbox-selection') || this.hasAttribute('selectable');
    }
    set checkboxSelection(v: boolean) { this.toggleAttribute('checkbox-selection', !!v); }

    get cellSelection(): boolean { return this.hasAttribute('cell-selection'); }
    set cellSelection(v: boolean) { this.toggleAttribute('cell-selection', !!v); }

    get editMode(): 'cell' | 'row' {
      return this.getAttribute('edit-mode') === 'row' ? 'row' : 'cell';
    }
    set editMode(v: 'cell' | 'row') { this.setAttribute('edit-mode', v); }

    get loading(): boolean { return this.hasAttribute('loading'); }
    set loading(v: boolean) { this.toggleAttribute('loading', !!v); }

    get treeData(): boolean { return this.hasAttribute('tree-data'); }
    set treeData(v: boolean) { this.toggleAttribute('tree-data', !!v); }

    get listView(): boolean { return this.hasAttribute('list-view'); }
    set listView(v: boolean) { this.toggleAttribute('list-view', !!v); }

    get filterable(): boolean { return this.hasAttribute('filterable'); }
    set filterable(v: boolean) { this.toggleAttribute('filterable', !!v); }

    /**
     * Botones Columnas / Filtros / Densidad / Exportar de la toolbar.
     * `toolbar-tools="false"` los oculta (la búsqueda sigue gobernada por `quick-filter`).
     */
    get toolbarTools(): boolean { return this.getAttribute('toolbar-tools') !== 'false'; }
    set toolbarTools(v: boolean) {
      if (v) this.removeAttribute('toolbar-tools');
      else this.setAttribute('toolbar-tools', 'false');
    }

    get selectable(): boolean { return this.hasAttribute('selectable'); }
    set selectable(v: boolean) { this.toggleAttribute('selectable', !!v); }

    get virtualize(): boolean { return this.getAttribute('virtualize') !== 'false'; }

    get overscan(): number {
      const n = Number(this.getAttribute('overscan'));
      return this.hasAttribute('overscan') && Number.isFinite(n) && n >= 0 ? n : 6;
    }

    get tabNavigation(): 'content' | 'header' | 'all' | 'none' {
      const v = this.getAttribute('tab-navigation');
      return ['content', 'header', 'all'].includes(v ?? '') ? (v as 'content' | 'header' | 'all') : 'none';
    }

    get aggregationPosition(): 'inline' | 'footer' {
      return this.getAttribute('aggregation-position') === 'inline' ? 'inline' : 'footer';
    }

    get detailHeight(): number {
      const n = Number(this.getAttribute('detail-height'));
      return Number.isFinite(n) && n > 0 ? n : 160;
    }

    /* ── API imperativa ──────────────────────────────────────────────── */

    get api(): IsDataGrid { return this; }

    refresh(): void { this.#refresh(); }

    setPage(page: number): void {
      this.paginationModel = { page, pageSize: this.pageSize };
      this.#emitPagination();
    }

    setPageSize(size: number): void {
      this.pageSize = size;
      this.#page = 0;
      this.#emitPagination();
    }

    setSortModel(model: SortEntry[]): void {
      this.sortModel = model;
      emit(this, 'is-sort-change', { sortModel: this.#sortModel });
    }

    sortColumn(field: string, dir: string | null): void { this.#applySort(field, dir, false); }

    setFilterModel(model: { items?: FilterRule[]; logicOperator?: string }): void {
      this.filterModel = model;
      emit(this, 'is-filter-change', { filterModel: this.#filterModel });
    }

    setQuickFilter(value: string): void {
      this.quickFilterValue = value;
      emit(this, 'is-quick-filter', { value: this.#quickValue });
    }

    setColumnVisibility(field: string, visible: boolean): void {
      this.#visibility = { ...this.#visibility, [field]: !!visible };
      this.#refresh();
      emit(this, 'is-column-hide', {
        columnVisibilityModel: this.columnVisibilityModel, field, visible: !!visible,
      });
    }

    setColumnWidth(field: string, width: number): void {
      this.#widthOverrides = { ...this.#widthOverrides, [field]: Math.max(40, Number(width) || 0) };
      this.#refresh();
      emit(this, 'is-column-resize', { field, width: this.#widthOverrides[field] });
    }

    pinColumn(field: string, side: 'left' | 'right' | null): void {
      const left = this.#pinnedCols.left.filter((f: string) => f !== field);
      const right = this.#pinnedCols.right.filter((f: string) => f !== field);
      if (side === 'left') left.push(field);
      if (side === 'right') right.unshift(field);
      this.#pinnedCols = { left, right };
      this.#refresh();
      emit(this, 'is-column-pin', { field, side: side || null, pinnedColumns: this.pinnedColumns });
    }

    autosizeColumns(fields?: string[]): void {
      const targets = fields?.length ? fields : this.#visibleCols().map((c: ColumnDef) => c.field ?? '');
      for (const field of targets) this.#autosize(field);
    }

    setDensity(value: string): void {
      if (!DENSITY[value]) return;
      this.setAttribute('density', value);
      emit(this, 'is-density', { density: value });
    }

    selectRow(id: CellValue, selected = true, keepOthers = true): void {
      if (!keepOthers) this.#selection.clear();
      if (selected) this.#selection.add(id);
      else this.#selection.delete(id);
      this.#propagateSelection(id, selected);
      this.#lastSelectedId = id;
      this.#refresh();
      this.#emitSelection();
    }

    selectAll(selected = true): void {
      if (selected) for (const row of this.#selectableRows()) this.#selection.add(this.#idOf(row));
      else this.#selection.clear();
      this.#refresh();
      this.#emitSelection();
    }

    getRow(id: CellValue): Row | undefined { return this.#rowIndex().get(id); }

    updateRows(updates: Array<{ id?: CellValue } & Partial<Row>> | null | undefined): number {
      const byId = this.#rowIndex();
      const patch: HistoryPatch = [];
      for (const update of updates || []) {
        const id = update?.id ?? null;
        const target = byId.get(id);
        if (!target) continue;
        patch.push({ id, before: { ...target }, after: { ...target, ...update } });
        Object.assign(target, update);
      }
      if (patch.length) {
        this.#pushUndo(patch);
        this.#refresh();
      }
      return patch.length;
    }

    scrollToIndex(index: number): void {
      const at = Math.max(0, Math.min(index, this.#nodes.length - 1));
      this.#viewport.scrollTop = this.#offsets[at] || 0;
    }

    startEdit(id: CellValue, field: string): void { this.#startEdit(id, field); }
    stopEdit(save = true): Promise<void> { return this.#stopEdit(save); }

    toggleDetailPanel(id: CellValue): void { this.#toggleDetail(id); }
    toggleGroup(id: CellValue): void { this.#toggleGroup(id); }

    expandAll(): void {
      // Puede llamarse justo después de asignar rows, antes del primer pintado.
      if (!this.#nodes.length) this.#compute();
      for (const node of this.#allGroups()) this.#expanded.add(node.id);
      this.#refresh();
    }

    collapseAll(): void {
      this.#expanded.clear();
      this.#refresh();
    }

    setRowGroupingModel(model: string[]): void {
      this.rowGroupingModel = model;
      emit(this, 'is-group-model', { rowGroupingModel: this.rowGroupingModel });
    }

    setAggregationModel(model: Record<string, string>): void {
      this.aggregationModel = model;
      emit(this, 'is-aggregation', { aggregationModel: this.aggregationModel });
    }

    exportDataAsCsv(opts: {
      delimiter?: string;
      fileName?: string;
      allColumns?: boolean;
      utf8WithBom?: boolean;
    } = {}): void {
      const { delimiter = ',', fileName = 'datos.csv', allColumns = false, utf8WithBom = true } = opts;
      const matrix = this.#matrix({ allColumns });
      const body = toDelimited(matrix, delimiter);
      download(fileName, utf8WithBom ? `\uFEFF${body}` : body, 'text/csv');
      emit(this, 'is-export', { format: 'csv', rows: matrix.length - 1 });
    }

    exportDataAsExcel(opts: {
      fileName?: string;
      allColumns?: boolean;
      sheetName?: string;
    } = {}): void {
      const { fileName = 'datos.xls', allColumns = false, sheetName = 'Datos' } = opts;
      const matrix = this.#matrix({ allColumns, raw: true });
      download(fileName, toSpreadsheetXml(matrix, sheetName), 'application/vnd.ms-excel');
      emit(this, 'is-export', { format: 'excel', rows: matrix.length - 1 });
    }

    exportDataAsPrint(opts: { fileName?: string; allColumns?: boolean } = {}): void {
      const matrix = this.#matrix({ allColumns: opts.allColumns });
      const html = `<!doctype html><meta charset="utf-8"><title>${escapeHtml(opts.fileName || document.title)}</title>
        <style>body{font:12px system-ui;margin:16px}table{border-collapse:collapse;width:100%}
        th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#f2f2f2}</style>
        <table><thead><tr>${matrix[0].map((h: string) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
        <tbody>${matrix.slice(1).map((r: string[]) => `<tr>${r.map((c: string) => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
      const frame = document.createElement('iframe');
      frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
      frame.addEventListener('load', () => {
        frame.contentWindow?.focus();
        frame.contentWindow?.print();
        setTimeout(() => frame.remove(), 1000);
      });
      document.body.appendChild(frame);
      frame.srcdoc = html;
      emit(this, 'is-export', { format: 'print', rows: matrix.length - 1 });
    }

    copySelectionToClipboard(): string { return this.#copySelection(); }

    undo(): void { this.#applyHistory(this.#undoStack, this.#redoStack, 'is-undo', 'before'); }
    redo(): void { this.#applyHistory(this.#redoStack, this.#undoStack, 'is-redo', 'after'); }

    /* ── Núcleo ──────────────────────────────────────────────────────── */

    #normalize(): void {
      this.#cols = normalizeColumns(this.#rawColumns, { editableAll: this.hasAttribute('editable') });
    }

    /** Sin `id` ni `getRowId` el id es la posición original, memoizada por fila. */
    #idOf(row: Row, index?: number): CellValue {
      if (this.#hooks.getRowId) return this.#hooks.getRowId(row);
      if (row && row.id != null) return row.id;
      if (index != null) return `row-${index}`;
      const cached = this.#idCache.get(row);
      if (cached !== undefined) return cached;
      const id = `row-${this.#rows.indexOf(row)}`;
      this.#idCache.set(row, id);
      return id;
    }

    #rowIndex(): Map<CellValue, Row> {
      const map = new Map<CellValue, Row>();
      this.#rows.forEach((row, i: number) => map.set(this.#idOf(row, i), row));
      for (const row of [...this.#pinnedRowsModel.top, ...this.#pinnedRowsModel.bottom]) {
        map.set(this.#idOf(row), row);
      }
      return map;
    }

    #nodeById(id: CellValue): GridNode | null {
      const key = String(id);
      return this.#nodes.find((n: GridNode) => String(n.id) === key) || this.#pinnedNode(key);
    }

    #pinnedNode(id: string): GridNode | null {
      for (const zone of ['top', 'bottom'] as const) {
        const row = (this.#pinnedRowsModel[zone] || []).find((r: Row) => String(this.#idOf(r)) === String(id));
        if (row) return { kind: 'leaf', row, id: this.#idOf(row), depth: 0, pinned: zone };
      }
      return null;
    }

    #visibleCols(): ColumnDef[] {
      const source = this.#activeCols.length ? this.#activeCols : this.#cols;
      let list = source.filter((c: ColumnDef) => this.#visibility[c.field ?? ''] !== false);
      if (this.#order) {
        const pos = new Map(this.#order.map((f: string, i: number) => [f, i]));
        list = list.slice().sort((a: ColumnDef, b: ColumnDef) =>
          (pos.get(a.field ?? '') ?? 1e6) - (pos.get(b.field ?? '') ?? 1e6));
      }
      if (this.#groupingModel.length && !this.treeData) {
        list = list.filter((c: ColumnDef) => !this.#groupingModel.includes(c.field ?? ''));
      }
      const { left, right } = this.#pinnedCols;
      const rank = (c: ColumnDef): number =>
        (left.includes(c.field ?? '') ? 0 : right.includes(c.field ?? '') ? 2 : 1);
      return list.slice().sort((a: ColumnDef, b: ColumnDef) => rank(a) - rank(b));
    }

    #layoutCols(): ColumnDef[] {
      if (this.listView && this.#listViewColumn) {
        const merged: Partial<ColumnDef> = { flex: 1, minWidth: 120, sortable: false, ...this.#listViewColumn };
        return normalizeColumns([merged as ColumnDef]);
      }
      const out: ColumnDef[] = [];
      const sysCol = (field: string, width: number): ColumnDef => ({
        field, system: true, headerName: '', width, align: 'center',
        sortable: false, filterable: false, hideable: false, resizable: false,
        minWidth: width, maxWidth: width, flex: 0,
      });
      if (this.hasAttribute('row-reorder')) out.push(sysCol('__reorder', 40));
      if (this.checkboxSelection && this.selectionMode !== 'none') out.push(sysCol('__check', 44));
      if (this.#hooks.getDetailPanelContent) out.push(sysCol('__detail', 44));
      if (this.#isGrouped()) {
        const label = this.treeData
          ? this.#text.groupColumn
          : this.#groupingModel.map((f: string) => this.#cols.find((c: ColumnDef) => c.field === f)?.headerName || f).join(' / ');
        const groupCol = sysCol('__group', 240);
        (groupCol as ColumnDef & { group?: boolean }).group = true;
        out.push({
          ...groupCol,
          headerName: label, align: 'left', resizable: true, maxWidth: Infinity,
        });
      }
      return out.concat(this.#visibleCols());
    }

    #isGrouped(): boolean { return this.treeData || this.#groupingModel.length > 0; }

    /** Filas bajo un grupo; en tree data la propia fila del nodo no cuenta. */
    #descendants(node: GridNode): Row[] {
      const rows = node.rows || leavesOf(node).map((leaf: GridNode) => leaf.row).filter(Boolean) as Row[];
      return rows.filter((row: Row) => row !== node.row);
    }

    #ctx(): { grid: IsDataGrid; api: IsDataGrid } {
      return { grid: this, api: this };
    }

    #refresh(): void {
      if (!this.#mounted) return;
      cancelAnimationFrame(this.#raf);
      this.#raf = requestAnimationFrame(() => this.#compute());
    }

    #compute(): void {
      if (!this.#mounted) return;
      const ctx = this.#ctx();
      this.#pivot = this.#pivotModel
        ? pivotData(this.#rows, this.#pivotModel, this.#cols, ctx) as { rows: Row[]; columns: ColumnDef[] }
        : null;
      this.#activeCols = this.#pivot ? normalizeColumns(this.#pivot.columns) : this.#cols;
      const sourceRows = this.#pivot ? this.#pivot.rows : this.#rows;

      let rows = sourceRows;
      if (this.filterMode === 'client') {
        rows = applyFilters(rows, {
          model: this.#filterModel,
          quick: this.#quickValue,
          columns: this.#activeCols,
          ctx,
        });
      }
      if (this.sortingMode === 'client') rows = applySort(rows, this.#sortModel, this.#activeCols, ctx);
      this.#leafRows = rows;

      const totalRows = this.rowCount ?? rows.length;
      let visibleRows = rows;
      if (this.pagination && this.paginationMode === 'client') {
        const size = this.pageSize;
        const pages = Math.max(1, Math.ceil(rows.length / size));
        this.#page = Math.min(Math.max(0, this.#page), pages - 1);
        visibleRows = rows.slice(this.#page * size, this.#page * size + size);
      }

      this.#nodes = this.#isGrouped()
        ? this.#groupNodes(visibleRows, ctx)
        : visibleRows.map((row: Row) => ({ kind: 'leaf' as const, row, id: this.#idOf(row), depth: 0 }));

      this.#footerAgg = aggregateRows(rows, this.#aggregationModel, this.#activeCols, ctx);
      this.#measure();
      this.#renderAll(totalRows);
    }

    #groupNodes(rows: Row[], ctx: { grid: IsDataGrid; api: IsDataGrid }): GridNode[] {
      const cols = this.#activeCols;
      const paths = this.treeData && this.#hooks.getTreeDataPath
        ? (row: Row) => this.#hooks.getTreeDataPath!(row) || []
        : (row: Row) => this.#groupingModel.map((field: string) => {
          const col = cols.find((c: ColumnDef) => c.field === field);
          return col ? formattedValue(cellValue(row, col, ctx), row, col, ctx) : '';
        });
      const tree = buildTree(rows, { paths, getRowId: (row: Row, i: number) => this.#idOf(row, i) });
      if (this.treeData) collapseTreeLeaves(tree);
      aggregateTree(tree, this.#aggregationModel, cols, ctx);
      return flattenTree(tree, this.#expanded);
    }

    #allGroups(nodes: GridNode[] = this.#nodes, out: GridNode[] = []): GridNode[] {
      for (const node of nodes) {
        if (node.kind !== 'group') continue;
        out.push(node);
        this.#allGroups(node.children || [], out);
      }
      return out;
    }

    #measure(): void {
      const base = this.rowHeight;
      const offsets = new Float64Array(this.#nodes.length + 1);
      for (let i = 0; i < this.#nodes.length; i++) {
        const node = this.#nodes[i]!;
        let h = base;
        if (node.row && this.#hooks.getRowHeight) {
          const custom = this.#hooks.getRowHeight(node.row);
          if (Number.isFinite(custom) && custom > 0) h = custom;
        }
        node.baseHeight = h;
        if (this.#detailOpen.has(node.id)) h += this.detailHeight;
        node.height = h;
        offsets[i + 1] = offsets[i]! + h;
      }
      this.#offsets = offsets;
    }

    /* ── Render ──────────────────────────────────────────────────────── */

    #syncChrome(): void {
      this.#base.dataset.density = this.density;
      this.#base.style.setProperty('--is-grid-row-h', `${this.rowHeight}px`);
      this.#base.style.setProperty('--is-grid-head-h', `${this.headerHeight}px`);
      this.#base.toggleAttribute('data-list-view', this.listView);
      this.#base.toggleAttribute('data-auto-height', this.hasAttribute('auto-height'));
      this.#base.toggleAttribute('data-cell-selection', this.cellSelection);

      const showToolbar = this.hasAttribute('show-toolbar') || this.filterable;
      const showSearch = this.hasAttribute('quick-filter') || this.filterable;
      const showTools = this.toolbarTools;
      const search = this.#toolbar.querySelector<HTMLElement>('.tool-search');
      if (search) search.hidden = !showSearch;
      for (const [tool, label] of [['columns', 'columns'], ['filters', 'filters'], ['density', 'density'], ['export', 'export']] as const) {
        const btn = this.#toolbar.querySelector<HTMLElement>(`[data-tool="${tool}"]`);
        if (!btn) continue;
        const labelText = this.#text[label];
        const span = btn.querySelector<HTMLElement>('.tool-text');
        if (span) span.textContent = labelText;
        btn.title = labelText;
        const hideTool = !showTools || (tool === 'filters' && this.hasAttribute('disable-column-filter'));
        btn.hidden = hideTool;
      }
      // Si no hay búsqueda ni tools, la barra no aporta nada: ocultarla.
      this.#toolbar.hidden = !showToolbar || (!showSearch && !showTools);
      const quickEl = this.#quick as unknown as { placeholder: string };
      quickEl.placeholder = this.#text.quickFilter;
      this.#footer.hidden = this.hasAttribute('hide-footer');
      this.#filterHead.hidden = !this.hasAttribute('header-filters');
      this.#pageSizeSelect.setAttribute('aria-label', this.#text.rowsPerPage);
      const pageSizeLabel = this.#footer.querySelector<HTMLElement>('.page-size-label');
      if (pageSizeLabel) pageSizeLabel.textContent = this.#text.rowsPerPage;
      this.#viewport.setAttribute('role', this.#isGrouped() ? 'treegrid' : 'grid');
    }

    #renderAll(totalRows: number): void {
      this.#available = this.#viewport.clientWidth || this.#available;
      const cols = this.#layoutCols();
      this.#widths = resolveWidths(cols, this.#available, this.#widthOverrides);
      this.#totalWidth = cols.reduce((sum: number, c: ColumnDef) => sum + (this.#widths[c.field ?? ''] ?? 0), 0);
      this.#stickyOffsets(cols);
      this.#viewport.setAttribute('aria-colcount', String(cols.length));
      this.#viewport.setAttribute('aria-rowcount', String(totalRows + 1));

      this.#renderHeader(cols);
      this.#renderPinnedRows(cols);
      this.#renderBody(cols);
      this.#renderAggRow(cols);
      this.#renderFooter(totalRows);
      this.#renderOverlay();
      this.#syncFilterBadge();
      this.#base.style.setProperty('--is-grid-head-total', `${this.#head.offsetHeight}px`);
    }

    /** Las filas llenan el viewport aunque las columnas no lleguen a cubrirlo. */
    get #rowWidth(): string { return `max(${this.#totalWidth}px, 100%)`; }

    #stickyOffsets(cols: ColumnDef[]): void {
      const left: Record<string, number> = {};
      const right: Record<string, number> = {};
      let acc = 0;
      for (const col of cols) {
        if (!this.#isPinned(col, 'left')) continue;
        left[col.field ?? ''] = acc;
        acc += this.#widths[col.field ?? ''] ?? 0;
      }
      acc = 0;
      for (const col of [...cols].reverse()) {
        if (!this.#isPinned(col, 'right')) continue;
        right[col.field ?? ''] = acc;
        acc += this.#widths[col.field ?? ''] ?? 0;
      }
      this.#stickyLeft = left;
      this.#stickyRight = right;
    }

    #isPinned(col: ColumnDef, side: 'left' | 'right'): boolean {
      if (col.system) return side === 'left';
      return side === 'left'
        ? this.#pinnedCols.left.includes(col.field ?? '')
        : this.#pinnedCols.right.includes(col.field ?? '');
    }

    #applyCellGeometry(el: HTMLElement, col: ColumnDef, width?: number): void {
      const w = width ?? this.#widths[col.field ?? ''] ?? 0;
      el.style.width = `${w}px`;
      el.style.minWidth = `${w}px`;
      if (this.#stickyLeft[col.field ?? ''] != null) {
        el.dataset.pinned = 'left';
        el.style.left = `${this.#stickyLeft[col.field ?? '']}px`;
      } else if (this.#stickyRight[col.field ?? ''] != null) {
        el.dataset.pinned = 'right';
        el.style.right = `${this.#stickyRight[col.field ?? '']}px`;
      }
      if (col.align && col.align !== 'left') el.dataset.align = col.align;
    }

    /** Grupos de cabecera: una fila por nivel, con spans contiguos. */
    /** field → cadena de grupos, de fuera hacia dentro. */
    #groupChains(): Map<string, Array<Record<string, CellValue>>> {
      const chains = new Map<string, Array<Record<string, CellValue>>>();
      const walk = (nodes: Array<Record<string, CellValue>>, ancestors: Array<Record<string, CellValue>>) => {
        for (const node of nodes) {
          if (node.field) {
            chains.set(String(node.field), ancestors);
            continue;
          }
          walk((node.children || []) as Array<Record<string, CellValue>>, [...ancestors, node]);
        }
      };
      walk(this.#columnGroups, []);
      return chains;
    }

    #renderGroupRows(cols: ColumnDef[]): void {
      const model = this.#columnGroups;
      this.#groupRows.hidden = model.length === 0;
      if (!model.length) return;

      const chains = this.#groupChains();
      const depth = Math.max(0, ...[...chains.values()].map((c: Array<Record<string, CellValue>>) => c.length));

      const frag = document.createDocumentFragment();
      for (let level = 0; level < depth; level++) {
        const rowEl = document.createElement('div');
        rowEl.className = 'group-row';
        rowEl.setAttribute('role', 'row');
        rowEl.style.width = this.#rowWidth;
        let i = 0;
        while (i < cols.length) {
          const group = chains.get(cols[i]!.field ?? '')?.[level] || null;
          let span = 1;
          if (group) {
            while (i + span < cols.length && chains.get(cols[i + span]!.field ?? '')?.[level] === group) span += 1;
          }
          const width = cols.slice(i, i + span).reduce((sum: number, c: ColumnDef) => sum + (this.#widths[c.field ?? ''] ?? 0), 0);
          const cell = document.createElement('div');
          cell.className = 'gcell';
          cell.style.width = `${width}px`;
          cell.style.minWidth = `${width}px`;
          if (group) {
            cell.setAttribute('role', 'columnheader');
            cell.setAttribute('aria-colspan', String(span));
            cell.dataset.group = String(group.groupId ?? '');
            cell.textContent = String(group.headerName ?? group.groupId ?? '');
            if (group.headerAlign) cell.dataset.align = String(group.headerAlign);
          } else {
            cell.setAttribute('role', 'none');
            cell.dataset.empty = '';
          }
          rowEl.appendChild(cell);
          i += span;
        }
        frag.appendChild(rowEl);
      }
      this.#groupRows.replaceChildren(frag);
      this.#groupRows.style.width = this.#rowWidth;
    }

    #renderHeader(cols: ColumnDef[]): void {
      this.#renderGroupRows(cols);
      const frag = document.createDocumentFragment();
      cols.forEach((col: ColumnDef, colIndex: number) => {
        const cell = document.createElement('div');
        cell.className = 'hcell';
        cell.setAttribute('part', 'header-cell');
        cell.setAttribute('role', 'columnheader');
        cell.setAttribute('aria-colindex', String(colIndex + 1));
        cell.dataset.field = col.field ?? '';
        cell.tabIndex = this.#focus?.area === 'header' && this.#focus.field === col.field ? 0 : -1;
        this.#applyCellGeometry(cell, col);
        if (col.headerAlign && col.headerAlign !== 'left') cell.dataset.align = col.headerAlign;
        if (col.headerClassName) cell.classList.add(...String(col.headerClassName).split(/\s+/));

        if (col.field === '__check') {
          const selectable = this.#selectableRows();
          const total = selectable.length;
          const on = selectable.filter((r: Row) => this.#selection.has(this.#idOf(r))).length;
          cell.innerHTML = '<input type="checkbox" class="check check-all" aria-label="Seleccionar todo" />';
          const box = cell.querySelector<HTMLInputElement>('input');
          if (box) {
            box.checked = total > 0 && on === total;
            box.indeterminate = on > 0 && on < total;
            box.disabled = this.selectionMode !== 'multiple';
          }
        } else if (col.system) {
          cell.textContent = col.headerName || '';
          if (col.field === '__group') cell.classList.add('hcell-group');
        } else {
          const label = document.createElement('span');
          label.className = 'hlabel';
          if (typeof col.renderHeader === 'function') {
            appendContent(label, col.renderHeader({ field: col.field ?? '', colDef: col }) as Parameters<typeof appendContent>[1]);
          } else {
            label.textContent = col.headerName ?? '';
          }
          if (col.description) cell.title = col.description;
          cell.appendChild(label);

          const entry = this.#sortModel.find((s: SortEntry) => s.field === col.field);
          if (entry) {
            cell.dataset.sort = String(entry.sort ?? '');
            cell.setAttribute('aria-sort', entry.sort === 'asc' ? 'ascending' : 'descending');
            const mark = document.createElement('span');
            mark.className = 'sort-mark';
            mark.setAttribute('aria-hidden', 'true');
            mark.textContent = ICONS[String(entry.sort ?? '')] || '';
            cell.appendChild(mark);
            if (this.#sortModel.length > 1) {
              const idx = document.createElement('span');
              idx.className = 'sort-index';
              idx.textContent = String(this.#sortModel.indexOf(entry) + 1);
              cell.appendChild(idx);
            }
          }
          if (col.sortable !== false && !this.hasAttribute('disable-column-sort')) cell.classList.add('sortable');
          if (this.#filterModel.items.some((f: FilterRule) => f.field === col.field)) cell.dataset.filtered = '';
          if (!this.hasAttribute('disable-column-menu') && col.disableColumnMenu !== true) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'hmenu';
            btn.dataset.action = 'column-menu';
            btn.setAttribute('aria-label', `Menú de ${col.headerName ?? ''}`);
            btn.textContent = ICONS.menu;
            cell.appendChild(btn);
          }
          if (col.resizable !== false && !this.hasAttribute('disable-column-resize')) {
            const grip = document.createElement('span');
            grip.className = 'hgrip';
            grip.dataset.action = 'resize';
            grip.setAttribute('aria-hidden', 'true');
            cell.appendChild(grip);
          }
          if (!this.hasAttribute('disable-column-reorder')) cell.draggable = true;
        }
        frag.appendChild(cell);
      });
      this.#headRow.replaceChildren(frag);
      this.#headRow.style.width = this.#rowWidth;
      this.#head.style.width = this.#rowWidth;
      if (!this.#filterHead.hidden) this.#renderHeaderFilters(cols);
    }

    /** Reutiliza las celdas existentes: recrearlas mataría el foco y el caret. */
    #renderHeaderFilters(cols: ColumnDef[]): void {
      const cells = [...this.#filterHead.children] as HTMLElement[];
      const reuse = cells.length === cols.length
        && cells.every((cell: HTMLElement, i: number) => cell.dataset.field === cols[i]!.field);
      const frag = reuse ? null : document.createDocumentFragment();
      cols.forEach((col: ColumnDef, i: number) => {
        const cell = reuse ? cells[i]! : document.createElement('div');
        if (!reuse) {
          cell.className = 'fcell';
          cell.setAttribute('role', 'columnheader');
          cell.dataset.field = col.field ?? '';
        }
        this.#applyCellGeometry(cell, col);
        if (col.system || col.filterable === false) cell.replaceChildren();
        else this.#syncFilterCell(cell, col);
        if (frag) frag.appendChild(cell);
      });
      if (frag) this.#filterHead.replaceChildren(frag);
      this.#filterHead.style.width = this.#rowWidth;
    }

    #syncFilterCell(cell: HTMLElement, col: ColumnDef): void {
      // En columnas muy estrechas caben los dos controles pero ninguno se usa:
      // se oculta el operador y se deja el campo de valor.
      cell.toggleAttribute('data-tight', (this.#widths[col.field ?? ''] ?? 0) < 110);
      const item = this.#filterModel.items.find((f: FilterRule) => f.field === col.field) || {};
      const ops = col.operators || [];
      const op = ops.find((o: Operator) => o.value === item.operator) || ops[0];

      let opSel = cell.querySelector<HTMLSelectElement>('.fop');
      if (!opSel) {
        opSel = document.createElement('select');
        opSel.className = 'fop';
        opSel.setAttribute('aria-label', `Operador de ${col.headerName ?? ''}`);
        for (const o of ops) {
          const option = document.createElement('option');
          option.value = o.value;
          option.textContent = o.label;
          opSel.appendChild(option);
        }
        cell.appendChild(opSel);
      }
      if (opSel.value !== (op?.value ?? '')) opSel.value = op?.value ?? '';

      let inputs = [...cell.querySelectorAll<HTMLElement>('.finput')];
      if (!operatorNeedsInput(op)) {
        for (const el of inputs) el.remove();
        return;
      }
      // `isAnyOf` acepta varios valores: ahí el desplegable no sirve.
      const options = op?.multiple ? null : filterOptionsFor(col);
      const tag = options ? 'select' : 'input';
      const count = op?.range ? 2 : 1;
      if (inputs.length !== count || inputs.some((el: HTMLElement) => el.localName !== tag)) {
        for (const el of inputs) el.remove();
        inputs = Array.from({ length: count }, (_, i: number) => {
          const el = this.#filterInput(col, op ?? null, options, i);
          cell.appendChild(el);
          return el;
        });
      }
      const values: CellValue[] = op?.range
        ? (Array.isArray(item.value) ? item.value : String(item.value ?? '').split(','))
        : [item.value];
      inputs.forEach((input: HTMLElement, i: number) => {
        const value = values[i] == null ? '' : String(values[i]).trim();
        const inputEl = input as HTMLInputElement;
        if (input !== this.shadowRoot!.activeElement && inputEl.value !== value) inputEl.value = value;
      });
    }

    #filterInput(col: ColumnDef, op: Operator | null, options: ReturnType<typeof filterOptionsFor>, index: number): HTMLElement {
      if (options) {
        const select = document.createElement('select');
        select.className = 'finput';
        select.setAttribute('aria-label', `Filtro de ${col.headerName ?? ''}`);
        const blank = document.createElement('option');
        blank.value = '';
        blank.textContent = this.#text.filterAny;
        select.appendChild(blank);
        for (const o of options) {
          const option = document.createElement('option');
          option.value = String(o.value);
          option.textContent = String(o.label);
          select.appendChild(option);
        }
        return select;
      }
      const input = document.createElement('input');
      input.className = 'finput';
      input.type = col.type === 'number' ? 'number'
        : col.type === 'date' ? 'date'
          : col.type === 'dateTime' ? 'datetime-local' : 'text';
      const label = op?.range
        ? `${index === 0 ? this.#text.rangeFrom : this.#text.rangeTo} (${col.headerName ?? ''})`
        : `Filtro de ${col.headerName ?? ''}`;
      input.setAttribute('aria-label', label);
      input.placeholder = op?.range
        ? (index === 0 ? this.#text.rangeFrom : this.#text.rangeTo)
        : this.#text.filterBy;
      return input;
    }

    /** El valor de la celda: array cuando el operador pide un rango. */
    #filterCellValue(cell: HTMLElement): string | string[] {
      const inputs = [...cell.querySelectorAll<HTMLInputElement>('.finput')];
      return inputs.length > 1 ? inputs.map((el: HTMLInputElement) => el.value) : (inputs[0]?.value ?? '');
    }

    #renderPinnedRows(cols: ColumnDef[]): void {
      for (const [zone, el] of [['top', this.#pinnedTop], ['bottom', this.#pinnedBottom]] as const) {
        const rows = this.#pinnedRowsModel[zone] || [];
        el.hidden = rows.length === 0;
        if (!rows.length) continue;
        const frag = document.createDocumentFragment();
        rows.forEach((row: Row, i: number) => {
          const node: GridNode = {
            kind: 'leaf', row, id: this.#idOf(row), depth: 0,
            pinned: zone, baseHeight: this.rowHeight,
          };
          frag.appendChild(this.#renderRow(node, cols, { flow: true, index: i }));
        });
        el.replaceChildren(frag);
        el.style.width = this.#rowWidth;
      }
    }

    #renderBody(cols: ColumnDef[]): void {
      const total = this.#offsets[this.#nodes.length] || 0;
      this.#rowsEl.style.height = `${total}px`;
      this.#rowsEl.style.width = this.#rowWidth;

      const scrollTop = this.#viewport.scrollTop;
      const height = this.#viewport.clientHeight || 400;
      let from = 0;
      let to = this.#nodes.length;
      if (this.virtualize && !this.hasAttribute('auto-height')) {
        from = Math.max(0, this.#indexAt(scrollTop) - this.overscan);
        to = Math.min(this.#nodes.length, this.#indexAt(scrollTop + height) + 1 + this.overscan);
      }

      const frag = document.createDocumentFragment();
      for (let i = from; i < to; i++) {
        const node = this.#nodes[i]!;
        frag.appendChild(this.#renderRow(node, cols, { top: this.#offsets[i] ?? 0, index: i }));
      }
      // replaceChildren tira el foco al aire: hay que anotarlo antes de repintar.
      const hadFocus = this.#rowsEl.contains(this.shadowRoot!.activeElement);
      this.#rowsEl.replaceChildren(frag);
      this.#renderedRange = { from, to };
      this.#restoreFocus(hadFocus);
    }

    #indexAt(y: number): number {
      const offsets = this.#offsets;
      let lo = 0;
      let hi = offsets.length - 1;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (offsets[mid]! <= y) lo = mid + 1;
        else hi = mid;
      }
      return Math.max(0, lo - 1);
    }

    #renderRow(node: GridNode, cols: ColumnDef[], { top = 0, flow = false, index = 0 }: { top?: number; flow?: boolean; index?: number } = {}): HTMLElement {
      const row = node.row;
      const wrap = document.createElement('div');
      wrap.className = 'row-wrap';
      wrap.dataset.id = String(node.id);
      wrap.setAttribute('role', 'row');
      wrap.setAttribute('aria-rowindex', String(index + 2));
      if (!flow) {
        wrap.style.position = 'absolute';
        wrap.style.transform = `translateY(${top}px)`;
      }
      wrap.style.width = this.#rowWidth;
      if (this.hasAttribute('row-reorder')) wrap.draggable = true;
      if (node.kind === 'group') {
        wrap.setAttribute('aria-expanded', String(this.#expanded.has(node.id)));
        wrap.setAttribute('aria-level', String((node.depth || 0) + 1));
      }

      const rowEl = document.createElement('div');
      rowEl.className = 'row';
      rowEl.setAttribute('part', 'row');
      // Contenedor visual: las celdas deben colgar del role="row" del wrap.
      rowEl.setAttribute('role', 'none');
      rowEl.style.height = `${node.baseHeight || this.rowHeight}px`;
      if (index % 2) rowEl.dataset.odd = '';
      if (node.kind === 'group') rowEl.dataset.group = '';
      if (this.#selection.has(node.id)) {
        rowEl.dataset.selected = '';
        wrap.setAttribute('aria-selected', 'true');
      }
      if (this.#edit?.id === node.id) rowEl.dataset.editing = '';
      if (node.pinned) rowEl.dataset.pinned = node.pinned;
      if (row && this.#hooks.getRowClassName) {
        const cls = this.#hooks.getRowClassName({ row, id: node.id, index });
        if (cls) rowEl.classList.add(...String(cls).split(/\s+/));
      }

      const ctx = this.#ctx();
      let skip = 0;
      cols.forEach((col: ColumnDef, ci: number) => {
        if (skip > 0) {
          skip -= 1;
          return;
        }
        const { el, spanCount } = this.#renderCell(node, col, ctx, cols, ci);
        if (spanCount > 1) skip = spanCount - 1;
        rowEl.appendChild(el);
      });
      wrap.appendChild(rowEl);

      if (this.#detailOpen.has(node.id) && this.#hooks.getDetailPanelContent) {
        const detail = document.createElement('div');
        detail.className = 'detail';
        detail.setAttribute('part', 'detail-panel');
        detail.setAttribute('role', 'gridcell');
        detail.setAttribute('aria-colspan', String(cols.length));
        detail.style.height = `${this.detailHeight}px`;
        const content = this.#hooks.getDetailPanelContent({ row: row as Row, id: node.id });
        appendContent(detail, content);
        wrap.appendChild(detail);
      }
      return wrap;
    }

    #renderCell(node: GridNode, col: ColumnDef, ctx: { grid: IsDataGrid; api: IsDataGrid }, cols: ColumnDef[], colIndex: number): CellRender {
      const row = node.row;
      const el = document.createElement('div');
      el.className = 'cell';
      el.setAttribute('part', 'cell');
      el.setAttribute('role', 'gridcell');
      el.setAttribute('aria-colindex', String(colIndex + 1));
      el.dataset.field = col.field ?? '';
      el.tabIndex = this.#isCellFocused(node.id, col.field ?? '') ? 0 : -1;

      let spanCount = 1;
      if (!col.system && typeof col.colSpan === 'function' && row) {
        const span = Number(col.colSpan(cellValue(row, col, ctx), row, col, ctx)) || 1;
        if (span > 1) {
          spanCount = Math.min(span, cols.length - colIndex);
          const width = cols.slice(colIndex, colIndex + spanCount)
            .reduce((sum: number, c: ColumnDef) => sum + (this.#widths[c.field ?? ''] ?? 0), 0);
          this.#applyCellGeometry(el, col, width);
          el.dataset.colspan = String(spanCount);
        }
      }
      if (spanCount === 1) this.#applyCellGeometry(el, col);
      if (this.#inCellRange(node.id, col.field ?? '')) el.dataset.range = '';

      if (col.field === '__reorder') {
        el.innerHTML = `<span class="row-grip" aria-label="Reordenar fila" title="Reordenar fila">${ICONS.drag}</span>`;
        return { el, spanCount };
      }

      if (col.field === '__check') {
        const selectable = node.kind !== 'leaf' || !this.#hooks.isRowSelectable
          || this.#hooks.isRowSelectable({ row: row as Row, id: node.id });
        el.innerHTML = '<input type="checkbox" class="check row-check" aria-label="Seleccionar fila" />';
        const box = el.querySelector<HTMLInputElement>('input');
        if (box) {
          box.checked = this.#selection.has(node.id);
          box.disabled = !selectable;
          if (node.kind === 'group') {
            const leaves = leavesOf(node);
            const on = leaves.filter((l: GridNode) => this.#selection.has(l.id)).length;
            box.checked = on > 0 && on === leaves.length;
            box.indeterminate = on > 0 && on < leaves.length;
          }
        }
        return { el, spanCount };
      }

      if (col.field === '__detail') {
        if (node.kind === 'leaf' || node.row) {
          const open = this.#detailOpen.has(node.id);
          el.innerHTML = `<button type="button" class="tree-toggle" data-action="detail" aria-expanded="${open}" aria-label="Detalle">${open ? ICONS.collapse : ICONS.expand}</button>`;
        }
        return { el, spanCount };
      }

      if (col.field === '__group') {
        el.dataset.depth = String(node.depth || 0);
        el.style.paddingLeft = `${8 + (node.depth || 0) * 16}px`;
        if (node.kind === 'group') {
          const open = this.#expanded.has(node.id);
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'tree-toggle';
          btn.dataset.action = 'group';
          btn.setAttribute('aria-expanded', String(open));
          btn.setAttribute('aria-label', open ? 'Colapsar' : 'Expandir');
          btn.textContent = open ? ICONS.collapse : ICONS.expand;
          el.appendChild(btn);
          const label = document.createElement('span');
          label.className = 'group-label';
          label.textContent = String(node.key ?? '');
          el.appendChild(label);
          const count = document.createElement('span');
          count.className = 'group-count';
          count.textContent = `(${this.#descendants(node).length})`;
          el.appendChild(count);
        } else if (node.key != null) {
          // Hoja de tree data: sin desplegable, pero con su nombre de rama.
          const label = document.createElement('span');
          label.className = 'group-label';
          label.textContent = String(node.key);
          el.appendChild(label);
        }
        return { el, spanCount };
      }

      // En una fila de grupo manda la agregación; si no hay, los datos de la
      // propia fila (tree data) y si tampoco, celda vacía.
      if (node.kind === 'group') {
        const agg = node.aggregates?.[col.field ?? ''];
        if (agg) {
          el.dataset.aggregated = '';
          el.textContent = this.#formatAggregate(agg, col, ctx);
          return { el, spanCount };
        }
        if (!node.row) return { el, spanCount };
      }

      const value = cellValue(row as Row, col, ctx);
      if (this.#isEditingCell(node.id, col.field ?? '')) {
        el.dataset.editing = '';
        const editValue = (this.#edit?.values[col.field ?? ''] ?? value) as CellValue;
        const editor = this.#buildEditor(col, editValue, node);
        el.appendChild(editor);
        if (this.#edit?.errors?.[col.field ?? '']) {
          el.dataset.error = '';
          el.title = this.#edit.errors[col.field ?? ''] ?? '';
        }
        return { el, spanCount };
      }

      if (col.type === 'actions' && typeof col.getActions === 'function') {
        const actions = (col.getActions({ row: row as Row, id: node.id, colDef: col }) || []) as RowAction[];
        for (const action of actions.filter((a: RowAction) => !a.showInMenu)) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'act-btn';
          btn.dataset.action = 'row-action';
          btn.title = action.label || '';
          btn.setAttribute('aria-label', action.label || 'Acción');
          btn.disabled = !!action.disabled;
          btn.tabIndex = el.tabIndex;
          appendContent(btn, action.icon ?? action.label ?? '•');
          (btn as HTMLElement & { __action?: RowAction }).__action = action;
          el.appendChild(btn);
        }
        const menu = actions.filter((a: RowAction) => a.showInMenu);
        if (menu.length) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'act-btn';
          btn.dataset.action = 'row-action-menu';
          btn.setAttribute('aria-label', 'Más acciones');
          btn.tabIndex = el.tabIndex;
          btn.textContent = ICONS.menu;
          (btn as HTMLElement & { __actions?: RowAction[] }).__actions = menu;
          el.appendChild(btn);
        }
        return { el, spanCount };
      }

      if (typeof col.renderCell === 'function') {
        appendContent(el, col.renderCell({
          value, row: row as Row, id: node.id, colDef: col, field: col.field ?? '', api: this,
          tabIndex: el.tabIndex, hasFocus: el.tabIndex === 0,
        }) as Parameters<typeof appendContent>[1]);
      } else {
        const text = formattedValue(value, row, col, ctx);
        el.textContent = text;
        if (col.showTooltip !== false && text) el.title = text;
      }

      if (col.cellClassName) {
        const cls = typeof col.cellClassName === 'function'
          ? col.cellClassName({ value, row: row as Row, id: node.id, colDef: col })
          : col.cellClassName;
        if (cls) el.classList.add(...String(cls).split(/\s+/));
      }
      if (this.#hooks.getCellClassName) {
        const cls = this.#hooks.getCellClassName({ value, row: row as Row, id: node.id, field: col.field ?? '' });
        if (cls) el.classList.add(...String(cls).split(/\s+/));
      }
      if (col.editable) el.dataset.editable = '';
      return { el, spanCount };
    }

    #formatAggregate(agg: { fn: string; value: CellValue }, col: ColumnDef, ctx: { grid: IsDataGrid; api: IsDataGrid }): string {
      if (agg.value == null || Number.isNaN(agg.value as number)) return '';
      const proxyRow: Row = col?.field ? { [col.field]: agg.value } : {};
      let text = formattedValue(agg.value, proxyRow, col, ctx);
      if (text == null || text === '' || text === '!') {
        text = typeof agg.value === 'number'
          ? agg.value.toLocaleString('es-CO')
          : String(agg.value);
      }
      if (this.aggregationPosition === 'inline') return text;
      return `${AGGREGATION_FNS[agg.fn]?.label || agg.fn}: ${text}`;
    }

    #renderAggRow(cols: ColumnDef[]): void {
      const fields = Object.keys(this.#footerAgg);
      this.#aggRow.hidden = fields.length === 0;
      if (!fields.length) return;
      const ctx = this.#ctx();
      const frag = document.createDocumentFragment();
      for (const col of cols) {
        const cell = document.createElement('div');
        cell.className = 'cell agg-cell';
        this.#applyCellGeometry(cell, col);
        const agg = this.#footerAgg[col.field ?? ''];
        if (agg) cell.textContent = this.#formatAggregate(agg, col, ctx);
        frag.appendChild(cell);
      }
      this.#aggRow.replaceChildren(frag);
      this.#aggRow.style.width = this.#rowWidth;
    }

    #renderFooter(totalRows: number): void {
      const selected = this.#selection.size;
      this.#selCount.hidden = selected === 0 || this.hasAttribute('hide-footer-selected-count');
      this.#selCount.textContent = this.#text.selected(selected);
      this.#rowCount.textContent = this.#text.total(totalRows);

      this.#pager.hidden = !this.pagination;
      if (!this.pagination) return;
      const size = this.pageSize;
      const pages = Math.max(1, Math.ceil(totalRows / size));
      const from = totalRows ? this.#page * size + 1 : 0;
      const to = Math.min(totalRows, (this.#page + 1) * size);
      this.#pageInfo.textContent = `${from}–${to} / ${totalRows}`;

      const sizeChoices = [...new Set([...this.pageSizeOptions, size])].sort((a: number, b: number) => a - b);
      const currentOpts = this.#pageSizeSelect.querySelectorAll<HTMLOptionElement>('is-option, option');
      const current = [...currentOpts].map((o: HTMLOptionElement) => Number(o.value)).join(',');
      if (current !== sizeChoices.join(',')) {
        this.#pageSizeSelect.replaceChildren(...sizeChoices.map((n: number) => {
          const opt = document.createElement('is-option') as HTMLOptionElement;
          opt.value = String(n);
          opt.textContent = String(n);
          return opt;
        }));
      }
      (this.#pageSizeSelect as unknown as HTMLElement & { value: string }).value = String(size);
      const firstBtn = this.#pager.querySelector<HTMLButtonElement>('[data-page="first"]')!;
      firstBtn.disabled = this.#page === 0;
      const prevBtn = this.#pager.querySelector<HTMLButtonElement>('[data-page="prev"]')!;
      prevBtn.disabled = this.#page === 0;
      const nextBtn = this.#pager.querySelector<HTMLButtonElement>('[data-page="next"]')!;
      nextBtn.disabled = this.#page >= pages - 1;
      const lastBtn = this.#pager.querySelector<HTMLButtonElement>('[data-page="last"]')!;
      lastBtn.disabled = this.#page >= pages - 1;
    }

    #renderOverlay(): void {
      if (this.loading) {
        const attrValue = this.getAttribute('loading-variant');
        const variant = LOADING_VARIANTS[attrValue ?? ''] || 'spinner';
        this.#overlay.hidden = false;
        this.#overlay.dataset.color = variant;
        this.#overlay.innerHTML = variant === 'skeleton'
          ? `<div class="skeleton">${'<span></span>'.repeat(10)}</div>`
          : variant === 'progress'
            ? '<div class="linear"><span></span></div>'
            : `<div class="spinner" role="status"><span class="ring"></span><span>${escapeHtml(this.#text.loading)}</span></div>`;
        return;
      }
      if (this.#nodes.length === 0) {
        const filtered = this.#activeFilters().length > 0 || this.#quickValue !== '';
        this.#overlay.hidden = false;
        this.#overlay.dataset.color = 'empty';
        this.#overlay.innerHTML = `<div class="empty">${escapeHtml(filtered ? this.#text.noResults : this.#text.noRows)}</div>`;
        return;
      }
      this.#overlay.hidden = true;
      this.#overlay.replaceChildren();
    }

    /** Solo cuentan las reglas completas: las de valor vacío no filtran nada. */
    #activeFilters(): FilterRule[] {
      return this.#filterModel.items.filter((item: FilterRule) => {
        const col = this.#activeCols.find((c: ColumnDef) => c.field === item.field);
        return col && filterTest(item, col);
      });
    }

    #syncFilterBadge(): void {
      const badge = this.#toolbar.querySelector<HTMLElement>('.badge');
      if (!badge) return;
      const active = this.#activeFilters().length;
      badge.hidden = active === 0;
      badge.textContent = String(active);
    }

    /* ── Selección ───────────────────────────────────────────────────── */

    #selectableRows(): Row[] {
      const can = this.#hooks.isRowSelectable;
      if (!can) return this.#leafRows;
      return this.#leafRows.filter((row: Row) => can({ row, id: this.#idOf(row) }));
    }

    #emitSelection(): void {
      const detail: RowSelectionDetail = {
        rowSelectionModel: this.rowSelectionModel,
        selectedRows: this.selectedRows,
        selectedIndices: this.selectedIndices,
      };
      emit(this, 'is-select', detail);
    }

    #propagateSelection(id: CellValue, selected: boolean): void {
      if (!this.#isGrouped()) return;
      const node = this.#nodeById(id);
      if (!node || node.kind !== 'group') return;
      for (const leaf of leavesOf(node)) {
        if (selected) this.#selection.add(leaf.id);
        else this.#selection.delete(leaf.id);
      }
    }

    #toggleRow(id: CellValue, { additive = false, range = false }: { additive?: boolean; range?: boolean } = {}): void {
      const mode = this.selectionMode;
      if (mode === 'none') return;
      if (range && this.#lastSelectedId != null && mode === 'multiple') {
        const ids = this.#nodes.map((n: GridNode) => n.id);
        const a = ids.findIndex((x: CellValue) => String(x) === String(this.#lastSelectedId));
        const b = ids.findIndex((x: CellValue) => String(x) === String(id));
        if (a > -1 && b > -1) {
          const [start, end] = a < b ? [a, b] : [b, a];
          for (let i = start; i <= end; i++) this.#selection.add(ids[i]!);
          this.#refresh();
          this.#emitSelection();
          return;
        }
      }
      const isSelected = this.#selection.has(id);
      if (mode === 'single') {
        this.#selection.clear();
        if (!isSelected) this.#selection.add(id);
      } else if (additive) {
        if (isSelected) this.#selection.delete(id);
        else this.#selection.add(id);
      } else {
        this.#selection.clear();
        this.#selection.add(id);
      }
      this.#propagateSelection(id, this.#selection.has(id));
      this.#lastSelectedId = id;
      this.#refresh();
      this.#emitSelection();
    }

    /* ── Rango de celdas ─────────────────────────────────────────────── */

    #rangeBounds(): RangeBounds | null {
      if (!this.#cellRange) return null;
      const ids = this.#nodes.map((n: GridNode) => String(n.id));
      const fields = this.#dataFields();
      const r1 = ids.indexOf(String(this.#cellRange.start.id));
      const r2 = ids.indexOf(String(this.#cellRange.end.id));
      const c1 = fields.indexOf(this.#cellRange.start.field);
      const c2 = fields.indexOf(this.#cellRange.end.field);
      if ([r1, r2, c1, c2].some((n: number) => n < 0)) return null;
      return {
        rows: [Math.min(r1, r2), Math.max(r1, r2)],
        cols: [Math.min(c1, c2), Math.max(c1, c2)],
        ids,
        fields,
      };
    }

    #inCellRange(id: CellValue, field: string): boolean {
      const bounds = this.#rangeBounds();
      if (!bounds) return false;
      const r = bounds.ids.indexOf(String(id));
      const c = bounds.fields.indexOf(field);
      if (r < 0 || c < 0) return false;
      return r >= bounds.rows[0] && r <= bounds.rows[1] && c >= bounds.cols[0] && c <= bounds.cols[1];
    }

    #setCellRange(start: { id: CellValue; field: string }, end: { id: CellValue; field: string }): void {
      this.#cellRange = { start, end };
      this.#refresh();
      const detail: CellSelectionDetail = { cellSelectionModel: this.#cellRange };
      emit(this, 'is-cell-select', detail);
    }

    /* ── Orden ───────────────────────────────────────────────────────── */

    #applySort(field: string, forcedDir: string | null | undefined, multiple: boolean): void {
      const col = this.#activeCols.find((c: ColumnDef) => c.field === field);
      if (!col || col.sortable === false || this.hasAttribute('disable-column-sort')) return;
      const order = this.sortingOrder;
      const current = this.#sortModel.find((s: SortEntry) => s.field === field);
      let next: string | null = forcedDir as string | null;
      if (next === undefined) {
        const at = current ? order.indexOf(current.sort) : -1;
        next = order[(at + 1) % order.length];
      }
      const allowMulti = multiple && !this.hasAttribute('disable-multiple-sorting');
      let model: SortEntry[] = allowMulti ? this.#sortModel.filter((s: SortEntry) => s.field !== field) : [];
      if (next) model = allowMulti ? [...model, { field, sort: next }] : [{ field, sort: next }];
      this.#sortModel = model;
      this.#page = 0;
      this.#refresh();
      emit(this, 'is-sort-change', { sortModel: this.#sortModel, field, sort: next });
    }

    /* ── Filtros ─────────────────────────────────────────────────────── */

    #updateFilterItem(field: string, patch: Partial<FilterRule>): void {
      const items = this.#filterModel.items.slice();
      const at = items.findIndex((i: FilterRule) => i.field === field);
      const col = this.#activeCols.find((c: ColumnDef) => c.field === field);
      const base: FilterRule = { field, operator: col?.operators?.[0]?.value, value: '' };
      if (at > -1) items[at] = { ...items[at]!, ...patch };
      else items.push({ ...base, ...patch });
      // Las reglas sin valor se conservan (el filtrado las ignora): si se
      // borrasen, el operador elegido se perdería al vaciar el campo.
      this.#filterModel = { ...this.#filterModel, items };
      this.#page = 0;
      this.#refresh();
      emit(this, 'is-filter-change', { filterModel: this.#filterModel });
    }

    /* ── Edición ─────────────────────────────────────────────────────── */

    #canEdit(node: GridNode, col: ColumnDef | undefined): boolean {
      if (!col || col.system || !col.editable) return false;
      if (node.kind === 'group' && !node.row) return false;
      if (this.#hooks.isCellEditable) {
        return !!this.#hooks.isCellEditable({ row: node.row as Row, id: node.id, field: col.field ?? '' });
      }
      return true;
    }

    #isEditingCell(id: CellValue, field: string): boolean {
      if (!this.#edit || String(this.#edit.id) !== String(id)) return false;
      return this.#edit.fields.includes(field);
    }

    #startEdit(id: CellValue, field: string, seed?: CellValue): void {
      const node = this.#nodeById(id);
      const col = this.#activeCols.find((c: ColumnDef) => c.field === field);
      if (!node || !this.#canEdit(node, col)) return;
      const ctx = this.#ctx();
      if (this.editMode === 'row') {
        const fields = this.#layoutCols().filter((c: ColumnDef) => this.#canEdit(node, c)).map((c: ColumnDef) => c.field ?? '');
        const values: Record<string, CellValue> = {};
        for (const f of fields) {
          const c = this.#activeCols.find((x: ColumnDef) => x.field === f);
          values[f] = f === field && seed !== undefined ? seed : cellValue(node.row as Row, c, ctx);
        }
        this.#edit = { id: node.id, field, fields, values, errors: {} };
      } else {
        const value: CellValue = seed !== undefined ? seed : cellValue(node.row as Row, col, ctx);
        this.#edit = { id: node.id, field, fields: [field], values: { [field]: value }, errors: {} };
      }
      this.#focus = { id: node.id, field };
      this.#compute();
      const input = this.#rowsEl.querySelector<HTMLInputElement>(
        `[data-id="${cssEscape(String(node.id))}"] [data-field="${cssEscape(field)}"] .editor`,
      );
      input?.focus();
      if (input?.select) input.select();
      emit(this, 'is-edit-start', { id: node.id, field, row: node.row });
    }

    async #stopEdit(save = true): Promise<void> {
      const edit = this.#edit;
      if (!edit) return;
      this.#edit = null;
      const node = this.#nodeById(edit.id);
      if (!save || !node?.row) {
        this.#refresh();
        emit(this, 'is-edit-stop', { id: edit.id, field: edit.field, saved: false });
        return;
      }

      const before: Row = { ...node.row };
      const after: Row = { ...node.row };
      for (const field of edit.fields) {
        const col = this.#activeCols.find((c: ColumnDef) => c.field === field);
        if (!col) continue;
        let value: CellValue = edit.values[field];
        value = typeof col.valueParser === 'function'
          ? col.valueParser(value, node.row, col)
          : coerceValue(value as string, col.type);
        setFieldValue(after, col.field ?? '', value);
      }

      let next: Row = after;
      if (this.#hooks.processRowUpdate) {
        try {
          next = (await this.#hooks.processRowUpdate(after, before)) || after;
        } catch (error) {
          this.#refresh();
          emit(this, 'is-edit-stop', { id: edit.id, field: edit.field, saved: false, error });
          return;
        }
      }
      Object.assign(node.row, next);
      this.#pushUndo([{ id: edit.id, before, after: { ...node.row } }]);
      this.#refresh();
      emit(this, 'is-edit-stop', { id: edit.id, field: edit.field, saved: true });
      emit(this, 'is-row-update', { id: edit.id, row: node.row, before });
    }

    #buildEditor(col: ColumnDef, value: CellValue, node: GridNode): HTMLElement {
      const kind = col.editor || 'text';
      let el: HTMLElement;
      if (kind === 'boolean') {
        const box = document.createElement('input');
        box.type = 'checkbox';
        box.checked = !!value;
        el = box;
      } else if (kind === 'select') {
        const sel = document.createElement('select');
        for (const raw of col.valueOptions || []) {
          const v = typeof raw === 'object' && raw !== null ? (raw as { value: CellValue }).value : raw;
          const label = typeof raw === 'object' && raw !== null ? (raw as { label: CellValue }).label : raw;
          const opt = document.createElement('option');
          opt.value = String(v ?? '');
          opt.textContent = String(label ?? '');
          opt.selected = String(v ?? '') === String(value ?? '');
          sel.appendChild(opt);
        }
        el = sel;
      } else {
        const box = document.createElement('input');
        box.type = kind;
        if (kind === 'date') box.value = toInputDate(value as string | number | Date);
        else if (kind === 'datetime-local') box.value = toInputDateTime(value as string | number | Date);
        else box.value = value == null ? '' : String(value);
        el = box;
      }
      el.className = 'editor';
      el.setAttribute('aria-label', col.headerName ?? '');
      el.addEventListener('input', () => this.#onEditorInput(col, el, node));
      el.addEventListener('change', () => this.#onEditorInput(col, el, node));
      el.addEventListener('keydown', (e: KeyboardEvent) => this.#onEditorKey(e, col));
      return el;
    }

    async #onEditorInput(col: ColumnDef, el: HTMLElement, node: GridNode): Promise<void> {
      if (!this.#edit) return;
      const value: CellValue = (el as HTMLInputElement).type === 'checkbox'
        ? (el as HTMLInputElement).checked
        : (el as HTMLInputElement).value;
      this.#edit.values[col.field ?? ''] = value;
      if (typeof col.preProcessEditCellProps !== 'function') return;
      const out = await col.preProcessEditCellProps({
        props: { value }, row: node.row ?? {}, id: node.id, field: col.field ?? '',
      });
      const error = (out as { error?: unknown } | undefined)?.error;
      if (error) this.#edit.errors[col.field ?? ''] = typeof error === 'string' ? error : 'Valor inválido';
      else delete this.#edit.errors[col.field ?? ''];
      const cell = el.closest('.cell') as HTMLElement | null;
      if (!cell) return;
      cell.toggleAttribute('data-error', !!error);
      cell.title = this.#edit.errors[col.field ?? ''] || '';
    }

    #onEditorKey = (e: KeyboardEvent, _col?: ColumnDef): void => {
      if (!this.#edit) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        const { id, field } = this.#edit;
        this.#stopEdit(false);
        this.#focusCell(id, field);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        if (Object.keys(this.#edit.errors || {}).length) return;
        const { id, field } = this.#edit;
        this.#stopEdit(true).then(() => this.#focusCell(id, field));
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        const { id, field } = this.#edit;
        this.#stopEdit(true).then(() => {
          const fields = this.#dataFields();
          const nextField = fields[fields.indexOf(field) + (e.shiftKey ? -1 : 1)];
          if (!nextField) {
            this.#focusCell(id, field);
            return;
          }
          this.#focusCell(id, nextField);
          const node = this.#nodeById(id);
          const col = this.#activeCols.find((c: ColumnDef) => c.field === nextField);
          if (node && this.#canEdit(node, col)) this.#startEdit(id, nextField);
        });
      }
    };

    #dataFields(): string[] { return this.#layoutCols().filter((c: ColumnDef) => !c.system).map((c: ColumnDef) => c.field ?? ''); }

    /* ── Historial ───────────────────────────────────────────────────── */

    #pushUndo(patch: HistoryPatch): void {
      if (!this.hasAttribute('undo-redo')) return;
      this.#undoStack.push(patch);
      if (this.#undoStack.length > 50) this.#undoStack.shift();
      this.#redoStack.length = 0;
    }

    /** El parche viaja intacto entre pilas; `side` decide qué copia se aplica. */
    #applyHistory(
      from: HistoryPatch[],
      to: HistoryPatch[],
      eventName: string,
      side: 'before' | 'after',
    ): void {
      const patch = from.pop();
      if (!patch) return;
      const byId = this.#rowIndex();
      for (const entry of patch) {
        const row = byId.get(entry.id);
        if (!row) continue;
        for (const key of Object.keys(row)) delete row[key];
        Object.assign(row, entry[side]);
      }
      to.push(patch);
      this.#refresh();
      emit(this, eventName, { count: patch.length });
    }

    /* ── Portapapeles ────────────────────────────────────────────────── */

    #copySelection(): string {
      const matrix = this.#selectionMatrix();
      if (!matrix.length) return '';
      const text = toDelimited(matrix, '\t');
      navigator.clipboard?.writeText?.(text).catch(() => { /* sin permisos */ });
      emit(this, 'is-copy', { text, rows: matrix.length });
      return text;
    }

    #selectionMatrix(): string[][] {
      const ctx = this.#ctx();
      const cols = this.#layoutCols().filter((c: ColumnDef) => !c.system);
      const bounds = this.#rangeBounds();
      if (bounds) {
        const rows = this.#nodes.slice(bounds.rows[0], bounds.rows[1] + 1);
        const picked = cols.slice(bounds.cols[0], bounds.cols[1] + 1);
        return rows.filter((n: GridNode) => n.row).map((node: GridNode) =>
          picked.map((col: ColumnDef) => formattedValue(cellValue(node.row as Row, col, ctx), node.row as Row, col, ctx)));
      }
      const selected = this.#nodes.filter((n: GridNode) => n.row && this.#selection.has(n.id));
      const source: GridNode[] = selected.length
        ? selected
        : (this.#focus && !this.#focus.area)
          ? (() => {
            const fid = (this.#focus as Exclude<FocusArea, { area: 'header' }>).id;
            return this.#nodes.filter((n: GridNode) => String(n.id) === String(fid) && n.row);
          })()
          : [];
      return source.map((node: GridNode) => cols
        .map((col: ColumnDef) => formattedValue(cellValue(node.row as Row, col, ctx), node.row as Row, col, ctx)));
    }

    async #pasteFromClipboard(text?: string): Promise<void> {
      if (!this.hasAttribute('clipboard') || !this.#focus || this.#focus.area === 'header') return;
      const raw: string = text ?? (await navigator.clipboard?.readText?.().catch(() => '')) ?? '';
      if (!raw) return;
      const matrix: string[][] = raw.replace(/\r/g, '').split('\n').filter((line: string) => line !== '')
        .map((line: string) => line.split('\t'));
      const ids = this.#nodes.map((n: GridNode) => String(n.id));
      const fields = this.#dataFields();
      const startRow = ids.indexOf(String(this.#focus?.id ?? ''));
      const startCol = fields.indexOf(this.#focus.field);
      if (startRow < 0 || startCol < 0) return;

      const patch: HistoryPatch = [];
      matrix.forEach((line: string[], r: number) => {
        const node = this.#nodes[startRow + r];
        if (!node?.row) return;
        const before: Row = { ...node.row };
        line.forEach((cellText: string, c: number) => {
          const field = fields[startCol + c];
          const col = this.#activeCols.find((x: ColumnDef) => x.field === field);
          if (!col || !this.#canEdit(node, col)) return;
          setFieldValue(node.row as Row, field ?? '', coerceValue(cellText, col.type));
        });
        patch.push({ id: node.id, before, after: { ...node.row } });
      });
      if (!patch.length) return;
      this.#pushUndo(patch);
      this.#refresh();
      emit(this, 'is-paste', { rows: patch.length });
    }

    /* ── Exportación ─────────────────────────────────────────────────── */

    #matrix({ allColumns = false, raw = false }: { allColumns?: boolean; raw?: boolean } = {}): string[][] {
      const ctx = this.#ctx();
      const cols = (allColumns ? this.#activeCols : this.#layoutCols().filter((c: ColumnDef) => !c.system))
        .filter((c: ColumnDef) => c.type !== 'actions');
      const head = cols.map((c: ColumnDef) => c.headerName ?? '');
      const body = this.#leafRows.map((row: Row) => cols.map((col: ColumnDef) => {
        const value = cellValue(row, col, ctx);
        if (raw && col.type === 'number') return value == null ? '' : Number(value);
        return formattedValue(value, row, col, ctx);
      }));
      return [head, ...body];
    }

    /* ── Cabecera: eventos ───────────────────────────────────────────── */

    #onHeadClick = (e: PointerEvent): void => {
      const cell = $closest(e,'.hcell');
      if (!cell) return;
      if ($closest(e,'.check-all')) {
        const selectable = this.#selectableRows();
        const on = selectable.filter((r: Row) => this.#selection.has(this.#idOf(r))).length;
        this.selectAll(on !== selectable.length);
        return;
      }
      if ($closest(e,'[data-action="column-menu"]')) {
        const btn = $closest(e,'button');
        if (btn) this.#openColumnMenu(cell.dataset.field ?? '', btn);
        return;
      }
      if ($closest(e,'.hgrip')) return;
      if (!cell.classList.contains('sortable')) return;
      this.#applySort(cell.dataset.field ?? '', undefined, e.ctrlKey || e.metaKey || e.shiftKey);
    };

    #onHeadDblClick = (e: MouseEvent): void => {
      if (!$closest(e,'.hgrip')) return;
      const cell = $closest(e,'.hcell');
      if (cell) this.#autosize(cell.dataset.field ?? '');
    };

    #onHeadKey = (e: KeyboardEvent): void => {
      const cell = $closest(e,'.hcell');
      if (!cell) return;
      const field = cell.dataset.field ?? '';
      const fields = this.#layoutCols().map((c: ColumnDef) => c.field ?? '');
      const at = fields.indexOf(field);

      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this.#openColumnMenu(field, cell.querySelector<HTMLElement>('.hmenu') || cell);
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        this.#applySort(field, undefined, e.shiftKey);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        const next = fields[at + (e.key === 'ArrowRight' ? 1 : -1)];
        if (next) this.#focusHeader(next);
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const first = this.#nodes[0];
        if (first) this.#focusCell(first.id, field);
        return;
      }
      if (e.key === 'Tab' && (this.tabNavigation === 'header' || this.tabNavigation === 'all')) {
        const next = fields[at + (e.shiftKey ? -1 : 1)];
        if (!next) return;
        e.preventDefault();
        this.#focusHeader(next);
      }
    };

    #onHeadPointerDown = (e: PointerEvent): void => {
      const grip = $closest(e,'.hgrip');
      if (!grip) return;
      const fieldCell = grip.closest<HTMLElement>('.hcell');
      if (!fieldCell) return;
      const field = fieldCell.dataset.field ?? '';
      this.#resizeState = { field, startX: e.clientX, startWidth: this.#widths[field] ?? 0 };
      this.#base.dataset.resizing = '';
      // En el propio grip no: al repintar la cabecera desaparece a mitad del arrastre.
      window.addEventListener('pointermove', this.#onResizeMove);
      window.addEventListener('pointerup', this.#onResizeEnd);
      window.addEventListener('pointercancel', this.#onResizeEnd);
      e.preventDefault();
    };

    #onResizeMove = (e: PointerEvent): void => {
      const state = this.#resizeState;
      if (!state) return;
      const width = Math.max(40, state.startWidth + (e.clientX - state.startX));
      this.#widthOverrides = { ...this.#widthOverrides, [state.field]: width };
      this.#compute();
    };

    #onResizeEnd = (): void => {
      const state = this.#resizeState;
      this.#resizeState = null;
      this.#base.removeAttribute('data-resizing');
      window.removeEventListener('pointermove', this.#onResizeMove);
      window.removeEventListener('pointerup', this.#onResizeEnd);
      window.removeEventListener('pointercancel', this.#onResizeEnd);
      if (state) emit(this, 'is-column-resize', { field: state.field, width: this.#widths[state.field] });
    };

    #autosize(field: string): void {
      const col = this.#activeCols.find((c: ColumnDef) => c.field === field);
      if (!col || col.resizable === false) return;
      const ctx = this.#ctx();
      const probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:inherit';
      this.#base.appendChild(probe);
      probe.textContent = col.headerName ?? '';
      let max = probe.offsetWidth + 56;
      for (const row of this.#leafRows.slice(0, 200)) {
        probe.textContent = formattedValue(cellValue(row, col, ctx), row, col, ctx);
        max = Math.max(max, probe.offsetWidth + 24);
      }
      probe.remove();
      const minWidth = col.minWidth ?? 50;
      const maxWidth = col.maxWidth ?? Infinity;
      this.setColumnWidth(field, Math.min(maxWidth, Math.max(minWidth, Math.ceil(max))));
    }

    #onColDragStart = (e: DragEvent): void => {
      const cell = $closest(e,'.hcell');
      if (!cell || (cell.dataset.field ?? '').startsWith('__')) return;
      if (!e.dataTransfer) return;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', cell.dataset.field ?? '');
      cell.dataset.dragging = '';
    };

    #onColDragOver = (e: DragEvent): void => {
      const cell = $closest(e,'.hcell');
      const from = this.#headRow.querySelector<HTMLElement>('[data-dragging]')?.dataset.field;
      if (!cell || (from && !this.#sameColumnGroup(from, cell.dataset.field ?? ''))) return;
      e.preventDefault();
      cell.dataset.dropTarget = '';
    };

    /** Un grupo de cabecera debe quedar contiguo: no se sale de él al arrastrar. */
    #sameColumnGroup(a: string, b: string): boolean {
      if (!this.#columnGroups.length) return true;
      const chains = this.#groupChains();
      const key = (field: string): string => (chains.get(field) || [])
        .map((group: Record<string, CellValue>) => String(group.groupId ?? group.headerName ?? ''))
        .join(' > ');
      return key(a) === key(b);
    }

    #onColDragLeave = (e: DragEvent): void => {
      $closest(e,'.hcell')?.removeAttribute('data-drop-target');
    };

    #onColDrop = (e: DragEvent): void => {
      const target = $closest(e,'.hcell');
      const from = e.dataTransfer?.getData('text/plain');
      if (!target || !from) return;
      e.preventDefault();
      const to = target.dataset.field ?? '';
      target.removeAttribute('data-drop-target');
      if (from === to || to.startsWith('__') || !this.#sameColumnGroup(from, to)) return;
      const fields = this.#visibleCols().map((c: ColumnDef) => c.field ?? '');
      const order = fields.filter((f: string) => f !== from);
      const at = order.indexOf(to);
      order.splice(at < 0 ? order.length : at, 0, from);
      this.#order = order;
      this.#refresh();
      emit(this, 'is-column-reorder', { field: from, targetField: to, columnOrder: order });
    };

    #onColDragEnd = (): void => {
      for (const cell of this.#headRow.querySelectorAll<HTMLElement>('[data-dragging],[data-drop-target]')) {
        cell.removeAttribute('data-dragging');
        cell.removeAttribute('data-drop-target');
      }
    };

    #onHeaderFilterInput = (e: Event): void => {
      const input = $closest<HTMLInputElement>(e, '.finput');
      if (!input) return;
      const cell = input.closest<HTMLElement>('.fcell');
      if (!cell) return;
      this.#updateFilterItem(cell.dataset.field ?? '', {
        operator: cell.querySelector<HTMLSelectElement>('.fop')?.value,
        value: this.#filterCellValue(cell),
      });
    };

    #onHeaderFilterChange = (e: Event): void => {
      const sel = $closest<HTMLSelectElement>(e, '.fop');
      if (!sel) return;
      const cell = sel.closest<HTMLElement>('.fcell');
      if (!cell) return;
      this.#updateFilterItem(cell.dataset.field ?? '', {
        operator: sel.value,
        value: this.#filterCellValue(cell),
      });
    };

    /* ── Cuerpo: eventos ─────────────────────────────────────────────── */

    #onBodyClick = (e: PointerEvent): void => {
      const rowEl = $closest(e,'.row-wrap');
      if (!rowEl) return;
      const node = this.#nodeById(rowEl.dataset.id ?? null);
      if (!node) return;
      const cellEl = $closest(e,'.cell');
      const field = cellEl?.dataset.field ?? '';

      if ($closest(e,'[data-action="group"]')) {
        this.#toggleGroup(node.id);
        return;
      }
      if ($closest(e,'[data-action="detail"]')) {
        this.#toggleDetail(node.id);
        return;
      }
      const actionBtn = $closest(e,'[data-action="row-action"]') as HTMLElement & { __action?: RowAction } | null;
      if (actionBtn?.__action) {
        actionBtn.__action.onClick?.({ id: node.id, row: node.row as Row, api: this });
        return;
      }
      const actionMenu = $closest(e,'[data-action="row-action-menu"]') as HTMLElement & { __actions?: RowAction[] } | null;
      if (actionMenu?.__actions) {
        this.#menuActions = actionMenu.__actions;
        this.#menuActionRow = { id: node.id, row: node.row as Row };
        renderMenu(this.#menu, actionMenu.__actions.map((a: RowAction, i: number) => ({
          label: a.label, icon: a.icon, action: 'row-action', value: i, disabled: a.disabled,
        })));
        this.#menu.removeAttribute('data-field');
        showPopover(this.#menu, actionMenu, 'bottom-end');
        this.#openPop = 'menu';
        this.#popAnchor = actionMenu;
        return;
      }
      const rowCheck = $closest(e,'.row-check') as HTMLInputElement | null;
      if (rowCheck) {
        this.selectRow(node.id, rowCheck.checked, this.selectionMode === 'multiple');
        return;
      }
      if (!cellEl) return;

      if (field && node.row) {
        this.#focusCell(node.id, field);
        emit(this, 'is-cell-click', { id: node.id, field, row: node.row });
        if (this.cellSelection) {
          if (e.shiftKey && this.#cellAnchor) {
            this.#setCellRange(this.#cellAnchor, { id: node.id, field });
          } else {
            this.#cellAnchor = { id: node.id, field };
            this.#setCellRange(this.#cellAnchor, this.#cellAnchor);
          }
        }
      }
      emit(this, 'is-row-click', { id: node.id, row: node.row });

      if (node.kind === 'group' && !node.row && !this.checkboxSelection) {
        this.#toggleGroup(node.id);
        return;
      }
      if (this.hasAttribute('disable-row-selection-on-click') || this.checkboxSelection) return;
      if (this.selectionMode === 'none') return;
      this.#toggleRow(node.id, { additive: e.ctrlKey || e.metaKey, range: e.shiftKey });
    };

    #onBodyDblClick = (e: MouseEvent): void => {
      const cellEl = $closest(e,'.cell');
      const rowEl = $closest(e,'.row-wrap');
      if (!cellEl || !rowEl) return;
      const node = this.#nodeById(rowEl.dataset.id ?? null);
      if (!node) return;
      emit(this, 'is-row-double-click', { id: node.id, row: node.row });
      emit(this, 'is-cell-double-click', { id: node.id, field: cellEl.dataset.field ?? '', row: node.row });
      this.#startEdit(node.id, cellEl.dataset.field ?? '');
    };

    #onBodyPointerOver = (e: PointerEvent): void => {
      if (!this.cellSelection || !this.#cellAnchor || e.buttons !== 1) return;
      const cellEl = $closest(e,'.cell');
      const rowEl = $closest(e,'.row-wrap');
      if (!cellEl || !rowEl) return;
      const node = this.#nodeById(rowEl.dataset.id ?? null);
      if (!node) return;
      this.#setCellRange(this.#cellAnchor, { id: node.id, field: cellEl.dataset.field ?? '' });
    };

    #onRowDragStart = (e: DragEvent): void => {
      const rowEl = $closest(e,'.row-wrap');
      if (!rowEl || !e.dataTransfer) return;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', rowEl.dataset.id ?? '');
      rowEl.dataset.dragging = '';
    };

    #onRowDragOver = (e: DragEvent): void => {
      if (!this.hasAttribute('row-reorder')) return;
      e.preventDefault();
    };

    #onRowDrop = (e: DragEvent): void => {
      const rowEl = $closest(e,'.row-wrap');
      const fromId = e.dataTransfer?.getData('text/plain');
      if (!rowEl || !fromId) return;
      e.preventDefault();
      const toId = rowEl.dataset.id ?? '';
      for (const el of this.#rowsEl.querySelectorAll<HTMLElement>('[data-dragging]')) el.removeAttribute('data-dragging');
      if (fromId === toId) return;
      const from = this.#rows.findIndex((r: Row, i: number) => String(this.#idOf(r, i)) === fromId);
      const to = this.#rows.findIndex((r: Row, i: number) => String(this.#idOf(r, i)) === toId);
      if (from < 0 || to < 0) return;
      const moved = this.#rows[from];
      if (!moved) return;
      this.#rows.splice(from, 1);
      this.#rows.splice(to, 0, moved);
      this.#refresh();
      emit(this, 'is-row-reorder', { id: fromId, from, to });
    };

    #toggleGroup(id: CellValue): void {
      if (id == null) return;
      if (this.#expanded.has(id)) this.#expanded.delete(id);
      else this.#expanded.add(id);
      this.#refresh();
      emit(this, 'is-group-toggle', { id, expanded: this.#expanded.has(id) });
    }

    #toggleDetail(id: CellValue): void {
      if (id == null) return;
      if (this.#detailOpen.has(id)) this.#detailOpen.delete(id);
      else this.#detailOpen.add(id);
      this.#refresh();
      emit(this, 'is-detail-toggle', { id, open: this.#detailOpen.has(id) });
    }

    /* ── Foco y teclado ──────────────────────────────────────────────── */

    #isCellFocused(id: CellValue, field: string): boolean {
      const focus = this.#focus;
      if (!focus || focus.area === 'header') return false;
      return focus.field === field && String(focus.id) === String(id);
    }

    #focusCell(id: CellValue, field: string): void {
      if (id == null || !field) return;
      this.#focus = { id, field };
      const index = this.#nodes.findIndex((n: GridNode) => String(n.id) === String(id));
      if (index > -1 && this.virtualize) {
        const { from, to } = this.#renderedRange;
        if (index < from || index >= to) {
          this.scrollToIndex(index);
          this.#compute();
        }
      }
      this.#restoreFocus(true);
    }

    #focusHeader(field: string): void {
      this.#focus = { area: 'header', field };
      for (const cell of this.#headRow.children) {
        const child = cell as HTMLElement;
        child.tabIndex = child.dataset.field === field ? 0 : -1;
      }
      this.#headRow.querySelector<HTMLElement>(`[data-field="${cssEscape(field)}"]`)?.focus();
    }

    #restoreFocus(force = false): void {
      if (!this.#focus || this.#focus.area === 'header') return;
      const cell = this.#rowsEl.querySelector<HTMLElement>(
        `[data-id="${cssEscape(String(this.#focus.id))}"] .cell[data-field="${cssEscape(this.#focus.field)}"]`,
      );
      if (!cell) return;
      cell.tabIndex = 0;
      const active = this.shadowRoot!.activeElement;
      const activeInGrid = active?.closest?.('.cell');
      if (!force && !activeInGrid) return;
      if (!cell.contains(active)) cell.focus({ preventScroll: true });
    }

    #onFocusIn = (e: FocusEvent): void => {
      const t = e.target;
      const cellEl = t instanceof Element ? t.closest<HTMLElement>('.cell') : null;
      const rowEl = t instanceof Element ? t.closest<HTMLElement>('.row-wrap') : null;
      if (cellEl && rowEl) {
        const node = this.#nodeById(rowEl.dataset.id ?? null);
        this.#focus = { id: node ? node.id : (rowEl.dataset.id ?? ''), field: cellEl.dataset.field ?? '' };
        return;
      }
      const hcell = t instanceof Element ? t.closest<HTMLElement>('.hcell') : null;
      if (hcell) this.#focus = { area: 'header', field: hcell.dataset.field ?? '' };
    };

    #onKeyDown = (e: KeyboardEvent): void => {
      if ((e.target as HTMLElement).closest('.editor, .finput, .fop')) return;
      const focus = this.#focus;
      if (!focus) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        if (this.selectionMode !== 'multiple') return;
        e.preventDefault();
        this.selectAll(true);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        this.#copySelection();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        this.#pasteFromClipboard();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        if (!this.hasAttribute('undo-redo')) return;
        e.preventDefault();
        if (e.shiftKey) this.redo();
        else this.undo();
        return;
      }
      if (e.key === 'Escape' && this.#openPop) {
        e.preventDefault();
        this.#closePop();
        return;
      }
      if (focus.area === 'header') return;

      const fields = this.#layoutCols().map((c: ColumnDef) => c.field ?? '');
      const ids = this.#nodes.map((n: GridNode) => String(n.id));
      const rowIndex = ids.indexOf(String(focus.id));
      const colIndex = fields.indexOf(focus.field);
      if (rowIndex < 0 || colIndex < 0) return;
      const node = this.#nodes[rowIndex];
      if (!node) return;
      const col = this.#activeCols.find((c: ColumnDef) => c.field === focus.field);
      const pageStep = Math.max(1, Math.floor(this.#viewport.clientHeight / this.rowHeight) - 1);
      const move = (dr: number, dc: number): void => {
        const r = Math.max(0, Math.min(ids.length - 1, rowIndex + dr));
        const c = Math.max(0, Math.min(fields.length - 1, colIndex + dc));
        if (r === rowIndex && c === colIndex) return;
        const targetNode = this.#nodes[r];
        if (!targetNode) return;
        this.#focusCell(targetNode.id, fields[c]!);
      };
      const extend = (dr: number): void => {
        const next = this.#nodes[rowIndex + dr];
        this.#selection.add(node.id);
        if (next) {
          this.#selection.add(next.id);
          this.#focusCell(next.id, focus.field);
        } else {
          this.#refresh();
        }
        this.#emitSelection();
      };

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (e.shiftKey && this.selectionMode === 'multiple') extend(1);
          else move(1, 0);
          return;
        case 'ArrowUp':
          e.preventDefault();
          if (e.shiftKey && this.selectionMode === 'multiple') extend(-1);
          else move(-1, 0);
          return;
        case 'ArrowRight':
          e.preventDefault();
          if (node.kind === 'group' && !this.#expanded.has(node.id)) this.#toggleGroup(node.id);
          else move(0, 1);
          return;
        case 'ArrowLeft':
          e.preventDefault();
          if (node.kind === 'group' && this.#expanded.has(node.id)) this.#toggleGroup(node.id);
          else move(0, -1);
          return;
        case 'Home':
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) this.#focusCell(this.#nodes[0]?.id, fields[0]);
          else this.#focusCell(focus.id, fields[0]!);
          return;
        case 'End':
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) this.#focusCell(this.#nodes.at(-1)?.id ?? null, fields.at(-1) ?? '');
          else this.#focusCell(focus.id, fields.at(-1) ?? '');
          return;
        case 'PageDown':
          e.preventDefault();
          move(pageStep, 0);
          return;
        case 'PageUp':
          e.preventDefault();
          move(-pageStep, 0);
          return;
        case ' ':
          e.preventDefault();
          if (e.shiftKey) this.#toggleRow(node.id, { additive: true });
          else if (node.kind === 'group') this.#toggleGroup(node.id);
          else move(pageStep, 0);
          return;
        case 'Enter':
          e.preventDefault();
          if (e.ctrlKey || e.metaKey) {
            if (this.#hooks.getDetailPanelContent) this.#toggleDetail(node.id);
            return;
          }
          if (this.#canEdit(node, col)) this.#startEdit(node.id, focus.field);
          else move(1, 0);
          return;
        case 'F2':
          e.preventDefault();
          if (this.#canEdit(node, col)) this.#startEdit(node.id, focus.field);
          return;
        case 'Tab': {
          if (this.tabNavigation !== 'content' && this.tabNavigation !== 'all') return;
          e.preventDefault();
          const flat = colIndex + (e.shiftKey ? -1 : 1);
          if (flat >= 0 && flat < fields.length) move(0, e.shiftKey ? -1 : 1);
          else if (e.shiftKey && rowIndex > 0) this.#focusCell(this.#nodes[rowIndex - 1]!.id, fields.at(-1)!);
          else if (!e.shiftKey && rowIndex < ids.length - 1) this.#focusCell(this.#nodes[rowIndex + 1]!.id, fields[0]!);
          return;
        }
        default:
          break;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && this.#canEdit(node, col)) {
        e.preventDefault();
        this.#startEdit(node.id, focus.field, e.key);
      }
    };

    #onCopyEvent = (e: ClipboardEvent): void => {
      const matrix = this.#selectionMatrix();
      if (!matrix.length) return;
      e.clipboardData?.setData('text/plain', toDelimited(matrix, '\t'));
      e.preventDefault();
      emit(this, 'is-copy', { rows: matrix.length });
    };

    #onPasteEvent = (e: ClipboardEvent): void => {
      if (!this.hasAttribute('clipboard')) return;
      const text = e.clipboardData?.getData('text/plain');
      if (!text) return;
      e.preventDefault();
      this.#pasteFromClipboard(text);
    };

    /* ── Scroll y tamaño ─────────────────────────────────────────────── */

    #onScroll = (): void => {
      cancelAnimationFrame(this.#scrollRaf);
      this.#scrollRaf = requestAnimationFrame(() => {
        if (this.virtualize && !this.hasAttribute('auto-height')) this.#renderBody(this.#layoutCols());
        this.#checkScrollEnd();
      });
    };

    #checkScrollEnd(): void {
      const el = this.#viewport;
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (remaining > 80) {
        this.#reachedEnd = false;
        return;
      }
      if (this.#reachedEnd) return;
      this.#reachedEnd = true;
      emit(this, 'is-rows-scroll-end', { rows: this.#rows.length });
      if (!this.#hooks.rowsLoader || this.loading) return;
      const result = this.#hooks.rowsLoader({ start: this.#rows.length, api: this });
      if (!result?.then) return;
      this.loading = true;
      result
        .then((more: Row[]) => {
          if (Array.isArray(more) && more.length) this.rows = this.#rows.concat(more);
          this.loading = false;
        })
        .catch(() => { this.loading = false; });
    }

    #onResize(): void {
      const width = this.#viewport.clientWidth;
      if (Math.abs(width - this.#available) < 1) return;
      this.#available = width;
      this.#refresh();
    }

    /* ── Toolbar, menús y paneles ────────────────────────────────────── */

    #onQuickInput = (): void => {
      this.#quickValue = (this.#quick as unknown as { value: string }).value;
      this.#page = 0;
      this.#refresh();
      emit(this, 'is-quick-filter', { value: this.#quickValue });
    };

    #onToolbarClick = (e: PointerEvent): void => {
      const btn = $closest(e,'[data-tool]');
      if (!btn) return;
      const tool = btn.dataset.tool;
      if (!tool) return;
      const wasOpen = this.#openPop === tool;
      this.#closePop();
      if (wasOpen) return;
      if (tool === 'columns') {
        this.#showColumnsPanel(btn);
      } else if (tool === 'filters') {
        renderFilterPanel(this.#filterPanel, { columns: this.#activeCols, model: this.#filterModel });
        showPopover(this.#filterPanel, btn, 'bottom-end');
      } else if (tool === 'density') {
        const densities: Array<'compact' | 'standard' | 'comfortable'> = ['compact', 'standard', 'comfortable'];
        renderMenu(this.#menu, densities.map((value) => ({
          label: this.#text[value], action: 'density', value, checked: this.density === value,
        })));
        showPopover(this.#menu, btn, 'bottom-end');
      } else if (tool === 'export') {
        renderMenu(this.#menu, [
          { label: this.#text.csv, action: 'export-csv' },
          { label: this.#text.excel, action: 'export-excel' },
          { label: this.#text.print, action: 'export-print' },
        ]);
        showPopover(this.#menu, btn, 'bottom-end');
      }
      this.#openPop = tool;
      this.#popAnchor = btn;
    };

    #showColumnsPanel(anchor: HTMLElement, search = ''): void {
      renderColumnsPanel(this.#columnsPanel, {
        columns: this.#activeCols,
        isVisible: (f: string) => this.#visibility[f] !== false,
        search,
      });
      showPopover(this.#columnsPanel, anchor, 'bottom-end');
    }

    #openColumnMenu(field: string, anchor: HTMLElement): void {
      const col = this.#activeCols.find((c: ColumnDef) => c.field === field);
      if (!col) return;
      const sort = this.#sortModel.find((s: SortEntry) => s.field === field)?.sort;
      const pinned: 'left' | 'right' | null = this.#pinnedCols.left.includes(field)
        ? 'left'
        : this.#pinnedCols.right.includes(field) ? 'right' : null;
      const grouped = this.#groupingModel.includes(field);
      const items: MenuItem[] = [];

      if (col.sortable !== false && !this.hasAttribute('disable-column-sort')) {
        items.push(
          { label: this.#text.sortAsc, icon: ICONS.asc, action: 'sort-asc', checked: sort === 'asc' },
          { label: this.#text.sortDesc, icon: ICONS.desc, action: 'sort-desc', checked: sort === 'desc' },
          { label: this.#text.unsort, action: 'sort-none', disabled: !sort },
          { separator: true },
        );
      }
      if (col.filterable !== false && !this.hasAttribute('disable-column-filter')) {
        items.push({ label: this.#text.filterBy, icon: ICONS.filter, action: 'filter' });
      }
      if (col.hideable !== false) items.push({ label: this.#text.hideColumn, action: 'hide' });
      items.push({ label: this.#text.manageColumns, icon: ICONS.columns, action: 'manage' });
      items.push(
        { separator: true },
        { label: this.#text.pinLeft, action: 'pin-left', checked: pinned === 'left' },
        { label: this.#text.pinRight, action: 'pin-right', checked: pinned === 'right' },
        { label: this.#text.unpin, action: 'unpin', disabled: !pinned },
      );
      if (col.groupable !== false && !this.treeData) {
        items.push(
          { separator: true },
          { label: grouped ? this.#text.ungroup : this.#text.groupBy, action: grouped ? 'ungroup' : 'group-by' },
        );
      }
      if (col.aggregable !== false) {
        items.push({ separator: true }, ...aggregationItems(col, this.#aggregationModel[field]) as MenuItem[]);
      }
      if (col.resizable !== false) {
        items.push({ separator: true }, { label: this.#text.autosize, action: 'autosize' });
      }

      renderMenu(this.#menu, items);
      this.#menu.dataset.field = field;
      showPopover(this.#menu, anchor, 'bottom-end');
      this.#openPop = 'menu';
      this.#popAnchor = anchor;
    }

    #onMenuClick = (e: PointerEvent): void => {
      const btn = $closest<HTMLElement>(e, '.pop-item') as HTMLButtonElement | null;
      if (!btn || btn.disabled) return;
      const action = btn.dataset.action;
      const value = btn.dataset.value;
      const field = this.#menu.dataset.field ?? '';

      switch (action) {
        case 'sort-asc': this.#applySort(field, 'asc', false); break;
        case 'sort-desc': this.#applySort(field, 'desc', false); break;
        case 'sort-none': this.#applySort(field, null, false); break;
        case 'hide': this.setColumnVisibility(field, false); break;
        case 'manage': {
          this.#closePop();
          const anchor = this.#headRow.querySelector<HTMLElement>(`[data-field="${cssEscape(field)}"] .hmenu`) || this.#headRow;
          this.#showColumnsPanel(anchor);
          this.#openPop = 'columns';
          this.#popAnchor = this.#headRow.querySelector<HTMLElement>(`[data-field="${cssEscape(field)}"] .hmenu`);
          return;
        }
        case 'filter': {
          if (!this.#filterModel.items.some((i: FilterRule) => i.field === field)) {
            const col = this.#activeCols.find((c: ColumnDef) => c.field === field);
            this.#filterModel = {
              ...this.#filterModel,
              items: [...this.#filterModel.items, { field, operator: col?.operators?.[0]?.value, value: '' }],
            };
          }
          const anchor = this.#headRow.querySelector<HTMLElement>(`[data-field="${cssEscape(field)}"] .hmenu`);
          this.#closePop();
          renderFilterPanel(this.#filterPanel, { columns: this.#activeCols, model: this.#filterModel });
          showPopover(this.#filterPanel, anchor || this.#headRow, 'bottom-end');
          this.#openPop = 'filters';
          this.#popAnchor = anchor;
          this.#filterPanel.querySelector<HTMLElement>('.filter-input')?.focus();
          return;
        }
        case 'pin-left': this.pinColumn(field, 'left'); break;
        case 'pin-right': this.pinColumn(field, 'right'); break;
        case 'unpin': this.pinColumn(field, null); break;
        case 'group-by': this.setRowGroupingModel([...this.#groupingModel, field]); break;
        case 'ungroup': this.setRowGroupingModel(this.#groupingModel.filter((f: string) => f !== field)); break;
        case 'aggregate': {
          const model = { ...this.#aggregationModel };
          if (value) model[field] = value;
          else delete model[field];
          this.setAggregationModel(model);
          break;
        }
        case 'autosize': this.#autosize(field); break;
        case 'density': this.setDensity(value ?? ''); break;
        case 'export-csv': this.exportDataAsCsv(); break;
        case 'export-excel': this.exportDataAsExcel(); break;
        case 'export-print': this.exportDataAsPrint(); break;
        case 'row-action': {
          const idx = Number(value);
          const action = this.#menuActions?.[idx];
          if (action && this.#menuActionRow) {
            action.onClick?.({ ...this.#menuActionRow, api: this });
          }
          break;
        }
        default: break;
      }
      this.#closePop();
    };

    #onColumnsPanelChange = (e: Event): void => {
      const box = (e.target as HTMLElement).closest('input[data-field]');
      if (!box) return;
      const cb = box as HTMLInputElement;
      this.setColumnVisibility(cb.dataset.field ?? '', cb.checked);
    };

    #onColumnsPanelSearch = (e: Event): void => {
      const input = (e.target as HTMLElement).closest('.pop-search');
      if (!input) return;
      const inputEl = input as HTMLInputElement;
      const { value } = inputEl;
      if (!this.#popAnchor) return;
      this.#showColumnsPanel(this.#popAnchor, value);
      const next = this.#columnsPanel.querySelector<HTMLInputElement>('.pop-search');
      next?.focus();
      next?.setSelectionRange(value.length, value.length);
    };

    #onColumnsPanelClick = (e: PointerEvent): void => {
      const btn = $closest(e,'[data-action]');
      if (!btn) return;
      const model: Record<string, boolean> = {};
      for (const col of this.#activeCols) {
        if (col.hideable === false) continue;
        model[col.field ?? ''] = btn.dataset.action === 'show-all';
      }
      this.columnVisibilityModel = model;
      emit(this, 'is-column-hide', { columnVisibilityModel: model });
      if (this.#popAnchor) this.#showColumnsPanel(this.#popAnchor);
    };

    #onFilterPanelClick = (e: PointerEvent): void => {
      const btn = $closest(e,'[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      if (action === 'add-filter') {
        const col = this.#activeCols.find((c: ColumnDef) => c.filterable !== false && c.type !== 'actions');
        if (!col) return;
        this.#filterModel = {
          ...this.#filterModel,
          items: [...this.#filterModel.items, { field: col.field ?? '', operator: col.operators?.[0]?.value, value: '' }],
        };
      } else if (action === 'remove-filter') {
        const rowEl = btn.closest<HTMLElement>('.filter-row-form');
        const index = Number(rowEl?.dataset.index ?? -1);
        this.#filterModel = {
          ...this.#filterModel,
          items: this.#filterModel.items.filter((_, i: number) => i !== index),
        };
      } else if (action === 'clear-filters') {
        this.#filterModel = { items: [], logicOperator: this.#filterModel.logicOperator };
      } else {
        return;
      }
      this.#page = 0;
      this.#refresh();
      emit(this, 'is-filter-change', { filterModel: this.#filterModel });
      renderFilterPanel(this.#filterPanel, { columns: this.#activeCols, model: this.#filterModel });
      if (this.#popAnchor) positionPopover(this.#filterPanel, this.#popAnchor, 'bottom-end');
    };

    #onFilterPanelChange = (e: Event): void => {
      const row = $closest<HTMLElement>(e, '.filter-row-form');
      if (!row) return;
      const index = Number(row.dataset.index ?? -1);
      const items = this.#filterModel.items.slice();
      const item = { ...items[index] };
      let rerender = false;
      const target = e.target instanceof HTMLElement ? e.target : null;

      if (target?.classList.contains('filter-logic-select')) {
        this.#filterModel = { ...this.#filterModel, logicOperator: (target as HTMLSelectElement).value };
        rerender = true;
      } else if (target?.classList.contains('filter-col')) {
        const col = this.#activeCols.find((c: ColumnDef) => c.field === (target as HTMLSelectElement).value);
        item.field = (target as HTMLSelectElement).value;
        item.operator = col?.operators?.[0]?.value;
        item.value = '';
        items[index] = item;
        this.#filterModel = { ...this.#filterModel, items };
        rerender = true;
      } else if (target?.classList.contains('filter-op')) {
        item.operator = (target as HTMLSelectElement).value;
        items[index] = item;
        this.#filterModel = { ...this.#filterModel, items };
        rerender = true;
      } else if (target?.classList.contains('filter-input')) {
        item.value = (target as HTMLInputElement).value;
        items[index] = item;
        this.#filterModel = { ...this.#filterModel, items };
      }

      this.#page = 0;
      this.#refresh();
      emit(this, 'is-filter-change', { filterModel: this.#filterModel });
      if (!rerender) return;
      renderFilterPanel(this.#filterPanel, { columns: this.#activeCols, model: this.#filterModel });
      if (this.#popAnchor) positionPopover(this.#filterPanel, this.#popAnchor, 'bottom-end');
    };

    #onFilterPanelInput = (e: Event): void => {
      const target = e.target;
      if (!(target instanceof HTMLElement) || !target.classList.contains('filter-input')) return;
      const row = target.closest<HTMLElement>('.filter-row-form');
      const index = Number(row?.dataset.index ?? -1);
      const items = this.#filterModel.items.slice();
      items[index] = { ...items[index]!, value: (target as HTMLInputElement).value };
      this.#filterModel = { ...this.#filterModel, items };
      this.#page = 0;
      this.#refresh();
      emit(this, 'is-filter-change', { filterModel: this.#filterModel });
    };

    #emitPagination(): void {
      const detail: PageChangeDetail = this.paginationModel;
      emit(this, 'is-page-change', detail);
    }

    #onFooterClick = (e: PointerEvent): void => {
      const btn = $closest<HTMLElement>(e, '[data-page]') as HTMLButtonElement | null;
      if (!btn || btn.disabled) return;
      const total = this.rowCount ?? this.#leafRows.length;
      const pages = Math.max(1, Math.ceil(total / this.pageSize));
      const map: Record<string, number> = {
        first: 0, prev: this.#page - 1, next: this.#page + 1, last: pages - 1,
      };
      const target = btn.dataset.page ?? '';
      this.#page = Math.max(0, Math.min(pages - 1, map[target] ?? 0));
      this.#refresh();
      this.#emitPagination();
    };

    #onPageSizeChange: () => void = () => {
      const select = this.#pageSizeSelect as unknown as { value: string };
      this.setAttribute('page-size', select.value);
      this.#page = 0;
      this.#refresh();
      this.#emitPagination();
    };

    #onDocPointerDown = (e: PointerEvent): void => {
      if (!this.#openPop) return;
      const path = e.composedPath();
      if (path.includes(this.#menu) || path.includes(this.#columnsPanel) || path.includes(this.#filterPanel)) return;
      if (this.#popAnchor && path.includes(this.#popAnchor)) return;
      this.#closePop();
    };

    #closePop(): void {
      hidePopover(this.#menu);
      hidePopover(this.#columnsPanel);
      hidePopover(this.#filterPanel);
      this.#openPop = null;
      this.#popAnchor = null;
      this.#menu.removeAttribute('data-field');
    }
  }

  /* ── Utilidades ─────────────────────────────────────────────────────── */

  function appendContent(host: HTMLElement, content: Node | string | { html?: string } | null | undefined): void {
    if (content == null) return;
    if (content instanceof Node) host.appendChild(content);
    else if (typeof content === 'object' && content.html != null) host.innerHTML = String(content.html);
    else host.textContent = String(content);
  }

  function cssEscape(value: string): string {
    const s = String(value);
    return typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(s) : s.replace(/["\\]/g, '\\$&');
  }

  /** `closest` tipado: el target de un evento puede ser null y no es HTMLElement. */
  function $closest<T extends HTMLElement = HTMLElement>(e: Event, sel: string): T | null {
    const t = e.target;
    return t instanceof Element ? t.closest<T>(sel) : null;
  }

  /** Opciones cerradas para el filtro; `null` si la columna se filtra a mano. */
  function filterOptionsFor(col: ColumnDef): Array<{ value: CellValue; label: CellValue }> | null {
    if (col.type === 'boolean') return [{ value: 'true', label: 'Sí' }, { value: 'false', label: 'No' }];
    if (col.type !== 'singleSelect' || !Array.isArray(col.valueOptions)) return null;
    return col.valueOptions.map((raw: CellValue) => (typeof raw === 'object' && raw !== null
      ? {
        value: (raw as { value: CellValue }).value,
        label: (raw as { label?: CellValue }).label ?? (raw as { value: CellValue }).value,
      }
      : { value: raw, label: raw }));
  }

  function coerceValue(value: CellValue, type: string | undefined): CellValue {
    if (type === 'number') {
      if (value === '' || value == null) return null;
      const n = Number(value);
      return Number.isFinite(n) ? n : null;
    }
    if (type === 'boolean') {
      if (typeof value === 'boolean') return value;
      return ['true', '1', 'sí', 'si', '✓', 'x'].includes(String(value).toLowerCase());
    }
    if (type === 'date' || type === 'dateTime') return value ? toDate(value) : null;
    return value;
  }

  function setFieldValue(row: Row, field: string, value: CellValue): void {
    if (!field.includes('.')) {
      row[field] = value;
      return;
    }
    const parts = field.split('.');
    let target: Row = row;
    for (const key of parts.slice(0, -1)) {
      const next = target[key];
      if (next == null || typeof next !== 'object') target[key] = {};
      target = target[key] as Row;
    }
    target[parts.at(-1) ?? ''] = value;
  }

  function toInputDate(value: string | number | Date | null | undefined): string {
    const d = toDate(value);
    if (!d) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function toInputDateTime(value: string | number | Date | null | undefined): string {
    const d = toDate(value);
    if (!d) return '';
    return `${toInputDate(d)}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  /** Tree data: la hoja que representa al propio grupo se fusiona con él. */
  /**
   * En tree data cada rama ES una fila: se absorbe la hoja espejo y las ramas
   * sin descendencia pasan a ser hojas (si no, un fichero saldría con
   * desplegable y contador).
   */
  function collapseTreeLeaves(nodes: GridNode[]): void {
    for (const node of nodes) {
      if (node.kind !== 'group') continue;
      const self = node.children?.find((c: GridNode) => c.kind === 'leaf' && c.path?.length === node.path?.length);
      if (self && node.children) {
        node.row = self.row;
        node.id = self.id;
        node.children = node.children.filter((c: GridNode) => c !== self);
      }
      if (node.children) collapseTreeLeaves(node.children);
      if (node.children && !node.children.length && node.row) node.kind = 'leaf';
    }
  }

  defineElement('is-data-grid', IsDataGrid, 'IsDataGrid');
})();