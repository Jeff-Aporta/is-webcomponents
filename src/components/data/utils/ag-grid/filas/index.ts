/**
 * ag-grid/filas — Modelos de filas y datos de <iswc-ag-grid>.
 *
 * `instalar(grid)` registra pipeline, modelos externos, exportadores, panel,
 * menus y la API con nombres de AG Grid. Ver `controlador.ts` para el porque del
 * flujo; todo lo demas de esta carpeta es logica pura o escritura de formato.
 */
import { ControladorFilas } from './controlador.js';
import { datosCsv } from './exportar.js';
import { moverEn, crearPanelAgrupacion } from './panel-agrupacion.js';
import type { EstadoGrilla, ExitoServidor, FuncionAgg, ParamsExport, RefrescoServidor, RutaServidor, Transaccion, TransaccionServidor, ResultadoNodos } from './filas.schemas.js';
import type { ColumnDef } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { ColumnState } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { ContextoMenu, Desinstalar, GridHost, ItemMenu } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';

export const nombre = 'filas';

function idDe(c: string | ColumnState): string {
  return typeof c === 'string' ? c : c.colId;
}

function metodos(c: ControladorFilas): Record<string, (...a: never[]) => unknown> {
  const g = c.grid;
  const m = () => g.modelo();
  const conValores = (ids: Array<string | ColumnState>, fn: (mapa: Map<string, string | FuncionAgg>, id: string) => void): void => {
    const mapa = new Map(c.colsValor().map((id) => [id, g.columna(id)?.aggFunc as string | FuncionAgg]));
    for (const x of ids) fn(mapa, idDe(x));
    c.fijarValores([...mapa]);
  };
  const conExpansion = (id: string, abierto: boolean) => c.fijarAbierto(id, abierto);
  const api: Record<string, (...a: never[]) => unknown> = {
    /* agrupacion */
    moveRowGroupColumn: (desde: number, hasta: number) => {
      const lista = g.estado()?.rowGroupCols ?? [];
      const id = lista[desde];
      if (id === undefined) return;
      m()?.setRowGroupCols(moverEn(lista, id, hasta > desde ? hasta + 1 : hasta));
      g.emitir('columnRowGroupChanged', {});
    },
    expandAll: () => c.expandirTodo(true),
    collapseAll: () => c.expandirTodo(false),
    resetRowGroupExpansion: () => {
      c.expansion.reiniciar();
      g.recomputar('filas');
    },
    setRowNodeExpanded: (nodo: { id: string }, abierto: boolean) => {
      const n = g.nodo(nodo.id);
      if (n && c.detalle.activo() && c.detalle.esMaestro(n)) c.detalle.fijar(n, abierto);
      else conExpansion(nodo.id, abierto);
    },
    onGroupExpandedOrCollapsed: () => g.recomputar('filas'),
    /* agregacion */
    getValueColumns: () => c.colsValor().flatMap((id) => g.columna(id) ?? []),
    setValueColumns: (ids: Array<string | ColumnState>) => {
      const previas = new Map(c.colsValor().map((id) => [id, g.columna(id)?.aggFunc as string | FuncionAgg]));
      c.fijarValores(ids.map(idDe).map((id) => [id, previas.get(id) ?? c.funcionPorDefecto(id)]));
    },
    addValueColumns: (ids: Array<string | ColumnState>) => conValores(ids, (mapa, id) => mapa.set(id, mapa.get(id) ?? c.funcionPorDefecto(id))),
    removeValueColumns: (ids: Array<string | ColumnState>) => conValores(ids, (mapa, id) => mapa.delete(id)),
    setColumnAggFunc: (col: string | ColumnState, func: string | FuncionAgg | null) => {
      conValores([col], (mapa, id) => {
        if (func) mapa.set(id, func);
        else mapa.delete(id);
      });
    },
    addAggFuncs: (f: Record<string, FuncionAgg>) => c.agregarFunciones(f),
    clearAggFuncs: () => c.limpiarFunciones(),
    /* pivote */
    isPivotMode: () => c.modoPivote(),
    getPivotColumns: () => c.colsPivote().flatMap((id) => g.columna(id) ?? []),
    setPivotColumns: (ids: Array<string | ColumnState>) => c.fijarPivotes(ids.map(idDe)),
    addPivotColumns: (ids: Array<string | ColumnState>) => c.fijarPivotes([...new Set([...c.colsPivote(), ...ids.map(idDe)])]),
    removePivotColumns: (ids: Array<string | ColumnState>) => {
      const fuera = new Set(ids.map(idDe));
      c.fijarPivotes(c.colsPivote().filter((id) => !fuera.has(id)));
    },
    getPivotResultColumns: () => c.resultadoPivote()?.planas ?? null,
    getPivotResultColumn: (claves: string[], valor: string | ColumnState) => {
      const buscado = idDe(valor);
      return c.resultadoPivote()?.planas.find((d) => d.pivotValueColumn === buscado && d.pivotKeys.join('\u0001') === claves.join('\u0001')) ?? null;
    },
    setPivotResultColumns: (defs: ColumnDef[] | null) => c.aplicarColumnasResultado(defs),
    /* maestro-detalle */
    getDetailGridInfo: (id: string) => c.detalle.info(id),
    forEachDetailGridInfo: (fn: (i: unknown, n: number) => void) => c.detalle.cadaInfo(fn),
    addDetailGridInfo: (id: string, info: { api?: unknown }) => c.detalle.agregarInfo(id, info.api),
    removeDetailGridInfo: (id: string) => c.detalle.quitarInfo(id),
    /* cliente */
    applyTransaction: (tx: Transaccion) => c.transaccion(tx),
    applyTransactionAsync: (tx: Transaccion, cb?: (r: ResultadoNodos) => void) => c.transaccionAsincrona(tx, cb),
    flushAsyncTransactions: () => c.vaciarCola(),
    refreshClientSideRowModel: () => m()?.invalidate('filtrar'),
    /* infinite */
    refreshInfiniteCache: () => c.infinito?.cache().refrescar(false),
    purgeInfiniteCache: () => c.infinito?.cache().refrescar(true),
    isLastRowIndexKnown: () => c.infinito?.cache().ultimaConocida() ?? c.servidor?.raiz().ultimaConocida() ?? true,
    setRowCount: (n: number, conocida = true) => {
      if (c.servidor) c.servidor.fijarTotal(n, conocida);
      else c.infinito?.cache().fijarTotal(n, conocida);
    },
    getCacheBlockState: () => c.infinito?.cache().estados() ?? c.servidor?.raiz().estados() ?? {},
    /* server-side */
    refreshServerSide: (p?: RefrescoServidor) => c.servidor?.refrescar(p),
    retryServerSideLoads: () => c.servidor?.reintentar(),
    getServerSideGroupLevelState: () => c.servidor?.niveles() ?? [],
    applyServerSideTransaction: (tx: TransaccionServidor) => c.servidor?.transaccion(tx),
    applyServerSideTransactionAsync: (tx: TransaccionServidor, cb?: (r: unknown) => void) => {
      queueMicrotask(() => cb?.(c.servidor?.transaccion(tx)));
    },
    applyServerSideRowData: (p: { successParams: ExitoServidor; route?: RutaServidor; startRow?: number }) => c.servidor?.fijarDatos(p),
    /* exportacion */
    exportDataAsCsv: (p?: ParamsExport) => c.exportarCsv(p),
    getDataAsCsv: (p?: ParamsExport) => datosCsv(g, c, p),
    exportDataAsExcel: (p?: ParamsExport) => void c.excel.exportar(p),
    getDataAsExcel: (p?: ParamsExport) => c.excel.blob(p),
    getSheetDataForExcel: (p?: ParamsExport) => c.excel.datosHoja(p),
    exportMultipleSheetsAsExcel: (p: ParamsExport & { data?: string[] }) => c.excel.exportarVarias(p),
    getMultipleSheetsAsExcel: (p: ParamsExport & { data?: string[] }) => c.excel.variasHojas(p),
    /* estado */
    getState: () => c.obtenerEstado(),
    setState: (e: EstadoGrilla, ignorar?: string[]) => c.fijarEstado(e, ignorar),
    /* datos */
    getRowNode: (id: string) => c.getRowNode(id),
    forEachNode: (fn: (n: unknown, i: number) => void) => c.cadaNodo(fn),
    forEachNodeAfterFilter: (fn: (n: unknown, i: number) => void) => c.cadaFiltrado(fn),
  };
  return api;
}

function menuColumna(c: ControladorFilas, col: ColumnState): ItemMenu[] {
  const g = c.grid;
  const def = g.defDe(col);
  const items: ItemMenu[] = [];
  const grupos = g.estado()?.rowGroupCols ?? [];
  if (def['enableRowGroup'] === true || col.enableRowGroup) {
    const activo = grupos.includes(col.colId);
    const titulo = g.texto(activo ? 'ungroupBy' : 'groupBy', activo ? 'Desagrupar por' : 'Agrupar por');
    items.push({ id: activo ? 'rowUnGroup' : 'rowGroup', texto: `${titulo} ${col.headerName}`, icono: 'mdi:file-tree-outline', accion: () => {
      const m = g.modelo();
      if (activo) m?.removeRowGroupCol(col.colId);
      else m?.addRowGroupCol(col.colId);
      g.emitir('columnRowGroupChanged', {});
    } });
  }
  if (def['enableValue'] === true) {
    const permitidas = (def['allowedAggFuncs'] as string[] | undefined) ?? ['sum', 'min', 'max', 'count', 'avg', 'first', 'last'];
    const api = g.el as unknown as { api: { setColumnAggFunc: (c: string, f: string | null) => void } };
    const hijos: ItemMenu[] = permitidas.map((f) => ({ id: `agg-${f}`, texto: g.texto(f, f), marcado: col.aggFunc === f, accion: () => api.api.setColumnAggFunc(col.colId, col.aggFunc === f ? null : f) }));
    items.push({ id: 'valueAggSubMenu', texto: g.texto('valueAggregation', 'Agregación'), icono: 'mdi:sigma', hijos });
  }
  return items;
}

function menuContexto(c: ControladorFilas): ItemMenu[] {
  const g = c.grid;
  const items: ItemMenu[] = [{ id: 'excelExport', texto: g.texto('excelExport', 'Exportar a Excel'), icono: 'mdi:file-excel-outline', accion: () => void c.excel.exportar() }];
  if (!g.estado()?.rowGroupCols.length) return items;
  items.push({ id: 'expandAll', texto: g.texto('expandAll', 'Expandir todo'), icono: 'mdi:unfold-more-horizontal', accion: () => c.expandirTodo(true) });
  items.push({ id: 'contractAll', texto: g.texto('collapseAll', 'Contraer todo'), icono: 'mdi:unfold-less-horizontal', accion: () => c.expandirTodo(false) });
  return items;
}

export function instalar(grid: GridHost): Desinstalar {
  const c = new ControladorFilas(grid);
  const api = metodos(c);
  grid.exponer(api);
  const quitarMenu = grid.menu((ctx: ContextoMenu) => (ctx.tipo === 'columna' && ctx.col ? menuColumna(c, ctx.col) : ctx.tipo === 'contexto' ? menuContexto(c) : []));
  grid.panel({
    id: 'agrupacion',
    texto: grid.texto('rowGroupColumnsEmptyMessage', 'Agrupación'),
    icono: 'mdi:file-tree-outline',
    crear: () => crearPanelAgrupacion(grid, {
      grupos: () => grid.estado()?.rowGroupCols ?? [],
      fijarGrupos: (ids) => {
        grid.modelo()?.setRowGroupCols(ids);
        grid.emitir('columnRowGroupChanged', {});
      },
      valores: () => c.colsValor(),
      fijarValores: (ids) => (api['setValueColumns'] as unknown as (x: string[]) => void)(ids),
      pivotes: () => c.colsPivote(),
      fijarPivotes: (ids) => c.fijarPivotes(ids),
      modoPivote: () => c.modoPivote(),
      fijarModoPivote: (v) => grid.fijarOpcion('pivotMode', v),
    }),
  });
  return () => {
    quitarMenu();
    c.destruir();
  };
}
