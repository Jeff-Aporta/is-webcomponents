// @contexto INDICE.md · src/components/data/ag-grid.md
/**
 * <iswc-ag-grid> — Data grid avanzado (estilo ag-grid.com en vanilla web component).
 *
 * Elemento delgado: plantilla, atributos, persistencia y fachada legada. El
 * render vive en utils/ag-grid/nucleo-* y las capacidades en plugins
 * (utils/ag-grid/{celdas,filtros,edicion,filas}); paridad en ag-grid.paridad.md.
 * Acepta tambien nombres de AG Grid: columnDefs, rowData, defaultColDef,
 * gridOptions. Soporta:
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
 *   - Edición inline por tipo, rango de celdas, portapapeles y deshacer (plugin edicion).
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
 *   --iswc-grid-row-h       alto en px/rem (default 2.5rem)
 *   --iswc-grid-header-bg
 *   --iswc-grid-stripe
 *   --iswc-grid-accent-row
 *   --iswc-grid-row-hover
 *   --iswc-grid-selected
 *   --iswc-grid-selected-bar
 *
 * Eventos
 *   iswc-sort-change        detail: { column, direction }
 *   iswc-filter-change      detail: { column, op, value }
 *   iswc-quick-filter       detail: { value }
 *   iswc-cell-click         detail: { row, column, value }
 *   iswc-cell-edit          detail: { row, column, oldValue, newValue }
 *   iswc-row-select         detail: { rows: [...] }
 *   iswc-action             detail: { row, action, column }
 *   iswc-page-change        detail: { page, pageSize }
 *   iswc-column-reorder     detail: { colId, toIndex }
 *   iswc-column-resize      detail: { colId, width }
 *   iswc-column-pin         detail: { colId, side }
 *   iswc-column-hide        detail: { colId }
 *   iswc-state-saved        detail: { json }
 *   iswc-state-loaded       detail: { columns, sortModel, ... }
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

import {
  getComponentPrefs, removeComponentPrefs, replaceComponentPrefs,
} from '@jeff-aporta/iswc-base/core/prefs.js';
import type { PrefsEntry } from '@jeff-aporta/iswc-base/core/schemas/prefs.schemas.js';
import { emit, IswcElement, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import '@jeff-aporta/iswc-base/components/forms/checkbox.js';
import '@jeff-aporta/iswc-base/components/forms/input.js';
import '@jeff-aporta/iswc-base/components/forms/select.js';
import '@jeff-aporta/iswc-base/components/forms/option.js';

import { Density, SelectionMode, DEFAULT_PAGE_SIZE } from './utils/datagrid-core/types.js';
import { selectAll as selectAllCore, clearSelection as clearSelectionCore } from './utils/datagrid-core/selection.js';
import { rowsToCsv } from './utils/datagrid-core/csv-export.js';
import { createGridModel } from './utils/datagrid-core/grid-model.js';
import { PLUGINS } from './utils/ag-grid/plugins.js';
import { lectores } from './utils/ag-grid/celdas-valores.js';
import { crearNucleo } from './utils/ag-grid/nucleo-ag-host.js';
import type { Nucleo } from './utils/ag-grid/nucleo-ag-host.schemas.js';
import { ATRIBUTOS, aplanarDefs, autogenerarDefs, ordenInicial, valorAtributo } from './utils/ag-grid/nucleo-opciones.js';
import type { ColDefAg, Capa, Desinstalar, OpcionesGrid, Zona } from './utils/ag-grid/contrato.schemas.js';
import type { ColumnDef, RowData, SortDirName, PinSideName, DensityName, GridState, GridApi, ColumnFilter, SelectionModeName, TextFilterOp } from './schemas/datagrid-types.schemas.js';
import type { StateSavedDetail, PageChangeDetail } from "./schemas/ag-grid.schemas.js";
import css from 'iswc:css';

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
        <iswc-icon icon="mdi:magnify"></iswc-icon>
        <iswc-input class="mim-dg__quick-input" type="search" placeholder="Buscar…" aria-label="Búsqueda rápida"></iswc-input>
      </label>
      <div class="mim-dg__density" role="group" aria-label="Densidad">
        <iswc-button variant="plain compact" pill class="mim-dg__density-btn" data-density="compact" title="Compacta" aria-label="Compacta">
          <iswc-icon icon="mdi:view-headline"></iswc-icon>
        </iswc-button>
        <iswc-button variant="plain compact" pill class="mim-dg__density-btn iswc-active" data-density="normal" title="Normal" aria-label="Normal">
          <iswc-icon icon="mdi:view-sequential"></iswc-icon>
        </iswc-button>
        <iswc-button variant="plain compact" pill class="mim-dg__density-btn" data-density="comfortable" title="Cómoda" aria-label="Cómoda">
          <iswc-icon icon="mdi:view-stream"></iswc-icon>
        </iswc-button>
      </div>
      <iswc-button variant="plain" color="text" class="mim-dg__tool-btn mim-dg__columns-btn" title="Columnas" aria-label="Columnas">
        <iswc-icon icon="mdi:view-column-outline"></iswc-icon>
      </iswc-button>
      <iswc-button variant="plain" color="text" class="mim-dg__tool-btn mim-dg__reset-btn" title="Reiniciar personalización" aria-label="Reiniciar personalización" hidden>
        <iswc-icon icon="mdi:backup-restore"></iswc-icon>
      </iswc-button>
      <iswc-button variant="plain" color="text" class="mim-dg__tool-btn mim-dg__export-btn" title="Exportar CSV">
        <iswc-icon icon="mdi:file-delimited-outline"></iswc-icon>
        <span class="mim-dg__tool-btn-label">CSV</span>
      </iswc-button>
    </header>

    <div class="mim-dg__group-panel" part="group-panel">
      <span class="mim-dg__group-panel-label">Agrupar:</span>
      <span class="mim-dg__group-chips"></span>
      <span class="mim-dg__group-hint">arrastra una columna aquí</span>
      <div class="mim-dg__group-panel-actions">
        <iswc-button variant="plain" pill class="mim-dg__group-panel-btn" data-action="expand-all" title="Expandir todos" aria-label="Expandir todos">
          <iswc-icon icon="mdi:unfold-more-horizontal"></iswc-icon>
        </iswc-button>
        <iswc-button variant="plain" pill class="mim-dg__group-panel-btn" data-action="collapse-all" title="Plegar todos" aria-label="Plegar todos">
          <iswc-icon icon="mdi:unfold-less-horizontal"></iswc-icon>
        </iswc-button>
      </div>
    </div>

    <div class="mim-dg__main" part="main">
      <div class="mim-dg__viewport" part="viewport" role="grid" tabindex="0">
        <div class="mim-dg__head-zone" part="header-zone" role="rowgroup">
          <div class="mim-dg__group-header" part="group-header"></div>
          <div class="mim-dg__header-row" part="header" role="row" aria-rowindex="1"></div>
          <div class="mim-dg__zona-cabecera"></div>
          <div class="mim-dg__pinned-top" part="pinned-top" role="rowgroup"></div>
        </div>
        <div class="mim-dg__body" part="body" role="rowgroup">
          <div class="mim-dg__capa" data-capa="rango"></div>
          <div class="mim-dg__capa" data-capa="arrastre"></div>
          <div class="mim-dg__capa" data-capa="edicion"></div>
        </div>
        <div class="mim-dg__pinned-bottom" part="pinned-bottom" role="rowgroup"></div>
      </div>
      <aside class="mim-dg__sidebar" part="sidebar" hidden></aside>
      <span class="mim-dg__sonda" aria-hidden="true"></span>
    </div>

    <footer class="mim-dg__footer" part="footer">
      <div class="mim-dg__zona-estado" part="status-bar"></div>
      <span class="mim-dg__count" part="count"></span>
      <span class="mim-dg__footer-spacer"></span>
      <label class="mim-dg__page-size">
        Filas:
        <iswc-select class="mim-dg__page-size-select" aria-label="Filas por página">
          <iswc-option value="25">25</iswc-option>
          <iswc-option value="50">50</iswc-option>
          <iswc-option value="100">100</iswc-option>
          <iswc-option value="200">200</iswc-option>
        </iswc-select>
      </label>
      <iswc-button variant="plain" pill class="mim-dg__pager-btn" data-action="page-prev" aria-label="Anterior">
        <iswc-icon icon="mdi:chevron-left"></iswc-icon>
      </iswc-button>
      <span class="mim-dg__pager-info"></span>
      <iswc-button variant="plain" pill class="mim-dg__pager-btn" data-action="page-next" aria-label="Siguiente">
        <iswc-icon icon="mdi:chevron-right"></iswc-icon>
      </iswc-button>
    </footer>
  </div>
`;

const LEGACY_OP_MAP: Record<string, string> = {
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

/** Type guard para HTMLElement en e.target. */
function asElement(target: EventTarget | null): Element | null {
  return target instanceof Element ? target : null;
}

function numeroLocal(n: number): string {
  return Number.isFinite(n) ? n.toLocaleString() : '0';
}

export class IswcAgGrid extends IswcElement {
  static override tag = 'iswc-ag-grid';
  static override css = css;
  static override deps = ['iswc-icon', 'iswc-button'];

  static override template = TEMPLATE;
  static override observed = [
      'rows', 'columns', 'get-row-id',
      'page-size', 'page-size-options', 'pagination',
      'row-selection', 'selectable', 'density',
      'quick-filter', 'group-by',
      'remember-state', 'storage-key',
      'toolbar', 'theme', 'loading',
      ...Object.keys(ATRIBUTOS),
    ];

  /** El motor: `null` hasta `onConnected`; la fachada lo comprueba antes de usarlo. */
  #api: GridApi | null = null;
  /** true si filas/columnas llegaron por api o propiedad antes del init. */
  #externalData = false;
  #rawRows: RowData[] = [];
  #rawColumns: ColumnDef[] = [];
  #getRowId: string | null = null;
  #pageSize = DEFAULT_PAGE_SIZE;
  #pageSizeOptions: number[] = [25, 50, 100, 200];
  #showToolbar = true;
  #rememberState = false;
  #storageKey = '';
  #density: DensityName = Density.NORMAL;
  #isPaginated = false;
  #page = 0;
  #currentSelectionMode: SelectionModeName = SelectionMode.NONE;
  #viewport!: HTMLElement;
  #countEl!: HTMLElement;
  #pagerInfo!: HTMLElement;
  #pageSizeSelect!: HTMLElement;
  #densityBtns!: NodeListOf<HTMLElement>;
  #toolbar!: HTMLElement;
  #groupPanel!: HTMLElement;
  #groupChips!: HTMLElement;
  #ro!: ResizeObserver;
  #unsubscribe: (() => void) | null = null;
  #nucleo!: Nucleo;
  #limpiezas: Desinstalar[] = [];
  #fachada: Record<string, unknown> | null = null;
  #leerCelda: { valor: (col: never, node: never) => unknown; texto: (col: never, node: never) => string } | null = null;

  constructor() {
    super();
    this.#cacheRefs();
    this.#crearNucleo();
    this.#bindStaticEvents();
  }

  #cacheRefs(): void {
    const root = this.shadowRoot!;
    this.#viewport = root.querySelector<HTMLElement>('.mim-dg__viewport')!;
    this.#countEl = root.querySelector<HTMLElement>('.mim-dg__count')!;
    this.#pagerInfo = root.querySelector<HTMLElement>('.mim-dg__pager-info')!;
    this.#pageSizeSelect = root.querySelector<HTMLElement>('.mim-dg__page-size-select')!;
    this.#densityBtns = root.querySelectorAll<HTMLElement>('.mim-dg__density-btn');
    this.#toolbar = root.querySelector<HTMLElement>('.mim-dg__toolbar')!;
    this.#groupPanel = root.querySelector<HTMLElement>('.mim-dg__group-panel')!;
    this.#groupChips = root.querySelector<HTMLElement>('.mim-dg__group-chips')!;
  }

  #crearNucleo(): void {
    const root = this.shadowRoot!;
    const uno = (s: string): HTMLElement => root.querySelector<HTMLElement>(s)!;
    const capa = (n: Capa): HTMLElement => uno(`[data-capa="${n}"]`);
    const zonas: Record<Zona, HTMLElement> = { cabecera: uno('.mim-dg__zona-cabecera'), principal: uno('.mim-dg__main'), pie: uno('.mim-dg__footer'), estado: uno('.mim-dg__zona-estado') };
    this.#nucleo = crearNucleo(this, root, {
      viewport: this.#viewport,
      cuerpo: uno('.mim-dg__body'),
      zonaArriba: uno('.mim-dg__pinned-top'),
      zonaAbajo: uno('.mim-dg__pinned-bottom'),
      cabecera: uno('.mim-dg__head-zone'),
      grupos: uno('.mim-dg__group-header'),
      filaCabecera: uno('.mim-dg__header-row'),
      sondaFila: uno('.mim-dg__sonda'),
      capas: { rango: capa('rango'), edicion: capa('edicion'), arrastre: capa('arrastre') },
      zonas,
    }, { modelo: () => this.#api, modoSeleccion: () => this.#modoSeleccion() });
    this.#limpiezas = this.#nucleo.instalar(PLUGINS);
    const { h } = this.#nucleo;
    const leer = lectores(h);
    this.#nucleo.fijarLectores(leer.valor, leer.texto);
    this.#leerCelda = leer;
    h.alCambiarOpcion('rowData', (v) => this.api.setRows(v as RowData[]));
    h.alCambiarOpcion('columnDefs', (v) => this.api.setColumns(v as ColumnDef[]));
    h.alCambiarOpcion('defaultColDef', () => this.api.setColumns(this.#rawColumns));
    h.alCambiarOpcion('columnTypes', () => this.api.setColumns(this.#rawColumns));
    h.alCambiarOpcion('rowSelection', () => { this.#syncSelectionMode(); this.#render(); });
    h.alCambiarOpcion('pagination', (v) => { this.#isPaginated = v === true; this.#api?.setPagination(this.#isPaginated); });
    h.alCambiarOpcion('paginationPageSize', (v) => this.#api?.setPageSize(Number(v)));
    h.alCambiarOpcion('quickFilterText', (v) => this.api.setQuickFilter(String(v ?? '')));
    h.alCambiarOpcion('rowHeight', () => { this.#nucleo.motor.medir(); this.#nucleo.motor.pedir(); });
  }

  #modoSeleccion(): 'none' | 'single' | 'multiple' {
    return this.#currentSelectionMode as 'none' | 'single' | 'multiple';
  }

  #bindStaticEvents(): void {
    const root = this.shadowRoot!;
    const qf = root.querySelector<HTMLInputElement>('.mim-dg__quick-input');
    qf?.addEventListener('input', () => {
      if (!this.#api) return;
      this.api.setQuickFilter(qf.value);
      emit(this, 'iswc-quick-filter', { value: qf.value });
    });

    this.#densityBtns.forEach((btn: HTMLElement) => {
      btn.addEventListener('click', () => {
        const d = btn.dataset.density;
        if (d) this.setAttribute('density', d);
      });
    });

    root.querySelector<HTMLElement>('.mim-dg__export-btn')?.addEventListener('click', () => this.api.exportCSV());
    root.querySelector<HTMLElement>('.mim-dg__columns-btn')?.addEventListener('click', () => this.#toggleSidePanel('columns'));
    root.querySelector<HTMLElement>('.mim-dg__reset-btn')?.addEventListener('click', () => this.api.resetPersistedState());

    root.querySelector<HTMLElement>('.mim-dg__footer')?.addEventListener('click', (e: Event): void => {
      // Los controles son <iswc-button>: el click se retarget al host.
      const btn = asElement(e.target)?.closest('[data-action]');
      if (!(btn instanceof HTMLElement)) return;
      if (btn.dataset.action === 'page-prev') this.#goToPage(this.#page - 1);
      if (btn.dataset.action === 'page-next') this.#goToPage(this.#page + 1);
    });
    this.#pageSizeSelect.addEventListener('change', () => {
      const sel = this.#pageSizeSelect as HTMLElement & { value: string };
      this.#api?.setPageSize(Number(sel.value));
    });

    this.#viewport.addEventListener('scroll', () => this.#nucleo.motor.alScroll(), { passive: true });

    this.#groupPanel.addEventListener('click', this.#onGroupPanelClick);
    this.#groupPanel.addEventListener('dragover', (e: DragEvent): void => {
      e.preventDefault();
      this.#groupPanel.classList.add('iswc-over');
    });
    this.#groupPanel.addEventListener('dragleave', () => this.#groupPanel.classList.remove('iswc-over'));
    this.#groupPanel.addEventListener('drop', (e: DragEvent): void => {
      e.preventDefault();
      this.#groupPanel.classList.remove('iswc-over');
      const colId = e.dataTransfer?.getData('application/x-is-col-id');
      if (colId) this.#api?.addRowGroupCol(colId);
    });

    this.#ro = new ResizeObserver(() => {
      if (!this.#api) return;
      const { motor, h } = this.#nucleo;
      motor.medir();
      motor.ahora();
      h.pedirRender();
      this.#nucleo.emitir('gridSizeChanged', { clientWidth: this.#viewport.clientWidth, clientHeight: this.#viewport.clientHeight });
    });
  }

  #onGroupPanelClick = (e: Event): void => {
    if (!this.#api) return;
    const target = asElement(e.target);
    if (!target) return;
    const ungroup = target.closest('[data-act="ungroup"]');
    if (ungroup instanceof HTMLElement) {
      e.preventDefault();
      e.stopPropagation();
      const colId = ungroup.dataset.colId;
      if (colId) this.#api.removeRowGroupCol(colId);
      return;
    }
    const btn = target.closest('[data-action]');
    if (!(btn instanceof HTMLElement)) return;
    if (btn.dataset.action === 'expand-all') this.#api.expandAllGroups();
    if (btn.dataset.action === 'collapse-all') this.#api.collapseAllGroups();
  };

  override async onConnected(): Promise<void> {
    this.#ro.observe(this.#viewport);
    // La sonda mide en em: un cambio de font-size del host dispara el reescalado.
    this.#ro.observe(this.shadowRoot!.querySelector<HTMLElement>('.mim-dg__sonda')!);
    await this.#readData();
    this.#syncPageSize();
    this.#syncAttrs();
    this.#syncOpcionesAtributo();
    this.#initModel();
    if (this.#rememberState) {
      const key = this.#storageKey || this.#defaultStorageKey();
      const saved = getComponentPrefs('iswc-ag-grid', key);
      if (saved && this.#api) this.#api.loadState(JSON.stringify(saved));
    }
    this.#nucleo.motor.medir();
    this.#render();
    this.#bindModelSubscription();
    this.#nucleo.emitir('gridReady', {});
    this.#nucleo.emitir('firstDataRendered', {});
  }

  override onDisconnected(): void {
    this.#ro?.disconnect();
    this.#unsubscribe?.();
    this.#nucleo.emitir('gridPreDestroyed', { state: this.#api?.serializeState() });
  }

  override async onAttributeChanged(name: string, _oldVal: string | null, newVal: string | null): Promise<void> {
    if (name in ATRIBUTOS) {
      const opcion = ATRIBUTOS[name]!;
      this.#nucleo.h.fijarOpcion(opcion, valorAtributo(opcion, newVal));
      return;
    }
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
      this.#api?.setPagination(this.#isPaginated);
      this.#render();
    } else if (name === 'density') {
      this.#density = (newVal as DensityName) || Density.NORMAL;
      this.#renderDensity();
      this.#nucleo.motor.medir();
      this.#render();
    } else if (name === 'quick-filter') {
      this.api.setQuickFilter(newVal || '');
    } else if (name === 'group-by') {
      this.#api?.setRowGroupCols((newVal || '').split(',').map((s: string) => s.trim()).filter(Boolean));
    } else if (name === 'row-selection' || name === 'selectable') {
      this.#syncSelectionMode();
      this.#render();
    } else if (name === 'toolbar') {
      this.#showToolbar = newVal !== 'false';
      this.#toolbar.style.display = this.#showToolbar ? '' : 'none';
    } else if (name === 'remember-state' || name === 'storage-key') {
      this.#syncStatePersistence();
    } else if (name === 'loading') {
      this.#nucleo.motor.ahora();
    }
  }

  #syncOpcionesAtributo(): void {
    for (const [attr, opcion] of Object.entries(ATRIBUTOS)) {
      if (this.hasAttribute(attr)) this.#nucleo.opciones.set(opcion, valorAtributo(opcion, this.getAttribute(attr)));
    }
  }

  #syncAttrs(): void {
    this.#syncSelectionMode();
    this.#isPaginated = this.hasAttribute('pagination') || this.#nucleo.opciones.get('pagination') === true;
    this.#showToolbar = this.getAttribute('toolbar') !== 'false';
    this.#density = (this.getAttribute('density') as DensityName) || Density.NORMAL;
    this.#toolbar.style.display = this.#showToolbar ? '' : 'none';
    this.#syncStatePersistence();
  }

  #syncStatePersistence(): void {
    this.#rememberState = this.hasAttribute('remember-state');
    this.#storageKey = this.getAttribute('storage-key') || '';
    // Sin persistencia no hay nada que reiniciar: el botón sobra.
    const resetBtn = this.shadowRoot?.querySelector<HTMLElement>('.mim-dg__reset-btn');
    if (resetBtn) resetBtn.hidden = !this.#rememberState;
  }

  /** `serializeState()` del core devuelve JSON string; en prefs el snapshot se
   *  guarda como objeto para no anidar un string dentro del JSON raíz. */
  static #parseState(raw: unknown): unknown {
    if (raw && typeof raw === 'object') return raw;
    try { return JSON.parse(String(raw)); } catch { return null; }
  }

  /** Snapshot completo bajo `localStorage['iswc:root']['iswc-ag-grid'][key]`.
   *  Se reemplaza entero (no merge): un merge dejaría columnas o filtros que
   *  ya no existen en el estado nuevo. */
  #persistState(): void {
    if (!this.#api) return;
    const key = this.#storageKey || this.#defaultStorageKey();
    const state = IswcAgGrid.#parseState(this.#api.serializeState());
    if (!state) return;
    replaceComponentPrefs('iswc-ag-grid', key, state as PrefsEntry);
    emit(this, 'iswc-state-saved', { key, state } satisfies StateSavedDetail);
  }

  #defaultStorageKey(): string {
    return `iswc-ag-grid:${this.id || this.getAttribute('name') || 'session'}`;
  }

  async #readData(): Promise<void> {
    // Si el consumidor ya empujó filas/columnas vía api o propiedad, no
    // pisarlas con scripts vacíos del host.
    if (this.#externalData) {
      this.#getRowId = this.getAttribute('get-row-id');
      return;
    }
    const scripts = [...this.children].filter(
      (c): c is HTMLScriptElement => c.tagName === 'SCRIPT' && /json/i.test((c as HTMLElement).dataset['type'] || c.getAttribute('type') || ''),
    );
    const rowsAttr = this.getAttribute('rows');
    const colsAttr = this.getAttribute('columns');
    const fetchScript = async (s: HTMLScriptElement | null | undefined): Promise<unknown> => {
      if (!s) return null;
      if (s.src) {
        try {
          const res = await fetch(s.src);
          return await res.json();
        } catch { return null; }
      }
      try { return JSON.parse(s.textContent ?? ''); } catch { return null; }
    };
    const parsedCols: unknown = colsAttr
      ? JSON.parse(colsAttr)
      : (scripts[0] && !scripts[0].src ? JSON.parse(scripts[0].textContent ?? '') : null);
    const parsedRows: unknown = rowsAttr
      ? JSON.parse(rowsAttr)
      : (scripts[1]
          ? await fetchScript(scripts[1])
          : (scripts[0] ? await fetchScript(scripts[0]) : null));
    const looksLikeColDef = (x: unknown): boolean => x != null && typeof x === 'object' && ('field' in (x as Record<string, unknown>) || 'children' in (x as Record<string, unknown>)) && !('id' in (x as Record<string, unknown>));
    this.#rawColumns = Array.isArray(parsedCols) && parsedCols.every(looksLikeColDef) ? (parsedCols as ColumnDef[]) : [];
    const rowsArr: unknown[] = Array.isArray(parsedRows) ? parsedRows as unknown[] : [];
    this.#rawRows = rowsArr
      .filter((r: unknown): r is RowData => r != null && typeof r === 'object' && !('field' in (r as Record<string, unknown>)))
      .map((r) => r as RowData);
    if (!this.#rawRows.length && rowsArr.length) {
      this.#rawRows = rowsArr.filter((r): r is RowData => r != null && typeof r === 'object') as RowData[];
    }
    this.#getRowId = this.getAttribute('get-row-id');
  }

  #syncPageSize(): void {
    const opts = (this.getAttribute('page-size-options') || this.#pageSizeOptions.join(','))
      .split(',').map((s: string) => Number(s.trim())).filter((n: number) => Number.isFinite(n) && n > 0);
    this.#pageSizeOptions = opts.length ? opts : [DEFAULT_PAGE_SIZE];
    this.#pageSizeSelect.replaceChildren(...this.#pageSizeOptions.map((o: number) => {
      const opt = document.createElement('iswc-option') as HTMLElement & { value: string; textContent: string };
      opt.value = String(o);
      opt.textContent = String(o);
      return opt;
    }));
    const ps = Number(this.getAttribute('page-size')) || Number(this.#nucleo.opciones.get('paginationPageSize')) || DEFAULT_PAGE_SIZE;
    this.#pageSize = this.#pageSizeOptions.includes(ps) ? ps : (this.#pageSizeOptions[0] ?? DEFAULT_PAGE_SIZE);
    (this.#pageSizeSelect as HTMLElement & { value: string }).value = String(this.#pageSize);
  }

  #syncSelectionMode(): void {
    const propia = this.#nucleo.opciones.get('rowSelection');
    const objeto = propia && typeof propia === 'object' ? (propia as { mode?: string }).mode : propia;
    const mode = objeto ?? this.getAttribute('row-selection');
    if (mode === 'single' || mode === 'singleRow') this.#currentSelectionMode = SelectionMode.SINGLE;
    else if (mode === 'multiple' || mode === 'multiRow') this.#currentSelectionMode = SelectionMode.MULTIPLE;
    else if (this.hasAttribute('selectable')) this.#currentSelectionMode = SelectionMode.MULTIPLE;
    else this.#currentSelectionMode = SelectionMode.NONE;
  }

  /** ColDef del consumidor → defs planas del motor; sin columnas, las deduce de la primera fila. */
  #defsMotor(): ColumnDef[] {
    const crudas = (this.#rawColumns.length ? this.#rawColumns : autogenerarDefs(this.#rawRows)) as ColDefAg[];
    const defs = aplanarDefs(crudas, Object.fromEntries(this.#nucleo.opciones));
    // El core ordena y filtra con los mismos lectores que pinta la celda.
    for (const d of defs) d['__leer'] = this.#leerCelda;
    return defs as unknown as ColumnDef[];
  }

  #idDeFila(): (row: RowData, index: number) => string {
    const propia = this.#nucleo.opciones.get('getRowId') as ((p: { data: RowData }) => string) | undefined;
    if (propia) return (data: RowData) => String(propia({ data }));
    const campo = this.#getRowId;
    if (campo) return (row: RowData) => { const v = row[campo]; return v == null ? '' : String(v); };
    return (row: RowData, i: number) => { const v = row['id']; return v == null ? `row-${i}` : String(v); };
  }

  #initModel(): void {
    if (this.#api) return;
    const defs = this.#defsMotor();
    this.#api = createGridModel({
      rows: this.#rawRows,
      columns: defs,
      getRowId: this.#idDeFila() as never,
      pagination: this.#isPaginated,
      pageSize: this.#pageSize,
      density: this.#density,
      rowGroupCols: this.#resolveRowGroupCols(defs),
      selectionMode: this.#currentSelectionMode,
      quickFilter: String(this.#nucleo.opciones.get('quickFilterText') ?? ''),
      groupDefaultExpanded: this.#nucleo.opciones.get('groupDefaultExpanded') as number | undefined,
    });
    const orden = ordenInicial(defs as unknown as ColDefAg[]);
    if (orden.length) this.#api.setSortModel(orden);
    this.#nucleo.alCrearModelo();
    this.#nucleo.emitir('newColumnsLoaded', {});
  }

  /** Grupos iniciales: atributo group-by, si no `rowGroup: true` en los defs. */
  #resolveRowGroupCols(defs: ColumnDef[]): string[] {
    const attr = (this.getAttribute('group-by') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
    if (attr.length) return attr;
    return defs.filter((c) => c?.rowGroup === true).map((c) => String(c.colId ?? c.field)).filter(Boolean);
  }

  #bindModelSubscription(): void {
    this.#unsubscribe?.();
    if (!this.#api) return;
    this.#unsubscribe = this.#api.subscribe((state: GridState, reason?: string): void => {
      this.#nucleo.alModelo(state, reason);
      if (reason === 'selection') {
        this.#renderFooter();
        return;
      }
      this.#renderFooter();
      this.#renderGroupPanel();
      if (this.#rememberState && reason !== 'transaction') this.#persistState();
    });
  }

  /* ── Render de la cascara ─────────────────────────────────────────────── */

  #render(): void {
    if (!this.#api) return;
    this.#nucleo.motor.listaCambio();
    this.#nucleo.motor.ahora();
    this.#nucleo.cabecera.pintar();
    this.#renderFooter();
    this.#renderGroupPanel();
    this.#renderDensity();
  }

  /** Delegan en el plugin de paneles (openToolPanel / closeToolPanel). */
  #toggleSidePanel(panel: string | null): void {
    const api = this.api as unknown as Record<string, (p?: string) => unknown>;
    if (!panel) return;
    if (api['getOpenedToolPanel']?.() === panel) api['closeToolPanel']?.();
    else api['openToolPanel']?.(panel);
  }

  #renderFooter(): void {
    if (!this.#api) return;
    const state = this.#api.getState();
    const { h } = this.#nucleo;
    const total = this.#api.getAllRows().length;
    const filas = state.totalRows;
    const sel = state.selection.size;
    const pageCount = Math.max(1, Math.ceil(state.displayRows.length / state.pageSize));
    this.#countEl.innerHTML = `<span>${h.escapar(h.texto('rows', 'Filas'))}: <b>${numeroLocal(filas)}</b></span><span>${h.escapar(h.texto('totalRows', 'Total de filas'))}: <b>${numeroLocal(total)}</b></span>${sel > 0 ? `<span class="mim-dg__count-sel">${numeroLocal(sel)} ${h.escapar(h.texto('selectedRows', 'seleccionadas'))}</span>` : ''}`;
    this.#pagerInfo.textContent = `${state.page + 1} / ${pageCount}`;
    const footer = this.shadowRoot!.querySelector<HTMLElement>('.mim-dg__footer');
    footer?.classList.toggle('iswc-paginada', this.#isPaginated);
    this.#countEl.hidden = !!h.opcion('statusBar');
    const prev = this.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="page-prev"]');
    const next = this.shadowRoot!.querySelector<HTMLButtonElement>('[data-action="page-next"]');
    if (prev) prev.disabled = state.page <= 0;
    if (next) next.disabled = state.page >= pageCount - 1;
    this.#page = state.page;
  }

  #renderDensity(): void {
    this.#densityBtns.forEach((btn: HTMLElement) => {
      btn.classList.toggle('iswc-active', btn.dataset['density'] === this.#density);
    });
    const root = this.shadowRoot!.querySelector<HTMLElement>('.mim-dg');
    if (root) root.dataset['density'] = String(this.#density);
  }

  #renderGroupPanel(): void {
    if (!this.#api) return;
    const state = this.#api.getState();
    const { h } = this.#nucleo;
    const chips = state.rowGroupCols.map((colId) => {
      const col = h.columna(colId);
      if (!col) return '';
      const id = h.escapar(colId);
      return `<span class="mim-dg__group-chip" data-col-id="${id}"><iswc-icon icon="mdi:drag" class="mim-dg__group-chip-grip"></iswc-icon><span class="mim-dg__group-chip-label">${h.escapar(col.headerName)}</span><button class="mim-dg__group-chip-x" type="button" data-act="ungroup" data-col-id="${id}" aria-label="Quitar agrupación"><iswc-icon icon="mdi:close"></iswc-icon></button></span>`;
    });
    this.#groupChips.innerHTML = chips.join('<span class="mim-dg__group-chip-arrow">›</span>');
    const hint = this.#groupPanel.querySelector<HTMLElement>('.mim-dg__group-hint');
    if (hint) hint.style.display = state.rowGroupCols.length ? 'none' : '';
    const mostrar = h.opcion<string>('rowGroupPanelShow', 'always');
    this.#groupPanel.hidden = mostrar === 'never' || (mostrar === 'onlyWhenGrouping' && !state.rowGroupCols.length);
  }

  #goToPage(p: number): void {
    if (!this.#api) return;
    this.#api.setPage(p);
    const st = this.#api.getState();
    emit(this, 'iswc-page-change', { page: st.page + 1, pageSize: st.pageSize } satisfies PageChangeDetail);
  }

  /* ── Public API ───────────────────────────────────────────────────────── */

  get rows(): RowData[] { return this.#rawRows.slice(); }
  set rows(v: RowData[]) { this.api.setRows(v); }
  get columns(): ColumnDef[] { return this.#rawColumns.slice(); }
  set columns(v: ColumnDef[]) { this.api.setColumns(v); }

  /* Nombres de AG Grid */
  get rowData(): RowData[] { return this.#rawRows.slice(); }
  set rowData(v: RowData[]) { this.api.setRows(v); }
  get columnDefs(): ColumnDef[] { return this.#rawColumns.slice(); }
  set columnDefs(v: ColumnDef[]) { this.api.setColumns(v); }
  get defaultColDef(): unknown { return this.#nucleo.opciones.get('defaultColDef'); }
  set defaultColDef(v: unknown) { this.#nucleo.h.fijarOpcion('defaultColDef', v); }
  get gridOptions(): OpcionesGrid { return Object.fromEntries(this.#nucleo.opciones); }
  set gridOptions(o: OpcionesGrid) {
    for (const [k, v] of Object.entries(o ?? {})) this.#nucleo.h.fijarOpcion(k, v);
  }

  get api() {
    if (!this.#fachada) this.#fachada = this.#crearFachada();
    const legada = this.#fachada as ReturnType<IswcAgGrid['crearFachadaTipo']>;
    return legada;
  }

  /** Solo tipos: expone la forma de la fachada sin instanciarla dos veces. */
  crearFachadaTipo() { return this.#fachadaLegada(); }

  /** Las capas se resuelven al leer: lo expuesto por plugins gana sobre AG y esta sobre legado. */
  #crearFachada(): Record<string, unknown> {
    const legada = this.#fachadaLegada() as Record<string, unknown>;
    const ag = this.#nucleo.apiAg as unknown as Record<string, unknown>;
    const expuestos = this.#nucleo.expuestos as Record<string, unknown>;
    return new Proxy(legada, {
      get: (t, k: string) => {
        // `getState` es de las dos API: el snapshot serializable de AG mas los campos historicos.
        if (k === 'getState' && expuestos[k]) return () => ({ ...(t[k] as () => object)(), ...(expuestos[k] as () => object)() });
        return expuestos[k] ?? t[k] ?? ag[k];
      },
      has: (t, k: string) => k in expuestos || k in t || k in ag,
    });
  }

  #fachadaLegada() {
    const self = this;
    return {
      getState: (): GridState | null => self.#api?.getState() ?? null,
      setRows: (rows: RowData[]): void => {
        self.#rawRows = Array.isArray(rows) ? rows : [];
        self.#externalData = true;
        self.#api?.setRows(self.#rawRows);
        self.#nucleo.emitir('rowDataUpdated', {});
      },
      setColumns: (defs: ColumnDef[]): void => {
        self.#rawColumns = Array.isArray(defs) ? defs : [];
        self.#externalData = true;
        self.#api?.setColumnDefs(self.#defsMotor());
      },
      getRows: (): RowData[] => self.#api?.getAllRows().map((n) => n.data) ?? [],
      getAllRows: (): RowData[] => self.#api?.getAllRows().map((n) => n.data) ?? [],
      getDisplayedRows: (): RowData[] => self.#api?.getDisplayedRows().map((n) => n.data) ?? [],
      goToPage: (n: number): void => { if (self.#api) self.#goToPage(n - 1); }, // legacy 1-based
      setPage: (n: number): void => self.#api?.setPage(n),
      setPageSize: (n: number): void => self.#api?.setPageSize(n),
      setQuickFilter: (s: string): void => {
        const v = String(s ?? '');
        const input = self.shadowRoot?.querySelector<HTMLInputElement>('.mim-dg__quick-input');
        if (input) input.value = v;
        self.#api?.setQuickFilter(v);
      },
      /** Legacy: (field, op, value). Nueva: (colId, filter | null); se detecta por el tipo. */
      setFilter: (colIdOrField: string, opOrFilter: string | ColumnFilter | null | undefined, valueMaybe?: string): void => {
        if (!self.#api) return;
        const colId = colIdOrField;
        if (opOrFilter === null || opOrFilter === undefined || typeof opOrFilter === 'object') {
          self.#api.setFilter(colId, (opOrFilter as ColumnFilter | null) ?? null);
          return;
        }
        const normOp = LEGACY_OP_MAP[opOrFilter] || opOrFilter;
        if (valueMaybe === undefined || valueMaybe === null || valueMaybe === '') {
          self.#api.setFilter(colId, null);
        } else {
          self.#api.setFilter(colId, { type: 'text', op: normOp as TextFilterOp, value: String(valueMaybe) });
        }
      },
      setFilterModel: (model: Record<string, ColumnFilter | null>): void => {
        if (!self.#api) return;
        for (const [colId, f] of Object.entries(model || {})) self.#api.setFilter(colId, f);
      },
      clearFilter: (field: string): void => self.#api?.setFilter(field, null),
      setSortModel: (model: { colId: string; dir: SortDirName }[]): void => self.#api?.setSortModel(model),
      toggleSort: (colId: string, additive?: boolean): void => self.#api?.toggleSort(colId, additive),
      pinColumn: (colId: string, side: PinSideName | null): void => self.#api?.pinColumn(colId, side),
      hideColumn: (colId: string, hide = true): void => self.#api?.hideColumn(colId, hide),
      openColumnsPanel: (): void => self.#toggleSidePanel('columns'),
      closeSidePanel: (): void => { (self.api as unknown as Record<string, () => void>)['closeToolPanel']?.(); },
      resizeColumn: (colId: string, width: number): void => self.#api?.resizeColumn(colId, width),
      autosizeColumn: (colId: string): void => self.#nucleo.apiAg.autoSizeColumns([colId]),
      reorderColumn: (colId: string, toIndex: number): void => self.#api?.reorderColumn(colId, toIndex),
      setRowGroupCols: (colIds: string[]): void => self.#api?.setRowGroupCols(colIds),
      addRowGroupCol: (colId: string): void => self.#api?.addRowGroupCol(colId),
      removeRowGroupCol: (colId: string): void => self.#api?.removeRowGroupCol(colId),
      toggleGroup: (groupId: string): void => self.#api?.toggleGroup(groupId),
      expandAllGroups: (): void => self.#api?.expandAllGroups(),
      collapseAllGroups: (): void => self.#api?.collapseAllGroups(),
      getSelectedRows: (): RowData[] => {
        if (!self.#api) return [];
        const sel = self.#api.getState().selection;
        return self.#api.getAllRows().filter((n) => sel.has(n.id)).map((n) => n.data);
      },
      selectAll: (): void => {
        if (!self.#api) return;
        if (self.#currentSelectionMode !== SelectionMode.MULTIPLE) return;
        self.#api.setSelection(selectAllCore(self.#api.getDisplayedRows()));
      },
      clearSelection: (): void => self.#api?.setSelection(clearSelectionCore()),
      setSelection: (ids: Iterable<string>): void => self.#api?.setSelection(new Set(ids)),
      setDensity: (d: string): void => {
        if (Object.values(Density).includes(d as never)) self.setAttribute('density', d);
      },
      exportCSV: (filename = 'grid.csv', opts: { separator?: string; onlySelected?: boolean } = {}): void => {
        if (!self.#api) return;
        const state = self.#api.getState();
        const sep = opts.separator || ',';
        const onlySelected = opts.onlySelected ?? state.selection.size > 0;
        const csv = rowsToCsv(state.columns, state.displayedRows, { separator: sep, onlySelected, selection: state.selection });
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a') as HTMLAnchorElement;
        a.href = url; a.download = filename;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
      },
      exportDataAsCsv: (p: { fileName?: string; columnSeparator?: string; onlySelected?: boolean } = {}): void => {
        (self.api as unknown as { exportCSV: (f?: string, o?: unknown) => void }).exportCSV(p.fileName, { separator: p.columnSeparator, onlySelected: p.onlySelected });
      },
      serializeState: (): string | null => self.#api?.serializeState() ?? null,
      loadState: (json: string): void => {
        if (!self.#api) return;
        self.#api.loadState(json);
        emit(self, 'iswc-state-loaded', self.#api.getState());
      },
      refresh: (): void => {
        if (!self.#api) return;
        self.#api.setRows([...self.#rawRows]);
      },
      resetColumnState: (): void => {
        if (!self.#api) return;
        self.#api.setColumnDefs(self.#defsMotor());
      },
      resetPersistedState: (): void => {
        removeComponentPrefs('iswc-ag-grid', self.#storageKey || self.#defaultStorageKey());
        if (!self.#api) return;
        self.#api.setColumnDefs(self.#defsMotor());
        self.#api.setSortModel([]);
        for (const colId of Object.keys(self.#api.getState().filterModel)) self.#api.setFilter(colId, null);
        self.#render();
        emit(self, 'iswc-state-reset', { key: self.#storageKey || self.#defaultStorageKey() });
      },
    };
  }

  /* ── Attribute setters/getters (boolean) ──────────────────────────────── */

  get density(): DensityName { return this.#density; }
  set density(v: string) {
    if (Object.values(Density).includes(v as never)) this.setAttribute('density', v);
    else this.removeAttribute('density');
  }

  get pagination(): boolean { return this.#isPaginated; }
  set pagination(v: boolean) { this.setBooleanAttr('pagination', v); }

  get selectable(): boolean { return this.hasAttribute('selectable'); }
  set selectable(v: boolean) { this.setBooleanAttr('selectable', v); }

  get toolbar(): boolean { return this.#showToolbar; }
  set toolbar(v: boolean) { this.setBooleanAttr('toolbar', v); }

  get rememberState(): boolean { return this.#rememberState; }
  set rememberState(v: boolean) { this.setBooleanAttr('remember-state', v); }
}

define(IswcAgGrid, 'IswcAgGrid');
