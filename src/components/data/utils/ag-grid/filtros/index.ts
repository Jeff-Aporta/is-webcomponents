/**
 * filtros — Plugin de <iswc-ag-grid>: filtros de columna, quick, externo y avanzado,
 * orden, side bar, status bar, overlays, menus y api de paginacion.
 *
 * `instalar` corre en el constructor del host, antes de que haya modelo: lo que toca zonas
 * o estado espera al primer `pintado`. Desde ahi se escucha el modelo directamente.
 */
import { ordenarFilas, esClicMulti, modeloTrasClic, ordenInicial } from './orden.js';
import { resumenPagina } from './resumen.js';
import { MotorFiltros } from './filtros-motor.js';
import { proveedorMenu } from './filtros-menus.js';
import { BarraAvanzada } from './ui/barra-avanzada.js';
import { BarraLateral } from './ui/barra-lateral.js';
import { FilaFlotante, PopupFiltro } from './ui/flotantes.js';
import { BarraEstado, Overlays } from './ui/pie-y-capas.js';
import { PanelColumnas } from './ui/panel-columnas.js';
import type { ColumnaOrden, ItemOrden, ModeloAvanzado, ModeloColumna, ModeloFiltros } from './filtros.schemas.js';
import type { ColumnState, RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { Desinstalar, Flotante, GridHost } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';

function necesitaOrden(grid: GridHost, modelo: ItemOrden[]): boolean {
  if (grid.opcion('accentedSort') === true) return true;
  return modelo.some((s) => {
    if (s.type === 'absolute') return true;
    const col = grid.columna(s.colId);
    return col ? typeof grid.defDe(col)['comparator'] === 'function' : false;
  });
}

function columnaOrden(grid: GridHost, col: ColumnState): ColumnaOrden {
  const comparador = grid.defDe(col)['comparator'] as ColumnaOrden['comparador'];
  return { colId: col.colId, tipo: String(col.type ?? 'text'), comparador, valor: (n) => grid.valor(col, n as RowNode) };
}

/** Etapa `ordenar`: core ya ordeno; aqui lo que core no sabe, mas postSortRows. */
function aplicarOrden(grid: GridHost, filas: RowNode[]): RowNode[] {
  const modelo = (grid.estado()?.sortModel ?? []) as ItemOrden[];
  const acentos = grid.opcion('accentedSort') === true;
  const columnas = new Map(grid.columnas().map((c) => [c.colId, columnaOrden(grid, c)]));
  const ordenadas = necesitaOrden(grid, modelo) ? ordenarFilas(filas, modelo, columnas, acentos) : filas;
  const post = grid.opcion<((p: { nodes: RowNode[] }) => void) | undefined>('postSortRows');
  if (typeof post !== 'function') return ordenadas;
  const nodes = [...ordenadas];
  post({ nodes });
  return nodes;
}

function ordenarPorClic(grid: GridHost, colId: string, evento: Partial<MouseEvent> = {}): void {
  const col = grid.columna(colId);
  const m = grid.modelo();
  if (!col?.sortable || !m) return;
  const opciones = { multiSortKey: grid.opcion('multiSortKey'), suppressMultiSort: grid.opcion('suppressMultiSort'), alwaysMultiSort: grid.opcion('alwaysMultiSort') };
  const orden = (grid.defDe(col)['sortingOrder'] ?? grid.opcion('sortingOrder')) as Array<string | null> | undefined;
  const actual = (grid.estado()?.sortModel ?? []) as ItemOrden[];
  m.setSortModel(modeloTrasClic(actual, colId, { multi: esClicMulti(evento, opciones), orden }));
  grid.recomputar('orden');
  grid.emitir('sortChanged', { source: 'uiColumnSorted', columns: [col] });
}

function exponerPaginacion(grid: GridHost): void {
  const resumen = (): ReturnType<typeof resumenPagina> => {
    const e = grid.estado();
    return resumenPagina(e?.page ?? 0, e?.pageSize ?? 1, e?.displayRows.length ?? 0);
  };
  const ir = (n: number): void => {
    grid.modelo()?.setPage(Math.max(0, Math.min(n, Math.max(0, resumen().paginas - 1))));
    grid.emitir('paginationChanged', { newPage: true, newPageSize: false, newData: false, animate: false });
  };
  grid.exponer({
    paginationGoToPage: ir,
    paginationGoToFirstPage: () => ir(0),
    paginationGoToLastPage: () => ir(resumen().paginas - 1),
    paginationGoToNextPage: () => ir(resumen().pagina + 1),
    paginationGoToPreviousPage: () => ir(resumen().pagina - 1),
    paginationGetCurrentPage: () => resumen().pagina,
    paginationGetTotalPages: () => resumen().paginas,
    paginationGetPageSize: () => resumen().tam,
    paginationGetRowCount: () => resumen().total,
    paginationIsLastPageFound: () => true,
  });
}

function exponerFiltros(motor: MotorFiltros, avanzada: BarraAvanzada, popup: PopupFiltro): void {
  const instancia = (clave: unknown): unknown => {
    const col = motor.col(clave);
    return col ? motor.instancia(col) : null;
  };
  motor.grid.exponer({
    getFilterModel: () => motor.getFilterModel(),
    setFilterModel: (m: ModeloFiltros | null) => motor.setFilterModel(m),
    getColumnFilterModel: (clave: unknown) => {
      const col = motor.col(clave);
      return col ? motor.modeloDe(col.colId) : null;
    },
    setColumnFilterModel: (clave: unknown, m: ModeloColumna | null) => {
      const col = motor.col(clave);
      if (col) motor.setColumna(col.colId, m, 'api');
      return Promise.resolve();
    },
    getColumnFilterInstance: (clave: unknown) => Promise.resolve(instancia(clave)),
    isColumnFilterPresent: () => motor.isColumnFilterPresent(),
    isAnyFilterPresent: () => motor.isAnyFilterPresent(),
    destroyFilter: (clave: unknown) => {
      const col = motor.col(clave);
      if (col) motor.setColumna(col.colId, null, 'api');
    },
    onFilterChanged: () => motor.avisar([], 'api'),
    showColumnFilter: (clave: unknown) => {
      const col = motor.col(clave);
      if (col) popup.abrir(col.colId);
    },
    hideColumnFilter: () => popup.cerrar(),
    setQuickFilter: (t: string) => motor.setQuick(t),
    isQuickFilterPresent: () => motor.isQuickPresent(),
    getQuickFilter: () => motor.quick,
    resetQuickFilter: () => motor.resetCacheQuick(),
    getAdvancedFilterModel: () => motor.avanzado,
    setAdvancedFilterModel: (m: ModeloAvanzado | null) => {
      motor.setAvanzado(m);
      avanzada.refrescar();
    },
    showAdvancedFilterBuilder: () => avanzada.mostrarConstructor(),
    hideAdvancedFilterBuilder: () => avanzada.ocultarConstructor(),
  });
}

function exponerPaneles(grid: GridHost, lateral: BarraLateral, estado: BarraEstado, overlays: Overlays): void {
  grid.exponer({
    isSideBarVisible: () => lateral.isSideBarVisible(),
    setSideBarVisible: (v: boolean) => lateral.setSideBarVisible(v),
    setSideBarPosition: (p: 'left' | 'right') => lateral.setSideBarPosition(p),
    openToolPanel: (id: string) => lateral.openToolPanel(id),
    closeToolPanel: () => lateral.closeToolPanel(),
    getOpenedToolPanel: () => lateral.getOpenedToolPanel(),
    isToolPanelShowing: () => lateral.isToolPanelShowing(),
    refreshToolPanel: () => lateral.refreshToolPanel(),
    getToolPanelInstance: (id: string) => lateral.getToolPanelInstance(id),
    getSideBar: () => lateral.getSideBar(),
    registrarPanelLateral: (p: Parameters<BarraLateral['registrar']>[0]) => lateral.registrar(p),
    registrarPanelEstado: (p: Parameters<BarraEstado['registrar']>[0]) => estado.registrar(p),
    getStatusPanel: (key: string) => estado.getStatusPanel(key),
    showLoadingOverlay: () => overlays.showLoadingOverlay(),
    showNoRowsOverlay: () => overlays.showNoRowsOverlay(),
    hideOverlay: () => overlays.hideOverlay(),
  });
}

/** Column Chooser: el panel de columnas en un flotante junto al encabezado. */
function creadorChooser(grid: GridHost): (col: ColumnState) => void {
  let flotante: Flotante | null = null;
  return (col) => {
    flotante ??= grid.flotante('column-chooser');
    const panel = new PanelColumnas(grid, { suppressRowGroups: true, suppressValues: true, suppressPivots: true, suppressPivotMode: true });
    flotante.el.replaceChildren(panel.el);
    flotante.abrir(grid.shadow.querySelector(`[role="columnheader"][data-col-id="${CSS.escape(col.colId)}"]`) ?? grid.el);
  };
}

/** Instala el plugin. Devuelve la limpieza. */
export function instalar(grid: GridHost): Desinstalar {
  const motor = new MotorFiltros(grid);
  const popup = new PopupFiltro(motor);
  const flotantes = new FilaFlotante(motor, popup);
  const avanzada = new BarraAvanzada(motor);
  const lateral = new BarraLateral(motor);
  const estado = new BarraEstado(motor);
  const overlays = new Overlays(motor);
  const limpiar: Desinstalar[] = [];
  let arrancado = false;
  let pendiente = false;

  motor.abrirFiltro = (colId, ancla) => popup.abrir(colId, ancla);
  motor.alCambiar.add((colIds) => {
    popup.refrescar(colIds);
    lateral.refreshToolPanel(colIds);
  });
  limpiar.push(grid.transformador({ etapa: 'filtrar', depende: ['filtros'], aplicar: (filas) => motor.aplicar(filas as RowNode[]), activo: () => { const api = (grid.el as unknown as { api: Record<string, () => boolean> }).api; return api['isAnyFilterPresent']!() || api['isQuickFilterPresent']!(); } }));
  limpiar.push(grid.transformador({ etapa: 'ordenar', depende: ['orden'], aplicar: (filas) => aplicarOrden(grid, filas as RowNode[]), activo: () => false }));
  limpiar.push(grid.menu(proveedorMenu(motor, creadorChooser(grid))));
  exponerFiltros(motor, avanzada, popup);
  exponerPaneles(grid, lateral, estado, overlays);
  exponerPaginacion(grid);
  grid.exponer({ ordenarPorClic: (colId: string, ev: MouseEvent) => ordenarPorClic(grid, colId, ev) });

  const refrescar = (): void => {
    if (pendiente) return;
    pendiente = true;
    queueMicrotask(() => {
      pendiente = false;
      flotantes.pintar();
      estado.pintar();
      overlays.actualizar();
      lateral.refreshToolPanel();
    });
  };

  const arrancar = (): void => {
    const m = grid.modelo();
    if (arrancado || !m) return;
    arrancado = true;
    if (!grid.estado()?.sortModel.length) {
      const inicial = ordenInicial(grid.columnas().map((c) => ({ ...grid.defDe(c), colId: c.colId })));
      if (inicial.length) m.setSortModel(inicial);
    }
    const quick = grid.opcion('quickFilterText', '');
    if (quick) motor.setQuick(String(quick));
    limpiar.push(m.subscribe((_s: unknown, razon?: string) => { if (razon !== 'selection') refrescar(); else estado.pintar(); }));
    lateral.configurar(grid.opcion('sideBar'));
    estado.configurar(grid.opcion('statusBar'));
    avanzada.configurar(grid.opcion('enableAdvancedFilter') === true);
    refrescar();
  };

  limpiar.push(grid.on('pintado', () => {
    arrancar();
    flotantes.pintar();
  }));
  limpiar.push(grid.on('cellSelectionChanged', () => estado.pintar()));
  limpiar.push(grid.on('rangeSelectionChanged', () => estado.pintar()));
  limpiar.push(grid.alCambiarOpcion('sideBar', (v) => lateral.configurar(v)));
  limpiar.push(grid.alCambiarOpcion('statusBar', (v) => estado.configurar(v)));
  limpiar.push(grid.alCambiarOpcion('enableAdvancedFilter', (v) => avanzada.configurar(v === true)));
  limpiar.push(grid.alCambiarOpcion('quickFilterText', (v) => motor.setQuick(String(v ?? ''))));
  limpiar.push(grid.alCambiarOpcion('loading', () => overlays.actualizar()));
  limpiar.push(grid.alCambiarOpcion('floatingFilters', () => flotantes.pintar()));
  limpiar.push(grid.alCambiarOpcion('isExternalFilterPresent', () => grid.recomputar('filtros')));
  limpiar.push(grid.alCambiarOpcion('doesExternalFilterPass', () => grid.recomputar('filtros')));
  limpiar.push(grid.alCambiarOpcion('accentedSort', () => grid.recomputar('orden')));
  limpiar.push(grid.alCambiarOpcion('postSortRows', () => grid.recomputar('orden')));
  arrancar();

  return () => {
    for (const fn of limpiar) fn();
    popup.cerrar();
    flotantes.destruir();
    avanzada.destruir();
    lateral.destruir();
    estado.destruir();
    overlays.destruir();
  };
}
