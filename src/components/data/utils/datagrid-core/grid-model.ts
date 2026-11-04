/**
 * datagrid-core/grid-model — Store observable del DataGrid.
 *
 * Mantiene el estado interno y corre el pipeline filter→sort→group→paginate.
 * La capa de render (<iswc-ag-grid>) se suscribe con subscribe(listener) y
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
import { aggregateGroup, buildDisplayRows, collectGroupIds } from './pipeline-grouping.js';
import { Density, SelectionMode, DEFAULT_PAGE_SIZE } from './types.js';
import type { ColumnDef, ColumnFilter, ColumnState, DensityName, DisplayRow, FilterModel, GridApi, GridListener, GridOptions, GridState, PinSideName, RowData, RowNode, RowTransaction, SortModel, TransactionResult, TransformadorModelo } from "@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js";
import type { EvaluadoresFiltro, FiltroExterno } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';


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
  type EstadoInterno = { rawRows: RowData[]; nodes: RowNode[]; columns: ColumnState[]; sortModel: SortModel; filterModel: FilterModel; quickFilter: string; selection: Set<string>; density: DensityName; pagination: boolean; page: number; pageSize: number; rowGroupCols: string[]; expandedGroups: Set<string>; getRowId: (row: RowData, index: number) => string; };

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

  /**
   * Pipeline memoizado: cada etapa se repite solo si quedo sucia. Asi la
   * seleccion, la paginacion o un resize no vuelven a filtrar 100.000 filas.
   */
  const sucio = { filtrar: true, ordenar: true, agrupar: true };
  let filtradas: RowNode[] = [];
  let ordenadas: RowNode[] = [];
  let display: DisplayRow[] = [];
  let transformadores: TransformadorModelo[] = [];
  let evaluadores: EvaluadoresFiltro = new Map();
  let externo: FiltroExterno | null = null;
  let porId = new Map<string, RowNode>();
  let secuencia = 0;

  function ensuciar(desde: 'filtrar' | 'ordenar' | 'agrupar') {
    if (desde === 'filtrar') sucio.filtrar = true;
    if (desde !== 'agrupar') sucio.ordenar = true;
    sucio.agrupar = true;
  }

  function rebuildNodes() {
    s.nodes = s.rawRows.map((data, index) => ({ id: s.getRowId(data, index), index, data }));
    porId = new Map(s.nodes.map((n) => [n.id, n]));
    secuencia = s.nodes.length;
    ensuciar('filtrar');
  }

  function colById() {
    return new Map(s.columns.map((c) => [c.colId, c]));
  }

  function transformar<T>(etapa: string, filas: T[]): T[] {
    let salida: unknown[] = filas;
    for (const t of transformadores) if (t.etapa === etapa) salida = t.aplicar(salida);
    return salida as T[];
  }

  function correrPipeline() {
    const byId = colById();
    if (sucio.filtrar) {
      filtradas = transformar('filtrar', filterRows(s.nodes, s.filterModel, s.quickFilter, s.columns, byId, evaluadores, externo));
      sucio.filtrar = false;
    }
    if (sucio.ordenar) {
      ordenadas = transformar('ordenar', sortRows(filtradas, s.sortModel, byId));
      sucio.ordenar = false;
    }
    if (sucio.agrupar) {
      const grouped = s.rowGroupCols.filter((c) => byId.has(c));
      display = transformar('aplanar', transformar('agrupar', buildDisplayRows(ordenadas, transformadores.some((t) => t.etapa === 'aplanar') ? [] : grouped, byId, s.expandedGroups)));
      sucio.agrupar = false;
    }
    return byId;
  }

  function compute(): GridState {
    const byId = correrPipeline();
    const sorted = ordenadas;
    const totalRows = sorted.length;
    const grouped = s.rowGroupCols.filter((c) => byId.has(c));
    const displayRows = display;

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
      correrPipeline();
      s.expandedGroups = new Set(collectGroupIds(ordenadas, s.rowGroupCols, colById()));
      ensuciar('agrupar');
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
      ensuciar('filtrar');
      notify();
    },
    setSortModel(model: SortModel) {
      s.sortModel = model;
      ensuciar('ordenar');
      notify('sort');
    },
    toggleSort(colId: string, additive = false) {
      s.sortModel = cycleSort(s.sortModel, colId, additive);
      ensuciar('ordenar');
      notify('sort');
    },
    setFilter(colId: string, filter: ColumnFilter | null) {
      const next = { ...s.filterModel };
      if (filter == null) delete next[colId];
      else next[colId] = filter;
      s.filterModel = next;
      s.page = 0;
      ensuciar('filtrar');
      notify('filter');
    },
    setQuickFilter(text: string) {
      s.quickFilter = text ?? '';
      s.page = 0;
      ensuciar('filtrar');
      notify('filter');
    },
    setSelection(ids: Iterable<string>) {
      // Se copia en vez de guardar la referencia: el estado interno es dueno
      // de su Set y quien llama puede seguir mutando el suyo.
      s.selection = new Set(ids);
      notify('selection');
    },
    setDensity(d: DensityName) {
      s.density = d;
      notify('columns');
    },
    setPage(page: number) {
      s.page = Math.max(0, page);
      notify('page');
    },
    setPageSize(size: number) {
      s.pageSize = Math.max(1, size);
      s.page = 0;
      notify('page');
    },
    resizeColumn(colId: string, width: number) {
      s.columns = setColumnWidth(s.columns, colId, width);
      notify('columns');
    },
    pinColumn(colId: string, side: PinSideName | null) {
      s.columns = setColumnPinned(s.columns, colId, side as 'left' | 'right' | null);
      notify('columns');
    },
    hideColumn(colId: string, hide: boolean) {
      s.columns = setColumnHidden(s.columns, colId, hide);
      if (s.quickFilter) ensuciar('filtrar');
      notify('columns');
    },
    reorderColumn(colId: string, toIndex: number) {
      s.columns = moveColumn(s.columns, colId, toIndex);
      notify('columns');
    },
    autosizeColumn(colId: string) {
      s.columns = autosizeColumn(s.columns, colId, s.nodes);
      notify('columns');
    },
    setRowGroupCols(colIds: string[]) {
      s.rowGroupCols = [...colIds];
      s.page = 0;
      ensuciar('agrupar');
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
      ensuciar('agrupar');
      reseedExpansion();
      notify();
    },
    removeRowGroupCol(colId: string) {
      s.rowGroupCols = s.rowGroupCols.filter((c) => c !== colId);
      s.page = 0;
      ensuciar('agrupar');
      reseedExpansion();
      notify();
    },
    toggleGroup(groupId: string) {
      const next = new Set(s.expandedGroups);
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
      s.expandedGroups = next;
      ensuciar('agrupar');
      notify('expand');
    },
    expandAllGroups() {
      correrPipeline();
      s.expandedGroups = new Set(collectGroupIds(ordenadas, s.rowGroupCols, colById()));
      ensuciar('agrupar');
      notify('expand');
    },
    collapseAllGroups() {
      s.expandedGroups = new Set();
      ensuciar('agrupar');
      notify('expand');
    },
    getColumns() { return s.columns; },
    getDisplayedRows() { return api.getState().displayedRows; },
    getAllRows() { return s.nodes; },
    getRowNode(id: string) { return porId.get(id) ?? null; },
    /** Actualiza, agrega y quita por id. Sin orden, filtro ni grupos no repite el pipeline. */
    applyTransaction(tx: RowTransaction): TransactionResult {
      const res: TransactionResult = { add: [], update: [], remove: [] };
      for (const data of tx.update ?? []) {
        const node = porId.get(s.getRowId(data, 0));
        if (!node) continue;
        node.data = data;
        s.rawRows[node.index] = data;
        res.update.push(node);
      }
      for (const { node, data } of tx.nodos ?? []) {
        node.data = data;
        s.rawRows[node.index] = data;
        res.update.push(node);
      }
      for (const data of tx.remove ?? []) {
        const node = porId.get(s.getRowId(data, 0));
        if (!node) continue;
        porId.delete(node.id);
        s.selection.delete(node.id);
        res.remove.push(node);
      }
      if (res.remove.length) {
        const fuera = new Set(res.remove);
        s.nodes = s.nodes.filter((n) => !fuera.has(n));
      }
      const nuevos = (tx.add ?? []).map((data) => {
        const node = { id: s.getRowId(data, secuencia), index: secuencia, data };
        secuencia += 1;
        porId.set(node.id, node);
        return node;
      });
      res.add = nuevos;
      if (nuevos.length) {
        const donde = tx.addIndex == null ? s.nodes.length : Math.max(0, Math.min(tx.addIndex, s.nodes.length));
        s.nodes = [...s.nodes.slice(0, donde), ...nuevos, ...s.nodes.slice(donde)];
      }
      if (res.remove.length || res.add.length) {
        s.nodes.forEach((n, i) => { n.index = i; });
        s.rawRows = s.nodes.map((n) => n.data);
      }
      const estructura = res.add.length > 0 || res.remove.length > 0;
      const dinamico = Object.keys(s.filterModel).length > 0 || s.quickFilter !== '' || s.sortModel.length > 0 || s.rowGroupCols.length > 0 || transformadores.some((t) => t.activo?.() !== false) || externo != null;
      if (estructura || (res.update.length && dinamico)) ensuciar('filtrar');
      notify('transaction');
      return res;
    },
    /** Reubica un nodo en el orden base (arrastre de filas gestionado). */
    moveRow(id: string, toIndex: number) {
      const from = s.nodes.findIndex((n) => n.id === id);
      if (from < 0) return;
      const [node] = s.nodes.splice(from, 1);
      if (!node) return;
      s.nodes.splice(Math.max(0, Math.min(toIndex, s.nodes.length)), 0, node);
      s.nodes.forEach((n, i) => { n.index = i; });
      s.rawRows = s.nodes.map((n) => n.data);
      ensuciar('filtrar');
      notify('sort');
    },
    setTransforms(lista: TransformadorModelo[]) {
      transformadores = lista;
      ensuciar('filtrar');
      notify();
    },
    setFilterEvaluators(mapa: EvaluadoresFiltro) {
      evaluadores = mapa;
      ensuciar('filtrar');
    },
    setExternalFilter(fn: FiltroExterno | null) {
      externo = fn;
      ensuciar('filtrar');
      notify('filter');
    },
    invalidate(desde: 'filtrar' | 'ordenar' | 'agrupar' = 'filtrar') {
      ensuciar(desde);
      notify();
    },
    setPagination(activa: boolean) {
      s.pagination = activa;
      notify('page');
    },
    aggregate(nodos: RowNode[]) { return aggregateGroup(nodos, colById()); },
    serializeState() {
      return JSON.stringify({
        columns: s.columns.map(({ def: _def, ...resto }) => resto),
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
        if (Array.isArray(parsed.columns)) {
          // `def` lleva funciones que JSON no conserva: se mezcla sobre la columna viva.
          const vivas = colById();
          const orden: ColumnState[] = [];
          for (const c of parsed.columns) {
            const viva = vivas.get(c.colId);
            if (!viva) continue;
            orden.push({ ...viva, width: c.width ?? viva.width, flex: c.flex, hide: c.hide === true, pinned: c.pinned ?? null });
            vivas.delete(c.colId);
          }
          s.columns = [...orden, ...vivas.values()];
        }
        if (Array.isArray(parsed.sortModel)) s.sortModel = parsed.sortModel;
        if (parsed.filterModel && typeof parsed.filterModel === 'object') s.filterModel = parsed.filterModel;
        if (typeof parsed.quickFilter === 'string') s.quickFilter = parsed.quickFilter;
        if (typeof parsed.page === 'number') s.page = parsed.page;
        if (typeof parsed.pageSize === 'number') s.pageSize = parsed.pageSize;
        if (Array.isArray(parsed.rowGroupCols)) s.rowGroupCols = parsed.rowGroupCols;
        if (Array.isArray(parsed.expandedGroups)) s.expandedGroups = new Set(parsed.expandedGroups);
        ensuciar('filtrar');
        notify();
      } catch { /* ignore malformed state */ }
    },
  };

  cache = compute();
  return api;
}
