/**
 * nucleo/api-ag — Grid API con los nombres de AG Grid.
 *
 * Cubre columnas, nodos, scroll, paginacion, opciones, estado y transacciones.
 * Los plugins agregan lo suyo con `grid.exponer`; lo expuesto gana sobre esto.
 */

import type { Colref, Tx } from './api-ag.schemas.js';
import { cellText } from '../../datagrid-core/value-formatter.js';
import type { Motor } from './motor.schemas.js';
import type { ColumnState, RowData, RowNode } from '../../../schemas/datagrid-types.schemas.js';
import type { GridHost, OpcionesGrid } from '../contrato.schemas.js';

const idDe = (c: Colref): string => (typeof c === 'string' ? c : c.colId);

/** Convierte un nodo interno al IRowNode de AG con lo mas usado. */
function nodoAg(h: GridHost, node: RowNode, rowIndex: number | null = null): Record<string, unknown> {
  return {
    id: node.id, data: node.data, rowIndex, sourceRowIndex: node.index, displayed: rowIndex != null,
    isSelected: () => h.estado()?.selection.has(node.id) ?? false,
    setSelected: (v: boolean) => {
      const sel = new Set(h.estado()?.selection);
      if (v) sel.add(node.id);
      else sel.delete(node.id);
      h.modelo()?.setSelection(sel);
    },
    setData: (data: RowData) => { h.modelo()?.applyTransaction({ update: [data] }); },
    setDataValue: (colId: string, valor: unknown) => h.fijarValor(node, colId, valor, 'api'),
  };
}

export function crearApiAg(h: GridHost, motor: Motor, alCambiarAlto: () => void) {
  let cola: Tx[] = [];
  let reloj = 0;

  const m = () => h.modelo();
  const columnas = (): ColumnState[] => m()?.getColumns() ?? [];

  /** Anchos reales: mide con canvas en la fuente del cuerpo, sobre una muestra. */
  function medirColumna(col: ColumnState, lienzo: CanvasRenderingContext2D): number {
    let max = lienzo.measureText(col.headerName).width + 56 * motor.pxU();
    const filas = h.estado()?.displayedRows ?? [];
    const paso = Math.max(1, Math.floor(filas.length / 500));
    for (let i = 0; i < filas.length; i += paso) max = Math.max(max, lienzo.measureText(cellText(col, filas[i]!)).width + 28 * motor.pxU());
    return Math.ceil(max / motor.pxU());
  }

  function autoSizeColumns(ids: Colref[]): void {
    const lienzo = document.createElement('canvas').getContext('2d');
    if (!lienzo) return;
    lienzo.font = getComputedStyle(h.el).font;
    for (const id of ids) {
      const col = h.columna(idDe(id));
      if (col && h.defDe(col)['suppressAutoSize'] !== true) m()?.resizeColumn(col.colId, medirColumna(col, lienzo));
    }
  }

  function sizeColumnsToFit(): void {
    const visibles = columnas().filter((c) => !c.hide);
    const total = visibles.reduce((s, c) => s + c.width, 0);
    const disponible = motor.diseno() ? h.el.clientWidth / motor.pxU() : total;
    if (!total) return;
    for (const c of visibles) m()?.resizeColumn(c.colId, c.width * disponible / total);
  }

  function getColumnState(): Record<string, unknown>[] {
    const estado = h.estado();
    return columnas().map((c, i) => {
      const sortIndex = estado?.sortModel.findIndex((s) => s.colId === c.colId) ?? -1;
      return { colId: c.colId, width: c.width, hide: c.hide, pinned: c.pinned, flex: c.flex ?? null, order: i, sort: sortIndex >= 0 ? estado?.sortModel[sortIndex]?.dir : null, sortIndex: sortIndex >= 0 ? sortIndex : null, rowGroup: estado?.rowGroupCols.includes(c.colId) ?? false, aggFunc: c.aggFunc };
    });
  }

  function applyColumnState(p: { state?: Record<string, unknown>[]; applyOrder?: boolean }): boolean {
    const modelo = m();
    if (!modelo) return false;
    const orden: { colId: string; dir: 'asc' | 'desc'; i: number }[] = [];
    for (const [i, s] of (p.state ?? []).entries()) {
      const colId = String(s['colId']);
      if (typeof s['width'] === 'number') modelo.resizeColumn(colId, s['width']);
      if (s['hide'] !== undefined) modelo.hideColumn(colId, s['hide'] === true);
      if (s['pinned'] !== undefined) modelo.pinColumn(colId, (s['pinned'] === true ? 'left' : s['pinned']) as 'left' | 'right' | null);
      if (s['sort'] === 'asc' || s['sort'] === 'desc') orden.push({ colId, dir: s['sort'], i: Number(s['sortIndex'] ?? i) });
      if (p.applyOrder) modelo.reorderColumn(colId, i);
    }
    if (orden.length) modelo.setSortModel(orden.sort((a, b) => a.i - b.i).map(({ colId, dir }) => ({ colId, dir })));
    return true;
  }

  function lista(): RowNode[] {
    return h.estado()?.displayedRows ?? [];
  }

  function aplicar(tx: Tx): unknown {
    const r = m()?.applyTransaction(tx);
    h.emitir('rowDataUpdated', { transaction: r });
    return r;
  }

  function flushAsyncTransactions(): void {
    clearTimeout(reloj);
    reloj = 0;
    if (!cola.length) return;
    const lote = cola;
    cola = [];
    const res = lote.map((tx) => m()?.applyTransaction(tx));
    h.emitir('rowDataUpdated', { results: res });
    h.emitir('asyncTransactionsFlushed', { results: res });
  }

  function paginar(p: number): void {
    m()?.setPage(p);
    h.emitir('paginationChanged', { newPage: true });
  }

  const totalPaginas = (): number => {
    const e = h.estado();
    return e ? Math.max(1, Math.ceil(e.displayRows.length / e.pageSize)) : 1;
  };

  return {
    /* opciones */
    getGridOption: (n: string) => h.opcion(n),
    setGridOption: (n: string, v: unknown) => h.fijarOpcion(n, v),
    updateGridOptions: (o: OpcionesGrid) => { for (const [k, v] of Object.entries(o)) h.fijarOpcion(k, v); },
    /* eventos */
    addEventListener: (n: string, fn: (d: Record<string, unknown>) => void) => { (fn as unknown as { __quitar?: () => void }).__quitar = h.on(n, fn); },
    removeEventListener: (_n: string, fn: unknown) => { (fn as { __quitar?: () => void }).__quitar?.(); },
    /* columnas */
    getColumns: columnas,
    getAllGridColumns: columnas,
    getColumn: (id: Colref) => h.columna(idDe(id)),
    getColumnDefs: () => columnas().map((c) => h.defDe(c)),
    getAllDisplayedColumns: () => motor.columnasOrdenadas().map((c) => c.col),
    getDisplayedCenterColumns: () => motor.diseno().centro.map((c) => c.col),
    getDisplayedLeftColumns: () => motor.diseno().izq.map((c) => c.col),
    getDisplayedRightColumns: () => motor.diseno().der.map((c) => c.col),
    getDisplayNameForColumn: (c: Colref) => h.columna(idDe(c))?.headerName ?? '',
    setColumnsVisible: (ids: Colref[], visible: boolean) => { for (const c of ids) m()?.hideColumn(idDe(c), !visible); h.emitir('columnVisible', { columns: ids, visible }); },
    setColumnsPinned: (ids: Colref[], lado: 'left' | 'right' | null) => { for (const c of ids) m()?.pinColumn(idDe(c), lado); h.emitir('columnPinned', { columns: ids, pinned: lado }); },
    setColumnWidths: (l: { key: Colref; newWidth: number }[]) => { for (const c of l) m()?.resizeColumn(idDe(c.key), c.newWidth); },
    moveColumns: (ids: Colref[], destino: number) => { ids.forEach((c, i) => m()?.reorderColumn(idDe(c), destino + i)); h.emitir('columnMoved', { columns: ids, toIndex: destino }); },
    moveColumnByIndex: (de: number, a: number) => { const c = columnas()[de]; if (c) m()?.reorderColumn(c.colId, a); },
    isPinning: () => columnas().some((c) => c.pinned),
    isPinningLeft: () => columnas().some((c) => c.pinned === 'left'),
    isPinningRight: () => columnas().some((c) => c.pinned === 'right'),
    autoSizeColumns,
    autoSizeAllColumns: () => autoSizeColumns(columnas().filter((c) => !c.hide).map((c) => c.colId)),
    sizeColumnsToFit,
    getColumnState,
    applyColumnState,
    /* nodos */
    getRowNode: (id: string) => { const n = h.nodo(id); return n ? nodoAg(h, n) : undefined; },
    forEachNode: (fn: (n: unknown, i: number) => void) => { (m()?.getAllRows() ?? []).forEach((n, i) => fn(nodoAg(h, n), i)); },
    forEachLeafNode: (fn: (n: unknown, i: number) => void) => { (m()?.getAllRows() ?? []).forEach((n, i) => fn(nodoAg(h, n), i)); },
    forEachNodeAfterFilterAndSort: (fn: (n: unknown, i: number) => void) => { lista().forEach((n, i) => fn(nodoAg(h, n, i), i)); },
    getDisplayedRowAtIndex: (i: number) => { const f = h.filaEn(i); return f?.kind === 'leaf' ? nodoAg(h, (f as { node: RowNode }).node, i) : f ?? undefined; },
    getDisplayedRowCount: () => h.totalFilas(),
    getFirstDisplayedRowIndex: () => motor.ventana().inicio,
    getLastDisplayedRowIndex: () => motor.ventana().fin,
    getRenderedNodes: () => motor.nodosPintados().map((id) => h.nodo(id)).filter((n): n is RowNode => n != null).map((n) => nodoAg(h, n)),
    isRowDataEmpty: () => (m()?.getAllRows().length ?? 0) === 0,
    getCellValue: (p: { rowNode: { id: string }; colKey: Colref; useFormatter?: boolean }) => {
      const col = h.columna(idDe(p.colKey));
      const n = h.nodo(p.rowNode.id);
      if (!col || !n) return undefined;
      return p.useFormatter ? h.textoCelda(col, n) : h.valor(col, n);
    },
    /* seleccion */
    getSelectedNodes: () => [...(h.estado()?.selection ?? [])].map((id) => h.nodo(id)).filter((n): n is RowNode => n != null).map((n) => nodoAg(h, n)),
    deselectAll: () => m()?.setSelection(new Set()),
    setNodesSelected: (p: { nodes: { id: string }[]; newValue: boolean }) => {
      const sel = new Set(h.estado()?.selection);
      for (const n of p.nodes) {
        if (p.newValue) sel.add(n.id);
        else sel.delete(n.id);
      }
      m()?.setSelection(sel);
    },
    /* scroll */
    ensureIndexVisible: (i: number) => { motor.asegurarFila(i); motor.pedir(); },
    ensureNodeVisible: (n: { id: string }) => { const i = lista().findIndex((x) => x.id === n.id); if (i >= 0) motor.asegurarFila(i); motor.pedir(); },
    ensureColumnVisible: (c: Colref) => { motor.asegurarColumna(idDe(c)); motor.pedir(); },
    /* render */
    refreshCells: (p: { rowNodes?: { id: string }[] } = {}) => motor.refrescar(p.rowNodes?.map((n) => n.id)),
    redrawRows: (p: { rowNodes?: { id: string }[] } = {}) => motor.refrescar(p.rowNodes?.map((n) => n.id)),
    refreshHeader: () => h.pedirRender(),
    resetRowHeights: () => { motor.resetAlturas(); alCambiarAlto(); },
    onRowHeightChanged: () => motor.refrescar(),
    getSizesForCurrentTheme: () => ({ rowHeight: motor.altoBase() / motor.pxU(), headerHeight: 44 }),
    /* transacciones */
    applyTransaction: aplicar,
    applyTransactionAsync: (tx: Tx, cb?: (r: unknown) => void) => {
      cola.push(tx);
      void cb;
      if (!reloj) reloj = window.setTimeout(flushAsyncTransactions, h.opcion<number>('asyncTransactionWaitMillis', 50));
    },
    flushAsyncTransactions,
    refreshClientSideRowModel: () => m()?.invalidate('filtrar'),
    /* paginacion */
    paginationGetCurrentPage: () => h.estado()?.page ?? 0,
    paginationGetPageSize: () => h.estado()?.pageSize ?? 0,
    paginationGetTotalPages: totalPaginas,
    paginationGetRowCount: () => h.estado()?.displayRows.length ?? 0,
    paginationGoToPage: paginar,
    paginationGoToNextPage: () => paginar((h.estado()?.page ?? 0) + 1),
    paginationGoToPreviousPage: () => paginar(Math.max(0, (h.estado()?.page ?? 0) - 1)),
    paginationGoToFirstPage: () => paginar(0),
    paginationGoToLastPage: () => paginar(totalPaginas() - 1),
    paginationIsLastPageFound: () => true,
    /* foco */
    getFocusedCell: () => motor.foco(),
    setFocusedCell: (indice: number, colKey: Colref) => h.enfocar({ indice, colId: idDe(colKey) }),
    clearFocusedCell: () => h.enfocar(null),
    /* grupos */
    getRowGroupColumns: () => (h.estado()?.rowGroupCols ?? []).map((c) => h.columna(c)),
    setRowGroupColumns: (ids: Colref[]) => { m()?.setRowGroupCols(ids.map(idDe)); h.emitir('columnRowGroupChanged', {}); },
    addRowGroupColumns: (ids: Colref[]) => { for (const c of ids) m()?.addRowGroupCol(idDe(c)); h.emitir('columnRowGroupChanged', {}); },
    removeRowGroupColumns: (ids: Colref[]) => { for (const c of ids) m()?.removeRowGroupCol(idDe(c)); h.emitir('columnRowGroupChanged', {}); },
    expandAll: () => m()?.expandAllGroups(),
    collapseAll: () => m()?.collapseAllGroups(),
    onSortChanged: () => m()?.invalidate('ordenar'),
    /* misc */
    getGridElement: () => h.el,
    getGridId: () => h.el.id,
    isDestroyed: () => !h.el.isConnected,
    destroy: () => h.el.remove(),
  };
}
