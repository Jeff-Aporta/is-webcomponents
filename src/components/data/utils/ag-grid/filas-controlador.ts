/**
 * ag-grid/filas/controlador — Une el motor puro de filas con el host.
 *
 * Dentro de un transformador `grid.estado()` devuelve la foto ANTERIOR (el modelo
 * esta calculando la nueva). Por eso las filas ordenadas se capturan en la etapa
 * `ordenar` y el resto se lee de `serializeState()`, que nunca recalcula.
 *
 * La captura invalida el arbol; expandir solo repite el aplanado, sin reagrupar.
 * Totales, pivote y tree data salen como hojas sinteticas: asi sus valores quedan
 * alineados con las columnas y el host las pinta con su camino normal de celdas.
 */
import { formatValue } from '@jeff-aporta/iswc-base/components/data/utils/datagrid-core/value-formatter.js';
import { filterRows } from '@jeff-aporta/iswc-base/components/data/utils/datagrid-core/pipeline-filtering.js';
import { sortRows } from '@jeff-aporta/iswc-base/components/data/utils/datagrid-core/pipeline-sorting.js';
import { ControladorDetalle } from './filas-detalle.js';
import { validarEstado, fusionarEstado, leerEstado, omitirPropiedades } from './filas-estado-grilla.js';
import { ExpansionGrupos } from './filas-expansion.js';
import { ExportadorExcel, datosCsv, exportarCsv } from './filas-exportar.js';
import { agregarArbol, aplanarArbol, construirArbol, ordenarArbol, podarArbol, recorrerArbol } from './filas-grupos.js';
import { ModeloServidor, ModeloViewport, crearModeloInfinito } from './filas-modelos-externos.js';
import { pivotar, resolverIdPivote } from './filas-pivote.js';
import { aplicarLote } from './filas-transacciones.js';
import { construirTree, filtrarTree } from './filas-ag-tree-data.js';
import type { ArbolVigente, ColPivote, CriterioGrupo, DefPivote, DatasourceInfinito, DatasourceServidor, DatasourceViewport, DuenoExport, EstadoGrilla, FuncionAgg, IdFila, InfoSintetica, LecturaPipeline, NivelGrupo, NodoArbol, OpcionesAplanar, OpcionesPivote, ParamsExport, PosicionTotal, ResultadoNodos, ResultadoPivote, TicketAsincrono, Transaccion, ValorAgg } from './filas.schemas.js';
import type { ColumnDef, ColumnState, GridApi, GridState, RowData, RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { ContextoCelda, Decoracion, Desinstalar, FilaDisplay, GridHost, ModeloFilas } from './contrato.schemas.js';

const ID_AUTO = 'ag-Grid-AutoColumn';
const CLASE_TOGGLE = 'iswc-ag-arbol-toggle';
const CLASE_AGREGADA = 'iswc-ag-fila-agregada';
const ESPERA_ASINCRONA = 50;
const CAMBIOS_FILAS = ['groupDefaultExpanded', 'isGroupOpenByDefault', 'groupTotalRow', 'grandTotalRow', 'groupHideOpenParents', 'groupHideParentOfSingleChild', 'groupAllowUnbalanced', 'initialGroupOrderComparator', 'getGroupRowAgg', 'suppressAggFilteredOnly', 'groupAggFiltering', 'treeData', 'getDataPath', 'treeDataChildrenField', 'treeDataParentIdField', 'excludeChildrenWhenTreeDataFiltering', 'masterDetail', 'isRowMaster', 'pivotRowTotals', 'pivotColumnGroupTotals'];

export class ControladorFilas implements DuenoExport {
  grid: GridHost;
  detalle: ControladorDetalle;
  excel: ExportadorExcel;
  expansion: ExpansionGrupos;
  servidor: ModeloServidor | null = null;
  viewport: ModeloViewport | null = null;
  infinito: ReturnType<typeof crearModeloInfinito> | null = null;
  #ordenadas: RowNode[] = [];
  #arbol: ArbolVigente | null = null;
  #firmaArbol = '';
  #info = new WeakMap<RowNode, InfoSintetica>();
  #grupos = new Map<string, NodoArbol>();
  #valores = new Map<string, string | FuncionAgg>();
  #pivotes: string[] = [];
  #funciones: Record<string, FuncionAgg> = {};
  #defsOriginales: ColumnDef[] | null = null;
  #firmaPivote = '';
  #pivoteActual: ResultadoPivote | null = null;
  #sembrado = '';
  #cola: TicketAsincrono[] = [];
  #reloj: ReturnType<typeof setTimeout> | null = null;
  #parar: Desinstalar[] = [];
  #estadoPendiente = false;
  #ultimoExpandido: ReadonlySet<string> | null = null;

  constructor(grid: GridHost) {
    this.grid = grid;
    this.detalle = new ControladorDetalle(grid);
    this.excel = new ExportadorExcel(grid, this);
    this.expansion = new ExpansionGrupos((g) => this.#porDefecto(g));
    this.#funciones = { ...grid.opcion<Record<string, FuncionAgg>>('aggFuncs', {}) };
    this.#instalarPipeline();
    this.#instalarModelos();
    this.#instalarVista();
    this.#instalarOyentes();
  }

  /* ── Instalacion ──────────────────────────────────────────────────── */

  #instalarPipeline(): void {
    const g = this.grid;
    this.#parar.push(g.transformador({ etapa: 'ordenar', depende: [], aplicar: (filas) => this.capturar(filas as RowNode[]) , activo: () => false }));
    this.#parar.push(g.transformador({ etapa: 'aplanar', depende: ['filas'], aplicar: (filas) => this.aplanar(filas as FilaDisplay[]) , activo: () => this.#externo() || this.#esTree() || this.modoPivote() || (g.estado()?.rowGroupCols.length ?? 0) > 0 || this.detalle.activo() || this.#posTotal('grandTotalRow') !== null }));
    this.#parar.push(g.fuenteValor((col, node) => this.#valorSintetico(col, node)));
    this.#parar.push(g.decorarCelda((ctx) => this.#decorar(ctx)));
  }

  #instalarModelos(): void {
    const g = this.grid;
    g.modeloFilas('infinite', () => {
      this.infinito = crearModeloInfinito(g);
      return this.infinito;
    });
    g.modeloFilas('serverSide', () => {
      this.servidor = new ModeloServidor(g);
      return this.#adaptar(this.servidor);
    });
    g.modeloFilas('viewport', () => {
      this.viewport = new ModeloViewport(g);
      return this.#adaptar(this.viewport);
    });
  }

  #adaptar(m: ModeloServidor | ModeloViewport): ModeloFilas {
    return { tipo: m.tipo, total: () => m.total(), filaEn: (i) => m.filaEn(i), asegurar: (d, h) => m.asegurar(d, h), destruir: () => m.destruir() };
  }

  #instalarVista(): void {
    const g = this.grid;
    g.exportador({ formato: 'csv', texto: g.texto('csvExport', 'Exportar a CSV'), icono: 'mdi:file-delimited-outline', extension: 'csv', generar: (p) => new Blob([datosCsv(g, this, p as ParamsExport)], { type: 'text/csv;charset=utf-8' }) });
    g.exportador({ formato: 'excel', texto: g.texto('excelExport', 'Exportar a Excel'), icono: 'mdi:file-excel-outline', extension: 'xlsx', generar: (p) => this.excel.comprimido(p as ParamsExport) });
    g.renderer('agGroupCellRenderer', (ctx) => this.detalle.rendererHtml(ctx.node, ctx.texto));
  }

  #instalarOyentes(): void {
    const g = this.grid;
    this.#parar.push(g.celdaClic((ev) => this.#alClicCelda(ev.evento.target, ev.node)));
    this.#parar.push(g.on('gridReady', () => this.alListo()));
    this.#parar.push(g.on('newColumnsLoaded', () => this.sembrar()));
    this.#parar.push(g.on('sortChanged', () => this.#refrescarExterno()));
    this.#parar.push(g.on('filterChanged', () => this.#refrescarExterno()));
    for (const ev of ['sortChanged', 'filterChanged', 'columnRowGroupChanged', 'columnValueChanged', 'columnPivotChanged', 'columnPivotModeChanged', 'columnVisible', 'columnPinned', 'columnMoved', 'columnResized', 'rowGroupOpened', 'paginationChanged', 'selectionChanged']) {
      this.#parar.push(g.on(ev, () => this.#avisarEstado(ev)));
    }
    this.#parar.push(g.alCambiarOpcion('pivotMode', () => this.#cambioModoPivote()));
    this.#parar.push(g.alCambiarOpcion('aggFuncs', (v) => this.agregarFunciones(v as Record<string, FuncionAgg>)));
    this.#parar.push(g.alCambiarOpcion('datasource', (v) => this.infinito?.fijarDatasource(v as DatasourceInfinito | null)));
    this.#parar.push(g.alCambiarOpcion('serverSideDatasource', (v) => this.servidor?.fijarDatasource(v as DatasourceServidor | null)));
    this.#parar.push(g.alCambiarOpcion('viewportDatasource', (v) => this.viewport?.fijarDatasource(v as DatasourceViewport | null)));
    for (const op of CAMBIOS_FILAS) this.#parar.push(g.alCambiarOpcion(op, () => this.recalcular()));
  }

  alListo(): void {
    this.sembrar();
    const inicial = validarEstado(this.grid.opcion('initialState', null));
    if (inicial) this.fijarEstado(inicial);
    const m = this.grid.modelo();
    if (!m) return;
    this.#ultimoExpandido = (m.getState() as GridState).expandedGroups;
    this.#parar.push(m.subscribe((e) => this.#alModelo((e as GridState).expandedGroups)));
  }

  /** Lee rowGroup, aggFunc y pivot de los ColDef. Una vez por juego de columnas. */
  sembrar(): void {
    if (this.#defsOriginales) return;
    const cols = this.grid.columnas();
    const firma = cols.map((c) => c.colId).join('\u0001');
    if (!cols.length || firma === this.#sembrado) return;
    this.#sembrado = firma;
    const grupos: Array<[string, number]> = [];
    const pivotes: Array<[string, number]> = [];
    for (const c of cols) {
      const def = this.grid.defDe(c);
      const func = (def['aggFunc'] ?? def['initialAggFunc'] ?? c.aggFunc) as string | FuncionAgg | null | undefined;
      if (func) this.#valores.set(c.colId, func);
      if (def['rowGroup'] === true || def['rowGroupIndex'] != null || def['initialRowGroup'] === true) grupos.push([c.colId, Number(def['rowGroupIndex'] ?? def['initialRowGroupIndex'] ?? Infinity)]);
      if (def['pivot'] === true || def['pivotIndex'] != null || def['initialPivot'] === true) pivotes.push([c.colId, Number(def['pivotIndex'] ?? def['initialPivotIndex'] ?? Infinity)]);
    }
    this.#pivotes = pivotes.sort((a, b) => a[1] - b[1]).map((p) => p[0]);
    const m = this.grid.modelo();
    if (grupos.length && m && !(m.getState() as GridState).rowGroupCols.length) m.setRowGroupCols(grupos.sort((a, b) => a[1] - b[1]).map((g) => g[0]));
    else if (this.#valores.size) this.recalcular();
  }

  destruir(): void {
    if (this.#reloj) clearTimeout(this.#reloj);
    for (const fn of this.#parar) fn();
    this.detalle.destruir();
  }

  /* ── Pipeline ─────────────────────────────────────────────────────── */

  capturar(filas: RowNode[]): RowNode[] {
    this.#ordenadas = filas;
    this.#arbol = null;
    return filas;
  }

  recalcular(): void {
    this.#arbol = null;
    this.grid.recomputar('filas');
  }

  #leer(): LecturaPipeline {
    const m = this.grid.modelo() as GridApi;
    const crudo = JSON.parse(m.serializeState()) as Omit<LecturaPipeline, 'expandedGroups'> & { expandedGroups: string[] };
    const conocidas = new Set(this.grid.columnas().map((c) => c.colId));
    return { rowGroupCols: crudo.rowGroupCols.filter((c) => conocidas.has(c)), expandedGroups: new Set(crudo.expandedGroups), sortModel: crudo.sortModel, filterModel: crudo.filterModel };
  }

  #externo(): boolean {
    const t = this.grid.opcion<string>('rowModelType', 'clientSide');
    return t !== 'clientSide';
  }

  modoPivote(): boolean {
    return this.grid.opcion<boolean>('pivotMode', false);
  }

  #esTree(): boolean {
    return this.grid.opcion<boolean>('treeData', false);
  }

  #porDefecto(g: NodoArbol): boolean {
    const fn = this.grid.opcion<((p: Record<string, unknown>) => boolean) | null>('isGroupOpenByDefault', null);
    if (typeof fn === 'function') return fn({ rowNode: this.vistaGrupo(g), field: g.field, key: g.clave, level: g.nivel }) === true;
    const nivel = this.grid.opcion<number>('groupDefaultExpanded', 0);
    return nivel === -1 || g.nivel < nivel;
  }

  #posTotal(nombre: string): PosicionTotal {
    const v = this.grid.opcion<unknown>(nombre, null);
    if (v === 'top' || v === 'pinnedTop') return 'top';
    if (v === 'bottom' || v === 'pinnedBottom') return 'bottom';
    return null;
  }

  #textoTotal = (g: NodoArbol | null): string => {
    const total = this.grid.texto('footerTotal', 'Total');
    return g ? `${total} ${g.etiqueta}` : total;
  };

  /** Transformador `aplanar`. Sin nada que hacer devuelve la misma lista. */
  aplanar(filas: FilaDisplay[]): FilaDisplay[] {
    if (this.#externo() || !this.grid.modelo()) return filas;
    const p = this.#leer();
    this.#sincronizarExpansion(p.expandedGroups);
    const conArbol = this.#esTree() || this.modoPivote() || p.rowGroupCols.length > 0 || this.#posTotal('grandTotalRow') !== null;
    const base = conArbol ? this.#desdeArbol(p) : filas;
    if (!this.detalle.activo()) return base;
    return this.detalle.insertar(base, (n) => this.#info.has(n));
  }

  #sincronizarExpansion(conjunto: ReadonlySet<string>): void {
    const cambios = this.expansion.sincronizar(conjunto);
    if (!cambios) return;
    queueMicrotask(() => {
      for (const id of cambios) this.grid.emitir('rowGroupOpened', { node: this.getRowNode(id), expanded: this.expansion.abiertoPorId(id) });
    });
  }

  #firma(p: LecturaPipeline): string {
    return JSON.stringify([p.rowGroupCols, this.#pivotes, this.modoPivote(), this.#esTree(), [...this.#valores].map(([c, f]) => [c, typeof f === 'string' ? f : 'fn']), p.sortModel]);
  }

  #vigente(p: LecturaPipeline): ArbolVigente {
    const firma = this.#firma(p);
    if (this.#arbol && firma === this.#firmaArbol) return this.#arbol;
    this.#firmaArbol = firma;
    this.#arbol = this.#esTree() ? this.#arbolTree(p) : this.#arbolGrupos(this.#ordenadas, p);
    return this.#arbol;
  }

  #opcionesAplanar(abierto: OpcionesAplanar['abierto'], sinHojas: boolean, sinOcultar = false): OpcionesAplanar {
    const totalGrupo = this.grid.opcion<unknown>('groupTotalRow', null);
    const fnTotal = (g: NodoArbol): PosicionTotal => (totalGrupo as (p: Record<string, unknown>) => PosicionTotal)({ node: this.vistaGrupo(g) });
    return {
      abierto,
      sinHojas,
      totalGrupo: typeof totalGrupo === 'function' ? fnTotal : this.#posTotal('groupTotalRow'),
      totalGeneral: this.#posTotal('grandTotalRow'),
      ocultarPadresAbiertos: !sinOcultar && this.grid.opcion<boolean>('groupHideOpenParents', false),
      ocultarHijoUnico: sinOcultar ? false : this.grid.opcion<boolean | 'leafGroupsOnly'>('groupHideParentOfSingleChild', false),
      textoTotal: this.#textoTotal,
      formatear: (colId, valor) => {
        const col = this.grid.columna(colId);
        return col ? formatValue(col, valor) : String(valor ?? '');
      },
    };
  }

  #desdeArbol(p: LecturaPipeline): FilaDisplay[] {
    const { raiz, pivote } = this.#vigente(p);
    const enPivote = this.modoPivote();
    this.#indexar(raiz);
    if (enPivote) this.#programarColumnasPivote(pivote);
    const op = this.#opcionesAplanar(this.expansion.abierto, enPivote);
    if (enPivote && !raiz.hijos.length) op.totalGeneral = op.totalGeneral ?? 'top';
    return this.#sintetizar(aplanarArbol(raiz, op), enPivote || this.#esTree());
  }

  #indexar(raiz: NodoArbol): void {
    this.#grupos = new Map();
    recorrerArbol(raiz, (g) => this.#grupos.set(g.id, g));
  }

  /* ── Construccion ─────────────────────────────────────────────────── */

  /**
   * Lector para recorrer todas las hojas. `grid.valor` arma parametros y consulta
   * fuentes por llamada: a 100.000 filas por columna es casi todo el costo. Sin
   * valueGetter ni ruta con puntos basta leer el campo.
   */
  #lector(col: ColumnState): (n: RowNode) => unknown {
    const def = this.grid.defDe(col);
    const campo = col.field;
    if (def['valueGetter'] == null && campo && !campo.includes('.')) return (n) => n.data[campo];
    return (n) => this.grid.valor(col, n);
  }

  #niveles(ids: readonly string[]): NivelGrupo[] {
    const out: NivelGrupo[] = [];
    const vacio = this.grid.texto('blanks', '(Vacíos)');
    for (const id of ids) {
      const col = this.grid.columna(id);
      if (!col) continue;
      const def = this.grid.defDe(col);
      const creador = def['keyCreator'] as ((p: Record<string, unknown>) => string) | undefined;
      const nivel: NivelGrupo = { colId: id, field: col.field, valor: this.#lector(col), etiqueta: (v) => formatValue(col, v) || vacio };
      if (typeof creador === 'function') nivel.clave = (value, node) => String(creador({ value, node, data: node.data, column: col, colDef: def }));
      out.push(nivel);
    }
    return out;
  }

  listaValores(): ValorAgg[] {
    const out: ValorAgg[] = [];
    for (const [colId, func] of this.#valores) {
      const col = this.grid.columna(colId);
      if (col) out.push({ colId, func, valor: this.#lector(col), colDef: this.grid.defDe(col), column: col });
    }
    return out;
  }

  #opcionesAgg() {
    const fn = this.grid.opcion<((p: Record<string, unknown>) => Record<string, unknown>) | null>('getGroupRowAgg', null);
    const api = this.grid.el as unknown as { api?: unknown };
    const contexto = this.grid.opcion('context');
    const porGrupo = typeof fn === 'function' ? (g: NodoArbol) => fn({ nodes: g.hojas, api: api.api, context: contexto }) : undefined;
    return { funciones: this.#funciones, api: api.api, contexto, porGrupo };
  }

  #arbolGrupos(hojas: readonly RowNode[], p: LecturaPipeline): ArbolVigente {
    const filtrarAgregado = this.grid.opcion<unknown>('groupAggFiltering', false);
    const base = filtrarAgregado ? this.#todasOrdenadas(p) : hojas;
    const niveles = this.#niveles(p.rowGroupCols);
    const desbalance = this.grid.opcion<boolean>('groupAllowUnbalanced', false);
    const raiz = construirArbol(base, niveles, desbalance);
    const valores = this.listaValores();
    const pivote = this.modoPivote() ? this.#pivotar(base, valores) : null;
    const op = this.#opcionesAgg();
    if (pivote && this.#pivotes.length) {
      agregarArbol(raiz, valores, { ...op, clavesPivote: pivote.clavesDe, soloPivote: true, idPivote: resolverIdPivote(this.#pivotes) });
    } else {
      agregarArbol(raiz, valores, op);
    }
    if (this.grid.opcion<boolean>('suppressAggFilteredOnly', false)) this.#agregadoSinFiltro(raiz, niveles, desbalance, valores, p);
    if (filtrarAgregado) this.#podar(raiz, hojas, filtrarAgregado, p);
    this.#ordenar(raiz, p);
    return { raiz, pivote };
  }

  #nodos(): RowNode[] {
    return (this.grid.modelo()?.getAllRows() ?? []) as RowNode[];
  }

  #todasOrdenadas(p: LecturaPipeline): RowNode[] {
    const porId = new Map(this.grid.columnas().map((c) => [c.colId, c]));
    return sortRows(this.#nodos(), p.sortModel, porId);
  }

  #agregadoSinFiltro(raiz: NodoArbol, niveles: NivelGrupo[], desbalance: boolean, valores: ValorAgg[], p: LecturaPipeline): void {
    const todo = construirArbol(this.#todasOrdenadas(p), niveles, desbalance);
    agregarArbol(todo, valores, this.#opcionesAgg());
    const porId = new Map<string, NodoArbol>();
    recorrerArbol(todo, (g) => porId.set(g.id, g));
    raiz.agg = todo.agg;
    recorrerArbol(raiz, (g) => {
      const otro = porId.get(g.id);
      if (otro) g.agg = otro.agg;
    });
  }

  #podar(raiz: NodoArbol, hojas: readonly RowNode[], filtro: unknown, p: LecturaPipeline): void {
    const pasan = new Set(hojas);
    const cols = this.grid.columnas();
    const porId = new Map(cols.map((c) => [c.colId, c]));
    const modelo = Object.fromEntries(Object.entries(p.filterModel).filter(([c]) => this.#valores.has(c)));
    const contra = (g: NodoArbol): boolean => {
      if (typeof filtro === 'function') return (filtro as (x: Record<string, unknown>) => boolean)({ node: this.vistaGrupo(g) }) === true;
      if (!Object.keys(modelo).length) return false;
      const data = this.#datosAgg(g.agg);
      return filterRows([{ id: g.id, index: -1, data }], modelo, '', cols, porId).length > 0;
    };
    podarArbol(raiz, (n) => pasan.has(n), contra);
  }

  /** Datos por `field` para que formatters y getters encuentren el agregado. */
  #datosAgg(agg: Record<string, unknown>): RowData {
    const data: RowData = { ...agg };
    for (const colId of Object.keys(agg)) {
      const col = this.grid.columna(colId);
      if (col) data[col.field] = agg[colId];
    }
    return data;
  }

  #ordenar(raiz: NodoArbol, p: LecturaPipeline): void {
    const criterios: CriterioGrupo[] = [];
    for (const s of p.sortModel) {
      const col = this.grid.columna(s.colId);
      const comparador = col ? this.grid.defDe(col)['comparator'] as ((a: unknown, b: unknown) => number) | undefined : undefined;
      criterios.push({ colId: s.colId, dir: s.dir as 'asc' | 'desc', comparar: typeof comparador === 'function' ? comparador : undefined });
    }
    const inicial = this.grid.opcion<((p: Record<string, unknown>) => number) | null>('initialGroupOrderComparator', null);
    ordenarArbol(raiz, criterios, typeof inicial === 'function' ? (a, b) => inicial({ nodeA: this.vistaGrupo(a), nodeB: this.vistaGrupo(b), api: (this.grid.el as unknown as { api?: unknown }).api }) : undefined);
  }

  #arbolTree(p: LecturaPipeline): ArbolVigente {
    const g = this.grid;
    const rutaDe = g.opcion<((d: RowData) => string[]) | null>('getDataPath', null);
    const campoHijos = g.opcion<string | null>('treeDataChildrenField', null);
    const campoPadre = g.opcion<string | null>('treeDataParentIdField', null);
    const r = construirTree(this.#todasOrdenadas(p), { rutaDe: rutaDe ?? undefined, campoHijos: campoHijos ?? undefined, campoPadre: campoPadre ?? undefined, idDe: this.#idDatos() });
    const activo = Object.keys(p.filterModel).length > 0 || this.#ordenadas.length !== this.#nodos().length;
    if (activo && !campoHijos) {
      const pasan = new Set(this.#ordenadas);
      filtrarTree(r.raiz, (n) => pasan.has(n), g.opcion<boolean>('excludeChildrenWhenTreeDataFiltering', false));
    }
    agregarArbol(r.raiz, this.listaValores(), this.#opcionesAgg());
    return { raiz: r.raiz, pivote: null };
  }

  #idDatos(): (d: RowData) => string {
    const id = this.idFila();
    return id ?? ((d: RowData) => String(d['id']));
  }

  /* ── Pivote ───────────────────────────────────────────────────────── */

  #pivotar(hojas: readonly RowNode[], valores: readonly ValorAgg[]): ResultadoPivote {
    const g = this.grid;
    const cols: ColPivote[] = [];
    for (const id of this.#pivotes) {
      const col = g.columna(id);
      if (!col) continue;
      const comparador = g.defDe(col)['pivotComparator'] as ((a: string, b: string) => number) | undefined;
      const item: ColPivote = { colId: id, valor: this.#lector(col) };
      if (typeof comparador === 'function') item.comparador = comparador;
      cols.push(item);
    }
    const nombre = (colId: string): string => g.columna(colId)?.headerName ?? colId;
    const r = pivotar(hojas, cols, valores, nombre, {
      maximo: g.opcion<number | null>('pivotMaxGeneratedColumns', null) ?? undefined,
      totalesFila: this.#posicionPivote('pivotRowTotals'),
      totalesGrupo: this.#posicionPivote('pivotColumnGroupTotals'),
      quitarNivelValorUnico: g.opcion<boolean>('removePivotHeaderRowWhenSingleValueColumn', false),
      procesarCol: g.opcion<((d: DefPivote) => void) | undefined>('processPivotResultColDef', undefined),
      procesarGrupo: g.opcion<OpcionesPivote['procesarGrupo']>('processPivotResultColGroupDef', undefined),
    });
    if (r.excedido) queueMicrotask(() => g.emitir('pivotMaxColumnsExceeded', { message: 'pivotMaxGeneratedColumns' }));
    this.#pivoteActual = r;
    return r;
  }

  #posicionPivote(nombre: string): PosicionTotal {
    const v = this.grid.opcion<string | null>(nombre, null);
    if (v === 'before') return 'top';
    if (v === 'after') return 'bottom';
    return null;
  }

  /** No se puede tocar columnas dentro del pipeline: va en microtarea y solo si cambiaron. */
  #programarColumnasPivote(pivote: ResultadoPivote | null): void {
    if (!pivote || pivote.firma === this.#firmaPivote) return;
    this.#firmaPivote = pivote.firma;
    queueMicrotask(() => this.#aplicarColumnasPivote(pivote));
  }

  #aplicarColumnasPivote(pivote: ResultadoPivote): void {
    const m = this.grid.modelo();
    if (!m || !this.modoPivote()) return;
    if (!this.#defsOriginales) this.#defsOriginales = this.grid.columnas().map((c) => c.def);
    const ocultas = this.#defsOriginales.map((d) => ({ ...d, hide: true }));
    const auto = { colId: ID_AUTO, field: ID_AUTO, headerName: this.grid.texto('group', 'Grupo'), pinned: 'left' };
    const generadas = pivote.planas.map(({ aggFunc: _omitida, ...d }) => d);
    m.setColumnDefs([...ocultas, auto, ...generadas] as ColumnDef[]);
    this.grid.emitir('newColumnsLoaded', { source: 'pivot' });
  }

  #cambioModoPivote(): void {
    const m = this.grid.modelo();
    if (!this.modoPivote() && this.#defsOriginales && m) {
      m.setColumnDefs(this.#defsOriginales);
      this.#defsOriginales = null;
      this.#firmaPivote = '';
      this.#pivoteActual = null;
    }
    this.grid.emitir('columnPivotModeChanged', {});
    this.recalcular();
  }

  resultadoPivote(): ResultadoPivote | null {
    return this.#pivoteActual;
  }

  aplicarColumnasResultado(defs: ColumnDef[] | null): void {
    const m = this.grid.modelo();
    if (!m) return;
    if (!defs) {
      this.#cambioModoPivote();
      return;
    }
    if (!this.#defsOriginales) this.#defsOriginales = this.grid.columnas().map((c) => c.def);
    m.setColumnDefs(defs);
  }

  /* ── Hojas sinteticas ─────────────────────────────────────────────── */

  #sintetizar(filas: FilaDisplay[], gruposAlineados: boolean): FilaDisplay[] {
    const out = new Array<FilaDisplay>(filas.length);
    for (let i = 0; i < filas.length; i++) {
      const f = filas[i] as FilaDisplay & { id: string; agg: Record<string, unknown>; label: string; etiqueta: string; expandible: boolean; expanded: boolean; nodo: RowNode | null };
      if (f.kind === 'total') out[i] = this.#hojaTotal(f);
      else if (f.kind === 'group' && gruposAlineados) out[i] = this.#hojaGrupo(f);
      else if (f.kind === 'leaf' && this.#esTree()) out[i] = this.#hojaTree(f as FilaDisplay & { node: RowNode; level: number });
      else out[i] = f;
    }
    return out;
  }

  #hojaTotal(f: { id: string; agg: Record<string, unknown>; etiqueta: string; level: number }): FilaDisplay {
    const node: RowNode = { id: f.id, index: -1, data: this.#datosAgg(f.agg) };
    this.#info.set(node, { id: f.id, agg: f.agg, etiqueta: f.etiqueta, nivel: f.level, expandible: false, abierto: false, real: false, total: true });
    const pos = this.grid.opcion<string | null>('grandTotalRow', null);
    const pegar = f.id.endsWith('ROOT_NODE_ID') ? (pos === 'pinnedTop' ? 'arriba' : pos === 'pinnedBottom' ? 'abajo' : undefined) : undefined;
    return { kind: 'leaf', level: f.level, node, pegar } as FilaDisplay;
  }

  #hojaGrupo(f: { id: string; agg: Record<string, unknown>; label: string; level: number; expandible: boolean; expanded: boolean; nodo: RowNode | null }): FilaDisplay {
    const node: RowNode = f.nodo ?? { id: f.id, index: -1, data: this.#datosAgg(f.agg) };
    this.#info.set(node, { id: f.id, agg: f.agg, etiqueta: f.label, nivel: f.level, expandible: f.expandible, abierto: f.expanded, real: f.nodo !== null, total: false });
    return { kind: 'leaf', level: f.level, node };
  }

  #hojaTree(f: { node: RowNode; level: number }): FilaDisplay {
    const g = this.#grupos.get(f.node.id);
    this.#info.set(f.node, { id: f.node.id, agg: {}, etiqueta: g?.etiqueta ?? '', nivel: f.level, expandible: false, abierto: false, real: true, total: false });
    return f as FilaDisplay;
  }

  #valorSintetico(col: ColumnState, node: RowNode): { valor: unknown } | undefined {
    const i = this.#info.get(node);
    if (!i) return undefined;
    if (col.colId in i.agg) return { valor: i.agg[col.colId] };
    return i.real ? undefined : { valor: null };
  }

  #primeraColumna(): string | undefined {
    const cols = this.grid.columnas().filter((c) => !c.hide);
    return (cols.find((c) => c.pinned === 'left') ?? cols[0])?.colId;
  }

  /** Sangria, chevron y etiqueta en la primera columna de las filas sinteticas. */
  #decorar(ctx: ContextoCelda): Decoracion | void {
    const i = ctx.node ? this.#info.get(ctx.node) : undefined;
    if (!i) return;
    const clase = i.real ? undefined : CLASE_AGREGADA;
    if (ctx.col.colId !== this.#primeraColumna()) return clase ? { clase } : undefined;
    const g = this.grid;
    const sangria = g.em(i.nivel * 20);
    const flecha = i.expandible ? `<button type="button" class="${CLASE_TOGGLE}" data-grupo="${g.escapar(i.id)}" aria-expanded="${i.abierto}" aria-label="${g.escapar(g.texto('expandRow', 'Expandir fila'))}"><iswc-icon icon="${i.abierto ? 'mdi:chevron-down' : 'mdi:chevron-right'}"></iswc-icon></button>` : '';
    const etiqueta = i.etiqueta && i.etiqueta !== ctx.texto ? `<span class="iswc-ag-arbol-etiqueta">${g.escapar(i.etiqueta)}</span>` : '';
    return { clase, prefijo: `<span class="iswc-ag-arbol-sangria" style="padding-inline-start:${sangria}"></span>${flecha}${etiqueta}` };
  }

  #alClicCelda(objetivo: EventTarget | null, node: RowNode | null): boolean {
    if (this.detalle.alClic(objetivo, node)) return true;
    const boton = objetivo instanceof Element ? objetivo.closest<HTMLElement>(`.${CLASE_TOGGLE}`) : null;
    const id = boton?.dataset['grupo'];
    if (!id) return false;
    this.fijarAbierto(id, !this.expansion.abiertoPorId(id));
    return true;
  }

  /* ── Expansion ────────────────────────────────────────────────────── */

  fijarAbierto(id: string, abierto: boolean): void {
    this.expansion.fijar(id, abierto);
    this.grid.emitir('rowGroupOpened', { node: this.getRowNode(id), expanded: abierto });
    this.grid.recomputar('filas');
  }

  expandirTodo(abierto: boolean): void {
    if (this.servidor) return;
    if (abierto) this.expansion.expandirTodo();
    else this.expansion.contraerTodo();
    this.grid.emitir('expandOrCollapseAll', { source: abierto ? 'expandAll' : 'collapseAll' });
    this.grid.recomputar('filas');
  }

  /**
   * Aqui si llega el Set vivo del motor. Sirve para SSRM, que no pasa por el
   * pipeline, y para lo que el contenido no delata: `collapseAllGroups` sobre un
   * conjunto ya vacio (grupos abiertos por defecto) solo cambia la referencia.
   */
  #alModelo(conjunto: ReadonlySet<string>): void {
    const previo = this.#ultimoExpandido;
    if (conjunto === previo) return;
    this.#ultimoExpandido = conjunto;
    if (!previo) return;
    const s = this.servidor;
    if (s) {
      for (const id of conjunto) if (!previo.has(id)) s.alternarPorId(id);
      for (const id of previo) if (!conjunto.has(id)) s.alternarPorId(id);
      return;
    }
    if (conjunto.size || previo.size) return;
    this.expansion.contraerTodo();
    queueMicrotask(() => this.grid.recomputar('filas'));
  }

  #refrescarExterno(): void {
    this.infinito?.refrescar?.('orden');
    this.servidor?.refrescarTodo(true);
  }

  /* ── Agregacion y columnas ────────────────────────────────────────── */

  colsValor(): string[] {
    return [...this.#valores.keys()];
  }

  fijarValores(mapa: Array<[string, string | FuncionAgg]>): void {
    this.#valores = new Map(mapa);
    this.#reflejarAgg();
    this.grid.emitir('columnValueChanged', {});
    this.recalcular();
  }

  /** El host muestra agregados de columnas con `aggFunc`. */
  #reflejarAgg(): void {
    for (const c of this.grid.columnas()) {
      const func = this.#valores.get(c.colId);
      c.aggFunc = func ?? null;
    }
  }

  funcionPorDefecto(colId: string): string | FuncionAgg {
    const col = this.grid.columna(colId);
    const def = col ? this.grid.defDe(col) : {};
    return (def['defaultAggFunc'] as string | undefined) ?? 'sum';
  }

  agregarFunciones(f: Record<string, FuncionAgg>): void {
    this.#funciones = { ...this.#funciones, ...f };
    this.recalcular();
  }

  limpiarFunciones(): void {
    this.#funciones = {};
    this.recalcular();
  }

  colsPivote(): string[] {
    return this.#pivotes;
  }

  fijarPivotes(ids: string[]): void {
    this.#pivotes = ids;
    this.grid.emitir('columnPivotChanged', {});
    this.recalcular();
  }

  /* ── Transacciones ────────────────────────────────────────────────── */

  idFila(): IdFila {
    const fn = this.grid.opcion<((p: Record<string, unknown>) => string) | null>('getRowId', null);
    if (typeof fn === 'function') return (data) => String(fn({ data, level: 0, parentKeys: [] }));
    const campo = this.grid.el.getAttribute('get-row-id');
    if (campo) return (data) => String(data[campo]);
    // Sin opcion, el host identifica por `id` cuando las filas lo traen.
    if (this.grid.modelo()?.getAllRows()[0]?.data['id'] != null) return (data) => String(data['id']);
    return null;
  }

  transaccion(tx: Transaccion): ResultadoNodos | undefined {
    const m = this.grid.modelo();
    if (!m) return undefined;
    if (this.idFila()) {
      const r = m.applyTransaction(tx as never);
      this.grid.emitir('rowDataUpdated', { transaction: r });
      return r;
    }
    return this.#lote([{ tx }])[0];
  }

  /** Una sola reconstruccion por lote, tenga las transacciones que tenga. */
  #lote(tickets: readonly TicketAsincrono[]): ResultadoNodos[] {
    const m = this.grid.modelo() as GridApi;
    const actuales = this.#nodos().map((n) => n.data);
    const { filas, resultados } = aplicarLote(actuales, tickets.map((t) => t.tx), this.idFila());
    const previos = new Map(this.#nodos().map((n) => [n.data, n]));
    m.setRows(filas);
    const nuevos = new Map(this.#nodos().map((n) => [n.data, n]));
    const salida = resultados.map((r) => ({
      add: r.add.flatMap((d) => nuevos.get(d) ?? []),
      update: r.update.flatMap((d) => nuevos.get(d) ?? []),
      remove: r.remove.flatMap((d) => previos.get(d) ?? []),
    }));
    this.grid.emitir('rowDataUpdated', { transactions: salida });
    return salida;
  }

  transaccionAsincrona(tx: Transaccion, callback?: (r: ResultadoNodos) => void): void {
    this.#cola.push({ tx, callback });
    if (this.#reloj) return;
    this.#reloj = setTimeout(() => this.vaciarCola(), this.grid.opcion<number>('asyncTransactionWaitMillis', ESPERA_ASINCRONA));
  }

  vaciarCola(): void {
    if (this.#reloj) clearTimeout(this.#reloj);
    this.#reloj = null;
    if (!this.#cola.length || !this.grid.modelo()) return;
    const tickets = this.#cola;
    this.#cola = [];
    const resultados = this.#lote(tickets);
    tickets.forEach((t, i) => t.callback?.(resultados[i] as ResultadoNodos));
    this.grid.emitir('asyncTransactionsFlushed', { results: resultados });
  }

  /* ── Exportacion ──────────────────────────────────────────────────── */

  filasExport(params: ParamsExport): FilaDisplay[] {
    const m = this.grid.modelo();
    if (!m) return [];
    const p = this.#leer();
    const todas = params.exportedRows === 'all';
    const hojas = todas ? this.#nodos() : this.#ordenadas;
    if (!this.#esTree() && !this.modoPivote() && !p.rowGroupCols.length) {
      return hojas.map((node): FilaDisplay => ({ kind: 'leaf', level: 0, node }));
    }
    const arbol = todas && !this.#esTree() ? this.#arbolGrupos(hojas, p) : this.#vigente(p);
    return aplanarArbol(arbol.raiz, this.#opcionesAplanar(() => true, this.modoPivote(), true));
  }

  abiertoPorId(id: string): boolean {
    return this.expansion.abiertoPorId(id);
  }

  exportarCsv(params: ParamsExport = {}): void {
    exportarCsv(this.grid, this, params);
  }

  /* ── Estado ───────────────────────────────────────────────────────── */

  obtenerEstado(): EstadoGrilla | null {
    const e = this.grid.estado();
    if (!e) return null;
    const extra: Partial<EstadoGrilla> = {};
    if (this.#valores.size) extra.aggregation = { aggregationModel: [...this.#valores].map(([colId, aggFunc]) => ({ colId, aggFunc })) };
    if (this.modoPivote() || this.#pivotes.length) extra.pivot = { pivotMode: this.modoPivote(), pivotColIds: this.#pivotes };
    const expandidos = this.expansion.abiertos();
    const cerrados = this.expansion.cerrados();
    if (expandidos.length || cerrados.length) extra.rowGroupExpansion = { expandedRowGroupIds: expandidos, collapsedRowGroupIds: cerrados };
    const foco = this.grid.foco();
    if (foco) extra.focusedCell = { colId: foco.colId, rowIndex: foco.indice, rowPinned: null };
    const scroll = this.#scroller();
    if (scroll) extra.scroll = { top: scroll.scrollTop, left: scroll.scrollLeft };
    return leerEstado(e, extra);
  }

  #scroller(): HTMLElement | null {
    return this.grid.shadow.querySelector<HTMLElement>('[role="grid"], [role="treegrid"]');
  }

  /** Todo por un solo `loadState`: un setter por campo recalcularia el pipeline cada vez. */
  fijarEstado(entrada: unknown, ignorar: readonly string[] = []): boolean {
    const m = this.grid.modelo();
    const valido = validarEstado(entrada);
    if (!m || !valido) return false;
    const e = omitirPropiedades(valido, ignorar);
    if (e.aggregation) this.#valores = new Map(e.aggregation.aggregationModel.map((a) => [a.colId, a.aggFunc as string | FuncionAgg]));
    if (e.pivot) {
      this.#pivotes = e.pivot.pivotColIds;
      this.grid.fijarOpcion('pivotMode', e.pivot.pivotMode);
    }
    if (e.rowGroupExpansion) this.expansion.restaurar(e.rowGroupExpansion.expandedRowGroupIds, e.rowGroupExpansion.collapsedRowGroupIds);
    const parche = fusionarEstado(this.grid.columnas(), e);
    delete parche['expandedGroups'];
    this.#arbol = null;
    m.loadState(parche as never);
    const vivo = (m.getState() as GridState).expandedGroups;
    this.expansion.alinear(vivo);
    this.#ultimoExpandido = vivo;
    if (e.rowSelection) m.setSelection(e.rowSelection);
    this.#reflejarAgg();
    if (e.focusedCell) this.grid.enfocar({ indice: e.focusedCell.rowIndex, colId: e.focusedCell.colId });
    const scroll = this.#scroller();
    if (scroll && e.scroll) scroll.scrollTo({ top: e.scroll.top, left: e.scroll.left });
    return true;
  }

  #avisarEstado(fuente: string): void {
    if (this.#estadoPendiente) return;
    this.#estadoPendiente = true;
    queueMicrotask(() => {
      this.#estadoPendiente = false;
      this.grid.emitir('stateUpdated', { sources: [fuente], state: this.obtenerEstado() });
    });
  }

  /* ── Acceso a datos ───────────────────────────────────────────────── */

  vistaGrupo(g: NodoArbol): Record<string, unknown> {
    return {
      id: g.id,
      group: true,
      key: g.clave,
      field: g.field,
      level: g.nivel,
      data: g.nodo?.data,
      aggData: g.agg,
      expanded: this.expansion.abiertoPorId(g.id),
      allLeafChildren: g.hojas,
      allChildrenCount: g.hojas.length,
      childrenAfterGroup: g.hijos.length ? g.hijos.map((h) => h.id) : g.directas.map((n) => n.id),
      parent: g.padre?.padre ? g.padre.id : null,
      setExpanded: (v: boolean) => this.fijarAbierto(g.id, v),
    };
  }

  #vistaHoja(n: RowNode): Record<string, unknown> {
    return {
      id: n.id,
      group: false,
      data: n.data,
      sourceRowIndex: n.index,
      isSelected: () => this.grid.estado()?.selection.has(n.id) ?? false,
      setDataValue: (colId: string, valor: unknown) => this.grid.fijarValor(n, colId, valor, 'api'),
    };
  }

  getRowNode(id: string): Record<string, unknown> | undefined {
    const g = this.#grupos.get(id);
    if (g) return this.vistaGrupo(g);
    const n = this.grid.nodo(id);
    return n ? this.#vistaHoja(n as RowNode) : undefined;
  }

  /** forEachNode: grupos y hojas, padres antes que hijos. */
  cadaNodo(fn: (n: unknown, i: number) => void): void {
    const m = this.grid.modelo();
    if (!m) return;
    let i = 0;
    if (!this.#grupos.size) {
      for (const n of this.#nodos()) fn(this.#vistaHoja(n), i++);
      return;
    }
    const vistos = new Set<string>();
    for (const g of this.#grupos.values()) {
      if (vistos.has(g.id)) continue;
      vistos.add(g.id);
      fn(this.vistaGrupo(g), i++);
      for (const n of g.directas) fn(this.#vistaHoja(n), i++);
    }
  }

  cadaFiltrado(fn: (n: unknown, i: number) => void): void {
    const orden = new Map(this.#ordenadas.map((n, i) => [n, i]));
    const filtradas = this.#ordenadas.slice().sort((a, b) => a.index - b.index || (orden.get(a) as number) - (orden.get(b) as number));
    filtradas.forEach((n, i) => fn(this.#vistaHoja(n), i));
  }
}
