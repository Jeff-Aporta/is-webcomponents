/**
 * datagrid-core/grid-model — Store observable del DataGrid.
 *
 * Mantiene el estado interno y corre el pipeline filter→sort→group→paginate.
 * La capa de render (<is-ag-grid>) se suscribe con subscribe(listener) y
 * re-renderiza al recibir el nuevo GridState.
 *
 * Patrón: useSyncExternalStore-style. La cache del estado computado se
 * invalida en cada notify().
 *
 * API pública (GridApi):
 *   getState()                  → GridState actual.
 *   subscribe(fn)               → unsubscribe().
 *   setRows / setColumnDefs
 *   setSortModel / toggleSort
 *   setFilter / setQuickFilter
 *   setSelection / setDensity
 *   setPage / setPageSize
 *   resizeColumn / pinColumn / hideColumn / reorderColumn / autosizeColumn
 *   setRowGroupCols / addRowGroupCol / removeRowGroupCol
 *   toggleGroup / expandAllGroups / collapseAllGroups
 *   getColumns / getDisplayedRows / getAllRows
 *
 * Compatible con mimicus-react core/gridModel.ts (mismo contrato).
 */

import { resolveColumns, setColumnWidth, setColumnPinned, setColumnHidden, moveColumn, autosizeColumn } from './column-state.js';
import { filterRows } from './pipeline-filtering.js';
import { sortRows, cycleSort } from './pipeline-sorting.js';
import { buildDisplayRows, collectGroupIds } from './pipeline-grouping.js';
import { Density, SelectionMode, DEFAULT_PAGE_SIZE } from './types.js';
import type {
  ColumnDef, ColumnFilter, ColumnState, DensityName, FilterModel, GridApi, GridListener,
  GridOptions, GridState, PinSideName, RowData, RowNode, SortModel,
} from './types.js';


/**
 * @param {GridOptions} options
 * @returns {GridApi}
 */
export function createGridModel(options: GridOptions) {
  const getRowId = options.getRowId ?? ((_row, i) => `row-${i}`);

  /**
   * Estado mutable del motor. No sale de aqui: lo que se publica es el
   * snapshot que devuelve `compute()`, y por eso este tipo es interno.
   */
  interface EstadoInterno {
    rawRows: RowData[];
    nodes: RowNode[];
    columns: ColumnState[];
    sortModel: SortModel;
    filterModel: FilterModel;
    quickFilter: string;
    selection: Set<string>;
    density: DensityName;
    pagination: boolean;
    page: number;
    pageSize: number;
    rowGroupCols: string[];
    expandedGroups: Set<string>;
    getRowId: (row: RowData, index: number) => string;
  }

  const s: EstadoInterno = {
    rawRows: options.rows ?? [],
    nodes: [],
    columns: resolveColumns(options.columns ?? [], options.defaultColWidth),
    sortModel: [],
    filterModel: {},
    quickFilter: options.quickFilter ?? '',
    selection: new Set(),
    density: options.density ?? Density.NORMAL,
    pagination: options.pagination ?? false,
    page: 0,
    pageSize: options.pageSize ?? DEFAULT_PAGE_SIZE,
    rowGroupCols: options.rowGroupCols ?? [],
    expandedGroups: new Set(),
    getRowId,
  };

  const groupDefaultExpanded = options.groupDefaultExpanded ?? 0;

  function rebuildNodes() {
    s.nodes = s.rawRows.map((data, index) => ({ id: s.getRowId(data, index), index, data }));
  }

  function colById() {
    return new Map(s.columns.map((c) => [c.colId, c]));
  }

  function compute() {
    const byId = colById();
    const filtered = filterRows(s.nodes, s.filterModel, s.quickFilter, s.columns, byId);
    const sorted = sortRows(filtered, s.sortModel, byId);
    const totalRows = sorted.length;
    const grouped = s.rowGroupCols.filter((c) => byId.has(c));
    const displayRows = buildDisplayRows(sorted, grouped, byId, s.expandedGroups);

    let page = s.page;
    let pageRows = sorted;
    let pageDisplayRows = displayRows;
    if (s.pagination) {
      const pages = Math.max(1, Math.ceil(displayRows.length / s.pageSize));
      page = Math.min(s.page, pages - 1);
      pageDisplayRows = displayRows.slice(page * s.pageSize, page * s.pageSize + s.pageSize);
      pageRows = sorted.slice(page * s.pageSize, page * s.pageSize + s.pageSize);
    }
    return {
      columns: s.columns,
      sortModel: s.sortModel,
      filterModel: s.filterModel,
      quickFilter: s.quickFilter,
      selection: s.selection,
      density: s.density,
      pagination: s.pagination,
      page,
      pageSize: s.pageSize,
      displayedRows: sorted,
      pageRows,
      rowGroupCols: grouped,
      expandedGroups: s.expandedGroups,
      displayRows,
      pageDisplayRows,
      totalRows,
    };
  }

  function reseedExpansion() {
    if (groupDefaultExpanded === -1 && s.rowGroupCols.length) {
      const byId = colById();
      const sorted = sortRows(
        filterRows(s.nodes, s.filterModel, s.quickFilter, s.columns, byId),
        s.sortModel,
        byId,
      );
      s.expandedGroups = new Set(collectGroupIds(sorted, s.rowGroupCols, byId));
    }
  }

  rebuildNodes();
  reseedExpansion();

  const listeners = new Set<GridListener>();
  let cache: GridState | null = null;

  function notify(reason = 'all') {
    cache = compute();
    for (const fn of listeners) {
      try { fn(cache, reason); } catch { /* ignore listener error */ }
    }
  }

  const api: GridApi = {
    getState() { return cache ?? (cache = compute()); },
    subscribe(fn: GridListener) {
      listeners.add(fn);
      return () => { listeners.delete(fn); };
    },
    setRows(rows: RowData[] | null | undefined) {
      s.rawRows = rows ?? [];
      rebuildNodes();
      notify();
    },
    setColumnDefs(defs: ColumnDef[] | null | undefined) {
      s.columns = resolveColumns(defs ?? [], options.defaultColWidth);
      notify();
    },
    setSortModel(model: SortModel) {
      s.sortModel = model;
      notify();
    },
    toggleSort(colId: string, additive = false) {
      s.sortModel = cycleSort(s.sortModel, colId, additive);
      notify();
    },
    setFilter(colId: string, filter: ColumnFilter | null) {
      const next = { ...s.filterModel };
      if (filter == null) delete next[colId];
      else next[colId] = filter;
      s.filterModel = next;
      s.page = 0;
      notify();
    },
    setQuickFilter(text: string) {
      s.quickFilter = text ?? '';
      s.page = 0;
      notify();
    },
    setSelection(ids: Iterable<string>) {
      // Se copia en vez de guardar la referencia: el estado interno es dueno
      // de su Set y quien llama puede seguir mutando el suyo.
      s.selection = new Set(ids);
      notify('selection');
    },
    setDensity(d: DensityName) {
      s.density = d;
      notify();
    },
    setPage(page: number) {
      s.page = Math.max(0, page);
      notify();
    },
    setPageSize(size: number) {
      s.pageSize = Math.max(1, size);
      s.page = 0;
      notify();
    },
    resizeColumn(colId: string, width: number) {
      s.columns = setColumnWidth(s.columns, colId, width);
      notify();
    },
    pinColumn(colId: string, side: PinSideName | null) {
      s.columns = setColumnPinned(s.columns, colId, side);
      notify();
    },
    hideColumn(colId: string, hide: boolean) {
      s.columns = setColumnHidden(s.columns, colId, hide);
      notify();
    },
    reorderColumn(colId: string, toIndex: number) {
      s.columns = moveColumn(s.columns, colId, toIndex);
      notify();
    },
    autosizeColumn(colId: string) {
      s.columns = autosizeColumn(s.columns, colId, s.nodes);
      notify();
    },
    setRowGroupCols(colIds: string[]) {
      s.rowGroupCols = [...colIds];
      s.page = 0;
      reseedExpansion();
      notify();
    },
    addRowGroupCol(colId: string, index?: number) {
      if (s.rowGroupCols.includes(colId)) return;
      const next = s.rowGroupCols.slice();
      next.splice(
        index == null ? next.length : Math.max(0, Math.min(index, next.length)),
        0,
        colId,
      );
      s.rowGroupCols = next;
      s.page = 0;
      reseedExpansion();
      notify();
    },
    removeRowGroupCol(colId: string) {
      s.rowGroupCols = s.rowGroupCols.filter((c) => c !== colId);
      s.page = 0;
      reseedExpansion();
      notify();
    },
    toggleGroup(groupId: string) {
      const next = new Set(s.expandedGroups);
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
      s.expandedGroups = next;
      notify();
    },
    expandAllGroups() {
      const byId = colById();
      const sorted = sortRows(
        filterRows(s.nodes, s.filterModel, s.quickFilter, s.columns, byId),
        s.sortModel,
        byId,
      );
      s.expandedGroups = new Set(collectGroupIds(sorted, s.rowGroupCols, byId));
      notify();
    },
    collapseAllGroups() {
      s.expandedGroups = new Set();
      notify();
    },
    getColumns() { return s.columns; },
    getDisplayedRows() { return api.getState().displayedRows; },
    getAllRows() { return s.nodes; },
    serializeState() {
      return JSON.stringify({
        columns: s.columns,
        sortModel: s.sortModel,
        filterModel: s.filterModel,
        quickFilter: s.quickFilter,
        page: s.page,
        pageSize: s.pageSize,
        rowGroupCols: s.rowGroupCols,
        expandedGroups: [...s.expandedGroups],
      });
    },
    loadState(json: string) {
      try {
        const parsed = typeof json === 'string' ? JSON.parse(json) : json;
        if (Array.isArray(parsed.columns)) s.columns = parsed.columns;
        if (Array.isArray(parsed.sortModel)) s.sortModel = parsed.sortModel;
        if (parsed.filterModel && typeof parsed.filterModel === 'object') s.filterModel = parsed.filterModel;
        if (typeof parsed.quickFilter === 'string') s.quickFilter = parsed.quickFilter;
        if (typeof parsed.page === 'number') s.page = parsed.page;
        if (typeof parsed.pageSize === 'number') s.pageSize = parsed.pageSize;
        if (Array.isArray(parsed.rowGroupCols)) s.rowGroupCols = parsed.rowGroupCols;
        if (Array.isArray(parsed.expandedGroups)) s.expandedGroups = new Set(parsed.expandedGroups);
        notify();
      } catch { /* ignore malformed state */ }
    },
  };

  cache = compute();
  return api;
}
